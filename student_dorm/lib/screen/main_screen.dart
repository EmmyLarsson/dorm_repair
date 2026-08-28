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

  final List<Widget> _pages = const [
    HomeScreen(),
    HistoryPage(),
    ProfileScreen(),
  ];

  void _onItemTapped(int index) {
    if (index == _selectedIndex) return;
    setState(() => _selectedIndex = index);
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
