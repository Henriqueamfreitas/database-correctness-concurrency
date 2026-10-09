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
  const result = await pool.query(`
    UPDATE products
    SET stock = stock - $1
    WHERE id = $2
      AND stock >= $1
    RETURNING stock
  `, [quantity, productId])

  if (result.rowCount === 0) {
    return 'insufficient stock'
  }

  return 'success'
  // try {
  //   await client.query('BEGIN')
  //   const currentStock = await client.query(`
  //     select stock from products where id = $1
  //   `, [productId])

  //   if (currentStock.rowCount === 0) {return 'product not found'}

  //   const updateStock = await client.query(`
  //     update products set stock = stock - $1 where id = $2 and stock >= $1
  //     returning stock
  //   `, [quantity, productId])

  //   if (updateStock.rowCount !== 1) {
  //     return 'insufficient stock'
  //   }

  //   await client.query('COMMIT')
  //   return updateStock.rowCount === 1 ? 'success' : 'insufficient stock'
  // } catch (error) {
  //   await client.query('ROLLBACK')
  //   throw error
  // } finally {
  //   client.release()
  // }
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