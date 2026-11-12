import { Pool } from "pg"

const createAppointment = async (
  hospitalId: number,
  date: string,
  time: string,
  patientId: number,
  pool: Pool,
) => {
  const existing = await pool.query(
    `
    SELECT id
    FROM appointments
    WHERE hospital_id = $1
      AND appointment_date = $2
      AND appointment_time = $3
    `,
    [hospitalId, date, time],
  )

  if (existing.rowCount ?? 0 > 0) {
    throw new Error('Slot already booked')
  }

  await pool.query(
    `
    INSERT INTO appointments (
      hospital_id,
      appointment_date,
      appointment_time,
      patient_id
    )
    VALUES ($1, $2, $3, $4)
    `,
    [hospitalId, date, time, patientId],
  )
}


// Assume there is currently no unique constraint on the slot.

// Answer these:
// 1. What concurrency bug exists?
// first of all, you are incurring in the same problem of using the pool instead of the client... so it can rollback the first transaction and commit the second

// 2. Draw the shortest A/B timeline that reproduces the bug.
// a reads
// b reads
// a inserts
// b inserts

// 3. Why would wrapping the existing SELECT → INSERT code in a normal transaction not automatically fix it?
// because this only ensures the atomicty of the transation, but does not avoid concurrency issues, as 2 requests at the same time can book the same appointment

// 4. What is the smallest correct database-level fix?
// add a unique constraint on the combination of hospital_id, appointment_date and appointment_time

// 5. What should the losing request receive when two users race for the same slot?
// it should return a message that the slot is already booked, and the user should try another slot


