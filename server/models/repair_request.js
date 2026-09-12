const pool = require('../libs/db_pool');
const repairTimeline = require('./repair_timeline');

const THAI_MONTHS = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

// ช่วงเวลานัดหมายมีแค่ 3 ช่วงคงที่ (ตรงกับ dropdown ฝั่ง moderator_dorm) จึงคำนวณจากชั่วโมง
// เริ่มต้นย้อนกลับได้ ไม่ต้องเก็บ column ใหม่สำหรับช่วงเวลา
function timeslotLabel(hour) {
    if (hour < 13) return '09:00 - 11:00 น.';
    if (hour < 15) return '13:00 - 15:00 น.';
    return '15:00 - 17:00 น.';
}

// แปลง "YYYY-MM-DD HH:mm:ss" เป็นข้อความวันที่+ช่วงเวลาแบบไทย ใช้ทำ step_detail ของ timeline
// เพื่อให้แต่ละ event เก็บ snapshot ของตัวเองไว้ ไม่ต้องพึ่ง appointment_date ปัจจุบันของเคส
// (ซึ่งเปลี่ยนได้เรื่อยๆ ทำให้ entry เก่าใน timeline โชว์วันที่ผิดถ้าไปอ้างอิงค่าปัจจุบันแทน)
function formatAppointmentThai(appointmentDate) {
    if (!appointmentDate) return '';
    const [datePart, timePart] = appointmentDate.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    const hour = Number((timePart || '09:00:00').split(':')[0]);
    const buddhistYear = year + 543;
    return `${day} ${THAI_MONTHS[month - 1]} ${buddhistYear} ช่วง ${timeslotLabel(hour)}`;
}

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
          "  DATE_FORMAT(rr.report_date, '%Y-%m-%d %H:%i:%s') AS report_date, " +
          "  rr.progress_detail_des, " +
          "  EXISTS(SELECT 1 FROM repair_complaint rc WHERE rc.request_id = rr.request_id " +
          "    AND rc.decision = 'pending') AS has_pending_complaint " +
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
          "  rr.report_date, " +
          "  rr.progress_detail_des " +
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
          "  DATE_FORMAT(rr.report_date, '%Y-%m-%d %H:%i:%s') AS report_date, " +
          "  rr.progress_detail_des " +
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
          "  rr.report_date, " +
          "  rr.progress_detail_des";

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

    updateRepairRequest: async (requestId, studentId, name, phone, roomNumber, repairTypeIds, description, allowEntry) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();

            var checkSql = "SELECT progress_status_id FROM repair_request WHERE request_id = ? AND student_id = ?";
            var checkRows = await conn.query(checkSql, [requestId, studentId]);

            if (!checkRows[0] || checkRows[0].progress_status_id !== 1) {
                await conn.rollback();

                result = {
                    isError: true,
                    data: "",
                    errorMessage: "ไม่สามารถแก้ไขคำร้องที่ได้รับการอนุมัติแล้วได้"
                };

                return result;
            }

            var sql =
                "UPDATE repair_request "
                + "SET contact_name = ?, contact_phone = ?, target_room = ?, description = ?, allow_entry = ? "
                + "WHERE request_id = ?;";

            await conn.query(sql, [name, phone, roomNumber, description, allowEntry ? 1 : 0, requestId]);

            await conn.query("DELETE FROM repair_request_detail WHERE request_id = ?", [requestId]);

            for (const repairTypeId of repairTypeIds) {
                await conn.query(
                    "INSERT INTO repair_request_detail (request_id, repair_type_id) VALUES (?, ?);",
                    [requestId, repairTypeId]
                );
            }

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

    // equipmentUsage: array ของ { equipment_id, quantity } — ครุภัณฑ์ที่เบิกใช้กับ case นี้
    // แทนที่รายการเดิมทั้งหมดเสมอ (คืนสต็อกเก่าก่อน แล้วค่อยหักสต็อกใหม่) เพื่อให้แก้ไข/ลบรายการ
    // ทีหลังแล้วจำนวนคงคลังถูกต้องเสมอ ไม่ใช่แค่หักซ้ำตอนเพิ่มครั้งแรก
    assignTechnician: async (requestId, technicianId, appointmentDate, notes, equipmentUsage) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();

            var previousRows = await conn.query(
                "SELECT technician_id, DATE_FORMAT(appointment_date, '%Y-%m-%d %H:%i:%s') AS appointment_date " +
                "FROM repair_request WHERE request_id = ?",
                [requestId]
            );
            var previous = previousRows[0] || { technician_id: null, appointment_date: null };

            var oldUsageRows = await conn.query(
                "SELECT equipment_id, quantity_used FROM repair_request_equipment WHERE request_id = ?",
                [requestId]
            );

            // คืนสต็อกเดิมทั้งหมดก่อน — ทำให้ตัวเลขคงเหลือกลับไปเป็น "ก่อนเคยเบิกอะไรเลย" ชั่วคราว
            for (const oldRow of oldUsageRows) {
                await conn.query(
                    "UPDATE equipment SET quantity = quantity + ? WHERE equipment_id = ?",
                    [oldRow.quantity_used, oldRow.equipment_id]
                );
            }

            const newUsage = Array.isArray(equipmentUsage) ? equipmentUsage : [];

            // เช็คสต็อกพอไหมสำหรับรายการชุดใหม่ทั้งหมด ก่อนจะหักจริง (กันหักไปครึ่งทางแล้วพัง)
            for (const usage of newUsage) {
                var stockRows = await conn.query(
                    "SELECT equipment_name, quantity FROM equipment WHERE equipment_id = ?",
                    [usage.equipment_id]
                );

                if (!stockRows[0] || stockRows[0].quantity < usage.quantity) {
                    await conn.rollback();
                    result = {
                        isError: true,
                        data: "",
                        errorMessage: `ครุภัณฑ์ "${stockRows[0]?.equipment_name ?? usage.equipment_id}" คงเหลือไม่พอ (เหลือ ${stockRows[0]?.quantity ?? 0})`
                    };
                    return;
                }
            }

            for (const usage of newUsage) {
                await conn.query(
                    "UPDATE equipment SET quantity = quantity - ? WHERE equipment_id = ?",
                    [usage.quantity, usage.equipment_id]
                );
            }

            await conn.query("DELETE FROM repair_request_equipment WHERE request_id = ?", [requestId]);

            for (const usage of newUsage) {
                await conn.query(
                    "INSERT INTO repair_request_equipment (request_id, equipment_id, quantity_used) VALUES (?, ?, ?)",
                    [requestId, usage.equipment_id, usage.quantity]
                );
            }

            var sql = "UPDATE repair_request SET technician_id = ?, appointment_date = ? WHERE request_id = ?";

            await conn.query(sql, [technicianId, appointmentDate ?? null, requestId]);

            var normalizedTechnicianId = technicianId ?? null;
            var normalizedAppointmentDate = appointmentDate ?? null;
            var technicianChanged = previous.technician_id !== normalizedTechnicianId;
            var appointmentChanged = previous.appointment_date !== normalizedAppointmentDate;

            // บันทึก timeline เฉพาะตอนที่ช่าง/วันนัดหมายเปลี่ยนจริง — กันไม่ให้กด "บันทึกการมอบหมายงาน"
            // ซ้ำโดยไม่ได้แก้อะไรแล้วเกิด entry ซ้ำซ้อนใน timeline
            if (technicianChanged || appointmentChanged) {
                var detailMessage;
                if (!normalizedAppointmentDate) {
                    detailMessage = notes || null;
                } else if (!previous.appointment_date) {
                    detailMessage = `ได้รับวันนัดหมายซ่อม ${formatAppointmentThai(normalizedAppointmentDate)}`;
                } else if (previous.appointment_date !== normalizedAppointmentDate) {
                    detailMessage = `เลื่อนกำหนดการซ่อมเป็น ${formatAppointmentThai(normalizedAppointmentDate)}`;
                } else {
                    detailMessage = `กำหนดการซ่อม ${formatAppointmentThai(normalizedAppointmentDate)}`;
                }

                if (notes && normalizedAppointmentDate) {
                    detailMessage += ` (${notes})`;
                }

                await repairTimeline.insertTimelineStep(conn, requestId, 'appointment', detailMessage);
            }

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

            // ลบนัดหมาย = คืนครุภัณฑ์ที่เคยเบิกไว้ทั้งหมดกลับเข้าคงคลัง แล้วล้างรายการเบิกทิ้ง
            var oldUsageRows = await conn.query(
                "SELECT equipment_id, quantity_used FROM repair_request_equipment WHERE request_id = ?",
                [requestId]
            );

            for (const oldRow of oldUsageRows) {
                await conn.query(
                    "UPDATE equipment SET quantity = quantity + ? WHERE equipment_id = ?",
                    [oldRow.quantity_used, oldRow.equipment_id]
                );
            }

            await conn.query("DELETE FROM repair_request_equipment WHERE request_id = ?", [requestId]);

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

            // เก็บ snapshot ข้อความรายงาน ณ ตอนปิดงานรอบนี้ไว้ใน step_detail — เพราะ progress_detail_des
            // เป็นแค่ "ค่าปัจจุบันล่าสุด" ค่าเดียว ถ้าปิดงานหลายรอบ (เช่น หลังอนุมัติคำร้องแล้วซ่อมรอบใหม่)
            // รายงานรอบก่อนจะถูกเขียนทับ ทำให้นักศึกษาไม่เห็นประวัติว่าแต่ละรอบซ่อมว่าอะไรบ้าง
            var reportRows = await conn.query(
                "SELECT progress_detail_des FROM repair_request WHERE request_id = ?",
                [requestId]
            );
            var reportSnapshot = reportRows[0]?.progress_detail_des || null;

            await repairTimeline.insertTimelineStep(conn, requestId, 'completed', reportSnapshot);

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

    // นักศึกษากด "ยอมรับ" ผลการซ่อม — ปิดเคสจริงเป็นครั้งสุดท้าย (progress_status_id = 6 "สำเร็จ")
    // เช็คว่าสถานะปัจจุบันต้องเป็น 3 ("เสร็จสิ้น" ความหมายใหม่คือรอนักศึกษาตรวจสอบ) ก่อนเท่านั้น กันกด
    // ยอมรับเคสที่ยังไม่ถึงขั้นตอนนี้ (เช่นยังอยู่ระหว่างซ่อม หรือปิดไปแล้ว)
    acceptRepairCompletion: async (requestId) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();

            var statusRows = await conn.query(
                "SELECT progress_status_id FROM repair_request WHERE request_id = ?",
                [requestId]
            );

            if (!statusRows[0] || statusRows[0].progress_status_id !== 3) {
                await conn.rollback();
                result = {
                    isError: true,
                    data: "",
                    errorMessage: "เคสนี้ยังไม่อยู่ในสถานะที่ยืนยันได้"
                };
                return;
            }

            await conn.query(
                "UPDATE repair_request SET progress_status_id = 6, finish_date = NOW() WHERE request_id = ?",
                [requestId]
            );

            await repairTimeline.insertTimelineStep(conn, requestId, 'accepted', null);

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

    saveRepairReport: async (requestId, reportText) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            var sql =
                "UPDATE repair_request " +
                "SET progress_detail_des = ? " +
                "WHERE request_id = ?";

            await conn.query(sql, [reportText, requestId]);

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