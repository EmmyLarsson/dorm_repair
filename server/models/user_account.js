const pool = require('../libs/db_pool');
const dateUtils = require('../libs/date_utils');
const personnelModel = require('./personnel');

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

            var sql = "SELECT p.person_id, a.username AS student_no, p.firstname, p.lastname, p.phone, s.room_number, p.profile_image AS image_url " +
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
    // ใช้ตรวจว่า person_id ที่ส่งมาเป็นของบัญชีที่ล็อกอินอยู่ไหม (token เก็บแค่ account_id ไม่มี person_id)
    // data = person_id หรือ null ถ้าไม่พบบัญชี
    getPersonIdByAccountId: async (accountId) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            var rows = await conn.query("SELECT person_id FROM account WHERE account_id = ?", [accountId]);

            result = {
                isError: false,
                data: rows[0] ? Number(rows[0].person_id) : null,
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

            // token เก็บแค่ account_id จึงหา person_id ก่อน แล้วใช้ฟังก์ชันร่วมกับที่เจ้าหน้าที่แก้ให้ (personnel.js)
            // นักศึกษาแก้เองได้เฉพาะเบอร์โทรกับห้อง จึงส่งแค่ { phone } ชื่อ/นามสกุลไม่ถูกแตะ
            var personRows = await conn.query("SELECT person_id FROM account WHERE account_id = ?", [accountId]);
            if (!personRows[0]) {
                await conn.rollback();
                result = { isError: true, data: "", errorMessage: "ไม่พบบัญชีผู้ใช้" };
                return;
            }
            var personId = personRows[0].person_id;

            await personnelModel.updatePersonFields(conn, personId, { phone });
            await personnelModel.updateStudentRoom(conn, personId, roomNumber);

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