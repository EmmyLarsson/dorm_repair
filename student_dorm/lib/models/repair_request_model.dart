import 'package:intl/intl.dart';

class RepairRequestModel {
  int requestId = 0;
  String caseCode = "";
  List<String> typeNames;
  String description = "";
  int statusId = 0;
  String statusName = "";
  String createdAt = "";

  RepairRequestModel({
    required this.requestId,
    required this.caseCode,
    required this.typeNames,
    required this.description,
    required this.statusId,
    required this.statusName,
    required this.createdAt,
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

    return RepairRequestModel(
      requestId: json['request_id'] as int,
      caseCode: json['case_code'] as String,
      typeNames: parsedTypes,
      description: json['description'] as String? ?? "",
      statusId: json['progress_status_id'] as int? ?? 1,
      statusName: json['progress_status_name'] as String? ?? "รอตรวจสอบ",
      createdAt: json['report_date'] as String,
    );
  }
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