const pool = require('../libs/db_pool');

module.exports = {
    getUserAccountById: async (accountId) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            var sql = "SELECT account_id, username, password FROM account " 
            + "WHERE account_id = ?";
            
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
    }
}
