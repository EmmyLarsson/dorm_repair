import 'dart:io';
import 'package:flutter/material.dart';

/// Grid preview รูปที่อัพโหลดแล้ว พร้อมปุ่มลบ (ตาม .img-grid / .img-thumb)
class ImagePreviewGrid extends StatelessWidget {
  final List<File> images;
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
  final File file;
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
            child: Image.file(
              file,
              fit: BoxFit.cover,
              semanticLabel: 'รูปที่ ${index + 1}',
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