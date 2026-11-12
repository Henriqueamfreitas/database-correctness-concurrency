import { Pool } from "pg"

const transfer = async (
  fromId: number,
  toId: number,
  amount: number,
  pool: Pool
  ,
) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const debit = await client.query(
      `
      UPDATE accounts
      SET balance = balance - $1
      WHERE id = $2
        AND balance >= $1
      `,
      [amount, fromId],
    )

    if (debit.rowCount === 0) {
      throw new Error('Insufficient funds')
    }

    await pool.query(
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

// Assume:
// - account A has 500;
// - account B has 200;
// - transfer amount is 100;
// - the credit statement succeeds.
// Answer these five:

// 1. What is wrong with the code?
// i really don't know... there is begin, commit, rollback and release
// there is validation to update on the id and if it has engouh funds
// oh, i foundt it... the update on each account uses different clients. the debit is from the pool, but the credit is directly from the client

// 2. Why does BEGIN not protect both mutations here?
// because its using the begin on the client, but the credit is usgin the pool directly, so its not the same transaction.
// a client is kind like a pool of connections that a request can borrow it... when you use the pool directly, it has only one

// 3. What invalid production outcome is possible?
// update the  first account, but not the second... the money leaves one hand bit it never arrives in the other

// 4. What is the smallest correct fix?
    // change it to lient instead of pool await client.query(
    //   `
    //   UPDATE accounts
    //   SET balance = balance + $1
    //   WHERE id = $2
    //   `,
    //   [amount, toId],
    // )

// 5. What invariant would your corrected integration test prove?
// it would prove that the money that left a arrives in b, and that the total amount of money in the system remains constant.