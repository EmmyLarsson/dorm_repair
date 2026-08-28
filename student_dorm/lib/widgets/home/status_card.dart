import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:student_dorm/color/colors.dart';

class StatusCard extends StatelessWidget {
  const StatusCard({
    super.key,
    required this.filterKey,
    required this.count,
    required this.label,
    required this.color,
    required this.isActive,
    required this.onTap,
  });

  final String filterKey;
  final int count;
  final String label;
  final Color color;
  final bool isActive;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final textTheme = GoogleFonts.sarabunTextTheme(Theme.of(context).textTheme);

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
        decoration: BoxDecoration(
          color: isActive ? color.withValues(alpha: 0.10) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isActive ? color : kGray200,
            width: isActive ? 1.5 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: kNavy.withValues(alpha: 0.05),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          children: [
            Text(
              '$count',
              style: textTheme.titleLarge?.copyWith(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: color,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              textAlign: TextAlign.center,
              style: textTheme.bodySmall?.copyWith(
                fontSize: 11.5,
                fontWeight: FontWeight.w600,
                color: kGray500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}