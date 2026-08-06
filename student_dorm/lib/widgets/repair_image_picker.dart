import 'dart:io';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import 'package:student_dorm/widgets/image_preview_grid.dart';

const Color kRsGoldText = Color(0xFF705D00);
const Color kRsAmber = Color(0xFFE65100);

const Color kRsOnSurface = Color(0xFF1A1C1E);
const Color kRsOnSurfaceVar = Color(0xFF4D4732);
const Color kRsMuted = Color(0xFF9A9185);
const Color kRsFieldBg = Color(0xFFFAF9F5);

class RepairImagePicker extends StatelessWidget {
  const RepairImagePicker({
    super.key,
    required this.images,
    required this.maxImages,
    required this.maxFileMb,
    required this.onSelectImageSource,
    required this.onRemoveImage,
  });

  final List<File> images;
  final int maxImages;
  final double maxFileMb;

  final VoidCallback onSelectImageSource;
  final ValueChanged<int> onRemoveImage;

  @override
  Widget build(BuildContext context) {
    final bool isFull = images.length >= maxImages;

    return Column(
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
                '${images.length} / $maxImages',
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
          onTap: isFull ? null : onSelectImageSource,
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

        if (images.isNotEmpty) ...[
          const SizedBox(height: 12),
          ImagePreviewGrid(
            images: images,
            onRemove: onRemoveImage,
          ),
        ],
      ],
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