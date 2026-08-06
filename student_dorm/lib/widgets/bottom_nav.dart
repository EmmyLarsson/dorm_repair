import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:student_dorm/color/colors.dart';

class BottomNav extends StatelessWidget {
  final double height;
  
  const BottomNav({super.key,
   required this.height});

  @override
  Widget build(BuildContext context) {
    final textTheme = GoogleFonts.sarabunTextTheme(Theme.of(context).textTheme);
    return Container(
      height: height,
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [kGoldTabA, kGoldMid, kGoldTabC],
          stops: [0.0, 0.6, 1.0],
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFC8A000).withValues(alpha: 0.12),
            blurRadius: 32,
            offset: const Offset(0, 8),
          ),
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          _navItem(textTheme, icon: Icons.home, label: 'หน้าหลัก', active: true),
          const SizedBox(width: 4),
          _navItem(textTheme, icon: Icons.history, label: 'ประวัติแจ้ง', active: false),
          const SizedBox(width: 4),
          _navItem(textTheme, icon: Icons.person_outline, label: 'โปรไฟล์', active: false),
        ],
      ),
    );
  }

  Widget _navItem(
    TextTheme textTheme, {
    required IconData icon,
    required String label,
    required bool active,
  }) {
    // active: navy บนพื้นขาวโปร่งลอย (.nav-it.active)
    // inactive: navy จางๆ 40% opacity ไม่มีพื้นหลัง (.nav-it)
    final Color color = active ? kNavy : kNavyDark.withValues(alpha: 0.40);

    return Expanded(
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () {
          // TODO: นำทางไปหน้าที่เกี่ยวข้อง (history.html / profile.html)
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          curve: Curves.easeOut,
          decoration: BoxDecoration(
            color: active ? Colors.white.withValues(alpha: 0.60) : Colors.transparent,
            borderRadius: BorderRadius.circular(16),
            boxShadow: active
                ? [
                    BoxShadow(
                      color: const Color(0xFFC8A000).withValues(alpha: 0.22),
                      blurRadius: 10,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : null,
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                active ? _filledVariant(icon) : icon,
                color: color,
                size: 22,
              ),
              const SizedBox(height: 2),
              Text(
                label,
                style: textTheme.labelSmall?.copyWith(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: color,
                  letterSpacing: 0.03,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // แปลง icon outline → filled เมื่อ active (เลียนแบบ font-variation-settings 'FILL' 1 ของเว็บ)
  IconData _filledVariant(IconData icon) {
    if (icon == Icons.home) return Icons.home;
    if (icon == Icons.history) return Icons.history;
    if (icon == Icons.person_outline) return Icons.person;
    return icon;
  }
}

