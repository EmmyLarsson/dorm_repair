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
    
    return RepairRequestModel(
      requestId: json['request_id'] as int,
      caseCode: json['case_code'] as String,
      typeNames: parsedTypes,
      description: json['description'] as String? ?? "",
      statusId: json['progress_detail_id'] as int? ?? 1,
      statusName: json['status_name'] as String? ?? "รอตรวจสอบ",
      createdAt: json['created_at'] as String,
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
    return RepairRequestResponse(
      isError: json['isError'],
      data: (json['data'] as List)
          .map((item) => RepairRequestModel.fromJson(item))
          .toList(),
      errorMessage: json['errorMessage'],
    ); // ActivityResponse
  }
}