const pool = require('../libs/db_pool');

module.exports = {
    getAllEquipmentType: async () => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            var sql = "SELECT equipment_type_id, equipment_type_name FROM equipment_type ORDER BY equipment_type_id ASC";
            var rows = await conn.query(sql);

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
