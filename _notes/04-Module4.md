1. What value will Session A read?
10

2. What value will Session B read?
10

3. What value will A calculate?
11

4. What value will B calculate?
11

5. If A writes first and B writes afterward,
   what do you predict the FINAL database value will be?
11

6. What SHOULD the final value logically be after two increments?
12

7. Which information gets lost?
Session A’s increment is lost because Session B overwrites the value with a result calculated from stale data.



Session A:
UPDATE counters
SET value = value + 1
WHERE id = 1;

Session B:
UPDATE counters
SET value = value + 1
WHERE id = 1;

1. What final value do you predict?
12

2. Does Session B calculate its new value from the old value 10
   that it previously read in Node?
NEW VALUE

3. Why might this be safer than SELECT → calculate → UPDATE?
Because the value can be updated between the sleect and update by another request and it will be lost.






UPDATE products
SET stock = stock - 1
WHERE id = 1
  AND stock >= 1
RETURNING stock;
1. Starting stock = 1.
   Request A executes the statement first.
   What happens to the stock?
goes to 0

2. Then Request B executes the exact same statement.
   Will PostgreSQL produce an SQL error?
it will not update an error... no data found error

3. How many rows do you predict Request B will update?
0

4. What does "0 rows updated" mean from the BUSINESS point of view?
it means that the transaction failed ... the application should explain why

5. Why is:
      AND stock >= 1
   fundamentally different from checking stock >= 1 in Node
   before the UPDATE?
because, if we choose the second option, we could end up selling two itens even though we just have one









1. Starting stock = 5.
   What does RETURNING stock give after one successful purchase of 3?
it returns 2 (5-3 = the remaining stock)

2. If another customer immediately tries to buy another 3,
   how many rows will that UPDATE affect?
0, because there are only 2 (2 < 3)

3. Suppose product id = 999 does not exist.
   The same conditional UPDATE also affects 0 rows.

   From only "rowCount = 0", can the application know whether:
   A) the product does not exist
   or
   B) the product exists but has insufficient stock?
no, it does not know, because the update could return 0 rows either because there wasnt enough stock or because the product id did not exist








1. Inventory:
   Reduce stock by 2 only if stock >= 2.
yes, because it can only sell stock that you already have

2. Coupon:
   Increment redemptions only if redemptions < redemption_limit.
yes, because its related to a clear limit (you wont allow redemptions if the limit has already been surpassed)

3. Order:
   Change status from 'pending' to 'paid'
   only if current status is still 'pending'.
yes, because its a business rule

4. Account:
   Debit $100 only if balance >= 100.
yes, because it can only debit if you have enough funds

5. Username:
   Create a user only if no other user has the same username.
no. this is uniqueness in the database and its a business rule protectedbby the database








1. Why did appointment booking naturally fit a UNIQUE constraint,
   while inventory decrement needed an atomic conditional UPDATE?
becasue for the first ine, you need to validate other rows to insert or update an appointment. for the second, you just need to validate the value being inserted/updated

2. If this statement:

   UPDATE products
   SET stock = stock - 1
   WHERE id = 1
     AND stock >= 1
   RETURNING stock;

   affects 0 rows, what does that mean?
   Is it necessarily an SQL/database error?
it means that either the product_id 1 doesnt exist or the stock is smaller than 1. its not an error

3. Why is this unsafe:

   SELECT stock
   → validate in Node
   → UPDATE stock

   even if all three steps happen very quickly?
because, even if happens very quiclky, it still can miss some update in the value a long the way


4. Would wrapping that original SELECT → validate → UPDATE
   sequence in a normal transaction automatically make it safe?
   Why or why not?
no. also, since its just a select, you do not need the transaction. but, more important than this is that, wraping them up in a trransaction only ensures that both queries happens only if both runs successfully, but it does not ensure that it wont be affected by other requests