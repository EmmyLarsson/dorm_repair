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

            var sql = "SELECT a.account_id, a.username, p.profile_image " +
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
}