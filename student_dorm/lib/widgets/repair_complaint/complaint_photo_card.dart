import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'package:student_dorm/color/colors.dart';
import 'package:student_dorm/widgets/report_submit/image_preview_grid.dart';

/// การ์ดแนบรูปประกอบคำร้อง — รับรายการรูปที่เลือกแล้ว + callback มาโชว์/ลบ/เพิ่มเท่านั้น
/// ตัวเลือกไฟล์จริง (image_picker) และรายการ _newPhotos ยังเก็บอยู่ที่ parent เหมือนเดิม
/// widget นี้จึงไม่มี state ของตัวเอง เป็น StatelessWidget ได้
class ComplaintPhotoCard extends StatelessWidget {
  final List<XFile> photos;
  final int maxImages;
  final double maxFileMb;
  final VoidCallback onAddTap;
  final void Function(int index) onRemove;

  const ComplaintPhotoCard({
    super.key,
    required this.photos,
    required this.maxImages,
    required this.maxFileMb,
    required this.onAddTap,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    final bool isFull = photos.length >= maxImages;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFD0C6AB).withValues(alpha: 0.35)),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 3, offset: const Offset(0, 1)),
          BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 20, offset: const Offset(0, 6)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(color: const Color(0xFFE8EDFF), borderRadius: BorderRadius.circular(14)),
                alignment: Alignment.center,
                child: const Icon(Icons.add_a_photo, size: 22, color: kRsBlue),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('รูปภาพประกอบ', style: GoogleFonts.sarabun(fontSize: 15.5, fontWeight: FontWeight.w700, color: kRsOnSurface, height: 1.25)),
                    Padding(
                      padding: const EdgeInsets.only(top: 1),
                      child: Text(
                        'แนบรูปจุดที่มีปัญหา (ไม่บังคับ)',
                        style: GoogleFonts.sarabun(fontSize: 11, fontWeight: FontWeight.w500, color: kRsMuted),
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 4),
                decoration: BoxDecoration(color: const Color(0xFFEEEEF0), borderRadius: BorderRadius.circular(999)),
                child: Text(
                  '${photos.length} / $maxImages',
                  style: GoogleFonts.sarabun(fontSize: 11.5, fontWeight: FontWeight.w700, color: kRsOnSurfaceVar),
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          GestureDetector(
            onTap: isFull ? null : onAddTap,
            child: Opacity(
              opacity: isFull ? 0.5 : 1,
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 30, horizontal: 16),
                decoration: BoxDecoration(
                  color: kRsFieldBg,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFCCC5B0), width: 2),
                ),
                child: Column(
                  children: [
                    Container(
                      width: 58,
                      height: 58,
                      margin: const EdgeInsets.only(bottom: 6),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFFFFF8D6), Color(0xFFFFF3B0)]),
                        borderRadius: BorderRadius.circular(18),
                        boxShadow: [BoxShadow(color: kRsGoldText.withValues(alpha: 0.14), blurRadius: 10, offset: const Offset(0, 2))],
                      ),
                      child: Icon(Icons.upload, size: 28, color: kRsGoldText),
                    ),
                    Text('แนบรูปภาพประกอบ', style: GoogleFonts.sarabun(fontSize: 13.5, fontWeight: FontWeight.w700, color: kRsOnSurface)),
                    const SizedBox(height: 2),
                    Text(
                      'สูงสุด $maxImages รูป • ไม่เกินรูปละ ${maxFileMb.toInt()} MB',
                      style: GoogleFonts.sarabun(fontSize: 11.5, color: kRsMuted),
                    ),
                  ],
                ),
              ),
            ),
          ),
          if (photos.isNotEmpty) ...[
            const SizedBox(height: 12),
            ImagePreviewGrid(images: photos, onRemove: onRemove),
          ],
        ],
      ),
    );
  }
}
