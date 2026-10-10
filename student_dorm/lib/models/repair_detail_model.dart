class RepairDetail {
  final String caseCode;
  final String studentName;
  final String contactPhone;
  final String roomNumber;
  final bool allowEntry;
  final List<String> typeNames;
  final String description;
  final int statusId;
  final String statusName;
  final String? technicianName;
  final String? technicianPhone;
  // วันนัดปัจจุบันของรอบที่เคสอยู่ (รอบแก้ไข = นัดแก้ไข) วันนัดเดิมก่อนเลื่อน/ก่อนเข้ารอบแก้ไขดูจากไทม์ไลน์
  final String? appointmentDate;
  final String? finishDate;
  final String reportDate;
  // จำนวนครั้งที่ยื่นอุทธรณ์ได้ของเคสนี้ — เจ้าหน้าที่ปรับรายเคสได้ 1-5 (ค่าเริ่มต้น 2) backend เป็นผู้กำหนด
  final int maxComplaints;
  // ปุ่ม "เร่งการจัดการงาน": backend เป็นผู้ตัดสิน (เลยช่วงนัด + สถานะซ่อมอยู่ + พ้นรอบ 24 ชม.) — แอปแค่แสดงตาม
  // nextRushAt มีค่าเฉพาะตอนยังติดรอบ (เวลาที่กดได้อีกครั้ง)
  final bool canRush;
  final String? nextRushAt;
  // เวลาที่ระบบจะปิดงานให้อัตโนมัติถ้านักศึกษาไม่ยืนยัน (มีค่าเฉพาะสถานะ 3) backend คำนวณจาก finish_date + จำนวนวันที่ตั้งไว้
  final String? autoCloseAt;
  // เจ้าหน้าที่ผู้ดูแลเคส (ผู้อนุมัติ) ให้นักศึกษาติดต่อได้ — null ถ้าเคสยังไม่มีผู้อนุมัติ
  final String? moderatorName;
  final String? moderatorPhone;

  const RepairDetail({
    required this.caseCode,
    required this.studentName,
    required this.contactPhone,
    required this.roomNumber,
    required this.allowEntry,
    required this.typeNames,
    required this.description,
    required this.statusId,
    required this.statusName,
    required this.technicianName,
    required this.technicianPhone,
    required this.appointmentDate,
    required this.finishDate,
    required this.reportDate,
    required this.maxComplaints,
    this.canRush = false,
    this.nextRushAt,
    this.autoCloseAt,
    this.moderatorName,
    this.moderatorPhone,
  });

  factory RepairDetail.fromJson(Map<String, dynamic> json) {
    final rawTypes = json['type_names'] as String? ?? '';
    final types = rawTypes.isEmpty
        ? <String>[]
        : rawTypes.split(',').map((e) => e.trim()).toList();

    return RepairDetail(
      caseCode: json['case_code'] as String? ?? '',
      studentName: json['student_name'] as String? ?? '',
      contactPhone: json['contact_phone'] as String? ?? '',
      roomNumber: json['room_number'] as String? ?? '',
      allowEntry: (json['allow_entry'] as num? ?? 0) == 1,
      typeNames: types,
      description: json['description'] as String? ?? '',
      statusId: json['progress_status_id'] as int? ?? 1,
      statusName: json['progress_status_name'] as String? ?? 'รอตรวจสอบ',
      technicianName: json['technician_name'] as String?,
      technicianPhone: json['technician_phone'] as String?,
      appointmentDate: json['appointment_date'] as String?,
      finishDate: json['finish_date'] as String?,
      reportDate: json['report_date'] as String? ?? '',
      // ถ้า backend ไม่ส่งมา (เวอร์ชันเก่า) ใช้ 2 ตามกติกาเดิม
      maxComplaints: json['max_complaints'] as int? ?? 2,
      // MariaDB ส่ง boolean เป็น 0/1 — รับให้ครบทุกแบบกัน type error
      canRush: json['can_rush'] == true || json['can_rush'] == 1 || json['can_rush'] == '1',
      nextRushAt: json['next_rush_at'] as String?,
      autoCloseAt: json['auto_close_at'] as String?,
      moderatorName: json['moderator_name'] as String?,
      moderatorPhone: json['moderator_phone'] as String?,
    );
  }
}

class RepairPhoto {
  final int photoId;
  final String photoUrl;

  const RepairPhoto({required this.photoId, required this.photoUrl});

  factory RepairPhoto.fromJson(Map<String, dynamic> json) {
    return RepairPhoto(
      photoId: json['photo_id'] as int,
      photoUrl: json['photo_url'] as String? ?? '',
    );
  }
}

// รายงานผลซ่อม "1 รายการงานซ่อม" (repair_type) ของเคส — เคสที่เลือกหลายอาการตอนแจ้งซ่อมจะมีหลายแถว
class RepairCompletionItem {
  final int completionItemId;
  final int repairTypeId;
  final String repairTypeName;
  final String reportText;
  final List<RepairPhoto> photos;
  // 0 = รายงานการซ่อม (ซ่อมรอบแรก), 1-2 = รายงานการแก้ไขครั้งที่ 1-2 (อุทธรณ์ได้สูงสุด 2 รอบ)
  final int revisionRound;

  const RepairCompletionItem({
    required this.completionItemId,
    required this.repairTypeId,
    required this.repairTypeName,
    required this.reportText,
    required this.photos,
    this.revisionRound = 0,
  });

  factory RepairCompletionItem.fromJson(Map<String, dynamic> json) {
    final photos = (json['photos'] as List? ?? [])
        .map((e) => RepairPhoto(
              photoId: e['completion_item_photo_id'] as int,
              photoUrl: e['photo_url'] as String? ?? '',
            ))
        .toList();

    return RepairCompletionItem(
      completionItemId: json['completion_item_id'] as int,
      repairTypeId: json['repair_type_id'] as int,
      repairTypeName: json['repair_type_name'] as String? ?? '',
      reportText: json['report_text'] as String? ?? '',
      photos: photos,
      revisionRound: json['revision_round'] as int? ?? 0,
    );
  }
}

class TimelineStep {
  final String stepCode;
  final String? detail;
  final String eventDate;

  const TimelineStep({
    required this.stepCode,
    required this.detail,
    required this.eventDate,
  });

  factory TimelineStep.fromJson(Map<String, dynamic> json) {
    return TimelineStep(
      stepCode: json['step_code'] as String,
      detail: json['event_detail'] as String?,
      eventDate: json['event_date'] as String? ?? '',
    );
  }
}
