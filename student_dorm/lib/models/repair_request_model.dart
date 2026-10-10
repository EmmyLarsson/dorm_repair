import 'package:intl/intl.dart';

class RepairRequestModel {
  int requestId = 0;
  String caseCode = "";
  List<String> typeNames;
  String description = "";
  int statusId = 0;
  String statusName = "";
  String createdAt = "";
  // ธงทั้งหมดคำนวณที่ backend (เวลา server) แอปแค่แสดง — ค่า null จาก SQL (เคสที่ยังไม่มีวันนัด) ถือเป็น false
  bool hasUnread;
  bool isDueToday;
  bool isOverdue;
  bool isRecentlyClosed;
  // ผลล่าสุดที่เจ้าหน้าที่ตัดสินกับเคส: approved (อนุมัติคำร้อง) / cancelled (ปฏิเสธคำร้อง) / complaint_approved /
  // complaint_rejected (ผลอุทธรณ์) และอยู่ในช่วงเวลา "ล่าสุด" ไหม (backend ตัดสินด้วยเวลา server)
  String? lastDecisionStep;
  bool isDecisionRecent;

  RepairRequestModel({
    required this.requestId,
    required this.caseCode,
    required this.typeNames,
    required this.description,
    required this.statusId,
    required this.statusName,
    required this.createdAt,
    this.hasUnread = false,
    this.isDueToday = false,
    this.isOverdue = false,
    this.isRecentlyClosed = false,
    this.lastDecisionStep,
    this.isDecisionRecent = false,
  });

  DateTime getRepairRequestDateTime() {
    DateFormat inputFormat = DateFormat('dd-MM-yyyy HH:mm:ss');
    return inputFormat.parse(createdAt);
  }

  
  factory RepairRequestModel.fromJson(Map<String, dynamic> json) {
    String rawTypes = json['type_names'] as String? ?? "";
    List<String> parsedTypes = [];
    if (rawTypes.isNotEmpty) {
      parsedTypes = rawTypes.split(',').map((e) => e.trim()).toList();
    }
    // print(json['request_id']);
    // print(json['case_code']);
    // print(parsedTypes);
    // print(json['description']);
    // print(json['progress_status_id']);
    // print(json['progress_status_name']);
    // print(json['report_date']);

    // มีคำร้องค้างตอนนี้เป็นสถานะจริงแล้ว (progress_status_id = 7 "รอตรวจสอบคำร้อง") ไม่ต้องคำนวณ/
    // ปลอมชื่อสถานะเองอีกต่อไป — statusName ที่ backend ส่งมาคือชื่อจริงของสถานะนั้นๆ อยู่แล้ว
    return RepairRequestModel(
      requestId: json['request_id'] as int,
      caseCode: json['case_code'] as String,
      typeNames: parsedTypes,
      description: json['description'] as String? ?? "",
      statusId: json['progress_status_id'] as int? ?? 1,
      statusName: json['progress_status_name'] as String? ?? "รอตรวจสอบ",
      createdAt: json['report_date'] as String,
      hasUnread: _flag(json['has_unread']),
      isDueToday: _flag(json['is_due_today']),
      isOverdue: _flag(json['is_overdue']),
      isRecentlyClosed: _flag(json['is_recently_closed']),
      lastDecisionStep: json['last_decision_step'] as String?,
      isDecisionRecent: _flag(json['is_decision_recent']),
    );
  }

  // MariaDB ส่ง boolean เป็น 0/1 (หรือ null ถ้าไม่มีวันนัด) — รับให้ครบทุกแบบกัน type error
  static bool _flag(dynamic value) => value == true || value == 1 || value == '1';
}


class RepairRequestResponse {
  bool isError = false;
  List<RepairRequestModel> data = [];
  String errorMessage = "";

  RepairRequestResponse({
    required this.isError,
    required this.data,
    required this.errorMessage,
  });

  factory RepairRequestResponse.fromJson(Map<String, dynamic> json) {
    // print(json['data']);
    return RepairRequestResponse(
      isError: json['isError'],
      data: (json['data'] as List)
          .map((item) => RepairRequestModel.fromJson(item))
          .toList(),
      errorMessage: json['errorMessage'],
    );
  }
}