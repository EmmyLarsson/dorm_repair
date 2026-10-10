import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:student_dorm/color/colors.dart';
import 'package:student_dorm/widgets/evaluation_history/evaluation_filter_chips.dart';
import 'package:student_dorm/widgets/history/sort_chip.dart';

/// หัวทองของหน้าประวัติการประเมิน — โครงเดียวกับ _HistoryHeader ของหน้าประวัติการแจ้งซ่อม
/// (ค้นหา + ปุ่มเรียง) เพิ่มปุ่มย้อนกลับเพราะหน้านี้เปิดซ้อนจากหน้าโปรไฟล์ ไม่ใช่แท็บล่าง
class EvaluationHistoryHeader extends StatelessWidget {
  const EvaluationHistoryHeader({
    super.key,
    required this.total,
    required this.searchController,
    required this.onSearchChanged,
    required this.onClearSearch,
    required this.showClear,
    required this.sortKey,
    required this.dateDir,
    required this.onChipTap,
    required this.filterKey,
    required this.onFilterTap,
    required this.onBack,
  });

  final int total;
  final TextEditingController searchController;
  final ValueChanged<String> onSearchChanged;
  final VoidCallback onClearSearch;
  final bool showClear;
  final String sortKey; // date | rating | type
  final String dateDir; // desc | asc
  final ValueChanged<String> onChipTap;
  final String filterKey; // all | success | failed
  final ValueChanged<String> onFilterTap;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(18, MediaQuery.of(context).padding.top + 8, 18, 0),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment(0, -1),
          end: Alignment(0, 1),
          colors: [kGoldLight, kGoldMid, kGoldDark],
          stops: [0.0, 0.5, 1.0],
        ),
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(30)),
        boxShadow: [BoxShadow(color: Color(0x47C8A000), blurRadius: 28, offset: Offset(0, 6))],
      ),
      child: Column(
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              InkWell(
                borderRadius: BorderRadius.circular(20),
                onTap: onBack,
                child: const SizedBox(
                  width: 40,
                  height: 40,
                  child: Icon(Icons.arrow_back_ios_new, size: 18, color: kRsOnPrimary),
                ),
              ),
              const SizedBox(width: 2),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('ประวัติการประเมิน',
                        style: GoogleFonts.sarabun(fontSize: 24, fontWeight: FontWeight.w800, color: kNavyDark)),
                    const SizedBox(height: 4),
                    Text('รีวิวงานซ่อมที่คุณเคยให้คะแนนไว้',
                        style: GoogleFonts.sarabun(
                            fontSize: 12, fontWeight: FontWeight.w500, color: const Color(0x8C0F2347))),
                  ],
                ),
              ),
              Container(
                margin: const EdgeInsets.only(top: 3),
                padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 5),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: .48),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text('$total รายการ',
                    style: GoogleFonts.sarabun(fontSize: 12, fontWeight: FontWeight.w700, color: kNavyDark)),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
            ),
            child: Column(
              children: [
                Container(
                  height: 44,
                  decoration: BoxDecoration(
                    color: kGray100,
                    border: Border.all(color: const Color(0xFFE2E8F4), width: 1.5),
                    borderRadius: BorderRadius.circular(11),
                  ),
                  child: Row(
                    children: [
                      const Padding(
                        padding: EdgeInsets.only(left: 12, right: 8),
                        child: Icon(Icons.search, size: 20, color: Color(0xFF94A3B8)),
                      ),
                      Expanded(
                        child: TextField(
                          controller: searchController,
                          onChanged: onSearchChanged,
                          // Sarabun เพราะช่องนี้พิมพ์ภาษาไทย (Inter ไม่มีตัวอักษรไทย ตามกฎ CLAUDE.md)
                          style: GoogleFonts.sarabun(fontSize: 14, color: kNavy),
                          decoration: InputDecoration(
                            isDense: true,
                            border: InputBorder.none,
                            hintText: 'ค้นหาหมายเลข Case หรือคำในรีวิว…',
                            hintStyle: GoogleFonts.sarabun(color: const Color(0xFFB0BAC8)),
                          ),
                        ),
                      ),
                      if (showClear)
                        Padding(
                          padding: const EdgeInsets.only(right: 10),
                          child: InkWell(
                            borderRadius: BorderRadius.circular(6),
                            onTap: onClearSearch,
                            child: const Padding(
                              padding: EdgeInsets.all(3),
                              child: Icon(Icons.close, size: 18, color: Color(0xFF94A3B8)),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
                // กรองตามผลของเคส: สำเร็จ (มีดาว) / ไม่สำเร็จ (ไม่มีดาว) — ปุ่มเรียงตามคะแนนข้างล่างวางเคสไม่มีดาวไว้ท้ายสุด
                EvaluationFilterChips(filterKey: filterKey, onFilterTap: onFilterTap),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Text('เรียงตาม',
                        style: GoogleFonts.sarabun(
                            fontSize: 12, fontWeight: FontWeight.w700, color: kGray400, letterSpacing: .5)),
                    const SizedBox(width: 10),
                    Expanded(
                      child: SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: [
                            SortChip(
                              icon: Icons.calendar_today,
                              label: 'วันที่ประเมิน',
                              active: sortKey == 'date',
                              dirIcon: sortKey == 'date'
                                  ? (dateDir == 'desc' ? Icons.arrow_downward : Icons.arrow_upward)
                                  : null,
                              onTap: () => onChipTap('date'),
                            ),
                            const SizedBox(width: 7),
                            SortChip(
                              icon: Icons.star,
                              label: 'คะแนน',
                              active: sortKey == 'rating',
                              onTap: () => onChipTap('rating'),
                            ),
                            const SizedBox(width: 7),
                            SortChip(
                              icon: Icons.category,
                              label: 'ประเภทงาน',
                              active: sortKey == 'type',
                              onTap: () => onChipTap('type'),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
