// ค่าเวลาของกติกาติดตามงาน (ค่ากลางทั้งระบบ) — แก้ผ่าน env ได้โดยไม่ต้องแก้โค้ด; ถ้า env ไม่ใช่เลขจำนวนเต็ม
// บวกในช่วงที่กำหนด จะใช้ค่า default แทน กันตั้งค่าผิดแล้วระบบปิดงานเร็ว/ช้าเกินไปโดยไม่รู้ตัว
function readIntEnv(name, defaultValue, min, max) {
    const raw = process.env[name];
    if (raw === undefined || raw === '') return defaultValue;
    const value = Number(raw);
    return Number.isInteger(value) && value >= min && value <= max ? value : defaultValue;
}

const autoCloseDays = readIntEnv('AUTO_CLOSE_AFTER_DAYS', 3, 2, 60);
const staleFlagDays = readIntEnv('STALE_FLAG_AFTER_DAYS', 1, 1, 30);

module.exports = {
    // งานสถานะ 3 (รอนักศึกษายืนยัน) ค้างเกินกี่วันนับจาก finish_date ถึงขึ้นธง "ค้างยืนยัน" ในมอนิเตอร์
    // ต้องน้อยกว่าวันปิดอัตโนมัติ ไม่งั้นธงจะไม่มีช่วงให้เห็นเลย → ถ้าตั้งสลับกันให้ถอยเหลือ 1 วัน
    STALE_FLAG_AFTER_DAYS: staleFlagDays < autoCloseDays ? staleFlagDays : 1,
    // ค้างเกินกี่วันถึงปิดเป็น "สำเร็จ" อัตโนมัติ
    AUTO_CLOSE_AFTER_DAYS: autoCloseDays,
    // นักศึกษากดเร่งงานซ้ำได้หลังผ่านกี่ชั่วโมง (กันสแปมแจ้งเตือนเจ้าหน้าที่)
    RUSH_COOLDOWN_HOURS: readIntEnv('RUSH_COOLDOWN_HOURS', 24, 1, 168),
    // งานที่ปิดแล้ว (สำเร็จ/ไม่สำเร็จ/ยกเลิก) แสดงในหน้าโฮมนักศึกษาแค่กี่วันหลังปิด เก่ากว่านั้นดูที่หน้าประวัติ
    RECENT_CLOSED_DAYS: readIntEnv('RECENT_CLOSED_DAYS', 2, 1, 30),
};
