import { Pool } from "pg";

const pool = new Pool({
  host: '127.0.0.1',
  port: 55432,
  user: 'course',
  password: 'course',
  database: 'concurrency_course',
})

export const purchaseProduct = async (
  pool: Pool,
  productId: number,
  quantity: number
) => {
  const client = await pool.connect()

  try {
    // await client.query('BEGIN')
    const currentStock = await client.query(`
      select stock from products where id = $1
    `, [productId])

    if (currentStock.rowCount === 0) {return 'product not found'}

    const stock = currentStock.rows[0].stock

    if (stock < quantity) {
      return 'insufficient stock'
    }

    await new Promise(resolve => setTimeout(resolve, 200))

    const finalStock = stock - quantity

    const final = await client.query(`
      update products set stock = $1 where id = $2
    `, [finalStock, productId])

    // await client.query('COMMIT')
    return final.rowCount === 1 ? 'success' : 'insufficient stock'
  } catch (error) {
    // await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}


const main = async () => {
  const results = await Promise.all([
    purchaseProduct(pool, 1, 1),
    purchaseProduct(pool, 1, 1),
  ])

  // console.log(results)

  await pool.end()
}

main()