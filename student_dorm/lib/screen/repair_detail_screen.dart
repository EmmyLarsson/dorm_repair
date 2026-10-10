import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show Clipboard, ClipboardData;
import 'package:google_fonts/google_fonts.dart';
import 'package:student_dorm/color/colors.dart';
import 'package:student_dorm/models/repair_detail_model.dart' show RepairDetail, RepairPhoto, RepairCompletionItem, TimelineStep;
import 'package:student_dorm/utils/app_api.dart';
import 'package:student_dorm/widgets/repair_detail/repair_stepper.dart';
import 'package:student_dorm/widgets/repair_detail/repair_timeline.dart';
import 'package:student_dorm/widgets/repair_detail/rush_dialog.dart';
import 'package:student_dorm/widgets/repair_detail/request_detail_modal.dart';
import 'package:student_dorm/screen/report_submit_screen.dart';
import 'package:student_dorm/screen/evaluation_screen.dart';
import 'package:student_dorm/screen/repair_complaint_screen.dart';
import 'package:student_dorm/widgets/repair_detail/complaint_detail_modal.dart';

/// สรุปคำร้องแจ้งแก้ไข 1 รายการ (เอาไว้เช็คว่าเคสมีคำร้องค้าง 'pending' อยู่ไหม
/// และนับจำนวนคำร้องทั้งหมดเพื่อจำกัดสิทธิ์ยื่นคำร้องซ้ำเกิน 2 ครั้ง)
class _ComplaintInfo {
  final int complaintId;
  final String decision;
  final String complaintText;
  final List<String> photoUrls;
  final bool alreadyEdited;
  final String? filedAt;
  // เคสเก่าก่อนมีฟีเจอร์เลือกหมวดหมู่เหตุผลจะเป็น null ทั้งคู่ (LEFT JOIN ฝั่ง backend กับตาราง complaint_reason)
  final int? reasonCategoryId;
  final String? reasonCategoryName;
  // เคสเก่าก่อนมีฟีเจอร์นี้จะเป็น null (ไม่รู้ค่า) — ต่างจาก false (เลือก "ไม่อนุญาต" จริงๆ)
  final bool? allowEntry;

  const _ComplaintInfo({
    required this.complaintId,
    required this.decision,
    required this.complaintText,
    required this.photoUrls,
    required this.alreadyEdited,
    required this.filedAt,
    required this.reasonCategoryId,
    required this.reasonCategoryName,
    required this.allowEntry,
  });

  factory _ComplaintInfo.fromJson(Map<String, dynamic> json) {
    final rawPhotos = json['photos'] as List? ?? [];
    final rawAllowEntry = json['allow_entry'];
    return _ComplaintInfo(
      complaintId: json['complaint_id'] as int,
      decision: json['decision'] as String? ?? 'pending',
      complaintText: json['complaint_text'] as String? ?? '',
      photoUrls: rawPhotos.map((p) => p['photo_url'] as String).toList(),
      alreadyEdited: json['edited_at'] != null,
      filedAt: json['filed_at'] as String?,
      allowEntry: rawAllowEntry == null ? null : rawAllowEntry == 1,
      reasonCategoryId: json['complaint_reason_id'] as int?,
      reasonCategoryName: json['complaint_reason_name'] as String?,
    );
  }
}

/* ══════════════════════════════════════════
   SCREEN
   ══════════════════════════════════════════ */
class CaseStatusScreen extends StatefulWidget {
  final int requestId;
  // เปิดมาจากการกดแจ้งเตือน: ให้เลื่อนไปที่ขั้นนั้นในไทม์ไลน์แล้วเน้นสีสั้นๆ (ขั้นเดียวกับที่แจ้งเตือนพูดถึง จับคู่ด้วย
  // รหัสขั้น + เวลาเหตุการณ์) — ไม่ส่งมา = เปิดหน้าตามปกติ
  final String? focusStepCode;
  final String? focusEventDate;

  const CaseStatusScreen({super.key, required this.requestId, this.focusStepCode, this.focusEventDate});

  @override
  State<CaseStatusScreen> createState() => _CaseStatusScreenState();
}

class _CaseStatusScreenState extends State<CaseStatusScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  RepairDetail? _detail;
  List<TimelineStep> _timeline = [];
  List<RepairPhoto> _photos = [];
  // รายงานผลซ่อมของทุกรอบ (0 = รายงานการซ่อม, 1-2 = รายงานการแก้ไข) — แสดงในไทม์ไลน์ตรงจุดที่ "ส่งงาน"
  // เกิดขึ้นจริงของแต่ละรอบ (ดู _buildStepCard เคส 'completed') ไม่มีการ์ดสรุปแยกต่างหากอีกแล้ว
  List<RepairCompletionItem> _allCompletionItems = [];
  List<_ComplaintInfo> _complaints = [];
  Timer? _pollTimer;

  // เลื่อน+เน้นขั้นที่มาจากแจ้งเตือน ทำครั้งเดียวหลังโหลดข้อมูลครั้งแรก (poll ทุก 5 วินาทีต้องไม่เลื่อนซ้ำจนผู้ใช้เลื่อนเองไม่ได้)
  final GlobalKey _focusKey = GlobalKey();
  late bool _focusPending = widget.focusStepCode != null;
  bool _highlightFocus = false;
  Timer? _highlightTimer;

  bool _isFocusStep(TimelineStep step) =>
      widget.focusStepCode != null &&
      step.stepCode == widget.focusStepCode &&
      (widget.focusEventDate == null || step.eventDate == widget.focusEventDate);

  void _scheduleFocus() {
    if (!_focusPending || !_timeline.any(_isFocusStep)) return;
    _focusPending = false;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final focusContext = _focusKey.currentContext;
      if (!mounted || focusContext == null) return;
      Scrollable.ensureVisible(focusContext, duration: const Duration(milliseconds: 450), alignment: 0.15, curve: Curves.easeOut);
      setState(() => _highlightFocus = true);
      _highlightTimer?.cancel();
      _highlightTimer = Timer(const Duration(milliseconds: 2800), () {
        if (mounted) setState(() => _highlightFocus = false);
      });
    });
  }

  // ตรงกับ btnCopy.classList.add('copied') — คุมว่าไอคอน copy เปลี่ยนเป็น
  // check ชั่วคราวหรือไม่
  bool _phoneCopied = false;
  bool _moderatorPhoneCopied = false;
  bool _isAccepting = false;
  bool _isDeclining = false;

  bool get _hasPendingComplaint => _complaints.any((c) => c.decision == 'pending');

  // เจ้าหน้าที่เริ่มตรวจสอบคำร้องที่ค้างอยู่แล้วหรือยัง = การ์ด complaint_reviewing อยู่หลังการ์ด
  // complaint_filed ล่าสุด (ถ้าเริ่มตรวจแล้วนักศึกษาแก้คำร้องไม่ได้อีก — backend เช็คซ้ำอีกชั้น)
  bool get _isComplaintUnderReview {
    final lastFiled = _timeline.lastIndexWhere((s) => s.stepCode == 'complaint_filed');
    final lastReviewing = _timeline.lastIndexWhere((s) => s.stepCode == 'complaint_reviewing');
    return lastReviewing > lastFiled;
  }

  @override
  void initState() {
    super.initState();
    _markSeen();
    _fetchData();
    // อัปเดต timeline อัตโนมัติ (เจ้าหน้าที่กด "ดูเพิ่มเติม"/อนุมัติ/ฯลฯ ฝั่ง React
    // ต้องขึ้นในหน้านี้โดยไม่ต้องให้ผู้ใช้รีเฟรชเอง)
    _pollTimer = Timer.periodic(const Duration(seconds: 5), (_) => _fetchData(silent: true));
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _highlightTimer?.cancel();
    // เรียกอีกครั้งตอนปิดหน้า: ระหว่างที่หน้านี้เปิดอยู่ เจ้าหน้าที่อาจอัปเดตเคส (เห็นผ่าน poll 5 วิ อยู่แล้ว)
    // ถ้าไม่ล้างตอนปิด จุดแดงจะโผล่ทั้งที่นักศึกษาเพิ่งเห็นอัปเดตนั้นไปแล้ว
    _markSeen();
    super.dispose();
  }

  // ล้างจุดแดง "มีอัปเดตใหม่" ของเคสนี้ — ผิดพลาดแล้วไม่ต้องรบกวนผู้ใช้ (แค่จุดแดงไม่หาย รอบหน้าลองใหม่)
  Future<void> _markSeen() async {
    try {
      await AppAPI.post('/repair_request/mark_seen', {'request_id': widget.requestId});
    } catch (_) {}
  }

  Future<void> _fetchData({bool silent = false}) async {
    if (!silent) {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
      });
    }

    try {
      final responses = await Future.wait([
        AppAPI.get('/repair_request/get_by_id/${widget.requestId}'),
        AppAPI.get('/repair_request/get_timeline/${widget.requestId}'),
        AppAPI.get('/repair_request/${widget.requestId}/photos'),
        AppAPI.get('/repair_request/${widget.requestId}/completion_items'),
        AppAPI.get('/repair_request/${widget.requestId}/complaints'),
      ]);

      final detailJson = jsonDecode(responses[0].body);
      final timelineJson = jsonDecode(responses[1].body);
      final photosJson = jsonDecode(responses[2].body);
      final completionItemsJson = jsonDecode(responses[3].body);
      final complaintsJson = jsonDecode(responses[4].body);

      if (detailJson['isError'] == true || detailJson['data'] == null) {
        if (silent) return;
        setState(() {
          _isLoading = false;
          _errorMessage = detailJson['errorMessage'] as String? ?? 'ไม่พบข้อมูลคำร้อง';
        });
        return;
      }

      final timelineData = (timelineJson['data'] as List? ?? [])
          .map((e) => TimelineStep.fromJson(e as Map<String, dynamic>))
          .toList();

      // เช็ค isError ก่อน cast เป็น List เสมอ — ถ้า error, data จะเป็น "" ไม่ใช่ List
      // (cast ตรงๆ จะ throw แล้วทำให้ _detail/_timeline ที่ fetch สำเร็จค้างไม่ update ไปด้วย)
      final photosData = photosJson['isError'] == true
          ? <RepairPhoto>[]
          : (photosJson['data'] as List? ?? [])
              .map((e) => RepairPhoto.fromJson(e as Map<String, dynamic>))
              .toList();

      final completionItemsData = completionItemsJson['isError'] == true
          ? <RepairCompletionItem>[]
          : (completionItemsJson['data'] as List? ?? [])
              .map((e) => RepairCompletionItem.fromJson(e as Map<String, dynamic>))
              .toList();

      final complaintsData = complaintsJson['isError'] == true
          ? <_ComplaintInfo>[]
          : (complaintsJson['data'] as List? ?? [])
              .map((e) => _ComplaintInfo.fromJson(e as Map<String, dynamic>))
              .toList();

      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _errorMessage = null;
        _detail = RepairDetail.fromJson(detailJson['data'] as Map<String, dynamic>);
        _timeline = timelineData;
        _photos = photosData;
        _allCompletionItems = completionItemsData;
        _complaints = complaintsData;
      });
      _scheduleFocus();
    } catch (e) {
      if (silent) return;
      setState(() {
        _isLoading = false;
        _errorMessage = 'ไม่สามารถโหลดข้อมูลได้';
      });
    }
  }

  // ยอมรับผลซ่อมปิดเคสเป็น "สำเร็จ" ย้อนกลับไม่ได้ จึงถามยืนยันก่อน (รูปแบบเดียวกับป๊อปอัปยกเลิกคำร้อง)
  Future<void> _acceptCompletion() async {
    final bool? confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
        title: Row(
          children: [
            const Icon(Icons.check_circle_outline, color: kGreenDark),
            const SizedBox(width: 8),
            Text('ยืนยันผลการซ่อม?', style: GoogleFonts.sarabun(fontSize: 17, fontWeight: FontWeight.w700, color: kNavy)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'งานซ่อมนี้จะถูกปิดเป็น "สำเร็จ" หลังจากนั้นคุณประเมินงานซ่อมต่อได้',
              style: GoogleFonts.sarabun(fontSize: 13, color: kGray500, height: 1.5),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: kGreen.withValues(alpha: 0.14), borderRadius: BorderRadius.circular(10)),
              child: Text(
                'ยืนยันแล้วย้อนกลับไม่ได้',
                style: GoogleFonts.sarabun(fontSize: 12, color: kDone, fontWeight: FontWeight.w600, height: 1.5),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: Text('ยกเลิก', style: GoogleFonts.sarabun(fontWeight: FontWeight.w700, color: kGray500)),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            style: FilledButton.styleFrom(backgroundColor: kGreenDark),
            child: Text('ยอมรับ', style: GoogleFonts.sarabun(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    setState(() {
      _isAccepting = true;
    });

    final response = await AppAPI.post('/repair_request/accept_completion', {
      'request_id': widget.requestId,
    });
    final Map<String, dynamic> json = jsonDecode(response.body);

    if (!mounted) return;
    setState(() {
      _isAccepting = false;
    });

    if (json['isError'] == true) {
      _showToast(json['errorMessage'] as String? ?? 'ยืนยันไม่สำเร็จ');
      return;
    }

    _showToast('ยืนยันผลการซ่อมเรียบร้อยแล้ว');
    await _fetchData();
  }

  // ยกเลิกคำร้องเอง (ก่อนเจ้าหน้าที่อนุมัติ) — ป๊อปอัปยืนยันกลางจอ เหตุผลไม่บังคับ ไม่เกิน 500 ตัวอักษร สำเร็จแล้วโหลดใหม่
  // เคสจะเปลี่ยนเป็น "ถูกยกเลิก" และไทม์ไลน์ขึ้น "คุณยกเลิกคำร้องนี้"; backend ตรวจซ้ำว่ายังเป็นสถานะรอตรวจสอบอยู่จริง
  Future<void> _cancelRequest() async {
    final reasonController = TextEditingController();
    final bool? confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
        title: Row(
          children: [
            const Icon(Icons.delete_outline, color: kRsError),
            const SizedBox(width: 8),
            Text('ยกเลิกคำร้องนี้?', style: GoogleFonts.sarabun(fontSize: 17, fontWeight: FontWeight.w700, color: kNavy)),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'คำร้อง #${_detail?.caseCode ?? ''} จะถูกยกเลิกและจะไม่ดำเนินการต่อ',
                style: GoogleFonts.sarabun(fontSize: 13, color: kGray500, height: 1.5),
              ),
              const SizedBox(height: 12),
              Text('เหตุผล (ไม่บังคับ)', style: GoogleFonts.sarabun(fontSize: 12, fontWeight: FontWeight.w700, color: kGray700)),
              const SizedBox(height: 5),
              TextField(
                controller: reasonController,
                maxLength: 500,
                maxLines: 3,
                // Sarabun เสมอ เพราะช่องนี้พิมพ์ภาษาไทย (กฎโปรเจกต์ ห้ามใช้ฟอนต์ละตินล้วน)
                style: GoogleFonts.sarabun(fontSize: 14, color: kGray700),
                decoration: InputDecoration(
                  hintText: 'เช่น แก้ไขเองได้แล้ว หรือแจ้งผิดห้อง...',
                  hintStyle: GoogleFonts.sarabun(fontSize: 13, color: kGray400),
                  border: const OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(color: kAmber.withValues(alpha: 0.16), borderRadius: BorderRadius.circular(10)),
                child: Text(
                  'ยกเลิกแล้วย้อนกลับไม่ได้ ต้องแจ้งซ่อมใหม่หากยังต้องการซ่อม',
                  style: GoogleFonts.sarabun(fontSize: 12, color: kAmberDark, fontWeight: FontWeight.w600, height: 1.5),
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: Text('ไม่ยกเลิก', style: GoogleFonts.sarabun(fontWeight: FontWeight.w700, color: kGray500)),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            style: FilledButton.styleFrom(backgroundColor: kRsError),
            child: Text('ยืนยันยกเลิก', style: GoogleFonts.sarabun(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
    final reason = reasonController.text.trim();
    reasonController.dispose();
    if (confirmed != true || !mounted) return;

    final response = await AppAPI.post('/repair_request/cancel_by_student', {
      'request_id': widget.requestId,
      'reason': reason,
    });
    final Map<String, dynamic> json = jsonDecode(response.body);

    if (!mounted) return;
    if (json['isError'] == true) {
      _showToast(json['errorMessage'] as String? ?? 'ยกเลิกคำร้องไม่สำเร็จ');
      await _fetchData(silent: true);
      return;
    }

    _showToast('ยกเลิกคำร้องเรียบร้อยแล้ว');
    await _fetchData(silent: true);
  }

  // เร่งการจัดการงาน — เปิดป๊อปอัปให้เลือกเหตุผลก่อน (บังคับ) แล้วส่งให้ backend ตรวจเงื่อนไขซ้ำอีกชั้น
  // (เลยช่วงนัด/สถานะ/รอบ 24 ชม.) สำเร็จแล้วโหลดใหม่เพื่อให้ปุ่มเปลี่ยนเป็น "เร่งแล้ว" พร้อมเวลาที่กดได้อีกครั้ง
  Future<void> _rushRequest() async {
    final input = await showRushDialog(context);
    if (input == null || !mounted) return;

    final response = await AppAPI.post('/repair_request/rush', {
      'request_id': widget.requestId,
      'reason_id': input.reasonId,
      'reason_note': input.note,
    });
    final Map<String, dynamic> json = jsonDecode(response.body);

    if (!mounted) return;
    if (json['isError'] == true) {
      _showToast(json['errorMessage'] as String? ?? 'ส่งคำขอเร่งงานไม่สำเร็จ');
      await _fetchData(silent: true);
      return;
    }

    _showToast(json['data']['message'] as String? ?? 'ส่งคำขอเร่งงานแล้ว');
    await _fetchData(silent: true);
  }

  // "ไม่ยอมรับ" ผลซ่อม — โผล่เฉพาะตอนยื่นคำร้องครบสิทธิ์แล้ว (backend ตรวจซ้ำ) เคสจะปิดเป็น "ซ่อมไม่สำเร็จ"
  // ย้อนกลับไม่ได้ จึงถามยืนยันก่อน แล้วปิดเคสทันที ส่วนเหตุผล/รูปให้ส่งทีหลังในหน้าประเมินแบบไม่มีดาว (บังคับเหตุผล)
  // เหมือนที่งานสำเร็จปิดเคสก่อนแล้วค่อยกดปุ่มประเมิน — งานที่ "ไม่สำเร็จ" ไม่ควรถูกให้คะแนนความพอใจ
  // แบบเดียวกับงานที่เสร็จเรียบร้อย
  Future<void> _declineCompletion() async {
    final bool? confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
        title: Row(
          children: [
            const Icon(Icons.cancel_outlined, color: kRsError),
            const SizedBox(width: 8),
            Text('ไม่ยอมรับผลการซ่อม?', style: GoogleFonts.sarabun(fontSize: 17, fontWeight: FontWeight.w700, color: kNavy)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'งานซ่อมนี้จะถูกปิดเป็น "ซ่อมไม่สำเร็จ" หลังจากนั้นคุณระบุเหตุผลต่อได้',
              style: GoogleFonts.sarabun(fontSize: 13, color: kGray500, height: 1.5),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: kAmber.withValues(alpha: 0.16), borderRadius: BorderRadius.circular(10)),
              child: Text(
                'ยืนยันแล้วย้อนกลับไม่ได้',
                style: GoogleFonts.sarabun(fontSize: 12, color: kAmberDark, fontWeight: FontWeight.w600, height: 1.5),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: Text('ยกเลิก', style: GoogleFonts.sarabun(fontWeight: FontWeight.w700, color: kGray500)),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            style: FilledButton.styleFrom(backgroundColor: kRsError),
            child: Text('ไม่ยอมรับ', style: GoogleFonts.sarabun(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    setState(() {
      _isDeclining = true;
    });

    final response = await AppAPI.post('/repair_request/decline_completion', {
      'request_id': widget.requestId,
    });
    final Map<String, dynamic> json = jsonDecode(response.body);

    if (!mounted) return;
    setState(() {
      _isDeclining = false;
    });

    if (json['isError'] == true) {
      _showToast(json['errorMessage'] as String? ?? 'ดำเนินการไม่สำเร็จ');
      return;
    }

    _showToast('บันทึกว่าไม่ยอมรับผลการซ่อมแล้ว');
    await _fetchData();
  }

  Future<void> _openComplaintScreen() async {
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => RepairComplaintScreen(requestId: widget.requestId)),
    );

    if (!mounted) return;
    await _fetchData();
  }

  Future<void> _openEditComplaintScreen(_ComplaintInfo complaint) async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => RepairComplaintScreen(
          requestId: widget.requestId,
          editComplaintId: complaint.complaintId,
          initialText: complaint.complaintText,
          initialPhotoUrls: complaint.photoUrls,
          initialReasonId: complaint.reasonCategoryId,
          initialAllowEntry: complaint.allowEntry,
        ),
      ),
    );

    if (!mounted) return;
    await _fetchData();
  }

  // isFailedCase = เคส "ซ่อมไม่สำเร็จ" (8): หน้าเดียวกับประเมินแต่ไม่มีดาว บังคับกรอกเหตุผล
  Future<void> _openEvaluationScreen({bool isFailedCase = false}) async {
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => EvaluationScreen(requestId: widget.requestId, isFailedCase: isFailedCase)),
    );
  }

  Future<void> _onEditPressed(int requestId) async {
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => ReportSubmitScreen(requestId: requestId)),
    );

    if (!mounted) return;
    await _fetchData();

    // เปิด modal รายละเอียดกลับขึ้นมาอัตโนมัติด้วยข้อมูลที่ fetch มาใหม่ล่าสุด
    // (modal เดิมถูกปิดไปตอนกดปุ่ม "แก้ไข" — ผู้ใช้คาดหวังว่ามันจะ "ค้างอยู่แล้วอัปเดตเอง")
    if (!mounted || _detail == null) return;
    showRequestDetailModal(
      context,
      _detail!,
      requestId: widget.requestId,
      photos: _photos,
      onEditPressed: _onEditPressed,
      onCancelPressed: (_) => _cancelRequest(),
    );
  }

  Future<void> _copyPhoneNumber(String phone) async {
    await Clipboard.setData(ClipboardData(text: phone));
    setState(() => _phoneCopied = true);
    _showToast('คัดลอกเบอร์โทรแล้ว');

    Future.delayed(const Duration(milliseconds: 2200), () {
      if (mounted) setState(() => _phoneCopied = false);
    });
  }

  Future<void> _copyModeratorPhone(String phone) async {
    await Clipboard.setData(ClipboardData(text: phone));
    setState(() => _moderatorPhoneCopied = true);
    _showToast('คัดลอกเบอร์เจ้าหน้าที่แล้ว');

    Future.delayed(const Duration(milliseconds: 2200), () {
      if (mounted) setState(() => _moderatorPhoneCopied = false);
    });
  }

  void _showToast(String message) {
    ScaffoldMessenger.of(context).clearSnackBars();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13)),
        backgroundColor: kText,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
        duration: const Duration(milliseconds: 2500),
        margin: const EdgeInsets.only(bottom: 108, left: 60, right: 60),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTextStyle.merge(
      style: GoogleFonts.sarabun(),
      child: Scaffold(
      backgroundColor: kGray100,
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _errorMessage != null
                ? _ErrorState(message: _errorMessage!, onRetry: _fetchData)
                : SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        _buildHeader(context, _detail!),
                        _buildMainContent(_detail!, _timeline),
                      ],
                    ),
                  ),
      ),
      ),
    );
  }

  // ── Header: ปุ่มย้อนกลับ + ชื่อเรื่อง + status badge + stepper ──
  Widget _buildHeader(BuildContext context, RepairDetail detail) {
    final badge = _statusBadge(detail.statusId, detail.statusName);

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [kRsGold, kRsGoldLight],
        ),
        borderRadius: const BorderRadius.only(
          bottomLeft: Radius.circular(28),
          bottomRight: Radius.circular(28),
        ),
        boxShadow: [
          BoxShadow(
            color: kRsGoldText.withValues(alpha: 0.18),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 480),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.only(bottom: 32),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Material(
                      color: Colors.black.withValues(alpha: 0.10),
                      shape: const CircleBorder(),
                      child: InkWell(
                        customBorder: const CircleBorder(),
                        onTap: () => Navigator.of(context).maybePop(),
                        child: const SizedBox(
                          width: 40,
                          height: 40,
                          child: Icon(Icons.arrow_back_ios_new, size: 18, color: kText),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.only(top: 0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'ติดตามงานซ่อม',
                            style: GoogleFonts.sarabun(
                              fontSize: 20,
                              fontWeight: FontWeight.w800,
                              color: kRsOnPrimary,
                              letterSpacing: -0.3,
                              height: 1.2,
                            ),
                          ),
                          const SizedBox(height: 4),
                          _HeaderSub(caseCode: detail.caseCode),
                        ],
                      ),
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 5),
                    decoration: BoxDecoration(
                      color: badge.$2.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      badge.$1,
                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: badge.$3),
                    ),
                  ),
                ],
              ),
            ),
            RepairStepper(detail: detail, timeline: _timeline),
          ],
        ),
      ),
    );
  }

  // ── Main content: section label + timeline ──
  Widget _buildMainContent(RepairDetail detail, List<TimelineStep> timeline) {
    // หา 'appointment' entry "ตัวแรก" ของแต่ละรอบ (ไว้แยกชื่อการ์ด "นัดหมาย" กับ "เลื่อนนัดหมาย") และ "ล่าสุด" ของทั้งเคส —
    // ตัวล่าสุดคือตัวที่ยังใช้งานจริง (อาจไม่ใช่ event ล่าสุดสุด ถ้ามี step อื่นเกิดขึ้นทีหลัง เช่น 'completed')
    // การ์ดนัดหมายที่เคยถูกเลื่อน/แทนที่ไปแล้วโชว์ทุกใบเป็นประวัติ เพื่อให้เห็นว่าเคยนัดและเลื่อนมากี่ครั้ง
    // แยกเป็น "รอบ": รอบ 0 = นัดหมายซ่อมครั้งแรก, รอบ 1+ = นัดหมายรอบแก้ไข (นับจำนวน complaint_approved
    // ที่เกิดก่อนหน้านัดหมายนั้น)
    final Map<TimelineStep, int> appointmentRoundOf = {};
    final Map<int, TimelineStep> firstAppointmentOfRound = {};
    // ส่งงานหลายครั้งในรอบเดียว (เช่น กดส่งซ้ำตอนแก้ไขรายงาน) เก็บแค่ใบล่าสุดของแต่ละรอบ กันการ์ดซ้ำ
    final Map<int, TimelineStep> latestCompletedOfRound = {};
    TimelineStep? latestAppointmentStep;
    int currentRound = 0;
    for (final step in timeline) {
      if (step.stepCode == 'complaint_approved') {
        currentRound++;
      } else if (step.stepCode == 'completed') {
        appointmentRoundOf[step] = currentRound;
        latestCompletedOfRound[currentRound] = step;
      } else if (step.stepCode == 'appointment') {
        appointmentRoundOf[step] = currentRound;
        firstAppointmentOfRound.putIfAbsent(currentRound, () => step);
        latestAppointmentStep = step;
      }
    }

    // ซ่อนการ์ด 'completed' ออกจาก timeline ไปเลย — ข้อมูลซ้ำกับการ์ดสรุปผลซ่อมที่โชว์อยู่ด้านบนสุดของ
    // หน้าแล้ว (ตอนสถานะ 3/6) และการโชว์การ์ดนี้ตอนสถานะ 3 (รอนักศึกษายืนยัน) ทำให้ดูเหมือนงาน "จบแล้ว"
    // ทั้งที่ยังไม่ได้กดยอมรับ — ให้การ์ด 'accepted' (โผล่ตอนกดยอมรับจริงเท่านั้น) เป็นตัวแทน "จบสมบูรณ์" แทน
    final filteredTimeline = timeline.where((step) {
      // ทุกรอบ "ส่งงาน" ขึ้น timeline ตามลำดับเวลาจริง รวมรอบแรกด้วย (เดิมซ่อนรอบแรกไว้เพราะการ์ดสรุปด้านบน
      // โชว์อยู่แล้ว ตอนนี้การ์ดสรุปด้านบนไม่โชว์รายงานอีกต่อไป — timeline จึงเป็นที่เดียวที่ดูรายงานได้)
      // ส่งงานซ้ำในรอบเดียวกัน (เช่น กดส่งซ้ำตอนแก้ไขรายงาน) เก็บแค่ใบล่าสุดของรอบนั้น กันการ์ดซ้ำ
      if (step.stepCode == 'completed') {
        final round = appointmentRoundOf[step] ?? 0;
        return identical(step, latestCompletedOfRound[round]);
      }
      return true;
    }).toList();

    // เรียงใหม่ → เก่า (การ์ดล่าสุดอยู่บนสุด)
    final ordered = filteredTimeline.reversed.toList();

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 28, 16, 100),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 480),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (detail.statusId == 3 || detail.statusId == 6 || detail.statusId == 7 || detail.statusId == 8) ...[
              _buildCompletionSummaryCard(detail),
              const SizedBox(height: 22),
            ],
            const Padding(
              padding: EdgeInsets.only(left: 2, bottom: 22),
              child: Text(
                'ไทม์ไลน์ความคืบหน้า',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 1.1,
                  color: kTextMuted,
                ),
              ),
            ),
            if (ordered.isEmpty)
              const EmptyTimeline()
            else
              for (int i = 0; i < ordered.length; i++)
                _buildTimelineItem(
                  step: ordered[i],
                  detail: detail,
                  isLatest: i == 0,
                  isLast: i == ordered.length - 1,
                  isLatestAppointment: identical(ordered[i], latestAppointmentStep),
                  appointmentRound: appointmentRoundOf[ordered[i]] ?? 0,
                  isRescheduleInRound: ordered[i].stepCode == 'appointment' &&
                      !identical(ordered[i], firstAppointmentOfRound[appointmentRoundOf[ordered[i]]]),
                ),
          ],
        ),
      ),
    );
  }

  // ── การ์ดสรุปผลการซ่อม (โผล่เฉพาะสถานะ "เสร็จสิ้น"(3) รอยืนยัน, "รอตรวจสอบคำร้อง"(7) ระหว่างยื่น
  // อุทธรณ์ กับ "สำเร็จ"(6)) ──
  Widget _buildCompletionSummaryCard(RepairDetail detail) {
    final bool isAwaitingConfirmation = detail.statusId == 3 || detail.statusId == 7;
    // 8 = ซ่อมไม่สำเร็จ (นักศึกษาไม่ยอมรับหลังยื่นคำร้องครบสิทธิ์) — มีปุ่มระบุเหตุผล (หน้าประเมินแบบไม่มีดาว) เท่านั้น
    final bool isRepairFailed = detail.statusId == 8;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(kRadiusLg),
        border: Border.all(color: kGreen.withValues(alpha: 0.3), width: 1.5),
        boxShadow: [BoxShadow(color: kGreen.withValues(alpha: 0.1), blurRadius: 22, offset: const Offset(0, 4))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 10),
            decoration: BoxDecoration(
              color: kGreen.withValues(alpha: 0.06),
              border: const Border(bottom: BorderSide(color: kGray200)),
            ),
            child: Row(
              children: [
                Icon(
                  isRepairFailed ? Icons.cancel : (isAwaitingConfirmation ? Icons.task_alt : Icons.verified),
                  size: 20,
                  color: isRepairFailed ? kRsError : kGreenDark,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    isRepairFailed
                        ? 'งานซ่อมไม่สำเร็จ'
                        : (isAwaitingConfirmation ? 'งานซ่อมเสร็จสิ้น รอการยืนยันจากคุณ' : 'งานซ่อมสำเร็จ'),
                    style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: kText),
                  ),
                ),
              ],
            ),
          ),
          // สถานะ 8 (ซ่อมไม่สำเร็จ) ไม่มีปุ่มให้กดต่อแล้ว (เคสปิดจบ) แต่ยังต้องมีข้อความบอกไว้ ไม่ปล่อยกล่องว่าง
          // เปล่าๆ ด้านล่างหัวข้อ (เดิมเงื่อนไขนี้ไม่ครอบคลุมสถานะ 8 เลย ปล่อย Column ว่างแต่ Padding ยังอยู่)
          Padding(
            padding: const EdgeInsets.all(14),
            child: isRepairFailed
                ? Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text(
                        'เคสนี้ถูกปิดแล้ว บอกเหตุผลที่ไม่ยอมรับเพื่อให้เจ้าหน้าที่ตรวจสอบ ดูรายละเอียดอื่นได้ในไทม์ไลน์ด้านล่าง',
                        style: TextStyle(fontSize: 13, color: kTextMuted, height: 1.5),
                      ),
                      const SizedBox(height: 12),
                      _buildSuccessActions(isFailedCase: true),
                    ],
                  )
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // นับถอยหลังปิดอัตโนมัติ: บอกกำหนดชัดเจนว่าถ้าเงียบจะถูกปิดเป็น "สำเร็จ" วันไหน (เฉพาะสถานะ 3 —
                      // สถานะ 7 กำลังยื่นอุทธรณ์ ไม่ถูกปิดอัตโนมัติ)
                      if (detail.statusId == 3 && detail.autoCloseAt != null)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
                          margin: const EdgeInsets.only(bottom: 12),
                          decoration: BoxDecoration(
                            color: kAmber.withValues(alpha: 0.14),
                            borderRadius: BorderRadius.circular(kRadiusMd),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.schedule, size: 18, color: kAmberDark),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'หากไม่ยืนยัน ระบบจะปิดงานเป็น "สำเร็จ" อัตโนมัติ ภายใน ${formatDateFull(detail.autoCloseAt)}',
                                  style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: kText, height: 1.45),
                                ),
                              ),
                            ],
                          ),
                        ),
                      if (isAwaitingConfirmation) _buildAwaitingConfirmationActions() else _buildSuccessActions(),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildAwaitingConfirmationActions() {
    if (_hasPendingComplaint) {
      final pendingComplaint = _complaints.firstWhere((c) => c.decision == 'pending');

      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: kAmber.withValues(alpha: 0.12),
          border: Border.all(color: kAmber.withValues(alpha: 0.35)),
          borderRadius: BorderRadius.circular(kRadiusMd),
        ),
        child: Row(
          children: [
            const Icon(Icons.hourglass_top, size: 18, color: kAmberDark),
            const SizedBox(width: 8),
            const Expanded(
              child: Text(
                'ส่งคำร้องแจ้งแก้ไขแล้ว รอเจ้าหน้าที่ตรวจสอบ',
                style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: kText),
              ),
            ),
            // ดูรายละเอียดคำร้องที่ยื่นไป (ข้อความ+รูป) ได้เสมอ ไม่ว่าจะแก้ไขได้อยู่หรือไม่แล้วก็ตาม
            // ปุ่ม "แก้ไข" ย้ายไปอยู่ในป๊อปอัพนี้แทน (เหมือน showRequestDetailModal ของคำร้องแจ้งซ่อมเดิม)
            TextButton.icon(
              onPressed: () => showComplaintDetailModal(
                context,
                caseCode: _detail!.caseCode,
                ordinal: _complaints.indexOf(pendingComplaint) + 1,
                complaintText: pendingComplaint.complaintText,
                photoUrls: pendingComplaint.photoUrls,
                filedAt: pendingComplaint.filedAt,
                canEdit: !pendingComplaint.alreadyEdited && !_isComplaintUnderReview,
                onEditPressed: () => _openEditComplaintScreen(pendingComplaint),
                reasonCategoryName: pendingComplaint.reasonCategoryName,
              ),
              style: TextButton.styleFrom(
                foregroundColor: kAmberDark,
                padding: const EdgeInsets.symmetric(horizontal: 8),
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              icon: const Icon(Icons.visibility_outlined, size: 15),
              label: const Text('ดูรายละเอียด', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700)),
            ),
          ],
        ),
      );
    }

    final bool canFileComplaint = _complaints.length < _detail!.maxComplaints;

    return Row(
      children: [
        Expanded(
          child: SizedBox(
            height: 46,
            child: ElevatedButton.icon(
              onPressed: _isAccepting ? null : _acceptCompletion,
              style: ElevatedButton.styleFrom(
                backgroundColor: kGreenDark,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
              ),
              icon: const Icon(Icons.check_circle, size: 18),
              label: Text(_isAccepting ? 'กำลังยืนยัน...' : 'ยอมรับ'),
            ),
          ),
        ),
        const SizedBox(width: 10),
        // ยังมีสิทธิ์ยื่นคำร้อง → ปุ่ม "ยื่นคำร้อง" / ยื่นครบสิทธิ์แล้ว → เหลือ "ยอมรับ" กับ "ไม่ยอมรับ" เท่านั้น
        // (ไม่ยอมรับ = ปิดเคสเป็น "ซ่อมไม่สำเร็จ" ให้นักศึกษาเป็นผู้ตัดสินผลสุดท้ายเมื่อหมดสิทธิ์อุทธรณ์)
        Expanded(
          child: SizedBox(
            height: 46,
            child: canFileComplaint
                ? OutlinedButton.icon(
                    onPressed: _openComplaintScreen,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: kAmberDark,
                      side: const BorderSide(color: kAmber),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                    ),
                    icon: const Icon(Icons.report_problem_outlined, size: 18),
                    label: const Text('ยื่นคำร้อง'),
                  )
                : OutlinedButton.icon(
                    onPressed: _isDeclining ? null : _declineCompletion,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: kRsError,
                      side: const BorderSide(color: kRsError),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
                    ),
                    icon: const Icon(Icons.cancel_outlined, size: 18),
                    label: Text(_isDeclining ? 'กำลังบันทึก...' : 'ไม่ยอมรับ'),
                  ),
          ),
        ),
      ],
    );
  }

  // ปุ่มเปิดหน้าประเมิน: งานสำเร็จ = "ประเมินงานซ่อม" / งานไม่สำเร็จ = "ระบุเหตุผลที่ไม่ยอมรับ" (หน้าเดียวกัน ไม่มีดาว)
  Widget _buildSuccessActions({bool isFailedCase = false}) {
    return SizedBox(
      width: double.infinity,
      height: 46,
      child: ElevatedButton.icon(
        onPressed: () => _openEvaluationScreen(isFailedCase: isFailedCase),
        style: ElevatedButton.styleFrom(
          backgroundColor: kNavy,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
        ),
        icon: const Icon(Icons.rate_review, size: 18),
        label: Text(isFailedCase ? 'ระบุเหตุผลที่ไม่ยอมรับ' : 'ประเมินงานซ่อม'),
      ),
    );
  }

  // คำร้อง "ครั้งที่เท่าไหร่" ของการ์ดนี้ = จำนวนการ์ด complaint_filed ที่เกิดขึ้นถึงตำแหน่งนี้ใน timeline
  // (การ์ดตรวจสอบ/ผลตรวจอยู่หลังการ์ดยื่นคำร้องของใบนั้นเสมอ จึงนับได้ตรงกับใบที่กำลังพูดถึง)
  int _complaintOrdinal(TimelineStep step) {
    return _timeline
        .take(_timeline.indexOf(step) + 1)
        .where((s) => s.stepCode == 'complaint_filed')
        .length;
  }

  Widget _buildTimelineItem({
    required TimelineStep step,
    required RepairDetail detail,
    required bool isLatest,
    required bool isLast,
    required bool isLatestAppointment,
    required int appointmentRound,
    required bool isRescheduleInRound,
  }) {
    final visual = stepVisual(step.stepCode);

    final item = TimelineItem(
      isLatest: isLatest,
      isLast: isLast,
      showConnector: !isLast,
      icon: visual.icon,
      iconColor: visual.color,
      iconColorDark: visual.colorDark,
      child: _buildStepCard(step, detail, isLatestAppointment, appointmentRound, isRescheduleInRound),
    );

    if (!_isFocusStep(step)) return item;

    // ขั้นที่มาจากแจ้งเตือน: ใส่ key ให้เลื่อนมาหาได้ และเรืองแสงสีน้ำเงินจางๆ ช่วงสั้นๆ เพื่อให้ผู้ใช้เห็นว่าคือขั้นไหน
    return AnimatedContainer(
      key: _focusKey,
      duration: const Duration(milliseconds: 400),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(kRadiusLg),
        boxShadow: _highlightFocus ? [BoxShadow(color: kBlue.withValues(alpha: 0.45), blurRadius: 18, spreadRadius: 2)] : const [],
      ),
      child: item,
    );
  }

  Widget _buildStepCard(
    TimelineStep step,
    RepairDetail detail,
    bool isLatestAppointment,
    int appointmentRound,
    bool isRescheduleInRound,
  ) {
    // รอบ 1+ = นัดหมายรอบแก้ไข (หลังคำร้องอุทธรณ์ถูกอนุมัติ) ชื่อการ์ดต้องแยกจากนัดซ่อมครั้งแรก
    final bool isRevisionRound = appointmentRound > 0;
    final String historyTitle = isRevisionRound
        ? (isRescheduleInRound ? 'เลื่อนนัดหมายรอบแก้ไข' : 'นัดหมายรอบแก้ไข')
        : stepVisual('appointment').title;
    switch (step.stepCode) {
      case 'submitted':
        return RequestSubmittedCard(
          date: formatDateShort(step.eventDate),
          description: detail.description,
          typeNames: detail.typeNames,
          onViewDetail: () => showRequestDetailModal(
            context,
            detail,
            requestId: widget.requestId,
            photos: _photos,
            onEditPressed: _onEditPressed,
            onCancelPressed: (_) => _cancelRequest(),
          ),
        );
      case 'approved':
        // ปกติไม่มีข้อความ (step.detail = null) ใช้คำอธิบายเริ่มต้นจาก stepVisual — backend จะใส่ข้อความ
        // มาแทนเฉพาะตอน allow_entry=0 (นักศึกษาไม่อนุญาตให้ช่างเข้าห้อง) เพื่อบอกช่องทางติดต่อเจ้าหน้าที่
        // (ดู approveRepairRequest ใน server/models/repair_request.js)
        return SimpleTimelineCard(
          title: stepVisual(step.stepCode).title,
          date: formatDateShort(step.eventDate),
          description: (step.detail == null || step.detail!.isEmpty)
              ? stepVisual(step.stepCode).description
              : step.detail!,
          // มีข้อความใน step_detail = เคสที่ไม่อนุญาตเข้าห้อง ยังไม่มีการ์ดนัดหมาย → ให้เบอร์เจ้าหน้าที่ผู้ดูแลพร้อมปุ่มคัดลอก
          // (ดึงจากฐานข้อมูลผ่าน moderator_phone เดียวกับการ์ดนัดหมาย)
          contactLabel: (detail.moderatorName == null || detail.moderatorName!.isEmpty) ? null : detail.moderatorName,
          contactPhone: (step.detail == null || step.detail!.isEmpty) ? null : detail.moderatorPhone,
          onCopyContact: () => _copyModeratorPhone(detail.moderatorPhone ?? ''),
          contactCopied: _moderatorPhoneCopied,
        );
      case 'appointment':
        // เฉพาะนัดหมายล่าสุดเท่านั้นที่ยังใช้งานจริง ถึงจะโชว์เป็นการ์ด live ดึงข้อมูลช่าง/วันนัด
        // ปัจจุบันของเคส — ใบเก่าที่ถูกเลื่อน/แทนที่ไปแล้วโชว์เป็นประวัติเฉยๆ (ข้อความจาก step.detail
        // ซึ่ง backend ใส่วันที่+ช่วงเวลาของตัวเองไว้แล้ว ไม่ใช้ detail.appointmentDate ที่เป็นค่าปัจจุบัน)
        if (!isLatestAppointment) {
          return SimpleTimelineCard(
            title: historyTitle,
            date: formatDateShort(step.eventDate),
            description: step.detail ?? '',
          );
        }
        return AppointmentCard(
          isRevisionRound: isRevisionRound,
          date: formatDateShort(step.eventDate),
          appointmentDate: detail.appointmentDate,
          technicianName: detail.technicianName,
          technicianPhone: detail.technicianPhone,
          notes: step.detail,
          onCopyPhone: () => _copyPhoneNumber(detail.technicianPhone ?? ''),
          phoneCopied: _phoneCopied,
          canRush: detail.canRush,
          nextRushAt: detail.nextRushAt,
          onRush: _rushRequest,
          moderatorName: detail.moderatorName,
          moderatorPhone: detail.moderatorPhone,
          onCopyModeratorPhone: () => _copyModeratorPhone(detail.moderatorPhone ?? ''),
          moderatorPhoneCopied: _moderatorPhoneCopied,
        );
      case 'completed':
        // แสดงรายงานของ "รอบนี้" ตรงตำแหน่งที่ส่งงานเกิดขึ้นจริงในไทม์ไลน์ (แก้ off-by-one เดิมที่ใช้
        // appointmentRound + 1 — round มาจาก currentRound ที่นับ complaint_approved ไปแล้ว จึงตรงกับ
        // เลขรอบจริงอยู่แล้ว ไม่ต้อง +1)
        return CompletionReportTimelineCard(
          round: appointmentRound,
          date: formatDateShort(step.eventDate),
          items: _allCompletionItems.where((i) => i.revisionRound == appointmentRound).toList(),
        );
      case 'complaint_filed':
        // จับคู่การ์ด timeline ใบนี้กับแถวคำร้องจริงในตาราง repair_complaint (ผ่านลำดับ ordinal เดียวกับ
        // ที่ onTap ด้านล่างใช้เปิด popup) เพื่อเอาชื่อหมวดหมู่เหตุผล (join จากตาราง complaint_reason)
        // มาต่อหน้าคำอธิบายเดิม — เคสเก่าก่อนมีฟีเจอร์นี้จะไม่มีคำร้องที่ match หรือไม่มีหมวดหมู่ จึงไม่ขึ้นป้าย
        final matchedComplaint = _complaintOrdinal(step) - 1 < _complaints.length
            ? _complaints[_complaintOrdinal(step) - 1]
            : null;
        final baseDescription = (step.detail == null || step.detail!.isEmpty)
            ? stepVisual(step.stepCode).description
            : step.detail!;
        return SimpleTimelineCard(
          title: 'ยื่นคำร้องแจ้งแก้ไขงานซ่อม (ครั้งที่ ${_complaintOrdinal(step)})',
          date: formatDateShort(step.eventDate),
          description: matchedComplaint?.reasonCategoryName != null
              ? '[${matchedComplaint!.reasonCategoryName}] $baseDescription'
              : baseDescription,
          // กดดูรายละเอียดคำร้อง (ข้อความ+รูปที่แนบ) ได้เสมอ แม้เจ้าหน้าที่ตัดสินไปแล้ว — ปุ่มแก้ไขในป๊อปอัพ
          // จะกดได้เฉพาะคำร้องที่ยังรอตัดสิน ยังไม่เคยแก้ และเจ้าหน้าที่ยังไม่เริ่มตรวจสอบ
          onTap: _complaintOrdinal(step) - 1 < _complaints.length
              ? () {
                  final complaint = _complaints[_complaintOrdinal(step) - 1];
                  showComplaintDetailModal(
                    context,
                    caseCode: detail.caseCode,
                    ordinal: _complaintOrdinal(step),
                    complaintText: complaint.complaintText,
                    photoUrls: complaint.photoUrls,
                    filedAt: complaint.filedAt,
                    canEdit: complaint.decision == 'pending' && !complaint.alreadyEdited && !_isComplaintUnderReview,
                    onEditPressed: () => _openEditComplaintScreen(complaint),
                    reasonCategoryName: complaint.reasonCategoryName,
                  );
                }
              : null,
          tapLabel: 'ดูรายละเอียดคำร้อง',
        );
      case 'complaint_reviewing':
        return SimpleTimelineCard(
          title: 'เจ้าหน้าที่กำลังตรวจสอบคำร้อง (ครั้งที่ ${_complaintOrdinal(step)})',
          date: formatDateShort(step.eventDate),
          description: stepVisual(step.stepCode).description,
        );
      case 'complaint_approved':
        // ปกติไม่มีข้อความ ใช้ข้อความเริ่มต้น — backend ใส่ข้อความมาแทนเฉพาะตอนคำร้องนี้เลือก "ไม่อนุญาต"
        // ให้ช่างเข้าห้อง (allow_entry=0) เพื่อบอกช่องทางติดต่อเจ้าหน้าที่แทนการจัดคิวอัตโนมัติ
        return SimpleTimelineCard(
          title: 'ผลตรวจคำร้องครั้งที่ ${_complaintOrdinal(step)}: อนุมัติ',
          date: formatDateShort(step.eventDate),
          description: (step.detail == null || step.detail!.isEmpty)
              ? 'เจ้าหน้าที่ตรวจสอบและอนุมัติคำร้องของคุณแล้ว จะนัดหมายเพื่อแก้ไขงานซ่อมอีกครั้ง'
              : step.detail!,
        );
      case 'complaint_rejected':
        // นับคำร้องที่ยื่นมาจนถึงการ์ดนี้ เพื่อบอกสิทธิ์ที่เหลือ ณ ตอนนั้น (สิทธิ์รวมของเคสนี้ = detail.maxComplaints)
        // ถ้านี่คือคำร้องครั้งสุดท้ายที่มีสิทธิ์ยื่น เคสกลับมาให้เลือก "ยอมรับ" หรือ "ไม่ยอมรับ" (ไม่ปิดเองอัตโนมัติ)
        final int filedSoFar = _timeline
            .take(_timeline.indexOf(step) + 1)
            .where((s) => s.stepCode == 'complaint_filed')
            .length;
        final String remainingNote = filedSoFar >= detail.maxComplaints
            ? 'นี่เป็นคำร้องครั้งสุดท้ายที่คุณมีสิทธิ์ยื่น กรุณาเลือก "ยอมรับ" หรือ "ไม่ยอมรับ" ผลการซ่อม'
            : 'คุณยื่นคำร้องได้อีก ${detail.maxComplaints - filedSoFar} ครั้ง';
        final String reason = (step.detail == null || step.detail!.isEmpty) ? 'ไม่ได้ระบุเหตุผล' : step.detail!;
        return SimpleTimelineCard(
          title: 'ผลตรวจคำร้องครั้งที่ ${_complaintOrdinal(step)}: ไม่อนุมัติ',
          date: formatDateShort(step.eventDate),
          description: 'เหตุผลจากเจ้าหน้าที่: $reason\n$remainingNote',
        );
      case 'cancelled':
        return CancelledCard(
          date: formatDateShort(step.eventDate),
          reason: step.detail,
        );
      case 'student_cancelled':
        return CancelledCard(
          title: 'คุณยกเลิกคำร้องนี้',
          date: formatDateShort(step.eventDate),
          reason: step.detail,
        );
      case 'appointment_cancelled':
        return AppointmentCancelledCard(
          date: formatDateShort(step.eventDate),
        );
      default:
        return SimpleTimelineCard(
          title: stepVisual(step.stepCode).title,
          date: formatDateShort(step.eventDate),
          description: stepVisual(step.stepCode).description,
        );
    }
  }
}

/* ══════════════════════════════════════════
   Status badge helper
   ══════════════════════════════════════════ */
/// (label, bgColor, textColor)
(String, Color, Color) _statusBadge(int statusId, String statusName) {
  switch (statusId) {
    case 1:
      return (statusName, kAmber, kAmberDark);
    case 2:
      return (statusName, kBlue, const Color(0xFF1D4ED8));
    case 3:
      return (statusName, kGreen, kGreenDark);
    case 4:
      return (statusName, kRsError, kRsError);
    case 5:
      return (statusName, kAmber, kAmberDark);
    case 6:
      return (statusName, kGreen, kGreenDark);
    case 7:
      return (statusName, kAmber, kAmberDark);
    case 8:
      return (statusName, kRsError, kRsError);
    default:
      return (statusName, kSlateDark, kSlateDark);
  }
}

/* ══════════════════════════════════════════
   Widgets
   ══════════════════════════════════════════ */
class _HeaderSub extends StatelessWidget {
  final String caseCode;

  const _HeaderSub({required this.caseCode});

  @override
  Widget build(BuildContext context) {
    return Text.rich(
      TextSpan(
        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: kRsOnPrimary.withValues(alpha: 0.6)),
        children: [
          const TextSpan(text: 'รหัส Case: '),
          TextSpan(text: caseCode, style: const TextStyle(color: kRsOnPrimary, fontWeight: FontWeight.w700)),
        ],
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const _ErrorState({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.wifi_off_rounded, size: 48, color: kGray400),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center, style: const TextStyle(color: kGray500)),
            const SizedBox(height: 16),
            TextButton(onPressed: onRetry, child: const Text('ลองใหม่')),
          ],
        ),
      ),
    );
  }
}
