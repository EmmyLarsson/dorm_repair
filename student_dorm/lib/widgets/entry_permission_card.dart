import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:student_dorm/color/colors.dart';

/// กล่องเลือก "อนุญาตให้ช่างเข้าห้องไหม" — ดึงมาจากหน้าแจ้งซ่อม (report_submit_screen.dart) ตรงๆ
/// (กล่องข้อมูล + ปุ่มเลือก 2 ทาง) แยกเป็น widget กลางเพราะตอนนี้ใช้ร่วมกัน 2 จุด: หน้าแจ้งซ่อมครั้งแรก
/// และหน้ายื่นอุทธรณ์ (repair_complaint_screen.dart) — ต้องหน้าตาเหมือนกันทุกจุดตามที่ผู้ใช้ขอ (คุม design)
class EntryPermissionCard extends StatelessWidget {
  final bool? allowEntry;
  final ValueChanged<bool> onSelect;
  final String title;
  final String subtitle;

  const EntryPermissionCard({
    super.key,
    required this.allowEntry,
    required this.onSelect,
    this.title = 'การเข้าซ่อมในห้องพัก',
    this.subtitle = 'อนุญาตให้ช่างเข้าซ่อมในกรณีที่ท่านไม่อยู่ในห้อง',
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 13),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFFEFF2FF), Color(0xFFE8EEFF)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(15),
            border: Border.all(color: const Color(0xFFC5D0F5)),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.info, size: 18, color: kRsBlue),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: GoogleFonts.sarabun(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700,
                        color: kRsOnSurface,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: GoogleFonts.sarabun(
                        fontSize: 11.5,
                        color: kRsOnSurfaceVar,
                        height: 1.55,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _permButton(
                label: 'อนุญาต',
                icon: Icons.check_circle,
                isActive: allowEntry == true,
                activeColor: kRsGreen,
                activeBg: const LinearGradient(
                  colors: [Color(0xFFF0FAF0), Color(0xFFE8F5E9)],
                ),
                onTap: () => onSelect(true),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _permButton(
                label: 'ไม่อนุญาต',
                icon: Icons.cancel,
                isActive: allowEntry == false,
                activeColor: kRsError,
                activeBg: const LinearGradient(
                  colors: [Color(0xFFFFF2F1), Color(0xFFFFE8E6)],
                ),
                onTap: () => onSelect(false),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _permButton({
    required String label,
    required IconData icon,
    required bool isActive,
    required Color activeColor,
    required Gradient activeBg,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(vertical: 13, horizontal: 10),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(15),
          border: Border.all(
            color: isActive ? activeColor : kRsFieldBorder,
            width: 1.5,
          ),
          color: isActive ? null : kRsFieldBg,
          gradient: isActive ? activeBg : null,
          boxShadow: isActive
              ? [
                  BoxShadow(
                    color: activeColor.withValues(alpha: 0.14),
                    blurRadius: 12,
                    offset: const Offset(0, 3),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 18,
              color: isActive ? activeColor : kRsOnSurfaceVar,
            ),
            const SizedBox(width: 7),
            Text(
              label,
              style: GoogleFonts.sarabun(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: isActive ? activeColor : kRsOnSurfaceVar,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
