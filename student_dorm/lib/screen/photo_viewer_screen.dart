import 'package:flutter/material.dart';
import 'package:student_dorm/config/app_config.dart';
import 'package:student_dorm/models/repair_detail_model.dart' show RepairPhoto;

/// เซิร์ฟรูปจาก express.static('/uploads', ...) แยก host ออกจาก apiBaseUri
/// (ตัด path '/api' ทิ้ง) เพื่อประกอบเป็น URL เต็มของรูป
String photoFullUrl(String photoUrl) {
  final apiUri = Uri.parse(AppConfig.apiBaseUri);
  return '${apiUri.scheme}://${apiUri.authority}$photoUrl';
}

/// หน้าดูรูปภาพที่แนบมากับคำร้อง เลื่อนซ้าย-ขวาดูรูปถัดไป/ก่อนหน้าได้
/// รับ [photos] ที่ดึงมาจาก backend แล้วจาก CaseStatusScreen — หน้านี้ไม่ fetch เอง
class PhotoViewerScreen extends StatefulWidget {
  const PhotoViewerScreen({
    super.key,
    required this.photos,
    required this.initialIndex,
    required this.caseCode,
  });

  final List<RepairPhoto> photos;
  final int initialIndex;
  final String caseCode;

  @override
  State<PhotoViewerScreen> createState() => _PhotoViewerScreenState();
}

class _PhotoViewerScreenState extends State<PhotoViewerScreen> {
  late int _index;
  late final PageController _pageController;

  @override
  void initState() {
    super.initState();
    _index = widget.initialIndex;
    _pageController = PageController(initialPage: _index);
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _goTo(int index) {
    _pageController.animateToPage(
      index,
      duration: const Duration(milliseconds: 220),
      curve: Curves.easeOut,
    );
  }

  @override
  Widget build(BuildContext context) {
    final bool hasPrev = _index > 0;
    final bool hasNext = _index < widget.photos.length - 1;

    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Stack(
          alignment: Alignment.center,
          children: [
            PageView.builder(
              controller: _pageController,
              itemCount: widget.photos.length,
              onPageChanged: (i) => setState(() => _index = i),
              itemBuilder: (context, i) {
                return InteractiveViewer(
                  child: Center(
                    child: Image.network(
                      photoFullUrl(widget.photos[i].photoUrl),
                      fit: BoxFit.contain,
                      errorBuilder: (context, error, stackTrace) =>
                          const Icon(Icons.broken_image, color: Colors.white54, size: 48),
                      loadingBuilder: (context, child, progress) {
                        if (progress == null) return child;
                        return const CircularProgressIndicator(color: Colors.white54);
                      },
                    ),
                  ),
                );
              },
            ),
            Positioned(
              top: 8,
              left: 12,
              right: 12,
              child: Row(
                children: [
                  Material(
                    color: Colors.black.withValues(alpha: 0.45),
                    shape: const CircleBorder(),
                    child: InkWell(
                      customBorder: const CircleBorder(),
                      onTap: () => Navigator.of(context).pop(),
                      child: const SizedBox(
                        width: 38,
                        height: 38,
                        child: Icon(Icons.close, size: 20, color: Colors.white),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text.rich(
                      TextSpan(
                        style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w600, color: Colors.white),
                        children: [
                          const TextSpan(text: 'รหัส Case: '),
                          TextSpan(text: widget.caseCode, style: const TextStyle(fontWeight: FontWeight.w800)),
                          TextSpan(
                            text: '  ·  รูปที่ ${_index + 1}/${widget.photos.length}',
                            style: const TextStyle(color: Colors.white70, fontWeight: FontWeight.w500),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            if (hasPrev)
              Positioned(
                left: 8,
                child: _NavArrow(icon: Icons.chevron_left, onTap: () => _goTo(_index - 1)),
              ),
            if (hasNext)
              Positioned(
                right: 8,
                child: _NavArrow(icon: Icons.chevron_right, onTap: () => _goTo(_index + 1)),
              ),
          ],
        ),
      ),
    );
  }
}

class _NavArrow extends StatelessWidget {
  const _NavArrow({required this.icon, required this.onTap});

  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.black.withValues(alpha: 0.4),
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: SizedBox(width: 40, height: 40, child: Icon(icon, color: Colors.white, size: 24)),
      ),
    );
  }
}
