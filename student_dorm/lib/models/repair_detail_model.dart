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
  final String? appointmentDate;
  final String? finishDate;
  final String reportDate;
  // จำนวนครั้งที่ยื่นอุทธรณ์ได้ของเคสนี้ — เจ้าหน้าที่ปรับรายเคสได้ 1-5 (ค่าเริ่มต้น 2) backend เป็นผู้กำหนด
  final int maxComplaints;

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
