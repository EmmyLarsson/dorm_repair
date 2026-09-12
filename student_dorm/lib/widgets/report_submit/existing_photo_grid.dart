import 'package:flutter/material.dart';
import 'package:student_dorm/models/repair_detail_model.dart' show RepairPhoto;
import 'package:student_dorm/screen/photo_viewer_screen.dart' show photoFullUrl;
import 'package:student_dorm/widgets/report_submit/attached_photo_viewer.dart';

/// Grid preview รูปที่เคยแนบไว้แล้ว (โหมดแก้ไข) พร้อมปุ่มลบ (ไอคอนถังขยะ
/// ต่างจาก ImagePreviewGrid ที่ใช้ ✕ เพราะรูปนี้ถูกบันทึกจริงในระบบแล้ว
/// กดลบ = ลบข้อมูลจริง ไม่ใช่แค่เอาออกจากรายการที่เพิ่งเลือก)
/// กดแล้วหายจากจอทันที แต่ยังไม่ลบจริงจนกว่าจะกด "แก้ไขรายงาน"
class ExistingPhotoGrid extends StatelessWidget {
  final List<RepairPhoto> photos;
  final void Function(int index) onRemove;

  const ExistingPhotoGrid({
    super.key,
    required this.photos,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    if (photos.isEmpty) return const SizedBox.shrink();

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: photos.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
        childAspectRatio: 1,
      ),
      itemBuilder: (context, index) {
        return _ExistingThumb(
          photo: photos[index],
          index: index,
          onRemove: () => onRemove(index),
        );
      },
    );
  }
}

class _ExistingThumb extends StatelessWidget {
  final RepairPhoto photo;
  final int index;
  final VoidCallback onRemove;

  const _ExistingThumb({
    required this.photo,
    required this.index,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E2E5), width: 1.5),
        color: const Color(0xFFEEEEF0),
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          Positioned.fill(
            child: GestureDetector(
              onTap: () => showAttachedPhotoViewer(
                context,
                image: Image.network(
                  photoFullUrl(photo.photoUrl),
                  fit: BoxFit.contain,
                  errorBuilder: (context, error, stackTrace) =>
                      const Icon(Icons.broken_image, color: Colors.white54, size: 48),
                  loadingBuilder: (context, child, progress) {
                    if (progress == null) return child;
                    return const Center(
                      child: CircularProgressIndicator(color: Colors.white54),
                    );
                  },
                ),
                onDelete: onRemove,
              ),
              child: Image.network(
                photoFullUrl(photo.photoUrl),
                fit: BoxFit.cover,
                semanticLabel: 'รูปเดิมที่ ${index + 1}',
                errorBuilder: (context, error, stackTrace) =>
                    const Icon(Icons.broken_image, color: Colors.grey),
                loadingBuilder: (context, child, progress) {
                  if (progress == null) return child;
                  return const Center(
                    child: SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                  );
                },
              ),
            ),
          ),
          Positioned(
            top: 5,
            right: 5,
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: onRemove,
              child: Container(
                width: 26,
                height: 26,
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.62),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.delete_outline, size: 15, color: Colors.white),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
