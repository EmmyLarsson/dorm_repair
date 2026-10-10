import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:student_dorm/color/colors.dart';
import 'package:student_dorm/models/repair_request_model.dart';
import 'package:student_dorm/utils/app_api.dart';
import 'package:student_dorm/widgets/repair_info.dart';
import 'package:student_dorm/widgets/history/sort_chip.dart';

const String _kAllTypes = 'all';

const Map<String, String> kSectionTitle = {
  'date': 'รายการทั้งหมด',
  'type': 'เรียงตามประเภทงาน',
  'status': 'แบ่งตามความคืบหน้า',
};

/* ═══════════════════════════════════════════════════════════
   HistoryPage — STATEFUL
   เหตุผล: เก็บ searchQuery / sortKey / dateDir ทั้งหมด
   ทุกครั้งที่ค่าพวกนี้เปลี่ยน ต้อง filter+sort ใหม่และ setState
   (ตรงกับ render() ใน history.js ที่ถูกเรียกซ้ำทุกครั้งที่ state เปลี่ยน)
   ═══════════════════════════════════════════════════════════ */
class HistoryPage extends StatefulWidget {
  const HistoryPage({super.key});

  @override
  State<HistoryPage> createState() => _HistoryPageState();
}

class _HistoryPageState extends State<HistoryPage> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  String _sortKey = 'date'; // date | type | status
  String _dateDir = 'desc'; // desc | asc
  // ตัวกรองของ dropdown ประเภทงาน (ใช้เฉพาะตอนเลือกเรียงตามประเภท) — 'all' = แสดงทุกประเภทแยกหัวข้อ
  String _typeFilter = _kAllTypes;
  List<RepairRequestModel> _repairs = [];
  // ชื่อประเภทงานทั้งหมดจาก backend (ตาราง repair_type) ให้ dropdown มีครบทุกประเภทแม้ยังไม่เคยแจ้ง
  List<String> _repairTypeNames = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchData();
    _fetchRepairTypes();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _fetchData() async {
    var response = await AppAPI.get("/repair_request/get_all_by_user");
    Map<String, dynamic> json = jsonDecode(response.body);
    RepairRequestResponse repairResponse = RepairRequestResponse.fromJson(json);

    setState(() {
      _isLoading = false;
      _repairs = repairResponse.data;
    });
  }

  Future<void> _fetchRepairTypes() async {
    try {
      var response = await AppAPI.get("/repair_type/get_all");
      Map<String, dynamic> json = jsonDecode(response.body);
      if (json['isError'] == true) return;
      final names = (json['data'] as List).map((row) => row['repair_type_name'] as String).toList();
      if (mounted) setState(() => _repairTypeNames = names);
    } catch (_) {
      // ดึงไม่ได้ก็ไม่เป็นไร _typeNames จะถอยไปใช้ชื่อจากเคสที่มีอยู่แทน หน้านี้ยังใช้งานได้
    }
  }

  // ถ้าดึงรายชื่อจาก backend ไม่ได้ ใช้ชื่อประเภทที่ปรากฏในเคสแทน (ยังเป็นชื่อจาก backend เหมือนกัน)
  List<String> get _typeNames =>
      _repairTypeNames.isNotEmpty ? _repairTypeNames : {for (final c in _repairs) ...c.typeNames}.toList();

  /* ── filter + sort (mirrors render() logic in history.js) ── */
  List<RepairRequestModel> get _filteredSorted {
    final q = _searchQuery.trim().toLowerCase();
    var list = _repairs.where((c) {
      if (_sortKey == 'type' && _typeFilter != _kAllTypes && !c.typeNames.contains(_typeFilter)) {
        return false;
      }
      if (q.isEmpty) return true;
      return c.caseCode.toLowerCase().contains(q) ||
          c.description.toLowerCase().contains(q) ||
          c.typeNames.any((t) => t.toLowerCase().contains(q));
    }).toList();

    switch (_sortKey) {
      case 'date':
        list.sort((a, b) => _dateDir == 'desc'
            ? b.createdAt.compareTo(a.createdAt)
            : a.createdAt.compareTo(b.createdAt));
        break;
      case 'type':
        list.sort((a, b) => (a.typeNames.isNotEmpty ? a.typeNames.first : '')
            .compareTo(b.typeNames.isNotEmpty ? b.typeNames.first : ''));
        break;
      case 'status':
        list.sort((a, b) => a.statusId.compareTo(b.statusId));
        break;
    }
    return list;
  }

  // จำนวนเคสต่อประเภท — เคสที่แจ้งหลายประเภทถูกนับในทุกประเภทที่เกี่ยว ผลรวมจึงอาจมากกว่าจำนวนเคสจริง
  Map<String, int> get _typeCounts => {
        for (final type in _typeNames)
          type: _repairs.where((c) => c.typeNames.contains(type)).length,
      };

  void _onTypeChanged(String value) {
    setState(() => _typeFilter = value);
  }

  void _onSearchChanged(String value) {
    setState(() => _searchQuery = value);
  }

  void _onClearSearch() {
    _searchController.clear();
    setState(() => _searchQuery = '');
  }

  void _onChipTap(String key) {
    setState(() {
      if (key == _sortKey) {
        if (key == 'date') {
          _dateDir = _dateDir == 'desc' ? 'asc' : 'desc';
        }
      } else {
        _sortKey = key;
        _dateDir = 'desc';
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final list = _filteredSorted;

    return Scaffold(
      backgroundColor: kGray100,
      body: Stack(
        children: [
          Column(
            children: [
              _HistoryHeader(
                total: _repairs.length,
                searchController: _searchController,
                onSearchChanged: _onSearchChanged,
                onClearSearch: _onClearSearch,
                showClear: _searchQuery.isNotEmpty,
                sortKey: _sortKey,
                dateDir: _dateDir,
                onChipTap: _onChipTap,
                typeCounts: _typeCounts,
                typeFilter: _typeFilter,
                onTypeChanged: _onTypeChanged,
              ),
              Expanded(
                child: _isLoading
                    ? const Center(child: CircularProgressIndicator())
                    : list.isEmpty
                        ? const _EmptyState()
                        : SingleChildScrollView(
                            padding: const EdgeInsets.fromLTRB(16, 20, 16, 100),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Padding(
                                  padding: const EdgeInsets.only(bottom: 16),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(kSectionTitle[_sortKey]!,
                                          style: GoogleFonts.sarabun(
                                              fontSize: 17,
                                              fontWeight: FontWeight.w700,
                                              color: kNavy)),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 13, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: kNavyLight,
                                          borderRadius: BorderRadius.circular(999),
                                        ),
                                        child: Text('${list.length}',
                                            style: GoogleFonts.sarabun(
                                                fontSize: 12,
                                                fontWeight: FontWeight.w700,
                                                color: kNavyMid)),
                                      ),
                                    ],
                                  ),
                                ),
                                if (_sortKey == 'status')
                                  ..._buildGrouped(list)
                                else if (_sortKey == 'type')
                                  ..._buildGroupedByType(list)
                                else
                                  ..._buildGroupedByDate(list),
                              ],
                            ),
                          ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  /* ── grouped-by-date list ── เรียงตามวันที่แจ้งอยู่แล้ว (list ผ่าน _filteredSorted มาแล้ว) แค่คั่นด้วยหัวข้อวันที่ที่แจ้ง
     ใช้ GroupHeader เดิม — createdAt เป็นข้อความ "YYYY-MM-DD HH:mm:ss" ตัด 10 ตัวแรกเป็นวัน ไม่ต้อง parse เวลา ── */
  List<Widget> _buildGroupedByDate(List<RepairRequestModel> list) {
    final groups = <String, List<RepairRequestModel>>{};
    for (final c in list) {
      final day = c.createdAt.length >= 10 ? c.createdAt.substring(0, 10) : c.createdAt;
      groups.putIfAbsent(day, () => []).add(c);
    }

    final now = DateTime.now();
    final today = '${now.year.toString().padLeft(4, '0')}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';

    final widgets = <Widget>[];
    groups.forEach((day, items) {
      widgets.add(GroupHeader(label: _thaiDayLabel(day, isToday: day == today), color: kNavyMid, count: items.length));
      widgets.addAll(items.map((c) => RepairInfoCard(item: c, onReturn: _fetchData)));
    });
    return widgets;
  }

  // "2026-10-06" → "6 ต.ค. 2569" (+ " · วันนี้") ; ถ้ารูปแบบไม่ตรงคืนข้อความเดิม ไม่ให้หน้าพัง
  String _thaiDayLabel(String day, {required bool isToday}) {
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    final parts = day.split('-');
    if (parts.length != 3) return day;
    final year = int.tryParse(parts[0]);
    final month = int.tryParse(parts[1]);
    final dayOfMonth = int.tryParse(parts[2]);
    if (year == null || month == null || dayOfMonth == null || month < 1 || month > 12) return day;
    return '$dayOfMonth ${months[month - 1]} ${year + 543}${isToday ? ' · วันนี้' : ''}';
  }

  /* ── grouped-by-type list ── เคสที่แจ้งหลายประเภทอยู่ในทุกหัวข้อที่เกี่ยวข้อง เพื่อให้เปิดหาตามประเภทไหนก็เจอ ── */
  List<Widget> _buildGroupedByType(List<RepairRequestModel> list) {
    final widgets = <Widget>[];
    for (final type in _typeNames) {
      // เลือกประเภทเดียวแล้ว เคสที่มีหลายประเภทต้องไม่พาหัวข้อของประเภทอื่นเข้ามาด้วย
      if (_typeFilter != _kAllTypes && type != _typeFilter) continue;
      final items = list.where((c) => c.typeNames.contains(type)).toList();
      if (items.isEmpty) continue;
      widgets.add(GroupHeader(label: type, color: kNavyMid, count: items.length));
      widgets.addAll(items.map((c) => RepairInfoCard(item: c, onReturn: _fetchData)));
    }
    return widgets;
  }

  /* ── grouped-by-status list (mirrors buildGrouped() in history.js) ── */
  List<Widget> _buildGrouped(List<RepairRequestModel> list) {
    final Map<int, List<RepairRequestModel>> groups = {};
    for (final c in list) {
      groups.putIfAbsent(c.statusId, () => []).add(c);
    }
    final sortedKeys = groups.keys.toList()..sort();

    final widgets = <Widget>[];
    for (final statusId in sortedKeys) {
      final items = groups[statusId]!;
      final label = items.first.statusName;
      final color = kStatusColors[statusId] ?? kNavyMid;
      widgets.add(GroupHeader(label: label, color: color, count: items.length));
      widgets.addAll(items.map((c) => RepairInfoCard(item: c, onReturn: _fetchData)));
    }
    return widgets;
  }
}

/* ═══════════════════════════════════════════════════════════
   _HistoryHeader — STATELESS
   เหตุผล: ไม่มี state ภายในตัวเอง รับค่าปัจจุบัน (searchController,
   sortKey, dateDir) และ callback จาก parent ทั้งหมด — แค่ "แสดงผล"
   ตาม state ที่ parent (_HistoryPageState) ควบคุมอยู่
   ═══════════════════════════════════════════════════════════ */
class _HistoryHeader extends StatelessWidget {
  final int total;
  final TextEditingController searchController;
  final ValueChanged<String> onSearchChanged;
  final VoidCallback onClearSearch;
  final bool showClear;
  final String sortKey;
  final String dateDir;
  final ValueChanged<String> onChipTap;
  final Map<String, int> typeCounts;
  final String typeFilter;
  final ValueChanged<String> onTypeChanged;

  const _HistoryHeader({
    required this.total,
    required this.searchController,
    required this.onSearchChanged,
    required this.onClearSearch,
    required this.showClear,
    required this.sortKey,
    required this.dateDir,
    required this.onChipTap,
    required this.typeCounts,
    required this.typeFilter,
    required this.onTypeChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(18, 52, 18, 0),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment(0, -1),
          end: Alignment(0, 1),
          colors: [Color(0xFFFFE84E), kGoldMid, Color(0xFFF5C400)],
          stops: [0.0, 0.5, 1.0],
        ),
        borderRadius: BorderRadius.vertical(bottom: Radius.circular(30)),
        boxShadow: [
          BoxShadow(color: Color(0x47C8A000), blurRadius: 28, offset: Offset(0, 6)),
        ],
      ),
      child: Column(
        children: [
          // Title row
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('ประวัติการแจ้งซ่อม',
                        style: GoogleFonts.sarabun(
                            fontSize: 24,
                            fontWeight: FontWeight.w800,
                            color: kNavyDark)),
                    const SizedBox(height: 4),
                    Text('รายการซ่อมครุภัณฑ์ทั้งหมดของคุณ',
                        style: GoogleFonts.sarabun(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: const Color(0x8C0F2347))),
                  ],
                ),
              ),
              Container(
                margin: const EdgeInsets.only(top: 3),
                padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 5),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: .48),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text('$total รายการ',
                    style: GoogleFonts.sarabun(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: kNavyDark)),
              ),
            ],
          ),
          const SizedBox(height: 14),
          // White body: search + sort
          Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 14),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
            ),
            child: Column(
              children: [
                // Search bar
                Container(
                  height: 44,
                  decoration: BoxDecoration(
                    color: kGray100,
                    border: Border.all(color: const Color(0xFFE2E8F4), width: 1.5),
                    borderRadius: BorderRadius.circular(11),
                  ),
                  child: Row(
                    children: [
                      const Padding(
                        padding: EdgeInsets.only(left: 12, right: 8),
                        child: Icon(Icons.search, size: 20, color: Color(0xFF94A3B8)),
                      ),
                      Expanded(
                        child: TextField(
                          controller: searchController,
                          onChanged: onSearchChanged,
                          style: GoogleFonts.sarabun(fontSize: 14, color: kNavy),
                          decoration: InputDecoration(
                            isDense: true,
                            border: InputBorder.none,
                            hintText: 'ค้นหาหมายเลข Case หรือรายการซ่อม…',
                            hintStyle: GoogleFonts.sarabun(color: const Color(0xFFB0BAC8)),
                          ),
                        ),
                      ),
                      if (showClear)
                        Padding(
                          padding: const EdgeInsets.only(right: 10),
                          child: InkWell(
                            borderRadius: BorderRadius.circular(6),
                            onTap: onClearSearch,
                            child: const Padding(
                              padding: EdgeInsets.all(3),
                              child: Icon(Icons.close, size: 18, color: Color(0xFF94A3B8)),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
                // Sort chips
                Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    Text('เรียงตาม',
                        style: GoogleFonts.sarabun(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: const Color(0xFF9CA3AF),
                            letterSpacing: .5)),
                    const SizedBox(width: 10),
                    Expanded(
                      child: SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: [
                            SortChip(
                              icon: Icons.calendar_today,
                              label: 'วันที่แจ้ง',
                              active: sortKey == 'date',
                              dirIcon: sortKey == 'date'
                                  ? (dateDir == 'desc' ? Icons.arrow_downward : Icons.arrow_upward)
                                  : null,
                              onTap: () => onChipTap('date'),
                            ),
                            const SizedBox(width: 7),
                            SortChip(
                              icon: Icons.category,
                              label: 'ประเภทงาน',
                              active: sortKey == 'type',
                              onTap: () => onChipTap('type'),
                            ),
                            const SizedBox(width: 7),
                            SortChip(
                              icon: Icons.pending_actions,
                              label: 'ความคืบหน้า',
                              active: sortKey == 'status',
                              onTap: () => onChipTap('status'),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                if (sortKey == 'type') ...[
                  const SizedBox(height: 10),
                  _buildTypeDropdown(),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTypeDropdown() {
    final optionLabels = <String, String>{
      _kAllTypes: 'ทั้งหมด',
      for (final type in typeCounts.keys) type: type,
    };
    int countOf(String value) => value == _kAllTypes ? total : typeCounts[value] ?? 0;
    final textStyle = GoogleFonts.sarabun(fontSize: 14, fontWeight: FontWeight.w600, color: kNavy);

    return Container(
      height: 44,
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: kGray100,
        border: Border.all(color: const Color(0xFFE2E8F4), width: 1.5),
        borderRadius: BorderRadius.circular(11),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          isExpanded: true,
          value: typeFilter,
          // จำกัดความสูงเมนูให้เห็นราว 4 แถว ที่เหลือเลื่อนเอา — ไม่ให้เมนูบังรายการด้านล่างมากบนจอเล็ก
          menuMaxHeight: 220,
          icon: const Icon(Icons.expand_more, color: kNavy),
          style: textStyle,
          selectedItemBuilder: (context) => [
            for (final entry in optionLabels.entries)
              Align(
                alignment: Alignment.centerLeft,
                child: Text('ประเภทงาน: ${entry.value} (${countOf(entry.key)})', style: textStyle),
              ),
          ],
          items: [
            for (final entry in optionLabels.entries)
              DropdownMenuItem(
                value: entry.key,
                // ประเภทที่ไม่มีเคสเลือกไม่ได้ (จางลง) — เห็นว่ามีประเภทนี้ในระบบแต่ยังไม่เคยแจ้ง
                enabled: countOf(entry.key) > 0,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      entry.value,
                      style: textStyle.copyWith(color: countOf(entry.key) > 0 ? kNavy : const Color(0xFFB6BCC8)),
                    ),
                    Text(
                      '${countOf(entry.key)}',
                      style: GoogleFonts.sarabun(fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFF9CA3AF)),
                    ),
                  ],
                ),
              ),
          ],
          onChanged: (value) {
            if (value != null) onTypeChanged(value);
          },
        ),
      ),
    );
  }
}

/* ═══════════════════════════════════════════════════════════
   GroupHeader — STATELESS (แสดงผลอย่างเดียว)
   ═══════════════════════════════════════════════════════════ */
class GroupHeader extends StatelessWidget {
  final String label;
  final Color color;
  final int count;

  const GroupHeader({super.key, required this.label, required this.color, required this.count});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(4, 16, 4, 8),
      child: Row(
        children: [
          Container(width: 9, height: 9, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
          const SizedBox(width: 8),
          Expanded(
            child: Text(label,
                style: GoogleFonts.sarabun(fontSize: 13, fontWeight: FontWeight.w700, color: const Color(0xFF374151))),
          ),
          Text('$count รายการ',
              style: GoogleFonts.sarabun(fontSize: 12, fontWeight: FontWeight.w600, color: const Color(0xFF9CA3AF))),
        ],
      ),
    );
  }
}

/* ═══════════════════════════════════════════════════════════
   _EmptyState — STATELESS
   ═══════════════════════════════════════════════════════════ */
class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 56),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.search_off, size: 72, color: Color(0xFFD1D5DB)),
            const SizedBox(height: 14),
            Text('ไม่พบรายการที่ค้นหา',
                style: GoogleFonts.sarabun(fontSize: 16, fontWeight: FontWeight.w700, color: const Color(0xFF6B7280))),
            const SizedBox(height: 6),
            Text('ลองพิมพ์รหัส Case หรือชื่อรายการซ่อมใหม่อีกครั้ง',
                textAlign: TextAlign.center,
                style: GoogleFonts.sarabun(fontSize: 13.5, color: const Color(0xFF9CA3AF))),
          ],
        ),
      ),
    );
  }
}
