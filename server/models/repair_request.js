const pool = require('../libs/db_pool');
const repairTimeline = require('./repair_timeline');
const notification = require('./notification');

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

const APPOINTMENT_SLOT_HOURS = [9, 13, 15]; // ชั่วโมงเริ่มของ 3 ช่วง (09-11, 13-15, 15-17)
const MAX_QUEUE_PER_SLOT = 3; // จำกัด 3 คิวต่อ 1 ช่วงเวลาต่อวัน (9 คิว/วัน)
const MAX_SEARCH_DAYS = 90;  // กันวนไม่รู้จบ เคสจริงไม่ควรเต็มขนาดนี้

// ช่วงชั่วโมงของแต่ละช่วงเวลา ให้ตรงกับ timeslotLabel (<13 = 09-11, 13-14 = 13-15, >=15 = 15-17)
// นับเป็นช่วงแทนการเทียบชั่วโมงเป๊ะๆ เผื่อ appointment_date ของเคสเก่าไม่ได้เก็บชั่วโมงเริ่มพอดี
function slotHourRange(slotHour) {
    if (slotHour < 13) return [0, 12];
    if (slotHour < 15) return [13, 14];
    return [15, 23];
}

// นับคิวที่จองช่วงเวลานี้แล้ว เฉพาะเคสที่ยังไม่ถูกปฏิเสธ/ยกเลิก (สถานะ 4) และไม่นับเคสของตัวเอง
// (excludeRequestId) เพราะตอนเลื่อนนัด นัดเดิมของเคสเดียวกันไม่ควรมาแย่งที่ตัวเอง
async function countSlotBookings(conn, dateOnly, slotHour, excludeRequestId) {
    const [minHour, maxHour] = slotHourRange(slotHour);
    const rows = await conn.query(
        "SELECT COUNT(*) AS total FROM repair_request " +
        "WHERE DATE(appointment_date) = ? AND HOUR(appointment_date) BETWEEN ? AND ? " +
        "AND progress_status_id != 4 AND request_id != ?",
        [dateOnly, minHour, maxHour, excludeRequestId ?? 0]
    );
    return Number(rows[0].total);
}

// เคสแก้ไข = เคสที่เคยถูกอนุมัติคำร้องอุทธรณ์อย่างน้อย 1 ครั้ง นัดหมายของเคสแก้ไขต้องได้ช่วงเวลาที่ไม่มีเคสอื่น
// นัดเลย (เจ้าหน้าที่ต้องมีเวลาเต็มช่วงตรวจงานที่ถูกร้องเรียน) ต่างจากงานซ่อมทั่วไปที่รวมได้ 3 คิวต่อช่วง
async function isRevisionCase(conn, requestId) {
    const rows = await conn.query(
        "SELECT COUNT(*) AS total FROM repair_complaint WHERE request_id = ? AND decision = 'approved'",
        [requestId]
    );
    return Number(rows[0].total) > 0;
}

// หาคิวว่างถัดไปสำหรับจัดนัดหมายอัตโนมัติตอนอนุมัติคำร้อง — ไล่หาวันเริ่มจากวันนี้ (ห้ามย้อนหลัง)
// ทีละช่วงเวลาตามลำดับ 09-11 → 13-15 → 15-17 ข้ามช่วงที่เต็มแล้ว (maxBookings คิว) และช่วงของวันนี้ที่เริ่มไปแล้ว
// (ชั่วโมงเริ่ม <= ชั่วโมงปัจจุบัน) คืนค่า "YYYY-MM-DD HH:mm:ss" ให้ appointment_date ใช้ตรงๆ
async function findNextAvailableAppointment(conn, excludeRequestId, maxBookings = MAX_QUEUE_PER_SLOT) {
    const now = new Date();

    for (let dayOffset = 0; dayOffset < MAX_SEARCH_DAYS; dayOffset++) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset);
        // ข้ามเสาร์-อาทิตย์เฉพาะตอนระบบจัดให้เอง เผื่อช่างไม่ว่าง — เจ้าหน้าที่เลือกวันหยุดเองได้เมื่อมีงานด่วน
        // (วันหยุดนักขัตฤกษ์ระบบไม่รู้ เจ้าหน้าที่เลื่อนเอง)
        if (d.getDay() === 0 || d.getDay() === 6) continue;
        const dateOnly = d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');

        for (const hour of APPOINTMENT_SLOT_HOURS) {
            if (dayOffset === 0 && hour <= now.getHours()) continue;

            if (await countSlotBookings(conn, dateOnly, hour, excludeRequestId) < maxBookings) {
                return `${dateOnly} ${String(hour).padStart(2, '0')}:00:00`;
            }
        }
    }

    return null; // แทบเป็นไปไม่ได้ในทางปฏิบัติ แต่กันไว้เผื่อ MAX_SEARCH_DAYS ไม่พอจริงๆ
}

// จัดนัดหมายอัตโนมัติตอนอนุมัติ เฉพาะเคสที่นักศึกษาอนุญาตให้เข้าห้อง (allow_entry) — เคสที่ไม่อนุญาต
// ต้องนัดให้นักศึกษาอยู่ห้อง เจ้าหน้าที่จึงกำหนดวัน/ช่วงเวลาเอง ไม่เลือกช่างให้ (เจ้าหน้าที่เลือกทีหลัง)
// รับ conn จากผู้เรียกให้อยู่ใน transaction เดียวกับการอนุมัติ คืนวันนัดที่จัดให้ หรือ null ถ้าไม่ได้จัด
//
// allowEntryOverride: ใช้ตอนอนุมัติ "คำร้องอุทธรณ์" ซึ่งมีค่า allow_entry เป็นของรอบอุทธรณ์นั้นเอง
// (คอลัมน์แยกใน repair_complaint ไม่ใช่ repair_request.allow_entry ของเคสทั้งเคส) — ถ้าไม่ส่งมา (undefined)
// ฟังก์ชันจะอ่านจาก repair_request.allow_entry เหมือนเดิมทุกประการ (พฤติกรรมเดิมตอนอนุมัติครั้งแรกไม่เปลี่ยน)
async function autoScheduleIfAllowed(conn, requestId, allowEntryOverride) {
    let allowEntry = allowEntryOverride;
    if (allowEntry === undefined) {
        const rows = await conn.query("SELECT allow_entry FROM repair_request WHERE request_id = ?", [requestId]);
        allowEntry = rows[0] ? rows[0].allow_entry : null;
    }
    if (!allowEntry) return null;

    const maxBookings = (await isRevisionCase(conn, requestId)) ? 1 : MAX_QUEUE_PER_SLOT;
    const appointmentDate = await findNextAvailableAppointment(conn, requestId, maxBookings);
    if (!appointmentDate) return null;

    await conn.query("UPDATE repair_request SET appointment_date = ? WHERE request_id = ?", [appointmentDate, requestId]);
    await repairTimeline.insertTimelineStep(
        conn, requestId, 'appointment',
        `ระบบจัดคิวนัดหมายซ่อมให้อัตโนมัติ ${formatAppointmentThai(appointmentDate)}`
    );

    return appointmentDate;
}

// แปลงชั่วโมงเริ่มของนัดหมายเป็น key ช่วงเวลา ตรงกับ dropdown/มินิปฏิทินฝั่ง moderator_dorm
// (ตรงข้ามกับ slotHourRange ด้านบนที่แปลง key เป็นช่วงชั่วโมง)
function hourToSlotKey(hour) {
    if (hour < 13) return '09-11';
    if (hour < 15) return '13-15';
    return '15-17';
}

// สรุปจำนวนคิวที่จองแล้วต่อวัน/ช่วงเวลา สำหรับมินิปฏิทินตอนเจ้าหน้าที่นัดหมายเอง (กรณีเคสไม่อนุญาต
// เข้าห้อง/เคสเลื่อนนัด) — คืนค่าเป็น object แยกตามวันที่ แต่ละวันมี 3 ช่วงเวลา พร้อมรายชื่อเคสที่จองไว้
// isRevisionLocked = true หมายถึงมีเคสแก้ไข (ผ่านคำร้องอุทธรณ์ที่อนุมัติแล้ว) ครองช่วงนี้อยู่คนเดียว
// (กติกาเดียวกับ isRevisionCase/autoScheduleIfAllowed — เคสแก้ไขต้องได้ช่วงเวลาเต็มๆ ไม่แชร์กับเคสอื่น)
async function getSlotAvailability(startDate, days, excludeRequestId) {
    let conn;
    let result;

    try {
        conn = await pool.getConnection();

        const endDate = new Date(startDate + 'T00:00:00');
        endDate.setDate(endDate.getDate() + days - 1);
        const endDateStr = endDate.toISOString().slice(0, 10);

        const rows = await conn.query(
            "SELECT " +
            "  rr.request_id, " +
            "  rr.case_code, " +
            "  DATE_FORMAT(rr.appointment_date, '%Y-%m-%d') AS booking_date, " +
            "  HOUR(rr.appointment_date) AS booking_hour, " +
            "  GROUP_CONCAT(DISTINCT rt.repair_type_name SEPARATOR ', ') AS type_names, " +
            "  EXISTS(SELECT 1 FROM repair_complaint rc WHERE rc.request_id = rr.request_id AND rc.decision = 'approved') AS is_revision " +
            "FROM repair_request rr " +
            "LEFT JOIN repair_request_detail rrd ON rr.request_id = rrd.request_id " +
            "LEFT JOIN repair_type rt ON rrd.repair_type_id = rt.repair_type_id " +
            "WHERE rr.appointment_date IS NOT NULL " +
            "AND DATE(rr.appointment_date) BETWEEN ? AND ? " +
            "AND rr.progress_status_id != 4 " +
            "AND rr.request_id != ? " +
            "GROUP BY rr.request_id",
            [startDate, endDateStr, excludeRequestId ?? 0]
        );

        // ตั้งโครงว่างไว้ก่อนทุกวัน/ทุกช่วง เพื่อให้ frontend ไม่ต้องเช็ค undefined เอง
        const days_ = {};
        for (let i = 0; i < days; i++) {
            const d = new Date(startDate + 'T00:00:00');
            d.setDate(d.getDate() + i);
            const dateStr = d.toISOString().slice(0, 10);
            days_[dateStr] = {
                '09-11': { count: 0, isRevisionLocked: false, cases: [] },
                '13-15': { count: 0, isRevisionLocked: false, cases: [] },
                '15-17': { count: 0, isRevisionLocked: false, cases: [] },
            };
        }

        for (const row of rows) {
            const bucket = days_[row.booking_date];
            if (!bucket) continue; // นอกช่วงที่ขอ (กันเผื่อ timezone เพี้ยน)
            const slotKey = hourToSlotKey(row.booking_hour);
            const slot = bucket[slotKey];
            slot.count += 1;
            if (row.is_revision) slot.isRevisionLocked = true;
            slot.cases.push({ caseCode: row.case_code, typeNames: row.type_names || '' });
        }

        result = { isError: false, data: days_, errorMessage: "" };
    } catch (error) {
        result = { isError: true, data: "", errorMessage: error.message };
    } finally {
        if (conn) conn.release();
        return result;
    }
}

module.exports = {
    autoScheduleIfAllowed,
    findNextAvailableAppointment,
    getSlotAvailability,

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
          // เหตุผลเดียวกับใน getRepairRequestById — openManageModal ฝั่ง moderator ใช้ค่าจาก list นี้
          // (findCase) เป็นหลัก ไม่ใช่จาก getRepairRequestById เสมอไป (เรียกแค่ตอนมีนัดหมายแล้วเท่านั้น)
          // ต้องมี id คู่กับชื่อตรงนี้ด้วยถึงจะสร้างการ์ดรายงานผลซ่อมแยกรายรายการได้ทุกกรณี
          "  JSON_ARRAYAGG(JSON_OBJECT('repair_type_id', rt.repair_type_id, 'repair_type_name', rt.repair_type_name)) AS repair_types_json, " +
          "  rr.description, " +
          "  ps.progress_status_id, " +
          "  ps.progress_status_name, " +
          "  rr.technician_id, " +
          "  CONCAT(tp.firstname, ' ', tp.lastname) AS technician_name, " +
          "  DATE_FORMAT(rr.appointment_date, '%Y-%m-%d %H:%i:%s') AS appointment_date, " +
          "  DATE_FORMAT(rr.report_date, '%Y-%m-%d %H:%i:%s') AS report_date, " +
          "  rr.max_complaints " +
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
          "  rr.max_complaints " +
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
          "  rr.max_complaints, " +
          "  GROUP_CONCAT(rt.repair_type_name SEPARATOR ',') AS type_names, " +
          // repair_types_json ให้ id คู่กับชื่อ (type_names ข้างบนมีแค่ชื่อรวมเป็น string เดียว หา id ไม่ได้)
          // ฝั่ง moderator ต้องใช้ id นี้แยกการ์ดรายงานผลซ่อมต่อรายการงานซ่อม — เพิ่มควบคู่ ไม่ลบ type_names เดิม
          "  JSON_ARRAYAGG(JSON_OBJECT('repair_type_id', rt.repair_type_id, 'repair_type_name', rt.repair_type_name)) AS repair_types_json, " +
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
          "  rr.max_complaints, " +
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
            await notification.createNotification(conn, requestId, 'new_request', `${name} แจ้งซ่อมใหม่`);

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

            // ถ้านักศึกษาไม่อนุญาตให้ช่างเข้าห้อง (allow_entry=0) autoScheduleIfAllowed ด้านล่างจะไม่จัดคิวให้
            // เอง — ต้องบอกนักศึกษาว่าให้ติดต่อใคร จึงดึงชื่อ+เบอร์เจ้าหน้าที่ที่อนุมัติ (accountId) มาใส่ใน
            // การ์ด timeline 'approved' แทนค่าว่าง (ใช้วิธีฝังข้อความใน step_detail แบบเดียวกับจุดอื่นในระบบ
            // ไม่ต้องเพิ่มคอลัมน์/endpoint ใหม่)
            var caseRows = await conn.query("SELECT allow_entry FROM repair_request WHERE request_id = ?", [requestId]);
            var approvedDetail = null;
            if (!caseRows[0] || !caseRows[0].allow_entry) {
                var contactRows = await conn.query(
                    "SELECT p.firstname, p.lastname, p.phone " +
                    "FROM account a " +
                    "JOIN person p ON p.person_id = a.person_id " +
                    "WHERE a.account_id = ?",
                    [accountId]
                );
                if (contactRows[0]) {
                    approvedDetail =
                        `คุณไม่อนุญาตให้ช่างเข้าห้อง กรุณาติดต่อเจ้าหน้าที่ ${contactRows[0].firstname} ${contactRows[0].lastname} ` +
                        `เบอร์ ${contactRows[0].phone} เพื่อนัดหมายวันที่สะดวก`;
                }
            }

            await repairTimeline.insertTimelineStep(conn, requestId, 'approved', approvedDetail);

            // อยู่ใน transaction เดียวกับการอนุมัติ ถ้าจัดนัดพังจะ rollback ทั้งหมด ไม่เหลือเคสที่อนุมัติครึ่งๆ กลางๆ
            var appointmentDate = await autoScheduleIfAllowed(conn, requestId);

            await conn.commit();

            result = {
                isError: false,
                data: { appointmentDate },
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

            // นัดหมายเดิมที่ค้างอยู่ในเคสอาจเป็นของ "รอบก่อน" (ก่อนคำร้องอุทธรณ์ถูกอนุมัติ) — ถ้ามี step
            // complaint_approved ใหม่กว่านัดหมายล่าสุดใน timeline แปลว่านี่คือการนัดหมายรอบแก้ไขครั้งแรก
            // ไม่ใช่การเลื่อนนัดเดิม จึงต้องนับเป็น "ได้รับวันนัดหมาย" ใหม่ ไม่ใช่ "เลื่อนกำหนดการ"
            var latestStepRows = await conn.query(
                "SELECT " +
                "  (SELECT MAX(timeline_id) FROM repair_timeline WHERE request_id = ? AND step_code = 'appointment') AS last_appointment_id, " +
                "  (SELECT MAX(timeline_id) FROM repair_timeline WHERE request_id = ? AND step_code = 'complaint_approved') AS last_approved_id",
                [requestId, requestId]
            );
            var lastAppointmentId = latestStepRows[0].last_appointment_id;
            var lastApprovedId = latestStepRows[0].last_approved_id;
            if (lastApprovedId && (!lastAppointmentId || lastApprovedId > lastAppointmentId)) {
                previous = { technician_id: previous.technician_id, appointment_date: null };
            }

            // ห้ามนัดหมายย้อนหลัง — ต้องไม่ก่อนวันนี้ และไม่ก่อนวันที่เจ้าหน้าที่อนุมัติ (คำร้องแจ้งซ่อม
            // ครั้งแรก หรือคำร้องอุทธรณ์รอบแก้ไข แล้วแต่ว่าเคสนี้เพิ่งผ่านอนุมัติแบบไหนมาล่าสุด)
            // เช็คเฉพาะตอนวันนัด "ถูกเปลี่ยน" — ถ้าบันทึกซ้ำโดยวันเดิม (เช่น เบิกครุภัณฑ์เพิ่มหลังซ่อมเสร็จ ซึ่งวันนัด
            // เดิมผ่านไปแล้ว) ต้องไม่ถูกปฏิเสธว่านัดย้อนหลัง
            if (appointmentDate && appointmentDate !== previous.appointment_date) {
                var appointmentDateOnly = appointmentDate.slice(0, 10);
                // ใช้วันที่ตามเวลาเครื่อง (ไม่ใช่ UTC จาก toISOString) ให้ตรงกับฝั่งหน้าจอ
                var nowLocal = new Date();
                var todayOnly = nowLocal.getFullYear() + '-' +
                    String(nowLocal.getMonth() + 1).padStart(2, '0') + '-' +
                    String(nowLocal.getDate()).padStart(2, '0');

                var approvedComplaintRows = await conn.query(
                    "SELECT DATE_FORMAT(decided_at, '%Y-%m-%d') AS d FROM repair_complaint " +
                    "WHERE request_id = ? AND decision = 'approved' ORDER BY decided_at DESC LIMIT 1",
                    [requestId]
                );
                var approvedTimelineRows = await conn.query(
                    "SELECT DATE_FORMAT(event_date, '%Y-%m-%d') AS d FROM repair_timeline " +
                    "WHERE request_id = ? AND step_code = 'approved' ORDER BY event_date DESC LIMIT 1",
                    [requestId]
                );
                var approvalFloor = approvedComplaintRows[0]?.d || approvedTimelineRows[0]?.d || null;
                var effectiveFloor = (approvalFloor && approvalFloor > todayOnly) ? approvalFloor : todayOnly;

                if (appointmentDateOnly < effectiveFloor) {
                    await conn.rollback();
                    result = {
                        isError: true,
                        data: "",
                        errorMessage: `นัดหมายวันซ่อมย้อนหลังไม่ได้ (เลือกได้ตั้งแต่วันที่ ${effectiveFloor} เป็นต้นไป)`
                    };
                    return;
                }
            }

            // จำกัด 3 คิวต่อช่วงเวลาต่อวัน — เช็คเฉพาะตอนวัน/ช่วงถูกเปลี่ยน (เหตุผลเดียวกับเช็คย้อนหลังด้านบน)
            // เจ้าหน้าที่กำหนดเองได้เฉพาะเคสที่นักศึกษาไม่อนุญาตเข้าห้อง ส่วนเคสที่อนุญาตระบบจัดคิวให้เอง
            if (appointmentDate && appointmentDate !== previous.appointment_date) {
                var slotHour = Number(appointmentDate.slice(11, 13));
                var booked = await countSlotBookings(conn, appointmentDate.slice(0, 10), slotHour, requestId);
                var isRevision = await isRevisionCase(conn, requestId);
                if (isRevision && booked >= 1) {
                    await conn.rollback();
                    result = {
                        isError: true,
                        data: "",
                        errorMessage: "เคสแก้ไขต้องใช้ช่วงเวลาที่ไม่มีนัดหมายอื่น กรุณาเลือกวัน/ช่วงเวลาอื่น"
                    };
                    return;
                }
                if (booked >= MAX_QUEUE_PER_SLOT) {
                    await conn.rollback();
                    result = {
                        isError: true,
                        data: "",
                        errorMessage: "ช่วงเวลานี้เต็มแล้ว (3/3 คิว) กรุณาเลือกวัน/ช่วงเวลาอื่น"
                    };
                    return;
                }
            }

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

            // ของเดิม snapshot ข้อความจาก progress_detail_des (คอลัมน์รายงานรวมก้อนเดียว) มาเก็บไว้ใน
            // step_detail ตรงนี้ด้วย — ตอนนี้คอลัมน์นั้นถูกถอดออกจากระบบแล้ว (ย้ายไปเก็บรายงานแยกรายรายการ
            // ที่ repair_completion_item ซึ่งมีประวัติของตัวเองอยู่แล้วในตัว ไม่ต้อง snapshot ซ้ำอีกชั้น)
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
                "SELECT progress_status_id, contact_name FROM repair_request WHERE request_id = ?",
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
            await notification.createNotification(conn, requestId, 'accepted', `${statusRows[0].contact_name} กดยอมรับผลการซ่อมแล้ว`);

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

    // นักศึกษากด "ไม่ยอมรับ" ผลการซ่อม — ปิดเคสเป็น progress_status_id = 8 "ซ่อมไม่สำเร็จ" คู่กับ acceptRepairCompletion
    // ทำได้เฉพาะสถานะ 3 (รอนักศึกษาตัดสิน) และ "ยื่นคำร้องครบสิทธิ์แล้ว" เท่านั้น — ถ้ายังยื่นได้อีกต้องใช้สิทธิ์ยื่น
    // คำร้องก่อน ไม่ให้ปิดเคสเป็นไม่สำเร็จข้ามขั้นอุทธรณ์ (เช็คที่ backend ซ้ำจากที่แอปซ่อนปุ่ม)
    declineRepairCompletion: async (requestId, reason) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();

            var caseRows = await conn.query(
                "SELECT progress_status_id, max_complaints, contact_name FROM repair_request WHERE request_id = ? FOR UPDATE",
                [requestId]
            );

            if (!caseRows[0] || caseRows[0].progress_status_id !== 3) {
                await conn.rollback();
                result = {
                    isError: true,
                    data: "",
                    errorMessage: "เคสนี้ยังไม่อยู่ในสถานะที่ตัดสินได้"
                };
                return;
            }

            var filedRows = await conn.query(
                "SELECT COUNT(*) AS total FROM repair_complaint WHERE request_id = ?",
                [requestId]
            );
            if (Number(filedRows[0].total) < Number(caseRows[0].max_complaints)) {
                await conn.rollback();
                result = {
                    isError: true,
                    data: "",
                    errorMessage: "ยังยื่นคำร้องได้อีก กรุณายื่นคำร้องแจ้งแก้ไขก่อน ไม่ยอมรับผลซ่อมได้เมื่อใช้สิทธิ์ยื่นครบแล้ว"
                };
                return;
            }

            await conn.query(
                "UPDATE repair_request SET progress_status_id = 8, finish_date = NOW() WHERE request_id = ?",
                [requestId]
            );

            await repairTimeline.insertTimelineStep(conn, requestId, 'declined', reason);
            await notification.createNotification(conn, requestId, 'declined', `${caseRows[0].contact_name} ไม่ยอมรับผลการซ่อม`);

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