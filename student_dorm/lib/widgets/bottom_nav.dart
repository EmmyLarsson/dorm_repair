import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:student_dorm/color/colors.dart';

class BottomNav extends StatelessWidget {
  final double height;
  final int currentIndex;
  final ValueChanged<int> onTap;

  static const _items = [
    (Icons.home, 'หน้าหลัก'),
    (Icons.history, 'ประวัติแจ้ง'),
    (Icons.person, 'โปรไฟล์'),
  ];

  const BottomNav({
    super.key,
    required this.height,
    required this.currentIndex,
    required this.onTap,
  });

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
          final (icon, label) = _items[i];
          return _navItem(
            textTheme,
            icon: icon,
            label: label,
            active: i == currentIndex,
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
    return Expanded(
      child: _NavItem(
        textTheme: textTheme,
        icon: icon,
        label: label,
        active: active,
        onTap: onTap,
      ),
    );
  }
}

class _NavItem extends StatefulWidget {
  final TextTheme textTheme;
  final IconData icon;
  final String label;
  final bool active;
  final VoidCallback onTap;

  const _NavItem({
    required this.textTheme,
    required this.icon,
    required this.label,
    required this.active,
    required this.onTap,
  });

  @override
  State<_NavItem> createState() => _NavItemState();
}

class _NavItemState extends State<_NavItem> {
  bool _pressed = false;

  void _setPressed(bool value) {
    if (_pressed != value) setState(() => _pressed = value);
  }

  @override
  Widget build(BuildContext context) {
    // active: navy บนพื้นขาวโปร่งลอย (.nav-it.active)
    // inactive: navy จางๆ 40% opacity ไม่มีพื้นหลัง (.nav-it)
    final Color color = widget.active ? kNavy : kNavyDark.withValues(alpha: 0.40);

    return AnimatedScale(
      scale: _pressed ? 0.94 : 1.0,
      duration: const Duration(milliseconds: 100),
      curve: Curves.easeOut,
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          splashColor: Colors.white.withValues(alpha: 0.28),
          highlightColor: Colors.white.withValues(alpha: 0.28),
          onTap: widget.onTap,
          onHighlightChanged: _setPressed,
          child: Container(
            decoration: BoxDecoration(
              color: widget.active ? Colors.white.withValues(alpha: 0.60) : Colors.transparent,
              borderRadius: BorderRadius.circular(16),
              boxShadow: widget.active
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
                  widget.icon,
                  color: color,
                  size: 22,
                ),
                const SizedBox(height: 2),
                Text(
                  widget.label,
                  style: widget.textTheme.labelSmall?.copyWith(
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
      ),
    );
  }
}
