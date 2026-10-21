1. Session A has executed SELECT ... FOR UPDATE.
   What do you think FOR UPDATE has done to product id = 1?
   it has selected it for update, but i dont know if it wors as select and the update or update where id = 1

2. Session B now tries:

   UPDATE products
   SET stock = 5
   WHERE id = 1;

   What happens?
   A) executes immediately
   B) fails immediately
   C) waits
   i really do not know
   it can execute immediately if it works like select then update
   it can wait if it works like update where id

3. While B's UPDATE is waiting, imagine another session performs:

   SELECT *
   FROM products
   WHERE id = 1;

   Does this normal SELECT also wait? i think so, becuase a property of it is being updated

4. What event do you think releases A's row lock?
the end of the update transaction

5. After A releases the lock, what do you expect to happen
   to B's waiting UPDATE?
   to conclude the second update




1. Which exact row is being protected?
the row with room_id 1

2. If Request B also runs:
   SELECT available
   FROM rooms
   WHERE id = 1
   FOR UPDATE;

   while A still holds the lock, what happens to B?
   it remains locked

3. Why might FOR UPDATE make this
   read → decide → multiple writes
   workflow safer than a normal SELECT?
   because it locks other potential requests that are trying to book the same room

4. When should A release the lock:
   immediately after the SELECT,
   after the dependent work,
   or much later after external API/network calls?
   after the ependent work, if this means after the transaction that put the lock on completes wih commit or rollback




1. BEGIN
   SELECT ... FOR UPDATE
   UPDATE ...
   COMMIT
   → total transaction time: 20 ms
safe, because the transaction is concluded in a short period of time

2. BEGIN
   SELECT ... FOR UPDATE
   call external API that takes 4 seconds
   UPDATE ...
   COMMIT
safe, because you probably need to hold the current value of the select for the external api


3. One transaction locks 500 product rows,
   but only updates 1 of them.
   bad, because you lock 499 rows that wont be used by this transaction making other unrelated requests potentially slower

4. The operation can already be expressed safely as:
   UPDATE products
   SET stock = stock - 1
   WHERE id = $1
     AND stock >= 1
   RETURNING stock;

   But the developer instead uses:
   BEGIN
   SELECT ... FOR UPDATE
   ...
   UPDATE ...
   COMMIT
   i acctualy don know the differnece... for me, both of them are safe