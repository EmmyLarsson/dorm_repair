const pool = require('../libs/db_pool');

module.exports = {
    getAllRepairType: async () => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            var rows = await conn.query(
                "SELECT repair_type_id, repair_type_name FROM repair_type ORDER BY repair_type_id"
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
                errorMessage: "ไม่สามารถดึงรายการประเภทงานซ่อมได้"
            }
        } finally {
            if (conn)
                conn.release();

            return result;
        }
    }
}
