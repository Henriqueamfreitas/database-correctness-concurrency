import { Pool } from "pg";

const pool = new Pool({
  password: 'course',
  database: 'concurrency_course',
  host: '127.0.0.1',
  port: 55432,
  user: 'course'
})

const scheduleNewAppointment = async () => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`
      INSERT INTO appointments
      VALUES (4, 10, '2026-10-05', '09:00', 300);
    `)
    await client.query('COMMIT')
  } catch (error: any) {
    await client.query('ROLLBACK')
    if (error?.code === '23505' && error?.constraint === 'uq_appointment_slot') {
      console.log('Spot not available')
      return
    }
    throw error
  } finally {
    client.release()
  }
}


scheduleNewAppointment()
