// จัดรูปแถวดิบจาก models/dashboard.js เป็น JSON ของหน้ารายงานสรุป — แยกจาก model เพราะ model มีแต่ query
// (กฎโปรเจกต์) ที่นี่เป็นฟังก์ชันล้วน ไม่แตะฐานข้อมูล

// กราฟสัดส่วนนับเฉพาะ "ผลสุดท้าย" ของเคสที่จบแล้ว: สำเร็จ (6) / ไม่สำเร็จ (8) / ยกเลิก (4) เพราะเป็นข้อมูลที่ไม่เปลี่ยนอีก
// ส่วนเคสที่ยังไม่จบเป็นภาพ ณ ตอนนี้ (เปลี่ยนทุกวัน) จึงไม่รวมในกราฟ ส่งไปแค่จำนวนรวมให้แสดงเป็นหมายเหตุ
// นิยามที่ backend ที่เดียว (หน้าเว็บแสดงตามที่ส่งไป) ชื่อสถานะมาจาก progress_status
const SUCCESS_STATUS_ID = 6;
const FAILED_STATUS_ID = 8;
const IN_PROGRESS_STATUS_IDS = [1, 2, 3, 7, 5];

const SLOT_KEYS = ['09-11', '13-15', '15-17'];

function toNumberOrNull(value) {
    if (value === null || value === undefined) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}

// Date → "YYYY-MM-DD" ตามเวลาเครื่อง (ไม่ใช้ toISOString ซึ่งเป็น UTC ทำให้วันเลื่อนในไทย)
function formatLocalDate(date) {
    return date.getFullYear() + '-' +
        String(date.getMonth() + 1).padStart(2, '0') + '-' +
        String(date.getDate()).padStart(2, '0');
}

// สร้างรายการวันย้อนหลัง days วัน สิ้นสุดที่ today (YYYY-MM-DD) เพื่อให้กราฟมีทุกวันแม้วันนั้นไม่มีนัดหมาย
function buildDayList(today, days) {
    const [year, month, day] = today.split('-').map(Number);
    const list = [];
    for (let offset = days - 1; offset >= 0; offset--) {
        list.push(formatLocalDate(new Date(year, month - 1, day - offset)));
    }
    return list;
}

function buildReportSummary(raw, rangeKey) {
    const statusById = new Map(raw.statusRows.map((row) => [row.progress_status_id, row]));
    const statusItem = (id) => {
        const row = statusById.get(id);
        return { id, name: row ? row.progress_status_name : '', total: row ? Number(row.total) : 0 };
    };
    const sumTotals = (items) => items.reduce((sum, item) => sum + item.total, 0);

    const success = statusItem(SUCCESS_STATUS_ID);
    const failed = statusItem(FAILED_STATUS_ID);
    const inProgressTotal = sumTotals(IN_PROGRESS_STATUS_IDS.map(statusItem));

    const totalCancelled = Number(raw.cancel.total_cancelled);
    const studentCancelled = Number(raw.cancel.student_cancelled);
    const cancelledItems = [
        { key: 'student', name: 'นักศึกษายกเลิกเอง', total: studentCancelled },
        { key: 'staff', name: 'เจ้าหน้าที่ปฏิเสธ', total: totalCancelled - studentCancelled },
    ];

    const slotTotals = new Map(raw.slotRows.map((row) => [row.slot_key, Number(row.total)]));

    const dailyByDay = new Map();
    for (const row of raw.dailyRows) {
        const entry = dailyByDay.get(row.day) || { repair: 0, revision: 0 };
        entry[row.kind] = Number(row.total);
        dailyByDay.set(row.day, entry);
    }
    const daily = buildDayList(raw.today, raw.dailyDays).map((date) => {
        const entry = dailyByDay.get(date) || { repair: 0, revision: 0 };
        return { date, repair: entry.repair, revision: entry.revision };
    });
    const todayEntry = daily[daily.length - 1];

    return {
        range: rangeKey,
        today: raw.today,
        // เคสทั้งหมดในช่วง (รวมที่ยังไม่จบ) ไว้ให้หน้าเว็บรู้ว่า "ไม่มีเคสเลย" ส่วนกราฟใช้ outcomes.closedTotal
        total: success.total + failed.total + inProgressTotal + totalCancelled,
        cards: {
            reportedToday: Number(raw.cards.reported_today),
            reportedInRange: Number(raw.cards.reported_in_range),
            avgRating: toNumberOrNull(raw.rating.avg_rating),
            ratingCount: Number(raw.rating.rating_count),
            avgRepairDays: toNumberOrNull(raw.cards.avg_repair_days),
            avgApproveHours: toNumberOrNull(raw.cards.avg_approve_hours),
        },
        outcomes: {
            closedTotal: success.total + failed.total + totalCancelled,
            inProgressTotal,
            success,
            failed,
            cancelled: { total: totalCancelled, items: cancelledItems },
        },
        repairTypes: raw.typeRows.map((row) => ({
            id: row.repair_type_id,
            name: row.repair_type_name,
            total: Number(row.total),
        })),
        appeal: {
            firstAccepted: Number(raw.appeal.first_accepted),
            appealSucceeded: Number(raw.appeal.appeal_succeeded),
            appealFailed: Number(raw.appeal.appeal_failed),
            appealPending: Number(raw.appeal.appeal_pending),
        },
        appealReasons: raw.reasonRows.map((row) => ({ name: row.reason_name, total: Number(row.total) })),
        slots: SLOT_KEYS.map((key) => ({ key, total: slotTotals.get(key) || 0 })),
        equipment: raw.equipmentRows.map((row) => ({
            id: row.equipment_id,
            name: row.equipment_name,
            unit: row.unit_name,
            type: row.equipment_type_name,
            total: Number(row.total),
        })),
        daily,
        todayAppointments: { repair: todayEntry.repair, revision: todayEntry.revision },
        overdue: raw.overdueRows.map((row) => ({
            requestId: row.request_id,
            caseCode: row.case_code,
            roomNumber: row.room_number,
            typeNames: row.type_names || '',
            statusId: row.progress_status_id,
            statusName: row.progress_status_name,
            daysOpen: Number(row.days_open),
        })),
    };
}

module.exports = { buildReportSummary };
