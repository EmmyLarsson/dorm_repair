import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:student_dorm/color/colors.dart';
import 'package:student_dorm/models/student_notification_model.dart';
import 'package:student_dorm/widgets/repair_detail/repair_timeline.dart' show stepVisual;

const List<String> _thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

/// แผ่นล่างรายการแจ้งเตือนของหน้าโฮม — แสดงผลอย่างเดียว (StatelessWidget)
/// รายการ/การกดอ่านทั้งหมด/การเปิดเคส อยู่ที่หน้าโฮมที่เป็นเจ้าของข้อมูล widget นี้แค่รับ callback มาเรียก
class NotificationSheet extends StatelessWidget {
  final List<StudentNotification> items;
  final ValueChanged<StudentNotification> onItemTap;
  final VoidCallback onMarkAllSeen;

  const NotificationSheet({
    super.key,
    required this.items,
    required this.onItemTap,
    required this.onMarkAllSeen,
  });

  DateTime? _parse(String sqlDateTime) => DateTime.tryParse(sqlDateTime.replaceFirst(' ', 'T'));

  bool _isToday(DateTime dt) {
    final now = DateTime.now();
    return dt.year == now.year && dt.month == now.month && dt.day == now.day;
  }

  String _timeLabel(String sqlDateTime) {
    final dt = _parse(sqlDateTime);
    if (dt == null) return '';
    final hm = '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
    return _isToday(dt) ? 'วันนี้ $hm' : '${dt.day} ${_thaiMonths[dt.month - 1]} $hm';
  }

  @override
  Widget build(BuildContext context) {
    final bool hasUnread = items.any((n) => n.isUnread);

    return SafeArea(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.78),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 40,
              height: 4,
              margin: const EdgeInsets.only(top: 10, bottom: 4),
              decoration: BoxDecoration(color: kGray200, borderRadius: BorderRadius.circular(2)),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 12, 8),
              child: Row(
                children: [
                  Text('การแจ้งเตือน', style: GoogleFonts.sarabun(fontSize: 17, fontWeight: FontWeight.w700, color: kNavy)),
                  const Spacer(),
                  if (hasUnread)
                    TextButton(
                      onPressed: onMarkAllSeen,
                      child: Text('อ่านทั้งหมดแล้ว',
                          style: GoogleFonts.sarabun(fontSize: 12.5, fontWeight: FontWeight.w700, color: kNavyMid)),
                    ),
                ],
              ),
            ),
            if (items.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
                child: Column(
                  children: [
                    Text('ยังไม่มีการแจ้งเตือน',
                        style: GoogleFonts.sarabun(fontSize: 15, fontWeight: FontWeight.w700, color: kGray700)),
                    const SizedBox(height: 4),
                    Text('เมื่อเจ้าหน้าที่อัปเดตงานซ่อมของคุณ จะแสดงที่นี่',
                        textAlign: TextAlign.center, style: GoogleFonts.sarabun(fontSize: 13, color: kGray500)),
                  ],
                ),
              )
            else
              Flexible(
                child: ListView.builder(
                  shrinkWrap: true,
                  padding: const EdgeInsets.fromLTRB(8, 0, 8, 14),
                  itemCount: items.length,
                  itemBuilder: (context, index) => _NotificationTile(
                    item: items[index],
                    timeLabel: _timeLabel(items[index].eventDate),
                    onTap: () => onItemTap(items[index]),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _NotificationTile extends StatelessWidget {
  final StudentNotification item;
  final String timeLabel;
  final VoidCallback onTap;

  const _NotificationTile({required this.item, required this.timeLabel, required this.onTap});

  @override
  Widget build(BuildContext context) {
    // ไอคอน/สี/ชื่อเหตุการณ์ใช้ชุดเดียวกับไทม์ไลน์ในหน้ารายละเอียด (stepVisual) ไม่แต่งซ้ำ
    final visual = stepVisual(item.stepCode);
    final title = visual.title.isNotEmpty ? visual.title : 'มีอัปเดตใหม่';
    final detail = item.stepDetail.isNotEmpty ? ' · ${item.stepDetail}' : '';

    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 11),
        decoration: BoxDecoration(
          color: item.isUnread ? const Color(0xFFF6F8FF) : Colors.transparent,
          borderRadius: BorderRadius.circular(14),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: visual.color.withValues(alpha: 0.18),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(visual.icon, size: 20, color: visual.colorDark),
            ),
            const SizedBox(width: 11),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: GoogleFonts.sarabun(fontSize: 13.5, fontWeight: FontWeight.w700, color: kGray700, height: 1.35)),
                  const SizedBox(height: 1),
                  Text('#${item.caseCode}$detail',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.sarabun(fontSize: 12, color: kGray500)),
                  Text(timeLabel, style: GoogleFonts.sarabun(fontSize: 11, color: kGray400)),
                ],
              ),
            ),
            if (item.isUnread)
              Container(
                width: 9,
                height: 9,
                margin: const EdgeInsets.only(top: 6),
                decoration: const BoxDecoration(color: Color(0xFFE11D48), shape: BoxShape.circle),
              ),
          ],
        ),
      ),
    );
  }
}
