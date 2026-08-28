import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:student_dorm/color/colors.dart';

/// ส่วนหัวหน้าโปรไฟล์: รูปวงกลม + ชื่อ-นามสกุล + รหัสนักศึกษา + หมายเลขห้องพัก
/// (สไตล์อ้างอิงจาก Prototype/Student/profile.css .profile-header)
class ProfileHeader extends StatelessWidget {
  const ProfileHeader({
    super.key,
    required this.fullName,
    required this.studentNo,
    required this.roomNumber,
  });

  final String fullName;
  final String studentNo;
  final String roomNumber;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(20, 40, 20, 32),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [kGoldLight, kGold, kGoldDark],
          stops: [0.0, 0.5, 1.0],
        ),
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(36),
          bottomRight: Radius.circular(36),
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFC8A000).withValues(alpha: 0.30),
            blurRadius: 28,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        children: [
          _buildAvatar(),
          const SizedBox(height: 16),
          Text(
            fullName.isEmpty ? '-' : fullName,
            textAlign: TextAlign.center,
            style: GoogleFonts.sarabun(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: kNavyDark,
              height: 1.25,
            ),
          ),
          const SizedBox(height: 10),
          _idBadge(
            icon: Icons.badge,
            label: 'หมายเลขนักศึกษา',
            value: studentNo,
          ),
          const SizedBox(height: 8),
          _idBadge(
            icon: Icons.meeting_room_outlined,
            label: 'หมายเลขห้องพัก',
            value: roomNumber,
          ),
        ],
      ),
    );
  }

  Widget _buildAvatar() {
    return SizedBox(
      width: 108,
      height: 108,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Container(
            width: 108,
            height: 108,
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  Colors.white.withValues(alpha: 0.95),
                  Colors.white.withValues(alpha: 0.45),
                ],
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.15),
                  blurRadius: 28,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Container(
              decoration: const BoxDecoration(
                color: kNavyLight,
                shape: BoxShape.circle,
              ),
              alignment: Alignment.center,
              child: const Icon(Icons.person, size: 52, color: kNavyMid),
            ),
          ),
          Positioned(
            bottom: 2,
            right: 2,
            child: Container(
              width: 20,
              height: 20,
              decoration: BoxDecoration(
                color: kRsGreen,
                shape: BoxShape.circle,
                border: Border.all(color: kGold, width: 3),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.18),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _idBadge({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.58),
        borderRadius: BorderRadius.circular(999),
        boxShadow: [
          BoxShadow(
            color: Colors.white.withValues(alpha: 0.8),
            blurRadius: 0,
            offset: const Offset(0, 1),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 15, color: kNavy),
          const SizedBox(width: 6),
          Text(
            label,
            style: GoogleFonts.sarabun(
              fontSize: 12.5,
              fontWeight: FontWeight.w700,
              color: kNavy,
              letterSpacing: 0.02,
            ),
          ),
          const SizedBox(width: 4),
          Text(
            value.isEmpty ? '-' : value,
            style: GoogleFonts.sarabun(
              fontSize: 12.5,
              fontWeight: FontWeight.w800,
              color: kNavy,
              letterSpacing: 0.02,
            ),
          ),
        ],
      ),
    );
  }
}
