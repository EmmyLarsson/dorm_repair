import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:student_dorm/widgets/report_submit/attached_photo_viewer.dart';

/// Grid preview รูปที่อัพโหลดแล้ว พร้อมปุ่มลบ (ตาม .img-grid / .img-thumb)
/// ใช้ XFile + readAsBytes() แทน dart:io File เพราะ File ใช้งานบนเว็บ (Chrome) ไม่ได้
class ImagePreviewGrid extends StatelessWidget {
  final List<XFile> images;
  final void Function(int index) onRemove;

  const ImagePreviewGrid({
    super.key,
    required this.images,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    if (images.isEmpty) return const SizedBox.shrink();

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: images.length,
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
        childAspectRatio: 1,
      ),
      itemBuilder: (context, index) {
        return _ImageThumb(
          file: images[index],
          index: index,
          onRemove: () => onRemove(index),
        );
      },
    );
  }
}

class _ImageThumb extends StatelessWidget {
  final XFile file;
  final int index;
  final VoidCallback onRemove;

  const _ImageThumb({
    required this.file,
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
                image: FutureBuilder<Uint8List>(
                  future: file.readAsBytes(),
                  builder: (context, snapshot) {
                    if (!snapshot.hasData) {
                      return const Center(
                        child: CircularProgressIndicator(color: Colors.white54),
                      );
                    }
                    return Image.memory(snapshot.data!, fit: BoxFit.contain);
                  },
                ),
                onDelete: onRemove,
              ),
              child: FutureBuilder<Uint8List>(
                future: file.readAsBytes(),
                builder: (context, snapshot) {
                  if (!snapshot.hasData) {
                    return const Center(
                      child: SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    );
                  }
                  return Image.memory(
                    snapshot.data!,
                    fit: BoxFit.cover,
                    semanticLabel: 'รูปที่ ${index + 1}',
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
                child: const Icon(Icons.close, size: 14, color: Colors.white),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
