/// 1 รายการในหน้า "ประวัติการประเมิน" — มาจาก GET /repair_evaluation/get_all_by_user
/// (รูปเต็มไม่อยู่ในรายการนี้ มีแค่จำนวน เพราะดึงตอนเปิดรายละเอียดจาก /repair_request/:id/evaluation)
class EvaluationHistoryItem {
  final int requestId;
  final String caseCode;
  final int rating;
  final String feedback;
  final String evaluatedAt;
  final String? finishDate;
  final List<String> typeNames;
  final int photoCount;

  const EvaluationHistoryItem({
    required this.requestId,
    required this.caseCode,
    required this.rating,
    required this.feedback,
    required this.evaluatedAt,
    required this.finishDate,
    required this.typeNames,
    required this.photoCount,
  });

  factory EvaluationHistoryItem.fromJson(Map<String, dynamic> json) {
    final rawTypes = json['type_names'] as String? ?? '';
    return EvaluationHistoryItem(
      requestId: (json['request_id'] as num?)?.toInt() ?? 0,
      caseCode: json['case_code'] as String? ?? '',
      // กัน rating นอกช่วง 1-5 ทำให้แถวดาววาดผิด (backend ตรวจแล้ว แต่ UI ไม่ควรพึ่งอย่างเดียว)
      rating: ((json['rating'] as num?)?.toInt() ?? 0).clamp(0, 5),
      feedback: json['feedback'] as String? ?? '',
      evaluatedAt: json['evaluated_at'] as String? ?? '',
      finishDate: json['finish_date'] as String?,
      typeNames: rawTypes.isEmpty ? <String>[] : rawTypes.split(',').map((e) => e.trim()).toList(),
      photoCount: (json['photo_count'] as num?)?.toInt() ?? 0,
    );
  }

  String get typeLabel => typeNames.isEmpty ? 'ไม่ระบุประเภทงาน' : typeNames.join(', ');
}

/// 'YYYY-MM-DD HH:mm:ss' → 'DD/MM/พ.ศ.' (ว่าง/รูปแบบผิดคืน '-' แทนที่จะ throw)
String formatEvaluationDate(String? raw) {
  final dt = raw == null ? null : DateTime.tryParse(raw.replaceFirst(' ', 'T'));
  if (dt == null) return '-';
  return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year + 543}';
}

/// 'YYYY-MM-DD HH:mm:ss' → 'HH:mm'
String formatEvaluationTime(String? raw) {
  final dt = raw == null ? null : DateTime.tryParse(raw.replaceFirst(' ', 'T'));
  if (dt == null) return '-';
  return '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
}
