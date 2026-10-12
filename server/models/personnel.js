const pool = require('../libs/db_pool');

async function generatePersonNo(conn, personId) {
    var sql = "UPDATE person SET person_no = CONCAT('P', LPAD(?, 5, '0')) WHERE person_id = ?";
    await conn.query(sql, [personId, personId]);
}

async function isUsernameTaken(conn, username) {
    var rows = await conn.query("SELECT 1 FROM account WHERE username = ?", [username]);
    return rows.length > 0;
}

// ใช้ตอนแก้ไขบัญชีเดิม — ต้องเช็คว่า username ซ้ำกับ "คนอื่น" ไหม ไม่ใช่ซ้ำกับบัญชีของตัวเองที่ไม่ได้เปลี่ยน
async function isUsernameTakenByOther(conn, username, personId) {
    var rows = await conn.query(
        "SELECT 1 FROM account WHERE username = ? AND person_id != ?",
        [username, personId]
    );
    return rows.length > 0;
}

// ใช้ร่วมกันระหว่าง updateStudent/updateModerator — username/password ไม่บังคับ ใส่มาก็ต่อเมื่อ
// เจ้าหน้าที่ตั้งใจจะเปลี่ยนค่านั้นจริงๆ (เว้นว่างไว้ = ไม่แตะบัญชีเดิมเลย) คืนค่า error message
// กลับไปถ้า username ซ้ำกับคนอื่น (ไม่ throw เพราะนี่ไม่ใช่ข้อผิดพลาดของระบบ แต่เป็นข้อมูลไม่ถูกต้อง)
async function updateAccountCredentials(conn, personId, username, password) {
    const trimmedUsername = (username || '').trim();

    if (trimmedUsername) {
        if (await isUsernameTakenByOther(conn, trimmedUsername, personId)) {
            return "username นี้ถูกใช้งานแล้ว";
        }
        await conn.query("UPDATE account SET username = ? WHERE person_id = ?", [trimmedUsername, personId]);
    }

    if (password) {
        await conn.query("UPDATE account SET password = SHA2(?, 256) WHERE person_id = ?", [password, personId]);
    }

    return null;
}

module.exports = {
    getAllRoles: async () => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();
            var rows = await conn.query("SELECT role_id, role_name FROM role ORDER BY role_id");

            result = { isError: false, data: rows, errorMessage: "" };
        } catch (error) {
            result = { isError: true, data: "", errorMessage: error.message };
        } finally {
            if (conn)
                conn.release();

            return result;
        }
    },

    getAllPositions: async () => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();
            var rows = await conn.query("SELECT position_id, position_name FROM position ORDER BY position_id");

            result = { isError: false, data: rows, errorMessage: "" };
        } catch (error) {
            result = { isError: true, data: "", errorMessage: error.message };
        } finally {
            if (conn)
                conn.release();

            return result;
        }
    },

    getAllSpecialties: async () => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();
            var rows = await conn.query("SELECT specialty_id, specialty_name FROM specialty ORDER BY specialty_id");

            result = { isError: false, data: rows, errorMessage: "" };
        } catch (error) {
            result = { isError: true, data: "", errorMessage: error.message };
        } finally {
            if (conn)
                conn.release();

            return result;
        }
    },

    getAllPersonnel: async () => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            var sql =
                "SELECT p.person_id, p.person_no, p.firstname, p.lastname, p.phone, p.profile_image, p.role_id, r.role_name, " +
                "  a.account_id, a.username, " +
                "  s.room_number, NULL AS position_id, NULL AS position_name, NULL AS specialty_id, NULL AS specialty_name " +
                "FROM person p " +
                "JOIN role r ON r.role_id = p.role_id " +
                "JOIN student s ON s.person_id = p.person_id " +
                "LEFT JOIN account a ON a.person_id = p.person_id " +
                "UNION ALL " +
                "SELECT p.person_id, p.person_no, p.firstname, p.lastname, p.phone, p.profile_image, p.role_id, r.role_name, " +
                "  a.account_id, a.username, " +
                "  NULL AS room_number, m.position_id, pos.position_name, NULL AS specialty_id, NULL AS specialty_name " +
                "FROM person p " +
                "JOIN role r ON r.role_id = p.role_id " +
                "JOIN moderator m ON m.person_id = p.person_id " +
                "LEFT JOIN account a ON a.person_id = p.person_id " +
                "LEFT JOIN position pos ON pos.position_id = m.position_id " +
                "UNION ALL " +
                "SELECT p.person_id, p.person_no, p.firstname, p.lastname, p.phone, p.profile_image, p.role_id, r.role_name, " +
                "  NULL AS account_id, NULL AS username, " +
                "  NULL AS room_number, NULL AS position_id, NULL AS position_name, t.specialty_id, sp.specialty_name " +
                "FROM person p " +
                "JOIN role r ON r.role_id = p.role_id " +
                "JOIN technician t ON t.person_id = p.person_id " +
                "LEFT JOIN specialty sp ON sp.specialty_id = t.specialty_id " +
                "ORDER BY person_id DESC";

            var rows = await conn.query(sql);

            result = { isError: false, data: rows, errorMessage: "" };
        } catch (error) {
            result = { isError: true, data: "", errorMessage: error.message };
        } finally {
            if (conn)
                conn.release();

            return result;
        }
    },

    createStudent: async (firstname, lastname, phone, username, password, roomNumber) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            if (await isUsernameTaken(conn, username)) {
                result = { isError: true, data: "", errorMessage: "username นี้ถูกใช้งานแล้ว" };
                return;
            }

            await conn.beginTransaction();

            var insertPersonSql =
                "INSERT INTO person (person_no, role_id, firstname, lastname, phone) VALUES (?, 1, ?, ?, ?)";
            var personResult = await conn.query(insertPersonSql, ["", firstname, lastname, phone]);
            const personId = Number(personResult.insertId);

            await generatePersonNo(conn, personId);

            await conn.query("INSERT INTO student (person_id, room_number) VALUES (?, ?)", [personId, roomNumber]);

            await conn.query(
                "INSERT INTO account (person_id, role_id, username, password) VALUES (?, 1, ?, SHA2(?, 256))",
                [personId, username, password]
            );

            await conn.commit();

            result = { isError: false, data: { person_id: personId }, errorMessage: "" };
        } catch (error) {
            if (conn)
                await conn.rollback();

            result = { isError: true, data: "", errorMessage: error.message };
        } finally {
            if (conn)
                conn.release();

            return result;
        }
    },

    createModerator: async (firstname, lastname, phone, username, password, positionId) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            if (await isUsernameTaken(conn, username)) {
                result = { isError: true, data: "", errorMessage: "username นี้ถูกใช้งานแล้ว" };
                return;
            }

            await conn.beginTransaction();

            var insertPersonSql =
                "INSERT INTO person (person_no, role_id, firstname, lastname, phone) VALUES (?, 2, ?, ?, ?)";
            var personResult = await conn.query(insertPersonSql, ["", firstname, lastname, phone]);
            const personId = Number(personResult.insertId);

            await generatePersonNo(conn, personId);

            await conn.query("INSERT INTO moderator (person_id, position_id) VALUES (?, ?)", [personId, positionId]);

            await conn.query(
                "INSERT INTO account (person_id, role_id, username, password) VALUES (?, 2, ?, SHA2(?, 256))",
                [personId, username, password]
            );

            await conn.commit();

            result = { isError: false, data: { person_id: personId }, errorMessage: "" };
        } catch (error) {
            if (conn)
                await conn.rollback();

            result = { isError: true, data: "", errorMessage: error.message };
        } finally {
            if (conn)
                conn.release();

            return result;
        }
    },

    createTechnician: async (firstname, lastname, phone, specialtyId) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();

            var insertPersonSql =
                "INSERT INTO person (person_no, role_id, firstname, lastname, phone) VALUES (?, 3, ?, ?, ?)";
            var personResult = await conn.query(insertPersonSql, ["", firstname, lastname, phone]);
            const personId = Number(personResult.insertId);

            await generatePersonNo(conn, personId);

            await conn.query("INSERT INTO technician (person_id, specialty_id) VALUES (?, ?)", [personId, specialtyId]);

            await conn.commit();

            result = { isError: false, data: { person_id: personId }, errorMessage: "" };
        } catch (error) {
            if (conn)
                await conn.rollback();

            result = { isError: true, data: "", errorMessage: error.message };
        } finally {
            if (conn)
                conn.release();

            return result;
        }
    },

    updateStudent: async (personId, firstname, lastname, phone, roomNumber, username, password) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();

            await conn.query(
                "UPDATE person SET firstname = ?, lastname = ?, phone = ? WHERE person_id = ?",
                [firstname, lastname, phone, personId]
            );

            await conn.query(
                "UPDATE student SET room_number = ? WHERE person_id = ?",
                [roomNumber, personId]
            );

            const credentialError = await updateAccountCredentials(conn, personId, username, password);
            if (credentialError) {
                await conn.rollback();
                result = { isError: true, data: "", errorMessage: credentialError };
                return;
            }

            await conn.commit();

            result = { isError: false, data: "", errorMessage: "" };
        } catch (error) {
            if (conn)
                await conn.rollback();

            result = { isError: true, data: "", errorMessage: error.message };
        } finally {
            if (conn)
                conn.release();

            return result;
        }
    },

    updateModerator: async (personId, firstname, lastname, phone, positionId, username, password) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();

            await conn.query(
                "UPDATE person SET firstname = ?, lastname = ?, phone = ? WHERE person_id = ?",
                [firstname, lastname, phone, personId]
            );

            await conn.query(
                "UPDATE moderator SET position_id = ? WHERE person_id = ?",
                [positionId, personId]
            );

            const credentialError = await updateAccountCredentials(conn, personId, username, password);
            if (credentialError) {
                await conn.rollback();
                result = { isError: true, data: "", errorMessage: credentialError };
                return;
            }

            await conn.commit();

            result = { isError: false, data: "", errorMessage: "" };
        } catch (error) {
            if (conn)
                await conn.rollback();

            result = { isError: true, data: "", errorMessage: error.message };
        } finally {
            if (conn)
                conn.release();

            return result;
        }
    },

    updateTechnician: async (personId, firstname, lastname, phone, specialtyId) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();

            await conn.query(
                "UPDATE person SET firstname = ?, lastname = ?, phone = ? WHERE person_id = ?",
                [firstname, lastname, phone, personId]
            );

            await conn.query(
                "UPDATE technician SET specialty_id = ? WHERE person_id = ?",
                [specialtyId, personId]
            );

            await conn.commit();

            result = { isError: false, data: "", errorMessage: "" };
        } catch (error) {
            if (conn)
                await conn.rollback();

            result = { isError: true, data: "", errorMessage: error.message };
        } finally {
            if (conn)
                conn.release();

            return result;
        }
    },

    deletePersonnel: async (personIds) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            const ids = Array.isArray(personIds) ? personIds : [personIds];
            const placeholders = ids.map(() => '?').join(', ');

            await conn.beginTransaction();

            await conn.query(`DELETE FROM account WHERE person_id IN (${placeholders})`, ids);
            await conn.query(`DELETE FROM student WHERE person_id IN (${placeholders})`, ids);
            await conn.query(`DELETE FROM moderator WHERE person_id IN (${placeholders})`, ids);
            await conn.query(`DELETE FROM technician WHERE person_id IN (${placeholders})`, ids);
            await conn.query(`DELETE FROM person WHERE person_id IN (${placeholders})`, ids);

            await conn.commit();

            result = { isError: false, data: "", errorMessage: "" };
        } catch (error) {
            if (conn)
                await conn.rollback();

            const isForeignKeyError = error.code === 'ER_ROW_IS_REFERENCED_2' || error.code === 'ER_ROW_IS_REFERENCED';
            result = {
                isError: true,
                data: "",
                errorMessage: isForeignKeyError
                    ? "ไม่สามารถลบได้ เนื่องจากมีข้อมูลงานซ่อมที่เกี่ยวข้องกับบุคคลนี้อยู่"
                    : error.message
            };
        } finally {
            if (conn)
                conn.release();

            return result;
        }
    },
}
