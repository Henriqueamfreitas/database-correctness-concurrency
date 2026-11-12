import { Pool } from "pg"

const updateProfile = async (
  userId: number,
  newBio: string,
  pool: Pool,
) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const result = await client.query(
      `
      SELECT id, bio
      FROM users
      WHERE id = $1
      FOR UPDATE
      `,
      [userId],
    )

    if (result.rowCount === 0) {
      throw new Error('User not found')
    }

    await sendProfileToExternalModerationService(newBio)

    await client.query(
      `
      UPDATE users
      SET bio = $1
      WHERE id = $2
      `,
      [newBio, userId],
    )

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}


// Assume the external moderation API usually takes 3–5 seconds.

// Answer these:
// 1. What is the main concurrency/performance problem here?
  // you are locking a row for 3-5 seconds at lkeast with the select for update

// 2. What happens to another request that wants to update the same user during those 3–5 seconds?
  // it will be blocked until the first one completes its transaction (commit or rollback)

// 3. Why is SELECT ... FOR UPDATE probably unnecessary for this simple bio replacement?
// siince you are updating the entire value, you do not need to lock the row for update, you can just update it directly

// 4. What is the smallest better design?
  // remove the SELECT ... FOR UPDATE and do it directly and remove the external api from the transaction

// 5. What production symptoms could this cause under load?
  // it can increace the latency, some requests can start to timeout and the throughput (requests per second?) of the system can decrease