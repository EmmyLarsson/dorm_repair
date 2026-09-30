const pool = require('../libs/db_pool');

// รอบของรายงาน: 0 = "รายงานการซ่อม" (ซ่อมรอบแรก), 1-2 = "รายงานการแก้ไข" ครั้งที่ 1-2 (อุทธรณ์ได้สูงสุด 2 รอบต่อเคส
// ตาม MAX_COMPLAINTS_PER_REQUEST ใน repair_complaint.js) — รอบปัจจุบัน = จำนวนคำร้องที่อนุมัติแล้ว คำนวณที่ backend
// เสมอ ไม่รับจากหน้าจอ / filedCount = จำนวนคำร้องที่ยื่นทั้งหมด: ถ้ามากกว่ารอบปัจจุบัน แปลว่ามีคำร้องที่ยื่นต่อ
// รายงานรอบนี้ไปแล้ว (รอตัดสินหรือถูกปฏิเสธ) รายงานรอบนี้ต้องล็อก แก้ไขไม่ได้อีก
async function getRoundInfo(conn, requestId) {
    const rows = await conn.query(
        "SELECT " +
        "  (SELECT COUNT(*) FROM repair_complaint WHERE request_id = ? AND decision = 'approved') AS current_round, " +
        "  (SELECT COUNT(*) FROM repair_complaint WHERE request_id = ?) AS filed_count",
        [requestId, requestId]
    );
    return { currentRound: Number(rows[0].current_round), filedCount: Number(rows[0].filed_count) };
}

module.exports = {
    // รายงานผลซ่อมแยกตามรายการงานซ่อม (repair_type) ของเคสนี้ — ใช้ทั้งฝั่ง moderator เปิด "จัดการ"
    // และฝั่งนักศึกษาดูผลซ่อม รูปแยก query อีกรอบด้วย completion_item_id (ไม่ใช้ GROUP_CONCAT)
    // ตาม pattern เดียวกับ repair_complaint.getByRequestId
    getByRequestId: async (requestId) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            var itemRows = await conn.query(
                "SELECT " +
                "  ci.completion_item_id, " +
                "  ci.repair_type_id, " +
                "  ci.revision_round, " +
                "  rt.repair_type_name, " +
                "  ci.report_text, " +
                "  DATE_FORMAT(ci.updated_at, '%Y-%m-%d %H:%i:%s') AS updated_at " +
                "FROM repair_completion_item ci " +
                "JOIN repair_type rt ON rt.repair_type_id = ci.repair_type_id " +
                "WHERE ci.request_id = ? " +
                "ORDER BY ci.revision_round ASC, ci.completion_item_id ASC",
                [requestId]
            );

            for (const item of itemRows) {
                var photoRows = await conn.query(
                    "SELECT completion_item_photo_id, photo_url " +
                    "FROM repair_completion_item_photo " +
                    "WHERE completion_item_id = ? " +
                    "ORDER BY completion_item_photo_id ASC",
                    [item.completion_item_id]
                );
                item.photos = photoRows;
            }

            result = {
                isError: false,
                data: itemRows,
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

    // บันทึกรายงาน+รูปของ "1 รายการงานซ่อม" — moderator กด "บันทึก" ทีละการ์ด ไม่ใช่ทั้งเคสในคราวเดียว
    // photoUrls ที่รับมาคือชุดรูปสุดท้ายที่ต้องการเก็บ (รูปเก่าที่เลือกเก็บ + รูปใหม่ที่เพิ่งอัปโหลด)
    // เหมือน pattern ของ repair_request_photo.replacePhotos เดิม
    saveOneItemReport: async (requestId, repairTypeId, reportText, photoUrls) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();

            // เช็คว่า repair_type_id นี้เป็นของเคสนี้จริง กันข้อมูลผิดเคสหลุดเข้ามา
            var detailRows = await conn.query(
                "SELECT 1 FROM repair_request_detail WHERE request_id = ? AND repair_type_id = ?",
                [requestId, repairTypeId]
            );
            if (detailRows.length === 0) {
                await conn.rollback();
                result = {
                    isError: true,
                    data: "",
                    errorMessage: "รายการงานซ่อมนี้ไม่ตรงกับเคสนี้"
                };
                return;
            }

            // เขียนได้เฉพาะรายงาน "รอบปัจจุบัน" — รอบก่อนหน้าจึงถูกล็อกอัตโนมัติ และล็อกรอบปัจจุบันด้วยถ้ามีคำร้อง
            // ยื่นต่อรายงานนี้แล้ว (รอตัดสิน/ถูกปฏิเสธ) หรือนักศึกษายอมรับแล้ว (สถานะ 6)
            var roundInfo = await getRoundInfo(conn, requestId);
            var statusRows = await conn.query(
                "SELECT progress_status_id FROM repair_request WHERE request_id = ?",
                [requestId]
            );
            var statusId = statusRows[0] ? statusRows[0].progress_status_id : null;
            // 6 = สำเร็จ, 8 = ซ่อมไม่สำเร็จ — เคสปิดแล้วทั้งสองแบบ รายงานแก้ไม่ได้อีก
            if (roundInfo.filedCount > roundInfo.currentRound || statusId === 6 || statusId === 8) {
                await conn.rollback();
                result = {
                    isError: true,
                    data: "",
                    errorMessage: "รายงานรอบนี้ถูกล็อกแล้ว (นักศึกษายื่นคำร้องหรือยืนยันผลซ่อมแล้ว) แก้ไขไม่ได้"
                };
                return;
            }
            var revisionRound = roundInfo.currentRound;

            await conn.query(
                "INSERT INTO repair_completion_item (request_id, repair_type_id, revision_round, report_text) " +
                "VALUES (?, ?, ?, ?) " +
                "ON DUPLICATE KEY UPDATE report_text = VALUES(report_text)",
                [requestId, repairTypeId, revisionRound, reportText]
            );

            // insertId ใช้ไม่ได้ชัวร์ตอนเข้าเงื่อนไข ON DUPLICATE KEY UPDATE เลย SELECT กลับมาทีหลังแทน
            var itemRows = await conn.query(
                "SELECT completion_item_id FROM repair_completion_item " +
                "WHERE request_id = ? AND repair_type_id = ? AND revision_round = ?",
                [requestId, repairTypeId, revisionRound]
            );
            var completionItemId = itemRows[0].completion_item_id;

            await conn.query(
                "DELETE FROM repair_completion_item_photo WHERE completion_item_id = ?",
                [completionItemId]
            );

            var insertPhotoSql = "INSERT INTO repair_completion_item_photo (completion_item_id, photo_url) VALUES (?, ?)";
            for (const photoUrl of photoUrls) {
                await conn.query(insertPhotoSql, [completionItemId, photoUrl]);
            }

            await conn.commit();

            result = {
                isError: false,
                data: { completionItemId },
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
