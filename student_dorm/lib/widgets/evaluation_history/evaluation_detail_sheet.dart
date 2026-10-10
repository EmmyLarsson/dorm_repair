import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:student_dorm/color/colors.dart';
import 'package:student_dorm/models/evaluation_history_model.dart';
import 'package:student_dorm/models/repair_detail_model.dart' show RepairPhoto;
import 'package:student_dorm/screen/photo_viewer_screen.dart';
import 'package:student_dorm/widgets/evaluation_history/evaluation_history_card.dart';

/// ผลที่ sheet ส่งกลับให้หน้าแม่ผ่าน Navigator.pop — หน้าแม่เป็นคนเรียก API / เปิดหน้าแก้ไขเอง
/// (sheet ไม่ถือ logic ธุรกิจ ตามกฎ Stateless ของโปรเจกต์)
enum EvaluationSheetAction { edit, delete }

// (ข้อความ, ไอคอน, สีตัวหนังสือ, พื้นหลัง, ขอบ) ตามระดับดาว — ค่าชุดเดียวกับ evaluation_screen.dart
const Map<int, (String, IconData, Color, Color, Color)> _ratingLevels = {
  1: ('แย่มาก ไม่พึงพอใจ', Icons.sentiment_very_dissatisfied, kRsError, Color(0xFFFFF2F1), Color(0xFFF5C9C5)),
  2: ('พอใช้ ควรปรับปรุง', Icons.sentiment_dissatisfied, kRsAmber, Color(0xFFFFF3E0), Color(0xFFFFD699)),
  3: ('ปานกลาง', Icons.sentiment_neutral, kRsGoldText, Color(0xFFFFF8D6), Color(0xFFF0DC7A)),
  4: ('ดี พึงพอใจ', Icons.sentiment_satisfied, kRsBlue, Color(0xFFEFF2FF), Color(0xFFC5D0F5)),
  5: ('ยอดเยี่ยม ประทับใจมาก', Icons.sentiment_very_satisfied, kRsGreen, Color(0xFFE8F5E9), Color(0xFFB6DDB8)),
};

/// รายละเอียดการประเมินแบบรีวิว (เปิดจากการ์ดในประวัติการประเมิน) แก้ไข/ลบผ่านเมนู ⋮ ไม่มีปุ่มแยก
class EvaluationDetailSheet extends StatelessWidget {
  const EvaluationDetailSheet({super.key, required this.item, required this.photos});

  final EvaluationHistoryItem item;
  final List<RepairPhoto> photos;

  @override
  Widget build(BuildContext context) {
    // เคสไม่สำเร็จไม่มีดาว จึงไม่มีระดับดาวให้แสดง (level เป็น null → ซ่อนกรอบระดับด้านล่าง)
    final level = item.rating == null ? null : _ratingLevels[item.rating];

    return Container(
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.88),
      padding: EdgeInsets.fromLTRB(22, 12, 22, 28 + MediaQuery.of(context).padding.bottom),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4.5,
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(color: const Color(0xFFDADADC), borderRadius: BorderRadius.circular(999)),
              ),
            ),
            Row(
              children: [
                Container(
                  width: 46,
                  height: 46,
                  decoration: BoxDecoration(color: const Color(0xFFFFF8D6), borderRadius: BorderRadius.circular(14)),
                  alignment: Alignment.center,
                  child: Icon(item.isFailed ? Icons.rate_review : Icons.star, size: 24, color: kRsGoldText),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('${item.typeLabel} · ${item.caseCode}',
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.sarabun(fontSize: 16, fontWeight: FontWeight.w800, color: kRsOnSurface)),
                      Text(
                        '${item.isFailed ? 'ส่งเมื่อ' : 'ประเมินเมื่อ'} ${formatEvaluationDate(item.evaluatedAt)} เวลา ${formatEvaluationTime(item.evaluatedAt)} น.',
                        style: GoogleFonts.sarabun(fontSize: 12, color: kRsMuted),
                      ),
                    ],
                  ),
                ),
                PopupMenuButton<EvaluationSheetAction>(
                  tooltip: 'เมนูเพิ่มเติม',
                  icon: const Icon(Icons.more_vert, color: kGray700),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  color: Colors.white,
                  onSelected: (action) => Navigator.of(context).pop(action),
                  itemBuilder: (context) => [
                    PopupMenuItem(
                      value: EvaluationSheetAction.edit,
                      child: Row(children: [
                        const Icon(Icons.edit, size: 19, color: kGray700),
                        const SizedBox(width: 10),
                        Text(item.isFailed ? 'แก้ไขเหตุผล' : 'แก้ไขการประเมิน',
                            style: GoogleFonts.sarabun(fontSize: 14, fontWeight: FontWeight.w600)),
                      ]),
                    ),
                    PopupMenuItem(
                      value: EvaluationSheetAction.delete,
                      child: Row(children: [
                        const Icon(Icons.delete_outline, size: 19, color: kRsError),
                        const SizedBox(width: 10),
                        Text(item.isFailed ? 'ลบเหตุผล' : 'ลบการประเมิน',
                            style: GoogleFonts.sarabun(
                                fontSize: 14, fontWeight: FontWeight.w600, color: kRsError)),
                      ]),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 18),
            EvaluationResult(rating: item.rating, size: 28, showScore: false),
            if (level != null) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: level.$4,
                  border: Border.all(color: level.$5, width: 1.5),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(level.$2, size: 19, color: level.$3),
                    const SizedBox(width: 7),
                    Text(level.$1,
                        style: GoogleFonts.sarabun(fontSize: 13, fontWeight: FontWeight.w600, color: level.$3)),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 16),
            Text(
              item.feedback.isEmpty ? (item.isFailed ? 'ไม่ได้ระบุเหตุผล' : 'ไม่ได้เขียนข้อเสนอแนะ') : item.feedback,
              style: GoogleFonts.sarabun(
                fontSize: 15,
                height: 1.75,
                color: item.feedback.isEmpty ? kGray400 : kRsOnSurface,
                fontStyle: item.feedback.isEmpty ? FontStyle.italic : FontStyle.normal,
              ),
            ),
            if (photos.isNotEmpty) ...[
              const SizedBox(height: 16),
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: photos.length,
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 3,
                  crossAxisSpacing: 8,
                  mainAxisSpacing: 8,
                ),
                itemBuilder: (context, index) => GestureDetector(
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => PhotoViewerScreen(photos: photos, initialIndex: index, caseCode: item.caseCode),
                    ),
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.network(
                      photoFullUrl(photos[index].photoUrl),
                      fit: BoxFit.cover,
                      semanticLabel: 'รูปประกอบการประเมินที่ ${index + 1}',
                      errorBuilder: (context, error, stackTrace) => Container(
                        color: const Color(0xFFEEEEF0),
                        child: const Icon(Icons.broken_image, color: Colors.grey),
                      ),
                    ),
                  ),
                ),
              ),
            ],
            const SizedBox(height: 18),
            Container(
              padding: const EdgeInsets.only(top: 14),
              decoration: const BoxDecoration(border: Border(top: BorderSide(color: Color(0xFFEEEEEE)))),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _metaRow('วันที่ซ่อมเสร็จ', formatEvaluationDate(item.finishDate)),
                  const SizedBox(height: 6),
                  _metaRow('หมายเลข Case', item.caseCode),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _metaRow(String label, String value) {
    return Text.rich(
      TextSpan(
        style: GoogleFonts.sarabun(fontSize: 12.5, color: kRsMuted),
        children: [
          TextSpan(text: '$label: '),
          TextSpan(text: value, style: const TextStyle(fontWeight: FontWeight.w600, color: kGray700)),
        ],
      ),
    );
  }
}
