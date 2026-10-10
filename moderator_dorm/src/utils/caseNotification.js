import { AppAPI } from './appApi';

// เจ้าหน้าที่เปิดเคส → ล้างแจ้งเตือนที่ยังไม่อ่านของเคสนั้น (ป้าย "มีอัปเดตใหม่จากนักศึกษา" บนการ์ด) ใช้ร่วมทั้งหน้าโฮมและ
// หน้าจัดการงานซ่อม ผิดพลาดแล้วเงียบได้ (แค่ป้ายยังไม่หาย การทำงานหลักของเจ้าหน้าที่ต้องไม่สะดุดเพราะเรื่องนี้)
export async function markCaseNotificationsRead(requestId) {
  try {
    await AppAPI.post(`/notifications/read-by-request/${requestId}`, {});
  } catch {
    // ไม่ต้องแจ้งผู้ใช้
  }
}
