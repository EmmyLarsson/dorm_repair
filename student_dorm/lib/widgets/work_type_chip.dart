import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

// ── Design tokens เฉพาะหน้านี้ (อ้างอิงจาก report_submit.css) ──────
// หมายเหตุ: หน้านี้ใช้ theme สีทอง/น้ำเงิน (indigo) คนละชุดกับหน้า
// login/home ที่เป็น navy/gold ล้วน จึงประกาศ tokens แยกในไฟล์นี้
const Color kRsGoldText   = Color(0xFF705D00); // primary
const Color kRsBlue       = Color(0xFF3B5BDB); // secondary-ish (blue accent)
const Color kRsOnSurface  = Color(0xFF1A1C1E);
const Color kRsMuted      = Color(0xFF4D4732); // on-surface-variant
const Color kRsBorder     = Color(0xFFE0DAC8);
const Color kRsFieldBg    = Color(0xFFFAF9F5);
const Color kRsChipIcon   = Color(0xFF8E8672);

class WorkType {
  final String id;
  final String label;
  final IconData icon;

  const WorkType({required this.id, required this.label, required this.icon});
}

// ตรงกับ WORK_TYPES array ใน report_submit.js
const List<WorkType> kWorkTypes = [
  WorkType(id: 'electric', label: 'ไฟฟ้า', icon: Icons.bolt),
  WorkType(id: 'plumbing', label: 'ประปา', icon: Icons.plumbing),
  WorkType(id: 'furniture', label: 'เฟอร์นิเจอร์', icon: Icons.chair),
  WorkType(id: 'room', label: 'งานห้อง', icon: Icons.construction),
  WorkType(id: 'internet', label: 'อินเทอร์เน็ต', icon: Icons.router),
  WorkType(id: 'other', label: 'อื่นๆ', icon: Icons.more_horiz),
];

/// การ์ด chip เดี่ยวสำหรับเลือกประเภทงาน (ตาม .work-chip)
class WorkTypeChip extends StatelessWidget {
  final WorkType workType;
  final bool isSelected;
  final VoidCallback onTap;

  const WorkTypeChip({
    super.key,
    required this.workType,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final textTheme = GoogleFonts.sarabunTextTheme(Theme.of(context).textTheme);

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOut,
        alignment: Alignment.center,
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? kRsBlue : kRsBorder,
            width: 1.5,
          ),
          gradient: isSelected
              ? const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xFFEFF2FF), Color(0xFFE6ECFF)],
                )
              : null,
          color: isSelected ? null : kRsFieldBg,
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: kRsBlue.withValues(alpha: 0.16),
                    blurRadius: 12,
                    offset: const Offset(0, 3),
                  ),
                ]
              : null,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              workType.icon,
              size: 20,
              color: isSelected ? kRsBlue : kRsChipIcon,
            ),
            const SizedBox(height: 4),
            Text(
              workType.label,
              textAlign: TextAlign.center,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: textTheme.labelSmall?.copyWith(
                fontSize: 10,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                color: isSelected ? const Color(0xFF2D46B3) : kRsMuted,
                height: 1.2,
              ),
            ),
          ],
        ),
      ),
    );
  }
}