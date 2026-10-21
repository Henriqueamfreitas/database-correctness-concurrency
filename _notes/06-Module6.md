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