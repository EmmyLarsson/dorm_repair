import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:student_dorm/color/colors.dart';
import 'package:student_dorm/widgets/history/sort_chip.dart';

/// แถวปุ่มกรองผลการประเมิน "แสดง: ทั้งหมด / สำเร็จ / ไม่สำเร็จ" ในส่วนหัวของหน้าประวัติการประเมิน
/// ไม่มี state ของตัวเอง (StatelessWidget) — ค่าที่เลือก (filterKey) เก็บที่หน้าจอ เพราะหน้าจอต้องใช้กรองรายการ
/// กดแล้วแจ้งกลับผ่าน onFilterTap เหมือน SortChip ที่ใช้อยู่ข้างใน
/// ค่า filterKey: all | success | failed
class EvaluationFilterChips extends StatelessWidget {
  const EvaluationFilterChips({super.key, required this.filterKey, required this.onFilterTap});

  final String filterKey;
  final ValueChanged<String> onFilterTap;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Text('แสดง',
            style: GoogleFonts.sarabun(fontSize: 12, fontWeight: FontWeight.w700, color: kGray400, letterSpacing: .5)),
        const SizedBox(width: 10),
        Expanded(
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                SortChip(
                  icon: Icons.apps,
                  label: 'ทั้งหมด',
                  active: filterKey == 'all',
                  onTap: () => onFilterTap('all'),
                ),
                const SizedBox(width: 7),
                SortChip(
                  icon: Icons.star,
                  label: 'สำเร็จ',
                  active: filterKey == 'success',
                  onTap: () => onFilterTap('success'),
                ),
                const SizedBox(width: 7),
                SortChip(
                  icon: Icons.cancel,
                  label: 'ไม่สำเร็จ',
                  active: filterKey == 'failed',
                  onTap: () => onFilterTap('failed'),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
