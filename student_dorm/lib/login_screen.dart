import 'package:flutter/material.dart';
import 'package:student_dorm/home_screen.dart';
import 'package:google_fonts/google_fonts.dart';

import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:http/http.dart' as http;

import 'package:student_dorm/config/app_config.dart';
import 'package:student_dorm/utils/date_util.dart';
import 'package:shared_preferences/shared_preferences.dart';

// ── Design tokens (อ้างอิงจาก login.css ของเว็บ) ─────────────────
const Color kNavy      = Color(0xFF1A3A6C);
const Color kNavyDark  = Color(0xFF0F2347);
const Color kNavyMid   = Color(0xFF3F5D9C);
const Color kGold      = Color(0xFFFFD700);
const Color kGray50    = Color(0xFFF9FAFB);
const Color kGray200   = Color(0xFFE5E7EB);
const Color kGray400   = Color(0xFF9CA3AF);
const Color kGray500   = Color(0xFF6B7280);
const Color kGray700   = Color(0xFF374151);

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();

  final _usernameEditingController = TextEditingController();
  final _passwordEditingController = TextEditingController();
  bool rememberMe = false;
  bool _obscurePassword = true; // ควบคุมการแสดง/ซ่อนรหัสผ่าน (เหมือนปุ่มตาบนเว็บ)

  @override // เติม @override นำหน้า build widget ตามมาตรฐาน
  Widget build(BuildContext context) {
    final textTheme = GoogleFonts.sarabunTextTheme(Theme.of(context).textTheme);

    return Scaffold(
      body: Container(
        height: double.infinity,
        width: double.infinity,
        // พื้นหลัง gradient ทอง เลียนแบบ radial-gradient หลายชั้นจาก body ของเว็บ
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topRight,
            end: Alignment.bottomLeft,
            colors: [
              Color(0xFFFFE54C),
              Color(0xFFFFD700),
              Color(0xFFF5A800),
            ],
            stops: [0.0, 0.45, 1.0],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 455),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // ── การ์ด Login หลัก ────────────────────────
                    Container(
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(26),
                        boxShadow: [
                          BoxShadow(
                            color: kNavy.withValues(alpha: 0.15),
                            blurRadius: 64,
                            offset: const Offset(0, 28),
                          ),
                          BoxShadow(
                            color: kNavy.withValues(alpha: 0.13),
                            blurRadius: 28,
                            offset: const Offset(0, 8),
                          ),
                        ],
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // ── พื้นที่รูปภาพด้านบน (เว้นไว้ให้ใส่รูปเอง) ──
                          Container(
                            height: 200,
                            decoration: const BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                                colors: [kNavyDark, kNavy],
                              ),
                            ),
                            child: Stack(
                              children: [
                                Positioned.fill(
                                  child: Image(
                                    image: AssetImage("assets/IMG_7861.jpeg"),
                                      fit: BoxFit.cover,
                                      alignment: Alignment.center,
                                  ),
                                ),
                                Positioned.fill(
                                  child: Container(
                                    decoration: BoxDecoration(
                                      gradient: LinearGradient(
                                        begin: Alignment.bottomCenter,
                                        end: Alignment.topCenter,
                                        colors: [
                                          kNavyDark.withValues(alpha: 0.82),
                                          kNavyDark.withValues(alpha: 0.30),
                                          Colors.transparent,
                                        ],
                                        stops: const [0.0, 0.55, 1.0],
                                      ),
                                    ),
                                  ),
                                ),
                                Positioned(
                                  left: 24,
                                  right: 24,
                                  bottom: 20,
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    mainAxisSize: MainAxisSize.min,
                                  ),
                                ),
                              ],
                            ),
                          ),

                          // ── เนื้อหาฟอร์ม ──────────────────────
                          Padding(
                            padding: const EdgeInsets.fromLTRB(32, 28, 32, 36),
                            child: Form(
                              key: _formKey,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  // Title + subtitle + เส้นคั่น
                                  Container(
                                    padding: const EdgeInsets.only(bottom: 22),
                                    margin: const EdgeInsets.only(bottom: 24),
                                    decoration: const BoxDecoration(
                                      border: Border(
                                        bottom: BorderSide(color: kGray200, width: 1),
                                      ),
                                    ),
                                    child: Column(
                                      children: [
                                        Text(
                                          'ระบบแจ้งซ่อมหอพักนักศึกษาในกำกับ 10–11\n'
                                          'มหาวิทยาลัยสงขลานครินทร์ วิทยาเขตหาดใหญ่',
                                          textAlign: TextAlign.center,
                                          style: textTheme.titleMedium?.copyWith(
                                            fontSize: 17.5,
                                            fontWeight: FontWeight.w700,
                                            color: kNavy,
                                            height: 1.6,
                                          ),
                                        ),
                                        const SizedBox(height: 5),
                                        Text(
                                          'PSU Dormitory 10-11 Maintenance Request System',
                                          textAlign: TextAlign.center,
                                          style: textTheme.bodySmall?.copyWith(
                                            fontSize: 12.5,
                                            color: kGray500,
                                            letterSpacing: 0.02,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),

                                  // Username label
                                  Padding(
                                    padding: const EdgeInsets.only(left: 3, bottom: 5),
                                    child: Text(
                                      'ชื่อผู้ใช้งาน (Username)',
                                      style: textTheme.labelLarge?.copyWith(
                                        fontSize: 13.5,
                                        fontWeight: FontWeight.w600,
                                        color: kGray700,
                                      ),
                                    ),
                                  ),
                                  TextFormField(
                                    controller: _usernameEditingController,
                                    style: textTheme.bodyMedium?.copyWith(
                                        fontSize: 15, color: kGray700),
                                    decoration: _inputDecoration(
                                      hint: 'กรอกชื่อผู้ใช้ของคุณ',
                                      icon: Icons.person_outline,
                                    ),
                                    validator: (value) {
                                      if (value == null || value.isEmpty) {
                                        return "กรุณากรอก Username";
                                      }
                                      return null;
                                    },
                                  ),

                                  const SizedBox(height: 20),

                                  // Password label
                                  Padding(
                                    padding: const EdgeInsets.only(left: 3, bottom: 5),
                                    child: Text(
                                      'รหัสผ่าน (Password)',
                                      style: textTheme.labelLarge?.copyWith(
                                        fontSize: 13.5,
                                        fontWeight: FontWeight.w600,
                                        color: kGray700,
                                      ),
                                    ),
                                  ),
                                  TextFormField(
                                    controller: _passwordEditingController,
                                    obscureText: _obscurePassword,
                                    style: textTheme.bodyMedium?.copyWith(
                                        fontSize: 15, color: kGray700),
                                    decoration: _inputDecoration(
                                      hint: 'กรอกรหัสผ่านของคุณ',
                                      icon: Icons.lock_outline,
                                      suffixIcon: IconButton(
                                        icon: Icon(
                                          _obscurePassword
                                              ? Icons.visibility_outlined
                                              : Icons.visibility_off_outlined,
                                          color: kGray400,
                                          size: 20,
                                        ),
                                        onPressed: () {
                                          setState(() {
                                            _obscurePassword = !_obscurePassword;
                                          });
                                        },
                                      ),
                                    ),
                                    validator: (value) {
                                      if (value == null || value.isEmpty) {
                                        return "กรุณากรอก Password";
                                      }
                                      return null;
                                    },
                                  ),

                                  const SizedBox(height: 12),

                                  // จดจำฉัน checkbox
                                  Row(
                                    children: [
                                      SizedBox(
                                        width: 20,
                                        height: 20,
                                        child: Checkbox(
                                          value: rememberMe,
                                          onChanged: (value) {
                                            setState(() {
                                              rememberMe = value!;
                                            });
                                          },
                                          activeColor: kNavyMid,
                                          shape: RoundedRectangleBorder(
                                            borderRadius: BorderRadius.circular(6),
                                          ),
                                          side: const BorderSide(
                                              color: kGray200, width: 1.5),
                                        ),
                                      ),
                                      const SizedBox(width: 9),
                                      Text(
                                        'จดจำฉัน',
                                        style: textTheme.bodyMedium?.copyWith(
                                          fontSize: 14,
                                          color: const Color(0xFF4B5563),
                                        ),
                                      ),
                                    ],
                                  ),

                                  const SizedBox(height: 20),

                                  // ปุ่ม Login
                                  Container(
                                    height: 52,
                                    decoration: BoxDecoration(
                                      borderRadius: BorderRadius.circular(13),
                                      gradient: const LinearGradient(
                                        begin: Alignment.topLeft,
                                        end: Alignment.bottomRight,
                                        colors: [kNavyMid, kNavy, kNavyDark],
                                        stops: [0.0, 0.65, 1.0],
                                      ),
                                      boxShadow: [
                                        BoxShadow(
                                          color: kNavy.withValues(alpha: 0.32),
                                          blurRadius: 16,
                                          offset: const Offset(0, 4),
                                        ),
                                      ],
                                    ),
                                    child: Material(
                                      color: Colors.transparent,
                                      child: InkWell(
                                        borderRadius: BorderRadius.circular(13),
                                        onTap: () {
                                          if (_formKey.currentState!.validate()) {
                                            _doLogin(context);
                                          }
                                        },
                                        child: Center(
                                          child: Text(
                                            'เข้าสู่ระบบ',
                                            style: textTheme.titleSmall?.copyWith(
                                              fontSize: 16,
                                              fontWeight: FontWeight.w700,
                                              color: Colors.white,
                                              letterSpacing: 0.04,
                                            ),
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),

                                  const SizedBox(height: 16),

                                  // Info box
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 12, vertical: 10),
                                    decoration: BoxDecoration(
                                      color: kGray50,
                                      border: Border.all(color: kGray200),
                                      borderRadius: BorderRadius.circular(9),
                                    ),
                                    child: Row(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Icon(Icons.info_outline,
                                            size: 15, color: kNavyMid),
                                        const SizedBox(width: 7),
                                        Expanded(
                                          child: Text(
                                            'หากยังไม่มีบัญชีผู้ใช้ กรุณาติดต่อเจ้าหน้าที่ที่สำนักงานหอพักเพื่อขอรับบัญชีผู้ใช้งาน',
                                            style: textTheme.bodySmall?.copyWith(
                                              fontSize: 12.5,
                                              color: kGray500,
                                              height: 1.65,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 24),

                    // Footer
                    Text(
                      '© 2568 หอพักในกำกับ มหาวิทยาลัยสงขลานครินทร์ วิทยาเขตหาดใหญ่',
                      textAlign: TextAlign.center,
                      style: textTheme.bodySmall?.copyWith(
                        fontSize: 11.5,
                        color: kNavy.withValues(alpha: 0.55),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  // ── Helper: สร้าง InputDecoration มาตรฐานให้ตรงกับ .inp-wrap input ของเว็บ ──
  InputDecoration _inputDecoration({
    required String hint,
    required IconData icon,
    Widget? suffixIcon,
  }) {
    OutlineInputBorder border(Color color, double width) {
      return OutlineInputBorder(
        borderRadius: BorderRadius.circular(13),
        borderSide: BorderSide(color: color, width: width),
      );
    }

    return InputDecoration(
      hintText: hint,
      hintStyle: GoogleFonts.sarabun(fontSize: 15, color: const Color(0xFFB8BFC9)),
      prefixIcon: Icon(icon, color: kGray400, size: 20),
      suffixIcon: suffixIcon,
      filled: true,
      fillColor: kGray50,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: border(kGray200, 1.5),
      enabledBorder: border(kGray200, 1.5),
      focusedBorder: border(kNavyMid, 1.5),
      errorBorder: border(const Color(0xFFC8211F), 1.5),
      focusedErrorBorder: border(const Color(0xFFC8211F), 1.5),
      errorStyle: GoogleFonts.sarabun(fontSize: 12, color: const Color(0xFFC8211F)),
    );
  }

  Future<(bool, String, String)> _authenRequest() async {
    String username = _usernameEditingController.text;
    DateTime now = DateTime.now();
    String formattedDateString = DateUtil.getFormattedDate(now);

    String combinedString = "$username&$formattedDateString";
    print(combinedString);

    String authenRequestString = sha256
        .convert(utf8.encode(combinedString))
        .toString();

    print(authenRequestString);
    print("${AppConfig.apiBaseUri}/authen/authen_request");

    final response = await http.post(
      Uri.parse("${AppConfig.apiBaseUri}/authen/authen_request"),
      headers: <String, String>{
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: jsonEncode(<String, String>{'authen_request': authenRequestString}),
    );
    final json = jsonDecode(response.body);

    print(json);

    return (
      json["isError"] as bool,
      json["data"] as String,
      json["errorMessage"] as String,
    );
  }

  void _doLogin(BuildContext context) async {
    var (isError, authenToken, errorMessage) = await _authenRequest();

    if (isError) {
      showDialog(
        context: context,
        builder: (context) {
          return AlertDialog(content: Text(errorMessage));
        },
      );
    } else {
      var result = await _accessRequest(authenToken);

      print(result);

      if (!result.isError) {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (context) => const HomeScreen()),
        );
      } else {
        showDialog(
          context: context,
          builder: (context) {
            return AlertDialog(content: Text(result.errorMessage));
          },
        );
      }
    }
  }
   Future<({bool isError, String data, String errorMessage})> _accessRequest(
    String authenToken,
  ) async {
    String username = _usernameEditingController.text;
    String password = _passwordEditingController.text;
    String passwordEncode = sha256.convert(utf8.encode(password)).toString();
    String combinedString = "$username&$passwordEncode&$authenToken";
    String authenSignature = sha256
        .convert(utf8.encode(combinedString))
        .toString();

    print(combinedString);
    print(authenSignature);

    final response = await http.post(
      Uri.parse("${AppConfig.apiBaseUri}/authen/access_request"),
      headers: <String, String>{
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: jsonEncode(<String, String>{
        'authen_signature': authenSignature,
        'authen_token': authenToken,
      }),
    );

    final json = jsonDecode(response.body);

    print(json);

    if (!json["isError"]) {
      SharedPreferences prefs = await SharedPreferences.getInstance();

      await prefs.setString("access_token", json["data"]["access_token"]);
      await prefs.setString("username", _usernameEditingController.text);
      await prefs.setString("image_url", json["data"]["image_url"] ?? "");

      print("access_token${json["data"]["access_token"]}");
      return (
          isError: json["isError"] as bool,
          data: json["data"]["access_token"] as String,
          errorMessage: json["errorMessage"] as String,
        );
    }
    else {
      return (
        isError: json["isError"] as bool,
        data: json["data"] as String,
        errorMessage: json["errorMessage"] as String,
      );
    }
  }
}