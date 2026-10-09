import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { Pool } from 'pg'
import { purchaseProduct } from '../src/unsafe-purchase'
import { purchaseProduct as atomicPurchaseProduct } from '../src/atomic-purchase'

const pool = new Pool({
  host: '127.0.0.1',
  port: 55432,
  user: 'course',
  password: 'course',
  database: 'concurrency_course',
})

describe('Atomic conditional update', () => {
  beforeAll(async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY,
        stock INTEGER NOT NULL
      );
    `)

  })

  beforeEach(async () => {
    await pool.query(`TRUNCATE products`)
    await pool.query(`INSERT INTO products (id, stock) VALUES (1, 1)`)
  })

  afterAll(async () => {
    await pool.end()
  })

  it('unsafe purchase', async () => {

    const results = await Promise.all([
      purchaseProduct(pool, 1, 1),
      purchaseProduct(pool, 1, 1),
    ])

    expect((results[0])).toBe('success')
    expect((results[1])).toBe('success')

    const result = await pool.query(`
      SELECT stock from products where id = 1
    `)

    expect(Number(result.rows[0].stock)).toBe(0)
  })

  it('atomic purchase', async () => {

    const results = await Promise.all([
      atomicPurchaseProduct(pool, 1, 1),
      atomicPurchaseProduct(pool, 1, 1),
    ])

    expect(results).toContain('success')
    expect(results).toContain('insufficient stock')
    expect(results).toHaveLength(2)

    const result = await pool.query(`
      SELECT stock from products where id = 1
    `)

    expect(Number(result.rows[0].stock)).toBe(0)
  })
})