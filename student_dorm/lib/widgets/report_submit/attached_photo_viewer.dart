import 'package:flutter/material.dart';

/// เปิดดูรูปที่แนบ (ตอนแจ้งซ่อม/แก้ไข) แบบเต็มจอ ดูทีละรูป — ไม่มีเลื่อนซ้าย-ขวา
/// caller เตรียม [image] (Image.memory สำหรับรูปใหม่ในเครื่อง หรือ Image.network สำหรับรูปเดิมบน
/// server พร้อม loading/error handling) มาเอง viewer นี้ไม่สนใจว่ารูปมาจากไหน
void showAttachedPhotoViewer(
  BuildContext context, {
  required Widget image,
  required VoidCallback onDelete,
}) {
  Navigator.of(context).push(
    PageRouteBuilder(
      opaque: false,
      barrierColor: Colors.black,
      pageBuilder: (context, animation, secondaryAnimation) => FadeTransition(
        opacity: animation,
        child: AttachedPhotoViewer(image: image, onDelete: onDelete),
      ),
    ),
  );
}

/// หน้าจอดูรูปเต็มจอแบบ stateless — ดูรูปเดียว ไม่มีสไลด์เลื่อนไปรูปอื่น (ไม่มี index ต้อง track)
/// ปุ่ม ✕ ปิด (ซ้ายบน) แค่ pop, ปุ่มถังขยะลบ (ขวาบน) เรียก onDelete() แล้ว pop
class AttachedPhotoViewer extends StatelessWidget {
  final Widget image;
  final VoidCallback onDelete;

  const AttachedPhotoViewer({super.key, required this.image, required this.onDelete});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          Positioned.fill(
            child: Center(
              child: InteractiveViewer(child: image),
            ),
          ),
          Positioned(
            top: 12,
            left: 12,
            child: SafeArea(
              child: _CircleButton(
                icon: Icons.close,
                onTap: () => Navigator.of(context).pop(),
              ),
            ),
          ),
          Positioned(
            top: 12,
            right: 12,
            child: SafeArea(
              child: _CircleButton(
                icon: Icons.delete_outline,
                onTap: () {
                  onDelete();
                  Navigator.of(context).pop();
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CircleButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;

  const _CircleButton({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: 0.62),
          shape: BoxShape.circle,
        ),
        child: Icon(icon, size: 20, color: Colors.white),
      ),
    );
  }
}
