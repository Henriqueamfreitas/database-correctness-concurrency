import { Pool } from "pg";
import { describe, beforeAll, beforeEach, afterAll, it, expect } from "vitest";
import { ReservationVersionConflictError, updateReservationNotes } from "../src/update-reservation-notes";

const pool = new Pool({
  host: '127.0.0.1',
  port: 55432,
  user: 'course',
  password: 'course',
  database: 'concurrency_course',
})

describe('Appointment concurrency', () => {
  beforeAll(async () => {
    await pool.query(`
      drop table if exists reservation_details;
      CREATE TABLE IF NOT EXISTS reservation_details (
        id INTEGER PRIMARY KEY,
        notes TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1
      );
    `)
  })

  beforeEach(async () => {
    await pool.query(`TRUNCATE reservation_details`)
    await pool.query(`
      INSERT INTO reservation_details (id, notes, version)
      VALUES (1, 'Original notes', 1);
    `)
  })

  afterAll(async () => {
    await pool.end()
  })

  it('allows one concurrent update and rejects the stale update', async () => {
    const test1 = updateReservationNotes(1, 'Updated notes A', 1, pool)
    const test2 = updateReservationNotes(1, 'Updated notes B', 1, pool)
    const results = await Promise.allSettled([test1, test2])
    const fulfilled = results.filter(result => result.status === 'fulfilled')
    const rejected = results.find(
      result => result.status === 'rejected'
    )

    expect(rejected).toBeDefined()

    if (rejected?.status === 'rejected') {
      expect(rejected.reason).toBeInstanceOf(
        ReservationVersionConflictError
      )
    }

    expect(fulfilled).toHaveLength(1)

    const result = await pool.query(`
      SELECT id, notes, version
      FROM reservation_details
      WHERE id = 1
    `)
    expect([
      'Updated notes A',
      'Updated notes B',
    ]).toContain(result.rows[0].notes)
    expect(result.rows[0].version).toBe(2)
  })
})