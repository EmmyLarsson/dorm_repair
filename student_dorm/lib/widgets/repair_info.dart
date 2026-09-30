import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:student_dorm/models/repair_request_model.dart';
import 'package:student_dorm/color/colors.dart';
import 'package:student_dorm/screen/repair_detail_screen.dart';

const kStatusBarColors = {
  'รอตรวจสอบ': kRsAmber,
  'กำลังซ่อม': kNavyMid,
  // ชื่อสถานะจริงจาก backend คือ "เสร็จสิ้น" ไม่ใช่ "เสร็จแล้ว" — คีย์เดิมเลยไม่เคยแมตช์เลยสักครั้ง
  // (fallback เป็น kNavyMid สีเดียวกับ "กำลังซ่อม" มาตลอด) แก้ชื่อให้ตรง พร้อมเพิ่ม 2 สถานะใหม่
  'เสร็จสิ้น': kRsGreen,
  'ยกเลิก': kRsError,
  'รอแก้ไข': kGoldDark,
  'สำเร็จ': kGreenDark,
  // progress_status_id 7 ใหม่ — เคสที่มีคำร้องอุทธรณ์ค้าง รอเจ้าหน้าที่ตัดสินใจ (ได้รับอนุญาตจากผู้ใช้
  // ให้เพิ่มบรรทัดนี้แม้ไฟล์นี้จะล็อกไว้ ไม่งั้นแถบสีจะตกไปใช้สีเทา default)
  'รอตรวจสอบคำร้อง': kRsAmber,
  // progress_status_id 8 ใหม่ — เคสปิดแบบนักศึกษาไม่ยอมรับผลซ่อม (เพิ่มบรรทัดเดียวเพราะไม่งั้นแถบสีตกไปใช้ default
  // ผู้ใช้อนุญาตให้แก้ไฟล์ล็อกนี้ได้เช่นเดียวกับบรรทัดของสถานะ 7)
  'ซ่อมไม่สำเร็จ': kRsError,
};

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
  const RepairInfoCard({super.key, required this.item, this.onReturn});
  final RepairRequestModel item;
  // เรียกเมื่อกลับมาจากหน้ารายละเอียด (เผื่อผู้ใช้แก้ไขคำร้องแล้วรายการเดิมค้างข้อมูลเก่า)
  final VoidCallback? onReturn;

  @override
  Widget build(BuildContext context) {
    final textTheme = GoogleFonts.sarabunTextTheme(Theme.of(context).textTheme);
    final barColor = kStatusBarColors[item.statusName] ?? kNavyMid;

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
          child: Container(
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
            ),
          ),
        );
  }
}
