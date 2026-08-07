import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:student_dorm/color/colors.dart';
import 'package:student_dorm/screen/history_screen.dart';
import 'package:student_dorm/screen/home_screen.dart';
import 'package:student_dorm/widgets/bottom_nav.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  void _onNavTap(BuildContext context, int index) {
    if (index == 2) return;
    if (index == 0) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const HomeScreen()),
      );
    } else if (index == 1) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const HistoryPage()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = GoogleFonts.sarabunTextTheme(Theme.of(context).textTheme);

    const double tabBarHeight = 64;
    const double tabBarBottom = 20;

    return Scaffold(
      backgroundColor: kGray100,
      body: SafeArea(
        child: Stack(
          children: [
            Center(
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
            Positioned(
              left: 20,
              right: 20,
              bottom: tabBarBottom,
              child: BottomNav(
                height: tabBarHeight,
                currentIndex: 2,
                onTap: (index) => _onNavTap(context, index),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
