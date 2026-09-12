const pool = require('../libs/db_pool');

module.exports = {
    getAllEquipment: async () => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            var sql = "SELECT " +
                "  e.equipment_id, " +
                "  e.equipment_code, " +
                "  e.equipment_name, " +
                "  e.equipment_type_id, " +
                "  et.equipment_type_name, " +
                "  e.unit_id, " +
                "  u.unit_name, " +
                "  e.quantity, " +
                "  e.low_stock_threshold, " +
                "  (SELECT photo_path FROM equipment_photo ep " +
                "   WHERE ep.equipment_id = e.equipment_id " +
                "   ORDER BY ep.equipment_photo_id ASC LIMIT 1) AS image_url " +
                "FROM equipment e " +
                "LEFT JOIN equipment_type et ON e.equipment_type_id = et.equipment_type_id " +
                "LEFT JOIN unit u ON e.unit_id = u.unit_id " +
                "ORDER BY e.equipment_id DESC";

            var rows = await conn.query(sql);

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

    createEquipment: async (name, equipmentTypeId, unitId, quantity, lowStockThreshold) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();
            await conn.beginTransaction();

            var dupSql = "SELECT equipment_id FROM equipment " +
                "WHERE LOWER(TRIM(equipment_name)) = LOWER(TRIM(?)) LIMIT 1";
            var dupRows = await conn.query(dupSql, [name]);

            if (dupRows.length > 0) {
                await conn.rollback();
                result = {
                    isError: true,
                    data: "",
                    errorMessage: "ชื่อนี้มีอยู่แล้ว"
                };
                return;
            }

            const tempCode = "TEMP-" + Date.now();

            var insertSql = "INSERT INTO equipment (" +
                "equipment_code, equipment_type_id, unit_id, equipment_name, quantity, low_stock_threshold" +
                ") VALUES (?, ?, ?, ?, ?, ?)";

            const insertResult = await conn.query(
                insertSql,
                [tempCode, equipmentTypeId, unitId, name, quantity, lowStockThreshold]
            );

            const equipmentId = Number(insertResult.insertId);
            const equipmentCode = "I" + String(equipmentId).padStart(3, "0");

            var updateCodeSql = "UPDATE equipment SET equipment_code = ? WHERE equipment_id = ?";
            await conn.query(updateCodeSql, [equipmentCode, equipmentId]);

            await conn.commit();

            result = {
                isError: false,
                data: {
                    equipment_id: equipmentId,
                    equipment_code: equipmentCode
                },
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

    updateEquipment: async (equipmentId, name, equipmentTypeId, unitId, quantity, lowStockThreshold) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            var dupSql = "SELECT equipment_id FROM equipment " +
                "WHERE LOWER(TRIM(equipment_name)) = LOWER(TRIM(?)) AND equipment_id != ? LIMIT 1";
            var dupRows = await conn.query(dupSql, [name, equipmentId]);

            if (dupRows.length > 0) {
                result = {
                    isError: true,
                    data: "",
                    errorMessage: "ชื่อนี้มีอยู่แล้ว"
                };
                return;
            }

            var sql = "UPDATE equipment SET " +
                "equipment_name = ?, equipment_type_id = ?, unit_id = ?, quantity = ?, low_stock_threshold = ? " +
                "WHERE equipment_id = ?";

            await conn.query(sql, [name, equipmentTypeId, unitId, quantity, lowStockThreshold, equipmentId]);

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

    deleteEquipment: async (equipmentIds) => {
        let conn;
        let result;

        try {
            conn = await pool.getConnection();

            const ids = Array.isArray(equipmentIds) ? equipmentIds : [equipmentIds];
            const placeholders = ids.map(() => '?').join(', ');

            var sql = `DELETE FROM equipment WHERE equipment_id IN (${placeholders})`;

            await conn.query(sql, ids);

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
