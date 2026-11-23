Debugging Case C1 — Broken Transaction Boundary
const transfer = async (
  fromId: number,
  toId: number,
  amount: number,
  pool: Pool,
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
      RETURNING balance
      `,
      [amount, fromId],
    )

    if (debit.rowCount === 0) {
      throw new Error('Insufficient funds')
    }

    const credit = await pool.query(
      `
      UPDATE accounts
      SET balance = balance + $1
      WHERE id = $2
      RETURNING balance
      `,
      [amount, toId],
    )

    if (credit.rowCount === 0) {
      throw new Error('Destination account not found')
    }

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

Assume:
Account A = 500
Account B = 200
transfer = 100

Answer in this order:
1. What is the bug?
  there is no check to see if balance >= 0 
2. Why can this code violate atomicity even though it has BEGIN, COMMIT, and ROLLBACK?
3. Give one concrete invalid final state that could happen.
4. What is the smallest correct fix?
  add balance >= 0 in the first update
5. What integration test would prove the fix?
  select balance where id returning id >= 0 










Debugging Case C2 — Missing Rollback
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

    await client.query(
      `
      INSERT INTO audit_logs (message)
      VALUES ('balance changed')
      `,
    )

    await client.query('COMMIT')
  } catch (error) {
    throw error
  } finally {
    client.release()
  }
}

Assume the INSERT INTO audit_logs fails.

Answer:
1. What is wrong with the error handling?
  there is no rollback so the update will remain after the transaction completes it

2. What state is the PostgreSQL transaction left in after the INSERT fails?
  with the error in insert logs

3. Why is client.release() not equivalent to ROLLBACK?
  it only releases the connection, but not clean up the mess made in the request

4. What is the smallest correct fix?
  add rollback in the catch

5. What production problems could happen if connections like this are returned to the pool?
  it would be 'dirty' connections and can affect the following requests, not updating the value, returning the error from the rpevious one