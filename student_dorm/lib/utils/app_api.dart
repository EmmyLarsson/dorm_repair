import 'package:http/http.dart' as http;
import 'package:student_dorm/config/app_config.dart';
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
}