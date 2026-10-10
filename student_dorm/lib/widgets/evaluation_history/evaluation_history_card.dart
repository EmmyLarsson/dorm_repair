import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:student_dorm/color/colors.dart';
import 'package:student_dorm/models/evaluation_history_model.dart';

/// แถวดาว 1-5 (ใช้ทั้งการ์ดและ sheet รายละเอียด)
class EvaluationStars extends StatelessWidget {
  const EvaluationStars({super.key, required this.rating, this.size = 19});

  final int rating;
  final double size;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(
        5,
        (i) => Icon(Icons.star, size: size, color: i < rating ? kRsGold : const Color(0xFFDCD8C8)),
      ),
    );
  }
}

/// ผลการประเมินหนึ่งบรรทัด (ใช้ทั้งการ์ดและ sheet รายละเอียด จะได้หน้าตาตรงกันสองที่)
/// งานสำเร็จ = แถวดาว (+ "N / 5" ถ้า showScore) / งานซ่อมไม่สำเร็จ (rating เป็น null) = ป้ายแดง "ไม่ยอมรับผลซ่อม"
/// ไม่มี state ของตัวเอง แสดงตามค่าที่ parent ส่งมาเท่านั้น
class EvaluationResult extends StatelessWidget {
  const EvaluationResult({super.key, required this.rating, this.size = 19, this.showScore = true});

  final int? rating;
  final double size;
  final bool showScore;

  @override
  Widget build(BuildContext context) {
    final int? stars = rating;
    if (stars == null) {
      return Container(
        padding: EdgeInsets.fromLTRB(size * .37, size * .16, size * .53, size * .16),
        decoration: BoxDecoration(color: kCancelBg, borderRadius: BorderRadius.circular(999)),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.cancel, size: size * .85, color: kRsError),
            SizedBox(width: size * .26),
            Text('ไม่ยอมรับผลซ่อม',
                style: GoogleFonts.sarabun(fontSize: size * .66, fontWeight: FontWeight.w700, color: kRsError)),
          ],
        ),
      );
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        EvaluationStars(rating: stars, size: size),
        if (showScore) ...[
          const SizedBox(width: 8),
          Text('$stars / 5',
              style: GoogleFonts.sarabun(fontSize: 13, fontWeight: FontWeight.w700, color: kRsGoldText)),
        ],
      ],
    );
  }
}

/// การ์ดในรายการประวัติการประเมิน — แสดงแค่ข้อมูลสรุป รายละเอียดเต็มอยู่ใน sheet หลังกดการ์ด
class EvaluationHistoryCard extends StatelessWidget {
  const EvaluationHistoryCard({super.key, required this.item, required this.onTap});

  final EvaluationHistoryItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFE8E8EE)),
              boxShadow: [
                BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 3, offset: const Offset(0, 1)),
                BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 18, offset: const Offset(0, 6)),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(item.caseCode,
                        style: GoogleFonts.sarabun(fontSize: 14, fontWeight: FontWeight.w800, color: kNavy)),
                    Text('${item.isFailed ? 'ส่งเมื่อ' : 'ประเมินเมื่อ'} ${formatEvaluationDate(item.evaluatedAt)}',
                        style: GoogleFonts.sarabun(fontSize: 12, color: kRsMuted)),
                  ],
                ),
                const SizedBox(height: 8),
                EvaluationResult(rating: item.rating),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.category, size: 15, color: kNavyMid),
                    const SizedBox(width: 5),
                    Expanded(
                      child: Text(item.typeLabel,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.sarabun(fontSize: 12.5, color: kGray500)),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  item.feedback.isEmpty ? (item.isFailed ? 'ไม่ได้ระบุเหตุผล' : 'ไม่ได้เขียนข้อเสนอแนะ') : item.feedback,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: GoogleFonts.sarabun(
                    fontSize: 13.5,
                    height: 1.55,
                    color: item.feedback.isEmpty ? kGray400 : kGray700,
                    fontStyle: item.feedback.isEmpty ? FontStyle.italic : FontStyle.normal,
                  ),
                ),
                if (item.photoCount > 0) ...[
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.photo_library_outlined, size: 15, color: kRsMuted),
                      const SizedBox(width: 4),
                      Text('แนบรูป ${item.photoCount} รูป',
                          style: GoogleFonts.sarabun(fontSize: 12, color: kRsMuted)),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
