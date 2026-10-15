import 'package:flutter/material.dart';
import 'package:student_dorm/color/colors.dart';
import 'package:student_dorm/screen/history_screen.dart';
import 'package:student_dorm/screen/home_screen.dart';
import 'package:student_dorm/screen/profile_screen.dart';
import 'package:student_dorm/widgets/main/bottom_nav.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _selectedIndex = 0;

  static const double _tabBarHeight = 64;
  static const double _tabBarBottom = 20;

  // เปลี่ยนค่าเมื่ออยากให้หน้าประวัติโหลดรายการใหม่ — IndexedStack เก็บ State ของหน้าไว้ ไม่เรียก initState
  // ซ้ำเองตอนสลับแท็บ จึงต้องเปลี่ยน key เพื่อให้สร้างหน้าประวัติใหม่ (ดึงรายการล่าสุด)
  int _historyReloadToken = 0;

  List<Widget> get _pages => [
        HomeScreen(onViewHistory: _showHistoryAfterSubmit),
        HistoryPage(key: ValueKey(_historyReloadToken)),
        const ProfileScreen(),
      ];

  void _onItemTapped(int index) {
    if (index == _selectedIndex) return;
    setState(() => _selectedIndex = index);
  }

  // ปุ่ม "ดูประวัติการแจ้งซ่อม" หลังแจ้งซ่อมสำเร็จ — สลับแท็บภายในแถบเมนูล่างเดิม (ไม่ใช้ Navigator.push) เพื่อให้
  // ผู้ใช้กลับไปหน้าหลัก/โปรไฟล์ได้ตามปกติ และโหลดรายการใหม่ที่มีคำร้องที่เพิ่งส่ง
  void _showHistoryAfterSubmit() {
    setState(() {
      _historyReloadToken++;
      _selectedIndex = 1;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: kGray100,
      body: SafeArea(
        child: Stack(
          children: [
            IndexedStack(
              index: _selectedIndex,
              children: _pages,
            ),
            Positioned(
              left: 20,
              right: 20,
              bottom: _tabBarBottom,
              child: BottomNav(
                height: _tabBarHeight,
                currentIndex: _selectedIndex,
                onTap: _onItemTapped,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
