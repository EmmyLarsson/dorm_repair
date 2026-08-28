import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:student_dorm/color/colors.dart';

/// เมนู "บัญชีของฉัน" ในหน้าโปรไฟล์: แก้ไขข้อมูล + ประวัติการประเมินงานซ่อม (ตกแต่งไว้ก่อน)
/// (สไตล์อ้างอิงจาก Prototype/Student/profile.css .menu-group / .menu-item)
class AccountMenuSection extends StatelessWidget {
  const AccountMenuSection({super.key, required this.onEditTap});

  final VoidCallback onEditTap;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Text(
            'บัญชีของฉัน',
            style: GoogleFonts.sarabun(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: kGray400,
              letterSpacing: 1.2,
            ),
          ),
        ),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFFEDF0F8), width: 1.5),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 14,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: Column(
            children: [
              _MenuItemTile(
                icon: Icons.edit,
                iconBg: kNavyLight,
                iconColor: kNavyMid,
                title: 'แก้ไขข้อมูล',
                subtitle: 'ชื่อ, ห้องพัก, ข้อมูลส่วนตัว',
                onTap: onEditTap,
                showDivider: true,
              ),
              _MenuItemTile(
                icon: Icons.rate_review_outlined,
                iconBg: const Color(0xFFFFF7CC),
                iconColor: const Color(0xFF92700A),
                title: 'ประวัติการประเมินงานซ่อม',
                subtitle: 'ดูคะแนนและความคิดเห็นที่เคยให้ไว้',
                badgeText: 'เร็วๆ นี้',
                onTap: () {
                  ScaffoldMessenger.of(context).clearSnackBars();
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      behavior: SnackBarBehavior.floating,
                      backgroundColor: const Color(0xFF2A2C2E),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                      margin: const EdgeInsets.only(
                        bottom: 84,
                        left: 40,
                        right: 40,
                      ),
                      content: Text(
                        'ฟีเจอร์นี้กำลังพัฒนา',
                        style: GoogleFonts.sarabun(
                          fontSize: 13,
                          color: const Color(0xFFF0F0F3),
                        ),
                      ),
                    ),
                  );
                },
                showDivider: false,
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _MenuItemTile extends StatelessWidget {
  const _MenuItemTile({
    required this.icon,
    required this.iconBg,
    required this.iconColor,
    required this.title,
    required this.subtitle,
    required this.onTap,
    required this.showDivider,
    this.badgeText,
  });

  final IconData icon;
  final Color iconBg;
  final Color iconColor;
  final String title;
  final String subtitle;
  final VoidCallback onTap;
  final bool showDivider;
  final String? badgeText;

  @override
  Widget build(BuildContext context) {
    final bool isDecorative = badgeText != null;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 15),
          decoration: showDivider
              ? const BoxDecoration(
                  border: Border(
                    bottom: BorderSide(color: Color(0xFFF0F3FA), width: 1),
                  ),
                )
              : null,
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: iconBg,
                  borderRadius: BorderRadius.circular(14),
                ),
                alignment: Alignment.center,
                child: Icon(icon, size: 21, color: iconColor),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          title,
                          style: GoogleFonts.sarabun(
                            fontSize: 15,
                            fontWeight: FontWeight.w700,
                            color: isDecorative
                                ? const Color(0xFF9CA3AF)
                                : const Color(0xFF1F2937),
                          ),
                        ),
                        if (badgeText != null) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: kGray100,
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Text(
                              badgeText!,
                              style: GoogleFonts.sarabun(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: kGray500,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: GoogleFonts.sarabun(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: kGray400,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(
                Icons.chevron_right,
                size: 20,
                color: isDecorative
                    ? kGray200
                    : const Color(0xFFC8D0E4),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
