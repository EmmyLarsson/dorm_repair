import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:student_dorm/color/colors.dart';

/// การ์ด "ข้อมูลส่วนบุคคล" ในหน้าแก้ไขโปรไฟล์
/// ล็อก: ชื่อ, นามสกุล, รหัสนักศึกษา (เจ้าหน้าที่หอพักเป็นผู้แก้ไขในอนาคต)
/// แก้ไขได้: เบอร์โทรติดต่อ, หมายเลขห้องพัก
/// (โครงการ์ด/field ยกมาจากสไตล์ personal_info_form.dart, icon/หัวข้ออ้างอิงจาก
/// Prototype/Student/profile_edit.html)
class ProfilePersonalInfoCard extends StatelessWidget {
  const ProfilePersonalInfoCard({
    super.key,
    required this.firstname,
    required this.lastname,
    required this.studentNo,
    required this.phoneController,
    required this.roomController,
    required this.errorPhone,
    this.phoneErrorText,
    required this.errorRoom,
    this.roomErrorText,
    required this.onPhoneChanged,
    required this.onRoomChanged,
  });

  final String firstname;
  final String lastname;
  final String studentNo;

  final TextEditingController phoneController;
  final TextEditingController roomController;

  final bool errorPhone;
  // ข้อความ error เฉพาะของเบอร์โทร override ค่า default ('กรุณากรอกเบอร์โทรติดต่อ') ตอนที่ errorPhone
  // เกิดจากรูปแบบผิด (มีตัวอักษร/สัญลักษณ์ปน หรือจำนวนหลักไม่ครบ 10) ไม่ใช่แค่ไม่ได้กรอกเฉยๆ
  final String? phoneErrorText;
  final bool errorRoom;
  // ข้อความ error เฉพาะของหมายเลขห้อง override ค่า default ('กรุณากรอกหมายเลขห้องพัก') ตอนที่ errorRoom
  // เกิดจากรูปแบบ/ช่วงตัวเลขผิด ไม่ใช่แค่ไม่ได้กรอกเฉยๆ
  final String? roomErrorText;

  final ValueChanged<String> onPhoneChanged;
  final ValueChanged<String> onRoomChanged;

  @override
  Widget build(BuildContext context) {
    return _card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              _iconBadge(
                Icons.person,
                bg: const Color(0xFFFFF8D6),
                fg: kRsGoldText,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _cardTitle('ข้อมูลส่วนบุคคล'),
                    _cardSub('ชื่อ-นามสกุล และรหัสนักศึกษา ดูแลโดยเจ้าหน้าที่หอพัก'),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),

          _lockedField(
            icon: Icons.person_outline,
            label: 'ชื่อ',
            value: firstname,
          ),
          const SizedBox(height: 14),
          _lockedField(
            icon: Icons.person_outline,
            label: 'นามสกุล',
            value: lastname,
          ),
          const SizedBox(height: 14),
          _lockedField(
            icon: Icons.badge_outlined,
            label: 'รหัสนักศึกษา',
            value: studentNo,
          ),

          const SizedBox(height: 14),
          Container(
            height: 1,
            margin: const EdgeInsets.symmetric(vertical: 2),
            color: const Color(0xFFEDEAE0),
          ),
          const SizedBox(height: 14),

          _editableField(
            icon: Icons.call_outlined,
            label: 'เบอร์โทรติดต่อ',
            controller: phoneController,
            hint: '0xx-xxx-xxxx',
            isError: errorPhone,
            errorText: phoneErrorText ?? 'กรุณากรอกเบอร์โทรติดต่อ',
            keyboardType: TextInputType.phone,
            onChanged: onPhoneChanged,
          ),
          const SizedBox(height: 14),
          _editableField(
            icon: Icons.apartment_outlined,
            label: 'หมายเลขห้องพัก',
            controller: roomController,
            hint: 'เช่น 111320',
            isError: errorRoom,
            errorText: roomErrorText ?? 'กรุณากรอกหมายเลขห้องพัก',
            onChanged: onRoomChanged,
          ),
        ],
      ),
    );
  }

  Widget _lockedField({
    required IconData icon,
    required String label,
    required String value,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _fieldLabel(icon, label),
        const SizedBox(height: 6),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
          decoration: BoxDecoration(
            color: kRsSavedBg,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: kRsSavedBorder, width: 1.5),
          ),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  value.isEmpty ? '-' : value,
                  style: GoogleFonts.sarabun(
                    fontSize: 15,
                    color: kRsGoldText,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
              const Icon(Icons.lock_outline, size: 18, color: kRsMuted),
            ],
          ),
        ),
      ],
    );
  }

  Widget _editableField({
    required IconData icon,
    required String label,
    required TextEditingController controller,
    required String hint,
    required bool isError,
    required String errorText,
    required ValueChanged<String> onChanged,
    TextInputType? keyboardType,
  }) {
    final Color baseBorder = isError ? kRsError : kRsFieldBorder;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _fieldLabel(icon, label),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          style: GoogleFonts.sarabun(fontSize: 15, color: kRsOnSurface),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: GoogleFonts.sarabun(
              fontSize: 14,
              color: const Color(0xFFC0B8A8),
            ),
            filled: true,
            fillColor: kRsFieldBg,
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 13,
            ),
            border: _border(baseBorder),
            enabledBorder: _border(baseBorder),
            focusedBorder: _border(isError ? kRsError : kRsBlue),
            errorBorder: _border(kRsError),
          ),
          onChanged: onChanged,
        ),
        if (isError) ...[
          const SizedBox(height: 4),
          Text(
            errorText,
            style: GoogleFonts.sarabun(
              fontSize: 11.5,
              fontWeight: FontWeight.w500,
              color: kRsError,
            ),
          ),
        ],
      ],
    );
  }

  OutlineInputBorder _border(Color color) {
    return OutlineInputBorder(
      borderRadius: BorderRadius.circular(14),
      borderSide: BorderSide(color: color, width: 1.5),
    );
  }

  Widget _card({required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: const Color(0xFFD0C6AB).withValues(alpha: 0.35),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 3,
            offset: const Offset(0, 1),
          ),
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 20,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: child,
    );
  }

  Widget _iconBadge(IconData icon, {required Color bg, required Color fg}) {
    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(14)),
      alignment: Alignment.center,
      child: Icon(icon, size: 22, color: fg),
    );
  }

  Widget _cardTitle(String text) {
    return Text(
      text,
      style: GoogleFonts.sarabun(
        fontSize: 15.5,
        fontWeight: FontWeight.w700,
        color: kRsOnSurface,
        height: 1.25,
      ),
    );
  }

  Widget _cardSub(String text) {
    return Padding(
      padding: const EdgeInsets.only(top: 1),
      child: Text(
        text,
        style: GoogleFonts.sarabun(
          fontSize: 11,
          fontWeight: FontWeight.w500,
          color: kRsMuted,
        ),
      ),
    );
  }

  Widget _fieldLabel(IconData icon, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: kRsMuted),
        const SizedBox(width: 5),
        Text(
          text,
          style: GoogleFonts.sarabun(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: kRsOnSurfaceVar,
            letterSpacing: 0.4,
          ),
        ),
      ],
    );
  }
}
