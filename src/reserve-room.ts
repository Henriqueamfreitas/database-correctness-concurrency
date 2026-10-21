import { PoolClient } from "pg";

export const reserveRoom = async (
  // pool: Pool,
  client: PoolClient,
  roomId: number,
  reservationId: number
) => {
  try {
    await client.query("BEGIN;");
    const room = await client.query(`
      select id, available from rooms
      WHERE id = $1
      FOR UPDATE`, [roomId]);

    if (room.rowCount === 0) {
      await client.query('ROLLBACK')
      return 'room not found'
    }

    if (!room.rows[0].available) {
      await client.query('ROLLBACK')
      return 'room unavailable'
    }
    
    await client.query(`
      insert into room_reservations (id, room_id)
      values ($1, $2)`, [reservationId, roomId]);

    await client.query(`
      UPDATE ROOMS
      SET available = false
      WHERE id = $1`, [roomId]);

    const bookedRoom = await client.query(`
      SELECT * FROM ROOMS
    where 1=1 and id = $1 `, [roomId])


    await client.query("COMMIT;");
    return bookedRoom.rows[0];
  } catch (error: any) {
    await client.query("ROLLBACK;");
    throw error
  }
}