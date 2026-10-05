const pool = require('../libs/db_pool');
const notification = require('./notification');

module.exports = {
    getByRequestId: async (requestId) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            var evaluationRows = await conn.query(
                "SELECT " +
                "  evaluation_id, " +
                "  rating, " +
                "  feedback, " +
                "  DATE_FORMAT(evaluated_at, '%Y-%m-%d %H:%i:%s') AS evaluated_at " +
                "FROM repair_evaluation " +
                "WHERE request_id = ?",
                [requestId]
            );

            if (evaluationRows.length === 0) {
                result = {
                    isError: false,
                    data: null,
                    errorMessage: ""
                };
                return;
            }

            var evaluation = evaluationRows[0];

            var photoRows = await conn.query(
                "SELECT " +
                "  evaluation_photo_id, " +
                "  photo_url, " +
                "  DATE_FORMAT(uploaded_at, '%Y-%m-%d %H:%i:%s') AS uploaded_at " +
                "FROM repair_evaluation_photo " +
                "WHERE evaluation_id = ? " +
                "ORDER BY evaluation_photo_id ASC",
                [evaluation.evaluation_id]
            );

            result = {
                isError: false,
                data: { ...evaluation, photos: photoRows },
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

    // รายการประเมินทั้งหมดของนักศึกษาคนเดียว (หน้า "ประวัติการประเมิน") — กรองด้วย student_id ใน SQL เลย
    // ไม่ดึงทั้งตารางมากรองทีหลัง จึงไม่มีทางเห็นรีวิวของคนอื่น; ส่งแค่จำนวนรูป (ไม่ส่ง URL) เพราะการ์ดในรายการ
    // ไม่แสดงรูป รูปเต็มดึงจาก getByRequestId ตอนเปิดรายละเอียด
    // DISTINCT ใน GROUP_CONCAT: คำร้องหนึ่งมีหลายประเภทงาน JOIN แล้วแถวซ้ำกับ JOIN รูป จึงต้องกันชื่อซ้ำ
    getAllByStudent: async (studentId) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            var rows = await conn.query(
                "SELECT " +
                "  re.evaluation_id, " +
                "  re.request_id, " +
                "  rr.case_code, " +
                "  re.rating, " +
                "  re.feedback, " +
                "  DATE_FORMAT(re.evaluated_at, '%Y-%m-%d %H:%i:%s') AS evaluated_at, " +
                "  DATE_FORMAT(rr.finish_date, '%Y-%m-%d %H:%i:%s') AS finish_date, " +
                "  (SELECT GROUP_CONCAT(DISTINCT rt.repair_type_name SEPARATOR ',') " +
                "     FROM repair_request_detail rrd " +
                "     JOIN repair_type rt ON rrd.repair_type_id = rt.repair_type_id " +
                "     WHERE rrd.request_id = rr.request_id) AS type_names, " +
                "  (SELECT COUNT(*) FROM repair_evaluation_photo rep WHERE rep.evaluation_id = re.evaluation_id) AS photo_count " +
                "FROM repair_evaluation re " +
                "JOIN repair_request rr ON rr.request_id = re.request_id " +
                "WHERE rr.student_id = ? " +
                "ORDER BY re.evaluated_at DESC, re.evaluation_id DESC",
                [studentId]
            );

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

    // 1 คำร้อง : 1 การประเมิน (บังคับด้วย UNIQUE KEY uq_evaluation_request)
    // ถ้าเคยประเมินไว้แล้วให้เรียก updateEvaluation แทน (แก้ไขในที่) ไม่ใช่เรียกซ้ำ
    createEvaluation: async (requestId, rating, feedback, photoUrls) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();

            var insertEvaluationSql =
                "INSERT INTO repair_evaluation (request_id, rating, feedback) VALUES (?, ?, ?)";
            var insertResult = await conn.query(insertEvaluationSql, [requestId, rating, feedback]);
            // insertId ของ mariadb เป็น BigInt — แปลงเป็น Number ก่อนส่งกลับ (เหตุผลเดียวกับ createComplaint)
            var evaluationId = Number(insertResult.insertId);

            var insertPhotoSql = "INSERT INTO repair_evaluation_photo (evaluation_id, photo_url) VALUES (?, ?)";
            for (const photoUrl of photoUrls) {
                await conn.query(insertPhotoSql, [evaluationId, photoUrl]);
            }

            // แจ้งเตือนเฉพาะตอนประเมินครั้งแรก (createEvaluation) ไม่ทำใน updateEvaluation เพราะการแก้ไขซ้ำ
            // ไม่ควรเด้งแจ้งเตือนใหม่ทุกครั้ง (จะรกแผงแจ้งเตือนโดยไม่จำเป็น)
            var contactRows = await conn.query(
                "SELECT contact_name FROM repair_request WHERE request_id = ?",
                [requestId]
            );
            await notification.createNotification(
                conn, requestId, 'evaluated',
                `${contactRows[0].contact_name} ประเมินผลงานซ่อมแล้ว (${rating} ดาว)`
            );

            await conn.commit();

            result = {
                isError: false,
                data: { evaluationId },
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

    // แก้ไขการประเมินเดิมในที่ (คะแนน/ข้อความ + แทนที่รูปทั้งหมด) — ทางเลือกหลักสำหรับแก้ไข
    // ต่างจาก deleteByRequestId ตรงที่ไม่ลบทั้งแถวทิ้ง แค่อัปเดตค่า เหมือนหลัก "replace all" รูป
    // ที่ repair_request_photo/repair_completion_photo ใช้อยู่แล้ว
    updateEvaluation: async (requestId, rating, feedback, photoUrls) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();

            var evaluationRows = await conn.query(
                "SELECT evaluation_id FROM repair_evaluation WHERE request_id = ?",
                [requestId]
            );

            if (evaluationRows.length === 0) {
                result = {
                    isError: true,
                    data: "",
                    errorMessage: "ยังไม่เคยประเมินงานซ่อมนี้ ไม่สามารถแก้ไขได้"
                };
                return;
            }

            var evaluationId = evaluationRows[0].evaluation_id;

            await conn.query(
                "UPDATE repair_evaluation SET rating = ?, feedback = ? WHERE evaluation_id = ?",
                [rating, feedback, evaluationId]
            );

            var oldPhotoRows = await conn.query(
                "SELECT photo_url FROM repair_evaluation_photo WHERE evaluation_id = ?",
                [evaluationId]
            );

            await conn.query("DELETE FROM repair_evaluation_photo WHERE evaluation_id = ?", [evaluationId]);

            var insertPhotoSql = "INSERT INTO repair_evaluation_photo (evaluation_id, photo_url) VALUES (?, ?)";
            for (const photoUrl of photoUrls) {
                await conn.query(insertPhotoSql, [evaluationId, photoUrl]);
            }

            await conn.commit();

            result = {
                isError: false,
                data: { evaluationId, removedUrls: oldPhotoRows.map(r => r.photo_url) },
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

    // ให้นักศึกษาลบผลประเมินของตัวเองทิ้งทั้งหมดได้ (ต่างจาก updateEvaluation ที่แค่แก้ค่า)
    // ownership เช็คจาก route ก่อนเรียกฟังก์ชันนี้ (join กับ repair_request.student_id)
    // ลบแถว repair_evaluation แล้ว repair_evaluation_photo จะถูกลบตามด้วย ON DELETE CASCADE
    deleteByRequestId: async (requestId) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            var photoRows = await conn.query(
                "SELECT rep.photo_url " +
                "FROM repair_evaluation_photo rep " +
                "JOIN repair_evaluation re ON re.evaluation_id = rep.evaluation_id " +
                "WHERE re.request_id = ?",
                [requestId]
            );

            await conn.query("DELETE FROM repair_evaluation WHERE request_id = ?", [requestId]);

            result = {
                isError: false,
                data: { removedUrls: photoRows.map(r => r.photo_url) },
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
