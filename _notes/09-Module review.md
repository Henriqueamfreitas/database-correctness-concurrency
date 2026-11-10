Scenario 1 — Healthcare scheduling
A hospital has appointment slots identified by:
hospitalId
appointmentDate
appointmentTime

Before creating an appointment, the API checks whether the slot exists.

Two Node instances can receive booking requests for the same slot at the same time.

Business rule:
At most one appointment may exist for a given hospital/date/time combination.

Choose the primitive or combination you would use.
i WOULD CHOOSE UNIQUENESS ON THE DATABASE ON THE COMBINATION OF hospitalId, appointmentDate,appointmentTime
i will levae the date and time to be selected. when 2 users click on it, i would use the pessimistic concurrency to resevre the slot and return that its no longer available for the second request






Scenario 2 — Inventory
A product has:
stock = 3

A purchase wants quantity 2.

Business rule:
Stock must never become negative.

There may be many concurrent purchases.

Choose the primitive.
i forgot the name of it, but i would not allow to have negative values






Scenario 3 — Coupon campaign
A coupon campaign has:
redeemed = 99
limit = 100

Two users redeem at the same time.

Business rule:
redeemed must never exceed limit.

Choose the primitive.
i forgot the name... its not uniqueness, and its more like the previous one






Scenario 4 — Account transfer
Transfer R$100:
Account A → Account B

Business rules:
- A must have enough balance.
- Debit and credit must either both happen or neither happen.
Concurrent withdrawals from A are possible.

Choose the primitive or combination of primitives.
atomicity
pessmitic concurrency





Scenario 5 — Reservation editor
A user opens a reservation details page and spends 20 minutes editing notes.

Another employee may update the same reservation during that time.

Business rule:
A stale copy must not silently overwrite newer changes.

Choose the primitive.
optimisitc concurrency






Scenario 6 — Workflow transition
An order has:
status = 'pending'

A payment callback should move it to:
status = 'paid'

but only if it is still pending.

Several duplicate callbacks may arrive.

Choose the simplest primitive.
pessimiscit concurrency






Answer these four, briefly:
1. Limited coupon usage
   - used = 49
   - limit = 50
   - two requests arrive together
     What primitive do you choose, and why?
atomic conditional update: you try to update with the where clause that used < limit. if the where clause is not satisfied, the update does not happen and you did not lock any row


2. User email
   - email must be globally unique
   - two app instances try to create the same email simultaneously
     What primitive do you choose?
uniqueness


3. Transfer
   - debit account A
   - credit account B
   - both must succeed together
   - A cannot go below zero
     What combination of primitives do you choose?
atomic conditional update, and atomicity


4. Document editor
   - user loads version 8
   - edits for 30 minutes
   - meanwhile another user saves version 9
     What primitive do you choose, and what happens when the stale user saves?
optimistic concurrency. the stale user chances are not saved and it returns to them that it has a conflict