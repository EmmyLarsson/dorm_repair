import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:student_dorm/color/colors.dart';

/// AppBar ของหน้ายื่นคำร้องแจ้งแก้ไข — เนื้อหาคงที่ทั้งหมด ไม่มี state ของตัวเอง
/// จึงเป็น StatelessWidget ได้ (ปุ่มย้อนกลับใช้ Navigator ผ่าน context ตรงๆ ไม่ต้องรับ callback)
class ComplaintAppBar extends StatelessWidget {
  const ComplaintAppBar({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(top: MediaQuery.of(context).padding.top),
      decoration: BoxDecoration(
        gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [kRsGold, kRsGoldLight]),
        borderRadius: const BorderRadius.only(bottomLeft: Radius.circular(28), bottomRight: Radius.circular(28)),
        boxShadow: [BoxShadow(color: kRsGoldText.withValues(alpha: 0.18), blurRadius: 10, offset: const Offset(0, 2))],
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 14, 20, 17),
        child: Row(
          children: [
            Material(
              color: Colors.transparent,
              child: InkWell(
                borderRadius: BorderRadius.circular(20),
                onTap: () => Navigator.of(context).maybePop(),
                child: Container(
                  width: 40,
                  height: 40,
                  alignment: Alignment.center,
                  child: const Icon(Icons.close, size: 20, color: kRsOnPrimary),
                ),
              ),
            ),
            const SizedBox(width: 4),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'ยื่นคำร้องแจ้งแก้ไข',
                    style: GoogleFonts.sarabun(fontSize: 20, fontWeight: FontWeight.w800, color: kRsOnPrimary, letterSpacing: -0.3, height: 1.2),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'บอกเราว่าผลการซ่อมยังมีจุดไหนไม่เรียบร้อย',
                    style: GoogleFonts.sarabun(fontSize: 11.5, fontWeight: FontWeight.w500, color: kRsOnPrimary.withValues(alpha: 0.52)),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
