import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { Pool } from 'pg'

const pool = new Pool({
  host: '127.0.0.1',
  port: 55432,
  user: 'course',
  password: 'course',
  database: 'concurrency_course',
})

describe('PostgreSQL environment', () => {
  beforeAll(async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS env_check (
        id INT PRIMARY KEY,
        value INT NOT NULL
      )
    `)
  })

  beforeEach(async () => {
    await pool.query('TRUNCATE env_check')

    await pool.query(`
      INSERT INTO env_check (id, value)
      VALUES (1, 100)
    `)
  })

  afterAll(async () => {
    await pool.end()
  })

  it('uses the real database and rolls back a transaction', async () => {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      await client.query(`
        UPDATE env_check
        SET value = 200
        WHERE id = 1
      `)

      await client.query('ROLLBACK')
    } finally {
      client.release()
    }

    const result = await pool.query(`
      SELECT value
      FROM env_check
      WHERE id = 1
    `)

    expect(result.rows[0].value).toBe(100)
  })
})