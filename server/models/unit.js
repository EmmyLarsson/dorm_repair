const pool = require('../libs/db_pool');

module.exports = {
    getAllUnit: async () => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            var sql = "SELECT unit_id, unit_name FROM unit ORDER BY unit_id ASC";
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
