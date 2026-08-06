import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:student_dorm/color/colors.dart';

class PersonalInfoForm extends StatelessWidget {
  const PersonalInfoForm({
    super.key,
    required this.nameController,
    required this.phoneController,
    required this.roomController,
    required this.infoMode,
    required this.errorName,
    required this.errorPhone,
    required this.errorRoom,
    required this.onInfoModeChanged,
    required this.onNameChanged,
    required this.onPhoneChanged,
    required this.onRoomChanged,
  });

  final TextEditingController nameController;
  final TextEditingController phoneController;
  final TextEditingController roomController;

  final String infoMode;

  final bool errorName;
  final bool errorPhone;
  final bool errorRoom;

  final ValueChanged<String> onInfoModeChanged;
  final ValueChanged<String> onNameChanged;
  final ValueChanged<String> onPhoneChanged;
  final ValueChanged<String> onRoomChanged;

  @override
  Widget build(BuildContext context) {
    final bool isSaved = infoMode == 'saved';

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
                    _cardTitle('ข้อมูลส่วนตัว'),
                    _cardSub('ผู้แจ้งซ่อม'),
                  ],
                ),
              ),
              _buildTogglePill(),
            ],
          ),
          const SizedBox(height: 18),

          _fieldGroup(
            icon: Icons.badge_outlined,
            label: 'ชื่อผู้แจ้ง',
            controller: nameController,
            hint: 'ชื่อ-นามสกุล',
            isError: errorName,
            errorText: 'กรุณากรอกชื่อผู้แจ้ง',
            readOnly: isSaved,
            onChanged: onNameChanged,
          ),
          const SizedBox(height: 14),

          _fieldGroup(
            icon: Icons.phone_outlined,
            label: 'เบอร์โทรติดต่อ',
            controller: phoneController,
            hint: '0xx-xxx-xxxx',
            isError: errorPhone,
            errorText: 'กรุณากรอกเบอร์โทรติดต่อ',
            readOnly: isSaved,
            keyboardType: TextInputType.phone,
            onChanged: onPhoneChanged,
          ),
          const SizedBox(height: 14),

          _fieldGroup(
            icon: Icons.meeting_room_outlined,
            label: 'หมายเลขห้องพัก',
            controller: roomController,
            hint: 'เช่น 110912',
            isError: errorRoom,
            errorText: 'กรุณากรอกหมายเลขห้องพัก',
            readOnly: isSaved,
            onChanged: onRoomChanged,
          ),
        ],
      ),
    );
  }

  Widget _buildTogglePill() {
    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: const Color(0xFFEEECE5),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          _toggleBtn(
            'ข้อมูลใหม่',
            isOn: infoMode == 'new',
            onTap: () => onInfoModeChanged('new'),
          ),
          _toggleBtn(
            'ข้อมูลเดิม',
            isOn: infoMode == 'saved',
            onTap: () => onInfoModeChanged('saved'),
          ),
        ],
      ),
    );
  }

  Widget _toggleBtn(
    String label, {
    required bool isOn,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOut,
        padding: const EdgeInsets.symmetric(
          horizontal: 10,
          vertical: 5,
        ),
        decoration: BoxDecoration(
          color: isOn ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(999),
          boxShadow: isOn
              ? [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.14),
                    blurRadius: 4,
                    offset: const Offset(0, 1),
                  ),
                ]
              : null,
        ),
        child: Text(
          label,
          style: GoogleFonts.sarabun(
            fontSize: 10,
            fontWeight: FontWeight.w700,
            color: isOn
                ? kRsGoldText
                : const Color(0xFF7E775F),
          ),
        ),
      ),
    );
  }

  Widget _fieldGroup({
    required IconData icon,
    required String label,
    required TextEditingController controller,
    required String hint,
    required bool isError,
    required String errorText,
    required ValueChanged<String> onChanged,
    bool readOnly = false,
    TextInputType? keyboardType,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _fieldLabel(icon, label),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          readOnly: readOnly,
          keyboardType: keyboardType,
          style: GoogleFonts.sarabun(
            fontSize: 15,
            color: readOnly
                ? kRsGoldText
                : kRsOnSurface,
            fontWeight: readOnly
                ? FontWeight.w500
                : FontWeight.w400,
          ),
          decoration: _fieldDecoration(
            hint: hint,
            isError: isError,
            isSaved: readOnly,
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

  Widget _card({
    required Widget child,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: const Color(0xFFD0C6AB)
              .withValues(alpha: 0.35),
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

  Widget _iconBadge(
    IconData icon, {
    required Color bg,
    required Color fg,
  }) {
    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(14),
      ),
      alignment: Alignment.center,
      child: Icon(
        icon,
        size: 22,
        color: fg,
      ),
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

  Widget _fieldLabel(
    IconData icon,
    String text,
  ) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          icon,
          size: 14,
          color: kRsMuted,
        ),
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

  InputDecoration _fieldDecoration({
    required String hint,
    required bool isError,
    bool isSaved = false,
  }) {
    OutlineInputBorder border(
      Color color,
      double width,
    ) {
      return OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(
          color: color,
          width: width,
        ),
      );
    }

    final Color baseBorder =
        isError ? kRsError : kRsFieldBorder;

    return InputDecoration(
      hintText: hint,
      hintStyle: GoogleFonts.sarabun(
        fontSize: 14,
        color: const Color(0xFFC0B8A8),
      ),
      filled: true,
      fillColor: isSaved
          ? kRsSavedBg
          : kRsFieldBg,
      contentPadding: const EdgeInsets.symmetric(
        horizontal: 16,
        vertical: 13,
      ),
      border: border(
        isSaved ? kRsSavedBorder : baseBorder,
        1.5,
      ),
      enabledBorder: border(
        isSaved ? kRsSavedBorder : baseBorder,
        1.5,
      ),
      focusedBorder: border(
        isError ? kRsError : kRsBlue,
        1.5,
      ),
      errorBorder: border(
        kRsError,
        1.5,
      ),
      disabledBorder: border(
        kRsSavedBorder,
        1.5,
      ),
    );
  }
}