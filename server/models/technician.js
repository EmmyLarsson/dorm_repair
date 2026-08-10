const pool = require('../libs/db_pool');

module.exports = {
    getAllTechnicians: async () => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            var sql = "SELECT " +
          "  t.technician_id, " +
          "  CONCAT(p.firstname, ' ', p.lastname) AS full_name, " +
          "  s.specialty_name " +
          "FROM technician t " +
          "JOIN person p ON p.person_id = t.person_id " +
          "LEFT JOIN specialty s ON s.specialty_id = t.specialty_id " +
          "ORDER BY full_name";

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
