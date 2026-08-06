const pool = require('../libs/db_pool');

module.exports = {
    getAllRepairRequest : async () => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            var sql = "SELECT " +
          "  rr.request_id, " +
          "  rr.case_code, " +
          "  rr.contact_name AS student_name, " +
          "  rr.target_room AS room_number, " +
          "  GROUP_CONCAT(rt.repair_type_name SEPARATOR ',') AS type_names, " +
          "  rr.description, " +
          "  ps.progress_status_id, " +
          "  ps.progress_status_name, " +
          "  DATE_FORMAT(rr.report_date, '%Y-%m-%d %H:%i:%s') AS report_date " +
          "FROM repair_request rr " +
          "LEFT JOIN repair_request_detail rrd ON rr.request_id = rrd.request_id " +
          "LEFT JOIN repair_type rt ON rrd.repair_type_id = rt.repair_type_id " +
          "LEFT JOIN progress_status ps ON rr.progress_status_id = ps.progress_status_id " +
          "GROUP BY " +
          "  rr.request_id, " +
          "  rr.case_code, " +
          "  rr.contact_name, " +
          "  rr.target_room, " +
          "  rr.description, " +
          "  ps.progress_status_id, " +
          "  ps.progress_status_name, " +
          "  rr.report_date " +
          "ORDER BY rr.report_date DESC";

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
    },
    getRepairSummary : async () => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            var sql = "SELECT " +
          "  progress_status_id, " +
          "  CAST(COUNT(*) AS SIGNED) AS total " +
          "FROM repair_request " +
          "GROUP BY progress_status_id";

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
    },
    getRepairRequestById : async (requestId) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            var sql = "SELECT " +
          "  rr.request_id, " +
          "  rr.case_code, " +
          "  rr.contact_name AS student_name, " +
          "  rr.contact_phone, " +
          "  rr.target_room AS room_number, " +
          "  rr.allow_entry, " +
          "  GROUP_CONCAT(rt.repair_type_name SEPARATOR ',') AS type_names, " +
          "  rr.description, " +
          "  ps.progress_status_id, " +
          "  ps.progress_status_name, " +
          "  DATE_FORMAT(rr.report_date, '%Y-%m-%d %H:%i:%s') AS report_date " +
          "FROM repair_request rr " +
          "LEFT JOIN repair_request_detail rrd ON rr.request_id = rrd.request_id " +
          "LEFT JOIN repair_type rt ON rrd.repair_type_id = rt.repair_type_id " +
          "LEFT JOIN progress_status ps ON rr.progress_status_id = ps.progress_status_id " +
          "WHERE rr.request_id = ? " +
          "GROUP BY " +
          "  rr.request_id, " +
          "  rr.case_code, " +
          "  rr.contact_name, " +
          "  rr.contact_phone, " +
          "  rr.target_room, " +
          "  rr.allow_entry, " +
          "  rr.description, " +
          "  ps.progress_status_id, " +
          "  ps.progress_status_name, " +
          "  rr.report_date";

            var rows = await conn.query(sql, [requestId]);

            result = {
                isError: false,
                data: rows[0] ?? null,
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
    },
    getRepairRequestByRepairStatus : async (accountId) => {
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
          "AND ps.progress_status_id = ? " +
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
    },
    createRepairRequest: async (studentId, name, phone, roomNumber, repairTypeIds, description, allowEntry) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();

            const tempCaseCode = "TEMP-" + Date.now();

            var sql =
                "INSERT INTO repair_request ("
                + "student_id, case_code, progress_status_id, description, "
                + "target_room, contact_name, contact_phone, allow_entry, report_date"
                + ") VALUES (?, ?, 1, ?, ?, ?, ?, ?, NOW());";;

            const insertResult = await conn.query(
                sql,
                [
                    studentId,
                    tempCaseCode,
                    description,
                    roomNumber,
                    name,
                    phone,
                    allowEntry ? 1 : 0
                ]
            );

            const requestId = Number(insertResult.insertId);

            const caseCode =
                "11"
                + String(requestId).padStart(5, "0");

            var updateCaseCodeSql =
                "UPDATE repair_request "
                + "SET case_code = ? "
                + "WHERE request_id = ?;";

            await conn.query(
                updateCaseCodeSql,
                [
                    caseCode,
                    requestId
                ]
            );

            for (const repairTypeId of repairTypeIds) {
                var detailSql =
                    "INSERT INTO repair_request_detail ("
                    + "request_id, "
                    + "repair_type_id"
                    + ") "
                    + "VALUES (?, ?);";

                await conn.query(
                    detailSql,
                    [
                        requestId,
                        repairTypeId
                    ]
                );
            }

            await conn.commit();

            result = {
                isError: false,
                data: {
                    request_id: requestId,
                    case_code: caseCode
                },
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
            };
        } finally {
            if (conn) {
                conn.release();
            }

            return result;
        }
    },

    deleteRepairStatus: async (requestId) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            var sql = "DELETE FROM repair_request WHERE request_id = ?";

            await conn.query(sql, [requestId]);

            result = {
                isError: false,
                data: "",
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
}