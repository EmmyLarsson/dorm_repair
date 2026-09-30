import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:student_dorm/color/colors.dart';

/// การ์ดกรอกรายละเอียดปัญหา — รับแค่ controller จาก parent มาผูกกับ TextField
/// ไม่ได้เก็บ state ของตัวเองเลย จึงเป็น StatelessWidget ได้ (ตัวควบคุมค่าจริงอยู่ที่ parent)
class ComplaintTextCard extends StatelessWidget {
  final TextEditingController controller;

  const ComplaintTextCard({super.key, required this.controller});

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
                decoration: BoxDecoration(color: const Color(0xFFFFF3E0), borderRadius: BorderRadius.circular(14)),
                alignment: Alignment.center,
                child: const Icon(Icons.report_problem, size: 22, color: kRsAmber),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('รายละเอียดปัญหา', style: GoogleFonts.sarabun(fontSize: 15.5, fontWeight: FontWeight.w700, color: kRsOnSurface, height: 1.25)),
                    Padding(
                      padding: const EdgeInsets.only(top: 1),
                      child: Text(
                        'อธิบายจุดที่ยังไม่เรียบร้อยจากการซ่อม (จำเป็น)',
                        style: GoogleFonts.sarabun(fontSize: 11, fontWeight: FontWeight.w500, color: kRsMuted),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          TextField(
            controller: controller,
            maxLines: 5,
            // เดิมใช้ GoogleFonts.inter() ซึ่งเป็นฟอนต์ Latin-only ไม่มีตัวอักษรไทย พอเรนเดอร์ข้อความไทย
            // เลยหลุดไป fallback เป็นฟอนต์ระบบเริ่มต้นแทน หน้าตาต่างจาก Sarabun ที่ใช้อยู่ทุกจุดอื่นในหน้านี้
            style: GoogleFonts.sarabun(fontSize: 15, color: kRsOnSurface),
            decoration: InputDecoration(
              hintText: 'เช่น ซ่อมแล้วแต่ยังไม่สามารถใช้งานได้ปกติ...',
              hintStyle: GoogleFonts.sarabun(fontSize: 15, color: const Color(0xFFC0B8A8)),
              filled: true,
              fillColor: kRsFieldBg,
              contentPadding: const EdgeInsets.all(16),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: kRsFieldBorder, width: 1.5)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: kRsFieldBorder, width: 1.5)),
              focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: kRsBlue, width: 1.5)),
            ),
          ),
        ],
      ),
    );
  }
}
