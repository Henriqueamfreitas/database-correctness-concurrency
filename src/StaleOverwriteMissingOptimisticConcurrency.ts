import { Pool } from "pg"

const updateReservationNotes = async (
  id: number,
  notes: string,
  pool: Pool,
) => {
  await pool.query(
    `
    UPDATE reservation_details
    SET notes = $1
    WHERE id = $2
    `,
    [notes, id],
  )
}

// Now imagine:
// User A loads reservation version 4
// User B loads reservation version 4

// User A edits for 10 minutes
// User B edits for 20 minutes

// A saves first
// B saves later

// Answer these:
// 1. What concurrency problem exists?
  // it will overwrite A's changes with B's changes -- lost updates

// 2. What happens to A’s changes when B saves?
  // it will be overwritten and lost

// 3. Why is this not necessarily solved well with SELECT ... FOR UPDATE?
  // its even worse... you will leave a transaction open for 20 minutes, locking the row and A will still be overwritten

// 4. What is the smallest correct fix?
  // just add  aversion column update it directly... it will alow updates only if its the correct version and
  // not leave a transaction open for 20 minutes

// 5. What should the application do when the stale update affects 0 rows?
  // it should retuurn that it wanst possible to update because there is a new version of the data and to try again