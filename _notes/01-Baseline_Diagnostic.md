1. with dtabase transactions, we gurantee that the two transactions happen if, and only if, the 2 of the return no errors

2. Does that automatically make the operation concurrency-safe? no it does not, because this only guarantees the insert happens with select happening.
to avoid cuncurrency, you must implement uniqueness in your table creation

3. yeah, thats the problem of concurrenycy right there.. the 2 transations could return that the product was available, even though it should be available for just one of them

4. if can only be one appointment per schedule


5. Why was Request B able to see 0 even though Request A was also trying to reserve the slot?
  a has not ommited an appointment that b can see

6. 
Request A reads stock = 1
Request B reads stock = 1

Request A decides: can purchase? yes
Request B decides: can purchase? yes

Request A writes stock = yes
Request B writes stock = yes

How many customers believe they successfully bought the product? 2
What could the final stock stored in the database be? -1

7. There must never be two purchases for the same show in the same date.


1. A is debited successfully.
   Then crediting B fails.
   Both operations are inside one database transaction.

   What should happen to the debit of A?
   it should rollback it (in other words, it should look like the debit from a never happened)


2. Timeline:

   A: SELECT appointment → none exists
   B: SELECT appointment → none exists
   A: INSERT
   B: INSERT

   At the moment B executes its SELECT,
   why can it still see "none exists"?
   becasue the transatction hasnt commited yet




3. no, it does not, unless you have a restrictior in the table properties that does not allow to the balance to be negative. either way, the best practie here is to add if balacnea > value_to_be_debitted then 


4. What would you use to guarantee that only one "henrique" can exist? uniqueness the the column username of the table. it should live in the database

5. because you check if stock is greater than zero in the same time/same operation that you are trying toupdate the value 


6. no and we fall in the same appointment at the same date and time problem... we need to add a uniqueness validation on the database (in this scenario, 2 column uniqueness)

7. i exepcted the database to reject the second request. of course this one: B. an expected possible outcome of two users racing for the same username. you want to explain second user about the problem so he can proceed to its username registration (basically, to tell him that the problme issimple and tehy themselves can correct it)

8a.  what can go wrong: 2 requests get the only coupon
8b. uniqueness


6. Account has R$100.
   Two withdrawals of R$80 happen concurrently.

   What property must the solution guarantee?
The system must guarantee that the account has the ammount to be withdranw

8. Coupon has a maximum of 100 redemptions.
   There have already been 99.
   Two users redeem simultaneously.

   What property must the solution guarantee?
The system must guarantee that the account has the ammount of coupons to be redepmted



9. application validation is to verify if that username is available
database enforcementis adding this validation inside the database

10. 
What should the application do with the transaction? it should cancell the transaction

And what should eventually happen to the first UPDATE? rollback the first update

11. its difficult to reprocduce becvause you need to amek the request almost at the same time and, if you are not fats enough, the problem wont happen (the frist transaction happens and the second does not bbcause you were to slow and, in the validation of the second transaction, the first onw has already being written)

12. 
when the requets arrives, we must see if the user hasnt already reddeem their coupon
the limited-resource problem from inventory/coupons