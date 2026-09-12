const pool = require('../libs/db_pool');
const repairTimeline = require('./repair_timeline');

// สถานะ progress_status ที่เกี่ยวข้อง (id จริงยืนยันจากผู้ใช้แล้วหลัง reset AUTO_INCREMENT)
const STATUS_AWAITING_CONFIRMATION = 3; // "เสร็จสิ้น" — ใช้ id เดิม แค่เปลี่ยนความหมายเป็นรอนักศึกษายืนยัน
const STATUS_UNDER_REVISION = 5;        // "รอแก้ไข"
const STATUS_SUCCESS = 6;               // "สำเร็จ" — จุดจบจริง

const MAX_COMPLAINTS_PER_REQUEST = 2;

module.exports = {
    getByRequestId: async (requestId) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            var complaintRows = await conn.query(
                "SELECT " +
                "  complaint_id, " +
                "  complaint_text, " +
                "  decision, " +
                "  DATE_FORMAT(filed_at, '%Y-%m-%d %H:%i:%s') AS filed_at, " +
                "  DATE_FORMAT(decided_at, '%Y-%m-%d %H:%i:%s') AS decided_at " +
                "FROM repair_complaint " +
                "WHERE request_id = ? " +
                "ORDER BY complaint_id ASC",
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

    // นักศึกษายื่นคำร้องแจ้งแก้ไขงานซ่อม — ไม่แตะ progress_status_id เลย (ยังคง "เสร็จสิ้น"(3) เดิม)
    // แค่สร้างคำร้องค้างไว้ให้ moderator เห็นและตัดสินใจ (อนุมัติ/ปฏิเสธ) ทีหลัง
    createComplaint: async (requestId, complaintText, photoUrls) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();

            var countRows = await conn.query(
                "SELECT COUNT(*) AS total FROM repair_complaint WHERE request_id = ?",
                [requestId]
            );

            if (countRows[0].total >= MAX_COMPLAINTS_PER_REQUEST) {
                await conn.rollback();
                result = {
                    isError: true,
                    data: "",
                    errorMessage: `ยื่นคำร้องได้สูงสุด ${MAX_COMPLAINTS_PER_REQUEST} ครั้งต่อเคส`
                };
                return;
            }

            var insertComplaintSql =
                "INSERT INTO repair_complaint (request_id, complaint_text) VALUES (?, ?)";
            var insertResult = await conn.query(insertComplaintSql, [requestId, complaintText]);
            var complaintId = insertResult.insertId;

            var insertPhotoSql = "INSERT INTO repair_complaint_photo (complaint_id, photo_url) VALUES (?, ?)";
            for (const photoUrl of photoUrls) {
                await conn.query(insertPhotoSql, [complaintId, photoUrl]);
            }

            await repairTimeline.insertTimelineStep(
                conn, requestId, 'complaint_filed',
                complaintText.length > 200 ? complaintText.slice(0, 200) + '...' : complaintText
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

    // moderator ตัดสินใจคำร้อง: อนุมัติ (ไปซ่อมรอบใหม่) หรือ ปฏิเสธ (ปฏิเสธครบ 2 ครั้งจะบังคับปิดเคส)
    decideComplaint: async (complaintId, requestId, decision) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();

            await conn.query(
                "UPDATE repair_complaint SET decision = ?, decided_at = NOW() WHERE complaint_id = ?",
                [decision, complaintId]
            );

            if (decision === 'approved') {
                await conn.query(
                    "UPDATE repair_request SET progress_status_id = ? WHERE request_id = ?",
                    [STATUS_UNDER_REVISION, requestId]
                );
                await repairTimeline.insertTimelineStep(conn, requestId, 'complaint_approved', null);
            } else {
                var rejectedRows = await conn.query(
                    "SELECT COUNT(*) AS total FROM repair_complaint WHERE request_id = ? AND decision = 'rejected'",
                    [requestId]
                );
                var rejectedCount = rejectedRows[0].total;

                if (rejectedCount >= MAX_COMPLAINTS_PER_REQUEST) {
                    await conn.query(
                        "UPDATE repair_request SET progress_status_id = ?, finish_date = NOW() WHERE request_id = ?",
                        [STATUS_SUCCESS, requestId]
                    );
                } else {
                    await conn.query(
                        "UPDATE repair_request SET progress_status_id = ? WHERE request_id = ?",
                        [STATUS_AWAITING_CONFIRMATION, requestId]
                    );
                }
                await repairTimeline.insertTimelineStep(conn, requestId, 'complaint_rejected', null);
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
    }
}
