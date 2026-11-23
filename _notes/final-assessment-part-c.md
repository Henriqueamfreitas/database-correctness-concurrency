# Database Correctness & Concurrency
## Final Assessment — Part C: Debugging

Date: 2026-11-19

> Note: C1–C2 below are preserved from the visible conversation. C3–C7 are reconstructed from the recovered November 19 study session. The technical content, user conclusions, corrections, and final takeaways are preserved, but some prompt wording may not be verbatim.

---

# C1 — Broken Transaction Boundary

## Question

```ts
const transfer = async (
  fromId: number,
  toId: number,
  amount: number,
  pool: Pool,
) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const debit = await client.query(
      `
      UPDATE accounts
      SET balance = balance - $1
      WHERE id = $2
        AND balance >= $1
      RETURNING balance
      `,
      [amount, fromId],
    )

    if (debit.rowCount === 0) {
      throw new Error('Insufficient funds')
    }

    const credit = await pool.query(
      `
      UPDATE accounts
      SET balance = balance + $1
      WHERE id = $2
      RETURNING balance
      `,
      [amount, toId],
    )

    if (credit.rowCount === 0) {
      throw new Error('Destination account not found')
    }

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
```

Assume:

```text
Account A = 500
Account B = 200
transfer = 100
```

Answer:

1. What is the bug?
2. Why can this violate atomicity even though it has `BEGIN`, `COMMIT`, and `ROLLBACK`?
3. Give one concrete invalid final state.
4. What is the smallest correct fix?
5. What integration test would prove the fix?

## My Answer

1. I initially thought the problem was a missing `balance >= 0` check.
2. I did not identify the transaction-boundary issue at first.
3. I did not give the correct invalid state.
4. I initially suggested adding another balance condition.
5. I suggested checking that balances remained non-negative.

## Correction

The real bug is:

```ts
debit  -> client.query(...)
credit -> pool.query(...)
```

`BEGIN` belongs to one specific checked-out PostgreSQL connection.

`pool.query(...)` may use a different connection, so the credit may run outside the transaction.

Correct fix:

```ts
const credit = await client.query(...)
```

Possible invalid final state:

```text
Start:
A = 500
B = 200
total = 700

Debit happens provisionally:
A = 400

Credit happens outside the transaction:
B = 300

Something fails before COMMIT.

ROLLBACK restores A:
A = 500

But B remains:
B = 300

Final total = 800 ❌
```

Correct integration-test invariant:

> If the transfer fails after one of the mutations, neither mutation remains committed and total money remains constant.

---

# C2 — Missing Rollback

## Question

```ts
const updateBalance = async (
  id: number,
  amount: number,
  pool: Pool,
) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    await client.query(
      `
      UPDATE accounts
      SET balance = balance + $1
      WHERE id = $2
      `,
      [amount, id],
    )

    await client.query(
      `
      INSERT INTO audit_logs (message)
      VALUES ('balance changed')
      `,
    )

    await client.query('COMMIT')
  } catch (error) {
    throw error
  } finally {
    client.release()
  }
}
```

Assume the `INSERT INTO audit_logs` fails.

Answer:

1. What is wrong with the error handling?
2. What state is the PostgreSQL transaction left in?
3. Why is `client.release()` not equivalent to `ROLLBACK`?
4. What is the smallest correct fix?
5. What production problems could happen?

## My Answer

1. There is no rollback.
2. I said the transaction was left with the insert error / still open.
3. `client.release()` only releases the connection and does not clean up the transaction.
4. Add `ROLLBACK` inside the `catch`.
5. The connection can return to the pool in a dirty state and affect later requests.

## Correction

After a statement error inside an open transaction, PostgreSQL leaves that transaction in a:

```text
failed / aborted transaction state
```

It must be cleaned up with:

```sql
ROLLBACK;
```

Correct error handling:

```ts
catch (error) {
  await client.query('ROLLBACK')
  throw error
} finally {
  client.release()
}
```

Production risk:

- later requests may inherit the broken transaction state;
- subsequent queries may fail unexpectedly;
- errors such as `current transaction is aborted` may appear;
- pooled connections may behave incorrectly until cleaned up.

---

# C3 — Lost Update

## Question

A counter starts at:

```text
value = 10
```

Two concurrent requests both increment it.

The broken implementation follows this pattern:

```text
SELECT value
calculate value + 1 in application code
UPDATE value = calculatedValue
```

Answer:

1. What bug can happen?
2. Draw the shortest A/B timeline.
3. What wrong final value can occur?
4. What should the correct final value be?
5. What is the smallest correct fix?
6. Why is that better than `SELECT ... FOR UPDATE`?

## My Answer

I identified the race as:

```text
A reads 10
B reads 10
A writes 11
B writes 11
```

Final value:

```text
11
```

Correct result:

```text
12
```

I recognized that the fix should avoid the stale read-modify-write pattern.

## Correction / Final Answer

This is a **lost update**.

Smallest correct fix:

```sql
UPDATE counters
SET value = value + 1
WHERE id = $1;
```

Why this is better than `SELECT ... FOR UPDATE`:

- one statement;
- no explicit multi-statement transaction;
- no application-side stale calculation;
- less locking machinery;
- shorter critical section.

---

# C4 — Slow External Call While Holding a Lock

## Question

A transaction:

1. begins;
2. locks a row using `SELECT ... FOR UPDATE`;
3. calls an external service that takes about **8 seconds**;
4. updates the row;
5. commits.

Answer:

1. What is wrong with this design?
2. What happens to competing requests?
3. What should move outside the transaction?
4. Is `SELECT ... FOR UPDATE` itself necessarily wrong?
5. What production symptoms can this create?

## My Answer

I identified that the row remains locked while the slow external call runs.

I recognized that competing requests can wait on the locked row and that the external API should not remain inside the long-running transaction.

## Correction / Final Answer

The main problem is the **lock duration**, not necessarily the use of `FOR UPDATE` itself.

Better design:

```text
external work that does not require DB protection
→ outside the transaction

BEGIN
SELECT ... FOR UPDATE
short correctness-sensitive work
UPDATE
COMMIT
```

Production consequences of holding locks for ~8 seconds:

- increased latency;
- blocked requests;
- lower throughput;
- connection-pool pressure;
- increased deadlock/operational risk.

`SELECT ... FOR UPDATE` remains appropriate if the short DB-local workflow genuinely needs pessimistic protection.

---

# C5 — Deadlock

## Question

Two concurrent transactions lock the same two rows in opposite order.

Example:

```text
A wants rows 1 then 2
B wants rows 2 then 1
```

Answer:

1. What can happen?
2. Draw the wait cycle.
3. What structural fix prevents the designed cycle?
4. What SQLSTATE should the application expect?
5. What should the recovery behavior be?

## My Answer

I identified the sequence:

```text
A locks row 1
B locks row 2
A waits for row 2
B waits for row 1
```

I chose **consistent lock ordering**.

I said all requests should lock lower IDs first.

## Correction / Final Answer

This is a **deadlock**.

Correct strategy:

```ts
const firstId = Math.min(id1, id2)
const secondId = Math.max(id1, id2)
```

Always lock:

```text
lower ID first
higher ID second
```

PostgreSQL error:

```text
40P01
```

Recovery:

```text
ROLLBACK
retry the entire transaction
```

Use bounded retries, optionally with backoff/jitter.

---

# C6 — Optimistic Concurrency / Stale Overwrite

## Question

Two users load the same entity version.

Example:

```text
version = 4
```

User A saves first.
User B saves later using the stale version.

Answer:

1. What bug happens without concurrency protection?
2. Which primitive fits?
3. What should the SQL look like?
4. What does `UPDATE 0` mean?
5. Should the application blindly retry?

## My Answer

I identified that A's update could be overwritten by B.

I chose a version check such as:

```sql
WHERE version = $3
```

## Correction / Final Answer

Primitive:

> **Optimistic concurrency / version check**

Correct pattern:

```sql
UPDATE entity
SET value = $1,
    version = version + 1
WHERE id = $2
  AND version = $3
RETURNING id, version;
```

Important:

```text
$3 = version originally loaded by the user
```

not a freshly queried version at save time.

If `UPDATE 0`:

> stale-write conflict detected.

Do **not** blindly retry because the user's decision was based on stale data.

The caller should reload/reconcile against the newest version.

---

# C7 — Retry Classification

## Question

Classify common PostgreSQL failures and decide whether they should be retried automatically.

Cases include:

- unique violation;
- deadlock;
- serialization failure.

Relevant SQLSTATEs:

```text
23505
40P01
40001
```

Answer:

1. Which failures are retryable?
2. Why should duplicate-email/unique violations not be blindly retried?
3. How should the application map duplicate-email failure?
4. What should happen after deadlock or serialization failure?
5. Why should retries be bounded?

## My Answer

I initially classified `23505` as retryable.

I correctly reasoned that retrying the same already-conflicting unique value would keep failing unless the input changed.

I said duplicate email should return something like:

```text
already registered / use another email
```

I also understood that retries should be bounded.

## Correction / Final Answer

### `23505` — unique violation

```text
Do not blindly retry.
```

Reason:

> The failure is usually a stable business conflict, not a transient database anomaly.

Example:

```text
email already registered
```

Map to an expected business response, often HTTP `409 Conflict`.

### `40P01` — deadlock

```text
ROLLBACK
retry whole transaction
```

with bounded attempts.

### `40001` — serialization failure

```text
ROLLBACK
retry whole transaction
```

with bounded attempts.

Why bounded retries:

- prevents infinite loops;
- prevents retry storms;
- prevents load amplification;
- gives the system a controlled failure boundary.

Final mental model:

```text
23505
→ business conflict
→ no automatic retry

40P01
→ transient deadlock
→ rollback + bounded whole-transaction retry

40001
→ transient serialization failure
→ rollback + bounded whole-transaction retry
```

---

# Final Assessment Part C — Status

Completed:

- C1 — Broken transaction boundary ✅
- C2 — Missing rollback ✅
- C3 — Lost update ✅
- C4 — Slow external work while holding a lock ✅
- C5 — Deadlock ✅
- C6 — Optimistic concurrency / stale overwrite ✅
- C7 — Retry classification ✅

## Part C Result

**Final Assessment Part C complete.**

Suggested commit:

```bash
git add final-assessment-part-c.md
git commit -m "test: complete final assessment debugging cases"
git push
```

---

# Next Course Step

## Final Assessment — Part D: Implementation Task

The next section is a correctness-sensitive backend implementation using real PostgreSQL.

The required primitive is **not announced in advance**.

After Part D:

- Part E — Technical Defense
- Mastery Gate
