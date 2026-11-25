import { Pool } from "pg"
// QUERIES
// CREATE TABLE IF NOT EXISTS workshops (
//   id SERIAL PRIMARY KEY,
//   capacity INT NOT NULL,
//   registered_count INT NOT NULL DEFAULT 0,

//   CONSTRAINT check_registered_count
//     CHECK (registered_count >= 0),

//   CONSTRAINT check_capacity_vs_registered
//     CHECK (registered_count <= capacity),

//   CONSTRAINT check_capacity
//     CHECK (capacity > 0)
// );

// CREATE TABLE IF NOT EXISTS users (
//   id SERIAL PRIMARY KEY,
//   credits INT NOT NULL,

//   CONSTRAINT check_credits
//     CHECK (credits >= 0)
// );

// CREATE TABLE IF NOT EXISTS registrations (
//   id SERIAL PRIMARY KEY,
//   workshop_id INT NOT NULL,
//   user_id INT NOT NULL,

//   CONSTRAINT fk_registration_workshop
//     FOREIGN KEY (workshop_id)
//     REFERENCES workshops(id),

//   CONSTRAINT fk_registration_user
//     FOREIGN KEY (user_id)
//     REFERENCES users(id),

//   CONSTRAINT uq_registration_workshop_user
//     UNIQUE (workshop_id, user_id)
// );

export const registerWorkshop = async ({ pool, user_id, workshop_id, price = 60 }:
  { pool: Pool, user_id: number, workshop_id: number, price?: number }
) => {

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // 1. create registration
    await client.query(`
      INSERT INTO registrations (id, workshop_id, user_id) VALUES
      (DEFAULT, $1, $2)
    `, [workshop_id, user_id])

    // i know that it should be a validation that credits are greater than 0
    const credits = await client.query(`
      SELECT credits FROM users WHERE 1=1
      AND credits >= $1
      AND id = $2
    `, [price, user_id])

    if (credits.rows[0] === 0 || !credits.rows[0]) {
      throw new Error('Insufficient credits')
    }
    // 2. deduct credits conditionally
    const deductedCredits = await client.query(`
      UPDATE users
        SET credits = credits - $1
      WHERE id = $2
      AND credits >= $1
    `, [price, user_id])

    if (deductedCredits.rowCount === 0) {
      throw new Error('Failed to deduct credits')
    }

    // 3. increment registered_count conditionally
    const incrementedRegisteredCount = await client.query(`
      UPDATE workshops
        SET registered_count = registered_count + 1
      WHERE id = $1
      AND registered_count < capacity
    `, [workshop_id])

    if (incrementedRegisteredCount.rowCount === 0) {
      throw new Error('Failed to increment registered count')
    }

    await client.query('COMMIT')
    return 'Successfully enrolled in course'
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

const pool = new Pool({
  host: '127.0.0.1',
  port: 55432,
  user: 'course',
  password: 'course',
  database: 'concurrency_course',
})

const main = async () => {
  console.log(await registerWorkshop({ pool, user_id: 1, workshop_id: 1 }))
}

// main()