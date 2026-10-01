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
  await pool.query('update accounts set balance  = balance - 100 where id = 1 and balance > 100')

  // 2. Force an error HERE.
  //    The program must stop before crediting account 2.
  throw new Error('Forced error to simulate failure before crediting account 2')

  // 3. Credit R$100 to account 2.
  await pool.query('update accounts set balance  = balance + 100 where id = 2')
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

// Prediction:
// Account 1 = 400
// Account 2 = 200
// Total money = 600

// concurrency_course=# SELECT * FROM ACCOUNTS;
//  id | balance 
// ----+---------
//   1 |     500
//   2 |     200
// (2 rows)

// concurrency_course=# SELECT * FROM ACCOUNTS;
//  id | balance 
// ----+---------
//   2 |     200
//   1 |     400
// (2 rows)



  // try {

    // 1. Debit R$100 from account 1.
    // '''update accounts set balance  = balance - 100 where id = 1 and balance > 100'''
    
    // 2. Force an error HERE.
    //    The program must stop before crediting account 2.
    // if rowsaffected === 0 {
    //   throw new Error('Insufficient funds')
    // }

    // 3. Credit R$100 to account 2.
    // '''update accounts set balance  = balance + 100 where id = 2'''
  // } catch (error) {
  //   connection.rollback()
  // } finally {
  //   connection.release()
  // }
