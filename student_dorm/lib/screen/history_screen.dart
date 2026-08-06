import 'package:flutter/material.dart';

/* ── Theme Colors (from :root CSS variables) ───────────────── */
class AppColors {
  static const navy = Color(0xFF1A3A6C);
  static const navyDark = Color(0xFF0F2347);
  static const navyMid = Color(0xFF3F5D9C);
  static const navyLight = Color(0xFFEEF2FB);
  static const gold = Color(0xFFFFD700);
  static const bg = Color(0xFFF0F3FA);

  static const pending = Color(0xFFD97706);
  static const pendingBg = Color(0xFFFEF3C7);
  static const working = Color(0xFF1D4ED8);
  static const workingBg = Color(0xFFDBEAFE);
  static const done = Color(0xFF166534);
  static const doneBg = Color(0xFFDCFCE7);
  static const cancel = Color(0xFFB91C1C);
  static const cancelBg = Color(0xFFFEE2E2);
}

/* ── Data Model (TODO: replace with backend model, e.g. repair_request join) ── */
class RepairCase {
  final String id; // case_code
  final String dateRaw; // sortable yyyymmdd (Thai year) e.g. repair_request.report_date
  final String dateDisplay; // dd/mm/yyyy (Thai year)
  final String items; // description
  final List<String> types; // repair_type_name list via repair_request_detail
  final String status; // pending | working | done | cancel

  const RepairCase({
    required this.id,
    required this.dateRaw,
    required this.dateDisplay,
    required this.items,
    required this.types,
    required this.status,
  });
}

/* ── Status config (mirrors STATUS_CONFIG in history.js) ───── */
class StatusInfo {
  final String label;
  final Color color;
  final Color bg;
  const StatusInfo(this.label, this.color, this.bg);
}

const Map<String, StatusInfo> kStatusConfig = {
  'pending': StatusInfo('รอตรวจสอบ', AppColors.pending, AppColors.pendingBg),
  'working': StatusInfo('อยู่ระหว่างการซ่อม', AppColors.working, AppColors.workingBg),
  'done': StatusInfo('เสร็จสิ้น', AppColors.done, AppColors.doneBg),
  'cancel': StatusInfo('ยกเลิก', AppColors.cancel, AppColors.cancelBg),
};

const Map<String, int> kStatusOrder = {
  'pending': 0,
  'working': 1,
  'done': 2,
  'cancel': 3,
};

const Map<String, String> kSectionTitle = {
  'date': 'รายการทั้งหมด',
  'type': 'เรียงตามประเภทงาน',
  'status': 'แบ่งตามความคืบหน้า',
};

/* TODO: replace with real API/DB data (repair_request + repair_request_detail + repair_type + progress_status) */
const List<RepairCase> kMockCases = [
  RepairCase(id: '1100067', dateRaw: '25690207', dateDisplay: '07/02/2569', items: 'ไฟเสีย, ชักโครกชำรุด', types: ['งานไฟฟ้า', 'งานประปา'], status: 'pending'),
  RepairCase(id: '1100063', dateRaw: '25690206', dateDisplay: '06/02/2569', items: 'หน้าต่างชำรุด, บานพับหัก', types: ['งานช่างทั่วไป'], status: 'pending'),
  RepairCase(id: '1100059', dateRaw: '25690207', dateDisplay: '07/02/2569', items: 'โคมไฟชำรุด', types: ['งานไฟฟ้า'], status: 'working'),
  RepairCase(id: '1100052', dateRaw: '25690201', dateDisplay: '01/02/2569', items: 'เตียงนอนชำรุด, ขาโต๊ะหัก', types: ['งานเฟอร์นิเจอร์'], status: 'working'),
  RepairCase(id: '1100045', dateRaw: '25690120', dateDisplay: '20/01/2569', items: 'แอร์ไม่เย็น (คอมเพรสเซอร์เสีย)', types: ['งานระบบปรับอากาศ'], status: 'done'),
  RepairCase(id: '1100030', dateRaw: '25690203', dateDisplay: '03/02/2569', items: 'เตียงนอนชำรุด', types: ['งานเฟอร์นิเจอร์'], status: 'done'),
  RepairCase(id: '1100028', dateRaw: '25690115', dateDisplay: '15/01/2569', items: 'ก๊อกน้ำรั่ว, ท่อน้ำตัน', types: ['งานประปา'], status: 'done'),
  RepairCase(id: '1100015', dateRaw: '25681220', dateDisplay: '20/12/2568', items: 'ประตูห้องน้ำชำรุด', types: ['งานช่างทั่วไป'], status: 'cancel'),
];

/* ═══════════════════════════════════════════════════════════
   HistoryPage — STATEFUL
   เหตุผล: เก็บ searchQuery / sortKey / dateDir / navIndex ทั้งหมด
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
  int _navIndex = 1; // 0=home,1=history,2=profile

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  /* ── filter + sort (mirrors render() logic in history.js) ── */
  List<RepairCase> get _filteredSorted {
    final q = _searchQuery.trim().toLowerCase();
    var list = kMockCases.where((c) {
      if (q.isEmpty) return true;
      return c.id.toLowerCase().contains(q) ||
          c.items.toLowerCase().contains(q) ||
          c.types.any((t) => t.toLowerCase().contains(q));
    }).toList();

    switch (_sortKey) {
      case 'date':
        list.sort((a, b) => _dateDir == 'desc'
            ? b.dateRaw.compareTo(a.dateRaw)
            : a.dateRaw.compareTo(b.dateRaw));
        break;
      case 'type':
        list.sort((a, b) => a.types.first.compareTo(b.types.first));
        break;
      case 'status':
        list.sort((a, b) =>
            kStatusOrder[a.status]!.compareTo(kStatusOrder[b.status]!));
        break;
    }
    return list;
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

  void _onNavTap(int index) {
    setState(() => _navIndex = index);
    // TODO: Navigator.pushReplacementNamed(context, ['/home','/history','/profile'][index]);
  }

  @override
  Widget build(BuildContext context) {
    final list = _filteredSorted;

    return Scaffold(
      backgroundColor: AppColors.bg,
      body: Stack(
        children: [
          Column(
            children: [
              _HistoryHeader(
                total: kMockCases.length,
                searchController: _searchController,
                onSearchChanged: _onSearchChanged,
                onClearSearch: _onClearSearch,
                showClear: _searchQuery.isNotEmpty,
                sortKey: _sortKey,
                dateDir: _dateDir,
                onChipTap: _onChipTap,
              ),
              Expanded(
                child: list.isEmpty
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
                                      style: const TextStyle(
                                          fontSize: 17,
                                          fontWeight: FontWeight.w700,
                                          color: AppColors.navy)),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 13, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: AppColors.navyLight,
                                      borderRadius: BorderRadius.circular(999),
                                    ),
                                    child: Text('${list.length}',
                                        style: const TextStyle(
                                            fontSize: 12,
                                            fontWeight: FontWeight.w700,
                                            color: AppColors.navyMid)),
                                  ),
                                ],
                              ),
                            ),
                            if (_sortKey == 'status')
                              ..._buildGrouped(list)
                            else
                              ...list.asMap().entries.map(
                                  (e) => RepairCard(data: e.value)),
                          ],
                        ),
                      ),
              ),
            ],
          ),
          Positioned(
            left: 20,
            right: 20,
            bottom: 20,
            child: BottomNavBar(
              currentIndex: _navIndex,
              onTap: _onNavTap,
            ),
          ),
        ],
      ),
    );
  }

  /* ── grouped-by-status list (mirrors buildGrouped() in history.js) ── */
  List<Widget> _buildGrouped(List<RepairCase> list) {
    final Map<String, List<RepairCase>> groups = {};
    for (final c in list) {
      groups.putIfAbsent(c.status, () => []).add(c);
    }
    final sortedKeys = groups.keys.toList()
      ..sort((a, b) => kStatusOrder[a]!.compareTo(kStatusOrder[b]!));

    final widgets = <Widget>[];
    for (final status in sortedKeys) {
      final cfg = kStatusConfig[status]!;
      widgets.add(GroupHeader(label: cfg.label, color: cfg.color, count: groups[status]!.length));
      widgets.addAll(groups[status]!.map((c) => RepairCard(data: c)));
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

  const _HistoryHeader({
    required this.total,
    required this.searchController,
    required this.onSearchChanged,
    required this.onClearSearch,
    required this.showClear,
    required this.sortKey,
    required this.dateDir,
    required this.onChipTap,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(18, 52, 18, 0),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment(0, -1),
          end: Alignment(0, 1),
          colors: [Color(0xFFFFE84E), AppColors.gold, Color(0xFFF5C400)],
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
              const Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('ประวัติการแจ้งซ่อม',
                        style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.w800,
                            color: AppColors.navyDark)),
                    SizedBox(height: 4),
                    Text('รายการซ่อมครุภัณฑ์ทั้งหมดของคุณ',
                        style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: Color(0x8C0F2347))),
                  ],
                ),
              ),
              Container(
                margin: const EdgeInsets.only(top: 3),
                padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 5),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(.48),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text('$total รายการ',
                    style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: AppColors.navyDark)),
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
                    color: AppColors.bg,
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
                          style: const TextStyle(fontSize: 14, color: AppColors.navy),
                          decoration: const InputDecoration(
                            isDense: true,
                            border: InputBorder.none,
                            hintText: 'ค้นหาหมายเลข Case หรือรายการซ่อม…',
                            hintStyle: TextStyle(color: Color(0xFFB0BAC8)),
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
                    const Text('เรียงตาม',
                        style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: Color(0xFF9CA3AF),
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
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/* ═══════════════════════════════════════════════════════════
   SortChip — STATELESS
   เหตุผล: chip เดี่ยว ๆ ไม่มี state ของตัวเอง — active/dirIcon
   ถูกกำหนดจาก parent ทั้งหมด กด (onTap) แล้วแจ้ง parent ให้ setState
   ═══════════════════════════════════════════════════════════ */
class SortChip extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool active;
  final IconData? dirIcon;
  final VoidCallback onTap;

  const SortChip({
    super.key,
    required this.icon,
    required this.label,
    required this.active,
    required this.onTap,
    this.dirIcon,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(999),
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.fromLTRB(10, 7, 12, 7),
        decoration: BoxDecoration(
          color: active ? AppColors.navy : AppColors.bg,
          borderRadius: BorderRadius.circular(999),
          boxShadow: active
              ? [const BoxShadow(color: Color(0x481A3A6C), blurRadius: 12, offset: Offset(0, 3))]
              : null,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 17, color: active ? Colors.white : const Color(0xFF6B7280)),
            const SizedBox(width: 4),
            Text(label,
                style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: active ? Colors.white : const Color(0xFF6B7280))),
            if (active && dirIcon != null) ...[
              const SizedBox(width: 4),
              Icon(dirIcon, size: 15, color: Colors.white),
            ],
          ],
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
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: Color(0xFF374151))),
          ),
          Text('$count รายการ',
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF9CA3AF))),
        ],
      ),
    );
  }
}

/* ═══════════════════════════════════════════════════════════
   RepairCard — STATELESS
   เหตุผล: การ์ดรับข้อมูล RepairCase มาแสดงอย่างเดียว ไม่มี state
   ภายใน (ตามที่แจ้งว่ามีอยู่แล้ว — ใส่ให้ครบไว้ประกอบกันดู)
   ═══════════════════════════════════════════════════════════ */
class RepairCard extends StatelessWidget {
  final RepairCase data;
  const RepairCard({super.key, required this.data});

  @override
  Widget build(BuildContext context) {
    final cfg = kStatusConfig[data.status]!;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border(left: BorderSide(color: cfg.color, width: 4)),
        boxShadow: const [BoxShadow(color: Color(0x0D000000), blurRadius: 12, offset: Offset(0, 2))],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(20),
        child: InkWell(
          borderRadius: BorderRadius.circular(20),
          onTap: () {
            // TODO: navigate to case detail page using data.id
          },
          child: Padding(
            padding: const EdgeInsets.fromLTRB(13, 15, 15, 13),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Row 1: case number + date
                Container(
                  padding: const EdgeInsets.only(bottom: 11),
                  margin: const EdgeInsets.only(bottom: 11),
                  decoration: const BoxDecoration(
                    border: Border(bottom: BorderSide(color: Color(0xFFE8ECF8), width: 1)),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('รหัส Case',
                              style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF9CA3AF), letterSpacing: .8)),
                          const SizedBox(height: 2),
                          Text('#${data.id}',
                              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: AppColors.navy)),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          const Text('วันที่แจ้ง',
                              style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Color(0xFF9CA3AF), letterSpacing: .8)),
                          const SizedBox(height: 14),
                          Text(data.dateDisplay,
                              style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w600, color: Color(0xFF4B5563))),
                        ],
                      ),
                    ],
                  ),
                ),
                // Row 2: items + type tags
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SizedBox(width: 76, child: Text('รายการซ่อม', style: TextStyle(fontSize: 12, color: Color(0xFF6B7280)))),
                          Expanded(
                            child: Text(data.items,
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Color(0xFF1F2937), height: 1.55)),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SizedBox(width: 76, child: Text('ประเภทงาน', style: TextStyle(fontSize: 12, color: Color(0xFF6B7280)))),
                          Expanded(
                            child: Wrap(
                              spacing: 3,
                              runSpacing: 4,
                              children: data.types
                                  .map((t) => Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: AppColors.navyLight,
                                          borderRadius: BorderRadius.circular(999),
                                        ),
                                        child: Text(t,
                                            style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: AppColors.navyMid)),
                                      ))
                                  .toList(),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                // Row 3: status badge + arrow
                Container(
                  padding: const EdgeInsets.only(top: 10),
                  decoration: const BoxDecoration(
                    border: Border(top: BorderSide(color: Color(0xFFF3F5FB), width: 1)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
                        decoration: BoxDecoration(color: cfg.bg, borderRadius: BorderRadius.circular(999)),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(width: 7, height: 7, decoration: BoxDecoration(color: cfg.color, shape: BoxShape.circle)),
                            const SizedBox(width: 7),
                            Text(cfg.label, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: cfg.color)),
                          ],
                        ),
                      ),
                      Container(
                        width: 32,
                        height: 32,
                        decoration: const BoxDecoration(color: Color(0xFFF1F4FC), shape: BoxShape.circle),
                        child: const Icon(Icons.chevron_right, size: 18, color: Color(0xFF94A3B8)),
                      ),
                    ],
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
            const Text('ไม่พบรายการที่ค้นหา',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Color(0xFF6B7280))),
            const SizedBox(height: 6),
            const Text('ลองพิมพ์รหัส Case หรือชื่อรายการซ่อมใหม่อีกครั้ง',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 13.5, color: Color(0xFF9CA3AF))),
          ],
        ),
      ),
    );
  }
}

/* ═══════════════════════════════════════════════════════════
   BottomNavBar — STATELESS
   เหตุผล: รับ currentIndex + onTap callback จาก parent
   (parent เก็บ _navIndex เพราะต้อง sync กับหน้าที่แสดงจริง)
   ═══════════════════════════════════════════════════════════ */
class BottomNavBar extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;

  const BottomNavBar({super.key, required this.currentIndex, required this.onTap});

  static const _items = [
    (Icons.home, 'หน้าหลัก'),
    (Icons.history, 'ประวัติแจ้ง'),
    (Icons.person, 'โปรไฟล์'),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 64,
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFFFFE033), AppColors.gold, Color(0xFFF7C800)],
          stops: [0.0, 0.6, 1.0],
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: const [
          BoxShadow(color: Color(0x61C8A000), blurRadius: 32, offset: Offset(0, 8)),
          BoxShadow(color: Color(0x1A000000), blurRadius: 8, offset: Offset(0, 2)),
        ],
      ),
      child: Row(
        children: List.generate(_items.length, (i) {
          final active = i == currentIndex;
          final (icon, label) = _items[i];
          return Expanded(
            child: InkWell(
              borderRadius: BorderRadius.circular(16),
              onTap: () => onTap(i),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 220),
                margin: const EdgeInsets.symmetric(horizontal: 2),
                decoration: BoxDecoration(
                  color: active ? Colors.white.withOpacity(.6) : Colors.transparent,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(icon, size: 22, color: active ? AppColors.navy : Colors.black.withOpacity(.40)),
                    const SizedBox(height: 2),
                    Text(label,
                        style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: active ? AppColors.navy : Colors.black.withOpacity(.40))),
                  ],
                ),
              ),
            ),
          );
        }),
      ),
    );
  }
}