import 'package:flutter/material.dart';
import 'package:student_dorm/color/colors.dart';
import 'package:student_dorm/models/repair_detail_model.dart' show RepairCompletionItem;
import 'package:student_dorm/screen/photo_viewer_screen.dart' show photoFullUrl;

/// การ์ดแสดงรายงานผลซ่อม "1 รายการงานซ่อม" — อ่านอย่างเดียว รับข้อมูลจาก parent มาโชว์เฉยๆ
/// ไม่มี state ของตัวเองเลย จึงเป็น StatelessWidget ได้ตามกฎ CLAUDE.md 1.4
class CompletionItemCard extends StatelessWidget {
  final RepairCompletionItem item;

  const CompletionItemCard({super.key, required this.item});

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
                    children: item.photos.map((photo) {
                      return ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.network(
                          photoFullUrl(photo.photoUrl),
                          width: 84,
                          height: 84,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) => Container(
                            width: 84,
                            height: 84,
                            color: kGray100,
                            child: const Icon(Icons.broken_image, color: kGray400),
                          ),
                        ),
                      );
                    }).toList(),
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
