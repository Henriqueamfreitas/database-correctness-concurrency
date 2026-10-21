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




1. What exactly does SELECT ... FOR UPDATE do?
it locks thw selected value for that row, in way that any updates from other requests in this row will have to wait for this transactin to be completed to complete itself 

2. Does SELECT ... FOR UPDATE change the row's data?
no, it does not. it just kind reserve the rows for you until you release it

3. If Transaction A holds a FOR UPDATE lock on room 1,
   what happens when Transaction B tries:
   a) a normal SELECT on room 1?
   it happends normally
   b) another SELECT ... FOR UPDATE on room 1?
   it will wait the transaction a to bem completed
   c) an UPDATE on room 1?
   it will wait the transaction a to bem completed

4. How long does the row lock remain held?
until the transaction that uses select for update is complete (rollback or commit)

5. Why can pessimistic locking reduce throughput?
im not entirely sure on what is throughput, but i think it has something to do with latency and it can increace its value
Analogy: a supermarket checkout. Latency is how long you wait to pay. Throughput is how many customers the cashier can process per hour.
Pessimistic locking can reduce throughput because conflicting transactions must wait instead of progressing concurrently, so fewer operations may complete per unit of time.

6. Why is this usually dangerous?

   BEGIN
   SELECT ... FOR UPDATE
   call external API for 5 seconds
   UPDATE ...
   COMMIT
because you lock the row for at least 5 seconds

7. When would you prefer this:

   UPDATE products
   SET stock = stock - 1
   WHERE id = $1
     AND stock >= 1
   RETURNING stock;

   instead of:

   BEGIN
   SELECT ... FOR UPDATE
   ...
   UPDATE ...
   COMMIT;

   when the conditions on where to update are easy to express in a where clause

8. In our room reservation example, why did we lock the
   rooms row rather than room_reservations?
   because its the room info that really matters... the other is just like a log info... you can see who tried to reserve the room, but do not necessairly got it
   We lock the rooms row because the booking decision depends on that room’s current available state. The reservation row does not exist yet and is created only after the protected decision succeeds


UNIQUE constraint
atomic conditional UPDATE
transaction
SELECT ... FOR UPDATE

A. Username must be unique across users. 
UNIQUE constraint

B. Decrement stock only if enough stock remains. 
atomic conditional UPDATE, because the condiotion to update is simple

C. Read room availability, insert a reservation,
   update another dependent table, then mark room unavailable.
transaction
SELECT ... FOR UPDATE because you need to also update another dependent table

D. Transfer money:
   debit account A and credit account B as one unit.
transaction and SELECT ... FOR UPDATE.
you need transaction because you want to complete the transaction only if everything happened correctly. also, ou must ensure account a has enough money. i chose select for update instead of conditional because maybe it has enough funds for this transaction but a seconed request is also debiting money from it that has enough money for it, but not for them combined.

E. Prevent two workers from modifying the same mutable row
   while a multi-step decision is being made.
select for update