import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show Clipboard, ClipboardData;
import 'package:google_fonts/google_fonts.dart';
import 'package:student_dorm/color/colors.dart';
import 'package:student_dorm/models/repair_detail_model.dart' show RepairDetail, RepairPhoto, TimelineStep;
import 'package:student_dorm/utils/app_api.dart';
import 'package:student_dorm/widgets/repair_detail/repair_stepper.dart';
import 'package:student_dorm/widgets/repair_detail/repair_timeline.dart';
import 'package:student_dorm/widgets/repair_detail/request_detail_modal.dart';
import 'package:student_dorm/screen/report_submit_screen.dart';
import 'package:student_dorm/screen/evaluation_screen.dart';
import 'package:student_dorm/screen/repair_complaint_screen.dart';
import 'package:student_dorm/screen/photo_viewer_screen.dart' show photoFullUrl;

/// สรุปคำร้องแจ้งแก้ไข 1 รายการ (เอาไว้เช็คว่าเคสมีคำร้องค้าง 'pending' อยู่ไหม
/// และนับจำนวนคำร้องทั้งหมดเพื่อจำกัดสิทธิ์ยื่นคำร้องซ้ำเกิน 2 ครั้ง)
class _ComplaintInfo {
  final int complaintId;
  final String decision;

  const _ComplaintInfo({required this.complaintId, required this.decision});

  factory _ComplaintInfo.fromJson(Map<String, dynamic> json) {
    return _ComplaintInfo(
      complaintId: json['complaint_id'] as int,
      decision: json['decision'] as String? ?? 'pending',
    );
  }
}

/* ══════════════════════════════════════════
   SCREEN
   ══════════════════════════════════════════ */
class CaseStatusScreen extends StatefulWidget {
  final int requestId;

  const CaseStatusScreen({super.key, required this.requestId});

  @override
  State<CaseStatusScreen> createState() => _CaseStatusScreenState();
}

class _CaseStatusScreenState extends State<CaseStatusScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  RepairDetail? _detail;
  List<TimelineStep> _timeline = [];
  List<RepairPhoto> _photos = [];
  List<RepairPhoto> _completionPhotos = [];
  List<_ComplaintInfo> _complaints = [];
  Timer? _pollTimer;

  // ตรงกับ btnCopy.classList.add('copied') — คุมว่าไอคอน copy เปลี่ยนเป็น
  // check ชั่วคราวหรือไม่
  bool _phoneCopied = false;
  bool _isAccepting = false;

  bool get _hasPendingComplaint => _complaints.any((c) => c.decision == 'pending');

  @override
  void initState() {
    super.initState();
    _fetchData();
    // อัปเดต timeline อัตโนมัติ (เจ้าหน้าที่กด "ดูเพิ่มเติม"/อนุมัติ/ฯลฯ ฝั่ง React
    // ต้องขึ้นในหน้านี้โดยไม่ต้องให้ผู้ใช้รีเฟรชเอง)
    _pollTimer = Timer.periodic(const Duration(seconds: 5), (_) => _fetchData(silent: true));
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
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
        AppAPI.get('/repair_request/${widget.requestId}/completion_photos'),
        AppAPI.get('/repair_request/${widget.requestId}/complaints'),
      ]);

      final detailJson = jsonDecode(responses[0].body);
      final timelineJson = jsonDecode(responses[1].body);
      final photosJson = jsonDecode(responses[2].body);
      final completionPhotosJson = jsonDecode(responses[3].body);
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

      // completion_photos ใช้ชื่อ field คนละชื่อกับ photos ปกติ (completion_photo_id
      // แทน photo_id) เลยแปลงเองตรงนี้แทนที่จะใช้ RepairPhoto.fromJson
      final completionPhotosData = completionPhotosJson['isError'] == true
          ? <RepairPhoto>[]
          : (completionPhotosJson['data'] as List? ?? [])
              .map((e) => RepairPhoto(
                    photoId: e['completion_photo_id'] as int,
                    photoUrl: e['photo_url'] as String? ?? '',
                  ))
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
        _completionPhotos = completionPhotosData;
        _complaints = complaintsData;
      });
    } catch (e) {
      if (silent) return;
      setState(() {
        _isLoading = false;
        _errorMessage = 'ไม่สามารถโหลดข้อมูลได้';
      });
    }
  }

  Future<void> _acceptCompletion() async {
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

  Future<void> _openComplaintScreen() async {
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => RepairComplaintScreen(requestId: widget.requestId)),
    );

    if (!mounted) return;
    await _fetchData();
  }

  Future<void> _openEvaluationScreen() async {
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => EvaluationScreen(requestId: widget.requestId)),
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
    // หา 'appointment' entry "ตัวแรก" กับ "ล่าสุด" — ตัวล่าสุดคือตัวที่ยังใช้งานจริง (อาจไม่ใช่ event
    // ล่าสุดสุดของทั้งเคส ถ้ามี step อื่นเกิดขึ้นทีหลัง เช่น 'completed') ส่วนตัวแรกเก็บไว้โชว์เป็น
    // ประวัติจุดเริ่มต้น การ์ดนัดหมาย "กลางๆ" ที่เหลือ (เคยถูกเลื่อน/แทนที่ไปแล้ว) จะถูกตัดออกจากรายการ
    // ไปเลยตามที่ตกลงกันไว้ ไม่ใช่แค่ลดสไตล์เหมือนเดิม
    TimelineStep? firstAppointmentStep;
    TimelineStep? latestAppointmentStep;
    for (final step in timeline) {
      if (step.stepCode == 'appointment') {
        firstAppointmentStep ??= step;
        latestAppointmentStep = step;
      }
    }

    final filteredTimeline = timeline.where((step) {
      if (step.stepCode != 'appointment') return true;
      return identical(step, firstAppointmentStep) || identical(step, latestAppointmentStep);
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
            if (detail.statusId == 3 || detail.statusId == 6) ...[
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
                ),
          ],
        ),
      ),
    );
  }

  // ── การ์ดสรุปผลการซ่อม (โผล่เฉพาะสถานะ "เสร็จสิ้น"(3) รอยืนยัน กับ "สำเร็จ"(6)) ──
  Widget _buildCompletionSummaryCard(RepairDetail detail) {
    final bool isAwaitingConfirmation = detail.statusId == 3;

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
                Icon(isAwaitingConfirmation ? Icons.task_alt : Icons.verified, size: 20, color: kGreenDark),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    isAwaitingConfirmation ? 'งานซ่อมเสร็จสิ้น รอการยืนยันจากคุณ' : 'งานซ่อมสำเร็จ',
                    style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: kText),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (detail.repairReport != null && detail.repairReport!.isNotEmpty) ...[
                  Text('รายงานผลการซ่อม', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: kTextMuted)),
                  const SizedBox(height: 4),
                  Text(detail.repairReport!, style: const TextStyle(fontSize: 13, height: 1.6, color: kText)),
                  const SizedBox(height: 12),
                ],
                if (_completionPhotos.isNotEmpty) ...[
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _completionPhotos.map((photo) {
                      return ClipRRect(
                        borderRadius: BorderRadius.circular(kRadiusMd),
                        child: Image.network(
                          photoFullUrl(photo.photoUrl),
                          width: 84,
                          height: 84,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) => Container(
                            width: 84,
                            height: 84,
                            color: kGray100,
                            child: const Icon(Icons.broken_image, color: kGray400),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 14),
                ],
                if (isAwaitingConfirmation)
                  _buildAwaitingConfirmationActions()
                else
                  _buildSuccessActions(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAwaitingConfirmationActions() {
    if (_hasPendingComplaint) {
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
          ],
        ),
      );
    }

    final bool canFileComplaint = _complaints.length < 2;

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
        Expanded(
          child: SizedBox(
            height: 46,
            child: OutlinedButton.icon(
              onPressed: canFileComplaint ? _openComplaintScreen : null,
              style: OutlinedButton.styleFrom(
                foregroundColor: kAmberDark,
                side: BorderSide(color: canFileComplaint ? kAmber : kGray200),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
              ),
              icon: const Icon(Icons.report_problem_outlined, size: 18),
              label: Text(canFileComplaint ? 'ยื่นคำร้อง' : 'ยื่นคำร้องครบแล้ว'),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSuccessActions() {
    return SizedBox(
      width: double.infinity,
      height: 46,
      child: ElevatedButton.icon(
        onPressed: _openEvaluationScreen,
        style: ElevatedButton.styleFrom(
          backgroundColor: kNavy,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
        ),
        icon: const Icon(Icons.rate_review, size: 18),
        label: const Text('ประเมินงานซ่อม'),
      ),
    );
  }

  Widget _buildTimelineItem({
    required TimelineStep step,
    required RepairDetail detail,
    required bool isLatest,
    required bool isLast,
    required bool isLatestAppointment,
  }) {
    final visual = stepVisual(step.stepCode);

    return TimelineItem(
      isLatest: isLatest,
      isLast: isLast,
      showConnector: !isLast,
      icon: visual.icon,
      iconColor: visual.color,
      iconColorDark: visual.colorDark,
      child: _buildStepCard(step, detail, isLatestAppointment),
    );
  }

  Widget _buildStepCard(TimelineStep step, RepairDetail detail, bool isLatestAppointment) {
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
          ),
        );
      case 'appointment':
        // เฉพาะนัดหมายล่าสุดเท่านั้นที่ยังใช้งานจริง ถึงจะโชว์เป็นการ์ด live ดึงข้อมูลช่าง/วันนัด
        // ปัจจุบันของเคส — ใบเก่าที่ถูกเลื่อน/แทนที่ไปแล้วโชว์เป็นประวัติเฉยๆ (ข้อความจาก step.detail
        // ซึ่ง backend ใส่วันที่+ช่วงเวลาของตัวเองไว้แล้ว ไม่ใช้ detail.appointmentDate ที่เป็นค่าปัจจุบัน)
        if (!isLatestAppointment) {
          return SimpleTimelineCard(
            title: stepVisual('appointment').title,
            date: formatDateShort(step.eventDate),
            description: step.detail ?? '',
          );
        }
        return AppointmentCard(
          date: formatDateShort(step.eventDate),
          appointmentDate: detail.appointmentDate,
          technicianName: detail.technicianName,
          technicianPhone: detail.technicianPhone,
          notes: step.detail,
          onCopyPhone: () => _copyPhoneNumber(detail.technicianPhone ?? ''),
          phoneCopied: _phoneCopied,
        );
      case 'cancelled':
        return CancelledCard(
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
