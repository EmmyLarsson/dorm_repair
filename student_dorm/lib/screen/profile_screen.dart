import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:student_dorm/color/colors.dart';
import 'package:student_dorm/login_screen.dart';
import 'package:student_dorm/models/student_profile_model.dart';
import 'package:student_dorm/screen/profile_edit_screen.dart';
import 'package:student_dorm/utils/app_api.dart';
import 'package:student_dorm/widgets/profile/account_menu_section.dart';
import 'package:student_dorm/widgets/profile/logout_section.dart';
import 'package:student_dorm/widgets/profile/profile_header.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  StudentProfile? _profile;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<StudentProfile?> _getStudentProfile() async {
    final response = await AppAPI.get('/profile/me');
    final Map<String, dynamic> json = jsonDecode(response.body);

    if (json['isError'] == true || json['data'] == null) {
      return null;
    }

    return StudentProfile.fromJson(json['data'] as Map<String, dynamic>);
  }

  Future<void> _loadProfile() async {
    final profile = await _getStudentProfile();
    if (!mounted) return;

    setState(() {
      _profile = profile;
    });
  }

  Future<void> _handleEditTap() async {
    final profile = _profile;
    if (profile == null) return;

    final didSave = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (context) => ProfileEditScreen(profile: profile),
      ),
    );

    if (didSave == true) {
      _loadProfile();
    }
  }

  Future<void> _handleLogout() async {
    final SharedPreferences prefs = await SharedPreferences.getInstance();
    await prefs.remove('access_token');
    await prefs.remove('username');
    await prefs.remove('image_url');

    if (!mounted) return;

    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (context) => const LoginScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kGray100,
      body: SafeArea(
        bottom: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.only(bottom: 120),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              ProfileHeader(
                fullName: _profile?.fullName ?? '',
                studentNo: _profile?.studentNo ?? '',
                roomNumber: _profile?.roomNumber ?? '',
                imageUrl: _profile?.imageUrl,
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    AccountMenuSection(onEditTap: _handleEditTap),
                    const SizedBox(height: 24),
                    LogoutSection(onConfirmLogout: _handleLogout),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
