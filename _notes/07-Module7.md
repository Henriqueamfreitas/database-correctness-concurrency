1. After the first two UPDATEs, is either transaction waiting?
no.

2. When A tries to update row 2, what happens?
it remains waiting for session b first transaction to commit

3. At that exact moment, is there already a deadlock, or just blocking?
at the moment a tries its second update, its just blocking

4. When B then tries to update row 1, what changes?
now a is being blocked by b and vice versa, creating a deadlock

5. Draw the dependency using:
First update in B → Second update in A
First update in A → Second update in B

6. Can either A or B resolve the situation simply by continuing normally, or does PostgreSQL need to intervene?
No, postgres needs to inervene on it


If Session A always locks row 1 before row 2, and Session B also always locks row 1 before row 2, why does that greatly reduce the chance of a deadlock?
Because you try to grab the first key before even staring any update... basically, yougrab the key for row 2, then grabs key for row 1, enter it and then enters row 2 with the key you already grabbed



Suppose your backend has this transaction:
BEGIN

1. debit account A
2. credit account B
3. create transfer record

COMMIT

It becomes a deadlock victim after step 2.

Answer these before we write retry code:
1. After PostgreSQL chooses this transaction as the deadlock victim, can the application simply retry step 3?
no. since its in a transaction, either all of them succeeds or none of them. keeping that in mind, the application should rllback and retry the entire trnsaction with the updated values (similar on what we saw in week 5)

2. Should it retry only the SQL statement that received 40P01, or the whole transaction?
the whole transaction for the reason i stated in the previous answer

3. Why could retrying just one statement produce incorrect business behavior?
becasue the last statement could be made based on old values that would not happend with the correct updated values

4. If the exact same transaction deadlocks 20 times in a row, should the application retry forever?
Keep the answers conceptual for now.
i dont think so.. if it failed 20 times, it probably wont workin the 21, 22 etc. the correct way is to put an alert after a fixed number of erros and investgiate to see whats happening




Suppose your transaction does this:
1. BEGIN
2. debit account A
3. credit account B
4. send confirmation email
5. COMMIT

Question:
If the transaction deadlocks after step 3 and the application retries the whole transaction, what is dangerous about having the email send inside the transaction retry loop?
You have to have a condition that exectus the email only if the transaction succeed. otherwise, the 3 can be resolved as the deadlock and yet send the email even though the transaction rolled back

Think about what happens if the email succeeds but the database transaction later fails and gets retried.



Suppose this pseudocode exists:
for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    await runTransferTransaction()
    return
  } catch (error) {
    if (error.code !== '40P01') {
      throw error
    }

    if (attempt === 3) {
      throw error
    }
  }
}
Why is it important that a non-deadlock error is thrown immediately instead of being retried too?
because we did not consider other error cases and not all of them (acctually, very few of them) have to be retried