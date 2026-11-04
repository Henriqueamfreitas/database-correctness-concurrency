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