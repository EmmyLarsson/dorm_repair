const pool = require('../libs/db_pool');
const dateUtils = require('../libs/date_utils');

module.exports = {
    getUserAccountById: async (accountId) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();
            var sql = "SELECT a.account_id, a.username, p.profile_image " + 
                      "FROM account a " +
                      "INNER JOIN person p ON a.person_id = p.person_id " +
                      "WHERE a.account_id = ?";
            var rows = await conn.query(sql, [accountId]);

            result = {
                isError: false,
                data: rows
            };

        } catch (error) {
            result = {
                isError: true, 
                errorMessage: error.message
            }
        } finally {
            if (conn) 
                conn.release();
            
            return result;
        }
    },
    getStudentProfile: async (accountId) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            var sql = "SELECT a.username AS student_no, p.firstname, p.lastname, p.phone, s.room_number, p.profile_image AS image_url " +
                      "FROM account a " +
                      "INNER JOIN person p ON a.person_id = p.person_id " +
                      "INNER JOIN student s ON s.person_id = p.person_id " +
                      "WHERE a.account_id = ?";

            var rows = await conn.query(sql, [accountId]);

            result = {
                isError: false,
                data: rows[0] ?? null,
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
    checkAuthenRequest: async (authenRequest) => {
        let conn;
        let result;
        
        try {
            conn = await pool.getConnection();

            // ✅ แก้ไข SQL: เปลี่ยนชื่อตารางเป็น account และคอลัมน์เป็น username
            var sql = "SELECT username FROM account "
            + "WHERE SHA2(CONCAT(username, '&', ?), 256) = ?";

            var rows = await conn.query(sql, [dateUtils.getCurrentDateForToken(), authenRequest]);

            if (rows.length === 0) {
                result = {
                    isError: true,
                    errorMessage: "ไม่พบข้อมูลผู้ใช้ในระบบ"
                };
            } else {
                result = {
                    isError: false,
                    data: rows 
                };
            }
        } catch (error) {
            result = {
                isError: true,
                errorMessage: error.message
            };
        } finally {
            if (conn) 
                conn.release();
        }

        return result;
    },
    checkAccessRequest: async (authenSignature, authenToken) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            var sql = "SELECT a.account_id, a.username, a.role_id, p.profile_image " +
                      "FROM account a " +
                      "INNER JOIN person p ON a.person_id = p.person_id " +
                      "WHERE SHA2(CONCAT(a.username, '&', a.password, '&', ?), 256) = ?";
            
            var rows = await conn.query(sql, [authenToken, authenSignature]);

            if (rows.length === 0) {
                result = {
                    isError: true,
                    errorMessage: "รหัสผ่านไม่ถูกต้อง"
                };
            } else {
                result = {
                    isError: false,
                    data: rows 
                };
            }

        } catch (error) {
            result = {
                isError: true,
                errorMessage: error.message
            };
        } finally {
            if (conn)
                conn.release();
        }
        return result;
    },
    updateStudentProfile: async (accountId, phone, roomNumber) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();

            var updatePhoneSql =
                "UPDATE person p " +
                "JOIN account a ON a.person_id = p.person_id " +
                "SET p.phone = ? " +
                "WHERE a.account_id = ?";

            await conn.query(updatePhoneSql, [phone, accountId]);

            var updateRoomSql =
                "UPDATE student s " +
                "JOIN account a ON a.person_id = s.person_id " +
                "SET s.room_number = ? " +
                "WHERE a.account_id = ?";

            await conn.query(updateRoomSql, [roomNumber, accountId]);

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
            if (conn)
                conn.release();

            return result;
        }
    },
    updateProfileImage: async (accountId, photoPath) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            var sql =
                "UPDATE person p " +
                "JOIN account a ON a.person_id = p.person_id " +
                "SET p.profile_image = ? " +
                "WHERE a.account_id = ?";

            await conn.query(sql, [photoPath, accountId]);

            result = {
                isError: false,
                data: photoPath,
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
    isModerator: async (accountId) => {
        let conn;

        try {
            conn = await pool.getConnection();

            var sql = "SELECT 1 " +
                      "FROM account a " +
                      "JOIN moderator m ON m.person_id = a.person_id " +
                      "WHERE a.account_id = ?";

            var rows = await conn.query(sql, [accountId]);

            return rows.length > 0;
        } catch (error) {
            return false;
        } finally {
            if (conn)
                conn.release();
        }
    },
}