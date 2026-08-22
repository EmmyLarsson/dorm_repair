const pool = require('../libs/db_pool');
const repairTimeline = require('./repair_timeline');

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
          "  rr.technician_id, " +
          "  CONCAT(tp.firstname, ' ', tp.lastname) AS technician_name, " +
          "  DATE_FORMAT(rr.appointment_date, '%Y-%m-%d %H:%i:%s') AS appointment_date, " +
          "  DATE_FORMAT(rr.report_date, '%Y-%m-%d %H:%i:%s') AS report_date " +
          "FROM repair_request rr " +
          "LEFT JOIN repair_request_detail rrd ON rr.request_id = rrd.request_id " +
          "LEFT JOIN repair_type rt ON rrd.repair_type_id = rt.repair_type_id " +
          "LEFT JOIN progress_status ps ON rr.progress_status_id = ps.progress_status_id " +
          "LEFT JOIN technician t ON rr.technician_id = t.technician_id " +
          "LEFT JOIN person tp ON t.person_id = tp.person_id " +
          "GROUP BY " +
          "  rr.request_id, " +
          "  rr.case_code, " +
          "  rr.contact_name, " +
          "  rr.target_room, " +
          "  rr.description, " +
          "  ps.progress_status_id, " +
          "  ps.progress_status_name, " +
          "  rr.technician_id, " +
          "  tp.firstname, " +
          "  tp.lastname, " +
          "  rr.appointment_date, " +
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
          "  rr.technician_id, " +
          "  CONCAT(tp.firstname, ' ', tp.lastname) AS technician_name, " +
          "  tp.phone AS technician_phone, " +
          "  DATE_FORMAT(rr.appointment_date, '%Y-%m-%d %H:%i:%s') AS appointment_date, " +
          "  DATE_FORMAT(rr.finish_date, '%Y-%m-%d %H:%i:%s') AS finish_date, " +
          "  DATE_FORMAT(rr.report_date, '%Y-%m-%d %H:%i:%s') AS report_date " +
          "FROM repair_request rr " +
          "LEFT JOIN repair_request_detail rrd ON rr.request_id = rrd.request_id " +
          "LEFT JOIN repair_type rt ON rrd.repair_type_id = rt.repair_type_id " +
          "LEFT JOIN progress_status ps ON rr.progress_status_id = ps.progress_status_id " +
          "LEFT JOIN technician t ON rr.technician_id = t.technician_id " +
          "LEFT JOIN person tp ON t.person_id = tp.person_id " +
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
          "  rr.technician_id, " +
          "  tp.firstname, " +
          "  tp.lastname, " +
          "  tp.phone, " +
          "  rr.appointment_date, " +
          "  rr.finish_date, " +
          "  rr.report_date";

            var rows = await conn.query(sql, [requestId]);

            result = {
                isError: false,
                data: rows[0] ?? null,
                errorMessage: ""
            };
        } catch (error) {
            result = {
                isError: false,
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

            await repairTimeline.insertTimelineStep(conn, requestId, 'submitted', null);

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

    approveRepairRequest: async (requestId, accountId) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();

            var sql =
                "UPDATE repair_request rr " +
                "JOIN account a ON a.account_id = ? " +
                "JOIN moderator m ON m.person_id = a.person_id " +
                "SET rr.progress_status_id = 2, rr.moderator_id = m.moderator_id " +
                "WHERE rr.request_id = ?";

            await conn.query(sql, [accountId, requestId]);

            await repairTimeline.insertTimelineStep(conn, requestId, 'approved', null);

            await conn.commit();

            result = {
                isError: false,
                data: "",
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
    },

    rejectRepairRequest: async (requestId, accountId, reason) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();

            var moderatorSql =
                "SELECT m.moderator_id " +
                "FROM account a " +
                "JOIN moderator m ON m.person_id = a.person_id " +
                "WHERE a.account_id = ?";

            var moderatorRows = await conn.query(moderatorSql, [accountId]);
            var moderatorId = moderatorRows[0] ? moderatorRows[0].moderator_id : null;

            var insertSql =
                "INSERT INTO repair_cancellation (" +
                "request_id, cancelled_by_moderator_id, cancel_reason" +
                ") VALUES (?, ?, ?)";

            await conn.query(insertSql, [requestId, moderatorId, reason]);

            var updateSql =
                "UPDATE repair_request " +
                "SET progress_status_id = 4 " +
                "WHERE request_id = ?";

            await conn.query(updateSql, [requestId]);

            await repairTimeline.insertTimelineStep(conn, requestId, 'cancelled', reason);

            await conn.commit();

            result = {
                isError: false,
                data: "",
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
    },

    assignTechnician: async (requestId, technicianId, appointmentDate, notes) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();

            var sql = "UPDATE repair_request SET technician_id = ?, appointment_date = ? WHERE request_id = ?";

            await conn.query(sql, [technicianId, appointmentDate ?? null, requestId]);

            await repairTimeline.insertTimelineStep(conn, requestId, 'appointment', notes);

            await conn.commit();

            result = {
                isError: false,
                data: "",
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
    },

    cancelAppointment: async (requestId) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();

            var sql = "UPDATE repair_request SET technician_id = NULL, appointment_date = NULL WHERE request_id = ?";

            await conn.query(sql, [requestId]);

            await repairTimeline.insertTimelineStep(conn, requestId, 'appointment_cancelled', null);

            await conn.commit();

            result = {
                isError: false,
                data: "",
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
    },

    completeRepairRequest: async (requestId) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();

            var sql =
                "UPDATE repair_request " +
                "SET progress_status_id = 3, finish_date = NOW() " +
                "WHERE request_id = ?";

            await conn.query(sql, [requestId]);

            await repairTimeline.insertTimelineStep(conn, requestId, 'completed', null);

            await conn.commit();

            result = {
                isError: false,
                data: "",
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
    },

    deleteRepairRequest: async (requestIds) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            const ids = Array.isArray(requestIds) ? requestIds : [requestIds];
            const placeholders = ids.map(() => '?').join(', ');

            var sql = `DELETE FROM repair_request WHERE request_id IN (${placeholders})`;

            await conn.query(sql, ids);

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