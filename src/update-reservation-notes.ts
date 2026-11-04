import { Pool } from "pg";

const pool = new Pool({
  host: '127.0.0.1',
  port: 55432,
  user: 'course',
  password: 'course',
  database: 'concurrency_course',
})

export class ReservationVersionConflictError extends Error {
  constructor() {
    super('Reservation was modified by another request.')
    this.name = 'ReservationVersionConflictError'
  }
}

export const updateReservationNotes = async (
  id: number,
  notes: string,
  expectedVersion: number,
  pool: Pool
) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const result = await client.query(`
      UPDATE reservation_details
      SET
        notes = $1,
        version = version + 1
      WHERE id = $2
        AND version = $3
      RETURNING id, notes, version;
    `, [notes, id, expectedVersion])

    if (result.rowCount === 0) {
      throw new ReservationVersionConflictError()
    }

    await client.query('COMMIT')

    // console.log(result.rows[0])
    return result.rows[0]
  } catch (error: any) {
    console.log('ERROR:', error)
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

const main = async () => {
  try {
    const test1 = updateReservationNotes(1, 'Updated notes A', 1, pool)
    const test2 = updateReservationNotes(1, 'Updated notes B', 1, pool)

    const results = await Promise.allSettled([test1, test2])

    console.log(results)
  } finally {
    await pool.end()
  }
}

// main()