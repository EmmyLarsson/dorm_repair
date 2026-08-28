import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:student_dorm/color/colors.dart';

/// ปุ่มออกจากระบบ + popup ยืนยัน (สไตล์อ้างอิงจาก Prototype/Student/profile.css .btn-logout)
class LogoutSection extends StatelessWidget {
  const LogoutSection({super.key, required this.onConfirmLogout});

  /// เรียกหลังผู้ใช้กดยืนยัน "ออกจากระบบ" ใน popup แล้ว
  final Future<void> Function() onConfirmLogout;

  Future<void> _showConfirmDialog(BuildContext context) async {
    final bool? confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
          ),
          title: Text(
            'ยืนยันการออกจากระบบ',
            style: GoogleFonts.sarabun(
              fontSize: 17,
              fontWeight: FontWeight.w700,
              color: kNavyDark,
            ),
          ),
          content: Text(
            'คุณต้องการออกจากระบบใช่หรือไม่?',
            style: GoogleFonts.sarabun(fontSize: 14, color: kGray500),
          ),
          actionsPadding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(false),
              child: Text(
                'ยกเลิก',
                style: GoogleFonts.sarabun(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: kGray500,
                ),
              ),
            ),
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: kRsError,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              onPressed: () => Navigator.of(dialogContext).pop(true),
              child: Text(
                'ออกจากระบบ',
                style: GoogleFonts.sarabun(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        );
      },
    );

    if (confirmed == true) {
      await onConfirmLogout();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        SizedBox(
          width: double.infinity,
          height: 54,
          child: Material(
            color: Colors.transparent,
            child: Ink(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [kNavyMid, kNavyDark],
                ),
                boxShadow: [
                  BoxShadow(
                    color: kNavy.withValues(alpha: 0.40),
                    blurRadius: 24,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: InkWell(
                borderRadius: BorderRadius.circular(20),
                onTap: () => _showConfirmDialog(context),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.logout, color: Colors.white, size: 20),
                    const SizedBox(width: 10),
                    Text(
                      'ออกจากระบบ',
                      style: GoogleFonts.sarabun(
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                        letterSpacing: 0.02,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        const SizedBox(height: 18),
        Text(
          'ระบบแจ้งซ่อมหอพัก 10-11 ม.อ.หาดใหญ่ · v1.0.0',
          textAlign: TextAlign.center,
          style: GoogleFonts.sarabun(fontSize: 11, color: kGray400),
        ),
      ],
    );
  }
}
