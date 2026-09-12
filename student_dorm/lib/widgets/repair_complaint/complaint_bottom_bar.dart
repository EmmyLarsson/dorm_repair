import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:student_dorm/color/colors.dart';

/// แถบปุ่ม "ส่งคำร้อง" ด้านล่างจอ — รับแค่สถานะกำลังส่ง + callback จาก parent
/// ไม่มี state ของตัวเอง เป็น StatelessWidget ได้
class ComplaintBottomBar extends StatelessWidget {
  final bool isSubmitting;
  final VoidCallback onSubmit;

  const ComplaintBottomBar({super.key, required this.isSubmitting, required this.onSubmit});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(20, 14, 20, 24 + MediaQuery.of(context).padding.bottom),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [kRsSurface.withValues(alpha: 0.0), kRsSurface.withValues(alpha: 0.6), kRsSurface],
          stops: const [0.0, 0.4, 1.0],
        ),
      ),
      child: SizedBox(
        height: 54,
        child: Material(
          color: Colors.transparent,
          child: Ink(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(999),
              gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [kRsNavyMid, kRsNavyDark]),
              boxShadow: [BoxShadow(color: kRsNavy.withValues(alpha: 0.4), blurRadius: 24, offset: const Offset(0, 6))],
            ),
            child: InkWell(
              borderRadius: BorderRadius.circular(999),
              onTap: isSubmitting ? null : onSubmit,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.send, color: Colors.white, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    isSubmitting ? 'กำลังส่ง...' : 'ส่งคำร้อง',
                    style: GoogleFonts.sarabun(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
