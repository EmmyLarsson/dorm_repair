const pool = require('../libs/db_pool');

module.exports = {
    getAllRushReason: async () => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            var rows = await conn.query(
                "SELECT rush_reason_id, rush_reason_name, is_urgent FROM rush_reason ORDER BY rush_reason_id"
            );

            result = {
                isError: false,
                data: rows,
                errorMessage: ""
            };
        } catch (error) {
            result = {
                isError: true,
                data: "",
                errorMessage: "ไม่สามารถดึงรายการเหตุผลได้"
            }
        } finally {
            if (conn)
                conn.release();

            return result;
        }
    }
}
