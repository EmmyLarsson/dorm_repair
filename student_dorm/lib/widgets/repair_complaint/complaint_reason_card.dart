import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:student_dorm/color/colors.dart';

class ComplaintReason {
  final int id;
  final String label;

  const ComplaintReason({required this.id, required this.label});
}

// ต้องตรงกับข้อมูลในตาราง complaint_reason ฝั่ง backend (id 1-6, ยืนยันด้วย query จริงแล้ว) —
// hardcode ไว้เหมือนกับ kWorkTypes ใน work_type_chip.dart ที่ทำกับตาราง repair_type อยู่แล้ว
// เพราะรายการนี้เป็น fixed list ไม่ได้เปลี่ยนบ่อย ไม่จำเป็นต้องดึงจาก API แบบ dynamic
const List<ComplaintReason> kComplaintReasons = [
  ComplaintReason(id: 1, label: 'ซ่อมไม่เรียบร้อย'),
  ComplaintReason(id: 2, label: 'ซ่อมผิดจุด/ไม่ตรงปัญหาที่แจ้ง'),
  ComplaintReason(id: 3, label: 'ปัญหากลับมาเป็นซ้ำ'),
  ComplaintReason(id: 4, label: 'ช่างมาช้า/ไม่มาตามนัด'),
  ComplaintReason(id: 5, label: 'ใช้เวลาซ่อมนานเกินไป'),
  ComplaintReason(id: 6, label: 'อื่นๆ'),
];

/// การ์ดเลือกหมวดหมู่เหตุผล — เลือกได้ทีละ 1 ข้อ (choice chip แนวนอนแบบ Wrap เพราะข้อความยาวกว่า
/// ประเภทงานซ่อมใน work_type_chip.dart จึงไม่ใช้ grid คงที่แบบนั้น)
class ComplaintReasonCard extends StatelessWidget {
  final int? selectedId;
  final ValueChanged<int> onSelect;

  const ComplaintReasonCard({super.key, required this.selectedId, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFD0C6AB).withValues(alpha: 0.35)),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 3, offset: const Offset(0, 1)),
          BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 20, offset: const Offset(0, 6)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                // สีเขียวแทนสีส้ม (kRsAmber) เดิม — สีส้มซ้ำกับ ComplaintTextCard (รายละเอียดปัญหา) และ
                // สีฟ้า (kRsBlue) ที่ลองเปลี่ยนไปก่อนหน้านี้ก็ซ้ำกับ ComplaintPhotoCard (แนบรูป) อีกที
                // เขียวเป็นสีเดียวที่ยังไม่ถูกใช้เป็นไอคอนหัวการ์ดในหน้านี้เลย
                decoration: BoxDecoration(color: const Color(0xFFE8F5E9), borderRadius: BorderRadius.circular(14)),
                alignment: Alignment.center,
                child: const Icon(Icons.checklist, size: 22, color: kRsGreen),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('เหตุผลที่ไม่พอใจ', style: GoogleFonts.sarabun(fontSize: 15.5, fontWeight: FontWeight.w700, color: kRsOnSurface, height: 1.25)),
                    Padding(
                      padding: const EdgeInsets.only(top: 1),
                      child: Text(
                        'เลือกสิ่งที่ตรงกับปัญหามากที่สุด (จำเป็น)',
                        style: GoogleFonts.sarabun(fontSize: 11, fontWeight: FontWeight.w500, color: kRsMuted),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: kComplaintReasons.map((reason) {
              final isSelected = reason.id == selectedId;
              return GestureDetector(
                onTap: () => onSelect(reason.id),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(color: isSelected ? kRsBlue : kRsBorder, width: 1.5),
                    gradient: isSelected
                        ? const LinearGradient(colors: [Color(0xFFEFF2FF), Color(0xFFE6ECFF)])
                        : null,
                    color: isSelected ? null : kRsFieldBg,
                  ),
                  child: Text(
                    reason.label,
                    style: GoogleFonts.sarabun(
                      fontSize: 13,
                      fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                      color: isSelected ? const Color(0xFF2D46B3) : kRsMuted,
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}
