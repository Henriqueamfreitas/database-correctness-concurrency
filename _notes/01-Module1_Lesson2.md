1.  
A. What should happen if both operations belong to one correctly managed transaction?
a rollback should happen in a way that the data remains as before the incomplete transfer

B. atomicity

C. no, it does not. this only ensures that the transaction happens if both actions completed. But, to guarantee that A has enough moeny, you need to check it first if account A > 100.

2. When should these database effects become permanent?
after both of them completed

3. The state produced by this transaction is valid and can become permanent.
when to use commit

4. 
BEGIN
  1. create order
  2. reduce inventory
  3. record payment
END
COMMIT

D. What database state would be incorrect after this failure?
Atomicity

E. 
BEGIN
  create appointment
  charge patient's prepaid balance
END
COMMIT
  create confirmation record

F. Without a transaction, what incorrect states could remain? Try to identify all important persisted effects, not just the balances.
The money left fromAccountId but never wnet where it was supposed to go;
the transfer history registered that the money went from fromAccountId to toAccountId

G. If all three operations belong to the same transaction and we roll it back, what should the final state be?
Nothing should change... balance from fromAccountId and fromm toAccountId should remain the same. Depending on the business rule, you can register the transferHistory, as long as we have a status column to tell us that it did not go through

H. Why isn't the fact that JavaScript executes the three awaits sequentially enough?
Because, the await allos other syncronous proccess to go through while de asycnhronous ones are being processed. the logic behind the scenes is: debit -> commit its changes on database -> createTrasnferHistory -> commit its changes on database -> credit -> commit its changes on database. If any of them fails, the previous one would be completed and wouldnt roll it back
