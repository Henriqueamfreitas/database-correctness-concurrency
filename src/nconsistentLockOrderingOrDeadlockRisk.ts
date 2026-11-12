import { Pool } from "pg"

const transfer = async (
  fromId: number,
  toId: number,
  amount: number,
  pool: Pool,
) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    await client.query(
      `
      SELECT id
      FROM accounts
      WHERE id = $1
      FOR UPDATE
      `,
      [fromId],
    )

    await client.query(
      `
      SELECT id
      FROM accounts
      WHERE id = $1
      FOR UPDATE
      `,
      [toId],
    )

    await client.query(
      `
      UPDATE accounts
      SET balance = balance - $1
      WHERE id = $2
      `,
      [amount, fromId],
    )

    await client.query(
      `
      UPDATE accounts
      SET balance = balance + $1
      WHERE id = $2
      `,
      [amount, toId],
    )

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

// Now imagine these happen concurrently:
// Request A: transfer(1, 2, 50)
// Request B: transfer(2, 1, 75)

// Answer:
// 1. What concurrency problem can happen?
  //  i dont know the exact name, but its kind of a loop of blockinig... request a has row 1 and wants to update row 2, request b has row 2 and wants to update row 1. 

// 2. Draw the shortest A/B lock timeline that reproduces it.
  // request a select for update row 1
  // request b select for update row 2
  // request a tries to select for update row 2 -- it waits until request b releases row 2, but it never will because its waiting
  // request b tries to select for update row 1 -- it waits until request a releases row 1, but it never will because its waiting

// 3. Why does each request individually look reasonable but still fail together?
  // because the order of locking matters here

// 4. What is the smallest structural fix?
  // always lock the rows in the same order (smaller id first, for example)

// 5. If PostgreSQL detects the problem, what should the application do?
  // postgres will throw an error and the application should catch and return for one of them the transaction is not possible (postgres choose one to proceed and one to rollback)