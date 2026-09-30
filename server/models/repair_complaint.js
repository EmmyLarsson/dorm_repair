const pool = require('../libs/db_pool');
const repairTimeline = require('./repair_timeline');
const { autoScheduleIfAllowed } = require('./repair_request');
const notification = require('./notification');

// สถานะ progress_status ที่เกี่ยวข้อง (id จริงยืนยันจากผู้ใช้แล้วหลัง reset AUTO_INCREMENT)
const STATUS_AWAITING_CONFIRMATION = 3;  // "เสร็จสิ้น" — ใช้ id เดิม แค่เปลี่ยนความหมายเป็นรอนักศึกษายืนยัน
const STATUS_UNDER_REVISION = 5;         // "รอแก้ไข"
const STATUS_SUCCESS = 6;                // "สำเร็จ" — จุดจบจริง
const STATUS_CANCELLED = 4;              // "ถูกปฏิเสธ/ยกเลิก" — ปิดเคสแล้วเช่นกัน
const STATUS_REPAIR_FAILED = 8;          // "ซ่อมไม่สำเร็จ" — นักศึกษาไม่ยอมรับผลซ่อมหลังยื่นคำร้องครบสิทธิ์ (repair_request.declineRepairCompletion)
// เดิมตอนยื่นคำร้องไม่เปลี่ยน progress_status_id เลย (ค้างที่ 3) แล้วใช้ flag hasPendingComplaint
// (คำนวณสดจาก EXISTS บนตารางนี้) แยกสถานะ "รอนักศึกษายืนยัน" ออกจาก "มีคำร้องค้าง" แทน — ผู้ใช้ต้องการ
// ให้เป็นสถานะจริงในฐานข้อมูลแทน จึงเพิ่ม id 7 นี้ขึ้นมาให้ยื่นคำร้องแล้ว "ย้าย" สถานะจริงๆ
const STATUS_PENDING_COMPLAINT_REVIEW = 7; // "รอตรวจสอบคำร้อง"

// จำนวนครั้งที่ยื่นอุทธรณ์ได้เป็นของ "แต่ละเคส" (คอลัมน์ repair_request.max_complaints ค่าเริ่มต้น 2 เจ้าหน้าที่
// ปรับรายเคสได้ 1-5) เดิมเป็นค่าคงที่ 2 ทั้งระบบ — คืน null ถ้าไม่พบเคส
async function getCaseMaxComplaints(conn, requestId) {
    const rows = await conn.query("SELECT max_complaints FROM repair_request WHERE request_id = ?", [requestId]);
    return rows.length === 0 ? null : Number(rows[0].max_complaints);
}

module.exports = {
    getByRequestId: async (requestId) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            var complaintRows = await conn.query(
                "SELECT " +
                "  c.complaint_id, " +
                "  c.complaint_text, " +
                "  c.complaint_reason_id, " +
                "  cr.complaint_reason_name, " +
                "  c.allow_entry, " +
                "  c.decision, " +
                "  DATE_FORMAT(c.filed_at, '%Y-%m-%d %H:%i:%s') AS filed_at, " +
                "  DATE_FORMAT(c.decided_at, '%Y-%m-%d %H:%i:%s') AS decided_at, " +
                "  DATE_FORMAT(c.edited_at, '%Y-%m-%d %H:%i:%s') AS edited_at " +
                "FROM repair_complaint c " +
                // LEFT JOIN เพราะเคสเก่าก่อนมีฟีเจอร์นี้ complaint_reason_id เป็น NULL
                "LEFT JOIN complaint_reason cr ON cr.complaint_reason_id = c.complaint_reason_id " +
                "WHERE c.request_id = ? " +
                "ORDER BY c.complaint_id ASC",
                [requestId]
            );

            for (const complaint of complaintRows) {
                var photoRows = await conn.query(
                    "SELECT " +
                    "  complaint_photo_id, " +
                    "  photo_url, " +
                    "  DATE_FORMAT(uploaded_at, '%Y-%m-%d %H:%i:%s') AS uploaded_at " +
                    "FROM repair_complaint_photo " +
                    "WHERE complaint_id = ? " +
                    "ORDER BY complaint_photo_id ASC",
                    [complaint.complaint_id]
                );
                complaint.photos = photoRows;
            }

            result = {
                isError: false,
                data: complaintRows,
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

    // นักศึกษายื่นคำร้องแจ้งแก้ไขงานซ่อม — ย้ายสถานะเคสเป็น "รอตรวจสอบคำร้อง"(7) จริงๆ (เดิมค้างที่ 3
    // แล้วพึ่ง flag hasPendingComplaint แยกแทน) ให้ moderator เห็นและตัดสินใจ (อนุมัติ/ปฏิเสธ) ทีหลัง
    createComplaint: async (requestId, complaintText, complaintReasonId, allowEntry, photoUrls) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();

            var maxComplaints = await getCaseMaxComplaints(conn, requestId);
            if (maxComplaints === null) {
                await conn.rollback();
                result = { isError: true, data: "", errorMessage: "ไม่พบเคสนี้" };
                return;
            }

            // ตรวจว่า id หมวดหมู่เหตุผลมีอยู่จริงในตาราง complaint_reason (route ตรวจแค่ว่าเป็นเลขจำนวนเต็มบวก
            // เท่านั้น ความถูกต้องจริงตรวจที่นี่ — ไม่ต้องดึงชื่อมาด้วย เพราะไม่ได้ใช้ที่นี่ ฝั่งแสดงผล
            // (Flutter/React) จะ join เอาชื่อจากตารางนี้ตรงๆ ตอนดึงรายการคำร้องแทน)
            var reasonRows = await conn.query(
                "SELECT complaint_reason_id FROM complaint_reason WHERE complaint_reason_id = ?",
                [complaintReasonId]
            );
            if (reasonRows.length === 0) {
                await conn.rollback();
                result = { isError: true, data: "", errorMessage: "หมวดหมู่เหตุผลไม่ถูกต้อง" };
                return;
            }

            var countRows = await conn.query(
                "SELECT COUNT(*) AS total FROM repair_complaint WHERE request_id = ?",
                [requestId]
            );

            if (Number(countRows[0].total) >= maxComplaints) {
                await conn.rollback();
                result = {
                    isError: true,
                    data: "",
                    errorMessage: `ยื่นคำร้องได้สูงสุด ${maxComplaints} ครั้งต่อเคส`
                };
                return;
            }

            var insertComplaintSql =
                "INSERT INTO repair_complaint (request_id, complaint_text, complaint_reason_id, allow_entry) VALUES (?, ?, ?, ?)";
            var insertResult = await conn.query(insertComplaintSql, [requestId, complaintText, complaintReasonId, allowEntry]);
            // insertId ของ mariadb เป็น BigInt — ต้องแปลงเป็น Number ก่อนส่งกลับ ไม่งั้น res.json แปลงเป็น JSON
            // ไม่ได้ (เกิด error หลัง commit แล้ว เซิร์ฟเวอร์เลยไม่ตอบกลับ แอปฝั่งนักศึกษาค้างรอตลอด)
            var complaintId = Number(insertResult.insertId);

            var insertPhotoSql = "INSERT INTO repair_complaint_photo (complaint_id, photo_url) VALUES (?, ?)";
            for (const photoUrl of photoUrls) {
                await conn.query(insertPhotoSql, [complaintId, photoUrl]);
            }

            await conn.query(
                "UPDATE repair_request SET progress_status_id = ? WHERE request_id = ?",
                [STATUS_PENDING_COMPLAINT_REVIEW, requestId]
            );

            await repairTimeline.insertTimelineStep(
                conn, requestId, 'complaint_filed',
                complaintText.length > 200 ? complaintText.slice(0, 200) + '...' : complaintText
            );

            // เอาชื่อผู้ติดต่อของเคสมาใส่ในข้อความแจ้งเตือน (คอลัมน์เดิมของ repair_request ไม่ต้องส่งเป็นพารามิเตอร์
            // เพิ่มเข้าฟังก์ชันนี้ เพราะดึงเองในนี้ได้เลย)
            var contactRows = await conn.query(
                "SELECT contact_name FROM repair_request WHERE request_id = ?",
                [requestId]
            );
            await notification.createNotification(
                conn, requestId, 'appeal_filed',
                `${contactRows[0].contact_name} ยื่นคำร้องอุทธรณ์`
            );

            await conn.commit();

            result = {
                isError: false,
                data: { complaintId },
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

    // เจ้าหน้าที่เปิดดูคำร้องที่รอตัดสินใจ → บันทึกใน timeline ว่า "กำลังตรวจสอบ" ก่อนอนุมัติ/ปฏิเสธ
    // บันทึกครั้งเดียวต่อคำร้อง 1 ใบ (เช็คว่ามี step complaint_reviewing ใหม่กว่า complaint_filed ล่าสุดหรือยัง)
    // เรียกซ้ำกี่ครั้งก็ไม่เกิดการ์ดซ้ำ — คำร้องรอบใหม่ (filed ใบใหม่) จึงได้การ์ดตรวจสอบของตัวเองอีกใบ
    markReviewing: async (requestId) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            var stateRows = await conn.query(
                "SELECT " +
                "  (SELECT COUNT(*) FROM repair_complaint WHERE request_id = ? AND decision = 'pending') AS pending_count, " +
                "  (SELECT MAX(timeline_id) FROM repair_timeline WHERE request_id = ? AND step_code = 'complaint_filed') AS last_filed_id, " +
                "  (SELECT MAX(timeline_id) FROM repair_timeline WHERE request_id = ? AND step_code = 'complaint_reviewing') AS last_reviewing_id",
                [requestId, requestId, requestId]
            );
            var state = stateRows[0];
            var alreadyRecorded = state.last_reviewing_id && state.last_reviewing_id > state.last_filed_id;

            if (state.pending_count > 0 && !alreadyRecorded) {
                await repairTimeline.insertTimelineStep(conn, requestId, 'complaint_reviewing', null);
            }

            result = { isError: false, data: "", errorMessage: "" };
        } catch (error) {
            result = { isError: true, data: "", errorMessage: error.message };
        } finally {
            if (conn)
                conn.release();

            return result;
        }
    },

    // นักศึกษาแก้ไขคำร้องที่ยื่นไปแล้ว — แก้ได้แค่ "1 ครั้ง" ต่อคำร้อง 1 ใบ และแก้ได้เฉพาะตอนที่
    // เจ้าหน้าที่ยังไม่ตัดสินใจ (decision ยังเป็น 'pending') เท่านั้น กันแก้ย้อนหลังหลังเจ้าหน้าที่อ่าน/
    // ตัดสินใจไปแล้ว ซึ่งจะทำให้ข้อมูลที่เจ้าหน้าที่ใช้ตัดสินใจไม่ตรงกับของจริงที่เหลืออยู่
    editComplaint: async (complaintId, requestId, complaintText, complaintReasonId, allowEntry, photoUrls) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();

            var rows = await conn.query(
                "SELECT decision, edited_at FROM repair_complaint WHERE complaint_id = ? AND request_id = ?",
                [complaintId, requestId]
            );

            if (rows.length === 0) {
                await conn.rollback();
                result = { isError: true, data: "", errorMessage: "ไม่พบคำร้องนี้" };
                return;
            }

            var reasonRows = await conn.query(
                "SELECT complaint_reason_id FROM complaint_reason WHERE complaint_reason_id = ?",
                [complaintReasonId]
            );
            if (reasonRows.length === 0) {
                await conn.rollback();
                result = { isError: true, data: "", errorMessage: "หมวดหมู่เหตุผลไม่ถูกต้อง" };
                return;
            }

            if (rows[0].decision !== 'pending') {
                await conn.rollback();
                result = { isError: true, data: "", errorMessage: "คำร้องนี้ถูกตัดสินใจไปแล้ว แก้ไขไม่ได้" };
                return;
            }

            if (rows[0].edited_at !== null) {
                await conn.rollback();
                result = { isError: true, data: "", errorMessage: "แก้ไขคำร้องนี้ไปแล้ว 1 ครั้ง แก้ซ้ำอีกไม่ได้" };
                return;
            }

            // เจ้าหน้าที่เริ่มตรวจสอบคำร้องแล้ว (มีการ์ด complaint_reviewing ใหม่กว่า complaint_filed ล่าสุด)
            // ห้ามแก้อีก กันข้อความที่เจ้าหน้าที่อ่านไปแล้วไม่ตรงกับของจริงที่ใช้ตัดสินใจ
            var reviewingRows = await conn.query(
                "SELECT " +
                "  (SELECT MAX(timeline_id) FROM repair_timeline WHERE request_id = ? AND step_code = 'complaint_filed') AS last_filed_id, " +
                "  (SELECT MAX(timeline_id) FROM repair_timeline WHERE request_id = ? AND step_code = 'complaint_reviewing') AS last_reviewing_id",
                [requestId, requestId]
            );
            if (reviewingRows[0].last_reviewing_id && reviewingRows[0].last_reviewing_id > reviewingRows[0].last_filed_id) {
                await conn.rollback();
                result = { isError: true, data: "", errorMessage: "เจ้าหน้าที่เริ่มตรวจสอบคำร้องนี้แล้ว แก้ไขไม่ได้" };
                return;
            }

            await conn.query(
                "UPDATE repair_complaint SET complaint_text = ?, complaint_reason_id = ?, allow_entry = ?, edited_at = NOW() WHERE complaint_id = ?",
                [complaintText, complaintReasonId, allowEntry, complaintId]
            );

            await conn.query(
                "DELETE FROM repair_complaint_photo WHERE complaint_id = ?",
                [complaintId]
            );

            var insertPhotoSql = "INSERT INTO repair_complaint_photo (complaint_id, photo_url) VALUES (?, ?)";
            for (const photoUrl of photoUrls) {
                await conn.query(insertPhotoSql, [complaintId, photoUrl]);
            }

            // แก้ไข step_detail ของการ์ด timeline เดิม ไม่ใช่สร้างการ์ดใหม่ — คงหลักเดียวกับตอนแก้ไข
            // รายงานผลซ่อมของเจ้าหน้าที่: ห้าม timeline โชว์ซ้ำ แต่ต้องโชว์ข้อมูลล่าสุดที่แก้ไขแล้ว
            await repairTimeline.updateLatestStepDetail(
                conn, requestId, 'complaint_filed',
                complaintText.length > 200 ? complaintText.slice(0, 200) + '...' : complaintText
            );

            await conn.commit();

            result = { isError: false, data: "", errorMessage: "" };
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

    // moderator ตัดสินใจคำร้อง: อนุมัติ (ไปซ่อมรอบใหม่) หรือ ปฏิเสธ (กลับไปสถานะ 3 ให้นักศึกษาตัดสิน ไม่มีการ
    // ปิดเคสอัตโนมัติ — ผลสุดท้ายมาจาก accept_completion / decline_completion ของนักศึกษา)
    // reason ใช้เฉพาะตอนปฏิเสธ (บังคับกรอกที่ route) เก็บไว้ที่ step_detail ของ timeline 'complaint_rejected'
    // เพื่อให้นักศึกษาเห็นเหตุผลในไทม์ไลน์ ไม่ต้องเพิ่มคอลัมน์ใหม่
    decideComplaint: async (complaintId, requestId, decision, reason) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();

            // กันตัดสินซ้ำ/ส่ง id ผิดเคส — ต้องเป็นคำร้องของเคสนี้ และยัง 'pending' อยู่เท่านั้น
            // ดึง allow_entry ของคำร้องใบนี้มาด้วยเลย (ใช้ตอนอนุมัติ ด้านล่าง)
            var pendingRows = await conn.query(
                "SELECT decision, allow_entry FROM repair_complaint WHERE complaint_id = ? AND request_id = ?",
                [complaintId, requestId]
            );
            if (pendingRows.length === 0 || pendingRows[0].decision !== 'pending') {
                await conn.rollback();
                result = { isError: true, data: "", errorMessage: "ไม่พบคำร้องที่รอตัดสินใจของเคสนี้ (อาจถูกตัดสินไปแล้ว)" };
                return;
            }
            var complaintAllowEntry = pendingRows[0].allow_entry;

            await conn.query(
                "UPDATE repair_complaint SET decision = ?, decided_at = NOW() WHERE complaint_id = ?",
                [decision, complaintId]
            );

            var appointmentDate = null;

            if (decision === 'approved') {
                await conn.query(
                    "UPDATE repair_request SET progress_status_id = ? WHERE request_id = ?",
                    [STATUS_UNDER_REVISION, requestId]
                );

                // เคสเก่าก่อนมีฟีเจอร์นี้ allow_entry เป็น NULL — ถือว่าอนุญาต (พฤติกรรมเดิมก่อนมีฟีเจอร์นี้)
                // ถ้าไม่อนุญาตจริง (0) ต้องบอกนักศึกษาว่าติดต่อใคร เพราะ autoScheduleIfAllowed จะไม่จัดคิวให้เอง
                var approvedDetail = null;
                if (complaintAllowEntry === 0) {
                    var contactRows = await conn.query(
                        "SELECT p.firstname, p.lastname, p.phone " +
                        "FROM repair_request rr " +
                        "JOIN moderator m ON m.moderator_id = rr.moderator_id " +
                        "JOIN person p ON p.person_id = m.person_id " +
                        "WHERE rr.request_id = ?",
                        [requestId]
                    );
                    if (contactRows[0]) {
                        approvedDetail =
                            `คุณไม่อนุญาตให้ช่างเข้าห้อง กรุณาติดต่อเจ้าหน้าที่ ${contactRows[0].firstname} ${contactRows[0].lastname} ` +
                            `เบอร์ ${contactRows[0].phone} เพื่อนัดหมายวันที่สะดวก`;
                    }
                }

                await repairTimeline.insertTimelineStep(conn, requestId, 'complaint_approved', approvedDetail);
                // ต่อจาก step อนุมัติคำร้อง เพื่อให้รอบแก้ไขมีนัดของตัวเองแยกจากนัดรอบแรกใน timeline
                // ส่ง complaintAllowEntry เข้าไปตรงๆ (ไม่ใช่ undefined) เพื่อให้ใช้ค่าของรอบอุทธรณ์นี้
                // แทนที่จะไปอ่าน repair_request.allow_entry ของทั้งเคส (เคสเก่า NULL จะถือว่าอนุญาตเหมือนเดิม)
                appointmentDate = await autoScheduleIfAllowed(conn, requestId, complaintAllowEntry === 0 ? 0 : 1);
            } else {
                // ปฏิเสธคำร้อง = เจ้าหน้าที่เห็นว่างานซ่อมเรียบร้อย ไม่ปิดเคสเอง กลับไปให้นักศึกษาตัดสินเสมอ (สถานะ 3):
                // ยังมีสิทธิ์ยื่นก็ยื่นใหม่ได้ ถ้าใช้สิทธิ์ครบแล้วเหลือ "ยอมรับ" (6) หรือ "ไม่ยอมรับ" (8 ซ่อมไม่สำเร็จ)
                // ผลสุดท้ายเป็นการตัดสินใจของนักศึกษาผ่าน accept_completion / decline_completion
                await conn.query(
                    "UPDATE repair_request SET progress_status_id = ? WHERE request_id = ?",
                    [STATUS_AWAITING_CONFIRMATION, requestId]
                );
                await repairTimeline.insertTimelineStep(conn, requestId, 'complaint_rejected', reason);
            }

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

    // moderator ปรับจำนวนครั้งที่ยื่นอุทธรณ์ได้ของ "เคสนี้" — ช่วง 1-5 ตรวจที่ route แล้ว ที่นี่ตรวจกติกาข้อมูล:
    // เคสต้องยังไม่ปิด และห้ามตั้งต่ำกว่าจำนวนที่นักศึกษายื่นไปแล้ว (ไม่งั้นเคสที่ยื่นเกินสิทธิ์จะค้างผิดสถานะ)
    setMaxComplaints: async (requestId, maxComplaints) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();

            var caseRows = await conn.query(
                "SELECT progress_status_id FROM repair_request WHERE request_id = ? FOR UPDATE",
                [requestId]
            );
            if (caseRows.length === 0) {
                await conn.rollback();
                result = { isError: true, data: "", errorMessage: "ไม่พบเคสนี้" };
                return;
            }

            var statusId = caseRows[0].progress_status_id;
            if (statusId === STATUS_CANCELLED || statusId === STATUS_SUCCESS || statusId === STATUS_REPAIR_FAILED) {
                await conn.rollback();
                result = { isError: true, data: "", errorMessage: "เคสที่ปิดแล้วปรับจำนวนครั้งที่ยื่นอุทธรณ์ไม่ได้" };
                return;
            }

            var filedRows = await conn.query(
                "SELECT COUNT(*) AS total FROM repair_complaint WHERE request_id = ?",
                [requestId]
            );
            var filedTotal = Number(filedRows[0].total);
            if (maxComplaints < filedTotal) {
                await conn.rollback();
                result = {
                    isError: true,
                    data: "",
                    errorMessage: `นักศึกษายื่นคำร้องไปแล้ว ${filedTotal} ครั้ง ตั้งต่ำกว่านี้ไม่ได้`
                };
                return;
            }

            await conn.query(
                "UPDATE repair_request SET max_complaints = ? WHERE request_id = ?",
                [maxComplaints, requestId]
            );

            await conn.commit();

            result = {
                isError: false,
                data: { maxComplaints },
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
    }
}
