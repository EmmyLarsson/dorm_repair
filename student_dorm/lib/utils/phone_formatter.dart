import 'package:flutter/services.dart';

/// เบอร์โทรไทยมือถือมี 10 หลักเสมอ — ใช้ตัดเลขส่วนเกินตอนวาง (paste) ค่าที่ยาวเกิน
const int _kPhoneDigitCount = 10;

/// ดึงเฉพาะตัวเลขออกจากข้อความ ใช้ก่อนตรวจรูปแบบและก่อนส่งไป backend เพราะ
/// คอลัมน์ person.phone เป็น varchar(10) เก็บขีดไม่ได้ (ขีดมีไว้แสดงผลเท่านั้น)
String phoneDigitsOnly(String value) => value.replaceAll(RegExp(r'\D'), '');

/// จัดเบอร์เป็นรูปแบบ 080-123-4567 สำหรับแสดงในช่องกรอก
/// ต้องเรียกเองเมื่อกำหนด controller.text ด้วยโค้ด เพราะ inputFormatters ทำงานเฉพาะตอนผู้ใช้พิมพ์
/// [trailingDash] ใช้ตอนกำลังพิมพ์เพิ่ม: ครบ 3 หรือ 6 หลักแล้วเติม "-" รอไว้ให้เลย
String formatPhoneDisplay(String value, {bool trailingDash = false}) {
  var digits = phoneDigitsOnly(value);
  if (digits.length > _kPhoneDigitCount) {
    digits = digits.substring(0, _kPhoneDigitCount);
  }

  final buffer = StringBuffer();
  for (var i = 0; i < digits.length; i++) {
    if (i == 3 || i == 6) buffer.write('-');
    buffer.write(digits[i]);
  }
  if (trailingDash && (digits.length == 3 || digits.length == 6)) {
    buffer.write('-');
  }
  return buffer.toString();
}

/// ใช้กับการแสดงผลอย่างเดียว: จัดรูปแบบเฉพาะค่าที่เป็นเบอร์ 10 หลักพอดี ส่วนค่าอื่น (เช่น เบอร์เก่าที่
/// ยาวผิดปกติ) คืนค่าเดิมทั้งก้อน เพื่อไม่ให้การแสดงผลตัดหรือแก้ข้อมูลจริงทิ้งเหมือน formatPhoneDisplay
String formatPhoneForDisplay(String value) {
  final digits = phoneDigitsOnly(value);
  return digits.length == _kPhoneDigitCount ? formatPhoneDisplay(digits) : value;
}

/// ใส่ขีดอัตโนมัติระหว่างพิมพ์เบอร์โทร: 3 หลักแรก - 3 หลักกลาง - 4 หลักท้าย
/// ใช้ร่วมกันทั้งหน้าแจ้งซ่อมและหน้าแก้ไขโปรไฟล์
class PhoneInputFormatter extends TextInputFormatter {
  const PhoneInputFormatter();

  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    var digits = phoneDigitsOnly(newValue.text);
    final oldDigits = phoneDigitsOnly(oldValue.text);

    final cursor = newValue.selection.end < 0
        ? newValue.text.length
        : newValue.selection.end;
    var digitsBeforeCursor = phoneDigitsOnly(newValue.text.substring(0, cursor)).length;

    // ลบแล้วตัวเลขไม่ลดแปลว่าผู้ใช้ลบแค่ขีด — ถ้าปล่อยไว้ ขีดจะถูกเติมกลับทันทีแล้วลบไม่ไป
    // จึงลบเลขตัวที่อยู่หน้าขีดแทน ให้การกดลบหนึ่งครั้งเดินถอยหลังได้จริง
    final isDeleting = newValue.text.length < oldValue.text.length;
    if (isDeleting && digits == oldDigits && digitsBeforeCursor > 0) {
      digits = digits.substring(0, digitsBeforeCursor - 1) + digits.substring(digitsBeforeCursor);
      digitsBeforeCursor -= 1;
    }

    if (digits.length > _kPhoneDigitCount) {
      digits = digits.substring(0, _kPhoneDigitCount);
    }
    if (digitsBeforeCursor > digits.length) digitsBeforeCursor = digits.length;

    final isInserting = digits.length > oldDigits.length;
    final formatted = formatPhoneDisplay(digits, trailingDash: isInserting);

    var offset = 0;
    if (digitsBeforeCursor >= digits.length) {
      offset = formatted.length;
    } else {
      var seen = 0;
      for (var i = 0; i < formatted.length; i++) {
        if (formatted[i] != '-') seen++;
        if (seen == digitsBeforeCursor) {
          offset = i + 1;
          break;
        }
      }
    }

    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: offset),
    );
  }
}
