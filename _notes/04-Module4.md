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