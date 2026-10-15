const pool = require('../libs/db_pool');

module.exports = {
    // ครุภัณฑ์ที่เบิกไว้แล้วสำหรับ request นี้ — ใช้เติมฟอร์มตอนเปิด "จัดการงานซ่อม" ของ case ที่เคยนัดหมายแล้ว
    // คืนทุกรอบพร้อม revision_round (0 = ซ่อม, 1-2 = แก้ไข) ผู้เรียกกรองเอาเฉพาะรอบที่ต้องการเอง
    getByRequestId: async (requestId) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            var sql = "SELECT " +
                "  rre.equipment_id, " +
                "  rre.quantity_used, " +
                "  rre.revision_round, " +
                "  e.equipment_code, " +
                "  e.equipment_name, " +
                "  u.unit_name " +
                "FROM repair_request_equipment rre " +
                "JOIN equipment e ON rre.equipment_id = e.equipment_id " +
                "LEFT JOIN unit u ON e.unit_id = u.unit_id " +
                "WHERE rre.request_id = ? " +
                "ORDER BY rre.revision_round, e.equipment_name";

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
    }
}
