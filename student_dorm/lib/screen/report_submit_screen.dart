import 'dart:math';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:student_dorm/utils/app_api.dart';
import 'package:student_dorm/color/colors.dart';
import 'package:student_dorm/models/repair_detail_model.dart';
import 'package:student_dorm/widgets/report_submit/problem_report_card.dart';
import 'package:student_dorm/widgets/report_submit/personal_info_form.dart';
import 'package:student_dorm/widgets/report_submit/work_type_chip.dart';
import 'package:student_dorm/widgets/report_submit/image_preview_grid.dart';
import 'package:student_dorm/widgets/report_submit/existing_photo_grid.dart';
import 'package:student_dorm/widgets/entry_permission_card.dart';
import 'package:student_dorm/utils/validators.dart';

class ReportSubmitScreen extends StatefulWidget {
  const ReportSubmitScreen({super.key, this.requestId = 0});

  final int requestId;

  @override
  State<ReportSubmitScreen> createState() => _ReportSubmitScreenState();
}

class _ReportSubmitScreenState extends State<ReportSubmitScreen> {
  final TextEditingController nameController = TextEditingController();
  final TextEditingController lastNameController = TextEditingController();
  final TextEditingController phoneController = TextEditingController();
  final TextEditingController roomNumberController = TextEditingController();
  final TextEditingController descriptionController = TextEditingController();
  final List<int> selectedRepairTypeIds = [];
  String _permission = 'yes';
  bool _isSubmitting = false;

  String _infoMode = 'new'; // 'new' | 'saved'
  String _titleText = 'แจ้งซ่อม';

  final List<XFile> _uploadedImages = [];

  // รูปเดิมที่เคยแนบไว้แล้ว (โหมดแก้ไขเท่านั้น) — กด ✕ แล้วหายจากลิสต์นี้ก่อน
  // ยังไม่ลบจริงจนกว่าจะกด "แก้ไขรายงาน"
  List<RepairPhoto> _existingPhotos = [];
  Set<int> _initialExistingPhotoIds = {};

  // ── Validation error flags ──
  bool _errName = false;
  bool _errLastName = false;
  bool _errPhone = false;
  // override ข้อความ error ของเบอร์โทร ตอนที่สาเหตุคือรูปแบบผิด ไม่ใช่แค่ไม่ได้กรอก (null = ใช้ข้อความ
  // default "กรุณากรอกเบอร์โทรติดต่อ" ที่ PersonalInfoForm กำหนดไว้)
  String? _phoneErrorText;
  bool _errRoom = false;
  // override ข้อความ error ของหมายเลขห้อง ตอนที่สาเหตุคือรูปแบบ/ช่วงตัวเลขผิด ไม่ใช่แค่ไม่ได้กรอก
  // (null = ใช้ข้อความ default "กรุณากรอกหมายเลขห้องพัก" ที่ PersonalInfoForm กำหนดไว้)
  String? _roomErrorText;
  bool _errWorkType = false;
  bool _errDesc = false;

  static const int _maxImages = 6;
  static const double _maxFileMb = 10;

  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _initData();
  }

  // ══════════════════════════════════════════
  // Init (โหมดแก้ไข: โหลดคำร้องเดิมจาก backend มาเติมในฟอร์ม)
  // ══════════════════════════════════════════
  Future<RepairDetail?> _getRepairRequestModel(int requestId) async {
    final response = await AppAPI.get('/repair_request/get_by_id/$requestId');
    final Map<String, dynamic> json = jsonDecode(response.body);

    if (json['isError'] == true || json['data'] == null) {
      return null;
    }

    return RepairDetail.fromJson(json['data'] as Map<String, dynamic>);
  }

  Future<void> _initData() async {
    if (widget.requestId == 0) {
      setState(() {
        _titleText = 'แจ้งซ่อม';
      });
      return;
    }

    setState(() {
      _titleText = 'แก้ไขข้อมูลแจ้งซ่อม';
    });

    final detail = await _getRepairRequestModel(widget.requestId);
    if (!mounted || detail == null) return;

    final nameParts = detail.studentName.trim().split(' ');
    final existingPhotos = await _getExistingPhotos(widget.requestId);
    if (!mounted) return;

    setState(() {
      nameController.text = nameParts.first;
      lastNameController.text = nameParts.length > 1 ? nameParts.sublist(1).join(' ') : '';
      phoneController.text = detail.contactPhone;
      roomNumberController.text = detail.roomNumber;
      descriptionController.text = detail.description;
      _permission = detail.allowEntry ? 'yes' : 'no';
      selectedRepairTypeIds
        ..clear()
        ..addAll(
          kWorkTypes
              .where((workType) => detail.typeNames.contains(workType.label))
              .map((workType) => int.parse(workType.id)),
        );
      _existingPhotos = existingPhotos;
      _initialExistingPhotoIds = existingPhotos.map((p) => p.photoId).toSet();
    });
  }

  Future<List<RepairPhoto>> _getExistingPhotos(int requestId) async {
    try {
      final response = await AppAPI.get('/repair_request/$requestId/photos');
      final Map<String, dynamic> json = jsonDecode(response.body);

      if (json['isError'] == true || json['data'] == null) return [];

      return (json['data'] as List)
          .map((e) => RepairPhoto.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (e) {
      return [];
    }
  }

  void _removeExistingPhoto(int index) {
    setState(() {
      _existingPhotos.removeAt(index);
    });
  }

  @override
  void dispose() {
    nameController.dispose();
    lastNameController.dispose();
    phoneController.dispose();
    roomNumberController.dispose();
    descriptionController.dispose();
    super.dispose();
  }

  // ══════════════════════════════════════════
  // Info Mode Toggle (ข้อมูลใหม่ / ข้อมูลเดิม)
  // ══════════════════════════════════════════
  Future<Map<String, dynamic>?> _getStudentProfile() async {
    final response = await AppAPI.get('/profile/me');
    final Map<String, dynamic> json = jsonDecode(response.body);

    if (json['isError'] == true || json['data'] == null) {
      return null;
    }

    return json['data'] as Map<String, dynamic>;
  }

  Future<void> _applyInfoMode(String mode) async {
    final prevMode = _infoMode;

    setState(() {
      _infoMode = mode;
    });

    if (mode == 'saved') {
      final profile = await _getStudentProfile();
      if (!mounted) return;

      setState(() {
        nameController.text = profile?['firstname'] as String? ?? '';
        lastNameController.text = profile?['lastname'] as String? ?? '';
        phoneController.text = profile?['phone'] as String? ?? '';
        roomNumberController.text = profile?['room_number'] as String? ?? '';
        _errName = false;
        _errLastName = false;
        _errPhone = false;
        _errRoom = false;
      });
    } else if (prevMode == 'saved') {
      setState(() {
        nameController.clear();
        lastNameController.clear();
        phoneController.clear();
        roomNumberController.clear();
        _errName = false;
        _errLastName = false;
        _errPhone = false;
        _errRoom = false;
      });
    }
  }

  // ══════════════════════════════════════════
  // Work Type Selection
  // ══════════════════════════════════════════
  void _toggleRepairType(String id) {
    final int repairTypeId = int.parse(id);

    setState(() {
      if (selectedRepairTypeIds.contains(repairTypeId)) {
        selectedRepairTypeIds.remove(repairTypeId);
      } else {
        selectedRepairTypeIds.add(repairTypeId);
      }

      _errWorkType = selectedRepairTypeIds.isEmpty;
    });
  }

  // ══════════════════════════════════════════
  // Image Upload (image_picker)
  // ══════════════════════════════════════════
  int get _totalImageCount => _existingPhotos.length + _uploadedImages.length;

  Future<void> _pickImages() async {
    if (_totalImageCount >= _maxImages) return;

    final List<XFile> picked = await _picker.pickMultiImage(imageQuality: 85);
    if (picked.isEmpty) return;

    int skippedSize = 0;
    final List<XFile> accepted = [];

    for (final xfile in picked) {
      if (_totalImageCount + accepted.length >= _maxImages) break;
      final sizeInMb = await xfile.length() / (1024 * 1024);
      if (sizeInMb > _maxFileMb) {
        skippedSize++;
        continue;
      }
      accepted.add(xfile);
    }

    setState(() {
      _uploadedImages.addAll(accepted);
    });

    if (skippedSize > 0 && mounted) {
      _showToast(
        '$skippedSize ไฟล์มีขนาดเกิน ${_maxFileMb.toInt()} MB',
        isWarn: true,
      );
    }
  }

  Future<void> _pickFromCamera() async {
    if (_totalImageCount >= _maxImages) return;
    final XFile? shot = await _picker.pickImage(
      source: ImageSource.camera,
      imageQuality: 85,
    );
    if (shot == null) return;
    setState(() {
      _uploadedImages.add(shot);
    });
  }

  void _removeImage(int index) {
    setState(() {
      _uploadedImages.removeAt(index);
    });
  }

  // ══════════════════════════════════════════
  // Entry Permission Toggle
  // ══════════════════════════════════════════
  void _setPermission(String value) {
    setState(() {
      _permission = value;
    });
  }

  // ══════════════════════════════════════════
  // Validation
  // ══════════════════════════════════════════
  bool _validateForm() {
    setState(() {
      _errName = nameController.text.trim().isEmpty;
      _errLastName = lastNameController.text.trim().isEmpty;

      final phoneValue = phoneController.text.trim();
      if (phoneValue.isEmpty) {
        _errPhone = true;
        _phoneErrorText = null; // ใช้ข้อความ default "กรุณากรอกเบอร์โทรติดต่อ"
      } else {
        _phoneErrorText = validatePhoneNumber(phoneValue);
        _errPhone = _phoneErrorText != null;
      }

      final roomValue = roomNumberController.text.trim();
      if (roomValue.isEmpty) {
        _errRoom = true;
        _roomErrorText = null; // ใช้ข้อความ default "กรุณากรอกหมายเลขห้องพัก"
      } else {
        _roomErrorText = validateRoomNumber(roomValue);
        _errRoom = _roomErrorText != null;
      }

      _errWorkType = selectedRepairTypeIds.isEmpty;
      _errDesc = descriptionController.text.trim().isEmpty;
    });
    return !(_errName || _errLastName || _errPhone || _errRoom || _errWorkType || _errDesc);
  }

  String get _fullName => '${nameController.text.trim()} ${lastNameController.text.trim()}'.trim();

  Future<(bool, String, String, int)> _doCreateRepairRequest() async {
    Map<String, dynamic> postData = {
      "name": _fullName,
      "phone": phoneController.text.trim(),
      "room_number": roomNumberController.text.trim(),
      "repair_type_ids": selectedRepairTypeIds,
      "description": descriptionController.text.trim(),
      "allow_entry": _permission == 'yes',
    };

    final response = await AppAPI.post("/repair_request/create", postData);
    final Map<String, dynamic> json = jsonDecode(response.body);
    final bool isError = json["isError"];
    final String errorMessage = json["errorMessage"] ?? "";

    String caseCode = "";
    int requestId = 0;

    if (!isError) {
      caseCode = json["data"]["case_code"].toString();
      requestId = json["data"]["request_id"];
    }
    return (isError, errorMessage, caseCode, requestId);
  }

  Future<(bool, String)> _doUploadPhotos(int requestId) async {
    // โหมดแก้ไข: ถ้ากด ✕ ลบรูปเดิมออกไป (แม้ไม่ได้แนบรูปใหม่เพิ่ม) ก็ต้องส่งไปแทนที่ชุดเดิมด้วย
    final bool isEditMode = widget.requestId != 0;
    final bool existingPhotosChanged =
        isEditMode && _existingPhotos.length != _initialExistingPhotoIds.length;

    if (_uploadedImages.isEmpty && !existingPhotosChanged) return (false, "");

    final response = await AppAPI.uploadFiles(
      "/repair_request/$requestId/photos",
      _uploadedImages,
      fields: isEditMode
          ? {"keep_urls": jsonEncode(_existingPhotos.map((p) => p.photoUrl).toList())}
          : {},
    );
    final Map<String, dynamic> json = jsonDecode(response.body);
    final bool isError = json["isError"];
    final String errorMessage = json["errorMessage"] ?? "";

    return (isError, errorMessage);
  }

  Future<(bool, String)> _doUpdateRepairRequest() async {
    Map<String, dynamic> postData = {
      "request_id": widget.requestId,
      "name": _fullName,
      "phone": phoneController.text.trim(),
      "room_number": roomNumberController.text.trim(),
      "repair_type_ids": selectedRepairTypeIds,
      "description": descriptionController.text.trim(),
      "allow_entry": _permission == 'yes',
    };

    final response = await AppAPI.post("/repair_request/update", postData);
    final Map<String, dynamic> json = jsonDecode(response.body);
    final bool isError = json["isError"];
    final String errorMessage = json["errorMessage"] ?? "";

    return (isError, errorMessage);
  }

  Future<void> _handleSubmit() async {
    if (!_validateForm()) {
      _showToast('กรุณากรอกข้อมูลให้ครบถ้วน', isWarn: true);
      return;
    }

    if (widget.requestId != 0) {
      bool isError;
      String errorMessage;
      try {
        (isError, errorMessage) = await _doUpdateRepairRequest();
      } catch (e) {
        if (!mounted) return;
        _showToast('บันทึกข้อมูลไม่สำเร็จ: $e', isWarn: true);
        return;
      }

      if (!mounted) return;

      if (isError) {
        showDialog(
          context: context,
          builder: (context) {
            return AlertDialog(content: Text(errorMessage));
          },
        );
        return;
      }

      try {
        var (photoIsError, photoErrorMessage) = await _doUploadPhotos(widget.requestId);

        if (!mounted) return;

        if (photoIsError) {
          _showToast('แนบรูปภาพไม่สำเร็จ: $photoErrorMessage', isWarn: true);
        }
      } catch (e) {
        if (!mounted) return;
        _showToast('แนบรูปภาพไม่สำเร็จ: $e', isWarn: true);
      }

      Navigator.pop(context);
      return;
    }

    bool isError;
    String errorMessage;
    String caseCode;
    int requestId;
    try {
      (isError, errorMessage, caseCode, requestId) =
          await _doCreateRepairRequest();
    } catch (e) {
      if (!mounted) return;
      _showToast('ส่งรายงานไม่สำเร็จ: $e', isWarn: true);
      return;
    }

    if (!mounted) return;

    if (isError) {
      showDialog(
        context: context,
        builder: (context) {
          return AlertDialog(content: Text(errorMessage));
        },
      );
      return;
    }

    try {
      var (photoIsError, photoErrorMessage) = await _doUploadPhotos(requestId);

      if (!mounted) return;

      if (photoIsError) {
        _showToast('แนบรูปภาพไม่สำเร็จ: $photoErrorMessage', isWarn: true);
      }
    } catch (e) {
      if (!mounted) return;
      _showToast('แนบรูปภาพไม่สำเร็จ: $e', isWarn: true);
    }

    final String workTypeLabel = kWorkTypes
        .where((workType) {
          final int? repairTypeId = int.tryParse(workType.id);

          return repairTypeId != null &&
              selectedRepairTypeIds.contains(repairTypeId);
        })
        .map((workType) => workType.label)
        .join(', ');

    final DateTime now = DateTime.now();

    final String timeLabel =
        '${now.hour.toString().padLeft(2, '0')}:'
        '${now.minute.toString().padLeft(2, '0')}';

    _showSuccessModal(
      ticketId: caseCode,
      workType: workTypeLabel,
      time: timeLabel,
    );
  }
  void _showSuccessModal({
    required String ticketId,
    required String workType,
    required String time,
  }) {
    final BuildContext pageContext = context;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black.withValues(alpha: 0.5),
      builder: (sheetContext) {
        return Container(
          padding: EdgeInsets.fromLTRB(
            24,
            12,
            24,
            max(32, MediaQuery.of(context).padding.bottom + 20),
          ),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.only(
              topLeft: Radius.circular(28),
              topRight: Radius.circular(28),
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4.5,
                margin: const EdgeInsets.only(bottom: 24),
                decoration: BoxDecoration(
                  color: const Color(0xFFDADADC),
                  borderRadius: BorderRadius.circular(999),
                ),
              ),

              // Success ring + icon
              Container(
                width: 88,
                height: 88,
                margin: const EdgeInsets.only(bottom: 18),
                decoration: BoxDecoration(
                  color: kRsGreen.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                alignment: Alignment.center,
                child: Container(
                  width: 68,
                  height: 68,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [kRsGreen, const Color(0xFF4CAF50)],
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: kRsGreen.withValues(alpha: 0.38),
                        blurRadius: 20,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: const Icon(Icons.check, color: Colors.white, size: 38),
                ),
              ),

              Text(
                'ส่งรายงานสำเร็จ!',
                style: GoogleFonts.sarabun(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  color: kRsOnSurface,
                  letterSpacing: -0.2,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'คำขอแจ้งซ่อมของคุณถูกบันทึกในระบบแล้ว\n'
                'เจ้าหน้าที่จะดำเนินการโดยเร็ว',
                textAlign: TextAlign.center,
                style: GoogleFonts.sarabun(
                  fontSize: 13.5,
                  color: const Color(0xFF7E775F),
                  height: 1.75,
                ),
              ),
              const SizedBox(height: 16),

              // Ticket chip
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 6,
                ),
                margin: const EdgeInsets.only(bottom: 18),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8F5E8),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(
                    color: const Color(0xFFE8E0C4),
                    width: 1.5,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.confirmation_number_outlined,
                      size: 15,
                      color: kRsGoldText,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      ticketId,
                      style: GoogleFonts.sarabun(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w700,
                        color: kRsOnSurfaceVar,
                        letterSpacing: 0.6,
                      ),
                    ),
                  ],
                ),
              ),

              // Info row: เวลารับเรื่อง / ประเภทงาน
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(
                  horizontal: 18,
                  vertical: 14,
                ),
                margin: const EdgeInsets.only(bottom: 20),
                decoration: BoxDecoration(
                  color: const Color(0xFFFAF8F0),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: const Color(0xFFE8E0C4)),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: _modalInfoItem(
                        icon: Icons.schedule,
                        iconColor: kRsNavyMid,
                        label: 'เวลารับเรื่อง',
                        value: time,
                      ),
                    ),
                    Container(
                      width: 1,
                      height: 38,
                      margin: const EdgeInsets.symmetric(horizontal: 16),
                      color: const Color(0xFFD8D0BB),
                    ),
                    Expanded(
                      child: _modalInfoItem(
                        icon: Icons.build,
                        iconColor: kRsGoldText,
                        label: 'ประเภทงาน',
                        value: workType,
                      ),
                    ),
                  ],
                ),
              ),

              // ปุ่มดูประวัติการแจ้งซ่อม
              SizedBox(
                width: double.infinity,
                height: 52,
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
                      onTap: () {
                        Navigator.of(sheetContext).pop();
                        Navigator.of(pageContext).pop(true);
                      },
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(
                            Icons.history,
                            color: Colors.white,
                            size: 20,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'ดูประวัติการแจ้งซ่อม',
                            style: GoogleFonts.sarabun(
                              fontSize: 15,
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
            ],
          ),
        );
      },
    );
  }

  Widget _modalInfoItem({
    required IconData icon,
    required Color iconColor,
    required String label,
    required String value,
  }) {
    return Row(
      children: [
        Icon(icon, size: 22, color: iconColor),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label.toUpperCase(),
                style: GoogleFonts.sarabun(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: kRsMuted,
                  letterSpacing: 0.5,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: GoogleFonts.sarabun(
                  fontSize: 14,
                  fontWeight: FontWeight.w700,
                  color: kRsOnSurface,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  void _showToast(String message, {bool isWarn = false}) {
    ScaffoldMessenger.of(context).clearSnackBars();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        backgroundColor: const Color(0xFF2A2C2E),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        margin: const EdgeInsets.only(bottom: 84, left: 40, right: 40),
        duration: const Duration(seconds: 3),
        content: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              isWarn ? Icons.warning_amber_rounded : Icons.info_outline,
              size: 17,
              color: kRsGold,
            ),
            const SizedBox(width: 8),
            Flexible(
              child: Text(
                message,
                style: GoogleFonts.sarabun(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: const Color(0xFFF0F0F3),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ══════════════════════════════════════════
  // BUILD
  // ══════════════════════════════════════════
  @override
  Widget build(BuildContext context) {
    // Sarabun เป็นฟอนต์ fallback สำหรับข้อความภาษาไทยทั่วไป
    // (ปุ่ม/หัวข้อหลักยังคงใช้ Inter / Be Vietnam Pro ตรงตาม report_submit.css เดิม)
    final textTheme = GoogleFonts.sarabunTextTheme(Theme.of(context).textTheme);

    return Theme(
      data: Theme.of(context).copyWith(textTheme: textTheme),
      child: Scaffold(
        backgroundColor: kRsSurface,
        body: Column(
          children: [
            _buildAppBar(context),
            Expanded(
              child: Stack(
                children: [
                  SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(18, 20, 18, 140),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        PersonalInfoForm(
                          nameController: nameController,
                          lastNameController: lastNameController,
                          phoneController: phoneController,
                          roomController: roomNumberController,
                          infoMode: _infoMode,
                          errorName: _errName,
                          errorLastName: _errLastName,
                          errorPhone: _errPhone,
                          phoneErrorText: _phoneErrorText,
                          errorRoom: _errRoom,
                          roomErrorText: _roomErrorText,
                          onInfoModeChanged: _applyInfoMode,
                          onNameChanged: (value) {
                            if (value.trim().isNotEmpty && _errName) {
                              setState(() {
                                _errName = false;
                              });
                            }
                          },
                          onLastNameChanged: (value) {
                            if (value.trim().isNotEmpty && _errLastName) {
                              setState(() {
                                _errLastName = false;
                              });
                            }
                          },
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
                        const SizedBox(height: 18),
                        ProblemReportCard(
                          descriptionController: descriptionController,
                          selectedRepairTypeIds: selectedRepairTypeIds,
                          errorWorkType: _errWorkType,
                          errorDescription: _errDesc,
                          onWorkTypeSelected: _toggleRepairType,
                          onDescriptionChanged: (value) {
                            if (value.trim().isNotEmpty && _errDesc) {
                              setState(() {
                                _errDesc = false;
                              });
                            }
                          },
                        ),
                        const SizedBox(height: 18),
                        _buildPhotoCard(),
                      ],
                    ),
                  ),
                  // Bottom bar ลอยทับด้านล่าง (ตาม .bottom-bar position: fixed)
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
    );
  }

  // ── App bar: gradient ทอง + ปุ่มย้อนกลับ + ชื่อหน้า (ตาม .app-bar) ──
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
            // ปุ่มย้อนกลับ
            Material(
              color: Colors.transparent,
              child: InkWell(
                borderRadius: BorderRadius.circular(20),
                onTap: () => Navigator.of(context).maybePop(),
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
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    _titleText,
                    style: GoogleFonts.sarabun(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: kRsOnPrimary,
                      letterSpacing: -0.3,
                      height: 1.2,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'กรอกข้อมูลให้ครบถ้วนก่อนส่ง',
                    style: GoogleFonts.sarabun(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w500,
                      color: kRsOnPrimary.withValues(alpha: 0.52),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ═══════════════════════════════════════════════════════
  // การ์ด 1: ข้อมูลส่วนตัว
  // ⚠️ TODO(backend): ฟิลด์ชื่อ/เบอร์โทร/ห้องพัก ทั้งหมดต้องบันทึกลงตาราง
  // `repair_requests` (หรือ `users` ถ้าผูกกับบัญชีผู้ใช้) ใน MySQL
  // เมื่อกด "ข้อมูลเดิม" ควรดึงจาก API เช่น GET /api/profile/me
  // แทนการใช้ _mockProfile ที่ hardcode ไว้ตอนนี้
  // ═══════════════════════════════════════════════════════

  Widget _buildPhotoCard() {
    final bool isFull = _totalImageCount >= _maxImages;

    return _card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              _iconBadge(
                Icons.photo_camera,
                bg: const Color(0xFFFFF3E0),
                fg: kRsAmber,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _cardTitle('รูปภาพประกอบ'),
                    _cardSub('แนบหลักฐานความเสียหาย'),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 11,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: const Color(0xFFEEEEF0),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  '$_totalImageCount / $_maxImages',
                  style: GoogleFonts.sarabun(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w700,
                    color: kRsOnSurfaceVar,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),

          // Upload zone — กรอบเดียวรวมปุ่มอัปโหลดกับรูปที่แนบแล้ว (เดิมรูปลอยอยู่นอกกรอบ)
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: kRsFieldBg,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: const Color(0xFFCCC5B0),
                width: 2,
                style: BorderStyle.solid,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Opacity ครอบเฉพาะแถวปุ่ม ไม่ครอบรูป ไม่งั้นรูปที่แนบแล้วจะจางไปด้วยตอนแนบครบ
                GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: isFull ? null : () => _showImageSourceSheet(context),
                  child: Opacity(
                    opacity: isFull ? 0.5 : 1,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Row(
                        children: [
                          Container(
                            width: 46,
                            height: 46,
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                                colors: [Color(0xFFFFF8D6), Color(0xFFFFF3B0)],
                              ),
                              borderRadius: BorderRadius.circular(14),
                              boxShadow: [
                                BoxShadow(
                                  color: kRsGoldText.withValues(alpha: 0.14),
                                  blurRadius: 10,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: Icon(
                              Icons.add_photo_alternate,
                              size: 24,
                              color: kRsGoldText,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'แตะเพื่อเลือกรูปภาพ',
                                  style: GoogleFonts.sarabun(
                                    fontSize: 13.5,
                                    fontWeight: FontWeight.w700,
                                    color: kRsOnSurface,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'สูงสุด $_maxImages รูป • ไม่เกินรูปละ ${_maxFileMb.toInt()} MB',
                                  style: GoogleFonts.sarabun(
                                    fontSize: 11.5,
                                    color: kRsMuted,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                if (_existingPhotos.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  ExistingPhotoGrid(photos: _existingPhotos, onRemove: _removeExistingPhoto),
                ],

                if (_uploadedImages.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  ImagePreviewGrid(images: _uploadedImages, onRemove: _removeImage),
                ],
              ],
            ),
          ),

          const SizedBox(height: 14),
          Container(
            height: 1,
            margin: const EdgeInsets.symmetric(vertical: 2),
            color: const Color(0xFFEDEAE0),
          ),
          const SizedBox(height: 14),

          // Entry permission — ย้ายไปใช้ widget กลาง (lib/widgets/entry_permission_card.dart) ร่วมกับ
          // หน้ายื่นอุทธรณ์ (repair_complaint_screen.dart) แทนโค้ดซ้ำ เพื่อให้หน้าตาตรงกันทุกจุดเสมอ
          EntryPermissionCard(
            allowEntry: _permission == 'yes' ? true : (_permission == 'no' ? false : null),
            onSelect: (value) => _setPermission(value ? 'yes' : 'no'),
          ),
        ],
      ),
    );
  }

  // เลือกแหล่งรูป: กล้อง หรือ คลังภาพ
  void _showImageSourceSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(
                  Icons.photo_library_outlined,
                  color: kRsBlue,
                ),
                title: Text(
                  'เลือกจากคลังภาพ',
                  style: GoogleFonts.sarabun(fontSize: 14),
                ),
                onTap: () {
                  Navigator.pop(context);
                  _pickImages();
                },
              ),
              ListTile(
                leading: const Icon(
                  Icons.photo_camera_outlined,
                  color: kRsGoldText,
                ),
                title: Text(
                  'ถ่ายภาพ',
                  style: GoogleFonts.sarabun(fontSize: 14),
                ),
                onTap: () {
                  Navigator.pop(context);
                  _pickFromCamera();
                },
              ),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
  }

  // ── Bottom bar: ปุ่ม "ส่งรายงาน" (ตาม .bottom-bar / .btn-primary) ──
  Widget _buildBottomBar() {
    return Container(
      padding: EdgeInsets.fromLTRB(
        20,
        14,
        20,
        max(24, MediaQuery.of(context).padding.bottom + 10),
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
              onTap: _isSubmitting ? null : _handleSubmit,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.send, color: Colors.white, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    _isSubmitting
                        ? 'กำลังส่ง...'
                        : (widget.requestId != 0 ? 'แก้ไขรายงาน' : 'ส่งรายงาน'),
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

  // ═══════════════════════════════════════════════════════
  // Shared small helper widgets
  // ═══════════════════════════════════════════════════════

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
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(14),
      ),
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
}