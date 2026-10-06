import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { Pool } from 'pg'
import { scheduleAppointment } from '../src/unsafe-appointment-race'

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
 
      CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY,
  hospital_id INTEGER NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  patient_id INTEGER NOT NULL)
    `)

  })

  beforeEach(async () => {
    await pool.query(`
      ALTER TABLE appointments
      DROP CONSTRAINT IF EXISTS uq_appointment_slot
      `)
    await pool.query(`TRUNCATE appointments`)

  })

  afterAll(async () => {
    await pool.end()
  })

  it('two appointments for same date, time', async () => {

    const results = await Promise.all([
      scheduleAppointment(pool, 10, 1),
      scheduleAppointment(pool, 20, 2),
    ])

    expect((results[0])).toBe('appointment booked')
    expect((results[1])).toBe('appointment booked')

    const result = await pool.query(`
      SELECT count(*) from appointments
      WHERE appointment_date = '2026-10-05'
      and appointment_time = '09:00:00'
      and hospital_id = 10
    `)

    expect(Number(result.rows[0].count)).toBe(2)
  })

  it('two appointments blocked for same date, time', async () => {
    await pool.query(`
      ALTER TABLE appointments ADD CONSTRAINT uq_appointment_slot
        UNIQUE (hospital_id, appointment_date, appointment_time)
    `)

    const results = await Promise.all([
      scheduleAppointment(pool, 10, 1),
      scheduleAppointment(pool, 20, 2),
    ])
    expect((results[0])).toBe('appointment booked')
    expect((results[1])).toBe('slot already booked')

    const result = await pool.query(`
      SELECT count(*) from appointments
      WHERE appointment_date = '2026-10-05'
      and appointment_time = '09:00:00'
      and hospital_id = 10
    `)
    expect(Number(result.rows[0].count)).toBe(1)
  })
})