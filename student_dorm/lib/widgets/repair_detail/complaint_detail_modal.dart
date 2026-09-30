import 'package:flutter/material.dart';
import 'package:student_dorm/color/colors.dart';
import 'package:student_dorm/models/repair_detail_model.dart' show RepairPhoto;
import 'package:student_dorm/screen/photo_viewer_screen.dart';
import 'package:student_dorm/widgets/repair_detail/repair_timeline.dart' show formatDateShort, kRadiusLg;

/// เปิด modal "รายละเอียดคำร้องแจ้งแก้ไข" แบบ bottom sheet — โครงหน้าตาเดียวกับ
/// showRequestDetailModal (คำร้องแจ้งซ่อมเดิม) แต่เนื้อหาเป็นของคำร้องอุทธรณ์แทน
/// รับข้อมูลเป็นค่าดิบตรงๆ (ไม่รับ _ComplaintInfo เพราะเป็น private type ของ repair_detail_screen.dart)
Future<void> showComplaintDetailModal(
  BuildContext context, {
  required String caseCode,
  required int ordinal,
  required String complaintText,
  required List<String> photoUrls,
  required String? filedAt,
  required bool canEdit,
  required VoidCallback onEditPressed,
  String? reasonCategoryName,
}) {
  return showModalBottomSheet(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => ComplaintDetailModal(
      caseCode: caseCode,
      ordinal: ordinal,
      complaintText: complaintText,
      photoUrls: photoUrls,
      filedAt: filedAt,
      canEdit: canEdit,
      onEditPressed: onEditPressed,
      reasonCategoryName: reasonCategoryName,
    ),
  );
}

class ComplaintDetailModal extends StatelessWidget {
  const ComplaintDetailModal({
    super.key,
    required this.caseCode,
    required this.ordinal,
    required this.complaintText,
    required this.photoUrls,
    required this.filedAt,
    required this.canEdit,
    required this.onEditPressed,
    this.reasonCategoryName,
  });

  final String caseCode;
  final int ordinal;
  final String complaintText;
  final List<String> photoUrls;
  final String? filedAt;
  final bool canEdit;
  final VoidCallback onEditPressed;
  final String? reasonCategoryName;

  @override
  Widget build(BuildContext context) {
    final photos = [
      for (int i = 0; i < photoUrls.length; i++) RepairPhoto(photoId: i, photoUrl: photoUrls[i]),
    ];

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
                  if (reasonCategoryName != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 14),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: kAmber.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(999),
                          border: Border.all(color: kAmber.withValues(alpha: 0.35)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.label, size: 14, color: kAmberDark),
                            const SizedBox(width: 6),
                            Text(
                              reasonCategoryName!,
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: kAmberDark),
                            ),
                          ],
                        ),
                      ),
                    ),
                  _SectionHeader(
                    icon: Icons.report_problem,
                    iconColor: kAmber,
                    iconColorDark: kAmberDark,
                    title: 'รายละเอียดที่แจ้ง',
                  ),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      border: Border.all(color: kGray200, width: 1.5),
                      borderRadius: BorderRadius.circular(kRadiusLg),
                      boxShadow: const [BoxShadow(color: Color(0x0F000000), blurRadius: 14, offset: Offset(0, 2))],
                    ),
                    child: Text(
                      complaintText.isEmpty ? '—' : complaintText,
                      style: const TextStyle(fontSize: 14, height: 1.6, color: kText),
                    ),
                  ),
                  const SizedBox(height: 22),
                  _SectionHeader(
                    icon: Icons.photo_library,
                    iconColor: kGreen,
                    iconColorDark: kGreenDark,
                    title: 'รูปภาพที่แนบ',
                    count: '${photos.length} รูป',
                  ),
                  if (photos.isEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(vertical: 28),
                      decoration: BoxDecoration(
                        color: kGray50,
                        border: Border.all(color: kGray200, width: 1.5),
                        borderRadius: BorderRadius.circular(kRadiusLg),
                      ),
                      child: Column(
                        children: [
                          const Icon(Icons.photo_outlined, size: 28, color: kGray400),
                          const SizedBox(height: 8),
                          const Text('ยังไม่มีรูปภาพแนบ', style: TextStyle(fontSize: 13, color: kTextMuted)),
                        ],
                      ),
                    )
                  else
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: kGray50,
                        border: Border.all(color: kGray200, width: 1.5),
                        borderRadius: BorderRadius.circular(kRadiusLg),
                      ),
                      child: GridView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: photos.length,
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 3,
                          crossAxisSpacing: 8,
                          mainAxisSpacing: 8,
                        ),
                        itemBuilder: (context, index) {
                          return Container(
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: kGray200, width: 1.5),
                              boxShadow: const [
                                BoxShadow(color: Color(0x0F000000), blurRadius: 10, offset: Offset(0, 3)),
                              ],
                            ),
                            clipBehavior: Clip.antiAlias,
                            child: Material(
                              color: kGray100,
                              child: InkWell(
                                onTap: () => Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) => PhotoViewerScreen(
                                      photos: photos,
                                      initialIndex: index,
                                      caseCode: caseCode,
                                    ),
                                  ),
                                ),
                                child: Stack(
                                  fit: StackFit.expand,
                                  children: [
                                    Image.network(
                                      photoFullUrl(photos[index].photoUrl),
                                      fit: BoxFit.cover,
                                      errorBuilder: (context, error, stackTrace) => Container(
                                        color: kGray100,
                                        child: const Icon(Icons.broken_image, color: kGray400),
                                      ),
                                      loadingBuilder: (context, child, progress) {
                                        if (progress == null) return child;
                                        return Container(
                                          color: kGray100,
                                          child: const Center(
                                            child: SizedBox(
                                              width: 20,
                                              height: 20,
                                              child: CircularProgressIndicator(strokeWidth: 2),
                                            ),
                                          ),
                                        );
                                      },
                                    ),
                                    Positioned(
                                      right: 5,
                                      bottom: 5,
                                      child: Container(
                                        width: 22,
                                        height: 22,
                                        decoration: BoxDecoration(
                                          color: Colors.black.withValues(alpha: 0.45),
                                          shape: BoxShape.circle,
                                        ),
                                        child: const Icon(Icons.zoom_in, size: 13, color: Colors.white),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  if (!canEdit) ...[
                    const SizedBox(height: 14),
                    Text(
                      'คำร้องนี้แก้ไขไม่ได้แล้ว (เจ้าหน้าที่เริ่มตรวจสอบหรือตัดสินคำร้องแล้ว หรือคุณแก้ไขครบสิทธิ์แล้ว)',
                      style: const TextStyle(fontSize: 12, color: kTextMuted, height: 1.5),
                    ),
                  ],
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
                colors: [kAmber, kAmberDark],
              ),
              borderRadius: BorderRadius.circular(12),
              boxShadow: const [BoxShadow(color: Color(0x24000000), blurRadius: 14, offset: Offset(0, 4))],
            ),
            child: const Icon(Icons.report_problem, size: 20, color: Colors.white),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'รายละเอียดคำร้องแจ้งแก้ไข (ครั้งที่ $ordinal)',
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: kText, height: 1.3),
                ),
                const SizedBox(height: 3),
                Text.rich(
                  TextSpan(
                    style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w500, color: kTextMuted),
                    children: [
                      const TextSpan(text: 'รหัส Case: '),
                      TextSpan(text: caseCode, style: const TextStyle(color: kText, fontWeight: FontWeight.w700)),
                      if (filedAt != null) TextSpan(text: ' · ยื่นเมื่อ ${formatDateShort(filedAt)}'),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Material(
            color: canEdit ? kBlue.withValues(alpha: 0.12) : kGray100,
            borderRadius: BorderRadius.circular(999),
            child: InkWell(
              borderRadius: BorderRadius.circular(999),
              onTap: canEdit
                  ? () {
                      Navigator.of(context).pop();
                      Future.microtask(onEditPressed);
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
          ),
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

// ── .modal-section__head ── (คัดลอกจาก request_detail_modal.dart เพราะเป็น private class ข้ามไฟล์ไม่ได้)
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
