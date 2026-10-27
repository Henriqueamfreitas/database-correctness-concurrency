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