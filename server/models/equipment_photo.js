const pool = require('../libs/db_pool');

module.exports = {
    getPhotosByEquipmentId: async (equipmentId) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            var sql = "SELECT " +
          "  equipment_photo_id, " +
          "  photo_path, " +
          "  DATE_FORMAT(uploaded_date, '%Y-%m-%d %H:%i:%s') AS uploaded_date " +
          "FROM equipment_photo " +
          "WHERE equipment_id = ? " +
          "ORDER BY equipment_photo_id ASC";

            var rows = await conn.query(sql, [equipmentId]);

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

    // ครุภัณฑ์มีได้แค่รูปเดียวเสมอ — ลบรูปเดิมของ equipment นี้ทั้งหมดก่อน แล้วค่อยใส่รูปใหม่
    // (ถ้า newPhotoPath เป็น null คือ "ลบรูป" ไม่ต้องใส่รูปใหม่)
    // คืนค่า photo_path เดิม (ถ้ามี) กลับไปให้ route เอาไปลบไฟล์จริงออกจาก disk ต่อ
    replacePhoto: async (equipmentId, newPhotoPath) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();

            var oldRows = await conn.query(
                "SELECT photo_path FROM equipment_photo WHERE equipment_id = ?",
                [equipmentId]
            );

            await conn.query("DELETE FROM equipment_photo WHERE equipment_id = ?", [equipmentId]);

            if (newPhotoPath) {
                await conn.query(
                    "INSERT INTO equipment_photo (equipment_id, photo_path) VALUES (?, ?)",
                    [equipmentId, newPhotoPath]
                );
            }

            await conn.commit();

            result = {
                isError: false,
                data: { oldPhotoPaths: oldRows.map(r => r.photo_path) },
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
