const pool = require('../libs/db_pool');

module.exports = {
    // สร้างแจ้งเตือน 1 รายการ — รับ conn จากผู้เรียกเสมอ (เหมือน repair_timeline.insertTimelineStep) เพื่อให้
    // อยู่ใน transaction เดียวกับเหตุการณ์หลัก (เช่น แจ้งซ่อมสำเร็จ) ถ้าเหตุการณ์หลัก rollback แจ้งเตือนก็หายไป
    // ด้วย ไม่มีแจ้งเตือนขยะค้างไว้ตอนที่เหตุการณ์จริงไม่ได้เกิดขึ้น
    createNotification: async (conn, requestId, eventType, message) => {
        var sql =
            "INSERT INTO notification (request_id, event_type, message) " +
            "VALUES (?, ?, ?)";

        await conn.query(sql, [requestId, eventType, message]);
    },

    // รายการแจ้งเตือนล่าสุด + จำนวนที่ยังไม่อ่าน (ใช้โชว์ badge บนกระดิ่ง) ดึงคู่กันในคำขอเดียวเพราะหน้าแผง
    // แจ้งเตือนต้องใช้ทั้งคู่พร้อมกันเสมอตอนเปิด — join เอา case_code มาด้วยเพราะ notification เก็บแค่ request_id
    // (ไม่เก็บ case_code ซ้ำ ให้ repair_request เป็นเจ้าของข้อมูลนี้ที่เดียวตามเดิม)
    getRecent: async (limit) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            var listSql =
                "SELECT " +
                "  n.notification_id, " +
                "  n.request_id, " +
                "  n.event_type, " +
                "  n.message, " +
                "  n.is_read, " +
                "  rr.case_code, " +
                "  DATE_FORMAT(n.created_at, '%Y-%m-%d %H:%i:%s') AS created_at " +
                "FROM notification n " +
                "LEFT JOIN repair_request rr ON rr.request_id = n.request_id " +
                "ORDER BY n.created_at DESC, n.notification_id DESC " +
                "LIMIT ?";

            var rows = await conn.query(listSql, [limit]);

            var countRows = await conn.query(
                "SELECT COUNT(*) AS total FROM notification WHERE is_read = 0"
            );

            result = {
                isError: false,
                data: { notifications: rows, unreadCount: Number(countRows[0].total) },
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

    markAsRead: async (notificationId) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            await conn.query(
                "UPDATE notification SET is_read = 1 WHERE notification_id = ?",
                [notificationId]
            );

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

    markAllAsRead: async () => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            await conn.query("UPDATE notification SET is_read = 1 WHERE is_read = 0");

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
    }
}
