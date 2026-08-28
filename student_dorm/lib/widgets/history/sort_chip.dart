import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:student_dorm/color/colors.dart';

/* ═══════════════════════════════════════════════════════════
   SortChip — STATELESS
   เหตุผล: chip เดี่ยว ๆ ไม่มี state ของตัวเอง — active/dirIcon
   ถูกกำหนดจาก parent ทั้งหมด กด (onTap) แล้วแจ้ง parent ให้ setState
   ═══════════════════════════════════════════════════════════ */
class SortChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool active;
  final IconData? dirIcon;
  final VoidCallback onTap;

  const SortChip({
    super.key,
    required this.icon,
    required this.label,
    required this.active,
    required this.onTap,
    this.dirIcon,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(999),
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.fromLTRB(10, 7, 12, 7),
        decoration: BoxDecoration(
          color: active ? kNavy : kGray100,
          borderRadius: BorderRadius.circular(999),
          boxShadow: active
              ? [const BoxShadow(color: Color(0x481A3A6C), blurRadius: 12, offset: Offset(0, 3))]
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 17, color: active ? Colors.white : const Color(0xFF6B7280)),
            const SizedBox(width: 4),
            Text(label,
                style: GoogleFonts.sarabun(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: active ? Colors.white : const Color(0xFF6B7280))),
            if (active && dirIcon != null) ...[
              const SizedBox(width: 4),
              Icon(dirIcon, size: 15, color: Colors.white),
            ],
          ],
        ),
      ),
    );
  }
}
