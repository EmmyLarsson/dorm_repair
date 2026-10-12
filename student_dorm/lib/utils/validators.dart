/// ตรวจรูปแบบเบอร์โทรศัพท์ — ต้องเป็นเบอร์มือถือ 10 หลักที่ขึ้นต้นด้วย 06, 08 หรือ 09
/// ผู้เรียกต้องส่งตัวเลขล้วนมา (ตัดขีดด้วย phoneDigitsOnly ก่อน) เพราะช่องกรอกแสดงเป็น 080-123-4567
/// ใช้ร่วมกันทั้งหน้าแจ้งซ่อม (report_submit_screen.dart) และหน้าแก้ไขโปรไฟล์ (profile_edit_screen.dart)
/// คืนค่า null ถ้ารูปแบบถูกต้อง หรือข้อความแจ้งเตือนถ้าไม่ถูกต้อง (ไม่เช็คค่าว่าง — ให้ผู้เรียกเช็คเอง
/// เพราะบางจุดต้องการข้อความ "กรุณากรอก..." ที่ต่างจากข้อความรูปแบบผิด)
String? validatePhoneNumber(String value) {
  if (!RegExp(r'^0[689]\d{8}$').hasMatch(value)) {
    return 'หมายเลขโทรศัพท์ไม่ถูกต้อง';
  }
  return null;
}

/// ตรวจรูปแบบหมายเลขห้องพัก — ต้องเป็นตัวเลข 6 หลักพอดี แบ่งเป็น 3 ส่วน (อาคาร 2 หลัก, ชั้น 2 หลัก,
/// เลขห้อง 2 หลัก) ตรงกับข้อจำกัดจริงของหอพัก: มีแค่อาคาร 10-11, แต่ละอาคารมี 15 ชั้นเริ่มที่ชั้น 2,
/// แต่ละชั้นมี 40 ห้อง — กฎเดียวกับ validateRoomNumber ใน PersonnelFormModal.jsx ฝั่งเจ้าหน้าที่
/// คืนค่า null ถ้ารูปแบบถูกต้อง หรือข้อความแจ้งเตือนถ้าไม่ถูกต้อง (ไม่เช็คค่าว่าง — ให้ผู้เรียกเช็คเอง)
String? validateRoomNumber(String value) {
  final match = RegExp(r'^(\d{2})(\d{2})(\d{2})$').firstMatch(value);
  if (match == null) {
    return 'หมายเลขห้องไม่ถูกต้อง';
  }

  final building = int.parse(match.group(1)!);
  final floor = int.parse(match.group(2)!);
  final room = int.parse(match.group(3)!);

  if (building < 10 || building > 11) return 'หมายเลขห้องไม่ถูกต้อง';
  if (floor < 2 || floor > 15) return 'หมายเลขห้องไม่ถูกต้อง';
  if (room < 1 || room > 40) return 'หมายเลขห้องไม่ถูกต้อง';

  return null;
}
