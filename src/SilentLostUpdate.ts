import { Pool } from "pg"

const incrementCounter = async (
  id: number,
  pool: Pool,
) => {
  const result = await pool.query(
    `
    SELECT value
    FROM counters
    WHERE id = $1
    `,
    [id],
  )

  const currentValue = result.rows[0].value

  await pool.query(
    `
    UPDATE counters
    SET value = $1
    WHERE id = $2
    `,
    [currentValue + 1, id],
  )
}

// Assume:
// counter value = 10

// and two requests call incrementCounter(1) concurrently.

// Answer these:
// 1. What concurrency bug exists?
  // another request can update the value between the first select and the update, so one count would be lost
// 2. Draw the shortest A/B timeline that produces the wrong result.
  // request a reads value = 10
  // request b reads value = 10
  // request b updates value to 11
  // request a updates value to 11 (should update to 12)

// 3. What final value could be stored, and what should the correct value have been?
  // 11, and 12 should be the correct value (assuming 2 requests incrementing the counter)
// 4. What is the smallest correct fix?
  // remove the iirst quert and the current valueand just edit the updatye to value = value + 1
// 5. Why is that fix better than adding SELECT ... FOR UPDATE here?
  // because you dont need to add a transaction (to encapsultate the select for update and the update) and you dont lock any rows