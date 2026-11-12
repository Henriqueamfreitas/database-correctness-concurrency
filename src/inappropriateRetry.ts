import { Pool } from "pg"

const createUser = async (
  email: string,
  pool: Pool,
) => {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await pool.query(
        `
        INSERT INTO users (email)
        VALUES ($1)
        `,
        [email],
      )

      return
    } catch (error: any) {
      console.log(`Attempt ${attempt + 1} failed`)
    }
  }

  throw new Error('Could not create user')
}


// Assume:
// UNIQUE (email)

// and the email already exists.

// Answer:
// 1. What is wrong with the retry strategy?
  // You are wasting requests, because none of the retries will succeed (the email still must be unique)

// 2. Why will retrying probably never make this operation succeed?
  // because hte email alreayd exists and, unless the orignal email is changed, the retires will always fail

// 3. What kind of failures should usually be considered retryable?
// concurrent ones

// 4. What should the application do for this duplicate-email failure?
// it should return that a email already exists, not retry

// 5. Why are bounded retries still important even for retryable errors?
// because youstill want to control how many times you retry, so you dont overload the system with requests
// if you have a retry system not configured in the best way, you can cause a loop retry and you dont want this