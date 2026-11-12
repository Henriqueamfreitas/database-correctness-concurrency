import { Pool } from "pg"

const updateBalance = async (
  id: number,
  amount: number,
  pool: Pool,
) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    await client.query(
      `
      UPDATE accounts
      SET balance = balance + $1
      WHERE id = $2
      `,
      [amount, id],
    )

    await client.query(`
      INSERT INTO audit_logs (message)
      VALUES ('balance changed')
    `)

    await client.query('COMMIT')
  } catch (error) {
    throw error
  } finally {
    client.release()
  }
}

// Assume the INSERT INTO audit_logs fails.

// Answer:
// 1. What is wrong with the error handling?
// you are not describing the error to the user and not rolling back, so the first update will be executed, but not commited (i
// know that there must be a problem here, but i dont know what it is... the problem with having the update but no commit or 
// rollback. yabe its open, but the connection is released)

// 2. What state is the PostgreSQL transaction left in?
  // no commit or rollback was called, so the transaction is left open

// 3. Why is simply calling client.release() not equivalent to ROLLBACK?
  // because it will not rollback the transaction, it will just release the connection back to the pool

// 4. What is the smallest correct fix?
  // call client.query('ROLLBACK') in the catch block before throwing the error

// 5. What production problems could this cause if connections like this return to the pool?
  // i dont know