Session A                         Session B
---------                         ---------

BEGIN

SELECT value
→ ?

                                  UPDATE value = 200
                                  COMMIT

SELECT value again
→ ?

COMMIT
1. What value do you expect A's first SELECT to return?
the orignal value (different from 200)

2. B changes the value to 200 and COMMITs.
   Is B's change now committed and visible to new statements?
yes

3. A is still inside the SAME transaction.
   What do you predict A's second SELECT will return:
   100 or 200?
200

4. Does BEGIN guarantee that A sees one frozen snapshot
   for the entire transaction?
i dont know. i suppose it does not to answer the previous question

5. If A sees 100 first and 200 second,
   does that mean atomicity was violated?
no. the transaction will only be commited if both of them succeed
Atomicity is about the transaction’s writes being all-or-nothing, not about whether two SELECTs return the same value. 







1. What value should A's first SELECT return?
it should return 100

2. After B commits 200, what do you expect A's second SELECT to return:
   100 or 200?
it should return 100


3. Why do you think Repeatable Read changes the answer compared
   with Read Committed?
   becausewhen you put that clause in, you take a picture of the current state and uses the values on it, not in the most recent database updates

4. After A commits and starts a NEW transaction, what value should
   a new SELECT return?
   200

5. Suppose A tries to UPDATE the same row after B committed a
   conflicting change. Do you expect PostgreSQL to:
   a) silently overwrite it
   b) always wait and then succeed
   c) possibly reject/abort A's transaction
   im not sure about it, but definitelly not A, but im going with B


Why is it not enough to retry only the failed UPDATE statement after this serialization error? Why should the application usually retry the whole transaction?
Because we are still not sure the uypdate will work and since its inside a transaction, either everyting succeeds or neither one



1. Did either transaction individually make an obviously invalid decision
   based on what it saw?
   no, it did not... it saw more than one doctor available, so it could assign a doctor to an appointment and still leave one available

2. If both transactions commit, is the business rule violated?
yes. there will be no doctors available

3. Could that final outcome happen if A and B had truly run
   one after the other and each re-read current state?
   im not sure.
   im still not sure why cant we just use the select for update... in this case,it wouldnt allow the second docotr to be assigned 

   no, it could not happen.

4. Under Serializable, what do you expect PostgreSQL to do:
   allow both, block forever, or abort at least one transaction?
   allow one of them and abort the second one... then, it would retry the transaction with a fresher snapshot


Scenario:
Two users each try to reserve the last available seat.

Option A:
UNIQUE constraint on seat_id

Option B:
SELECT ... FOR UPDATE on the seat row

Option C:
SERIALIZABLE transaction

i think you can use all 3 of them (not together), but, since we have a specific and small part of the table (only one row), i would choose select for update (if you combine with the unique constraint is even better)

if there is only the unique constraint, the database wouldnt allow the reservation, but no transaction would wait
with the select for update, the database would not 'take the decision', but the second request would wait for the first one to get its return
with the serializible, it would work more like the unique constraint in a sense that the database wouldnt allow it and, in the second try, it would not make the reservation (since there is one more database transaction, i think this is the worst option, eventhough its not wrong)



Suppose Transaction A under Read Committed does:
SELECT balance → 100

B commits balance = 50

SELECT balance again → ?

And under Repeatable Read, the same sequence happens.

Tell me:
1. what A sees on the second read under Read Committed;
50

2. what A sees under Repeatable Read;
100

3. under serializible, it sees 100 and abort the transaction so it can retry the transaction and then read 50

3. what key extra risk/cost Serializable introduces compared with weaker isolation.
That will tell me whether the three isolation levels are cleanly separated in your mental model.
it needs to check it again








1. Why can two SELECTs inside the same Read Committed transaction return different values?
because between then, another request may update the value

2. What does Repeatable Read change compared with Read Committed?
under repetable read, when you start the transaction, you take a photo of the value and you use it for the entire transaction (baiscally,if you do a new select, it will perform against the photo, not the database) whereas in the read commited, all the selects are against the database

3. What extra guarantee does Serializable add beyond Repeatable Read?
if you try to update the value of the sanpshot and another rrequest already made one in it, it will rollback and retry the transaction (basically, take another photo)

4. Why can Serializable require application-level retries?
because another request can update the value of the snaphsot while the transaction is running. but, we need to perform the entire transaction again, becaise this updated value may change what decision the transaction will take

5. Why doesn’t simply writing BEGIN automatically solve concurrency problems?
because it only ensures the atomomicty property. either verything happens or nothing does

6. Choose the best isolation behavior for each description:
A. I want later statements to see newly committed data.
→ ? Read Committed;

B. I want all reads in this transaction to use a stable snapshot.
→ ? Repeatable Read;

C. I need the committed outcome to behave as if concurrent
   transactions had executed one at a time.
→ ? serializible
