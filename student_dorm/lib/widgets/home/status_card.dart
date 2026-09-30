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
  });

  final String filterKey;
  final int count;
  final String label;
  final Color color;
  final bool isActive;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final textTheme = GoogleFonts.sarabunTextTheme(Theme.of(context).textTheme);

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        // สูงพอสำหรับตัวเลข + ป้าย 2 บรรทัด (ฟอนต์ Sarabun สูงกว่าฟอนต์ละติน) ถ้าเตี้ยกว่านี้ป้ายยาว
        // เช่น "รอตรวจสอบคำร้อง" จะล้นด้านล่าง (BOTTOM OVERFLOWED)
        height: 100,
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
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
              textAlign: TextAlign.center,
              // จำกัด 2 บรรทัด + ตัดด้วย "..." กันการ์ดสูงไม่เท่ากันตอนป้ายยาวไม่เท่ากัน
              // (เช่น "รอตรวจสอบคำร้อง" ยาวกว่าป้ายอื่นๆ ทำให้ตัดขึ้นบรรทัดใหม่ การ์ดเลยสูงกว่าเพื่อน)
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: textTheme.bodySmall?.copyWith(
                fontSize: 11.5,
                fontWeight: FontWeight.w600,
                color: kGray500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}