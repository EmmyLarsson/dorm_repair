import 'package:flutter/material.dart';
import 'package:student_dorm/color/colors.dart';
import 'package:student_dorm/models/repair_detail_model.dart' show RepairCompletionItem;
import 'package:student_dorm/widgets/repair_detail/completion_item_card.dart';

const double kRadiusXl = 24;
const double kRadiusLg = 16;
const double kRadiusMd = 12;
const double kRadiusSm = 8;

const List<String> _kThaiMonths = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

DateTime? _tryParseSqlDate(String? raw) {
  if (raw == null || raw.isEmpty) return null;
  return DateTime.tryParse(raw.replaceFirst(' ', 'T'));
}

/// dd/MM/yyyy พ.ศ. (ตรงกับสไตล์วันที่เดิมในหน้านี้)
String formatDateShort(String? raw) {
  final dt = _tryParseSqlDate(raw);
  if (dt == null) return '—';
  final y = dt.year + 543;
  return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/$y';
}

/// dd เดือน พ.ศ. เวลา HH:mm (ใช้ในกล่องไฮไลต์วันนัดซ่อม) — appointment_date เป็น datetime
/// ที่เก็บเวลาไว้ในฐานข้อมูลอยู่แล้ว เดิมฟังก์ชันนี้ตัดเวลาทิ้งไปตั้งแต่แรกจึงไม่เคยแสดงเวลาเลย
String formatDateFull(String? raw) {
  final dt = _tryParseSqlDate(raw);
  if (dt == null) return '—';
  final y = dt.year + 543;
  final hour = dt.hour.toString().padLeft(2, '0');
  final minute = dt.minute.toString().padLeft(2, '0');
  return '${dt.day.toString().padLeft(2, '0')} ${_kThaiMonths[dt.month - 1]} $y  •  $hour:$minute น.';
}

/// เทียบแค่ปี/เดือน/วัน (ไม่เทียบเวลา) กับวันนี้ — คำนวณสดทุกครั้งที่ build ไม่มีการเก็บค่าไว้ที่ไหน
bool _isAppointmentToday(String? raw) {
  final dt = _tryParseSqlDate(raw);
  if (dt == null) return false;
  final now = DateTime.now();
  return dt.year == now.year && dt.month == now.month && dt.day == now.day;
}

/* ══════════════════════════════════════════
   Step visuals
   ══════════════════════════════════════════ */
class StepVisual {
  final IconData icon;
  final Color color;
  final Color colorDark;
  final String title;
  final String description;

  const StepVisual(this.icon, this.color, this.colorDark, this.title, this.description);
}

StepVisual stepVisual(String stepCode) {
  switch (stepCode) {
    case 'submitted':
      return const StepVisual(Icons.add_circle, Color(0xFFCBD5E1), kSlateDark, 'ส่งคำร้องแจ้งซ่อมสำเร็จ', '');
    case 'reviewing':
      return const StepVisual(Icons.manage_search, Color(0xFFFCD34D), kAmberDark, 'อยู่ระหว่างการตรวจสอบ',
          'เจ้าหน้าที่กำลังตรวจสอบและประเมินความเสียหายเพื่อจัดลำดับงานซ่อม');
    case 'approved':
      return const StepVisual(Icons.task_alt, Color(0xFF4ADE80), kGreenDark, 'คำร้องได้รับการอนุมัติ',
          'เจ้าหน้าที่อนุมัติคำร้องเรียบร้อยแล้ว และอยู่ระหว่างมอบหมายช่างเพื่อดำเนินการซ่อม');
    case 'appointment':
      return const StepVisual(Icons.event_available, kBlue, kBlueDark, 'ได้รับวันนัดหมายการซ่อม', '');
    case 'in_progress':
      return const StepVisual(Icons.build, kBlue, kBlueDark, 'อยู่ระหว่างดำเนินการซ่อม',
          'ช่างกำลังดำเนินการซ่อมแซมตามวันนัดหมายที่กำหนดไว้');
    // การ์ดนี้โชว์เฉพาะตอน "ส่งงานแก้ไขรอบใหม่" (หลังคำร้องอุทธรณ์อนุมัติ) ใช้ไอคอนส่งงาน ไม่ใช้ติ๊กเขียว
    // เพราะยังไม่ใช่จุดจบ — ต้องรอนักศึกษากดยอมรับ
    case 'completed':
      return const StepVisual(Icons.send, kBlue, kBlueDark, 'ส่งงานให้ตรวจสอบ',
          'เจ้าหน้าที่ส่งงานซ่อมให้คุณตรวจสอบ');
    case 'cancelled':
      return const StepVisual(Icons.cancel, kRsError, kRsError, 'คำร้องแจ้งซ่อมถูกยกเลิก', '');
    case 'appointment_cancelled':
      return const StepVisual(Icons.event_busy, kAmber, kAmberDark, 'ยกเลิกนัดหมาย', 'รอนัดหมายอีกครั้ง');
    case 'accepted':
      return const StepVisual(Icons.verified, Color(0xFF4ADE80), kGreenDark, 'นักศึกษายอมรับผลการซ่อม',
          'นักศึกษาตรวจสอบผลการซ่อมแล้วยืนยันว่าเรียบร้อย ถือว่างานซ่อมนี้เสร็จสิ้นสมบูรณ์');
    case 'declined':
      return const StepVisual(Icons.cancel, kRsError, kRsError, 'นักศึกษาไม่ยอมรับผลการซ่อม',
          'นักศึกษาตรวจสอบผลการซ่อมแล้วไม่ยอมรับ หลังใช้สิทธิ์ยื่นคำร้องครบแล้ว งานซ่อมนี้ปิดเป็น "ซ่อมไม่สำเร็จ"');
    case 'complaint_filed':
      return const StepVisual(Icons.report_problem, kAmber, kAmberDark, 'ยื่นคำร้องแจ้งแก้ไขงานซ่อม',
          'นักศึกษาแจ้งว่ายังไม่พอใจผลการซ่อม รอเจ้าหน้าที่ตรวจสอบคำร้อง');
    case 'complaint_reviewing':
      return const StepVisual(Icons.manage_search, Color(0xFFFCD34D), kAmberDark, 'เจ้าหน้าที่กำลังตรวจสอบคำร้อง',
          'เจ้าหน้าที่เปิดดูคำร้องของคุณแล้ว และกำลังพิจารณา');
    case 'complaint_approved':
      return const StepVisual(Icons.build_circle, kBlue, kBlueDark, 'อนุมัติคำร้อง กำลังแก้ไขงานซ่อม',
          'เจ้าหน้าที่รับทราบคำร้องและกำลังดำเนินการแก้ไขงานซ่อมให้ใหม่');
    case 'complaint_rejected':
      return const StepVisual(Icons.gpp_maybe, kRsError, kRsError, 'ปฏิเสธคำร้อง',
          'เจ้าหน้าที่พิจารณาแล้วว่างานซ่อมเรียบร้อยดี ไม่มีการแก้ไขเพิ่มเติม');
    default:
      return const StepVisual(Icons.info, Color(0xFFCBD5E1), kSlateDark, '', '');
  }
}

/* ══════════════════════════════════════════
   Timeline connector + icon
   ══════════════════════════════════════════ */
class TimelineItem extends StatelessWidget {
  final bool isLatest;
  final bool isLast;
  final bool showConnector;
  final Color iconColor;
  final Color iconColorDark;
  final IconData icon;
  final Widget child;

  const TimelineItem({
    super.key,
    this.isLatest = false,
    this.isLast = false,
    required this.showConnector,
    required this.iconColor,
    required this.iconColorDark,
    required this.icon,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    // เส้นเชื่อม (.tl-connector) ต้องอยู่ใน Stack เดียวกับ Padding ท้ายรายการ
    // (ไม่ใช่ครอบ Stack จากข้างนอก) เพื่อให้ bottom:0 ของเส้นทอดยาวทะลุช่องว่าง
    // ระหว่างรายการไปจนถึงขอบบนของไอคอนถัดไปพอดี ตรงกับ .tl-item ที่ padding-bottom
    // อยู่ "ภายใน" กล่องเดียวกับที่ .tl-connector อ้างอิงตำแหน่งอยู่
    return Stack(
      children: [
        if (showConnector)
          Positioned(
            left: 20,
            top: 43,
            bottom: 0,
            child: Container(width: 2, color: kGray200),
          ),
        Padding(
          padding: EdgeInsets.only(bottom: isLast ? 0 : 26),
          child: IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [iconColor, iconColorDark],
                    ),
                    shape: BoxShape.circle,
                    boxShadow: const [BoxShadow(color: Color(0x24000000), blurRadius: 14, offset: Offset(0, 4))],
                  ),
                  child: Icon(icon, size: 19, color: Colors.white),
                ),
                const SizedBox(width: 14),
                Expanded(child: child),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class SimpleTimelineCard extends StatelessWidget {
  final String title;
  final String date;
  final String description;
  // ถ้าใส่ onTap การ์ดจะกดได้ และมีแถว "ดูรายละเอียด" ท้ายการ์ด (สไตล์เดียวกับ RequestSubmittedCard)
  final VoidCallback? onTap;
  final String tapLabel;

  const SimpleTimelineCard({
    super.key,
    required this.title,
    required this.date,
    required this.description,
    this.onTap,
    this.tapLabel = 'ดูรายละเอียด',
  });

  @override
  Widget build(BuildContext context) {
    final card = Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(kRadiusLg),
        border: Border.all(color: kGray200, width: 1.5),
        boxShadow: const [BoxShadow(color: Color(0x0F000000), blurRadius: 14, offset: Offset(0, 2))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 10),
            decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: kGray200))),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: kText)),
                ),
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Text(date, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: kTextMuted)),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  description,
                  // สีเดียวกับรายละเอียดในการ์ด "ส่งคำร้องแจ้งซ่อมสำเร็จ" (kText) — เดิมเป็น kTextMuted จางเกินอ่านยาก
                  style: const TextStyle(fontSize: 13, height: 1.65, color: kText),
                ),
                if (onTap != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: Container(
                      width: double.infinity,
                      padding: const EdgeInsets.only(top: 10),
                      decoration: const BoxDecoration(border: Border(top: BorderSide(color: kGray200))),
                      child: Row(
                        children: [
                          const Icon(Icons.visibility, size: 15, color: kBlueDark),
                          const SizedBox(width: 6),
                          Text(
                            tapLabel,
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: kBlueDark),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );

    if (onTap == null) return card;

    return Material(
      color: Colors.transparent,
      borderRadius: BorderRadius.circular(kRadiusLg),
      child: InkWell(
        borderRadius: BorderRadius.circular(kRadiusLg),
        onTap: onTap,
        child: card,
      ),
    );
  }
}

/// การ์ดยกเลิก — หัวข้อ+เหตุผลจาก moderator
class CancelledCard extends StatelessWidget {
  final String date;
  final String? reason;

  const CancelledCard({super.key, required this.date, required this.reason});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(kRadiusLg),
        border: Border.all(color: kRsError.withValues(alpha: 0.35), width: 1.5),
        boxShadow: const [BoxShadow(color: Color(0x0F000000), blurRadius: 14, offset: Offset(0, 2))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 10),
            decoration: BoxDecoration(
              color: kRsError.withValues(alpha: 0.06),
              border: const Border(bottom: BorderSide(color: kGray200)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Expanded(
                  child: Text('คำร้องแจ้งซ่อมถูกยกเลิก',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: kRsError)),
                ),
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Text(date, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: kTextMuted)),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Text(
              (reason == null || reason!.isEmpty) ? 'ไม่มีการระบุสาเหตุ' : reason!,
              style: const TextStyle(fontSize: 13, height: 1.65, color: kTextMuted),
            ),
          ),
        ],
      ),
    );
  }
}

/// การ์ดยกเลิกนัดหมาย — เจ้าหน้าที่ลบกำหนดนัดหมายเดิม รอนัดหมายใหม่
class AppointmentCancelledCard extends StatelessWidget {
  final String date;

  const AppointmentCancelledCard({super.key, required this.date});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(kRadiusLg),
        border: Border.all(color: kAmber.withValues(alpha: 0.35), width: 1.5),
        boxShadow: const [BoxShadow(color: Color(0x0F000000), blurRadius: 14, offset: Offset(0, 2))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 10),
            decoration: BoxDecoration(
              color: kAmber.withValues(alpha: 0.08),
              border: const Border(bottom: BorderSide(color: kGray200)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Expanded(
                  child: Text('ยกเลิกนัดหมาย',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: kAmberDark)),
                ),
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Text(date, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: kTextMuted)),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Text(
              'รอนัดหมายอีกครั้ง',
              style: const TextStyle(fontSize: 13, height: 1.65, color: kTextMuted),
            ),
          ),
        ],
      ),
    );
  }
}

/// การ์ดนัดหมาย + ข้อมูลช่าง + ปุ่ม copy
class AppointmentCard extends StatelessWidget {
  final String date;
  final String? appointmentDate;
  final String? technicianName;
  final String? technicianPhone;
  final String? notes;
  final VoidCallback onCopyPhone;
  final bool phoneCopied;
  final bool isRevisionRound;

  const AppointmentCard({
    super.key,
    this.isRevisionRound = false,
    required this.date,
    required this.appointmentDate,
    required this.technicianName,
    required this.technicianPhone,
    required this.notes,
    required this.onCopyPhone,
    required this.phoneCopied,
  });

  @override
  Widget build(BuildContext context) {
    final hasPhone = technicianPhone != null && technicianPhone!.isNotEmpty;
    final isToday = _isAppointmentToday(appointmentDate);
    // step_detail จาก backend ขึ้นต้นด้วย "เลื่อนกำหนดการซ่อมเป็น..." เฉพาะตอนเลื่อนนัดจากที่เคยมีอยู่แล้ว
    // (ดู assignTechnician ใน server/models/repair_request.js) ใช้เช็คว่าควรโชว์หัวข้อไหน
    final isReschedule = notes != null && notes!.startsWith('เลื่อน');
    // นัดที่ระบบจัดคิวให้เองตอนอนุมัติ (autoScheduleIfAllowed ฝั่ง backend ขึ้นต้นข้อความด้วย
    // "เจ้าหน้าที่นัดหมายวันซ่อมให้คุณแล้ว...") — ตั้งใจไม่บอกนักศึกษาตรงๆ ว่าเป็นการจัดคิวอัตโนมัติ
    // เพื่อให้รู้สึกเหมือนมีเจ้าหน้าที่ดูแลจัดการให้จริง แต่ยังอยากเตือนว่าเลื่อนนัดได้ถ้าไม่สะดวก
    final isAutoScheduled = notes != null && notes!.startsWith('เจ้าหน้าที่นัดหมายวันซ่อมให้คุณแล้ว');
    // notes ทั้งก้อนตอนนี้คือประโยคที่ backend แต่งไว้ (วันที่+ช่วงเวลาซ้ำกับกล่องด้านบนแล้ว) —
    // แกะเอาแค่หมายเหตุจริงที่เจ้าหน้าที่พิมพ์เอง (อยู่ในวงเล็บท้ายสุด) มาโชว์แทนทั้งประโยค
    final userNote = notes != null ? RegExp(r'\(([^)]*)\)$').firstMatch(notes!)?.group(1) : null;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(kRadiusLg),
        border: Border.all(color: kBlue.withValues(alpha: 0.28), width: 1.5),
        boxShadow: [BoxShadow(color: kBlue.withValues(alpha: 0.1), blurRadius: 22, offset: const Offset(0, 4))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 10),
            decoration: BoxDecoration(
              color: kBlue.withValues(alpha: 0.04),
              border: const Border(bottom: BorderSide(color: kGray200)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        margin: const EdgeInsets.only(bottom: 4),
                        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                        decoration: BoxDecoration(
                          color: kBlue.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text('ล่าสุด', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: kBlueDark)),
                      ),
                      Text(
                        isRevisionRound
                            ? (isReschedule ? 'เลื่อนนัดหมายรอบแก้ไข' : 'นัดหมายรอบแก้ไข')
                            : (isReschedule ? 'เลื่อนกำหนดการนัดหมาย' : 'ได้รับวันนัดหมายการซ่อม'),
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: kText),
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Text(date, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: kTextMuted)),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (isToday)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    margin: const EdgeInsets.only(bottom: 10),
                    decoration: BoxDecoration(
                      color: kAmber.withValues(alpha: 0.18),
                      border: Border.all(color: kAmber),
                      borderRadius: BorderRadius.circular(kRadiusMd),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.notifications_active, size: 18, color: kAmberDark),
                        const SizedBox(width: 8),
                        const Expanded(
                          child: Text(
                            'วันนี้ถึงกำหนดนัดหมายซ่อมแล้ว!',
                            style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w800, color: kText),
                          ),
                        ),
                      ],
                    ),
                  ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  margin: const EdgeInsets.only(bottom: 14),
                  decoration: BoxDecoration(
                    color: kBlue.withValues(alpha: 0.08),
                    border: Border.all(color: kBlue.withValues(alpha: 0.2)),
                    borderRadius: BorderRadius.circular(kRadiusMd),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.calendar_month, size: 22, color: kBlue),
                      const SizedBox(width: 10),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('วันนัดซ่อม', style: TextStyle(fontSize: 11, color: kBlue, fontWeight: FontWeight.w600)),
                          Text(formatDateFull(appointmentDate),
                              style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: kBlueDark)),
                        ],
                      ),
                    ],
                  ),
                ),
                if (isAutoScheduled) ...[
                  const Text(
                    'หากไม่สะดวกหรือมีเหตุจำเป็น ติดต่อเจ้าหน้าที่เพื่อขอเลื่อนนัดได้',
                    style: TextStyle(fontSize: 12.5, color: kTextMuted, height: 1.5),
                  ),
                  const SizedBox(height: 12),
                ],
                if (userNote != null && userNote.isNotEmpty) ...[
                  Text(userNote, style: const TextStyle(fontSize: 12.5, color: kTextMuted, height: 1.5)),
                  const SizedBox(height: 12),
                ],
                Container(height: 1, color: kGray200, margin: const EdgeInsets.symmetric(vertical: 12)),
                Row(
                  children: [
                    Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(color: kGray100, borderRadius: BorderRadius.circular(9)),
                      child: Icon(Icons.person, size: 16, color: kTextMuted),
                    ),
                    const SizedBox(width: 10),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('ช่างผู้ดำเนินการ', style: TextStyle(fontSize: 11, color: kTextMuted, fontWeight: FontWeight.w500)),
                        Text(
                          (technicianName == null || technicianName!.isEmpty) ? 'ยังไม่ระบุ' : technicianName!,
                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: kText),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(color: kGray100, borderRadius: BorderRadius.circular(9)),
                      child: Icon(Icons.phone, size: 16, color: kTextMuted),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('เบอร์ติดต่อ', style: TextStyle(fontSize: 11, color: kTextMuted, fontWeight: FontWeight.w500)),
                              Text(
                                hasPhone ? technicianPhone! : 'ยังไม่ระบุ',
                                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: kBlue),
                              ),
                            ],
                          ),
                          if (hasPhone)
                            Material(
                              color: phoneCopied ? kGreen : kGray100,
                              borderRadius: BorderRadius.circular(10),
                              child: InkWell(
                                borderRadius: BorderRadius.circular(10),
                                onTap: onCopyPhone,
                                child: Container(
                                  width: 36,
                                  height: 36,
                                  decoration: BoxDecoration(
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(color: phoneCopied ? kGreen : kGray200, width: 1.5),
                                  ),
                                  child: Icon(
                                    phoneCopied ? Icons.check : Icons.content_copy,
                                    size: 15,
                                    color: phoneCopied ? Colors.white : kTextMuted,
                                  ),
                                ),
                              ),
                            ),
                        ],
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

/// การ์ด "ส่งคำร้องแจ้งซ่อมสำเร็จ" — กดเพื่อเปิด popup "ดูรายละเอียดคำร้อง" (ตรงกับ
/// .tl-card--clickable + .tl-view-more ใน case_status.html)
class RequestSubmittedCard extends StatelessWidget {
  final String date;
  final String description;
  final List<String> typeNames;
  final VoidCallback onViewDetail;

  const RequestSubmittedCard({
    super.key,
    required this.date,
    required this.description,
    required this.typeNames,
    required this.onViewDetail,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(kRadiusLg),
      child: InkWell(
        borderRadius: BorderRadius.circular(kRadiusLg),
        onTap: onViewDetail,
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(kRadiusLg),
            border: Border.all(color: kGray200, width: 1.5),
            boxShadow: const [BoxShadow(color: Color(0x0F000000), blurRadius: 14, offset: Offset(0, 2))],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Container(
                padding: const EdgeInsets.fromLTRB(14, 12, 14, 10),
                decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: kGray200))),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Expanded(
                      child: Text('ส่งคำร้องแจ้งซ่อมสำเร็จ', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: kText)),
                    ),
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Text(date, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: kTextMuted)),
                    ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'ผู้แจ้งได้ยื่นคำร้องแจ้งซ่อมเรียบร้อยแล้ว รายละเอียดดังนี้',
                      style: TextStyle(fontSize: 13, height: 1.65, color: kTextMuted),
                    ),
                    if (description.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(description, style: const TextStyle(fontSize: 13, height: 1.65, color: kText)),
                    ],
                    if (typeNames.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 10),
                        child: Wrap(
                          spacing: 7,
                          runSpacing: 7,
                          children: typeNames.map((t) => _RepairTag(icon: Icons.bolt, label: t)).toList(),
                        ),
                      ),
                    Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: Container(
                        padding: const EdgeInsets.only(top: 10),
                        decoration: const BoxDecoration(border: Border(top: BorderSide(color: kGray200))),
                        child: Row(
                          children: [
                            const Icon(Icons.visibility, size: 15, color: kBlueDark),
                            const SizedBox(width: 6),
                            const Text(
                              'ดูรายละเอียดคำร้อง',
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: kBlueDark),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _RepairTag extends StatelessWidget {
  final IconData icon;
  final String label;

  const _RepairTag({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    final Color bg = kGoldMid.withValues(alpha: 0.14);
    const Color fg = Color(0xFF92400E);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(8)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: fg),
          const SizedBox(width: 4),
          Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: fg)),
        ],
      ),
    );
  }
}

class EmptyTimeline extends StatelessWidget {
  const EmptyTimeline({super.key});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 32),
      child: Center(
        child: Text('ยังไม่มีความเคลื่อนไหว', style: TextStyle(fontSize: 13, color: kTextMuted)),
      ),
    );
  }
}

/// การ์ดรายงานผลซ่อม "1 รอบ" ฝังอยู่ใน timeline ตรงตำแหน่งที่ "ส่งงาน" เกิดขึ้นจริง (round 0 = รอบซ่อมแรก,
/// round N = รอบแก้ไขครั้งที่ N) — แทนที่การ์ดสรุปด้านบนสุดของหน้าเดิมที่โชว์แค่รอบล่าสุด ให้ timeline เป็น
/// ที่เดียวที่ดูรายงานได้ ครบทุกรอบตามลำดับเวลาจริง ไม่มี state ของตัวเอง จึงเป็น StatelessWidget
class CompletionReportTimelineCard extends StatelessWidget {
  final int round;
  final String date;
  final List<RepairCompletionItem> items;

  const CompletionReportTimelineCard({
    super.key,
    required this.round,
    required this.date,
    required this.items,
  });

  @override
  Widget build(BuildContext context) {
    final title = round == 0 ? 'ส่งงานซ่อมให้ตรวจสอบ' : 'ส่งงานแก้ไขรอบที่ $round ให้ตรวจสอบ';
    final reportLabel = round == 0 ? 'รายงานการซ่อม' : 'รายงานการแก้ไขครั้งที่ $round';

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(kRadiusLg),
        border: Border.all(color: kGray200, width: 1.5),
        boxShadow: const [BoxShadow(color: Color(0x0F000000), blurRadius: 14, offset: Offset(0, 2))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(14, 12, 14, 10),
            decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: kGray200))),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: kText)),
                ),
                Padding(
                  padding: const EdgeInsets.only(top: 2),
                  child: Text(date, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: kTextMuted)),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(reportLabel, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: kTextMuted)),
                const SizedBox(height: 10),
                if (items.isEmpty)
                  const Text('ยังไม่มีรายงาน', style: TextStyle(fontSize: 13, color: kTextMuted))
                else
                  for (final item in items) ...[
                    CompletionItemCard(item: item),
                    const SizedBox(height: 10),
                  ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
