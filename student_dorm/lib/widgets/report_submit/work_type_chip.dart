import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:student_dorm/color/colors.dart';

class WorkType {
  final String id;
  final String label;
  final IconData icon;

  const WorkType({required this.id, required this.label, required this.icon});
}

// ตรงกับ WORK_TYPES array ใน report_submit.js
const List<WorkType> kWorkTypes = [
  WorkType(id: '1', label: 'งานไฟฟ้า', icon: Icons.electrical_services),
  WorkType(id: '2', label: 'งานประปา', icon: Icons.plumbing),
  WorkType(id: '3', label: 'งานเฟอร์นิเจอร์', icon: Icons.chair_outlined),
  WorkType(id: '4', label: 'งานห้อง', icon: Icons.meeting_room_outlined),
  WorkType(id: '5', label: 'งานอินเทอร์เน็ต', icon: Icons.wifi),
  WorkType(id: '6', label: 'อื่นๆ', icon: Icons.more_horiz),
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
