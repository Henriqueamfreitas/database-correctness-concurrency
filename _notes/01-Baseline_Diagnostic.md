1. with dtabase transactions, we gurantee that the two transactions happen if, and only if, the 2 of the return no errors

2. Does that automatically make the operation concurrency-safe? no it does not, because this only guarantees the insert happens with select happening.
to avoid cuncurrency, you must implement uniqueness in your table creation

3. yeah, thats the problem of concurrenycy right there.. the 2 transations could return that the product was available, even though it should be available for just one of them

4. if can only be one appointment per schedule




5. Why was Request B able to see 0 even though Request A was also trying to reserve the slot?
  because transaction b was funlly completed when a does the select in the database

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