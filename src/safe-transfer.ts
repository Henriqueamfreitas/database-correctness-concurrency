// what rowCount you expect from the credit when account 2 exists;
  // 1
// what could happen if account 2 does not exist; 
  // without the validation i added checking rowcount from the credit transaction, 
  // account 1 would end up with 400 and account 2 would remian with the same balance
  // money wouldbe 'lost'

import { Pool } from 'pg'

export const transfer = async (pool: Pool) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN;')
    const debit = await client.query(`
        UPDATE ACCOUNTS 
          SET BALANCE = BALANCE - 100 
        WHERE 1=1
          AND ID = 1 
          AND BALANCE >= 100
        ;
    `)
    if (debit.rowCount !== 1) {
      throw new Error('Insufficient funds in account 1')
    }

    // throw new Error('Forced error to simulate failure before crediting account 2')

    const credit = await client.query(`
        UPDATE ACCOUNTS 
          SET BALANCE = BALANCE + 100 
        WHERE 1=1
          AND ID = 2
        ;
    `)
    if (credit.rowCount !== 1) {
      throw new Error('Error in account 2')
    }
    await client.query('COMMIT;')
  } catch (error) {
    await client.query('ROLLBACK;')
    throw error

  } finally {
    client.release()
  }
}

// const main = async () => {
//   try {
//     await transfer(pool)
//   } catch (error) {
//     console.log('Error:', error)
//   }
// }
// // main()

// After forced error:

// Account 1 = 400
// Account 2 = 300
// Total = 700

// concurrency_course=# SELECT * FROM ACCOUNTS ORDER BY 1;
//  id | balance
// ----+---------
//   1 |     400
//   2 |     300
// (2 rows)