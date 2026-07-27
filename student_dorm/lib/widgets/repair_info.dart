import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:student_dorm/models/repair_request_model.dart';
import 'package:student_dorm/color/colors.dart';

const _statusBar = {
  'รอตรวจสอบ': Color(0xFFF59E0B),
  'กำลังซ่อม': Color(0xFF3F5D9C),
  'เสร็จแล้ว': Color(0xFF16A34A),
};

class RepairInfo extends StatelessWidget {
  const RepairInfo({super.key, required this.repairrequestModelStore});
  final List<RepairRequestModel> repairrequestModelStore;

  @override
  Widget build(BuildContext context) {
    final textTheme = GoogleFonts.sarabunTextTheme(Theme.of(context).textTheme);
    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: repairrequestModelStore.length,
      itemBuilder: (context, index) {
        final RepairRequestModel item = repairrequestModelStore[index];
        final barColor = _statusBar[item.statusName] ?? kNavyMid;

        return Container(
          margin: const EdgeInsets.only(bottom: 12),
          child: Material(
            color: Colors.white,
            borderRadius: BorderRadius.circular(18),
            elevation: 0,
            child: InkWell(
              borderRadius: BorderRadius.circular(18),
              onTap: () {
                // TODO: นำทางไปหน้ารายละเอียด
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
        );
      },
    );
  }
}
