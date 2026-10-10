const pool = require('../libs/db_pool');

// ข้อมูลดิบสำหรับหน้ารายงานสรุปของเจ้าหน้าที่ — model นี้มีแค่ query คืนแถวดิบตามกติกาโปรเจกต์ (ไม่จัดรูป response
// ไม่เติมวันที่ว่าง) การจัดรูปเป็น JSON ให้หน้าเว็บอยู่ที่ route ใน server.js
//
// ช่วงเวลา: รับ 7 | 30 | null (null = ทั้งหมด) เท่านั้น ค่าอื่นถือเป็น "ทั้งหมด" ไม่ส่งต่อเข้า SQL ตรงๆ
// กรองที่ report_date ของเคส (วันที่แจ้งซ่อม) ยกเว้นรายการที่ระบุไว้เป็นอย่างอื่นในแต่ละ query
const RANGE_BY_REPORT_DATE = "(? IS NULL OR rr.report_date >= CURDATE() - INTERVAL (? - 1) DAY)";

// นัดหมายทุกใบ แยกชนิด: 'repair' = นัดซ่อม (repair_request.appointment_date) กับ 'revision' = นัดแก้ไขของอุทธรณ์ที่อนุมัติ
// (repair_complaint.appointment_date) — ไม่นับเคสที่ถูกปฏิเสธ/ยกเลิก (สถานะ 4) เพราะนัดนั้นไม่เกิดขึ้นจริง
// ช่วงเวลา 3 ช่วงคิดจากชั่วโมงเหมือน hourToSlotKey ใน repair_request.js (<13 = 09-11, <15 = 13-15, ที่เหลือ = 15-17)
const APPOINTMENTS_SQL =
    "(SELECT rr.appointment_date AS appt, 'repair' AS kind FROM repair_request rr " +
    "  WHERE rr.appointment_date IS NOT NULL AND rr.progress_status_id != 4 " +
    " UNION ALL " +
    " SELECT c.appointment_date AS appt, 'revision' AS kind FROM repair_complaint c " +
    "  JOIN repair_request rr ON rr.request_id = c.request_id " +
    "  WHERE c.decision = 'approved' AND c.appointment_date IS NOT NULL AND rr.progress_status_id != 4) a";

module.exports = {
    getReportSummary: async (rangeDays) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            const days = (rangeDays === 7 || rangeDays === 30) ? rangeDays : null;
            const range = [days, days];
            // กราฟรายวันต้องมีจำนวนวันแน่นอนเสมอ "ทั้งหมด" จึงโชว์ 30 วันล่าสุดแทนทุกวันตั้งแต่เปิดระบบ
            const dailyDays = days ?? 30;

            const today = await conn.query("SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS today");

            // ชื่อสถานะมาจาก progress_status (backend เป็นแหล่งความจริงของชื่อ) LEFT JOIN เพื่อให้สถานะที่ไม่มีเคสได้ 0
            const statusRows = await conn.query(
                "SELECT ps.progress_status_id, ps.progress_status_name, CAST(COUNT(rr.request_id) AS SIGNED) AS total " +
                "FROM progress_status ps " +
                "LEFT JOIN repair_request rr ON rr.progress_status_id = ps.progress_status_id AND " + RANGE_BY_REPORT_DATE + " " +
                "GROUP BY ps.progress_status_id, ps.progress_status_name " +
                "ORDER BY ps.progress_status_id",
                range
            );

            // สถานะ 4 แยกด้วย cancelled_by_moderator_id IS NULL = นักศึกษายกเลิกเอง ที่เหลือคือเจ้าหน้าที่ปฏิเสธ
            const cancelRows = await conn.query(
                "SELECT CAST(COUNT(*) AS SIGNED) AS total_cancelled, " +
                "  CAST(IFNULL(SUM(EXISTS(SELECT 1 FROM repair_cancellation rcs WHERE rcs.request_id = rr.request_id " +
                "    AND rcs.cancelled_by_moderator_id IS NULL)), 0) AS SIGNED) AS student_cancelled " +
                "FROM repair_request rr WHERE rr.progress_status_id = 4 AND " + RANGE_BY_REPORT_DATE,
                range
            );

            // เคสที่เลือกหลายประเภทนับซ้ำทุกประเภท (แถวใน repair_request_detail ต่อประเภท)
            const typeRows = await conn.query(
                "SELECT rt.repair_type_id, rt.repair_type_name, CAST(COUNT(rr.request_id) AS SIGNED) AS total " +
                "FROM repair_type rt " +
                "LEFT JOIN repair_request_detail rrd ON rrd.repair_type_id = rt.repair_type_id " +
                "LEFT JOIN repair_request rr ON rr.request_id = rrd.request_id AND " + RANGE_BY_REPORT_DATE + " " +
                "GROUP BY rt.repair_type_id, rt.repair_type_name " +
                "ORDER BY total DESC, rt.repair_type_id",
                range
            );

            // ผลสุดท้ายของเคสที่จบแล้ว: ยืนยันครั้งแรก (6 ไม่เคยอุทธรณ์) / อุทธรณ์แล้วสำเร็จ (6 เคยอุทธรณ์) / อุทธรณ์แล้วไม่สำเร็จ (8)
            // appeal_pending = ยังอยู่ในขั้นอุทธรณ์/แก้ไข (5, 7 หรือ 3 ที่เคยอุทธรณ์) ไม่นับในแท่งเทียบ แต่ส่งไปแสดงเป็นหมายเหตุ
            const appealRows = await conn.query(
                "SELECT " +
                "  CAST(IFNULL(SUM(rr.progress_status_id = 6 AND IFNULL(c.n, 0) = 0), 0) AS SIGNED) AS first_accepted, " +
                "  CAST(IFNULL(SUM(rr.progress_status_id = 6 AND IFNULL(c.n, 0) > 0), 0) AS SIGNED) AS appeal_succeeded, " +
                "  CAST(IFNULL(SUM(rr.progress_status_id = 8), 0) AS SIGNED) AS appeal_failed, " +
                "  CAST(IFNULL(SUM(rr.progress_status_id IN (5, 7) OR (rr.progress_status_id = 3 AND IFNULL(c.n, 0) > 0)), 0) AS SIGNED) AS appeal_pending " +
                "FROM repair_request rr " +
                "LEFT JOIN (SELECT request_id, COUNT(*) AS n FROM repair_complaint GROUP BY request_id) c ON c.request_id = rr.request_id " +
                "WHERE " + RANGE_BY_REPORT_DATE,
                range
            );

            // เหตุผลที่ไม่พอใจ = หมวดตอนยื่นอุทธรณ์ นับตามวันที่ยื่น (filed_at) เคสเก่าที่ไม่มีหมวดรวมเป็น "ไม่ระบุหมวด"
            const reasonRows = await conn.query(
                "SELECT IFNULL(cr.complaint_reason_name, 'ไม่ระบุหมวด') AS reason_name, CAST(COUNT(*) AS SIGNED) AS total " +
                "FROM repair_complaint c " +
                "LEFT JOIN complaint_reason cr ON cr.complaint_reason_id = c.complaint_reason_id " +
                "WHERE (? IS NULL OR c.filed_at >= CURDATE() - INTERVAL (? - 1) DAY) " +
                "GROUP BY cr.complaint_reason_id, cr.complaint_reason_name " +
                "ORDER BY total DESC",
                range
            );

            // ช่วงเวลานัดหมาย/นัดหมายต่อวัน กรองด้วยวันนัด (ไม่ใช่วันที่แจ้ง) ถึงวันนี้เท่านั้น เป็นสถิติย้อนหลัง
            const slotRows = await conn.query(
                "SELECT CASE WHEN HOUR(a.appt) < 13 THEN '09-11' WHEN HOUR(a.appt) < 15 THEN '13-15' ELSE '15-17' END AS slot_key, " +
                "  CAST(COUNT(*) AS SIGNED) AS total " +
                "FROM " + APPOINTMENTS_SQL + " " +
                "WHERE (? IS NULL OR DATE(a.appt) BETWEEN CURDATE() - INTERVAL (? - 1) DAY AND CURDATE()) " +
                "GROUP BY slot_key",
                range
            );

            const dailyRows = await conn.query(
                "SELECT DATE_FORMAT(a.appt, '%Y-%m-%d') AS day, a.kind, CAST(COUNT(*) AS SIGNED) AS total " +
                "FROM " + APPOINTMENTS_SQL + " " +
                "WHERE DATE(a.appt) BETWEEN CURDATE() - INTERVAL (? - 1) DAY AND CURDATE() " +
                "GROUP BY day, a.kind " +
                "ORDER BY day",
                [dailyDays]
            );

            // ครุภัณฑ์ที่ใช้: ตารางเบิกไม่มีวันที่ จึงกรองด้วยวันที่แจ้งของเคส
            const equipmentRows = await conn.query(
                "SELECT e.equipment_id, e.equipment_name, u.unit_name, et.equipment_type_name, " +
                "  CAST(SUM(rre.quantity_used) AS SIGNED) AS total " +
                "FROM repair_request_equipment rre " +
                "JOIN repair_request rr ON rr.request_id = rre.request_id " +
                "JOIN equipment e ON e.equipment_id = rre.equipment_id " +
                "LEFT JOIN unit u ON u.unit_id = e.unit_id " +
                "LEFT JOIN equipment_type et ON et.equipment_type_id = e.equipment_type_id " +
                "WHERE " + RANGE_BY_REPORT_DATE + " " +
                "GROUP BY e.equipment_id, e.equipment_name, u.unit_name, et.equipment_type_name " +
                "ORDER BY total DESC, e.equipment_name " +
                "LIMIT 5",
                range
            );

            // เคสค้างนาน: ยังไม่ปิด (1, 2, 3, 5, 7) เรียงตามวันที่แจ้งเก่าสุด ไม่ขึ้นกับช่วงที่เลือก (เป็นสถานะปัจจุบัน)
            // ส่งเฉพาะรหัสเคส/ห้อง/ประเภท/สถานะ/จำนวนวัน ไม่มีชื่อนักศึกษาหรือเบอร์ (PDPA)
            const overdueRows = await conn.query(
                "SELECT rr.request_id, rr.case_code, rr.target_room AS room_number, " +
                "  GROUP_CONCAT(DISTINCT rt.repair_type_name SEPARATOR ', ') AS type_names, " +
                "  rr.progress_status_id, ps.progress_status_name, " +
                "  CAST(DATEDIFF(CURDATE(), DATE(rr.report_date)) AS SIGNED) AS days_open " +
                "FROM repair_request rr " +
                "LEFT JOIN repair_request_detail rrd ON rrd.request_id = rr.request_id " +
                "LEFT JOIN repair_type rt ON rt.repair_type_id = rrd.repair_type_id " +
                "LEFT JOIN progress_status ps ON ps.progress_status_id = rr.progress_status_id " +
                "WHERE rr.progress_status_id IN (1, 2, 3, 5, 7) " +
                "GROUP BY rr.request_id, rr.case_code, rr.target_room, rr.progress_status_id, ps.progress_status_name, rr.report_date " +
                "ORDER BY rr.report_date ASC, rr.request_id ASC " +
                "LIMIT 5"
            );

            // การ์ดตัวเลข: แจ้งวันนี้ / แจ้งในช่วง / เวลาเฉลี่ยจากแจ้งถึงอนุมัติครั้งแรก (ชม.) / จากแจ้งถึงส่งงานครั้งแรก (วัน)
            const cardRows = await conn.query(
                "SELECT " +
                "  CAST(IFNULL(SUM(DATE(rr.report_date) = CURDATE()), 0) AS SIGNED) AS reported_today, " +
                "  CAST(COUNT(*) AS SIGNED) AS reported_in_range, " +
                "  ROUND(AVG(TIMESTAMPDIFF(MINUTE, rr.report_date, ap.first_at)) / 60, 1) AS avg_approve_hours, " +
                "  ROUND(AVG(TIMESTAMPDIFF(MINUTE, rr.report_date, cp.first_at)) / 1440, 1) AS avg_repair_days " +
                "FROM repair_request rr " +
                "LEFT JOIN (SELECT request_id, MIN(event_date) AS first_at FROM repair_timeline WHERE step_code = 'approved' GROUP BY request_id) ap " +
                "  ON ap.request_id = rr.request_id " +
                "LEFT JOIN (SELECT request_id, MIN(event_date) AS first_at FROM repair_timeline WHERE step_code = 'completed' GROUP BY request_id) cp " +
                "  ON cp.request_id = rr.request_id " +
                "WHERE " + RANGE_BY_REPORT_DATE,
                range
            );

            // คะแนนเฉลี่ยเฉพาะประเมินที่ให้ดาว (เคสซ่อมไม่สำเร็จไม่ให้ดาว rating เป็น NULL)
            const ratingRows = await conn.query(
                "SELECT ROUND(AVG(re.rating), 2) AS avg_rating, CAST(COUNT(re.rating) AS SIGNED) AS rating_count " +
                "FROM repair_evaluation re " +
                "JOIN repair_request rr ON rr.request_id = re.request_id " +
                "WHERE re.rating IS NOT NULL AND " + RANGE_BY_REPORT_DATE,
                range
            );

            result = {
                isError: false,
                data: {
                    rangeDays: days,
                    dailyDays,
                    today: today[0].today,
                    statusRows,
                    cancel: cancelRows[0],
                    typeRows,
                    appeal: appealRows[0],
                    reasonRows,
                    slotRows,
                    dailyRows,
                    equipmentRows,
                    overdueRows,
                    cards: cardRows[0],
                    rating: ratingRows[0],
                },
                errorMessage: ""
            };
        } catch (error) {
            result = {
                isError: true,
                data: "",
                errorMessage: error.message
            };
        } finally {
            if (conn)
                conn.release();

            return result;
        }
    },
};
