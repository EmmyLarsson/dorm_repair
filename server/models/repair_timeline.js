const pool = require('../libs/db_pool');

module.exports = {
    getTimelineByRequestId: async (requestId) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            var sql = "SELECT " +
          "  step_code, " +
          "  step_detail AS event_detail, " +
          "  DATE_FORMAT(event_date, '%Y-%m-%d %H:%i:%s') AS event_date " +
          "FROM repair_timeline " +
          "WHERE request_id = ? " +
          "ORDER BY event_date ASC, timeline_id ASC";

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

    insertTimelineStep: async (conn, requestId, stepCode, detail) => {
        var sql =
            "INSERT INTO repair_timeline (request_id, step_code, step_detail) " +
            "VALUES (?, ?, ?)";

        await conn.query(sql, [requestId, stepCode, detail ?? null]);
    },

    hasStep: async (conn, requestId, stepCode) => {
        var sql =
            "SELECT 1 FROM repair_timeline " +
            "WHERE request_id = ? AND step_code = ? " +
            "LIMIT 1";

        var rows = await conn.query(sql, [requestId, stepCode]);

        return rows.length > 0;
    }
}
