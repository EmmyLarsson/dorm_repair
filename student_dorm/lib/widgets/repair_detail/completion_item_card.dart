import 'package:flutter/material.dart';
import 'package:student_dorm/color/colors.dart';
import 'package:student_dorm/models/repair_detail_model.dart' show RepairCompletionItem;
import 'package:student_dorm/screen/photo_viewer_screen.dart' show PhotoViewerScreen, photoFullUrl;

/// การ์ดแสดงรายงานผลซ่อม "1 รายการงานซ่อม" — อ่านอย่างเดียว รับข้อมูลจาก parent มาโชว์เฉยๆ
/// ไม่มี state ของตัวเองเลย จึงเป็น StatelessWidget ได้ตามกฎ CLAUDE.md 1.4
class CompletionItemCard extends StatelessWidget {
  final RepairCompletionItem item;
  // รหัสเคส ใช้ตั้งชื่อหัวหน้าดูรูปตอนกดภาพย่อ (PhotoViewerScreen ต้องการ caseCode)
  final String caseCode;

  const CompletionItemCard({super.key, required this.item, required this.caseCode});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: kGray200, width: 1.5),
        boxShadow: const [BoxShadow(color: Color(0x0F000000), blurRadius: 14, offset: Offset(0, 2))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 10),
            decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: kGray200))),
            child: Row(
              children: [
                const Icon(Icons.build, size: 16, color: kBlue),
                const SizedBox(width: 6),
                Text(
                  item.repairTypeName,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: kText),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  item.reportText.isEmpty ? 'ยังไม่มีรายงาน' : item.reportText,
                  // เดิมใช้ kTextMuted (สีเทาอ่อน เอาไว้กับข้อความรอง) ทั้งที่นี่คือเนื้อหารายงานจริง
                  // ที่นักศึกษาต้องอ่านเพื่อตัดสินใจกดยอมรับ/ยื่นคำร้อง ควรใช้สีเข้มอ่านง่ายกว่านี้
                  style: TextStyle(
                    fontSize: 13,
                    height: 1.65,
                    color: item.reportText.isEmpty ? kTextMuted : kText,
                  ),
                ),
                if (item.photos.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (int index = 0; index < item.photos.length; index++)
                        // แตะภาพย่อ = ดูรูปเต็มและเลื่อนดูรูปอื่นของรายการซ่อมนี้ได้ (แบบเดียวกับรูปในคำร้อง/อุทธรณ์)
                        // มีไอคอนแว่นขยายบนรูปบอกว่ากดดูรูปเต็มได้ (รูปงานซ่อมที่เจ้าหน้าที่ส่งมา)
                        _PhotoThumbnail(
                          photoUrl: photoFullUrl(item.photos[index].photoUrl),
                          onTap: () => Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => PhotoViewerScreen(
                                photos: item.photos,
                                initialIndex: index,
                                caseCode: caseCode,
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// ภาพย่อรูปงานซ่อมที่เจ้าหน้าที่ส่งมา พร้อมไอคอนแว่นขยายมุมขวาล่าง — แตะที่ภาพหรือไอคอนเพื่อเปิดดูรูปเต็ม
/// ไม่มี state ของตัวเอง จึงเป็น StatelessWidget ตามกฎ CLAUDE.md 1.4
class _PhotoThumbnail extends StatelessWidget {
  const _PhotoThumbnail({required this.photoUrl, required this.onTap});

  static const double _size = 84;

  final String photoUrl;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      label: 'ดูรูปขยาย',
      child: GestureDetector(
        onTap: onTap,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: SizedBox(
            width: _size,
            height: _size,
            child: Stack(
              fit: StackFit.expand,
              children: [
                Image.network(
                  photoUrl,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) => Container(
                    color: kGray100,
                    child: const Icon(Icons.broken_image, color: kGray400),
                  ),
                ),
                // ไอคอนแว่นขยายบอกว่ากดดูรูปเต็มได้ — พื้นหลังเข้มโปร่งเพื่ออ่านออกบนรูปทุกสี
                Positioned(
                  right: 5,
                  bottom: 5,
                  child: Container(
                    width: 26,
                    height: 26,
                    decoration: const BoxDecoration(color: Color(0x99000000), shape: BoxShape.circle),
                    child: const Icon(Icons.zoom_in, size: 18, color: Colors.white),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
