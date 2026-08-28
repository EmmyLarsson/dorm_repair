import 'package:flutter/material.dart';
import 'package:student_dorm/color/colors.dart';
import 'package:student_dorm/models/repair_detail_model.dart' show RepairDetail;
import 'package:student_dorm/widgets/repair_detail/repair_timeline.dart' show formatDateShort, kRadiusLg;

/// เปิด modal "รายละเอียดคำร้องแจ้งซ่อม" แบบ bottom sheet
/// ข้อมูลที่แสดงทั้งหมดมาจาก [detail] ที่ดึงจาก backend (get_by_id) อยู่แล้ว ไม่มีการ mock ข้อมูลเพิ่ม
Future<void> showRequestDetailModal(
  BuildContext context,
  RepairDetail detail, {
  required int requestId,
  required void Function(int) onEditPressed,
}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => RequestDetailModal(
      detail: detail,
      requestId: requestId,
      onEditPressed: onEditPressed,
    ),
  );
}

/// ตรงกับ #requestModalOverlay > .modal-sheet ใน case_status.html/css
class RequestDetailModal extends StatelessWidget {
  const RequestDetailModal({
    super.key,
    required this.detail,
    required this.requestId,
    required this.onEditPressed,
  });

  final RepairDetail detail;
  final int requestId;
  final void Function(int) onEditPressed;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.88),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.only(topLeft: Radius.circular(28), topRight: Radius.circular(28)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // ── .modal-sheet__handle-bar ──
          const Padding(
            padding: EdgeInsets.fromLTRB(0, 10, 0, 4),
            child: Center(
              child: SizedBox(
                width: 38,
                height: 4,
                child: DecoratedBox(decoration: BoxDecoration(color: kGray200, borderRadius: BorderRadius.all(Radius.circular(99)))),
              ),
            ),
          ),
          _buildHeader(context),
          Flexible(
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(16, 18, 16, 28),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  _SectionHeader(
                    icon: Icons.badge,
                    iconColor: kBlue,
                    iconColorDark: kBlueDark,
                    title: 'ข้อมูลส่วนตัว',
                  ),
                  _DetailCard(
                    rows: [
                      _DetailRow(icon: Icons.person, label: 'ชื่อผู้แจ้ง', value: detail.studentName),
                      _DetailRow(icon: Icons.call, label: 'เบอร์โทรติดต่อ', value: detail.contactPhone),
                      _DetailRow(icon: Icons.meeting_room, label: 'หมายเลขห้อง', value: detail.roomNumber, isLast: true),
                    ],
                  ),
                  const SizedBox(height: 22),
                  _SectionHeader(
                    icon: Icons.report_problem,
                    iconColor: kAmber,
                    iconColorDark: kAmberDark,
                    title: 'รายงานปัญหา',
                  ),
                  _DetailCard(
                    rows: [
                      _DetailRow(
                        icon: Icons.construction,
                        label: 'ประเภทงาน',
                        chips: detail.typeNames,
                      ),
                      _DetailRow(icon: Icons.bug_report, label: 'ปัญหาที่แจ้ง', value: detail.description),
                      _DetailRow(
                        icon: Icons.key,
                        label: 'อนุญาตเข้าห้อง',
                        value: detail.allowEntry ? 'อนุญาตให้เข้าห้องได้' : 'ไม่อนุญาตให้เข้าห้อง',
                        valueColor: detail.allowEntry ? kGreenDark : kTextMuted,
                        isLast: true,
                      ),
                    ],
                  ),
                  const SizedBox(height: 22),
                  _SectionHeader(
                    icon: Icons.photo_library,
                    iconColor: kGreen,
                    iconColorDark: kGreenDark,
                    title: 'รูปภาพที่แนบ',
                    count: '0 รูป',
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(vertical: 28),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      border: Border.all(color: kGray200, width: 1.5),
                      borderRadius: BorderRadius.circular(kRadiusLg),
                    ),
                    child: Center(
                      child: Text('ยังไม่มีรูปภาพแนบ', style: TextStyle(fontSize: 13, color: kTextMuted)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ── .modal-header ──
  Widget _buildHeader(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(18, 14, 18, 16),
      decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: kGray200, width: 1.5))),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [kGoldMid, kGoldDark],
              ),
              borderRadius: BorderRadius.circular(12),
              boxShadow: const [BoxShadow(color: Color(0x24000000), blurRadius: 14, offset: Offset(0, 4))],
            ),
            child: const Icon(Icons.description, size: 20, color: kText),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'รายละเอียดคำร้องแจ้งซ่อม',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: kText, height: 1.3),
                ),
                const SizedBox(height: 3),
                Text.rich(
                  TextSpan(
                    style: TextStyle(fontSize: 11.5, fontWeight: FontWeight.w500, color: kTextMuted),
                    children: [
                      const TextSpan(text: 'รหัส Case: '),
                      TextSpan(text: detail.caseCode, style: const TextStyle(color: kText, fontWeight: FontWeight.w700)),
                      TextSpan(text: ' · ยื่นเมื่อ ${formatDateShort(detail.reportDate)}'),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Builder(builder: (context) {
            final canEdit = detail.statusId == 1;
            return Material(
              color: canEdit ? kBlue.withValues(alpha: 0.12) : kGray100,
              borderRadius: BorderRadius.circular(999),
              child: InkWell(
                borderRadius: BorderRadius.circular(999),
                onTap: canEdit
                    ? () {
                        Navigator.of(context).maybePop();
                        onEditPressed(requestId);
                      }
                    : null,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.edit, size: 16, color: canEdit ? kBlueDark : kGray400),
                      const SizedBox(width: 5),
                      Text(
                        'แก้ไข',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: canEdit ? kBlueDark : kGray400,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }),
          const SizedBox(width: 8),
          Material(
            color: kGray100,
            shape: const CircleBorder(),
            child: InkWell(
              customBorder: const CircleBorder(),
              onTap: () => Navigator.of(context).maybePop(),
              child: const SizedBox(
                width: 34,
                height: 34,
                child: Icon(Icons.close, size: 17, color: kTextMuted),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ── .modal-section__head ──
class _SectionHeader extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final Color iconColorDark;
  final String title;
  final String? count;

  const _SectionHeader({
    required this.icon,
    required this.iconColor,
    required this.iconColorDark,
    required this.title,
    this.count,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        children: [
          Container(
            width: 30,
            height: 30,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [iconColor, iconColorDark],
              ),
              borderRadius: BorderRadius.circular(9),
            ),
            child: Icon(icon, size: 16, color: Colors.white),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(title, style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700, color: kText)),
          ),
          if (count != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 2),
              decoration: BoxDecoration(
                color: kGray100,
                border: Border.all(color: kGray200),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(count!, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: kTextMuted)),
            ),
        ],
      ),
    );
  }
}

// ── .detail-card ──
class _DetailCard extends StatelessWidget {
  final List<_DetailRow> rows;

  const _DetailCard({required this.rows});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(color: kGray200, width: 1.5),
        borderRadius: BorderRadius.circular(kRadiusLg),
        boxShadow: const [BoxShadow(color: Color(0x0F000000), blurRadius: 14, offset: Offset(0, 2))],
      ),
      child: Column(children: rows),
    );
  }
}

// ── .detail-row ──
class _DetailRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String? value;
  final Color? valueColor;
  final List<String>? chips;
  final bool isLast;

  const _DetailRow({
    required this.icon,
    required this.label,
    this.value,
    this.valueColor,
    this.chips,
    this.isLast = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        border: isLast ? null : const Border(bottom: BorderSide(color: kGray200)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 32,
            height: 32,
            margin: const EdgeInsets.only(top: 1),
            decoration: BoxDecoration(color: kGray100, borderRadius: BorderRadius.circular(9)),
            child: Icon(icon, size: 16, color: kTextMuted),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: kTextMuted)),
                const SizedBox(height: 2),
                if (chips != null && chips!.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 3),
                    child: Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: chips!
                          .map((c) => Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                                decoration: BoxDecoration(
                                  color: kGoldMid.withValues(alpha: 0.16),
                                  borderRadius: BorderRadius.circular(7),
                                ),
                                child: Text(c, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF92400E))),
                              ))
                          .toList(),
                    ),
                  )
                else
                  Text(
                    (value == null || value!.isEmpty) ? '—' : value!,
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: valueColor ?? kText),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
