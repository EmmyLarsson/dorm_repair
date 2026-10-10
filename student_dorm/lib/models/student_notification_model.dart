// รายการแจ้งเตือนของนักศึกษา = เหตุการณ์ฝั่งเจ้าหน้าที่/ระบบใน repair_timeline ของเคสตัวเอง (ไม่มีตารางแจ้งเตือนแยก)
class StudentNotification {
  final int timelineId;
  final int requestId;
  final String caseCode;
  final String stepCode;
  final String stepDetail;
  final String eventDate;
  final bool isUnread;

  StudentNotification({
    required this.timelineId,
    required this.requestId,
    required this.caseCode,
    required this.stepCode,
    required this.stepDetail,
    required this.eventDate,
    required this.isUnread,
  });

  factory StudentNotification.fromJson(Map<String, dynamic> json) {
    return StudentNotification(
      timelineId: json['timeline_id'] as int,
      requestId: json['request_id'] as int,
      caseCode: json['case_code'] as String? ?? '',
      stepCode: json['step_code'] as String? ?? '',
      stepDetail: json['step_detail'] as String? ?? '',
      eventDate: json['event_date'] as String? ?? '',
      // MariaDB ส่ง boolean เป็น 0/1 — รับให้ครบทุกแบบกัน type error
      isUnread: json['is_unread'] == true || json['is_unread'] == 1 || json['is_unread'] == '1',
    );
  }
}

class StudentNotificationResponse {
  final List<StudentNotification> items;
  // จำนวน "เคส" ที่มีอัปเดตยังไม่เปิดดู (ตัวเลขบนกระดิ่ง) ไม่ใช่จำนวนข้อความ
  final int unreadCaseCount;

  StudentNotificationResponse({required this.items, required this.unreadCaseCount});

  factory StudentNotificationResponse.fromJson(Map<String, dynamic> json) {
    final data = json['data'] as Map<String, dynamic>;
    return StudentNotificationResponse(
      items: (data['items'] as List).map((e) => StudentNotification.fromJson(e)).toList(),
      unreadCaseCount: (data['unread_case_count'] as num?)?.toInt() ?? 0,
    );
  }
}
