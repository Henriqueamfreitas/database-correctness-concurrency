Answer these:
1. What should happen to A’s update?
   under optimistic conccurency, and supposing a 'arrives first', it should upfate notes and the expected version to 2

2. What should the row’s version become after A succeeds?
   2

3. What should happen when B tries to update using expectedVersion = 1?
   it wont update because it will try do do it on where expectedversion = 1, butt it will be 2

4. What should PostgreSQL return for B if we use the conditional UPDATE ... WHERE version = $3 RETURNING ...?
   0 rows affected

5. Why do we call this strategy optimistic rather than pessimistic?
   because there is no lock on the database



Optimistic concurrency:
does not prevent concurrent edits
→ it detects stale writes

Pessimistic concurrency:
tries to prevent conflicting concurrent work
→ by making competitors wait

this means that under optimistic, request a can udate column 2 and request b can update column 4 of the same row. under pessimistict, you block the entire row for updates?



What should happen, and why does the version value prove that A’s copy is stale even if A has no idea how many changes happened in between?
becauyse the where clause is just row equals the expected row value. it does not matter if its a difference of 1, 2, 3 etc as long they are different, it wont update



UPDATE reservation_details
SET
  notes = 'notes b',
  version = version + 1
WHERE id = 1
  AND version = 1
RETURNING id, notes, version;






Scenario A
version-based optimistic concurrency. The update depends mostly on the human thinking, so it can take several minutes and it would not be a good feature to lock a row for writing for this much time


Scenario B
Pessimistic concurrency here. here, the actions depends exclusevly on the database and its estimated to take 20 ms, so its ok for lock a row for this very short period of time






Scenario 1
A doctor opens a patient's editable profile. They may spend 10 minutes reviewing and changing contact information before clicking Save. Another employee might edit the same profile during that time.

Which concurrency strategy would you choose, and what should happen if the doctor tries to save an outdated copy?
ANSWER: Optimist concurrency, as you dont want to leave a transaction open for this much time. if the doctor tries to save an oudated copy, it should not alloew it, because, since we are using optimistic, the where clause on update would not match because the versions do not match. i dont know if the best way is to verify field by field (for example, user b updates cellphone and name; doctor updates cellphone and mother´s name. the best way isnt to let the docotor update the mother's name?)


Scenario 2
A backend request needs to:
read available room
↓
make allocation decision
↓
create reservation
↓
mark room unavailable

The entire operation takes around 15–30 ms, and many requests frequently compete for the same rooms.

Which strategy would you choose, and why would the other strategy be less attractive?
ANSWER: pessimistic concurrency. it has a lot of requests competing for the same rooms and the time to complete the transaction is very small. if we instead choose the optimistic one, we could have many requests perfoming unnecessary operations on the database because only one transaction would succeed and the others would have to do it all over again. s


Scenario 3
A configuration record is edited perhaps twice per month, but users may leave the editing page open for hours before saving.
Which strategy would you choose?
optmistic concurrency. i dont want to leave a transaction open for hours and there is very few updates (2 per month tops)







Answer these without looking back at your notes.
1. What is the core difference between optimistic and pessimistic concurrency?
pessmisitic leaves a database connection open for the entire duration of it and it locks the row
optimistict does not lock the row nor leaves a database connection open


2. What does a version column actually prove?
that the current request has the right to update it because nobody did it between the start of the transaction and the update of it

3. Why does optimistic concurrency detect conflicts instead of preventing them?
   because no one is locking that row and only the version column blocks concurrent updates... so, when you try to update and the version isnt correct, it will detect a conflict

4. What happens to optimistic concurrency under high contention?
   only one of the requests can complete the transaction and the thers will detcet conflict and to succeed

5. When is waiting on a row lock better than discovering a conflict later?
   when the transaction total time is in the miliseconds/usally, associated with a machine taking a decision instead of a human being

6. Suppose:
   - A reads version 4
   - B reads version 4
   - A updates successfully to version 5
   - B tries WHERE version = 4
   What should happen to B, and what should the application do with that result?
   only updates in succeed and b is rejected. it should return to b that it was not able to update the values because someone else updated first

7. Choose the better strategy and explain why:
   A. A user edits a form for 15 minutes before saving. optimistic concurrency, beacsue you dont want to leave a database transaction open for too long
   B. A backend transaction lasts 20 ms and hundreds of requests compete for the same row. 
      pessmistic concurrency, because the total time is small (in the miliseconds) and there are a lot of requests being made (uit would have lots of conflicts otherwise)

8. What is the main trade-off of optimistic concurrency?
   you dont levae a database transaction open for too long and dont lock a row, but you have conflicts and, if aplicated wrong, it can make sevral unecessary operations (if the transaction has lots of operations, the conflict ones will have to perform all of them again)

9. What is the main trade-off of pessimistic concurrency?
   leaving a database transaction open for much time and locking a row, mamking other requests wait for the first one to finish. dont have conflicts and doesnt do uncessary opeerations

10. Why might a single row-level version reject an update even when two users changed different columns?
   becasue the version is associated with the row not with specific values od it
