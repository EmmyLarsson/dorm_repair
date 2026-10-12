export const PHONE_DIGIT_COUNT = 10;

// ช่องกรอกแสดงเป็น 080-123-4567 แต่ person.phone เป็น varchar(10) เก็บขีดไม่ได้
// จึงตัดขีดออกก่อนตรวจรูปแบบและก่อนส่งไป backend เสมอ
export function phoneDigitsOnly(value) {
  return value.replace(/\D/g, '');
}

// ใช้กับช่องกรอก: trailingDash ใช้ตอนกำลังพิมพ์เพิ่ม — ครบ 3 หรือ 6 หลักแล้วเติม "-" รอไว้ให้เลย
export function formatPhoneDisplay(value, trailingDash = false) {
  const digits = phoneDigitsOnly(value).slice(0, PHONE_DIGIT_COUNT);

  let formatted = '';
  for (let i = 0; i < digits.length; i += 1) {
    if (i === 3 || i === 6) formatted += '-';
    formatted += digits[i];
  }
  if (trailingDash && (digits.length === 3 || digits.length === 6)) formatted += '-';
  return formatted;
}

// ใช้กับการแสดงผลอย่างเดียว: จัดรูปแบบเฉพาะค่าที่เป็นเบอร์ 10 หลักพอดี ส่วนค่าอื่น (เช่น
// เบอร์เก่าที่ยาวผิดปกติ หรือ '-') คืนค่าเดิมทั้งก้อน เพื่อไม่ให้การแสดงผลตัดหรือแก้ข้อมูลจริงทิ้ง
export function formatPhoneForDisplay(value) {
  if (!value) return value;

  const digits = phoneDigitsOnly(value);
  return digits.length === PHONE_DIGIT_COUNT ? formatPhoneDisplay(digits) : value;
}
