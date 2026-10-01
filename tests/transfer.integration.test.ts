import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { Pool } from 'pg'
import { transfer } from '../src/safe-transfer'

const pool = new Pool({
  host: '127.0.0.1',
  port: 55432,
  user: 'course',
  password: 'course',
  database: 'concurrency_course',
})

describe('Account Transfer', () => {
  beforeAll(async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY,
        balance INTEGER NOT NULL
      );
    `)
  })

  beforeEach(async () => {
    await pool.query('TRUNCATE accounts')

    await pool.query(`
      INSERT INTO accounts (id, balance)
      VALUES
        (1, 500);
    `)
  })

  afterAll(async () => {
    await pool.end()
  })

  it('rolls back the debit when the destination account does not exist', async () => {
    await expect(transfer(pool)).rejects.toThrow()

    const finalResult = await pool.query(`
      SELECT balance
      FROM accounts
      WHERE id = 1
    `)

    expect(finalResult.rows[0].balance).toBe(500)
  })

  it('it completes the transaction', async () => {
    await pool.query(`
      INSERT INTO accounts (id, balance)
      VALUES (2, 200);
    `)

    await transfer(pool)

    const finalDebitResult = await pool.query(`
      SELECT balance
      FROM accounts
      WHERE id = 1
    `)

    const finalCreditResult = await pool.query(`
      SELECT balance
      FROM accounts
      WHERE id = 2
    `)

    const finalDebitBalance = finalDebitResult.rows[0].balance
    const finalCreditBalance = finalCreditResult.rows[0].balance

    expect(finalDebitBalance).toBe(400)
    expect(finalCreditBalance).toBe(300)
    expect(finalCreditBalance + finalDebitBalance).toBe(700)
  })
})
