import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

// ── Design tokens (อ้างอิงจาก home.css ของเว็บ — ชุดเดียวกับ login_screen.dart) ──
const Color kNavy      = Color(0xFF1A3A6C);
const Color kNavyDark  = Color(0xFF0F2347);
const Color kNavyMid   = Color(0xFF3F5D9C);
const Color kGold      = Color(0xFFFFD700);
const Color kGray50    = Color(0xFFF9FAFB);
const Color kGray100   = Color(0xFFF3F4F6);
const Color kGray200   = Color(0xFFE5E7EB);
const Color kGray400   = Color(0xFF9CA3AF);
const Color kGray500   = Color(0xFF6B7280);
const Color kGray700   = Color(0xFF374151);

// สีทองสำหรับ header gradient และ bottom tab bar (อ้างอิงจาก home.css)
const Color kGoldLight = Color(0xFFFFE84E); // #ffe84e
const Color kGoldMid   = Color(0xFFFFD700); // --gold
const Color kGoldDark  = Color(0xFFF5C400); // #f5c400
const Color kGoldTabA  = Color(0xFFFFE033); // #ffe033 (tab bar gradient start)
const Color kGoldTabC  = Color(0xFFF7C800); // #f7c800 (tab bar gradient end)
const Color kNavyLight = Color(0xFFEEF2FB); // --navy-light (count pill bg)

// สี status ของสถานะงานซ่อม (pending / working / done) อ้างอิงจาก .st-badge ในเว็บ
const Color kPendingBg  = Color(0xFFFFF7E6);
const Color kPendingFg  = Color(0xFFB45309);
const Color kPendingDot = Color(0xFFF59E0B);

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  // ══════════════════════════════════════════
  // Mock data — โชว์แค่การ์ดเดียว #1100067
  // ⚠️ TODO: เชื่อมกับ API จริงภายหลัง (ตอนนี้ hardcode ตามที่ระบุ)
  // ══════════════════════════════════════════
  int cntPending = 1;
  int cntWorking = 0;
  int cntDone = 0;

  String? activeFilter; // null = แสดงทั้งหมด, 'pending' | 'working' | 'done'

  final String searchQuery = '';

  final Map<String, dynamic> repairCase = {
    'id': '1100067',
    'date': '07/02/2569',
    'items': ['ไฟเสีย', 'ชักโครกชำรุด'],
    'tags': ['งานไฟฟ้า', 'งานประปา'],
    'status': 'pending',
    'statusLabel': 'รอตรวจสอบ',
  };

  bool get _cardVisible {
    if (activeFilter != null && activeFilter != repairCase['status']) {
      return false;
    }
    return true;
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = GoogleFonts.sarabunTextTheme(Theme.of(context).textTheme);

    // ── tab-h / tab-bottom ตาม CSS: --tab-h: 64px, --tab-bottom: 20px ──
    const double tabBarHeight = 64;
    const double tabBarBottom = 20;
    const double fabAboveTab = 12; // ระยะห่าง FAB เหนือ tab bar (ตาม .fab-wrapper bottom)

    return Scaffold(
      backgroundColor: kGray100,
      // ปิด resizeToAvoidBottomInset ไม่จำเป็นในที่นี้ ปล่อย default
      body: SafeArea(
        child: Stack(
        children: [
          Column(
            children: [
              _buildHeader(textTheme),
              Expanded(
                child: SingleChildScrollView(
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
                      if (_cardVisible)
                        _buildRepairCard(textTheme)
                      else
                        _buildEmptyState(textTheme),
                    ],
                  ),
                ),
              ),
            ],
          ),

          // FAB "แจ้งซ่อม" — มุมขวาสุด ลอยเหนือ tab bar (ตาม .fab-wrapper: justify-content flex-end)
          Positioned(
            right: 20,
            bottom: tabBarHeight + tabBarBottom + fabAboveTab,
            child: _buildFab(textTheme),
          ),

          // Bottom tab bar — capsule ทองลอย (ตาม .bottom-nav)
          Positioned(
            left: 20,
            right: 20,
            bottom: tabBarBottom,
            child: _buildBottomNav(textTheme, height: tabBarHeight),
          ),
        ],
        ),
      ),
    );
  }

  // ── Header: gradient ทอง (.app-header) + โลโก้ + ชื่อระบบ + แจ้งเตือน + ค้นหา ──
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
            color: const Color(0xFFC8A000).withValues(alpha: 0.28),
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
                // Logo box (พื้นขาว รอใส่โลโก้จริง)
                Container(
                  width: 50,
                  height: 50,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(13),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.13),
                        blurRadius: 12,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  alignment: Alignment.center,
                  // TODO: แทนที่ด้วย Image.asset(...) โลโก้จริง
                  child: const Icon(Icons.apartment_rounded,
                      color: kNavy, size: 26),
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
                // ปุ่มแจ้งเตือน + จุดแดง (พื้นขาวโปร่ง ตาม .notif-btn)
                GestureDetector(
                  onTap: () {},
                  child: Container(
                    width: 42,
                    height: 42,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.48),
                      borderRadius: BorderRadius.circular(13),
                    ),
                    child: Stack(
                      clipBehavior: Clip.none,
                      children: [
                        const Center(
                          child: Icon(Icons.notifications_outlined,
                              color: kNavy, size: 22),
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

          // ช่องค้นหา — ส่วนสีขาวต่อท้าย header (ตาม .hdr-search)
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
                          fontSize: 14, color: kNavy),
                      decoration: InputDecoration(
                        hintText: 'ค้นหาหมายเลข Case หรือรายการซ่อม…',
                        hintStyle: GoogleFonts.sarabun(
                            fontSize: 14, color: const Color(0xFFB0BAC8)),
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

  // ── Stats row: 3 การ์ดสถิติ กรองได้ ─────────────────────────────
  Widget _buildStatsRow(TextTheme textTheme) {
    return Row(
      children: [
        Expanded(
          child: _statCard(
            textTheme,
            filterKey: 'pending',
            count: cntPending,
            label: 'รอตรวจสอบ',
            color: const Color(0xFFF59E0B),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _statCard(
            textTheme,
            filterKey: 'working',
            count: cntWorking,
            label: 'กำลังซ่อม',
            color: kNavyMid,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _statCard(
            textTheme,
            filterKey: 'done',
            count: cntDone,
            label: 'เสร็จแล้ว',
            color: const Color(0xFF16A34A),
          ),
        ),
      ],
    );
  }

  Widget _statCard(
    TextTheme textTheme, {
    required String filterKey,
    required int count,
    required String label,
    required Color color,
  }) {
    final bool isActive = activeFilter == filterKey;
    return GestureDetector(
      onTap: () {
        setState(() {
          activeFilter = isActive ? null : filterKey;
        });
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
        decoration: BoxDecoration(
          color: isActive ? color.withValues(alpha: 0.10) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isActive ? color : kGray200,
            width: isActive ? 1.5 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: kNavy.withValues(alpha: 0.05),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          children: [
            Text(
              '$count',
              style: textTheme.titleLarge?.copyWith(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: color,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              textAlign: TextAlign.center,
              style: textTheme.bodySmall?.copyWith(
                fontSize: 11.5,
                fontWeight: FontWeight.w600,
                color: kGray500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Section header: "งานซ่อมปัจจุบัน" + count pill ──────────────
  Widget _buildSectionHeader(TextTheme textTheme) {
    final visibleCount = _cardVisible ? 1 : 0;
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
            '$visibleCount',
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

  // ── การ์ดรายการซ่อม (โชว์แค่ #1100067) ───────────────────────────
  Widget _buildRepairCard(TextTheme textTheme) {
    final List<String> items = repairCase['items'];
    final List<String> tags = repairCase['tags'];

    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      elevation: 0,
      child: InkWell(
        borderRadius: BorderRadius.circular(18),
        onTap: () {
          // TODO: นำทางไปหน้ารายละเอียด Case
        },
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: kGray200),
            boxShadow: [
              BoxShadow(
                color: kNavy.withValues(alpha: 0.06),
                blurRadius: 16,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // แถวที่ 1: รหัส Case + วันที่แจ้ง
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'รหัส Case',
                        style: textTheme.bodySmall?.copyWith(
                          fontSize: 11.5,
                          color: kGray500,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '#${repairCase['id']}',
                        style: textTheme.titleMedium?.copyWith(
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                          color: kNavy,
                        ),
                      ),
                    ],
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        'วันที่แจ้ง',
                        style: textTheme.bodySmall?.copyWith(
                          fontSize: 11.5,
                          color: kGray500,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        repairCase['date'],
                        style: textTheme.bodyMedium?.copyWith(
                          fontSize: 13.5,
                          fontWeight: FontWeight.w600,
                          color: kGray700,
                        ),
                      ),
                    ],
                  ),
                ],
              ),

              Container(
                margin: const EdgeInsets.symmetric(vertical: 14),
                height: 1,
                color: kGray100,
              ),

              // แถวที่ 2: รายการซ่อม + ประเภทงาน
              _infoRow(textTheme, 'รายการซ่อม', items.join(', ')),
              const SizedBox(height: 10),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SizedBox(
                    width: 84,
                    child: Text(
                      'ประเภทงาน',
                      style: textTheme.bodySmall?.copyWith(
                        fontSize: 13,
                        color: kGray500,
                      ),
                    ),
                  ),
                  Expanded(
                    child: Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: tags.map((t) => _tagChip(textTheme, t)).toList(),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 16),

              // แถวที่ 3: badge สถานะ + ลูกศร
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: kPendingBg,
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 7,
                          height: 7,
                          decoration: const BoxDecoration(
                            color: kPendingDot,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          repairCase['statusLabel'],
                          style: textTheme.labelMedium?.copyWith(
                            fontSize: 12.5,
                            fontWeight: FontWeight.w700,
                            color: kPendingFg,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: kGray100,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.chevron_right,
                        size: 20, color: kNavy),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _infoRow(TextTheme textTheme, String key, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 84,
          child: Text(
            key,
            style: textTheme.bodySmall?.copyWith(
              fontSize: 13,
              color: kGray500,
            ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: textTheme.bodyMedium?.copyWith(
              fontSize: 13.5,
              fontWeight: FontWeight.w600,
              color: kGray700,
            ),
          ),
        ),
      ],
    );
  }

  Widget _tagChip(TextTheme textTheme, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: kNavyMid.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(7),
      ),
      child: Text(
        label,
        style: textTheme.labelSmall?.copyWith(
          fontSize: 11.5,
          fontWeight: FontWeight.w600,
          color: kNavyMid,
        ),
      ),
    );
  }

  // ── Empty state (กรณีไม่มีการ์ดตรงกับ filter) ────────────────────
  Widget _buildEmptyState(TextTheme textTheme) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 48),
      child: Column(
        children: [
          const Icon(Icons.search_off, size: 48, color: kGray400),
          const SizedBox(height: 12),
          Text(
            'ไม่พบรายการที่ค้นหา',
            style: textTheme.titleSmall?.copyWith(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: kGray700,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'ลองพิมพ์รหัส Case\nหรือชื่อรายการซ่อมใหม่อีกครั้ง',
            textAlign: TextAlign.center,
            style: textTheme.bodySmall?.copyWith(
              fontSize: 12.5,
              color: kGray500,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }

  // ── FAB "แจ้งซ่อม" ── มุมขวาสุด, capsule เดี่ยว ไม่เต็มความกว้าง (ตาม .fab) ──
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
            color: kNavy.withValues(alpha: 0.4),
            blurRadius: 24,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(999),
          onTap: () {
            // TODO: นำทางไปหน้าแจ้งซ่อม เช่น report_submit
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

  // ── Bottom nav: capsule ทองลอย (ตาม .bottom-nav) ─────────────────
  // หมายเหตุ: ใช้ GestureDetector แทน InkWell/Material โดยตั้งใจ
  // เพื่อไม่ให้เกิด ripple/splash effect ตอนกด — ในเว็บ nav-it ใช้แค่
  // color/background transition ธรรมดา ไม่มี ripple
  Widget _buildBottomNav(TextTheme textTheme, {required double height}) {
    return Container(
      height: height,
      padding: const EdgeInsets.all(6),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [kGoldTabA, kGoldMid, kGoldTabC],
          stops: [0.0, 0.6, 1.0],
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFC8A000).withValues(alpha: 0.12),
            blurRadius: 32,
            offset: const Offset(0, 8),
          ),
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          _navItem(textTheme, icon: Icons.home, label: 'หน้าหลัก', active: true),
          const SizedBox(width: 4),
          _navItem(textTheme, icon: Icons.history, label: 'ประวัติแจ้ง', active: false),
          const SizedBox(width: 4),
          _navItem(textTheme, icon: Icons.person_outline, label: 'โปรไฟล์', active: false),
        ],
      ),
    );
  }

  Widget _navItem(
    TextTheme textTheme, {
    required IconData icon,
    required String label,
    required bool active,
  }) {
    // active: navy บนพื้นขาวโปร่งลอย (.nav-it.active)
    // inactive: navy จางๆ 40% opacity ไม่มีพื้นหลัง (.nav-it)
    final Color color = active ? kNavy : kNavyDark.withValues(alpha: 0.40);

    return Expanded(
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () {
          // TODO: นำทางไปหน้าที่เกี่ยวข้อง (history.html / profile.html)
        },
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          curve: Curves.easeOut,
          decoration: BoxDecoration(
            color: active ? Colors.white.withValues(alpha: 0.60) : Colors.transparent,
            borderRadius: BorderRadius.circular(16),
            boxShadow: active
                ? [
                    BoxShadow(
                      color: const Color(0xFFC8A000).withValues(alpha: 0.22),
                      blurRadius: 10,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : null,
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                active ? _filledVariant(icon) : icon,
                color: color,
                size: 22,
              ),
              const SizedBox(height: 2),
              Text(
                label,
                style: textTheme.labelSmall?.copyWith(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: color,
                  letterSpacing: 0.03,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // แปลง icon outline → filled เมื่อ active (เลียนแบบ font-variation-settings 'FILL' 1 ของเว็บ)
  IconData _filledVariant(IconData icon) {
    if (icon == Icons.home) return Icons.home;
    if (icon == Icons.history) return Icons.history;
    if (icon == Icons.person_outline) return Icons.person;
    return icon;
  }
}