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