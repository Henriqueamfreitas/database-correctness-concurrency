import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { Pool } from 'pg'
import { reserveRoom } from '../src/reserve-room'

const pool = new Pool({
  host: '127.0.0.1',
  port: 55432,
  user: 'course',
  password: 'course',
  database: 'concurrency_course',
})

describe('Rooms FOR UPDATE', () => {
  beforeAll(async () => {
    await pool.query(`
 CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY,
  available BOOLEAN NOT NULL
);

CREATE TABLE IF NOT EXISTS room_reservations (
  id INTEGER PRIMARY KEY,
  room_id INTEGER NOT NULL REFERENCES rooms(id)
);
`)

  })

  beforeEach(async () => {
    await pool.query(`
    INSERT INTO rooms (id, available)
    VALUES (1, true)
    ON CONFLICT (id)
    DO UPDATE SET available = true;
      `)
    // await pool.query(`TRUNCATE rooms`)
    await pool.query(`TRUNCATE room_reservations`)

  })

  afterAll(async () => {
    await pool.end()
  })

  it('blocks a competing reservation until the room lock is released', async () => {
    const clientA = await pool.connect()
    const clientB = await pool.connect()
    try {
      await clientA.query('BEGIN')

      await clientA.query(`
        SELECT id, available
        FROM rooms
        WHERE id = 1
        FOR UPDATE
      `)

      const pidResult = await clientB.query(`
        SELECT pg_backend_pid() AS pid
      `)

      const pidB = pidResult.rows[0].pid

      const reservationB = reserveRoom(clientB, 1, 200)

      const blockedState = await waitUntilBlocked(pidB)

      expect((blockedState.state)).toBe('active')
      expect((blockedState.wait_event_type)).toBe('Lock')
      await clientA.query('ROLLBACK')
      const resultB = await reservationB

      expect((resultB.available)).toBe(false)
      const reservations = await pool.query(`
  SELECT COUNT(*)::int AS count
  FROM room_reservations
  WHERE room_id = 1
`)

      expect(reservations.rows[0].count).toBe(1)

    } finally {
      try {
        await clientA.query('ROLLBACK')
      } catch { }
      clientA.release()
      clientB.release()
    }
  })
})

const waitUntilBlocked = async (pid: number) => {
  for (let attempt = 0; attempt < 20; attempt++) {
    const result = await pool.query(`
      SELECT state, wait_event_type, wait_event
      FROM pg_stat_activity
      WHERE pid = $1
    `, [pid])

    if (result.rows[0]?.wait_event_type === 'Lock') {
      return result.rows[0]
    }

    await new Promise(resolve => setTimeout(resolve, 25))
  }

  throw new Error('Client B never became blocked on a lock')
}