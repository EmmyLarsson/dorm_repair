import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:student_dorm/color/colors.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final textTheme = GoogleFonts.sarabunTextTheme(Theme.of(context).textTheme);

    return Scaffold(
      backgroundColor: kGray100,
      body: SafeArea(
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.construction_outlined, size: 56, color: kGray400),
              const SizedBox(height: 16),
              Text(
                'หน้าโปรไฟล์',
                style: textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: kNavy,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'กำลังพัฒนา',
                style: textTheme.bodyMedium?.copyWith(color: kGray500),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
