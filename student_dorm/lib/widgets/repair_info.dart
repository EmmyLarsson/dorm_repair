import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:student_dorm/models/repair_request_model.dart';
import 'package:student_dorm/color/colors.dart';
import 'package:student_dorm/screen/repair_detail_screen.dart';

class RepairInfo extends StatelessWidget {
  const RepairInfo({super.key, required this.repairrequestModelStore, this.onReturn});
  final List<RepairRequestModel> repairrequestModelStore;
  final VoidCallback? onReturn;

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: repairrequestModelStore.length,
      itemBuilder: (context, index) {
        return RepairInfoCard(item: repairrequestModelStore[index], onReturn: onReturn);
      },
    );
  }
}

class RepairInfoCard extends StatelessWidget {
  const RepairInfoCard({super.key, required this.item, this.onReturn, this.note, this.noteColor});
  final RepairRequestModel item;
  // เรียกเมื่อกลับมาจากหน้ารายละเอียด (เผื่อผู้ใช้แก้ไขคำร้องแล้วรายการเดิมค้างข้อมูลเก่า)
  final VoidCallback? onReturn;
  // ป้ายไฮไลต์เล็กๆ ใต้ปัญหา เช่น "เลยช่วงเวลานัดหมายแล้ว" / "เจ้าหน้าที่อนุมัติคำร้องแล้ว" — ส่งมาจากหน้าโฮมที่แบ่งส่วนเท่านั้น
  // (ไม่ส่ง = ไม่มีป้าย เหมือนเดิม จึงไม่กระทบหน้าอื่นที่ใช้การ์ดนี้ เช่น หน้าประวัติ)
  final String? note;
  final Color? noteColor;

  @override
  Widget build(BuildContext context) {
    final textTheme = GoogleFonts.sarabunTextTheme(Theme.of(context).textTheme);
    final barColor = kStatusColors[item.statusId] ?? kNavyMid;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: Material(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        elevation: 0,
        child: InkWell(
          borderRadius: BorderRadius.circular(18),
          onTap: () async {
            await Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => CaseStatusScreen(requestId: item.requestId),
              ),
            );

            onReturn?.call();
          },
          child: Stack(
            children: [
              Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: kGray200),
                  boxShadow: [
                    BoxShadow(
                      color: kNavy.withOpacity(0.06),
                      blurRadius: 16,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: IntrinsicHeight(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Container(
                        width: 5,
                        decoration: BoxDecoration(
                          color: barColor,
                          borderRadius: const BorderRadius.only(
                            topLeft: Radius.circular(18),
                            bottomLeft: Radius.circular(18),
                          ),
                        ),
                      ),
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Column(
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
                                      '#${item.caseCode}',
                                      style: textTheme.titleMedium?.copyWith(
                                        fontSize: 17,
                                        fontWeight: FontWeight.w700,
                                        color: kNavy,
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    Text(
                                      'ปัญหา',
                                      style: textTheme.bodySmall?.copyWith(
                                        fontSize: 11.5,
                                        color: kGray500,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      item.description,
                                      style: textTheme.bodyMedium?.copyWith(
                                        fontSize: 13.5,
                                        fontWeight: FontWeight.w600,
                                        color: kGray700,
                                      ),
                                    ),
                                    if (note != null)
                                      Container(
                                        margin: const EdgeInsets.only(top: 8),
                                        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: (noteColor ?? kNavyMid).withValues(alpha: 0.14),
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Text(
                                          note!,
                                          style: GoogleFonts.sarabun(
                                            fontSize: 11.5,
                                            fontWeight: FontWeight.w700,
                                            color: noteColor ?? kNavyMid,
                                          ),
                                        ),
                                      ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 12),
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
                                    item.createdAt,
                                    style: textTheme.bodyMedium?.copyWith(
                                      fontSize: 13.5,
                                      fontWeight: FontWeight.w600,
                                      color: kGray700,
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  Container(
                                    width: 32,
                                    height: 32,
                                    decoration: const BoxDecoration(
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
                    ],
                  ),
                ),
              ),
              // จุดแดง = เจ้าหน้าที่อัปเดตเคสนี้หลังจากนักศึกษาเปิดดูล่าสุด (backend คำนวณ has_unread) หายเมื่อเปิดเคส
              if (item.hasUnread)
                Positioned(
                  top: 10,
                  right: 10,
                  child: Container(
                    width: 10,
                    height: 10,
                    decoration: BoxDecoration(
                      color: const Color(0xFFE11D48),
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 1.5),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
