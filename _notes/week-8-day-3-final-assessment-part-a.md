# Database Correctness & Concurrency
## Week 8 — Day 3 + Final Assessment Part A

Date: 2026-11-17

---

# Primitive Reference

- **UNIQUE constraint** → prevents duplicate values or combinations.
- **CHECK constraint** → enforces row-level validity rules.
- **Atomic conditional UPDATE** → performs a state change only when a condition is still true.
- **Transaction** → makes multiple operations succeed or fail together.
- **SELECT ... FOR UPDATE** → locks selected rows while a short multi-step decision is being made.
- **Optimistic concurrency / version check** → detects stale writes using the version originally loaded.
- **Serializable isolation** → guarantees that the committed outcome is equivalent to some valid serial execution.
- **Consistent lock ordering** → prevents designed deadlock cycles by acquiring shared resources in the same global order.
- **Bounded retry** → retries known transient failures such as `40P01` and `40001`, but only a limited number of times.

Useful PostgreSQL SQLSTATEs:

- `23505` → unique violation
- `40P01` → deadlock detected
- `40001` → serialization failure

---

# Retrieval Warm-up

## 1. Atomicity vs. Isolation

**Atomicity** ensures that all operations inside a transaction succeed together or fail together.

**Isolation** controls what a transaction is allowed to observe while other transactions are changing the database.

Practical isolation model:

- **Read Committed** → each statement gets a fresh view of committed data.
- **Repeatable Read** → the transaction keeps a stable snapshot.
- **Serializable** → the committed result must be equivalent to some valid serial execution.

---

## 2. Atomic Conditional UPDATE vs. SELECT ... FOR UPDATE

Use an **atomic conditional UPDATE** when the business rule is simple enough to be expressed directly in one SQL statement.

```sql
UPDATE products
SET stock = stock - 1
WHERE id = $1
  AND stock >= 1
RETURNING stock;
```

Use `SELECT ... FOR UPDATE` when a short multi-step workflow must read state, make a decision, and keep that state protected until several related writes complete.

---

## 3. Retryable SQLSTATEs

- Deadlock → `40P01`
- Serialization failure → `40001`

Both may justify retrying the **whole transaction** with bounded retries.

---

## 4. Why Optimistic Concurrency Conflicts Should Not Be Blindly Retried

An optimistic concurrency conflict means the request was based on stale data.

Blindly retrying may repeat a decision that was made using an old version of the entity. The user or caller may need to reload the newest state and reconcile the changes.

---

# Scenario B1 — Flash-Sale Coupon

Initial state:

```text
limit = 1000
used = 999
```

Two concurrent requests try to redeem the final available coupon.

## Problem

A naive flow:

```text
SELECT used
→ check capacity
→ UPDATE
```

is unsafe because both requests can read `used = 999` before either update commits.

## Primitive

**Atomic conditional UPDATE**

```sql
UPDATE campaigns
SET used = used + 1
WHERE id = $1
  AND used < limit
RETURNING used;
```

## Result

- Request A → `UPDATE 1` → `used = 1000`
- Request B → `UPDATE 0`

The application interprets `UPDATE 0` as **campaign full**.

## Why Not SELECT ... FOR UPDATE?

It could work, but would require an explicit transaction and an additional query. The business rule already fits in one atomic statement.

---

# Scenario B2 — Order Payment Callback

Initial state:

```text
status = "pending"
```

Two identical successful payment callbacks may arrive concurrently.

## Problem

Both callbacks may read `pending`, both decide they are allowed to process the transition, and both may trigger duplicate side effects.

## Primitive

**Atomic conditional UPDATE**

```sql
UPDATE orders
SET status = 'paid'
WHERE id = $1
  AND status = 'pending'
RETURNING id;
```

## Result

- First callback → `UPDATE 1`
- Duplicate callback → `UPDATE 0`

Only the request that successfully performs the transition should trigger transition-related side effects.

## Why Not Optimistic Concurrency?

A version column could work, but it adds unnecessary machinery. The transition rule is already expressible directly in one statement.

---

# Scenario B3 — Shared Seat Assignment

Two passengers try to reserve seat `12A` on the same flight.

The workflow must:

1. verify that the seat is available;
2. create the reservation;
3. associate the seat with that reservation.

## Problem

Two transactions can both observe the seat as available and both create reservation records.

A normal transaction gives all-or-nothing for each transaction, but does not automatically stop both transactions from making the same decision concurrently.

## Primitives

**Transaction + SELECT ... FOR UPDATE**

Conceptually:

```text
BEGIN
SELECT seat FOR UPDATE
verify availability
INSERT reservation
UPDATE seat
COMMIT
```

A competing request for the same seat must wait.

## Database Invariant

```sql
UNIQUE (flight_id, seat_number)
```

The invariant is:

> A specific seat on a specific flight can be assigned at most once.

It should not be:

```sql
UNIQUE (flight_id, seat_number, passenger_id)
```

because different passengers would still be able to occupy the same seat.

---

# Scenario B4 — Concurrent Account Withdrawals

Initial state:

```text
balance = 150
```

Two requests concurrently try to withdraw `100`.

## Problem

With:

```text
SELECT balance
→ validate
→ UPDATE
```

both requests may read `150` and both conclude that the withdrawal is valid.

## Primitive

**Atomic conditional UPDATE**

```sql
UPDATE accounts
SET balance = balance - $1
WHERE id = $2
  AND balance >= $1
RETURNING balance;
```

## Result

- First withdrawal → succeeds, balance becomes `50`
- Second withdrawal → `UPDATE 0`

The application interprets `UPDATE 0` as **insufficient funds**.

## CHECK Constraint

Also add:

```sql
CHECK (balance >= 0)
```

Responsibilities:

- Atomic conditional UPDATE → protects the withdrawal operation under concurrency.
- `CHECK (balance >= 0)` → protects the persisted database invariant from every write path.

---

# Scenario B5 — Concurrent Workflow Transition

Initial state:

```text
status = "open"
```

Two requests try to close the same support ticket.

## Problem

Both requests may read `open`, both decide that they are allowed to close the ticket, and both may execute duplicate side effects.

## Primitive

**Atomic conditional UPDATE**

```sql
UPDATE tickets
SET status = 'closed'
WHERE id = $1
  AND status = 'open'
RETURNING id;
```

## Result

- First request → `UPDATE 1`
- Second request → `UPDATE 0`

The second request is treated as an already-processed or already-closed operation.

## Why Not Optimistic Concurrency?

A version column could work, but the transition rule is already expressible directly in one conditional update.

---

# Scenario B6 — Global Team Capacity

A team may have at most 10 active members.

Current state:

```text
team_id = 42
active members = 9
```

Two requests concurrently activate different members.

## Problem

Both requests can execute:

```text
COUNT active members → 9
```

and both may decide there is still room. Because they update different member rows, both writes may succeed and the final count may become `11`.

## Why UNIQUE Does Not Solve It

This is not a duplicate-value invariant.

The rule is:

> At most 10 rows may satisfy a condition.

A normal `UNIQUE` constraint cannot express “allow this value at most 10 times.”

## Why Locking Each Member Does Not Solve It

The requests modify different member rows. Locking member `101` does not block another transaction from activating member `102`.

## Primitive

**Serializable transaction**

```sql
BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE;

SELECT COUNT(*)
FROM members
WHERE team_id = 42
  AND status = 'active';

-- if count < 10:
UPDATE members
SET status = 'active'
WHERE id = $1;

COMMIT;
```

Serializable guarantees that the committed result must be equivalent to some valid serial execution.

If both transactions cannot safely commit, PostgreSQL may abort one with:

```text
40001
```

## Recovery

On `40001`:

```text
ROLLBACK
retry the whole transaction
```

Retries should be bounded.

---

# Serializable Isolation — Mental Model

Serializable does **not** mean PostgreSQL simply locks the whole table.

It allows concurrent work, but the final committed result must make sense as if transactions had executed one at a time.

Example:

```text
active members = 9
limit = 10
```

Transaction A and Transaction B both read `9` and both try to activate a different member.

If A had executed first serially:

```text
9 → 10
```

then B should have seen `10` and refused.

If B had executed first, the same logic applies.

There is no valid serial order where both activations succeed and the result becomes `11`.

Therefore PostgreSQL may abort one transaction with `40001`.

Difference from optimistic concurrency:

- **Optimistic concurrency** → detects stale writes using an explicit row version.
- **Serializable** → PostgreSQL detects whether the whole transaction history can safely be considered serial.

Difference from blocking:

- blocking → a transaction waits;
- serialization failure → a transaction is aborted and must retry.

---

# Scenario B7 — Product Pricing Editor

Initial state:

```text
price = 100
version = 7
```

Two managers load version `7`.

Manager A saves first.
Manager B saves later using the stale version.

## Problem

A normal:

```sql
UPDATE products
SET price = ...
WHERE id = ...
```

allows B to silently overwrite A's newer change.

## Primitive

**Optimistic concurrency / version check**

```sql
UPDATE products
SET price = $1,
    version = version + 1
WHERE id = $2
  AND version = $3
RETURNING id, price, version;
```

`$3` is the version that the user originally loaded.

## Result

A:

```text
expectedVersion = 7
→ succeeds
→ version becomes 8
```

B:

```text
expectedVersion = 7
→ UPDATE 0
```

The stale edit is detected.

## Why Not SELECT ... FOR UPDATE?

Human editing may last many minutes. Holding a transaction and row lock across the entire editing session would be operationally expensive and unnecessary.

## Retry?

Do **not** blindly retry. The user should reload the latest data and decide whether to reapply the change.

---

# Scenario B8 — Two-Wallet Transfer

Concurrent transfers:

```text
A: wallet 1 → wallet 2
B: wallet 2 → wallet 1
```

Both transactions lock:

```text
fromWallet first
toWallet second
```

## Problem

A deadlock can occur.

Timeline:

```text
A locks wallet 1
B locks wallet 2
A waits for wallet 2
B waits for wallet 1
```

## Primitive / Strategy

**Consistent lock ordering**

```ts
const firstId = Math.min(fromWalletId, toWalletId)
const secondId = Math.max(fromWalletId, toWalletId)
```

Every transaction locks the lower ID first and the higher ID second, regardless of business direction.

## Recovery

Deadlock SQLSTATE:

```text
40P01
```

On `40P01`:

```text
ROLLBACK
retry the entire transaction
```

Use bounded retries.

---

# Scenario B9 — Globally Unique Username

Two Node instances concurrently attempt:

```text
create username "henrique"
```

## Problem

This is unsafe:

```text
SELECT username
→ if free
→ INSERT
```

because both requests can observe that the username is available before either inserts it.

## Primitive

**UNIQUE constraint**

```sql
ALTER TABLE users
ADD CONSTRAINT uq_users_username
UNIQUE (username);
```

The availability pre-check may still exist for UX, but the database constraint is the source of truth.

## Why Not SELECT ... FOR UPDATE?

`SELECT ... FOR UPDATE` locks existing rows. When `"henrique"` does not exist yet, there may be no row to lock.

## Why Not Serializable?

Serializable could protect a correctly designed transaction, but it adds stronger isolation and potential retry behavior when the invariant can be directly encoded with a UNIQUE constraint.

## Losing Request

PostgreSQL returns:

```text
23505
```

The application should map that to an expected business response such as:

```text
Username already taken
```

An HTTP API might return `409 Conflict`.

---

# Final Assessment — Part A: Delayed Retrieval

## 1. Transaction Boundary

These statements are not automatically one transaction:

```ts
await pool.query(
  'UPDATE accounts SET balance = balance - 100 WHERE id = 1'
)

await pool.query(
  'UPDATE accounts SET balance = balance + 100 WHERE id = 2'
)
```

Sequential `await`s only control JavaScript execution order. They do not create a PostgreSQL transaction.

Also, `pool.query()` calls may use different physical connections.

A real transaction requires one checked-out client and the same client for:

```text
BEGIN
all transaction statements
COMMIT / ROLLBACK
```

---

## 2. Atomicity vs. Isolation

**Atomicity**

```text
all operations in a transaction commit together
or none of them do
```

**Isolation**

```text
controls what a transaction can observe while
other transactions are changing the database
```

---

## 3. Database Invariant

A database invariant is:

> A condition that must always be true for valid persisted database state.

Examples:

```text
username must be unique
balance must never be negative
one seat on one flight can belong to at most one passenger
```

Constraints such as `UNIQUE` and `CHECK` are mechanisms that can enforce invariants.

---

## 4. Check-Then-Act Race

This is unsafe:

```text
SELECT
→ validate
→ INSERT / UPDATE
```

because concurrent requests can interleave:

```text
A reads and validates
B reads and validates
A writes
B writes
```

Both requests may make a decision based on the same stale state.

---

## 5. Atomic Conditional UPDATE

Prefer an atomic conditional update when the full business rule can be expressed in one SQL statement.

```sql
UPDATE products
SET stock = stock - $1
WHERE id = $2
  AND stock >= $1;
```

---

## 6. SELECT ... FOR UPDATE

`SELECT ... FOR UPDATE` locks the selected rows against conflicting operations.

A competing transaction that needs the same row may be forced to wait.

The lock is released when the transaction:

```text
COMMITs
or
ROLLBACKs
```

---

## 7. Isolation Levels

### Read Committed

Each statement receives a fresh view of committed data.

```text
A reads balance = 100
B updates balance = 200 and commits
A reads again
→ A can see 200
```

### Repeatable Read

The transaction keeps a stable snapshot.

```text
A reads balance = 100
B updates balance = 200 and commits
A reads again
→ A still sees 100
```

### Serializable

The committed result must be equivalent to some valid serial execution.

If PostgreSQL cannot guarantee that, it may abort a transaction with:

```text
40001
```

The application must retry the whole transaction.

---

## 8. Deadlock

Ordinary blocking:

```text
A holds a resource
B waits
A eventually finishes
B proceeds
```

Deadlock:

```text
A holds resource 1 and waits for resource 2
B holds resource 2 and waits for resource 1
```

There is a circular dependency.

SQLSTATE:

```text
40P01
```

---

## 9. Optimistic vs. Pessimistic Concurrency

### Optimistic

Good example:

Two users edit the same form for several minutes.

Use a version column and reject stale saves.

### Pessimistic

Good example:

A short room-reservation workflow must:

```text
verify room
insert reservation
mark room unavailable
```

Use a short transaction with `SELECT ... FOR UPDATE`.

---

# Final Assessment Part A — Repair Checkpoint

## 1. Read Committed

Initial read:

```text
balance = 100
```

Another transaction changes the balance to `200` and commits.

The first transaction reads again:

```text
200
```

---

## 2. Repeatable Read

Initial read:

```text
balance = 100
```

Another transaction changes the balance to `200` and commits.

The first transaction reads again:

```text
100
```

---

## 3. Serializable

Serializable adds the guarantee that:

> The committed outcome must be equivalent to some valid serial execution.

If PostgreSQL determines that concurrent transactions cannot both safely commit under that guarantee, it aborts one with `40001`, and the application retries the entire transaction.

---

# Current Course Status

Completed:

- Week 8 — Day 1: Mixed Scenario Set A
- Week 8 — Day 2: Debugging Assessment
- Week 8 — Day 3: Mixed Scenario Set B
- Final Assessment — Part A: Delayed Retrieval

Next:

- Final Assessment — Part B: Mixed Scenarios
- Final Assessment — Part C: Debugging
- Final Assessment — Part D: Implementation Task
- Final Assessment — Part E: Technical Defense
- Mastery Gate
