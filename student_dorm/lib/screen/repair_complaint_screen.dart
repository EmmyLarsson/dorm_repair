import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:student_dorm/color/colors.dart';
import 'package:student_dorm/utils/app_api.dart';
import 'package:student_dorm/widgets/repair_complaint/complaint_app_bar.dart';
import 'package:student_dorm/widgets/repair_complaint/complaint_bottom_bar.dart';
import 'package:student_dorm/widgets/repair_complaint/complaint_photo_card.dart';
import 'package:student_dorm/widgets/repair_complaint/complaint_text_card.dart';

/// หน้าจอยื่นคำร้องแจ้งแก้ไขงานซ่อม (ไม่พอใจผลการซ่อม) — ไม่มี mockup อ้างอิง
/// ยืมสไตล์การ์ด/แนบรูปจาก evaluation_screen.dart มาใช้ตรงๆ ส่วนที่ไม่มี state ของตัวเอง
/// (AppBar, การ์ดกรอกข้อความ, การ์ดแนบรูป, แถบปุ่มด้านล่าง) แยกเป็น StatelessWidget ไว้ที่
/// lib/widgets/repair_complaint/ ตามกฎ CLAUDE.md ข้อ 1.4
class RepairComplaintScreen extends StatefulWidget {
  const RepairComplaintScreen({super.key, required this.requestId});

  final int requestId;

  @override
  State<RepairComplaintScreen> createState() => _RepairComplaintScreenState();
}

class _RepairComplaintScreenState extends State<RepairComplaintScreen> {
  final TextEditingController _textController = TextEditingController();
  final ImagePicker _picker = ImagePicker();

  static const int _maxImages = 6;
  static const double _maxFileMb = 10;

  bool _isSubmitting = false;
  final List<XFile> _newPhotos = [];

  @override
  void dispose() {
    _textController.dispose();
    super.dispose();
  }

  Future<void> _pickImages() async {
    if (_newPhotos.length >= _maxImages) return;

    final List<XFile> picked = await _picker.pickMultiImage(imageQuality: 85);
    if (picked.isEmpty) return;

    int skippedSize = 0;
    final List<XFile> accepted = [];

    for (final xfile in picked) {
      if (_newPhotos.length + accepted.length >= _maxImages) break;
      final sizeInMb = await xfile.length() / (1024 * 1024);
      if (sizeInMb > _maxFileMb) {
        skippedSize++;
        continue;
      }
      accepted.add(xfile);
    }

    setState(() {
      _newPhotos.addAll(accepted);
    });

    if (skippedSize > 0 && mounted) {
      _showToast('$skippedSize ไฟล์มีขนาดเกิน ${_maxFileMb.toInt()} MB', isWarn: true);
    }
  }

  Future<void> _pickFromCamera() async {
    if (_newPhotos.length >= _maxImages) return;
    final XFile? shot = await _picker.pickImage(source: ImageSource.camera, imageQuality: 85);
    if (shot == null) return;
    setState(() {
      _newPhotos.add(shot);
    });
  }

  void _removeNewPhoto(int index) {
    setState(() {
      _newPhotos.removeAt(index);
    });
  }

  void _showImageSourceSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.photo_library_outlined, color: kRsBlue),
                title: Text('เลือกจากคลังภาพ', style: GoogleFonts.sarabun(fontSize: 14)),
                onTap: () {
                  Navigator.pop(context);
                  _pickImages();
                },
              ),
              ListTile(
                leading: const Icon(Icons.photo_camera_outlined, color: kRsGoldText),
                title: Text('ถ่ายภาพ', style: GoogleFonts.sarabun(fontSize: 14)),
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

  Future<void> _handleSubmit() async {
    final text = _textController.text.trim();
    if (text.isEmpty) {
      _showToast('โปรดระบุรายละเอียดปัญหาก่อนส่งคำร้อง', isWarn: true);
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    http.Response response;
    try {
      response = await AppAPI.uploadFiles(
        '/repair_request/complaint',
        _newPhotos,
        fieldName: 'photos',
        fields: {
          'request_id': '${widget.requestId}',
          'complaint_text': text,
        },
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isSubmitting = false;
      });
      _showToast('ส่งคำร้องไม่สำเร็จ: $e', isWarn: true);
      return;
    }

    if (!mounted) return;

    setState(() {
      _isSubmitting = false;
    });

    final Map<String, dynamic> json = jsonDecode(response.body);
    if (json['isError'] == true) {
      _showToast(json['errorMessage'] as String? ?? 'ส่งคำร้องไม่สำเร็จ', isWarn: true);
      return;
    }

    _showSuccessModal();
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
            Icon(isWarn ? Icons.warning_amber_rounded : Icons.info_outline, size: 17, color: kRsGold),
            const SizedBox(width: 8),
            Flexible(
              child: Text(
                message,
                style: GoogleFonts.sarabun(fontSize: 13, fontWeight: FontWeight.w500, color: const Color(0xFFF0F0F3)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showSuccessModal() {
    final BuildContext pageContext = context;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black.withValues(alpha: 0.5),
      builder: (sheetContext) {
        return Container(
          padding: EdgeInsets.fromLTRB(24, 12, 24, 32 + MediaQuery.of(context).padding.bottom),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.only(topLeft: Radius.circular(28), topRight: Radius.circular(28)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4.5,
                margin: const EdgeInsets.only(bottom: 24),
                decoration: BoxDecoration(color: const Color(0xFFDADADC), borderRadius: BorderRadius.circular(999)),
              ),
              Container(
                width: 88,
                height: 88,
                margin: const EdgeInsets.only(bottom: 18),
                decoration: BoxDecoration(color: kRsAmber.withValues(alpha: 0.1), shape: BoxShape.circle),
                alignment: Alignment.center,
                child: Container(
                  width: 68,
                  height: 68,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [kRsAmber, kRsAmber.withValues(alpha: 0.75)],
                    ),
                    boxShadow: [
                      BoxShadow(color: kRsAmber.withValues(alpha: 0.38), blurRadius: 20, offset: const Offset(0, 6)),
                    ],
                  ),
                  child: const Icon(Icons.check, color: Colors.white, size: 38),
                ),
              ),
              Text(
                'ส่งคำร้องเรียบร้อยแล้ว',
                style: GoogleFonts.sarabun(fontSize: 22, fontWeight: FontWeight.w800, color: kRsOnSurface, letterSpacing: -0.2),
              ),
              const SizedBox(height: 8),
              Text(
                'เจ้าหน้าที่จะตรวจสอบคำร้องของคุณ\nและดำเนินการแก้ไขงานซ่อมต่อไป',
                textAlign: TextAlign.center,
                style: GoogleFonts.sarabun(fontSize: 13.5, color: const Color(0xFF7E775F), height: 1.75),
              ),
              const SizedBox(height: 20),
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
                        BoxShadow(color: kRsNavy.withValues(alpha: 0.4), blurRadius: 24, offset: const Offset(0, 6)),
                      ],
                    ),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(999),
                      onTap: () {
                        Navigator.of(sheetContext).pop();
                        Navigator.of(pageContext).pop(true);
                      },
                      child: Center(
                        child: Text(
                          'เสร็จสิ้น',
                          style: GoogleFonts.sarabun(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white),
                        ),
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

  @override
  Widget build(BuildContext context) {
    final textTheme = GoogleFonts.sarabunTextTheme(Theme.of(context).textTheme);

    return Theme(
      data: Theme.of(context).copyWith(textTheme: textTheme),
      child: Scaffold(
        backgroundColor: kRsSurface,
        body: Column(
          children: [
            const ComplaintAppBar(),
            Expanded(
              child: Stack(
                children: [
                  SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(18, 20, 18, 140),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        ComplaintTextCard(controller: _textController),
                        const SizedBox(height: 18),
                        ComplaintPhotoCard(
                          photos: _newPhotos,
                          maxImages: _maxImages,
                          maxFileMb: _maxFileMb,
                          onAddTap: _showImageSourceSheet,
                          onRemove: _removeNewPhoto,
                        ),
                      ],
                    ),
                  ),
                  Positioned(
                    left: 0,
                    right: 0,
                    bottom: 0,
                    child: ComplaintBottomBar(isSubmitting: _isSubmitting, onSubmit: _handleSubmit),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
