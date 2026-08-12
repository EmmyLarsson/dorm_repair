import 'dart:io';
import 'dart:math';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:student_dorm/utils/app_api.dart';
import 'package:student_dorm/color/colors.dart';
import 'package:student_dorm/widgets/problem_report_card.dart';
import 'package:student_dorm/widgets/personal_info_form.dart';
import 'package:student_dorm/widgets/work_type_chip.dart';
import 'package:student_dorm/widgets/image_preview_grid.dart';

class ReportSubmitScreen extends StatefulWidget {
  const ReportSubmitScreen({super.key});

  @override
  State<ReportSubmitScreen> createState() => _ReportSubmitScreenState();
}

class _ReportSubmitScreenState extends State<ReportSubmitScreen> {
  final Map<String, String> _mockProfile = const {
    'name': 'สมหญิง หญิงสม',
    'phone': '080-123-4567',
    'room': '110912',
  };

  final TextEditingController nameController = TextEditingController();
  final TextEditingController phoneController = TextEditingController();
  final TextEditingController roomNumberController = TextEditingController();
  final TextEditingController descriptionController = TextEditingController();
  final List<int> selectedRepairTypeIds = [];
  String _permission = 'yes';
  bool _isSubmitting = false;

  String _infoMode = 'new'; // 'new' | 'saved'

  final List<File> _uploadedImages = [];

  // ── Validation error flags ──
  bool _errName = false;
  bool _errPhone = false;
  bool _errRoom = false;
  bool _errWorkType = false;
  bool _errDesc = false;

  static const int _maxImages = 6;
  static const double _maxFileMb = 10;

  final ImagePicker _picker = ImagePicker();

  @override
  void dispose() {
    nameController.dispose();
    phoneController.dispose();
    roomNumberController.dispose();
    descriptionController.dispose();
    super.dispose();
  }

  // ══════════════════════════════════════════
  // Info Mode Toggle (ข้อมูลใหม่ / ข้อมูลเดิม)
  // ══════════════════════════════════════════
  void _applyInfoMode(String mode) {
    setState(() {
      final prevMode = _infoMode;
      _infoMode = mode;

      if (mode == 'saved') {
        nameController.text = _mockProfile['name'] ?? '';
        phoneController.text = _mockProfile['phone'] ?? '';
        roomNumberController.text = _mockProfile['room'] ?? '';
      } else if (prevMode == 'saved') {
        nameController.clear();
        phoneController.clear();
        roomNumberController.clear();
      }
      _errName = false;
      _errPhone = false;
      _errRoom = false;
    });
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
  Future<void> _pickImages() async {
    if (_uploadedImages.length >= _maxImages) return;

    final List<XFile> picked = await _picker.pickMultiImage(imageQuality: 85);
    if (picked.isEmpty) return;

    int skippedSize = 0;
    final List<File> accepted = [];

    for (final xfile in picked) {
      if (_uploadedImages.length + accepted.length >= _maxImages) break;
      final file = File(xfile.path);
      final sizeInMb = await file.length() / (1024 * 1024);
      if (sizeInMb > _maxFileMb) {
        skippedSize++;
        continue;
      }
      accepted.add(file);
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
    if (_uploadedImages.length >= _maxImages) return;
    final XFile? shot = await _picker.pickImage(
      source: ImageSource.camera,
      imageQuality: 85,
    );
    if (shot == null) return;
    setState(() {
      _uploadedImages.add(File(shot.path));
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
      _errPhone = phoneController.text.trim().isEmpty;
      _errRoom = roomNumberController.text.trim().isEmpty;
      _errWorkType = selectedRepairTypeIds.isEmpty;
      _errDesc = descriptionController.text.trim().isEmpty;
    });
    return !(_errName || _errPhone || _errRoom || _errWorkType || _errDesc);
  }

  Future<(bool, String, String)> _doCreateRepairRequest() async {
    Map<String, dynamic> postData = {
      "name": nameController.text.trim(),
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

    if (!isError) {
      caseCode = json["data"]["case_code"].toString();
    }
    return (isError, errorMessage, caseCode);
  }

  Future<void> _handleSubmit() async {
    if (!_validateForm()) {
      _showToast('กรุณากรอกข้อมูลให้ครบถ้วน', isWarn: true);
      return;
    }

    var (isError, errorMessage, caseCode) = await _doCreateRepairRequest();

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
                          phoneController: phoneController,
                          roomController: roomNumberController,
                          infoMode: _infoMode,
                          errorName: _errName,
                          errorPhone: _errPhone,
                          errorRoom: _errRoom,
                          onInfoModeChanged: _applyInfoMode,
                          onNameChanged: (value) {
                            if (value.trim().isNotEmpty && _errName) {
                              setState(() {
                                _errName = false;
                              });
                            }
                          },
                          onPhoneChanged: (value) {
                            if (value.trim().isNotEmpty && _errPhone) {
                              setState(() {
                                _errPhone = false;
                              });
                            }
                          },
                          onRoomChanged: (value) {
                            if (value.trim().isNotEmpty && _errRoom) {
                              setState(() {
                                _errRoom = false;
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
                    'แจ้งซ่อม',
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

  // ═══════════════════════════════════════════════════════
  // การ์ด 3: รูปภาพประกอบ
  // ⚠️ TODO(backend): รูปที่แนบต้องอัพโหลดแบบ multipart/form-data ไปยัง
  // Node.js (เช่น endpoint POST /api/repairs/:id/photos ด้วย multer)
  // แล้วเก็บ path/URL ที่ได้ลงตาราง `repair_photos` ใน MySQL
  // (แยกตารางจาก repair_requests เพราะเป็น 1-ต่อ-หลายรูป)
  // ค่า "การอนุญาตเข้าห้อง" (_permission) บันทึกเป็น column
  // `allow_entry` (ENUM('yes','no')) ใน `repair_requests`
  // ═══════════════════════════════════════════════════════
  Widget _buildPhotoCard() {
    final bool isFull = _uploadedImages.length >= _maxImages;

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
                  '${_uploadedImages.length} / $_maxImages',
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

          // Upload zone
          GestureDetector(
            onTap: isFull ? null : () => _showImageSourceSheet(context),
            child: Opacity(
              opacity: isFull ? 0.5 : 1,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  vertical: 30,
                  horizontal: 16,
                ),
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
                  children: [
                    Container(
                      width: 58,
                      height: 58,
                      margin: const EdgeInsets.only(bottom: 6),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [Color(0xFFFFF8D6), Color(0xFFFFF3B0)],
                        ),
                        borderRadius: BorderRadius.circular(18),
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
                        size: 28,
                        color: kRsGoldText,
                      ),
                    ),
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
            ),
          ),

          if (_uploadedImages.isNotEmpty) ...[
            const SizedBox(height: 12),
            ImagePreviewGrid(images: _uploadedImages, onRemove: _removeImage),
          ],

          const SizedBox(height: 14),
          Container(
            height: 1,
            margin: const EdgeInsets.symmetric(vertical: 2),
            color: const Color(0xFFEDEAE0),
          ),
          const SizedBox(height: 14),

          // Entry permission info box
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 13),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFFEFF2FF), Color(0xFFE8EEFF)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(15),
              border: Border.all(color: const Color(0xFFC5D0F5)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(Icons.info, size: 18, color: kRsBlue),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'การเข้าซ่อมในห้องพัก',
                        style: GoogleFonts.sarabun(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w700,
                          color: kRsOnSurface,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'อนุญาตให้ช่างเข้าซ่อมในกรณีที่ท่านไม่อยู่ในห้อง',
                        style: GoogleFonts.sarabun(
                          fontSize: 11.5,
                          color: kRsOnSurfaceVar,
                          height: 1.55,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),

          Row(
            children: [
              Expanded(
                child: _permButton(
                  label: 'อนุญาต',
                  icon: Icons.check_circle,
                  isActive: _permission == 'yes',
                  activeColor: kRsGreen,
                  activeBg: const LinearGradient(
                    colors: [Color(0xFFF0FAF0), Color(0xFFE8F5E9)],
                  ),
                  onTap: () => _setPermission('yes'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _permButton(
                  label: 'ไม่อนุญาต',
                  icon: Icons.cancel,
                  isActive: _permission == 'no',
                  activeColor: kRsError,
                  activeBg: const LinearGradient(
                    colors: [Color(0xFFFFF2F1), Color(0xFFFFE8E6)],
                  ),
                  onTap: () => _setPermission('no'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _permButton({
    required String label,
    required IconData icon,
    required bool isActive,
    required Color activeColor,
    required Gradient activeBg,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(vertical: 13, horizontal: 10),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(15),
          border: Border.all(
            color: isActive ? activeColor : kRsFieldBorder,
            width: 1.5,
          ),
          color: isActive ? null : kRsFieldBg,
          gradient: isActive ? activeBg : null,
          boxShadow: isActive
              ? [
                  BoxShadow(
                    color: activeColor.withValues(alpha: 0.14),
                    blurRadius: 12,
                    offset: const Offset(0, 3),
                  ),
                ]
              : null,
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 18,
              color: isActive ? activeColor : kRsOnSurfaceVar,
            ),
            const SizedBox(width: 7),
            Text(
              label,
              style: GoogleFonts.sarabun(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: isActive ? activeColor : kRsOnSurfaceVar,
              ),
            ),
          ],
        ),
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
                    _isSubmitting ? 'กำลังส่ง...' : 'ส่งรายงาน',
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