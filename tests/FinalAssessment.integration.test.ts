import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { registerWorkshop } from "../src/FinalAssessment";

const pool = new Pool({
  host: '127.0.0.1',
  port: 55432,
  user: 'course',
  password: 'course',
  database: 'concurrency_course',
})


describe('registerWorkshop', () => {
  beforeAll(async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS workshops (
        id SERIAL PRIMARY KEY,
        capacity INT NOT NULL,
        registered_count INT NOT NULL DEFAULT 0,

        CONSTRAINT check_registered_count
          CHECK (registered_count >= 0),

        CONSTRAINT check_capacity_vs_registered
          CHECK (registered_count <= capacity),

        CONSTRAINT check_capacity
          CHECK (capacity > 0)
      );
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        credits INT NOT NULL,

        CONSTRAINT check_credits
          CHECK (credits >= 0)
      );
    `)

    await pool.query(`
      CREATE TABLE IF NOT EXISTS registrations (
        id SERIAL PRIMARY KEY,
        workshop_id INT NOT NULL,
        user_id INT NOT NULL,

        CONSTRAINT fk_registration_workshop
          FOREIGN KEY (workshop_id)
          REFERENCES workshops(id),

        CONSTRAINT fk_registration_user
          FOREIGN KEY (user_id)
          REFERENCES users(id),

        CONSTRAINT uq_registration_workshop_user
          UNIQUE (workshop_id, user_id)
      );
    `)


  })

  beforeEach(async () => {
    await pool.query(`TRUNCATE workshops, users, registrations`)
    await pool.query(`INSERT INTO users (id, credits) VALUES (1, 100)`)
    await pool.query(`INSERT INTO users (id, credits) VALUES (2, 100)`)
    await pool.query(`INSERT INTO workshops (id, capacity, registered_count) VALUES (1, 5, 4)`)
  })

  it('successful registration', async () => {
    const originalCredits = await pool.query(`SELECT credits FROM users WHERE id = 1`)
    const originalRegisteredCount = await pool.query(`SELECT registered_count FROM workshops WHERE id = 1`)
    await registerWorkshop({ pool, user_id: 1, workshop_id: 1 })
    const registrations = await pool.query(`SELECT count(id) FROM registrations`)
    expect(Number(registrations.rows[0].count)).toBe(1)

    const postCredits = await pool.query(`SELECT credits FROM users WHERE id = 1`)
    expect(Number(postCredits.rows[0].credits)).toBe(Number(originalCredits.rows[0].credits) - 60)

    const postRegisteredCount = await pool.query(`SELECT registered_count FROM workshops WHERE id = 1`)
    expect(Number(postRegisteredCount.rows[0].registered_count)).toBe(Number(originalRegisteredCount.rows[0].registered_count) + 1)
  })

  it('Two different users compete for the final spot', async () => {
    const results = await Promise.allSettled([
      registerWorkshop({ pool, user_id: 1, workshop_id: 1 }),
      registerWorkshop({ pool, user_id: 2, workshop_id: 1 })
    ])

    expect(results.filter((r: any) => r.status === 'fulfilled').length).toBe(1)
    expect(results.filter((r: any) => r.status === 'rejected').length).toBe(1)

    const postRegistrations = await pool.query(`SELECT count(id) FROM registrations`)
    expect(Number(postRegistrations.rows[0].count)).toBe(1)

    const registered_count = await pool.query(`SELECT registered_count FROM workshops WHERE id = 1`)
    expect(Number(registered_count.rows[0].registered_count)).toBe(5)

    const user1Credits = await pool.query(`SELECT credits FROM users WHERE id = 1`)
    const user2Credits = await pool.query(`SELECT credits FROM users WHERE id = 2`)
    expect(Number(user1Credits.rows[0].credits) + Number(user2Credits.rows[0].credits)).toBe(140)
  })

  it('Same user sends two concurrent requests for the same workshop', async () => {
    // only one registration persists
    // credits are deducted once
    // capacity is consumed once
    // loser becomes AlreadyRegistered
  })

  it('Same user concurrently registers for two different workshops with only 90 credits', async () => {
    // exactly one succeeds
    // exactly one fails as InsufficientCredits
    // final credits = 30
    // never -30
  })
})