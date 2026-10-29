import { Pool } from "pg"

export const unsafeTransfer = async (fromId: number, toId: number, pool: Pool) => {
  const clientA = await pool.connect()
  const clientB = await pool.connect()
  try {
    const amountA = 50
    const amountB = 75

    await clientA.query(`BEGIN`)
    await clientA.query(`
      select * from accounts where id = $1 for update
  `, [fromId])

    await clientB.query(`BEGIN`)
    await clientB.query(`
      select * from accounts where id = $1 for update
  `, [toId])

    const aBlockedUpdate = clientA.query(`
      update accounts set balance = balance + $2 where id = $1
  `, [toId, amountA])

    const bBlockedUpdate = clientB.query(`
      update accounts set balance = balance + $2 where id = $1
  `, [fromId, amountB])

    await Promise.all([aBlockedUpdate, bBlockedUpdate])

    await clientA.query(`
  update accounts set balance = balance - $2 where id = $1
  `, [fromId, amountA])

    await clientB.query(`
      update accounts set balance = balance - $2 where id = $1
  `, [fromId, amountB])

    await clientA.query(`COMMIT`)
    await clientB.query(`COMMIT`)
  } catch (e: any) {
    console.log(e)
    await clientA.query(`ROLLBACK`)
    await clientB.query(`ROLLBACK`)
    throw e
  } finally {
    clientA.release()
    clientB.release()
  }
}

export const safeTransfer = async (fromId: number, toId: number, pool: Pool) => {
  const clientA = await pool.connect()
  const clientB = await pool.connect()
  try {
    const amountA = 50
    const amountB = 75
    await clientA.query(`BEGIN`)
    await clientB.query(`BEGIN`)

    const firstId = Math.min(fromId, toId)
    const secondId = Math.max(fromId, toId)
    await clientA.query(`SELECT * FROM accounts WHERE id = $1 FOR UPDATE`, [firstId])
    const bFirstLock = clientB.query(`SELECT * FROM accounts WHERE id = $1 FOR UPDATE`, [firstId])
    await clientA.query(`SELECT * FROM accounts WHERE id = $1 FOR UPDATE`, [secondId])


    await clientA.query(`
    update accounts set balance = balance - $2 where id = $1
    `, [fromId, amountA])
    await clientA.query(`
      update accounts set balance = balance + $2 where id = $1
      `, [toId, amountA])

    await clientA.query(`COMMIT`)

    await bFirstLock

    await clientB.query(`SELECT * FROM accounts WHERE id = $1 FOR UPDATE`, [secondId])

    await clientB.query(`
    update accounts set balance = balance - $2 where id = $1
    `, [toId, amountB])

    await clientB.query(`
    update accounts set balance = balance + $2 where id = $1
`, [fromId, amountB])

    await clientB.query(`COMMIT`)

  } catch (e: any) {
    await clientA.query(`ROLLBACK`)
    await clientB.query(`ROLLBACK`)
    throw e
  } finally {
    clientA.release()
    clientB.release()
  }
}
