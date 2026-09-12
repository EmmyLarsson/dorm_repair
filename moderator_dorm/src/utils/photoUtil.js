import { AppConfig } from '../config/appConfig';

// เซิร์ฟรูปจาก express.static('/uploads', ...) ฝั่ง server — แยก host ออกจาก apiBaseUri
// (ตัด path '/api' ทิ้ง) เพื่อประกอบเป็น URL เต็มของรูป (mirror ของ student_dorm/photo_viewer_screen.dart)
export function photoFullUrl(photoUrl) {
  const apiUrl = new URL(AppConfig.apiBaseUri);
  return `${apiUrl.protocol}//${apiUrl.host}${photoUrl}`;
}
