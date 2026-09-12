import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:image_picker/image_picker.dart';
import 'package:student_dorm/config/app_config.dart';
import 'package:student_dorm/utils/mime_type.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

class AppAPI {
  static Future get(String uri) async {
    SharedPreferences prefs = await SharedPreferences.getInstance();

    print("${AppConfig.apiBaseUri}$uri");

    final response = await http.get(
      Uri.parse("${AppConfig.apiBaseUri}$uri"),
      headers: <String, String>{
        'Content-Type': 'application/json; charset=UTF-8',
        'Accept': 'application/json',
        'Authorization': 'Bearer ${prefs.getString("access_token")}',
      },
    );

    return response;
  }

  static Future post(String uri, Map<String, dynamic> body) async {
    SharedPreferences prefs = await SharedPreferences.getInstance();

        print("${AppConfig.apiBaseUri}$uri");

    final response = await http.post(
      Uri.parse("${AppConfig.apiBaseUri}$uri"),
      headers: <String, String>{
        'Content-Type': 'application/json; charset=UTF-8',
        'Accept': 'application/json',
        'Authorization': 'Bearer ${prefs.getString("access_token")}',
      },
      body: jsonEncode(body),
    );

    return response;

  }

  static Future uploadFiles(
    String uri,
    List<XFile> files, {
    String fieldName = 'photos',
    Map<String, String> fields = const {},
  }) async {
    SharedPreferences prefs = await SharedPreferences.getInstance();

    final request = http.MultipartRequest(
      'POST',
      Uri.parse("${AppConfig.apiBaseUri}$uri"),
    );
    request.headers['Authorization'] =
        'Bearer ${prefs.getString("access_token")}';
    request.fields.addAll(fields);

    for (final file in files) {
      final bytes = await file.readAsBytes();
      final mimeType = guessMimeTypeFromFilename(file.name);
      request.files.add(
        http.MultipartFile.fromBytes(
          fieldName,
          bytes,
          filename: file.name,
          contentType: mimeType != null ? MediaType.parse(mimeType) : null,
        ),
      );
    }

    final streamedResponse = await request.send();
    final response = await http.Response.fromStream(streamedResponse);

    return response;
  }
}