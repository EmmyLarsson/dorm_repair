const pool = require('../libs/db_pool');

module.exports = {
    getPhotosByRequestId: async (requestId) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            var sql = "SELECT " +
          "  photo_id, " +
          "  photo_url, " +
          "  DATE_FORMAT(uploaded_at, '%Y-%m-%d %H:%i:%s') AS uploaded_at " +
          "FROM repair_request_photo " +
          "WHERE request_id = ? " +
          "ORDER BY photo_id ASC";

            var rows = await conn.query(sql, [requestId]);

            result = {
                isError: false,
                data: rows,
                errorMessage: ""
            };
        } catch (error) {
            result = {
                isError: true,
                data: "",
                errorMessage: error.message
            }
        } finally {
            if (conn)
                conn.release();

            return result;
        }
    },

    // ลบรูปเดิมของ request นี้ทั้งหมดก่อน แล้วค่อยแนบรูปชุดใหม่ (ใช้ตอนแก้ไขคำร้อง)
    // ถ้าไม่ได้แนบรูปใหม่ ฝั่ง client จะไม่เรียก endpoint นี้เลย รูปเดิมจึงไม่ถูกแตะต้อง
    replacePhotos: async (requestId, photoUrls) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();

            var oldRows = await conn.query(
                "SELECT photo_url FROM repair_request_photo WHERE request_id = ?",
                [requestId]
            );

            await conn.query("DELETE FROM repair_request_photo WHERE request_id = ?", [requestId]);

            var insertSql = "INSERT INTO repair_request_photo (request_id, photo_url) VALUES (?, ?)";
            for (const photoUrl of photoUrls) {
                await conn.query(insertSql, [requestId, photoUrl]);
            }

            await conn.commit();

            result = {
                isError: false,
                data: { insertedUrls: photoUrls, removedUrls: oldRows.map(r => r.photo_url) },
                errorMessage: ""
            };
        } catch (error) {
            if (conn) {
                await conn.rollback();
            }

            result = {
                isError: true,
                data: "",
                errorMessage: error.message
            }
        } finally {
            if (conn)
                conn.release();

            return result;
        }
    }
}
