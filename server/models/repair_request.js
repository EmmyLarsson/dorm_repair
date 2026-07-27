const pool = require('../libs/db_pool');

module.exports = {
    getAllRepairRequestbyUser : async (accountId) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            var sql = "SELECT " +
          "  rr.request_id, " +
          "  rr.case_code, " +
          "  GROUP_CONCAT(rt.repair_type_name SEPARATOR ',') AS type_names, " +
          "  rr.description, " +
          "  ps.progress_status_id, " +
          "  ps.progress_status_name, " +
          "  DATE_FORMAT(rr.report_date, '%Y-%m-%d %H:%i:%s') AS report_date " +
          "FROM repair_request rr " +
          "LEFT JOIN repair_request_detail rrd ON rr.request_id = rrd.request_id " +
          "LEFT JOIN repair_type rt ON rrd.repair_type_id = rt.repair_type_id " +
          "LEFT JOIN progress_status ps ON rr.progress_status_id = ps.progress_status_id " +
          "WHERE rr.student_id = ? " +
          "GROUP BY " +
          "  rr.request_id, " +
          "  rr.case_code, " +
          "  rr.description, " +
          "  ps.progress_status_id, " +
          "  ps.progress_status_name, " +
          "  rr.report_date " +
          "ORDER BY rr.report_date DESC";

            var rows = await conn.query(sql, [accountId]);


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