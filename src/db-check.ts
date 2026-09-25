import { Pool } from 'pg'

const pool = new Pool({
  host: '127.0.0.1',
  port: 55432,
  user: 'course',
  password: 'course',
  database: 'concurrency_course',
})

async function main() {
  const result = await pool.query(`
    SELECT current_database(), current_user, NOW()
  `)

  console.log(result.rows)

  await pool.end()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})