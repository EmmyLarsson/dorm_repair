import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:student_dorm/color/colors.dart';
import 'package:student_dorm/models/evaluation_history_model.dart';
import 'package:student_dorm/models/repair_detail_model.dart' show RepairPhoto;
import 'package:student_dorm/screen/evaluation_screen.dart';
import 'package:student_dorm/utils/app_api.dart';
import 'package:student_dorm/widgets/evaluation_history/evaluation_detail_sheet.dart';
import 'package:student_dorm/widgets/evaluation_history/evaluation_history_card.dart';
import 'package:student_dorm/widgets/evaluation_history/evaluation_history_header.dart';

/* ═══════════════════════════════════════════════════════════
   EvaluationHistoryScreen — STATEFUL
   เหตุผล: เก็บรายการ + searchQuery / sortKey / dateDir และสถานะโหลด/error ที่เปลี่ยนตามการกระทำ
   ของผู้ใช้ในหน้านี้ (โครงเดียวกับ HistoryPage) ส่วนหัว/การ์ด/sheet เป็น Stateless แยกไว้ใน
   lib/widgets/evaluation_history/
   ═══════════════════════════════════════════════════════════ */
class EvaluationHistoryScreen extends StatefulWidget {
  const EvaluationHistoryScreen({super.key});

  @override
  State<EvaluationHistoryScreen> createState() => _EvaluationHistoryScreenState();
}

class _EvaluationHistoryScreenState extends State<EvaluationHistoryScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  String _sortKey = 'date'; // date | rating | type
  String _dateDir = 'desc'; // desc | asc
  String _filterKey = 'all'; // all | success | failed (เคสไม่สำเร็จ = ไม่มีดาว)
  List<EvaluationHistoryItem> _items = [];
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _fetchData();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchData() async {
    try {
      final response = await AppAPI.get('/repair_evaluation/get_all_by_user');
      final Map<String, dynamic> json = jsonDecode(response.body);

      if (!mounted) return;

      if (json['isError'] == true) {
        setState(() {
          _isLoading = false;
          _errorMessage = json['errorMessage'] as String? ?? 'โหลดประวัติการประเมินไม่สำเร็จ';
        });
        return;
      }

      final rows = (json['data'] as List? ?? []);
      setState(() {
        _items = rows.map((e) => EvaluationHistoryItem.fromJson(e as Map<String, dynamic>)).toList();
        _isLoading = false;
        _errorMessage = null;
      });
    } catch (e) {
      // เน็ตหลุด/ตอบกลับไม่ใช่ JSON — ไม่ปล่อยให้หน้าค้างหมุนเงียบๆ
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _errorMessage = 'เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
      });
    }
  }

  List<EvaluationHistoryItem> get _filteredSorted {
    final q = _searchQuery.trim().toLowerCase();
    final list = _items.where((e) {
      if (_filterKey == 'success' && e.isFailed) return false;
      if (_filterKey == 'failed' && !e.isFailed) return false;
      if (q.isEmpty) return true;
      return e.caseCode.toLowerCase().contains(q) ||
          e.feedback.toLowerCase().contains(q) ||
          e.typeLabel.toLowerCase().contains(q);
    }).toList();

    // evaluatedAt เป็น 'YYYY-MM-DD HH:mm:ss' เทียบเป็นสตริงได้ตรงกับลำดับเวลา
    int byDate(EvaluationHistoryItem a, EvaluationHistoryItem b) => a.evaluatedAt.compareTo(b.evaluatedAt);

    switch (_sortKey) {
      case 'date':
        list.sort((a, b) => _dateDir == 'desc' ? byDate(b, a) : byDate(a, b));
        break;
      case 'rating':
        // เคสไม่สำเร็จไม่มีดาว จึงนับเป็น 0 เพื่อเรียงไว้ท้ายสุด (ไม่ใช้ค่านี้แสดงผลที่ไหน)
        list.sort((a, b) {
          final diff = (b.rating ?? 0).compareTo(a.rating ?? 0);
          return diff != 0 ? diff : byDate(b, a);
        });
        break;
      case 'type':
        list.sort((a, b) {
          final diff = a.typeLabel.compareTo(b.typeLabel);
          return diff != 0 ? diff : byDate(b, a);
        });
        break;
    }
    return list;
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

  // ดึงรูปเต็มของรีวิวนี้ก่อนเปิด sheet — ได้ข้อมูลล่าสุดเสมอ (เช่นเพิ่งแก้ไขมา) ไม่ใช้ค่าที่ค้างในรายการ
  Future<List<RepairPhoto>> _fetchPhotos(int requestId) async {
    try {
      final response = await AppAPI.get('/repair_request/$requestId/evaluation');
      final Map<String, dynamic> json = jsonDecode(response.body);
      if (json['isError'] == true || json['data'] == null) return [];

      final data = json['data'] as Map<String, dynamic>;
      return (data['photos'] as List? ?? [])
          .map((e) => RepairPhoto(
                photoId: e['evaluation_photo_id'] as int,
                photoUrl: e['photo_url'] as String? ?? '',
              ))
          .toList();
    } catch (e) {
      return [];
    }
  }

  Future<void> _openDetail(EvaluationHistoryItem item) async {
    final photos = await _fetchPhotos(item.requestId);
    if (!mounted) return;

    final action = await showModalBottomSheet<EvaluationSheetAction>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black.withValues(alpha: 0.5),
      builder: (_) => EvaluationDetailSheet(item: item, photos: photos),
    );
    if (!mounted || action == null) return;

    if (action == EvaluationSheetAction.edit) {
      await _handleEdit(item);
    } else {
      await _handleDelete(item);
    }
  }

  // ใช้หน้าประเมินเดิม (โหมดแก้ไข) — pop(true) เมื่อบันทึกสำเร็จ จึงดึงรายการใหม่ ไม่ให้ค้างค่าเก่า
  Future<void> _handleEdit(EvaluationHistoryItem item) async {
    final didChange = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => EvaluationScreen(requestId: item.requestId, isFailedCase: item.isFailed)),
    );
    if (didChange == true) {
      await _fetchData();
    }
  }

  Future<void> _handleDelete(EvaluationHistoryItem item) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(item.isFailed ? 'ลบเหตุผลนี้?' : 'ลบการประเมินนี้?',
            style: GoogleFonts.sarabun(fontSize: 18, fontWeight: FontWeight.w800)),
        content: Text(
          item.isFailed
              ? 'ลบแล้วจะระบุเหตุผลใหม่ได้อีกครั้ง รูปที่แนบไว้จะถูกลบด้วย'
              : 'ลบแล้วจะสามารถประเมินใหม่ได้อีกครั้ง รูปที่แนบไว้จะถูกลบด้วย',
          style: GoogleFonts.sarabun(fontSize: 14, color: kGray500, height: 1.6),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text('ยกเลิก', style: GoogleFonts.sarabun(fontWeight: FontWeight.w700, color: kNavyMid)),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text('ลบ', style: GoogleFonts.sarabun(fontWeight: FontWeight.w700, color: kRsError)),
          ),
        ],
      ),
    );
    if (confirmed != true) return;

    try {
      final response = await AppAPI.post('/repair_request/evaluation/delete', {'request_id': item.requestId});
      final Map<String, dynamic> json = jsonDecode(response.body);

      if (!mounted) return;

      if (json['isError'] == true) {
        _showToast(json['errorMessage'] as String? ?? 'ลบไม่สำเร็จ', isWarn: true);
        return;
      }
    } catch (e) {
      if (!mounted) return;
      _showToast('ลบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', isWarn: true);
      return;
    }

    _showToast(item.isFailed ? 'ลบเหตุผลแล้ว' : 'ลบการประเมินแล้ว');
    await _fetchData();
  }

  void _showToast(String message, {bool isWarn = false}) {
    ScaffoldMessenger.of(context).clearSnackBars();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        backgroundColor: const Color(0xFF2A2C2E),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        margin: const EdgeInsets.only(bottom: 84, left: 40, right: 40),
        duration: const Duration(seconds: 3),
        content: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(isWarn ? Icons.warning_amber_rounded : Icons.info_outline, size: 17, color: kRsGold),
            const SizedBox(width: 8),
            Flexible(
              child: Text(
                message,
                style: GoogleFonts.sarabun(fontSize: 13, fontWeight: FontWeight.w500, color: const Color(0xFFF0F0F3)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final list = _filteredSorted;

    return Scaffold(
      backgroundColor: kGray100,
      body: Column(
        children: [
          EvaluationHistoryHeader(
            total: _items.length,
            searchController: _searchController,
            onSearchChanged: (value) => setState(() => _searchQuery = value),
            onClearSearch: () {
              _searchController.clear();
              setState(() => _searchQuery = '');
            },
            showClear: _searchQuery.isNotEmpty,
            sortKey: _sortKey,
            dateDir: _dateDir,
            onChipTap: _onChipTap,
            filterKey: _filterKey,
            onFilterTap: (key) => setState(() => _filterKey = key),
            onBack: () => Navigator.of(context).maybePop(),
          ),
          Expanded(child: _buildBody(list)),
        ],
      ),
    );
  }

  Widget _buildBody(List<EvaluationHistoryItem> list) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_errorMessage != null) {
      return _MessageState(
        icon: Icons.cloud_off,
        title: 'โหลดไม่สำเร็จ',
        message: _errorMessage!,
        actionLabel: 'ลองใหม่',
        onAction: () {
          setState(() {
            _isLoading = true;
            _errorMessage = null;
          });
          _fetchData();
        },
      );
    }

    if (_items.isEmpty) {
      return const _MessageState(
        icon: Icons.rate_review_outlined,
        title: 'ยังไม่มีประวัติการประเมิน',
        message: 'เมื่องานซ่อมสำเร็จ คุณสามารถให้คะแนนได้จากหน้ารายละเอียดงาน',
      );
    }

    if (list.isEmpty) {
      return const _MessageState(
        icon: Icons.search_off,
        title: 'ไม่พบรายการที่ค้นหา',
        message: 'ลองพิมพ์รหัส Case หรือคำในรีวิวใหม่ หรือเปลี่ยนตัวกรองด้านบน',
      );
    }

    return RefreshIndicator(
      onRefresh: _fetchData,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 20, 16, 100),
        children: [
          Padding(
            padding: const EdgeInsets.only(bottom: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('รายการทั้งหมด',
                    style: GoogleFonts.sarabun(fontSize: 17, fontWeight: FontWeight.w700, color: kNavy)),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 3),
                  decoration: BoxDecoration(color: kNavyLight, borderRadius: BorderRadius.circular(999)),
                  child: Text('${list.length}',
                      style: GoogleFonts.sarabun(fontSize: 12, fontWeight: FontWeight.w700, color: kNavyMid)),
                ),
              ],
            ),
          ),
          ...list.map((item) => EvaluationHistoryCard(item: item, onTap: () => _openDetail(item))),
        ],
      ),
    );
  }
}

/* ═══════════════════════════════════════════════════════════
   _MessageState — STATELESS (ว่าง / ค้นหาไม่พบ / error ใช้โครงเดียวกัน)
   ═══════════════════════════════════════════════════════════ */
class _MessageState extends StatelessWidget {
  const _MessageState({
    required this.icon,
    required this.title,
    required this.message,
    this.actionLabel,
    this.onAction,
  });

  final IconData icon;
  final String title;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 56),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 72, color: const Color(0xFFD1D5DB)),
            const SizedBox(height: 14),
            Text(title,
                style: GoogleFonts.sarabun(fontSize: 16, fontWeight: FontWeight.w700, color: const Color(0xFF6B7280))),
            const SizedBox(height: 6),
            Text(message,
                textAlign: TextAlign.center,
                style: GoogleFonts.sarabun(fontSize: 13.5, color: const Color(0xFF9CA3AF))),
            if (actionLabel != null) ...[
              const SizedBox(height: 16),
              FilledButton(
                style: FilledButton.styleFrom(backgroundColor: kRsNavyMid),
                onPressed: onAction,
                child: Text(actionLabel!, style: GoogleFonts.sarabun(fontWeight: FontWeight.w700)),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
