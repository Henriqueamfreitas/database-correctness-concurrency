import { Pool } from 'pg'

const pool = new Pool({
  host: '127.0.0.1',
  port: 55432,
  user: 'course',
  password: 'course',
  database: 'concurrency_course',
})

async function transfer() {
  // 1. Debit R$100 from account 1.

  // 2. Force an error HERE.
  //    The program must stop before crediting account 2.

  // 3. Credit R$100 to account 2.
}

async function main() {
  try {
    await transfer()
  } catch (error) {
    console.error('Transfer failed:', error)
  } finally {
    await pool.end()
  }
}

main()