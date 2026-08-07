import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:student_dorm/color/colors.dart';

class BottomNav extends StatelessWidget {
  final double height;
  final int currentIndex;
  final ValueChanged<int> onTap;

  const BottomNav({
    super.key,
    required this.height,
    required this.currentIndex,
    required this.onTap,
  });

  static const _items = [
    (Icons.home_outlined, Icons.home, 'หน้าหลัก'),
    (Icons.history, Icons.history, 'ประวัติแจ้ง'),
    (Icons.person_outline, Icons.person, 'โปรไฟล์'),
  ];

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
        children: List.generate(_items.length, (i) {
          final (outlineIcon, filledIcon, label) = _items[i];
          final active = i == currentIndex;
          return _navItem(
            textTheme,
            icon: active ? filledIcon : outlineIcon,
            label: label,
            active: active,
            onTap: () => onTap(i),
          );
        }),
      ),
    );
  }

  Widget _navItem(
    TextTheme textTheme, {
    required IconData icon,
    required String label,
    required bool active,
    required VoidCallback onTap,
  }) {
    // active: navy บนพื้นขาวโปร่งลอย (.nav-it.active)
    // inactive: navy จางๆ 40% opacity ไม่มีพื้นหลัง (.nav-it)
    final Color color = active ? kNavy : kNavyDark.withValues(alpha: 0.40);

    return Expanded(
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
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
              Icon(icon, color: color, size: 22),
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
}
