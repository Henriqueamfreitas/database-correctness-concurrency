import { Pool } from "pg";

// 1. SELECT whether hospital 10 / 2026-10-05 / 09:00 already exists
// 2. If it exists → return "not available"
// 3. If it does not exist → wait ~200 ms
// 4. INSERT the appointment
export const scheduleAppointment = async (
  pool: Pool,
  patientId: number,
  id: number
) => {
  const client = await pool.connect()
  try {
    const available = await client.query(`
      select count(*) from appointments
      where 1=1
      and hospital_id = 10
      and appointment_date = '2026-10-05'
      and appointment_time = '09:00'
    `)

    const count = Number(available.rows[0].count)
    if (count > 0) {
      return 'slot already booked'
    }

    await new Promise(resolve => setTimeout(resolve, 200))

    const insert = await client.query(`
      insert into appointments
      (id, hospital_id, appointment_date, appointment_time, patient_id)
      values ($2, 10, '2026-10-05', '09:00:00', $1)
    `, [patientId, id])
    if (insert.rowCount === 1) {
      return 'appointment booked'
    }
  } catch (error: any) {
    if (
      error?.code === '23505' &&
      error?.constraint === 'uq_appointment_slot'
    ) {
      return `slot already booked`
    }

    throw error
    // await client.query('ROLLBACK')
  } finally {
    client.release()
  }
}
