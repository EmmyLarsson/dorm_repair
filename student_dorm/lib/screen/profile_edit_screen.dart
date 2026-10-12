import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:student_dorm/color/colors.dart';
import 'package:student_dorm/models/student_profile_model.dart';
import 'package:student_dorm/utils/app_api.dart';
import 'package:student_dorm/widgets/profile_edit/profile_avatar_picker.dart';
import 'package:student_dorm/widgets/profile_edit/profile_personal_info_card.dart';
import 'package:student_dorm/utils/validators.dart';
import 'package:student_dorm/utils/phone_formatter.dart';

class ProfileEditScreen extends StatefulWidget {
  const ProfileEditScreen({super.key, required this.profile});

  final StudentProfile profile;

  @override
  State<ProfileEditScreen> createState() => _ProfileEditScreenState();
}

class _ProfileEditScreenState extends State<ProfileEditScreen> {
  late final TextEditingController _phoneController;
  late final TextEditingController _roomController;

  bool _errPhone = false;
  // override ข้อความ error ของเบอร์โทร ตอนที่สาเหตุคือรูปแบบผิด ไม่ใช่แค่ไม่ได้กรอก (null = ใช้ข้อความ
  // default "กรุณากรอกเบอร์โทรติดต่อ" ที่ ProfilePersonalInfoCard กำหนดไว้)
  String? _phoneErrorText;
  bool _errRoom = false;
  // override ข้อความ error ของหมายเลขห้อง ตอนที่สาเหตุคือรูปแบบ/ช่วงตัวเลขผิด ไม่ใช่แค่ไม่ได้กรอก
  // (null = ใช้ข้อความ default "กรุณากรอกหมายเลขห้องพัก" ที่ ProfilePersonalInfoCard กำหนดไว้)
  String? _roomErrorText;
  bool _isSaving = false;
  bool _didSave = false;

  @override
  void initState() {
    super.initState();
    _phoneController = TextEditingController(text: formatPhoneDisplay(widget.profile.phone));
    _roomController = TextEditingController(text: widget.profile.roomNumber);
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _roomController.dispose();
    super.dispose();
  }

  bool _validateForm() {
    setState(() {
      final phoneValue = phoneDigitsOnly(_phoneController.text);
      if (phoneValue.isEmpty) {
        _errPhone = true;
        _phoneErrorText = null; // ใช้ข้อความ default "กรุณากรอกเบอร์โทรติดต่อ"
      } else {
        _phoneErrorText = validatePhoneNumber(phoneValue);
        _errPhone = _phoneErrorText != null;
      }

      final roomValue = _roomController.text.trim();
      if (roomValue.isEmpty) {
        _errRoom = true;
        _roomErrorText = null; // ใช้ข้อความ default "กรุณากรอกหมายเลขห้องพัก"
      } else {
        _roomErrorText = validateRoomNumber(roomValue);
        _errRoom = _roomErrorText != null;
      }
    });
    return !(_errPhone || _errRoom);
  }

  Future<(bool, String)> _doUpdateProfile() async {
    final response = await AppAPI.post('/profile/update', {
      'phone': phoneDigitsOnly(_phoneController.text),
      'room_number': _roomController.text.trim(),
    });
    final Map<String, dynamic> json = jsonDecode(response.body);
    final bool isError = json['isError'] == true;
    final String errorMessage = json['errorMessage'] ?? '';

    return (isError, errorMessage);
  }

  Future<void> _handleSave() async {
    if (!_validateForm() || _isSaving) return;

    setState(() {
      _isSaving = true;
    });

    final (isError, errorMessage) = await _doUpdateProfile();

    if (!mounted) return;

    setState(() {
      _isSaving = false;
    });

    if (isError) {
      showDialog(
        context: context,
        builder: (context) => AlertDialog(content: Text(errorMessage)),
      );
      return;
    }

    _didSave = true;
    _showSuccessDialog();
  }

  void _showSuccessDialog() {
    showDialog(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: const LinearGradient(
                    colors: [kRsGreen, Color(0xFF4CAF50)],
                  ),
                ),
                child: const Icon(Icons.check, color: Colors.white, size: 32),
              ),
              const SizedBox(height: 16),
              Text(
                'บันทึกข้อมูลสำเร็จ',
                style: GoogleFonts.sarabun(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: kRsOnSurface,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'ข้อมูลของคุณได้รับการอัปเดตเรียบร้อยแล้ว',
                textAlign: TextAlign.center,
                style: GoogleFonts.sarabun(fontSize: 13, color: kRsMuted),
              ),
            ],
          ),
          actionsAlignment: MainAxisAlignment.center,
          actions: [
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                style: FilledButton.styleFrom(
                  backgroundColor: kRsNavyMid,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
                onPressed: () => Navigator.of(dialogContext).pop(),
                child: Text(
                  'ตกลง',
                  style: GoogleFonts.sarabun(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        Navigator.of(context).pop(_didSave);
      },
      child: Theme(
        data: Theme.of(
          context,
        ).copyWith(textTheme: GoogleFonts.sarabunTextTheme(Theme.of(context).textTheme)),
        child: Scaffold(
          backgroundColor: kRsSurface,
          body: Column(
            children: [
              _buildAppBar(context),
              Expanded(
                child: Stack(
                  children: [
                    SingleChildScrollView(
                      padding: const EdgeInsets.fromLTRB(18, 24, 18, 140),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Center(
                            child: ProfileAvatarPicker(
                              onUploaded: () => _didSave = true,
                            ),
                          ),
                          const SizedBox(height: 20),
                          ProfilePersonalInfoCard(
                            firstname: widget.profile.firstname,
                            lastname: widget.profile.lastname,
                            studentNo: widget.profile.studentNo,
                            phoneController: _phoneController,
                            roomController: _roomController,
                            errorPhone: _errPhone,
                            phoneErrorText: _phoneErrorText,
                            errorRoom: _errRoom,
                            roomErrorText: _roomErrorText,
                            onPhoneChanged: (value) {
                              if (value.trim().isNotEmpty && _errPhone) {
                                setState(() {
                                  _errPhone = false;
                                  _phoneErrorText = null;
                                });
                              }
                            },
                            onRoomChanged: (value) {
                              if (value.trim().isNotEmpty && _errRoom) {
                                setState(() {
                                  _errRoom = false;
                                  _roomErrorText = null;
                                });
                              }
                            },
                          ),
                        ],
                      ),
                    ),
                    Positioned(
                      left: 0,
                      right: 0,
                      bottom: 0,
                      child: _buildBottomBar(),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── App bar: gradient ทอง + ปุ่มย้อนกลับ + ชื่อหน้า (ไม่มี subtitle) ──
  Widget _buildAppBar(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(top: MediaQuery.of(context).padding.top),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [kRsGold, kRsGoldLight],
        ),
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(28),
          bottomRight: Radius.circular(28),
        ),
        boxShadow: [
          BoxShadow(
            color: kRsGoldText.withValues(alpha: 0.18),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 14, 20, 17),
        child: Row(
          children: [
            Material(
              color: Colors.transparent,
              child: InkWell(
                borderRadius: BorderRadius.circular(20),
                onTap: () => Navigator.of(context).pop(_didSave),
                child: Container(
                  width: 40,
                  height: 40,
                  alignment: Alignment.center,
                  child: const Icon(
                    Icons.arrow_back_ios_new,
                    size: 18,
                    color: kRsOnPrimary,
                  ),
                ),
              ),
            ),
            const SizedBox(width: 4),
            Text(
              'แก้ไขข้อมูลส่วนตัว',
              style: GoogleFonts.sarabun(
                fontSize: 20,
                fontWeight: FontWeight.w800,
                color: kRsOnPrimary,
                letterSpacing: -0.3,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Bottom bar: ปุ่ม "บันทึกข้อมูล" ──
  Widget _buildBottomBar() {
    return Container(
      padding: EdgeInsets.fromLTRB(
        20,
        14,
        20,
        MediaQuery.of(context).padding.bottom + 20,
      ),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            kRsSurface.withValues(alpha: 0.0),
            kRsSurface.withValues(alpha: 0.6),
            kRsSurface,
          ],
          stops: const [0.0, 0.4, 1.0],
        ),
      ),
      child: SizedBox(
        height: 54,
        child: Material(
          color: Colors.transparent,
          child: Ink(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(999),
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [kRsNavyMid, kRsNavyDark],
              ),
              boxShadow: [
                BoxShadow(
                  color: kRsNavy.withValues(alpha: 0.4),
                  blurRadius: 24,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: InkWell(
              borderRadius: BorderRadius.circular(999),
              onTap: _isSaving ? null : _handleSave,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.save, color: Colors.white, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    _isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล',
                    style: GoogleFonts.sarabun(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
