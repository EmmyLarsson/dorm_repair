const pool = require('../libs/db_pool');
const repairTimeline = require('./repair_timeline');
const notification = require('./notification');
const { STALE_FLAG_AFTER_DAYS, AUTO_CLOSE_AFTER_DAYS, RUSH_COOLDOWN_HOURS, RECENT_CLOSED_DAYS } = require('../config/thresholds');

// step_code ของ repair_timeline ที่ "เจ้าหน้าที่/ระบบเป็นคนทำ" และนักศึกษาควรได้รับแจ้ง (นิยามที่เดียว ใช้ทั้ง
// จุดแดงบนการ์ด และรายการแจ้งเตือนของนักศึกษา) — step ที่นักศึกษาทำเอง (submitted, accepted, declined,
// complaint_filed, student_cancelled) ไม่ใส่ เพราะไม่ต้องแจ้งตัวเองให้รู้
const STAFF_STEP_CODES = [
    'reviewing', 'approved', 'appointment', 'appointment_cancelled', 'in_progress', 'completed',
    'cancelled', 'complaint_reviewing', 'complaint_approved', 'complaint_rejected', 'auto_closed',
];
const STAFF_STEP_SQL_LIST = STAFF_STEP_CODES.map((code) => `'${code}'`).join(', '); // ค่าคงที่ในโค้ด ไม่ใช่ input ผู้ใช้

// "YYYY-MM-DD HH:mm:ss" → "5 ตุลาคม 2569 เวลา 15:00 น." สำหรับข้อความที่ backend แต่งให้แอปแสดงตรงๆ
function formatThaiDateTime(sqlDateTime) {
    const [datePart, timePart] = sqlDateTime.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = (timePart || '00:00:00').split(':');
    return `${day} ${THAI_MONTHS[month - 1]} ${year + 543} เวลา ${hour}:${minute} น.`;
}

const THAI_MONTHS = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

// วันนัดแยกเก็บตามรอบ: นัดซ่อมครั้งแรกอยู่ที่ repair_request.appointment_date (ไม่ถูกเขียนทับอีกหลังมีอุทธรณ์ ไว้ทำสถิติ)
// ส่วนนัดแก้ไขอยู่ที่ repair_complaint.appointment_date ของอุทธรณ์ที่อนุมัติล่าสุด — "วันนัดปัจจุบัน" ของเคสจึงเป็นของ
// อุทธรณ์นั้นเมื่อมี (แม้ยังเป็น NULL เพราะยังไม่ได้นัด ห้ามถอยไปใช้นัดเก่าที่ผ่านไปแล้ว) ไม่มีอุทธรณ์อนุมัติจึงใช้นัดซ่อม
// นิยามที่เดียวให้ทุก query ใช้ร่วมกัน (ต้องเรียกใน query ที่ตั้งชื่อตาราง repair_request ว่า rr)
const LATEST_APPROVED_COMPLAINT_SQL =
    "(SELECT MAX(ac.complaint_id) FROM repair_complaint ac WHERE ac.request_id = rr.request_id AND ac.decision = 'approved')";
const CURRENT_APPOINTMENT_SQL =
    "IF(" + LATEST_APPROVED_COMPLAINT_SQL + " IS NULL, rr.appointment_date, " +
    "(SELECT ca.appointment_date FROM repair_complaint ca WHERE ca.complaint_id = " + LATEST_APPROVED_COMPLAINT_SQL + "))";

// เขียนวันนัดปัจจุบันลงที่ของรอบนั้น (ดูคำอธิบายด้านบน) — ทุกจุดที่ตั้ง/เลื่อน/ยกเลิกนัดต้องผ่านฟังก์ชันนี้ ไม่เขียนตรงๆ
async function writeCurrentAppointment(conn, requestId, appointmentDate) {
    const rows = await conn.query(
        "SELECT MAX(complaint_id) AS complaint_id FROM repair_complaint WHERE request_id = ? AND decision = 'approved'",
        [requestId]
    );
    const latestApprovedId = rows[0] ? rows[0].complaint_id : null;
    if (latestApprovedId) {
        await conn.query("UPDATE repair_complaint SET appointment_date = ? WHERE complaint_id = ?", [appointmentDate, latestApprovedId]);
    } else {
        await conn.query("UPDATE repair_request SET appointment_date = ? WHERE request_id = ?", [appointmentDate, requestId]);
    }
}

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
        "SELECT COUNT(*) AS total FROM repair_request rr " +
        "WHERE DATE(" + CURRENT_APPOINTMENT_SQL + ") = ? AND HOUR(" + CURRENT_APPOINTMENT_SQL + ") BETWEEN ? AND ? " +
        "AND rr.progress_status_id != 4 AND rr.request_id != ?",
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

    await writeCurrentAppointment(conn, requestId, appointmentDate);
    // ข้อความฝั่งนักศึกษาตั้งใจไม่บอกว่าเป็นการจัดคิวอัตโนมัติ (ไม่ใช่เจ้าหน้าที่นัดเองทีละเคส) เพื่อให้
    // ความรู้สึกเหมือนมีเจ้าหน้าที่ดูแลจัดการให้จริงๆ — ฝั่ง Flutter (repair_timeline.dart) ตรวจจับข้อความ
    // นี้ด้วย .startsWith() ตัวเดียวกัน เพื่อตัดสินใจว่าจะโชว์หมายเหตุ "เลื่อนนัดได้ถ้าไม่สะดวก" เพิ่มไหม
    // (เปลี่ยนข้อความนี้ต้องไปแก้ string ที่ repair_timeline.dart ให้ตรงกันด้วย)
    await repairTimeline.insertTimelineStep(
        conn, requestId, 'appointment',
        `เจ้าหน้าที่นัดหมายวันซ่อมให้คุณแล้ว ${formatAppointmentThai(appointmentDate)}`
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

// Date → "YYYY-MM-DD" ตามเวลาเครื่อง (ดูเหตุผลที่ getSlotAvailability)
function formatLocalDate(date) {
    return date.getFullYear() + '-' +
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0');
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
        // ใช้วันที่ตามเวลาเครื่อง ไม่ใช่ toISOString (UTC) เพราะ new Date('YYYY-MM-DDT00:00:00') เป็นเที่ยงคืนเวลาท้องถิ่น
        // พอแปลงเป็น UTC ในไทย (UTC+7) จะถอยไปเป็นวันก่อนหน้า ทำให้คีย์วันของปฏิทินเลื่อนไป 1 วัน
        const endDateStr = formatLocalDate(endDate);

        const rows = await conn.query(
            "SELECT " +
            "  rr.request_id, " +
            "  rr.case_code, " +
            "  DATE_FORMAT(" + CURRENT_APPOINTMENT_SQL + ", '%Y-%m-%d') AS booking_date, " +
            "  HOUR(" + CURRENT_APPOINTMENT_SQL + ") AS booking_hour, " +
            "  GROUP_CONCAT(DISTINCT rt.repair_type_name SEPARATOR ', ') AS type_names, " +
            "  EXISTS(SELECT 1 FROM repair_complaint rc WHERE rc.request_id = rr.request_id AND rc.decision = 'approved') AS is_revision " +
            "FROM repair_request rr " +
            "LEFT JOIN repair_request_detail rrd ON rr.request_id = rrd.request_id " +
            "LEFT JOIN repair_type rt ON rrd.repair_type_id = rt.repair_type_id " +
            "WHERE " + CURRENT_APPOINTMENT_SQL + " IS NOT NULL " +
            "AND DATE(" + CURRENT_APPOINTMENT_SQL + ") BETWEEN ? AND ? " +
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
            const dateStr = formatLocalDate(d);
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
          // รูปโปรไฟล์นักศึกษา ส่งให้เฉพาะเคสที่แจ้งด้วย "ข้อมูลเดิม" ของโปรไฟล์: ชื่อ+เบอร์+ห้องที่บันทึกในเคสต้อง
          // ตรงกับข้อมูลโปรไฟล์ทั้งสามค่า (ถ้านักศึกษากรอกข้อมูลใหม่ ผู้ติดต่ออาจไม่ใช่เจ้าของรูป จึงไม่ส่ง = NULL)
          // ระบบไม่ได้เก็บแฟลกว่าเลือกโหมดไหนตอนแจ้ง (ไม่แก้ schema) จึงใช้การเทียบค่า — ถ้านักศึกษาแก้โปรไฟล์ภายหลัง
          // เคสเก่าที่ค่าไม่ตรงแล้วจะไม่มีรูป; เบอร์ตัด '-' และช่องว่างก่อนเทียบเพราะเคสเก่าเก็บแบบมีขีด
          // ใช้ subquery แทน JOIN เพื่อไม่ต้องแตะ GROUP BY ด้านล่าง
          "  (SELECT sp.profile_image FROM student st JOIN person sp ON sp.person_id = st.person_id " +
          "   WHERE st.student_id = rr.student_id " +
          "   AND rr.contact_name = CONCAT(sp.firstname, ' ', sp.lastname) " +
          "   AND REPLACE(REPLACE(rr.contact_phone, '-', ''), ' ', '') = sp.phone " +
          "   AND rr.target_room = st.room_number) AS student_profile_image, " +
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
          "  DATE_FORMAT(" + CURRENT_APPOINTMENT_SQL + ", '%Y-%m-%d %H:%i:%s') AS appointment_date, " +
          "  DATE_FORMAT(rr.report_date, '%Y-%m-%d %H:%i:%s') AS report_date, " +
          "  rr.max_complaints, " +
          // ฟิลด์สำหรับมอนิเตอร์เจ้าหน้าที่ — flag ทั้งหมดคำนวณที่ DB ด้วย NOW()/CURDATE() (ไม่คำนวณที่ client
          // กันเวลาเครื่องเจ้าหน้าที่เพี้ยน) ทุก slot นัดยาว 2 ชม. จึงนับว่า "ผ่านนัดแล้ว" เมื่อเลยเวลาเริ่ม+2 ชม.
          // และทุก flag ผูกกับสถานะ (2/5 = กำลังซ่อม, 3 = รอนักศึกษายืนยัน) เสมอ ไม่ดูแค่วันที่อย่างเดียว
          "  DATE_FORMAT(rr.finish_date, '%Y-%m-%d %H:%i:%s') AS finish_date, " +
          "  DATE_FORMAT(rr.rushed_at, '%Y-%m-%d %H:%i:%s') AS rushed_at, " +
          "  (rr.progress_status_id IN (2, 5) AND DATE(" + CURRENT_APPOINTMENT_SQL + ") = CURDATE()) AS is_due_today, " +
          "  (rr.progress_status_id IN (2, 5) AND " + CURRENT_APPOINTMENT_SQL + " + INTERVAL 2 HOUR < NOW()) AS is_overdue, " +
          "  (rr.progress_status_id = 3 AND rr.finish_date + INTERVAL ? DAY < NOW()) AS is_stale_unconfirmed, " +
          "  IF(rr.progress_status_id = 3, DATE_FORMAT(rr.finish_date + INTERVAL ? DAY, '%Y-%m-%d %H:%i:%s'), NULL) AS auto_close_at, " +
          // จำนวนแจ้งเตือนที่เจ้าหน้าที่ยังไม่อ่านของเคสนี้ (read-state ร่วมกันทุกคน ตามที่ตัดสินใจไว้) ใช้ทำป้าย
          // "มีอัปเดตใหม่จากนักศึกษา" บนการ์ด
          "  (SELECT COUNT(*) FROM notification n WHERE n.request_id = rr.request_id AND n.is_read = 0) AS student_unread_count, " +
          // ทุกเรื่อง (ไม่ซ้ำ) ที่ยังไม่ได้อ่านของเคสนี้ คั่นด้วยจุลภาค (event_type ของแจ้งเตือน) — ให้ป้ายบนการ์ดเจ้าหน้าที่
          // แยกบอกทีละหัวข้อว่านักศึกษาทำอะไรบ้าง (แจ้งซ่อมใหม่/ยื่นอุทธรณ์/ขอเร่งงาน ฯลฯ) ลำดับในป้ายหน้าเว็บจัดเรียงเอง
          "  (SELECT GROUP_CONCAT(DISTINCT n2.event_type SEPARATOR ',') FROM notification n2 " +
          "   WHERE n2.request_id = rr.request_id AND n2.is_read = 0) AS unread_event_types, " +
          // ส่วน "งานซ่อมที่ต้องจัดการ" ของหน้าโฮม: ข้อมูลการเร่งงาน — rush_log เก็บทุกครั้งที่กด (rushed_at เก็บแค่ครั้งล่าสุด
          // และถูกล้างเมื่อเจ้าหน้าที่เลื่อนนัด/ส่งงาน) เหตุผลที่แสดงคือของการกดครั้งล่าสุด ธง is_rush_urgent จึงต้อง
          // ผูกกับ rushed_at ที่ยังไม่ถูกล้าง (เจ้าหน้าที่ตอบสนองแล้ว = ป้ายเร่งด่วนหาย) ไม่ใช่ดูแค่ประวัติ
          "  (SELECT COUNT(*) FROM rush_log rl WHERE rl.request_id = rr.request_id) AS rush_count, " +
          "  (SELECT rs.rush_reason_name FROM rush_log rl JOIN rush_reason rs ON rs.rush_reason_id = rl.rush_reason_id " +
          "   WHERE rl.request_id = rr.request_id ORDER BY rl.rushed_at DESC, rl.rush_log_id DESC LIMIT 1) AS rush_reason_name, " +
          "  (SELECT rl.reason_note FROM rush_log rl WHERE rl.request_id = rr.request_id " +
          "   ORDER BY rl.rushed_at DESC, rl.rush_log_id DESC LIMIT 1) AS rush_reason_note, " +
          "  (rr.rushed_at IS NOT NULL AND IFNULL((SELECT rs.is_urgent FROM rush_log rl JOIN rush_reason rs ON rs.rush_reason_id = rl.rush_reason_id " +
          "   WHERE rl.request_id = rr.request_id ORDER BY rl.rushed_at DESC, rl.rush_log_id DESC LIMIT 1), 0) = 1) AS is_rush_urgent, " +
          // คำร้องอุทธรณ์ที่รอตัดสิน (decision = 'pending'): ครั้งที่เท่าไหร่ เหตุผลหมวดไหน ยื่นเมื่อไหร่ (ไว้บอก "รอมา N วัน")
          "  (SELECT COUNT(*) FROM repair_complaint c WHERE c.request_id = rr.request_id) AS complaint_count, " +
          "  (SELECT DATE_FORMAT(c.filed_at, '%Y-%m-%d %H:%i:%s') FROM repair_complaint c WHERE c.request_id = rr.request_id " +
          "   AND c.decision = 'pending' ORDER BY c.filed_at DESC LIMIT 1) AS appeal_filed_at, " +
          "  (SELECT cr.complaint_reason_name FROM repair_complaint c LEFT JOIN complaint_reason cr ON cr.complaint_reason_id = c.complaint_reason_id " +
          "   WHERE c.request_id = rr.request_id AND c.decision = 'pending' ORDER BY c.filed_at DESC LIMIT 1) AS appeal_reason_name, " +
          // หัวข้อย่อยของหน้าจัดการงานซ่อม (คำนวณที่ DB ด้วยเวลา server เหมือนธงอื่น):
          // ยังไม่ได้กรอกข้อมูล = งานซ่อม/แก้ไข (2, 5) ที่ยังไม่มีวันนัดหมายหรือยังไม่เลือกช่าง — ไม่นับ "รายงานซ่อม" และ
          // "เบิกครุภัณฑ์" เพราะรายงานเกิดหลังซ่อมเสร็จเท่านั้น (ก่อนซ่อมไม่มีเลยตามปกติ ถ้านับจะติดธงทุกเคส) ส่วนครุภัณฑ์
          // บางงานไม่ต้องใช้ จึงไม่ใช่ข้อมูลที่ขาดไม่ได้
          "  (rr.progress_status_id IN (2, 5) AND (" + CURRENT_APPOINTMENT_SQL + " IS NULL OR rr.technician_id IS NULL)) AS is_unscheduled, " +
          // กลุ่ม "แจ้งเข้ามา" (สถานะ 1 แจ้งซ่อมใหม่ และสถานะ 7 ยื่นอุทธรณ์): เข้ามาวันนี้ / รอเกิน 1 วันแล้วยังไม่มีใครตัดสิน
          // สถานะ 1 นับจากวันที่แจ้งซ่อม สถานะ 7 นับจากวันที่ยื่นอุทธรณ์ฉบับที่รอตัดสิน (ไม่ใช่วันที่แจ้งซ่อมเดิม ไม่งั้นอุทธรณ์ที่เพิ่งยื่น
          // จะถูกนับว่า "รอเกิน 1 วัน" ทันที) ชื่อฟิลด์คงเดิมเพื่อไม่ต้องแก้ฝั่งหน้าเว็บ
          "  ((rr.progress_status_id = 1 AND DATE(rr.report_date) = CURDATE()) " +
          "   OR (rr.progress_status_id = 7 AND DATE((SELECT MAX(c.filed_at) FROM repair_complaint c " +
          "       WHERE c.request_id = rr.request_id AND c.decision = 'pending')) = CURDATE())) AS is_reported_today, " +
          "  ((rr.progress_status_id = 1 AND rr.report_date + INTERVAL 1 DAY < NOW()) " +
          "   OR (rr.progress_status_id = 7 AND (SELECT MAX(c.filed_at) FROM repair_complaint c " +
          "       WHERE c.request_id = rr.request_id AND c.decision = 'pending') + INTERVAL 1 DAY < NOW())) AS is_waiting_over_day, " +
          // กลุ่ม "ยกเลิก" (สถานะ 4): แยก "นักศึกษายกเลิกเอง" (cancelled_by_moderator_id เป็น NULL ตามที่ cancelRepairRequestByStudent บันทึก)
          // ออกจาก "เจ้าหน้าที่ปฏิเสธ" — เคสสถานะ 4 ที่ไม่มีแถวใน repair_cancellation ถือเป็นเจ้าหน้าที่ปฏิเสธ
          "  (rr.progress_status_id = 4 AND EXISTS (SELECT 1 FROM repair_cancellation rcs " +
          "   WHERE rcs.request_id = rr.request_id AND rcs.cancelled_by_moderator_id IS NULL)) AS is_student_cancelled, " +
          // feedback ของนักศึกษาบนการ์ดงานที่ปิดแล้ว: คะแนน+ข้อความประเมิน (เคสสำเร็จ) และเหตุผลที่ไม่ยอมรับผลซ่อม (เคสไม่สำเร็จ
          // เก็บที่ step_detail ของ timeline 'declined') — ให้เจ้าหน้าที่ไล่ดูได้เร็วโดยไม่ต้องเปิดทีละเคส
          "  (SELECT re.rating FROM repair_evaluation re WHERE re.request_id = rr.request_id LIMIT 1) AS evaluation_rating, " +
          "  (SELECT re.feedback FROM repair_evaluation re WHERE re.request_id = rr.request_id LIMIT 1) AS evaluation_feedback, " +
          "  (SELECT decline_step.step_detail FROM repair_timeline decline_step WHERE decline_step.request_id = rr.request_id " +
          "   AND decline_step.step_code = 'declined' ORDER BY decline_step.timeline_id DESC LIMIT 1) AS decline_reason " +
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
          "  rr.max_complaints, " +
          "  rr.finish_date, " +
          "  rr.rushed_at " +
          "ORDER BY rr.report_date DESC";

            var rows = await conn.query(sql, [STALE_FLAG_AFTER_DAYS, AUTO_CLOSE_AFTER_DAYS]);

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
          "  DATE_FORMAT(" + CURRENT_APPOINTMENT_SQL + ", '%Y-%m-%d %H:%i:%s') AS appointment_date, " +
          "  DATE_FORMAT(rr.finish_date, '%Y-%m-%d %H:%i:%s') AS finish_date, " +
          "  DATE_FORMAT(rr.report_date, '%Y-%m-%d %H:%i:%s') AS report_date, " +
          "  DATE_FORMAT(rr.rushed_at, '%Y-%m-%d %H:%i:%s') AS rushed_at, " +
          // เวลาที่จะปิดอัตโนมัติ (เฉพาะสถานะ 3) ให้แอปนักศึกษาโชว์นับถอยหลังในการ์ดรอยืนยัน
          "  IF(rr.progress_status_id = 3, DATE_FORMAT(rr.finish_date + INTERVAL ? DAY, '%Y-%m-%d %H:%i:%s'), NULL) AS auto_close_at, " +
          // can_rush ต้องตรงกับเงื่อนไขใน rushRepairRequest เป๊ะ (ที่นั่นตรวจซ้ำอีกชั้นภายใต้ FOR UPDATE)
          "  (rr.progress_status_id IN (2, 5) AND " + CURRENT_APPOINTMENT_SQL + " IS NOT NULL " +
          "   AND " + CURRENT_APPOINTMENT_SQL + " + INTERVAL 2 HOUR < NOW() " +
          "   AND (rr.rushed_at IS NULL OR rr.rushed_at < NOW() - INTERVAL ? HOUR)) AS can_rush, " +
          // เวลาที่กดเร่งได้อีกครั้ง — มีค่าเฉพาะตอนยังติด cooldown (ให้แอปบอกนักศึกษาเป็นวัน-เวลาตรงๆ)
          "  IF(rr.rushed_at IS NOT NULL AND rr.rushed_at + INTERVAL ? HOUR > NOW(), " +
          "     DATE_FORMAT(rr.rushed_at + INTERVAL ? HOUR, '%Y-%m-%d %H:%i:%s'), NULL) AS next_rush_at, " +
          // เจ้าหน้าที่ผู้อนุมัติ/ดูแลเคสนี้ (repair_request.moderator_id ตั้งตอนอนุมัติ) — ให้นักศึกษาเห็นชื่อ+เบอร์ที่การ์ดนัดหมาย
          // ติดต่อได้ถูกคน; เคสที่ยังไม่มีผู้อนุมัติได้ NULL (route นี้ตรวจแล้วว่าเป็นเจ้าของเคสหรือเจ้าหน้าที่เท่านั้น)
          "  CONCAT(mp.firstname, ' ', mp.lastname) AS moderator_name, " +
          "  mp.phone AS moderator_phone " +
          "FROM repair_request rr " +
          "LEFT JOIN repair_request_detail rrd ON rr.request_id = rrd.request_id " +
          "LEFT JOIN repair_type rt ON rrd.repair_type_id = rt.repair_type_id " +
          "LEFT JOIN progress_status ps ON rr.progress_status_id = ps.progress_status_id " +
          "LEFT JOIN technician t ON rr.technician_id = t.technician_id " +
          "LEFT JOIN person tp ON t.person_id = tp.person_id " +
          "LEFT JOIN moderator md ON rr.moderator_id = md.moderator_id " +
          "LEFT JOIN person mp ON md.person_id = mp.person_id " +
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
          "  mp.firstname, " +
          "  mp.lastname, " +
          "  mp.phone, " +
          "  rr.appointment_date, " +
          "  rr.finish_date, " +
          "  rr.report_date, " +
          "  rr.rushed_at";

            var rows = await conn.query(sql, [AUTO_CLOSE_AFTER_DAYS, RUSH_COOLDOWN_HOURS, RUSH_COOLDOWN_HOURS, RUSH_COOLDOWN_HOURS, requestId]);

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
          "  DATE_FORMAT(rr.report_date, '%Y-%m-%d %H:%i:%s') AS report_date, " +
          "  DATE_FORMAT(" + CURRENT_APPOINTMENT_SQL + ", '%Y-%m-%d %H:%i:%s') AS appointment_date, " +
          // จุดแดง "มีอัปเดตใหม่": มีเหตุการณ์ฝั่งเจ้าหน้าที่/ระบบใหม่กว่าเวลาที่นักศึกษาเปิดดูเคสนี้ล่าสุด
          "  EXISTS (SELECT 1 FROM repair_timeline tl WHERE tl.request_id = rr.request_id " +
          "          AND tl.step_code IN (" + STAFF_STEP_SQL_LIST + ") " +
          // + ถึงวันนัดซ่อมแล้ว (สถานะ 2/5 วันนัด = วันนี้) และนักศึกษายังไม่ได้เปิดดูเคสตั้งแต่เริ่มวันนี้ → จุดแดงขึ้นครั้งแรกของวัน
          // แล้วหายเมื่อเปิดเคส (mark_seen เลื่อน student_last_seen_at เป็นตอนนี้) ไม่ค้างทั้งวัน
          "          AND tl.event_date > rr.student_last_seen_at) " +
          "  OR (rr.progress_status_id IN (2, 5) AND DATE(" + CURRENT_APPOINTMENT_SQL + ") = CURDATE() " +
          "      AND rr.student_last_seen_at < CURDATE()) AS has_unread, " +
          // หัวข้อย่อย "นัดหมายวันนี้"/"เลท" ของหน้าโฮม — คำนวณที่ DB ด้วยเวลา server (ไม่ใช้เวลาเครื่องนักศึกษา)
          // slot นัดยาว 2 ชม. จึงนับว่า "เลท" เมื่อเลยเวลาเริ่ม + 2 ชม. และผูกกับสถานะ 2/5 เสมอ
          "  (rr.progress_status_id IN (2, 5) AND DATE(" + CURRENT_APPOINTMENT_SQL + ") = CURDATE()) AS is_due_today, " +
          "  (rr.progress_status_id IN (2, 5) AND " + CURRENT_APPOINTMENT_SQL + " + INTERVAL 2 HOUR < NOW()) AS is_overdue, " +
          // เวลาปิดงาน: สำเร็จ/ไม่สำเร็จ(6,8) = finish_date, ยกเลิก(4) = เวลาในตาราง repair_cancellation
          // (ทั้งเจ้าหน้าที่ปฏิเสธและนักศึกษายกเลิกเขียนลงตารางนี้) — ใช้ตัดงานปิดเก่าออกจากหน้าโฮม
          // เคสที่ระบบปิดให้อัตโนมัติไม่เขียนทับ finish_date จึงใช้เวลาของขั้น auto_closed แทน (ไม่งั้นเคสที่เพิ่งถูกปิดจะ
          // ดู "ปิดนานแล้ว" และหายจากหน้าโฮมทันที ก่อนที่นักศึกษาจะทันเห็น)
          "  CASE WHEN rr.progress_status_id IN (6, 8) THEN GREATEST(rr.finish_date, " +
          "         IFNULL((SELECT MAX(tl2.event_date) FROM repair_timeline tl2 WHERE tl2.request_id = rr.request_id AND tl2.step_code = 'auto_closed'), rr.finish_date)) " +
          "       WHEN rr.progress_status_id = 4 THEN (SELECT MAX(rc.cancel_date) FROM repair_cancellation rc WHERE rc.request_id = rr.request_id) " +
          "  END >= NOW() - INTERVAL ? DAY AS is_recently_closed, " +
          // ผลล่าสุดที่เจ้าหน้าที่ตัดสินกับเคสนี้ (อนุมัติ/ปฏิเสธคำร้อง และอนุมัติ/ปฏิเสธคำร้องอุทธรณ์) + เวลา — ใช้ทำส่วน
          // "ผลในการแจ้งซ่อม"/"ผลคำร้องอุทธรณ์" บนหน้าโฮมนักศึกษา; is_decision_recent ตัดสินด้วยเวลา server (ภายใน RECENT_CLOSED_DAYS วัน)
          "  (SELECT tl3.step_code FROM repair_timeline tl3 WHERE tl3.request_id = rr.request_id " +
          "   AND tl3.step_code IN ('approved', 'cancelled', 'complaint_approved', 'complaint_rejected') " +
          "   ORDER BY tl3.event_date DESC, tl3.timeline_id DESC LIMIT 1) AS last_decision_step, " +
          "  (SELECT MAX(tl3.event_date) FROM repair_timeline tl3 WHERE tl3.request_id = rr.request_id " +
          "   AND tl3.step_code IN ('approved', 'cancelled', 'complaint_approved', 'complaint_rejected')) >= NOW() - INTERVAL ? DAY AS is_decision_recent " +
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
          "  rr.report_date, " +
          "  rr.appointment_date, " +
          "  rr.finish_date, " +
          "  rr.student_last_seen_at " +
          "ORDER BY rr.report_date DESC";

            var rows = await conn.query(sql, [RECENT_CLOSED_DAYS, RECENT_CLOSED_DAYS, accountId]);


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
    // รายการแจ้งเตือนของนักศึกษา = เหตุการณ์ฝั่งเจ้าหน้าที่/ระบบใน repair_timeline ของเคสตัวเอง 30 รายการล่าสุด
    // (ไม่มีตารางแจ้งเตือนฝั่งนักศึกษา — ใช้ watermark student_last_seen_at ตัดสินว่ายังไม่ได้ดู เหมือนจุดแดงบนการ์ด)
    // unread_case_count นับจากทุกเหตุการณ์ ไม่ใช่แค่ 30 รายการที่ส่งไป ตัวเลขบนกระดิ่งจึงไม่ตกหล่น
    getStudentNotifications : async (accountId) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            var items = await conn.query(
                "SELECT " +
                "  tl.timeline_id, " +
                "  tl.request_id, " +
                "  rr.case_code, " +
                "  tl.step_code, " +
                "  tl.step_detail, " +
                "  DATE_FORMAT(tl.event_date, '%Y-%m-%d %H:%i:%s') AS event_date, " +
                "  (tl.event_date > rr.student_last_seen_at) AS is_unread " +
                "FROM repair_timeline tl " +
                "JOIN repair_request rr ON rr.request_id = tl.request_id " +
                "WHERE rr.student_id = ? AND tl.step_code IN (" + STAFF_STEP_SQL_LIST + ") " +
                "ORDER BY tl.event_date DESC, tl.timeline_id DESC " +
                "LIMIT 30",
                [accountId]
            );

            var countRows = await conn.query(
                "SELECT COUNT(DISTINCT rr.request_id) AS unread_case_count " +
                "FROM repair_request rr " +
                "WHERE rr.student_id = ? AND EXISTS (" +
                "  SELECT 1 FROM repair_timeline tl WHERE tl.request_id = rr.request_id " +
                "  AND tl.step_code IN (" + STAFF_STEP_SQL_LIST + ") AND tl.event_date > rr.student_last_seen_at)",
                [accountId]
            );

            result = {
                isError: false,
                data: { items: items, unread_case_count: Number(countRows[0].unread_case_count) },
                errorMessage: ""
            };
        } catch (error) {
            result = {
                isError: true,
                data: "",
                errorMessage: "ไม่สามารถดึงรายการแจ้งเตือนได้"
            }
        } finally {
            if (conn)
                conn.release();

            return result;
        }
    },

    // ปุ่ม "อ่านทั้งหมดแล้ว" — ขยับ watermark ของทุกเคสของนักศึกษาคนนี้เป็นตอนนี้ในคำสั่งเดียว
    markAllSeen : async (accountId) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();
            await conn.query("UPDATE repair_request SET student_last_seen_at = NOW() WHERE student_id = ?", [accountId]);
            result = { isError: false, data: "", errorMessage: "" };
        } catch (error) {
            result = { isError: true, data: "", errorMessage: "ไม่สามารถอัปเดตสถานะการอ่านได้" };
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

            // แก้ได้จนกว่าจะอนุมัติ เจ้าหน้าที่อาจเปิดอ่านคำร้องไปแล้ว (แจ้งเตือน new_request ถูกอ่านแล้ว) จึงต้องแจ้งอีกครั้งว่า
            // เนื้อหาเปลี่ยน ไม่งั้นอาจอนุมัติจากข้อมูลเก่า — อยู่ใน transaction เดียวกับการแก้ไข ล้มเหลวพร้อมกัน
            await notification.createNotification(conn, requestId, 'request_edited', `${name} แก้ไขคำร้องแจ้งซ่อม`);

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
                "WHERE rr.request_id = ? AND rr.progress_status_id = 1";

            // ต้องยังเป็น "รอตรวจสอบ" อยู่จริง — ถ้านักศึกษายกเลิกตัดหน้าไปแล้ว (สถานะ 4) จะไม่ถูกทับกลับเป็น 2
            var approveResult = await conn.query(sql, [accountId, requestId]);
            if (approveResult.affectedRows === 0) {
                await conn.rollback();
                result = {
                    isError: true,
                    data: "",
                    errorMessage: "เคสนี้ไม่ได้อยู่ในสถานะรอตรวจสอบแล้ว (อาจถูกยกเลิกหรืออนุมัติไปก่อนหน้านี้)"
                };
                return;
            }

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

            // UPDATE มาก่อน INSERT และต้องยังเป็นสถานะ 1 — ถ้านักศึกษายกเลิกตัดหน้าไปแล้วจะไม่เขียนบันทึก
            // การปฏิเสธซ้ำซ้อนลง repair_cancellation
            var updateSql =
                "UPDATE repair_request " +
                "SET progress_status_id = 4 " +
                "WHERE request_id = ? AND progress_status_id = 1";

            var rejectResult = await conn.query(updateSql, [requestId]);
            if (rejectResult.affectedRows === 0) {
                await conn.rollback();
                result = {
                    isError: true,
                    data: "",
                    errorMessage: "เคสนี้ไม่ได้อยู่ในสถานะรอตรวจสอบแล้ว (อาจถูกยกเลิกหรืออนุมัติไปก่อนหน้านี้)"
                };
                return;
            }

            var insertSql =
                "INSERT INTO repair_cancellation (" +
                "request_id, cancelled_by_moderator_id, cancel_reason" +
                ") VALUES (?, ?, ?)";

            await conn.query(insertSql, [requestId, moderatorId, reason]);

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

            // วันนัดเดิม = วันนัดปัจจุบันของรอบที่เคสอยู่ — เคสรอบแก้ไขที่เพิ่งอนุมัติอุทธรณ์และยังไม่ได้นัดจะได้ NULL
            // จึงนับเป็น "ได้รับวันนัดหมาย" ใหม่ ไม่ใช่ "เลื่อนกำหนดการ" โดยไม่ต้องเดาจาก timeline เหมือนก่อนแยกเก็บวันนัด
            var previousRows = await conn.query(
                "SELECT rr.technician_id, DATE_FORMAT(" + CURRENT_APPOINTMENT_SQL + ", '%Y-%m-%d %H:%i:%s') AS appointment_date " +
                "FROM repair_request rr WHERE rr.request_id = ?",
                [requestId]
            );
            var previous = previousRows[0] || { technician_id: null, appointment_date: null };

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

            await conn.query("UPDATE repair_request SET technician_id = ? WHERE request_id = ?", [technicianId, requestId]);
            await writeCurrentAppointment(conn, requestId, appointmentDate ?? null);

            var normalizedTechnicianId = technicianId ?? null;
            var normalizedAppointmentDate = appointmentDate ?? null;
            var technicianChanged = previous.technician_id !== normalizedTechnicianId;
            var appointmentChanged = previous.appointment_date !== normalizedAppointmentDate;

            // เจ้าหน้าที่เลื่อนนัดแล้ว = ตอบคำเร่งของนักศึกษาแล้ว ต้องล้างธง "ผู้แจ้งเร่งงาน" และเริ่มนับ cooldown ใหม่
            // ล้างเฉพาะเมื่อวันนัดเปลี่ยนจริง — กดบันทึกซ้ำโดยวันเดิม (เช่น แค่เบิกครุภัณฑ์เพิ่ม) ไม่ถือว่าตอบคำเร่ง
            if (appointmentChanged) {
                await conn.query("UPDATE repair_request SET rushed_at = NULL WHERE request_id = ?", [requestId]);
            }

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

            await conn.query("UPDATE repair_request SET technician_id = NULL WHERE request_id = ?", [requestId]);
            await writeCurrentAppointment(conn, requestId, null);

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
                "SET progress_status_id = 3, finish_date = NOW(), rushed_at = NULL " +
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

    // นักศึกษากด "เร่งการจัดการงาน" — ทำได้เมื่อช่วงนัดผ่านไปแล้วและงานยังซ่อมอยู่ (สถานะ 2/5) และกดซ้ำได้หลัง
    // RUSH_COOLDOWN_HOURS ชม. ตรวจทุกเงื่อนไขซ้ำที่นี่ภายใต้ FOR UPDATE (ไม่เชื่อ can_rush ที่แอปเห็น) กันกดรัว/
    // ชนกัน — ผลสำเร็จคืน next_rush_at + ข้อความไทย "กดได้อีกครั้งเมื่อไหร่" ที่คำนวณจาก rushed_at ที่เพิ่งบันทึก
    // เหตุผลมาจากตาราง rush_reason (dropdown ฝั่งแอป) บันทึกทุกครั้งที่กดลง rush_log เพื่อทำสถิติ — ส่วน
    // repair_request.rushed_at ยังเก็บแค่ครั้งล่าสุดไว้ใช้ cooldown เหมือนเดิม; เหตุผลขึ้นต้น "อื่นๆ" ต้องมีข้อความระบุเพิ่ม
    rushRepairRequest: async (requestId, reasonId, reasonNote) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();

            var caseRows = await conn.query(
                "SELECT rr.progress_status_id, rr.contact_name, " +
                "  (" + CURRENT_APPOINTMENT_SQL + " IS NOT NULL AND " + CURRENT_APPOINTMENT_SQL + " + INTERVAL 2 HOUR < NOW()) AS slot_passed, " +
                "  (rr.rushed_at IS NOT NULL AND rr.rushed_at + INTERVAL ? HOUR > NOW()) AS in_cooldown, " +
                "  DATE_FORMAT(rr.rushed_at + INTERVAL ? HOUR, '%Y-%m-%d %H:%i:%s') AS cooldown_until " +
                "FROM repair_request rr WHERE rr.request_id = ? FOR UPDATE",
                [RUSH_COOLDOWN_HOURS, RUSH_COOLDOWN_HOURS, requestId]
            );
            var caseRow = caseRows[0];

            var rejectReason = null;
            if (!caseRow) {
                rejectReason = "ไม่พบเคสนี้";
            } else if (caseRow.progress_status_id !== 2 && caseRow.progress_status_id !== 5) {
                rejectReason = "เคสนี้ไม่ได้อยู่ระหว่างซ่อม จึงเร่งงานไม่ได้";
            } else if (!caseRow.slot_passed) {
                rejectReason = "ยังไม่เลยช่วงเวลานัดหมาย จึงยังเร่งงานไม่ได้";
            } else if (caseRow.in_cooldown) {
                rejectReason = `คุณเพิ่งเร่งงานไปแล้ว กดเร่งได้อีกครั้งวันที่ ${formatThaiDateTime(caseRow.cooldown_until)}`;
            }

            var reasonRows = await conn.query(
                "SELECT rush_reason_name, is_urgent FROM rush_reason WHERE rush_reason_id = ?",
                [reasonId]
            );
            var reasonRow = reasonRows[0];
            if (!rejectReason) {
                if (!reasonRow) {
                    rejectReason = "เหตุผลที่เลือกไม่ถูกต้อง";
                } else if (reasonRow.rush_reason_name.startsWith('อื่นๆ') && !reasonNote) {
                    rejectReason = "กรุณาระบุเหตุผลเพิ่มเติม";
                }
            }

            if (rejectReason) {
                await conn.rollback();
                result = { isError: true, data: "", errorMessage: rejectReason };
                return;
            }

            await conn.query("UPDATE repair_request SET rushed_at = NOW() WHERE request_id = ?", [requestId]);
            await conn.query(
                "INSERT INTO rush_log (request_id, rush_reason_id, reason_note) VALUES (?, ?, ?)",
                [requestId, reasonId, reasonNote || null]
            );

            var rushedRows = await conn.query(
                "SELECT DATE_FORMAT(rushed_at, '%Y-%m-%d %H:%i:%s') AS rushed_at, " +
                "  DATE_FORMAT(rushed_at + INTERVAL ? HOUR, '%Y-%m-%d %H:%i:%s') AS next_rush_at " +
                "FROM repair_request WHERE request_id = ?",
                [RUSH_COOLDOWN_HOURS, requestId]
            );

            // เหตุผลที่ติดธง is_urgent ขึ้นต้นข้อความด้วย [เร่งด่วน] ให้เด่นในกระดิ่งเจ้าหน้าที่ (notification ไม่มีคอลัมน์ธง)
            var noteSuffix = reasonNote ? ` – ${reasonNote}` : '';
            var urgentPrefix = reasonRow.is_urgent ? '[เร่งด่วน] ' : '';
            await notification.createNotification(
                conn, requestId, 'rush_requested',
                `${urgentPrefix}${caseRow.contact_name} ขอให้เร่งการจัดการงาน (${reasonRow.rush_reason_name}${noteSuffix})`.slice(0, 255)
            );

            await conn.commit();

            result = {
                isError: false,
                data: {
                    rushed_at: rushedRows[0].rushed_at,
                    next_rush_at: rushedRows[0].next_rush_at,
                    message: `ส่งคำขอเร่งงานแล้ว คุณจะกดเร่งได้อีกครั้งวันที่ ${formatThaiDateTime(rushedRows[0].next_rush_at)}`
                },
                errorMessage: ""
            };
        } catch (error) {
            if (conn) {
                await conn.rollback();
            }

            result = { isError: true, data: "", errorMessage: error.message };
        } finally {
            if (conn)
                conn.release();

            return result;
        }
    },

    // นักศึกษาเปิดดูเคส → บันทึกเวลาล่าสุดที่เปิดดู (watermark ของจุดแดง "มีอัปเดตใหม่") เหตุการณ์ฝั่งเจ้าหน้าที่
    // ที่เกิดหลังเวลานี้ = ยังไม่ได้ดู — แค่ UPDATE เดียว ไม่ต้อง transaction (ความเป็นเจ้าของเคสตรวจที่ route แล้ว)
    markSeen: async (requestId) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();
            await conn.query("UPDATE repair_request SET student_last_seen_at = NOW() WHERE request_id = ?", [requestId]);
            result = { isError: false, data: "", errorMessage: "" };
        } catch (error) {
            result = { isError: true, data: "", errorMessage: error.message };
        } finally {
            if (conn)
                conn.release();

            return result;
        }
    },

    // นักศึกษายกเลิกคำร้องเอง — ทำได้ตั้งแต่แจ้งจนถึง "ก่อนเจ้าหน้าที่อนุมัติ" (สถานะ 1 เท่านั้น) หลังอนุมัติแล้ว
    // ยกเลิกไม่ได้ ปิดเป็นสถานะ 4 เดิม + timeline step 'student_cancelled' (แยกจาก 'cancelled' ที่เจ้าหน้าที่ปฏิเสธ)
    // ล็อกแถว FOR UPDATE ก่อนตรวจสถานะ กันชนกับเจ้าหน้าที่ที่กดอนุมัติพร้อมกัน
    cancelRepairRequestByStudent: async (requestId, reason) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();

            var caseRows = await conn.query(
                "SELECT progress_status_id, contact_name FROM repair_request WHERE request_id = ? FOR UPDATE",
                [requestId]
            );

            if (!caseRows[0]) {
                await conn.rollback();
                result = { isError: true, data: "", errorMessage: "ไม่พบเคสนี้" };
                return;
            }

            if (caseRows[0].progress_status_id !== 1) {
                await conn.rollback();
                result = {
                    isError: true,
                    data: "",
                    errorMessage: "เคสนี้ถูกอนุมัติหรือดำเนินการไปแล้ว ยกเลิกไม่ได้"
                };
                return;
            }

            await conn.query("UPDATE repair_request SET progress_status_id = 4 WHERE request_id = ?", [requestId]);

            var cancelReason = reason || 'นักศึกษายกเลิกคำร้องเอง';

            // บันทึกลงตารางยกเลิกเดียวกับที่เจ้าหน้าที่ปฏิเสธใช้ — cancelled_by_moderator_id เป็น NULL = ผู้ยกเลิกคือนักศึกษา
            // (คอลัมน์รับ NULL ได้อยู่แล้ว จึงไม่ต้องแก้ schema) cancel_reason เป็น NOT NULL จึงใส่ข้อความ default ให้
            await conn.query(
                "INSERT INTO repair_cancellation (request_id, cancelled_by_moderator_id, cancel_reason) VALUES (?, NULL, ?)",
                [requestId, cancelReason]
            );

            await repairTimeline.insertTimelineStep(conn, requestId, 'student_cancelled', cancelReason);

            await notification.createNotification(
                conn, requestId, 'student_cancelled',
                `${caseRows[0].contact_name} ยกเลิกคำร้องแจ้งซ่อม`
            );

            await conn.commit();

            result = { isError: false, data: "", errorMessage: "" };
        } catch (error) {
            if (conn) {
                await conn.rollback();
            }

            result = { isError: true, data: "", errorMessage: error.message };
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
                "SELECT progress_status_id, contact_name FROM repair_request WHERE request_id = ? FOR UPDATE",
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

    // ปิดงานอัตโนมัติ: เคสสถานะ 3 (รอนักศึกษายืนยัน) ที่ค้างเกิน AUTO_CLOSE_AFTER_DAYS วันนับจาก finish_date → สถานะ 6 "สำเร็จ"
    // แต่ละเคสแยก transaction และ SELECT ... FOR UPDATE ตรวจซ้ำก่อนปิดเสมอ — ถ้านักศึกษากดยอมรับ/ไม่ยอมรับ/ยื่นอุทธรณ์ตัดหน้า
    // ไปแล้ว (สถานะไม่ใช่ 3 แล้ว) จะข้ามเคสนั้นเงียบๆ; รันซ้ำกี่รอบก็ได้ผลเท่าเดิม (ปิดไปแล้วไม่เข้าเงื่อนไขอีก)
    // ไม่เขียนทับ finish_date (ความหมายคือเวลาที่เจ้าหน้าที่ส่งงาน) และเขียนข้อความเหตุผลลง timeline ให้นักศึกษารู้ว่าระบบปิดให้
    autoCloseStaleRequests: async () => {
        let conn;
        let closedCount = 0;

        try {
            conn = await pool.getConnection();

            var candidates = await conn.query(
                "SELECT request_id FROM repair_request " +
                "WHERE progress_status_id = 3 AND finish_date IS NOT NULL AND finish_date + INTERVAL ? DAY < NOW()",
                [AUTO_CLOSE_AFTER_DAYS]
            );

            for (const candidate of candidates) {
                try {
                    await conn.beginTransaction();

                    var rows = await conn.query(
                        "SELECT case_code, contact_name FROM repair_request " +
                        "WHERE request_id = ? AND progress_status_id = 3 AND finish_date + INTERVAL ? DAY < NOW() FOR UPDATE",
                        [candidate.request_id, AUTO_CLOSE_AFTER_DAYS]
                    );

                    if (rows.length === 0) {
                        await conn.rollback();
                        continue;
                    }

                    await conn.query(
                        "UPDATE repair_request SET progress_status_id = 6 WHERE request_id = ?",
                        [candidate.request_id]
                    );
                    await repairTimeline.insertTimelineStep(
                        conn, candidate.request_id, 'auto_closed',
                        `ปิดงานอัตโนมัติ เนื่องจากไม่ได้ยืนยันผลภายใน ${AUTO_CLOSE_AFTER_DAYS} วัน`
                    );
                    await notification.createNotification(
                        conn, candidate.request_id, 'auto_closed',
                        `เคส ${rows[0].case_code} ถูกปิดอัตโนมัติ เพราะ ${rows[0].contact_name} ไม่ได้ยืนยันผลภายใน ${AUTO_CLOSE_AFTER_DAYS} วัน`
                    );

                    await conn.commit();
                    closedCount++;
                } catch (caseError) {
                    // เคสเดียวล้มเหลวต้องไม่ทำให้เคสที่เหลือค้าง — ย้อนเฉพาะเคสนั้นแล้วไปต่อ รอบหน้า (1 ชม.) จะลองใหม่
                    await conn.rollback();
                }
            }
        } catch (error) {
            // เชื่อมต่อ/คิวรีรายการล้มเหลว — คืนค่าเท่าที่ปิดได้ ไม่โยน error ให้ตัวรันตามเวลาล้ม
        } finally {
            if (conn)
                conn.release();
        }

        return closedCount;
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