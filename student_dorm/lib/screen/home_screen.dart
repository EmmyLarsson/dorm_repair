import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:student_dorm/models/repair_request_model.dart';
import 'package:student_dorm/screen/report_submit_screen.dart';

import 'dart:convert';
import 'package:student_dorm/color/colors.dart';
import 'package:student_dorm/utils/app_api.dart';
import 'package:student_dorm/widgets/repair_info.dart';
import 'package:student_dorm/widgets/home/status_card.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<RepairRequestModel> repairrequestModelStore = [];
  int? activeStatusId;
  int cntPending = 0;
  int cntWorking = 0;
  int cntDone = 0;
  int cntPendingComplaintReview = 0;
  int cntUnderRevision = 0;
  int cntSuccess = 0;
  int cntFailed = 0;
  bool _isLoading = true;
  String? _errorMessage;

  List<RepairRequestModel> get _filteredRepairs {
    if (activeStatusId == null) {
      return repairrequestModelStore;
    }

    return repairrequestModelStore
        .where((item) => item.statusId == activeStatusId)
        .toList();
  }

  void _fetchData() async {
    var response = await AppAPI.get("/repair_request/get_all_by_user");
    Map<String, dynamic> json = jsonDecode(response.body);
    // print(json);
    RepairRequestResponse repairResponse = RepairRequestResponse.fromJson(json);
    // print(repairResponse.data.length);

    // เดิมนับแค่สถานะ 1/2/3 พอมีสถานะใหม่ "รอแก้ไข"(5)/"สำเร็จ"(6) เพิ่มเข้ามา เคสที่อยู่ 2 สถานะนี้
    // จะไม่ถูกนับในสถิติที่ไหนเลย (หายไปจากหน้าแรกทั้งหมด) เลยเพิ่ม 2 หมวดใหม่แยกจากของเดิม
    // (ตอนนี้เพิ่มสถานะ 7 "รอตรวจสอบคำร้อง" อีกหมวดด้วยเหตุผลเดียวกัน)
    int pending = 0, working = 0, done = 0, pendingComplaintReview = 0, underRevision = 0, success = 0, failed = 0;
    for (var item in repairResponse.data) {
      if (item.statusId == 1)
        pending++;
      else if (item.statusId == 2)
        working++;
      else if (item.statusId == 3)
        done++;
      else if (item.statusId == 7)
        pendingComplaintReview++;
      else if (item.statusId == 5)
        underRevision++;
      else if (item.statusId == 6)
        success++;
      else if (item.statusId == 8)
        failed++;
    }

    setState(() {
      _isLoading = false;
      repairrequestModelStore = repairResponse.data;
      cntPending = pending;
      cntWorking = working;
      cntDone = done;
      cntPendingComplaintReview = pendingComplaintReview;
      cntUnderRevision = underRevision;
      cntSuccess = success;
      cntFailed = failed;
    });
  }

  @override
  void initState() {
    _fetchData();
    super.initState();
  }

  Future<void> _fetchRepairs() async {
    _fetchData();
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = GoogleFonts.sarabunTextTheme(Theme.of(context).textTheme);

    const double tabBarHeight = 64;
    const double tabBarBottom = 20;
    const double fabAboveTab = 12;

    return Scaffold(
      backgroundColor: kGray100,
      body: SafeArea(
        child: Stack(
          children: [
            Column(
              children: [
                _buildHeader(textTheme),
                Expanded(
                  child: RefreshIndicator(
                    onRefresh: _fetchRepairs,
                    child: SingleChildScrollView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: EdgeInsets.fromLTRB(
                        16,
                        20,
                        16,
                        tabBarHeight + tabBarBottom + 72,
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          _buildStatsRow(textTheme),
                          const SizedBox(height: 24),
                          _buildSectionHeader(textTheme),
                          const SizedBox(height: 12),
                          _buildBody(),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
            Positioned(
              right: 20,
              bottom: tabBarHeight + tabBarBottom + fabAboveTab,
              child: _buildFab(textTheme),
            ),
          ],
        ),
      ),
    );
  }

  // ── Body: loading / error / list ──
  Widget _buildBody() {
    if (_isLoading) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 48),
        child: Center(child: CircularProgressIndicator()),
      );
    }
    if (_errorMessage != null) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 48),
        child: Column(
          children: [
            const Icon(Icons.wifi_off_rounded, size: 48, color: kGray400),
            const SizedBox(height: 12),
            Text(
              _errorMessage!,
              textAlign: TextAlign.center,
              style: const TextStyle(color: kGray500),
            ),
            const SizedBox(height: 16),
            TextButton(onPressed: _fetchRepairs, child: const Text('ลองใหม่')),
          ],
        ),
      );
    }
    if (_filteredRepairs.isEmpty) {
      return _buildEmptyState();
    }
    return RepairInfo(repairrequestModelStore: _filteredRepairs, onReturn: _fetchData);
  }

  // ── Stats row ── เดิมเป็นกริด 3+2 คอลัมน์ตายตัว พอเพิ่มสถานะ 7 ("รอตรวจสอบคำร้อง") เป็นใบที่ 6
  // จะล้นเป็นแถวที่ 3 ดูรก เปลี่ยนเป็นแถบเลื่อนแนวนอนแทน รองรับจำนวนสถานะที่เพิ่มได้เรื่อยๆ ไม่ต้องคอย
  // จัดกริดใหม่ทุกครั้งที่มีสถานะเพิ่ม
  Widget _buildStatsRow(TextTheme textTheme) {
    final cards = [
      (filterKey: 'รอตรวจสอบ', count: cntPending, label: 'รอตรวจสอบ', color: const Color(0xFFF59E0B), statusId: 1),
      (filterKey: 'กำลังซ่อม', count: cntWorking, label: 'กำลังซ่อม', color: kNavyMid, statusId: 2),
      (filterKey: 'เสร็จแล้ว', count: cntDone, label: 'เสร็จแล้ว', color: const Color(0xFF16A34A), statusId: 3),
      (filterKey: 'รอตรวจสอบคำร้อง', count: cntPendingComplaintReview, label: 'รอตรวจสอบคำร้อง', color: kAmber, statusId: 7),
      (filterKey: 'รอแก้ไข', count: cntUnderRevision, label: 'รอแก้ไข', color: kAmberDark, statusId: 5),
      (filterKey: 'สำเร็จ', count: cntSuccess, label: 'สำเร็จ', color: kGreenDark, statusId: 6),
      (filterKey: 'ซ่อมไม่สำเร็จ', count: cntFailed, label: 'ซ่อมไม่สำเร็จ', color: kRsError, statusId: 8),
    ];

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          for (int i = 0; i < cards.length; i++) ...[
            if (i > 0) const SizedBox(width: 10),
            SizedBox(
              width: 104,
              child: StatusCard(
                filterKey: cards[i].filterKey,
                count: cards[i].count,
                label: cards[i].label,
                color: cards[i].color,
                isActive: activeStatusId == cards[i].statusId,
                onTap: () => setState(() {
                  activeStatusId = activeStatusId == cards[i].statusId ? null : cards[i].statusId;
                }),
              ),
            ),
          ],
        ],
      ),
    );
  }

  // ── Header ──
  Widget _buildHeader(TextTheme textTheme) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [kGoldLight, kGoldMid, kGoldDark],
          stops: [0.0, 0.5, 1.0],
        ),
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(30),
          bottomRight: Radius.circular(30),
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFC8A000).withOpacity(0.28),
            blurRadius: 28,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 16, 18, 14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(13),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.13),
                        blurRadius: 12,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  alignment: Alignment.center,
                  child: const Icon(
                    Icons.apartment_rounded,
                    color: kNavy,
                    size: 26,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'ระบบแจ้งซ่อมหอพักนักศึกษาในกำกับ\n'
                    '10-11 มหาวิทยาลัยสงขลานครินทร์\n'
                    'วิทยาเขตหาดใหญ่',
                    style: textTheme.bodySmall?.copyWith(
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                      color: kNavyDark,
                      height: 1.65,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                GestureDetector(
                  onTap: () {},
                  child: Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.48),
                      borderRadius: BorderRadius.circular(13),
                    ),
                    child: Stack(
                      clipBehavior: Clip.none,
                      children: [
                        const Center(
                          child: Icon(
                            Icons.notifications_outlined,
                            color: kNavy,
                            size: 22,
                          ),
                        ),
                        Positioned(
                          top: 8,
                          right: 8,
                          child: Container(
                            width: 9,
                            height: 9,
                            decoration: BoxDecoration(
                              color: const Color(0xFFEF4444),
                              shape: BoxShape.circle,
                              border: Border.all(color: kGoldMid, width: 2),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.only(
                topLeft: Radius.circular(16),
                topRight: Radius.circular(16),
              ),
            ),
            child: Container(
              height: 44,
              decoration: BoxDecoration(
                color: kGray100,
                borderRadius: BorderRadius.circular(11),
                border: Border.all(color: kGray200, width: 1.5),
              ),
              child: Row(
                children: [
                  const SizedBox(width: 12),
                  const Icon(Icons.search, color: kGray400, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: TextField(
                      style: textTheme.bodyMedium?.copyWith(
                        fontSize: 14,
                        color: kNavy,
                      ),
                      decoration: InputDecoration(
                        hintText: 'ค้นหาหมายเลข Case หรือรายการซ่อม…',
                        hintStyle: GoogleFonts.sarabun(
                          fontSize: 14,
                          color: const Color(0xFFB0BAC8),
                        ),
                        border: InputBorder.none,
                        isDense: true,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── Section header ──
  Widget _buildSectionHeader(TextTheme textTheme) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          'งานซ่อมปัจจุบัน',
          style: textTheme.titleMedium?.copyWith(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: kNavy,
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
          decoration: BoxDecoration(
            color: kGray200,
            borderRadius: BorderRadius.circular(999),
          ),
          child: Text(
            '${_filteredRepairs.length}',
            style: textTheme.labelMedium?.copyWith(
              fontSize: 12.5,
              fontWeight: FontWeight.w700,
              color: kGray700,
            ),
          ),
        ),
      ],
    );
  }

  // ── Empty state ──
  Widget _buildEmptyState() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 48),
      child: Column(
        children: [
          const Icon(Icons.search_off, size: 48, color: kGray400),
          const SizedBox(height: 12),
          const Text(
            'ไม่พบรายการที่ค้นหา',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: kGray700,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            'ไม่มีรายการซ่อมในสถานะนี้',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 12.5, color: kGray500, height: 1.5),
          ),
        ],
      ),
    );
  }

  Widget _buildFab(TextTheme textTheme) {
    return Container(
      height: 50,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(999),
        gradient: const LinearGradient(
          colors: [kNavyMid, kNavyDark],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [
          BoxShadow(
            color: kNavy.withOpacity(0.4),
            blurRadius: 24,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(999),
          onTap: () async {
            await Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => ReportSubmitScreen()),
            );

            // เรียกเมื่อกลับมาหน้า Home
            // ใช้กรณีต้องการโหลดข้อมูลงานซ่อมใหม่
            _fetchData();
          },
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 22, 0),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.add, color: Colors.white, size: 20),
                const SizedBox(width: 7),
                Text(
                  'แจ้งซ่อม',
                  style: textTheme.titleSmall?.copyWith(
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                    letterSpacing: 0.02,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
