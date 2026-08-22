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
