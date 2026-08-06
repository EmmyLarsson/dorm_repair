import 'dart:io';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:student_dorm/widgets/image_preview_grid.dart';

const Color kRsGoldText = Color(0xFF705D00);
const Color kRsBlue = Color(0xFF3B5BDB);
const Color kRsGreen = Color(0xFF2E7D32);
const Color kRsAmber = Color(0xFFE65100);
const Color kRsError = Color(0xFFBA1A1A);

const Color kRsOnSurface = Color(0xFF1A1C1E);
const Color kRsOnSurfaceVar = Color(0xFF4D4732);
const Color kRsMuted = Color(0xFF9A9185);
const Color kRsFieldBg = Color(0xFFFAF9F5);
const Color kRsFieldBorder = Color(0xFFD8D0BB);

class PhotoPermissionCard extends StatelessWidget {
  const PhotoPermissionCard({
    super.key,
    required this.uploadedImages,
    required this.permission,
    required this.maxImages,
    required this.maxFileMb,
    required this.onPickImages,
    required this.onTakePhoto,
    required this.onRemoveImage,
    required this.onPermissionChanged,
  });

  final List<File> uploadedImages;
  final String permission;

  final int maxImages;
  final double maxFileMb;

  final VoidCallback onPickImages;
  final VoidCallback onTakePhoto;
  final ValueChanged<int> onRemoveImage;
  final ValueChanged<String> onPermissionChanged;

  @override
  Widget build(BuildContext context) {
    final bool isFull = uploadedImages.length >= maxImages;

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
                  '${uploadedImages.length} / $maxImages',
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

          GestureDetector(
            onTap: isFull
                ? null
                : () => _showImageSourceSheet(context),
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
                          colors: [
                            Color(0xFFFFF8D6),
                            Color(0xFFFFF3B0),
                          ],
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
                      child: const Icon(
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
                      'สูงสุด $maxImages รูป • ไม่เกินรูปละ ${maxFileMb.toInt()} MB',
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

          if (uploadedImages.isNotEmpty) ...[
            const SizedBox(height: 12),
            ImagePreviewGrid(
              images: uploadedImages,
              onRemove: onRemoveImage,
            ),
          ],

          const SizedBox(height: 14),
          Container(
            height: 1,
            margin: const EdgeInsets.symmetric(vertical: 2),
            color: const Color(0xFFEDEAE0),
          ),
          const SizedBox(height: 14),

          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: 15,
              vertical: 13,
            ),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [
                  Color(0xFFEFF2FF),
                  Color(0xFFE8EEFF),
                ],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(15),
              border: Border.all(
                color: const Color(0xFFC5D0F5),
              ),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(
                  Icons.info,
                  size: 18,
                  color: kRsBlue,
                ),
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
                  isActive: permission == 'yes',
                  activeColor: kRsGreen,
                  activeBg: const LinearGradient(
                    colors: [
                      Color(0xFFF0FAF0),
                      Color(0xFFE8F5E9),
                    ],
                  ),
                  onTap: () => onPermissionChanged('yes'),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: _permButton(
                  label: 'ไม่อนุญาต',
                  icon: Icons.cancel,
                  isActive: permission == 'no',
                  activeColor: kRsError,
                  activeBg: const LinearGradient(
                    colors: [
                      Color(0xFFFFF2F1),
                      Color(0xFFFFE8E6),
                    ],
                  ),
                  onTap: () => onPermissionChanged('no'),
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
        padding: const EdgeInsets.symmetric(
          vertical: 13,
          horizontal: 10,
        ),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(15),
          border: Border.all(
            color: isActive
                ? activeColor
                : kRsFieldBorder,
            width: 1.5,
          ),
          color: isActive
              ? null
              : kRsFieldBg,
          gradient: isActive
              ? activeBg
              : null,
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
              color: isActive
                  ? activeColor
                  : kRsOnSurfaceVar,
            ),
            const SizedBox(width: 7),
            Text(
              label,
              style: GoogleFonts.sarabun(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: isActive
                    ? activeColor
                    : kRsOnSurfaceVar,
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showImageSourceSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(20),
        ),
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
                  style: GoogleFonts.sarabun(
                    fontSize: 14,
                  ),
                ),
                onTap: () {
                  Navigator.pop(context);
                  onPickImages();
                },
              ),
              ListTile(
                leading: const Icon(
                  Icons.photo_camera_outlined,
                  color: kRsGoldText,
                ),
                title: Text(
                  'ถ่ายภาพ',
                  style: GoogleFonts.sarabun(
                    fontSize: 14,
                  ),
                ),
                onTap: () {
                  Navigator.pop(context);
                  onTakePhoto();
                },
              ),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
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
}