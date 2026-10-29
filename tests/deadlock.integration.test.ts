import { Pool } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, } from "vitest";
import { safeTransfer, unsafeTransfer } from "../src/deadlock-transfer";

const pool = new Pool({
  host: '127.0.0.1',
  port: 55432,
  user: 'course',
  password: 'course',
  database: 'concurrency_course',
})

describe('Deadlock transfer', () => {
  beforeAll(async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY,
        balance INTEGER NOT NULL CHECK (balance >= 0)
      );
    `)
  })

  beforeEach(async () => {
    await pool.query(`TRUNCATE accounts`)
    await pool.query(`
      INSERT INTO accounts (id, balance)
      VALUES
        (1, 500),
        (2, 200);
    `)
  })

  afterAll(async () => {
    await pool.end()
  })

  it('reproduces a deadlock with inconsistent lock ordering', async () => {
    await expect(
      unsafeTransfer(1, 2, pool),
    ).rejects.toMatchObject({
      code: '40P01',
    })

    const result = await pool.query(`
      SELECT id, balance
      FROM accounts
      ORDER BY id
    `)
    expect(result.rows).toEqual([
      { id: 1, balance: 500 },
      { id: 2, balance: 200 },
    ])
  })

  it('completes both transfers with consistent lock ordering', async () => {
    await expect(
      safeTransfer(1, 2, pool),
    ).resolves.toBeUndefined()

    const result = await pool.query(`
      SELECT id, balance
      FROM accounts
      ORDER BY id
    `)
    expect(result.rows).toEqual([
      { id: 1, balance: 525 },
      { id: 2, balance: 175 },
    ])
  })
})