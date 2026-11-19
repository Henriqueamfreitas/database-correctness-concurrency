Final Assessment — Part B: Mixed Scenarios
Scenario B1 — Limited API Key Usage
A SaaS plan allows each customer to make at most:
10,000 API calls per day

Current state for customer 42:
calls_used = 9,999

Two requests arrive concurrently.

Business rules:
- calls_used must never exceed 10,000.
- The request that exceeds the limit should fail normally.
- There is one usage row per customer/day.
- Traffic is high.
- The application runs on multiple Node instances.
Answer:
1. What can go wrong with:
   SELECT calls_used → check → UPDATE?
  the user can surpass the limit of 10.000

2. Which primitive would you choose?
  Atomic conditional UPDATE

3. Show roughly what the SQL should look like.
  update table
    set value = :value
  where id = :id and usage < 10000

4. Why would you not choose SELECT ... FOR UPDATE here?
  i mean, it will work, but it will increase your throughput and latency becuse you will lock the row and make other waits 

5. What should the application interpret when the statement affects 0 rows?
  that it was not updated and either the id does not exists or the usage would surpass 10.000




Scenario B2 — Limited Lab Machine Capacity
A lab has 5 identical testing machines.

Current state:
machines_in_use = 4

Two requests arrive almost at the same time:
Request A → reserve 1 machine
Request B → reserve 1 machine

Business rules:
- At most 5 machines may be in use.
- If capacity is full, the request should fail normally.
- There is one shared capacity row for the lab.
- The application runs on multiple instances.
- Traffic may spike during test runs.
Answer:
1. What can go wrong with:
SELECT machines_in_use
→ check machines_in_use < 5
→ UPDATE
  it can surpass 5 machines in use

2. Which primitive would you choose?
  atomic conditional update

3. Show roughly what the SQL should look like.
  update tablke
    set machines_in_use = machines_in_use + 1
  where machines_in_use < 5;

4. Why would you choose that instead of SELECT ... FOR UPDATE?
it would increase latency and decrerease throughput

5. What should the application interpret when the update affects 0 rows?
  no rows updated because there is no machines available










Final Assessment — Part B: Mixed Scenarios
Scenario B3 — Shared Approval Budget
A department has a monthly approval budget:
budget_remaining = 500

Two reimbursement requests arrive concurrently:
Request A → approve 400
Request B → approve 300

Business rules:
- budget_remaining must never become negative.
- If there is not enough budget, that request should fail normally.
- There is one shared budget row.
- Multiple app instances may process approvals concurrently.
- High contention is possible near the end of the month.
Answer:
1. What can go wrong with:
SELECT budget_remaining
→ check budget_remaining >= amount
→ UPDATE
  It can surpass the limit by 200

2. Which primitive would you choose?
  Atomic conditional UPDATE

3. Show roughly what the SQL should look like.
  update table
  set budget_remaining = budget_remaining - :value
  where budget_remaining >= :value;

4. Why would you choose that instead of SELECT ... FOR UPDATE?
  it will work but it will increase latency and reduce througput (the other one is simpler and does not make other requetss wait)

5. Would you also add a CHECK (budget_remaining >= 0) constraint? If yes, what role does it play?
  i yes, you can check this too, but it would be better to add a check on the database







Scenario B4 — Warehouse Picking Reservation
A warehouse order needs to reserve inventory from two different product rows:
Product A stock = 3
Product B stock = 2

One order needs:
2 × Product A
1 × Product B

Two identical orders arrive almost at the same time.

Business rules:
- An order should succeed only if both products have enough stock.
- If one product is unavailable, neither stock value should change.
- Stock must never become negative.
- Multiple app instances may process orders concurrently.
Answer:
1. What can go wrong if the application checks both stocks first and then performs two separate updates?
  it can fall in the deadlock case

2. Which primitive or combination of primitives would you choose?
  transaction (all or nothing)
  select ... for update (ensure there is enough for both products and its not a simple condtion - there are 2, one for each prodcut - to use atomic conditionall update)
  consistent lock ordering (alwatys make the requests select)

3. Why is a transaction necessary here?
  because you only allow to buy if there is enough of both prdocuts

4. Would you use atomic conditional updates inside the transaction? Why?
  no, because its not a simple condition that fits on one where

5. Why might SELECT ... FOR UPDATE be optional rather than mandatory in this specific design?
  maybe if you use serializible isolation?







Scenario B5 — Appointment Reschedule
A patient already has an appointment:
appointment_id = 50
slot = 10:00

They want to move it to:
11:00

At almost the same time, another patient is trying to book the 11:00 slot.

Business rules:
- A slot may belong to at most one appointment.
- The patient must never lose the old appointment unless the new slot is successfully acquired.
- Multiple app instances may process requests concurrently.
- Booking conflicts are expected business outcomes.
Answer:
1. What can go wrong if the application first deletes/releases the 10:00 appointment and then tries to book 11:00?
  the user could end up with no appointment at all

2. Which primitive or combination of primitives would you choose?
  atomic conditional update
  transaction

3. Which database invariant should be enforced directly?
  uniqueness

4. Why is a transaction necessary here?
  to avoid the scenario described in one

5. If another request wins the 11:00 slot first, what should happen to the original 10:00 appointment?
  it should remain booked for the orignal patient








Scenario B6 — Cross-Row Shift Coverage
A hospital department must always keep at least 2 nurses on duty.

Current state:
Nurse A → on duty
Nurse B → on duty
Nurse C → on duty

Two different requests arrive almost at the same time:
Request A → take Nurse A off duty
Request B → take Nurse B off duty

Business rules:
- At least 2 nurses must remain on duty.
- Each request updates a different nurse row.
- The application runs on multiple instances.
- There is no single nurses_on_duty counter row.
- Each request first counts how many nurses are currently on duty.
Answer:
1. What can go wrong with:
COUNT nurses on duty
→ if count > 2
→ UPDATE one nurse to off duty
it can have less than 2 nurses available

2. Why would a CHECK constraint on each nurse row not solve the invariant?
  because this condition is across lines, not only one

3. Why would locking only the nurse being updated with SELECT ... FOR UPDATE not solve it?
  because this condition is across lines, not only one, so you would only add a possible wait in other request and not solve the problem

4. Which primitive would you choose?
  Serializable isolation

5. What failure should the application be prepared to handle, and what should it do?
  it should expect the serialization failure 40001
















Scenario B7 — Order Fulfillment with Two Competing Resources
This is the last scenario of Part B.

An order needs to allocate:
1 delivery slot
1 warehouse picker

Current state:
delivery_slot 18:00 → available
picker 7 → available

Two different orders arrive almost at the same time and both try to use that same slot and same picker.

Business rules:
- A delivery slot can belong to only one order.
- A picker can belong to only one active order at that time.
- The order must get both resources or neither.
- Multiple app instances process orders concurrently.
- The operation is short and database-local.

Answer:
1. What can go wrong if the application does:
   check slot → check picker → insert assignment → update both resources?
  assign the delivery slot for order a and the picker to order b

2. Which primitive or combination of primitives would you choose?
  transaction
  atomic conditional update
  uniqueness (invariant)

3. Why is a normal transaction alone not enough?
  it will only ensure that all suceed or all fail, but it will not solve the concurrency part 

4. Would you lock both resources? If yes, how would you avoid deadlocks?
  no... just make sure to check in order all requests... first, assing delivery slot and then pciker

5. Which invariants would you also encode directly with database constraints?
  uniqueness ... slot and picker