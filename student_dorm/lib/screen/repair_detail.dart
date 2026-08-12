import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart' show Clipboard, ClipboardData;
import 'package:google_fonts/google_fonts.dart';
import 'package:student_dorm/color/colors.dart';
import 'package:student_dorm/utils/app_api.dart';
import 'package:student_dorm/widgets/repair_stepper.dart';
import 'package:student_dorm/widgets/repair_timeline.dart';

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
  Timer? _pollTimer;

  // ตรงกับ btnCopy.classList.add('copied') — คุมว่าไอคอน copy เปลี่ยนเป็น
  // check ชั่วคราวหรือไม่
  bool _phoneCopied = false;

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
      ]);

      final detailJson = jsonDecode(responses[0].body);
      final timelineJson = jsonDecode(responses[1].body);

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

      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _detail = RepairDetail.fromJson(detailJson['data'] as Map<String, dynamic>);
        _timeline = timelineData;
      });
    } catch (e) {
      if (silent) return;
      setState(() {
        _isLoading = false;
        _errorMessage = 'ไม่สามารถโหลดข้อมูลได้';
      });
    }
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
      decoration: const BoxDecoration(
        color: kGoldMid,
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(36),
          bottomRight: Radius.circular(36),
        ),
        boxShadow: [
          BoxShadow(
            color: Color(0x47FFD700),
            blurRadius: 28,
            offset: Offset(0, 6),
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
                          const Text(
                            'ติดตามงานซ่อม',
                            style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: kText, height: 1.2),
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
    // เรียงใหม่ → เก่า (การ์ดล่าสุดอยู่บนสุด)
    final ordered = timeline.reversed.toList();

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 28, 16, 100),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 480),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
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
                ),
          ],
        ),
      ),
    );
  }

  Widget _buildTimelineItem({
    required TimelineStep step,
    required RepairDetail detail,
    required bool isLatest,
    required bool isLast,
  }) {
    final visual = stepVisual(step.stepCode);

    return TimelineItem(
      isLatest: isLatest,
      isLast: isLast,
      showConnector: !isLast,
      icon: visual.icon,
      iconColor: visual.color,
      iconColorDark: visual.colorDark,
      child: _buildStepCard(step, detail, isLatest),
    );
  }

  Widget _buildStepCard(TimelineStep step, RepairDetail detail, bool isLatest) {
    switch (step.stepCode) {
      case 'submitted':
        return RequestSubmittedCard(
          date: formatDateShort(step.eventDate),
          description: detail.description,
          typeNames: detail.typeNames,
        );
      case 'appointment':
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
        style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: kText.withValues(alpha: 0.6)),
        children: [
          const TextSpan(text: 'รหัส Case: '),
          TextSpan(text: caseCode, style: const TextStyle(color: kText, fontWeight: FontWeight.w700)),
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
