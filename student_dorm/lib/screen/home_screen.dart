import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:student_dorm/models/repair_request_model.dart';
import 'package:student_dorm/screen/report_submit_screen.dart';

import 'dart:convert';
import 'package:student_dorm/color/colors.dart';
import 'package:student_dorm/utils/app_api.dart';
import 'package:student_dorm/widgets/repair_info.dart';
import 'package:student_dorm/widgets/home/status_card.dart';
import 'package:student_dorm/widgets/home/notification_sheet.dart';
import 'package:student_dorm/models/student_notification_model.dart';
import 'package:student_dorm/screen/repair_detail_screen.dart';

const String _kSubAll = 'ทั้งหมด';

// หัวข้อใหญ่ของหน้าโฮม (แทนปุ่มกรองสถานะ 7 ใบเดิม) — สถานะเดียวกันใช้สีจาก kStatusColors ชุดเดียวกับหน้าประวัติ
class _MainGroup {
  const _MainGroup(this.key, this.label, this.statusIds, this.colorStatusId, this.subs);
  final String key;
  final String label;
  final List<int> statusIds;
  final int colorStatusId;
  final List<String> subs;
}

const List<_MainGroup> _kMainGroups = [
  _MainGroup('new', 'รอตรวจสอบ', [1], 1, []),
  _MainGroup('fix', 'อยู่ระหว่างการซ่อม', [2], 2, [_kSubAll, 'รอซ่อม', 'นัดหมายวันนี้', 'เกินนัดหมาย']),
  _MainGroup('rev', 'อยู่ระหว่างการแก้ไข', [5, 7], 5, [_kSubAll, 'รอตรวจสอบอุทธรณ์', 'รอแก้ไข', 'นัดหมายวันนี้', 'เกินนัดหมาย']),
  _MainGroup('done', 'เสร็จสิ้น', [3, 6, 8, 4], 6, [_kSubAll, 'รอยืนยัน', 'สำเร็จ', 'ไม่สำเร็จ', 'ถูกยกเลิก']),
];

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, this.onViewHistory});

  /// เรียกเมื่อผู้ใช้กด "ดูประวัติการแจ้งซ่อม" ในหน้าแจ้งซ่อมสำเร็จ — MainScreen เป็นเจ้าของแท็บ
  /// จึงให้ MainScreen เป็นคนสลับไปหน้าประวัติ
  final VoidCallback? onViewHistory;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<RepairRequestModel> repairrequestModelStore = [];
  // หัวข้อใหญ่ที่เลือกอยู่ (null = ทุกหัวข้อ) และหัวข้อย่อยในนั้น
  String? _activeMain;
  String _activeSub = _kSubAll;
  bool _isLoading = true;
  String? _errorMessage;
  List<StudentNotification> _notifications = [];
  int _unreadCaseCount = 0;

  // งานที่ปิดแล้ว (สำเร็จ/ไม่สำเร็จ/ยกเลิก) โชว์บนโฮมแค่ไม่กี่วันหลังปิด (backend เป็นคนตัดสินผ่าน isRecentlyClosed)
  // เก่ากว่านั้นไปดูที่หน้าประวัติ — สถานะ 3 (รอ นศ. ยืนยัน) ไม่ตัดออก เพราะ นศ. ยังต้องกดยืนยัน/ยื่นคำร้อง
  bool _isVisible(RepairRequestModel r) =>
      !(const [4, 6, 8].contains(r.statusId)) || r.isRecentlyClosed;

  bool _inGroup(RepairRequestModel r, _MainGroup g) => g.statusIds.contains(r.statusId);

  bool _matchesSub(RepairRequestModel r, String sub) {
    switch (sub) {
      case _kSubAll:
        return true;
      case 'รอซ่อม':
        return r.statusId == 2 && !r.isDueToday && !r.isOverdue;
      case 'นัดหมายวันนี้':
        return r.isDueToday;
      case 'เกินนัดหมาย':
        return r.isOverdue;
      case 'รอตรวจสอบอุทธรณ์':
        return r.statusId == 7;
      case 'รอแก้ไข':
        return r.statusId == 5;
      case 'รอยืนยัน':
        return r.statusId == 3;
      case 'สำเร็จ':
        return r.statusId == 6;
      case 'ไม่สำเร็จ':
        return r.statusId == 8;
      case 'ถูกยกเลิก':
        return r.statusId == 4;
    }
    return true;
  }

  // เคสที่นัดหมายวันนี้ขึ้นบนสุดเสมอ (ทุกหัวข้อ) เพราะเป็นวันที่ช่างจะมา นักศึกษาต้องเห็นก่อนอย่างอื่น — คงลำดับเดิม
  // ของส่วนที่เหลือไว้ (sort ของ Dart ไม่รับประกันความเสถียร จึงแยกเป็น 2 ลิสต์แล้วต่อกันแทน)
  List<RepairRequestModel> _dueTodayFirst(Iterable<RepairRequestModel> items) {
    final list = items.toList();
    return [...list.where((r) => r.isDueToday), ...list.where((r) => !r.isDueToday)];
  }

  List<RepairRequestModel> get _filteredRepairs {
    final visible = repairrequestModelStore.where(_isVisible);
    if (_activeMain == null) {
      return _dueTodayFirst(visible);
    }
    final group = _kMainGroups.firstWhere((g) => g.key == _activeMain);
    return _dueTodayFirst(visible.where((r) => _inGroup(r, group) && _matchesSub(r, _activeSub)));
  }

  void _fetchData() async {
    var response = await AppAPI.get("/repair_request/get_all_by_user");
    Map<String, dynamic> json = jsonDecode(response.body);
    // print(json);
    RepairRequestResponse repairResponse = RepairRequestResponse.fromJson(json);
    // print(repairResponse.data.length);

    // จำนวนในแต่ละหัวข้อคำนวณสดจากรายการ (_countOf) ไม่เก็บตัวนับแยกต่อสถานะเหมือนเดิมแล้ว
    // เพราะหัวข้อใหม่รวมหลายสถานะและต้องตัดงานปิดเก่าออก
    setState(() {
      _isLoading = false;
      repairrequestModelStore = repairResponse.data;
    });
  }

  @override
  void initState() {
    _fetchData();
    _fetchNotifications();
    super.initState();
  }

  Future<void> _fetchRepairs() async {
    _fetchData();
    _fetchNotifications();
  }

  Future<void> _fetchNotifications() async {
    try {
      var response = await AppAPI.get("/student/notifications");
      Map<String, dynamic> json = jsonDecode(response.body);
      if (json['isError'] == true) return;
      final result = StudentNotificationResponse.fromJson(json);
      if (mounted) {
        setState(() {
          _notifications = result.items;
          _unreadCaseCount = result.unreadCaseCount;
        });
      }
    } catch (_) {
      // ดึงแจ้งเตือนไม่ได้ก็ไม่เป็นไร กระดิ่งแค่ไม่ขึ้นตัวเลข หน้าโฮมยังใช้งานได้ตามปกติ
    }
  }

  // กดกระดิ่ง → แผ่นล่างรายการแจ้งเตือน กดรายการ → ไปหน้ารายละเอียดเคสนั้น (หน้านั้นเรียก mark_seen เอง
  // แล้วกลับมาโหลดใหม่ จุดแดง/ตัวเลขจึงลดลงพร้อมกัน)
  Future<void> _openNotifications() async {
    await _fetchNotifications();
    if (!mounted) return;
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (sheetContext) => NotificationSheet(
        items: _notifications,
        onItemTap: (item) async {
          Navigator.pop(sheetContext);
          await Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => CaseStatusScreen(
                requestId: item.requestId,
                focusStepCode: item.stepCode,
                focusEventDate: item.eventDate,
              ),
            ),
          );
          _fetchRepairs();
        },
        onMarkAllSeen: () async {
          Navigator.pop(sheetContext);
          await AppAPI.post('/repair_request/mark_all_seen', {});
          _fetchRepairs();
        },
      ),
    );
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
                          // โหมดแบ่งส่วน (ยังไม่เลือกหัวข้อ) แต่ละส่วนมีหัวข้อของตัวเอง จึงไม่ใช้หัวข้อรวมนี้ซ้ำ
                          if (_activeMain != null) ...[
                            _buildSectionHeader(textTheme),
                            const SizedBox(height: 12),
                          ],
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
    // ยังไม่เลือกหัวข้อใหญ่ → แบ่งเป็นส่วนมีหัวข้อกำกับ (นัดหมายวันนี้ / เกินนัดหมาย / ผลในการแจ้งซ่อม / ผลคำร้องอุทธรณ์ /
    // งานซ่อมปัจจุบัน); เลือกหัวข้อใหญ่แล้ว → รายการกรองเดิมพร้อมหัวข้อย่อย
    if (_activeMain == null) {
      return _buildSectionedList();
    }
    return RepairInfo(repairrequestModelStore: _filteredRepairs, onReturn: _fetchData);
  }

  // แบ่งส่วนบนหน้าโฮม: เคสหนึ่งขึ้นส่วนเดียวตามลำดับความสำคัญ (ไล่ตามลำดับ take ด้านล่าง) ส่วนที่ไม่มีเคสไม่แสดงหัวข้อ
  // "ผลในการแจ้งซ่อม"/"ผลคำร้องอุทธรณ์" ใช้เฉพาะเคสที่ยังไม่ได้เปิดดู (hasUnread) — เปิดดูแล้วเคสย้ายลง "งานซ่อมปัจจุบัน"
  // ทันที ไม่ค้างโชว์ซ้ำ เพราะนักศึกษารับทราบแล้ว
  Widget _buildSectionedList() {
    final items = _filteredRepairs;
    final assigned = <RepairRequestModel>{};

    List<RepairRequestModel> take(bool Function(RepairRequestModel) test) {
      final picked = items.where((r) => !assigned.contains(r) && test(r)).toList();
      assigned.addAll(picked);
      return picked;
    }

    // ผลตัดสินแสดงเฉพาะตอนเคสยังอยู่ในสถานะที่ผลนั้นสร้างขึ้น — lastDecisionStep คือ "ผลตัดสินล่าสุดที่เคยมี" ไม่ใช่
    // เหตุการณ์ล่าสุดที่ยังไม่เปิดดู ถ้าไม่เช็คสถานะ เคสที่เจ้าหน้าที่ส่งงานแล้ว (สถานะ 3) จะถูกขึ้นเป็น "อนุมัติคำร้องแล้ว"
    // อนุมัติ → สถานะ 2 / ปฏิเสธ → 4 / อนุมัติอุทธรณ์ → 5 / ปฏิเสธอุทธรณ์ → 3 (กลับไปรอยืนยัน) หรือ 8 (ครบสิทธิ์ ปิดเคส)
    bool decisionStillCurrent(RepairRequestModel r) => switch (r.lastDecisionStep) {
          'approved' => r.statusId == 2,
          'cancelled' => r.statusId == 4,
          'complaint_approved' => r.statusId == 5,
          'complaint_rejected' => r.statusId == 3 || r.statusId == 8,
          _ => false,
        };

    bool isDecision(RepairRequestModel r, List<String> steps) =>
        r.hasUnread && r.isDecisionRecent && steps.contains(r.lastDecisionStep) && decisionStillCurrent(r);

    final dueToday = take((r) => r.isDueToday);
    final overdue = take((r) => r.isOverdue);
    final decisions = take((r) => isDecision(r, const ['approved', 'cancelled']));
    final appeals = take((r) => isDecision(r, const ['complaint_approved', 'complaint_rejected']));
    final rest = items.where((r) => !assigned.contains(r)).toList();

    (String, Color)? decisionNote(RepairRequestModel r) => switch (r.lastDecisionStep) {
          'approved' => ('✓ เจ้าหน้าที่อนุมัติคำร้องแล้ว', kStatusColors[6]!),
          // 'cancelled' มี 2 ที่มา: ปฏิเสธตอนตรวจสอบ (ยังไม่เคยอนุมัติ) กับเจ้าหน้าที่ยกเลิกตอนกำลังซ่อม (เคยอนุมัติแล้ว)
          'cancelled' => (
              r.wasApproved ? '✕ เจ้าหน้าที่ยกเลิกงานซ่อม · เปิดดูเหตุผล' : '✕ เจ้าหน้าที่ปฏิเสธคำร้อง · เปิดดูเหตุผล',
              kStatusColors[4]!,
            ),
          'complaint_approved' => ('✓ อนุมัติคำร้อง กำลังแก้ไขงานซ่อม', kStatusColors[7]!),
          'complaint_rejected' => ('✕ ปฏิเสธคำร้อง · เปิดดูเหตุผล', kStatusColors[7]!),
          _ => null,
        };

    // เจ้าหน้าที่ส่งงานแล้ว (สถานะ 3 รอนักศึกษายืนยัน) ที่ยังไม่เปิดดู — ไม่ใช่ "ผลตัดสิน" จึงไม่ขึ้นหัวข้อผลในการแจ้งซ่อม
    // แต่แสดงป้ายบนการ์ดในงานซ่อมปัจจุบัน รอบแก้ไข = เคสที่เคยอนุมัติคำร้องอุทธรณ์แล้วส่งงานใหม่ (ผลตัดสินล่าสุดคือ
    // complaint_approved) ส่วนสถานะ 3 ที่ผลล่าสุดคือปฏิเสธอุทธรณ์ ให้ขึ้นเป็นผลคำร้องอุทธรณ์ตามเดิม ไม่ใช่การส่งงาน
    (String, Color)? completionNote(RepairRequestModel r) {
      if (r.statusId != 3 || !r.hasUnread || r.lastDecisionStep == 'complaint_rejected') return null;
      final bool isRevisionRound = r.lastDecisionStep == 'complaint_approved';
      return (
        isRevisionRound ? '➤ เจ้าหน้าที่ส่งงานแก้ไขแล้ว · รอคุณยืนยันผล' : '➤ เจ้าหน้าที่ส่งงานแล้ว · รอคุณยืนยันผล',
        kStatusColors[3]!,
      );
    }

    final sections = [
      (title: 'นัดหมายวันนี้', icon: Icons.event_available, color: kStatusColors[2]!, items: dueToday,
          note: (RepairRequestModel r) => ('ช่างมาวันนี้ เตรียมเปิดห้องให้ช่าง', kAmberDark)),
      (title: 'เกินนัดหมาย', icon: Icons.schedule, color: kStatusColors[8]!, items: overdue,
          note: (RepairRequestModel r) => ('เลยช่วงเวลานัดหมายแล้ว', kStatusColors[8]!)),
      (title: 'ผลในการแจ้งซ่อม', icon: Icons.notifications_active, color: kStatusColors[6]!, items: decisions, note: decisionNote),
      (title: 'ผลคำร้องอุทธรณ์', icon: Icons.edit_note, color: kStatusColors[7]!, items: appeals, note: decisionNote),
      (title: 'งานซ่อมปัจจุบัน', icon: Icons.build_circle_outlined, color: kGray500, items: rest,
          note: completionNote),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final section in sections)
          if (section.items.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.only(top: 6, bottom: 10),
              child: Row(
                children: [
                  Icon(section.icon, size: 19, color: kNavy),
                  const SizedBox(width: 7),
                  Text(section.title, style: GoogleFonts.sarabun(fontSize: 15, fontWeight: FontWeight.w800, color: kNavy)),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 1),
                    decoration: BoxDecoration(color: section.color, borderRadius: BorderRadius.circular(999)),
                    child: Text('${section.items.length}',
                        style: GoogleFonts.sarabun(fontSize: 11.5, fontWeight: FontWeight.w700, color: Colors.white)),
                  ),
                ],
              ),
            ),
            for (final item in section.items)
              RepairInfoCard(
                item: item,
                onReturn: _fetchData,
                note: section.note(item)?.$1,
                noteColor: section.note(item)?.$2,
              ),
            const SizedBox(height: 10),
          ],
      ],
    );
  }

  // ── หัวข้อใหญ่ 4 กลุ่ม (กริด 2x2) ── เดิมเป็นแถบเลื่อนปุ่มสถานะ 7 ใบที่ดูสับสน ตอนนี้ใช้ StatusCard เดิม
  // ที่ปรับให้รองรับจุดแดง + หัวข้อย่อยของกลุ่มที่เลือกอยู่ใต้กริด
  Widget _buildStatsRow(TextTheme textTheme) {
    Widget groupCard(_MainGroup g) {
      return StatusCard(
        filterKey: g.key,
        count: _countIn(g),
        label: g.label,
        color: kStatusColors[g.colorStatusId]!,
        isActive: _activeMain == g.key,
        unreadCount: repairrequestModelStore.where((r) => _isVisible(r) && _inGroup(r, g) && r.hasUnread).length,
        onTap: () => setState(() {
          _activeMain = _activeMain == g.key ? null : g.key;
          _activeSub = _kSubAll;
        }),
      );
    }

    final activeGroup = _activeMain == null ? null : _kMainGroups.firstWhere((g) => g.key == _activeMain);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (int row = 0; row < _kMainGroups.length; row += 2) ...[
          if (row > 0) const SizedBox(height: 10),
          Row(
            children: [
              Expanded(child: groupCard(_kMainGroups[row])),
              const SizedBox(width: 10),
              Expanded(child: groupCard(_kMainGroups[row + 1])),
            ],
          ),
        ],
        if (activeGroup != null && activeGroup.subs.isNotEmpty) ...[
          const SizedBox(height: 12),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              for (final sub in activeGroup.subs) _buildSubChip(sub, _countIn(activeGroup, sub: sub)),
            ],
          ),
        ],
      ],
    );
  }

  // จำนวนเคสที่มองเห็นในหัวข้อใหญ่ (ตัดงานปิดเก่าแล้ว) และกรองตามหัวข้อย่อยถ้าระบุ
  int _countIn(_MainGroup g, {String sub = _kSubAll}) =>
      repairrequestModelStore.where((r) => _isVisible(r) && _inGroup(r, g) && _matchesSub(r, sub)).length;

  Widget _buildSubChip(String label, int count) {
    final isActive = _activeSub == label;
    return GestureDetector(
      onTap: () => setState(() => _activeSub = label),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isActive ? kNavy : Colors.white,
          borderRadius: BorderRadius.circular(999),
          border: Border.all(color: isActive ? kNavy : kGray200, width: 1.5),
        ),
        child: Text(
          '$label $count',
          style: GoogleFonts.sarabun(
            fontSize: 12.5,
            fontWeight: FontWeight.w600,
            color: isActive ? Colors.white : kGray500,
          ),
        ),
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
                  clipBehavior: Clip.antiAlias,
                  child: Image.asset('assets/dorm_logo.jpg', fit: BoxFit.cover),
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
                  onTap: _openNotifications,
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
                        // ตัวเลข = จำนวนเคสที่มีอัปเดตยังไม่เปิดดู (เดิมเป็นจุดแดงตกแต่งที่โชว์ตลอด)
                        if (_unreadCaseCount > 0)
                          Positioned(
                            top: -4,
                            right: -4,
                            child: Container(
                              constraints: const BoxConstraints(minWidth: 18),
                              height: 18,
                              padding: const EdgeInsets.symmetric(horizontal: 4),
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                color: const Color(0xFFE11D48),
                                borderRadius: BorderRadius.circular(9),
                                border: Border.all(color: kGoldMid, width: 2),
                              ),
                              child: Text(
                                _unreadCaseCount > 99 ? '99+' : '$_unreadCaseCount',
                                style: GoogleFonts.sarabun(fontSize: 10.5, fontWeight: FontWeight.w700, color: Colors.white, height: 1.1),
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
          // ไอคอนและฟอนต์ตามหน้าประวัติ (history_screen.dart _EmptyState) — สีตัวอักษรคงเดิมของหน้านี้
          const Icon(Icons.search_off, size: 72, color: Color(0xFFD1D5DB)),
          const SizedBox(height: 14),
          Text(
            'ไม่พบรายการที่ค้นหา',
            style: GoogleFonts.sarabun(
              fontSize: 16,
              fontWeight: FontWeight.w700,
              color: kGray700,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'ไม่มีรายการซ่อมในสถานะนี้',
            textAlign: TextAlign.center,
            style: GoogleFonts.sarabun(fontSize: 13.5, color: kGray500),
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
            // หน้าแจ้งซ่อมคืน true เมื่อผู้ใช้กด "ดูประวัติการแจ้งซ่อม" ในหน้าสำเร็จ (ปิดหน้าด้วยวิธีอื่นคืน null)
            final bool? wantsHistory = await Navigator.push<bool>(
              context,
              MaterialPageRoute(builder: (context) => ReportSubmitScreen()),
            );

            // เรียกเมื่อกลับมาหน้า Home
            // ใช้กรณีต้องการโหลดข้อมูลงานซ่อมใหม่
            _fetchData();

            if (wantsHistory == true && mounted) {
              widget.onViewHistory?.call();
            }
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
