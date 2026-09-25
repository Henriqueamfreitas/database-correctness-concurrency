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


I.
It could destroy the transaction because when you open to many connections, it can consider one transaction per pool.query, so it can commit a transaction before the second one starts. in this way, the second one can fail and then the first one cant rollback

J.
For the same reason above... it oppens another connection, so we dont have the benefits of the transaction

k.
No. because there is no error treatment and we dont know if hte erorr is being 'engolido'and then proceeded to commit


L.After INVALID SQL fails, should we simply continue executing more queries inside that same transaction?
No, we should not. since we dont have a rollback in the catch, i dont accutaly know what we can do. we just dont want to commit the transaction andmaybe we can close the connection

M.
Because, if any of the actions inside try fails, we wnat to rollback all of the actions/functions. the transaction was not fully successful, so we dont want to any part of it to be commited

N.
Yeah, we acctualy got this error at work a couple of months ago. you keep opeening connections and leaving them open,... y best guess is that you overload your database with open connections and becomes increasingly slower

O.
We have begin; we have try catch finally; we have rollback, we have connection release; we are using the same query;the problem is that we dont ensure that the balance has enough credit to be charged this amount. in the example, we can end up with balance -50, that is AN INCORRECT STATE

P.
This is conceptualy safer because we are ensuring that the account has enough balance at the same time we are trying to charge it,instead of checking moments (it can and usually will be milidoconds) eralier. that can be enough to leave your database with invalid state

Q.
You can return the updated value in the sql


R. No, it should not continue
The transactionmust stop and rollback anything that couldve happened (in this case, nothing needs to rollback since we did not update anything because the AND balance >= 100 guard)

S.
The conditional updates protects the invaraint of incorrect state of the databse (negative balance)
the transaction protects the atomoicty invariants... evrything inse the transaction must succeed to commit the changes.

T.
BEGIN
  UPDATE WHERE BALANCE >= AMMOUNT;

  CREDIT B

  EXCEPT:
    ROLBACK
END


U.
I dont know iif we need to perform another query, but, i this case, of course i want to describe which error happened. We dont want to return every error very detailed to the user (for example, in a login page, we just say invalid credentails instead of username wrong, meaning the password is correct for some etc)

V.
For me, its very clear that this transaction will see 500, because we did not commit anything yet, so its not written on the database. still, maybe this is part of another problem, this inccurs in concurrency problem, doesnt it?

W.
BECAUSE WE WILL BECONSUIMG MORE DATABAS RESROUCES LEAVING THIS CONNECTION OPEN FOR 30 SECONDS... ANOTHER REUQETS MAY COME AND THIS ONE IS NTO AVAILABLE. IT CAN HAPPEN SO MUCH AS TO LEAVE A REQUEST WAITING FOR A CONNECTION TO BE AVAILABLE


X.
It has been written, but other requests cannt see it

Y.
Rollback must be called only when an error occurs inside a transaction and it undo the previous work inside it
Release must happen in every request after everything reagrdless of the success or failures of the transaction. it cleans the connection and leave it free for other requests 

Z.
Complete this:
await operationA()
await operationB()
only guarantees ATOMICITY.
It does not guarantee CORRECT STATE OF THE DATABASE.

AA.
  1. CORRECT STATE OF THE DATABASE
  2. Atomicity


X. A transaction updates balance 500 → 400 but has not committed.
   What can that transaction see? 400
   What can another normal transaction see? 500

Y. What is the difference between ROLLBACK and client.release()?
everything i said before but rollback can be called eve when there is no error. (you did not update anythign on the balance because it wasnt enough funds, so we dont have to cedit it to anotehr account)

Z. Two sequential awaits guarantee the second functions waits for the first ne to finish to then proceed to execute itself.
   They do NOT guarantee atomicty, (all of them hgappends succesfully or we have a roollback).

AA.
1. What exact business rule does the conditional debit protect? it protects us for leaving an accfount with negative balance
2. What exact business rule does the transaction around debit + credit protect?
it protects us from creditng account b with money that did not leave account a because it diudnt have  enough funds