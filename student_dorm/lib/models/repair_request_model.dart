import 'package:intl/intl.dart';

class RepairRequestModel {
  int requestId;
  String caseCode;
  List<String> typeNames;
  String description;
  String status;
  String createdAt;

  RepairRequestModel({
    required this.requestId,
    required this.caseCode,
    required this.typeNames,
    required this.description,
    required this.status,
    required this.createdAt,
  });

  DateTime getActivityDateTime() {
    DateFormat inputFormat = DateFormat('dd-MM-yyyy HH:mm:ss');
    return inputFormat.parse(createdAt);
  }

  
  factory RepairRequestModel.fromJson(Map<String, dynamic> json) {
    String rawTypes = json['type_names'] as String? ?? "";
    List<String> parsedTypes = rawTypes.split(',').map((e) => e.trim()).toList();
    
    return RepairRequestModel(
      requestId: json['request_id'] as int,
      caseCode: json['case_code'] as String,
      typeNames: parsedTypes,
      description: json['description'] as String? ?? "",
      status: json['status'] as String? ?? "รอตรวจสอบ", 
      createdAt: json['created_at'] as String,
    );
  }
}