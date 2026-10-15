import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:student_dorm/color/colors.dart';

class StatusCard extends StatelessWidget {
  const StatusCard({
    super.key,
    required this.filterKey,
    required this.count,
    required this.label,
    required this.color,
    required this.isActive,
    required this.onTap,
    this.unreadCount = 0,
  });

  final String filterKey;
  final int count;
  final String label;
  final Color color;
  final bool isActive;
  final VoidCallback onTap;
  // วงกลมแดงมีตัวเลข = จำนวนเคสในหัวข้อนี้ที่เจ้าหน้าที่อัปเดตแล้วนักศึกษายังไม่ได้เปิดดู (0 = ไม่แสดง)
  final int unreadCount;

  @override
  Widget build(BuildContext context) {
    final textTheme = GoogleFonts.sarabunTextTheme(Theme.of(context).textTheme);

    return GestureDetector(
      onTap: onTap,
      child: Stack(
        children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            // หน้าโฮมวางเป็นกริด 2x2 (ใบละครึ่งจอ) ป้ายหัวข้อยาวสุด "อยู่ระหว่างการแก้ไข" ยังพอดี 1 บรรทัด
            // แต่เผื่อจอแคบให้ตัดเป็น 2 บรรทัดได้ จึงสูงพอสำหรับตัวเลข + ป้าย 2 บรรทัด (ฟอนต์ Sarabun สูงกว่าละติน)
            height: 92,
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 14),
            decoration: BoxDecoration(
              color: isActive ? color.withValues(alpha: 0.10) : Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isActive ? color : kGray200,
                width: isActive ? 1.5 : 1,
              ),
              boxShadow: [
                BoxShadow(
                  color: kNavy.withValues(alpha: 0.05),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$count',
                  style: textTheme.titleLarge?.copyWith(
                    fontSize: 22,
                    fontWeight: FontWeight.w800,
                    color: color,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  label,
                  // จำกัด 2 บรรทัด + ตัดด้วย "..." กันการ์ดล้นเมื่อป้ายยาวบนจอแคบ
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: textTheme.bodySmall?.copyWith(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w600,
                    color: kGray700,
                  ),
                ),
              ],
            ),
          ),
          if (unreadCount > 0)
            Positioned(
              top: 8,
              right: 8,
              // สไตล์เดียวกับตัวเลขบนกระดิ่งของหน้าโฮม (สีแดง สูง 18) — กว้างขึ้นเองเมื่อเป็นเลขหลายหลัก
              child: Container(
                constraints: const BoxConstraints(minWidth: 18),
                height: 18,
                padding: const EdgeInsets.symmetric(horizontal: 4),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: const Color(0xFFE11D48),
                  borderRadius: BorderRadius.circular(9),
                  border: Border.all(color: Colors.white, width: 1.5),
                ),
                child: Text(
                  unreadCount > 99 ? '99+' : '$unreadCount',
                  style: GoogleFonts.sarabun(
                    fontSize: 10.5,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                    height: 1.1,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
