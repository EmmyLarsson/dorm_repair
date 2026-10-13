import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:student_dorm/color/colors.dart';
import 'package:student_dorm/screen/photo_viewer_screen.dart' show photoFullUrl;
import 'package:student_dorm/utils/app_api.dart';

/// ส่วนรูปโปรไฟล์ในหน้าแก้ไขข้อมูล (สไตล์อ้างอิงจาก
/// Prototype/Student/profile_edit.html .avatar-section)
/// เป็น StatefulWidget เพราะต้อง track รูปปัจจุบัน + สถานะกำลังอัปโหลด
/// ที่เปลี่ยนจากการกระทำของผู้ใช้เองภายใน widget นี้
class ProfileAvatarPicker extends StatefulWidget {
  const ProfileAvatarPicker({
    super.key,
    required this.personId,
    this.initialImageUrl,
    this.onUploaded,
  });

  /// person_id ของตัวเอง — backend ใช้เส้นทางอัปโหลดเดียวกับที่เจ้าหน้าที่ตั้งรูปให้คนอื่น
  /// และอนุญาตให้นักศึกษาใช้ได้เฉพาะ person_id ของบัญชีที่ล็อกอินอยู่
  final int personId;

  /// รูปล่าสุดจาก server (StudentProfile.imageUrl) — ใช้ก่อนค่าที่แคชไว้ตอนล็อกอิน เพราะแคชจะเก่าถ้า
  /// เจ้าหน้าที่ตั้งหรือเปลี่ยนรูปให้ทีหลัง
  final String? initialImageUrl;

  /// เรียกเมื่ออัปโหลดรูปสำเร็จ ให้หน้าที่เรียกใช้รู้ว่าต้อง refresh ข้อมูลตอนย้อนกลับ
  final VoidCallback? onUploaded;

  @override
  State<ProfileAvatarPicker> createState() => _ProfileAvatarPickerState();
}

class _ProfileAvatarPickerState extends State<ProfileAvatarPicker> {
  String? _imageUrl;
  bool _isUploading = false;

  @override
  void initState() {
    super.initState();
    _loadCurrentImage();
  }

  Future<void> _loadCurrentImage() async {
    final prefs = await SharedPreferences.getInstance();
    final serverImageUrl = widget.initialImageUrl;
    final imageUrl = (serverImageUrl != null && serverImageUrl.isNotEmpty)
        ? serverImageUrl
        : prefs.getString('image_url');
    if (!mounted) return;

    setState(() {
      _imageUrl = (imageUrl == null || imageUrl.isEmpty) ? null : imageUrl;
    });
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).clearSnackBars();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        backgroundColor: const Color(0xFF2A2C2E),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        margin: const EdgeInsets.only(bottom: 24, left: 40, right: 40),
        content: Text(
          message,
          style: GoogleFonts.sarabun(fontSize: 13, color: const Color(0xFFF0F0F3)),
        ),
      ),
    );
  }

  Future<void> _showImageSourcePicker() async {
    if (_isUploading) return;

    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return SafeArea(
          child: Wrap(
            children: [
              ListTile(
                leading: const Icon(Icons.photo_library_outlined, color: kNavyMid),
                title: Text('เลือกจากแกลเลอรี่', style: GoogleFonts.sarabun(fontSize: 14)),
                onTap: () => Navigator.of(context).pop(ImageSource.gallery),
              ),
              ListTile(
                leading: const Icon(Icons.photo_camera_outlined, color: kNavyMid),
                title: Text('ถ่ายภาพใหม่', style: GoogleFonts.sarabun(fontSize: 14)),
                onTap: () => Navigator.of(context).pop(ImageSource.camera),
              ),
            ],
          ),
        );
      },
    );

    if (source == null) return;

    // ใช้ XFile จาก image_picker เสมอ ห้ามแปลงเป็น dart:io.File
    // เพราะ dart:io.File ใช้ไม่ได้บน Flutter Web
    // จำกัด 500px เพราะรูปโปรไฟล์แสดงเป็นวงกลมเล็ก — ไม่ต้องส่งรูปเต็มขนาดขึ้น server
    final XFile? pickedFile = await ImagePicker().pickImage(
      source: source,
      imageQuality: 85,
      maxWidth: 500,
      maxHeight: 500,
    );
    if (pickedFile == null) return;

    await _uploadPhoto(pickedFile);
  }

  Future<void> _uploadPhoto(XFile file) async {
    setState(() {
      _isUploading = true;
    });

    try {
      final response = await AppAPI.uploadFiles(
        '/personnel/${widget.personId}/photo',
        [file],
        fieldName: 'photo',
      );
      final Map<String, dynamic> json = jsonDecode(response.body);

      if (json['isError'] == true || json['data'] == null) {
        _showMessage(json['errorMessage'] ?? 'อัปโหลดรูปภาพไม่สำเร็จ');
        return;
      }

      final String newImageUrl = json['data'] as String;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('image_url', newImageUrl);

      if (!mounted) return;
      setState(() {
        _imageUrl = newImageUrl;
      });
      widget.onUploaded?.call();
    } finally {
      if (mounted) {
        setState(() {
          _isUploading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        SizedBox(
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
                      color: Colors.black.withValues(alpha: 0.12),
                      blurRadius: 20,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: ClipOval(
                  child: Container(
                    color: kNavyLight,
                    alignment: Alignment.center,
                    child: _buildAvatarContent(),
                  ),
                ),
              ),
              Positioned(
                bottom: 0,
                right: 0,
                child: Material(
                  color: Colors.transparent,
                  shape: const CircleBorder(),
                  child: InkWell(
                    customBorder: const CircleBorder(),
                    onTap: _showImageSourcePicker,
                    child: Container(
                      width: 34,
                      height: 34,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: const LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [kRsGold, kRsGoldLight],
                        ),
                        border: Border.all(color: Colors.white, width: 2.5),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.18),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      alignment: Alignment.center,
                      child: const Icon(
                        Icons.photo_camera,
                        size: 16,
                        color: kRsOnPrimary,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 10),
        Text(
          'แตะที่ไอคอนกล้องเพื่อเปลี่ยนรูปภาพ',
          style: GoogleFonts.sarabun(fontSize: 12, color: kRsMuted),
        ),
      ],
    );
  }

  Widget _buildAvatarContent() {
    if (_isUploading) {
      return const SizedBox(
        width: 28,
        height: 28,
        child: CircularProgressIndicator(strokeWidth: 2.5, color: kNavyMid),
      );
    }

    if (_imageUrl != null) {
      return Image.network(
        photoFullUrl(_imageUrl!),
        width: 100,
        height: 100,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) =>
            const Icon(Icons.person, size: 52, color: kNavyMid),
      );
    }

    return const Icon(Icons.person, size: 52, color: kNavyMid);
  }
}
