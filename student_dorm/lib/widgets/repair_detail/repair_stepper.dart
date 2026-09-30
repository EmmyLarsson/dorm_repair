import 'package:flutter/material.dart';
import 'package:student_dorm/color/colors.dart';
import 'package:student_dorm/models/repair_detail_model.dart';
import 'package:student_dorm/widgets/repair_detail/repair_timeline.dart';

/// .stepper — 3 จุด (ตรวจสอบคำร้อง → ซ่อม → สำเร็จ/ไม่สำเร็จ) คำนวณข้อความ/สี/วันที่จาก progress_status_id
/// และ timeline จริงจาก backend (ตรงกับ SQL): สถานะ 1 รอตรวจสอบ, 2 อยู่ระหว่างซ่อม, 3 เสร็จสิ้น (รอนักศึกษา
/// ยืนยัน), 4 ปฏิเสธ/ยกเลิก, 5 รอแก้ไข, 6 สำเร็จ, 7 รอตรวจสอบคำร้อง (อุทธรณ์), 8 ซ่อมไม่สำเร็จ
class RepairStepper extends StatelessWidget {
  final RepairDetail detail;
  final List<TimelineStep> timeline;

  const RepairStepper({
    super.key,
    required this.detail,
    required this.timeline,
  });

  String? _firstEventDateOf(String stepCode) {
    for (final step in timeline) {
      if (step.stepCode == stepCode) return step.eventDate;
    }
    return null;
  }

  // เคสหนึ่งเกิด step ซ้ำได้หลายรอบ (ส่งงาน/ยื่นคำร้อง/อนุมัติคำร้อง) ต้องใช้วันที่ของครั้งล่าสุดเสมอ
  String? _latestEventDateOf(String stepCode) {
    for (final step in timeline.reversed) {
      if (step.stepCode == stepCode) return step.eventDate;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final statusId = detail.statusId;
    final hasApproved = timeline.any((s) => s.stepCode == 'approved');
    // จำนวนคำร้องอุทธรณ์ที่อนุมัติแล้ว = เคสนี้เข้ารอบแก้ไขไปแล้วกี่รอบ (0 = ยังเป็นการซ่อมครั้งแรก)
    final revisionRound = timeline.where((s) => s.stepCode == 'complaint_approved').length;
    // สถานะ 4 ใช้ร่วมกันทั้ง "ปฏิเสธตั้งแต่ตรวจสอบ" (ยังไม่เคยอนุมัติ) กับ "ยกเลิกหลังอนุมัติแล้ว" แยกด้วย step approved
    final isRejectedAtReview = statusId == 4 && !hasApproved;
    final isCancelledAfterApproval = statusId == 4 && hasApproved;

    // ── จุดซ้าย: ขั้นตรวจสอบคำร้องแจ้งซ่อม ──
    final String leftLabel;
    final StepState leftState;
    final IconData leftIcon;
    final String? leftDate;
    if (isRejectedAtReview) {
      leftLabel = 'ปฏิเสธ';
      leftState = StepState.error;
      leftIcon = Icons.close;
      leftDate = _latestEventDateOf('cancelled');
    } else if (statusId == 1) {
      leftLabel = 'รอตรวจสอบ';
      leftState = StepState.waiting;
      leftIcon = Icons.hourglass_top;
      leftDate = _firstEventDateOf('submitted') ?? detail.reportDate;
    } else {
      leftLabel = 'อนุมัติ';
      leftState = StepState.done;
      leftIcon = Icons.check;
      leftDate = _firstEventDateOf('approved') ?? _firstEventDateOf('submitted') ?? detail.reportDate;
    }

    // ── จุดกลาง: ขั้นซ่อม/แก้ไข ──
    final String midLabel;
    final StepState midState;
    final IconData midIcon;
    final String? midDate;
    if (isRejectedAtReview || statusId == 1) {
      midLabel = 'รอซ่อม';
      midState = StepState.pending;
      midIcon = Icons.build;
      midDate = null;
    } else if (isCancelledAfterApproval) {
      midLabel = 'ถูกยกเลิก';
      midState = StepState.error;
      midIcon = Icons.close;
      midDate = _latestEventDateOf('cancelled');
    } else if (statusId == 2) {
      midLabel = 'รอซ่อม';
      midState = StepState.active;
      midIcon = Icons.build;
      midDate = detail.appointmentDate;
    } else if (statusId == 7) {
      midLabel = 'รอตรวจสอบอุทธรณ์';
      midState = StepState.waiting;
      midIcon = Icons.build;
      midDate = _latestEventDateOf('complaint_filed');
    } else if (statusId == 5) {
      midLabel = 'รอแก้ไข';
      midState = StepState.active;
      midIcon = Icons.build;
      midDate = _latestEventDateOf('complaint_approved');
    } else if (statusId == 3) {
      // ส่งงานครั้งแรก = เสร็จสิ้นการซ่อม / ส่งงานหลังแก้ไข = รอนักศึกษาตรวจงานที่แก้
      midLabel = revisionRound == 0 ? 'เสร็จสิ้นการซ่อม' : 'รอตรวจสอบ';
      // หลังส่งงานรอบแก้ไข ยังรอนักศึกษาตรวจงานที่แก้ จึงเป็นสีส้ม "รอ" ไม่ใช่เขียว "เสร็จแล้ว"
      midState = revisionRound == 0 ? StepState.done : StepState.waiting;
      midIcon = Icons.build;
      midDate = _latestEventDateOf('completed');
    } else {
      midLabel = revisionRound == 0 ? 'เสร็จสิ้นการซ่อม' : 'แก้ไขเสร็จสิ้น';
      midState = StepState.done;
      midIcon = Icons.build;
      midDate = _latestEventDateOf('completed');
    }

    // ── จุดขวา: มีแค่ 2 ผลลัพธ์เท่านั้น "สำเร็จ" (เขียว, สถานะ 6 นักศึกษากดยอมรับ) กับ "ไม่สำเร็จ" (แดง,
    // สถานะ 8 นักศึกษาไม่ยอมรับ) — ทุกสถานะก่อนหน้านั้น (รวมสถานะ 3 "ซ่อมเสร็จ รอนักศึกษายืนยัน") ยังถือว่า
    // อยู่ในโดเมนจุดกลาง ยังไม่ถึงขวา จุดขวาจึงต้องเป็นสีเทา (pending) ไปก่อนจนกว่าจะมีผลสรุปจริง
    final bool isFailed = statusId == 8;
    final StepState rightState = statusId == 6
        ? StepState.done
        : (isFailed ? StepState.error : StepState.pending);
    final String? rightDate = statusId == 6
        ? (_latestEventDateOf('accepted') ?? detail.finishDate)
        : (isFailed ? (_latestEventDateOf('declined') ?? detail.finishDate) : null);

    // เส้นเชื่อมแบบ "แถบเดียวต่อเนื่อง" (รื้อจากเดิมที่เป็น 2 ท่อนแยกอิสระ ต้องรอจุดปลายทั้งคู่ done พร้อมกัน
    // เส้นถึงติด — ปัญหาคือจุดกลางมักเป็น active/waiting ไม่ใช่ done ระหว่างงานกำลังเดิน ทำให้เส้นไม่ขยับทั้งที่
    // งานเดินหน้าไปแล้วจริง) ตาม Prototype/Student/case_status.css: ดูว่า "จุดขวาสุดที่ไปถึงแล้ว" (ไม่ใช่
    // pending) คือจุดไหน แล้วให้แถบยาวไปถึงตำแหน่งนั้นเลย ไม่ต้องรอให้จุดนั้น "เสร็จ" ก่อน
    final bool midReached = midState != StepState.pending;
    final bool rightReached = rightState != StepState.pending;
    final int lastReachedIndex = rightReached ? 2 : (midReached ? 1 : 0);
    final double progressFraction = lastReachedIndex / 2; // 0.0 / 0.5 / 1.0 ตรงตำแหน่งจุดซ้าย/กลาง/ขวา

    return SizedBox(
      // สูงกว่าเดิมเล็กน้อยเผื่อข้อความยาว (เช่น "รอตรวจสอบอุทธรณ์") ตัดขึ้นเป็น 2 บรรทัด
      height: 94,
      child: Stack(
        children: [
          Positioned(
            top: 19, // กึ่งกลางวงกลม (42/2 = 21) ลบครึ่งหนึ่งของความหนาเส้น (4/2) ให้เส้นอยู่กลางวงกลมพอดี
            left: 52,
            right: 52,
            child: LayoutBuilder(
              builder: (context, constraints) {
                final double trackWidth = constraints.maxWidth;
                return Stack(
                  children: [
                    // พื้นเส้นเต็มความกว้าง (ยังไม่ถึง)
                    Container(
                      height: 4,
                      decoration: BoxDecoration(color: kGray200, borderRadius: BorderRadius.circular(99)),
                    ),
                    // แถบไล่สี 3 จุด (ซ้าย→กลาง→ขวา) วาดเต็มความยาวเส้นเสมอ โดย stop วางตรงตำแหน่งจริงของแต่ละ
                    // จุด (0% / 50% / 100%) ตามสีจริงของวงกลม ณ ขณะนั้น จากนั้น "เผย" ออกมาแค่ส่วนที่ไปถึงแล้ว
                    // ด้วย Align+ClipRect (widthFactor) — ทำแบบนี้แทนไล่สีในกล่องที่แคบกว่าเอง เพราะกล่องแคบจะ
                    // ทำให้ gradient หดตามไปด้วย สีตรงตำแหน่งจุดกลางจะไม่ตรงกับสีจุดกลางจริงถ้าไปถึงจุดขวาแล้ว
                    // (ช่วงกลาง→ขวาต้องไล่จากสีจุดกลางไปสีจุดขวา ไม่ใช่ข้ามจุดกลางไปเลย) ไม่มีสีทึบพิเศษสำหรับ
                    // เคสล้มเหลวอีกต่อไป — StepState.error มีสีแดงอยู่แล้ว ปล่อยให้ไล่สีเป็นเขียว→แดงตรงจุดที่
                    // ล้มเหลวจริง (เช่น ยกเลิกกลางคัน = เขียว→แดงที่ครึ่งแรก, ไม่สำเร็จ = เขียวครึ่งแรกไล่เป็น
                    // แดงในครึ่งหลัง) สื่อความหมายชัดกว่าสีแดงทึบคลุมทั้งเส้น
                    ClipRect(
                      child: Align(
                        alignment: Alignment.centerLeft,
                        widthFactor: progressFraction,
                        child: Container(
                          width: trackWidth,
                          height: 4,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              stops: const [0.0, 0.5, 1.0],
                              colors: [leftState.color, midState.color, rightState.color],
                            ),
                            borderRadius: BorderRadius.circular(99),
                          ),
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              StepNode(
                state: leftState,
                icon: leftIcon,
                label: leftLabel,
                date: formatDateShort(leftDate),
              ),
              StepNode(
                state: midState,
                icon: midIcon,
                label: midLabel,
                date: formatDateShort(midDate),
              ),
              StepNode(
                state: rightState,
                icon: isFailed ? Icons.close : Icons.verified,
                label: isFailed ? 'ไม่สำเร็จ' : 'สำเร็จ',
                date: formatDateShort(rightDate),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// done = เสร็จแล้ว (เขียว), active = กำลังทำ (ฟ้า), waiting = รอผู้ตัดสิน (ส้ม), error = ปฏิเสธ/ยกเลิก (แดง),
// pending = ยังไม่ถึง (เทา)
enum StepState {
  done(kGreen),
  active(kBlue),
  waiting(Color(0xFFEA580C)),
  error(kRsError),
  pending(Color(0xFFB8BCC4));

  const StepState(this.color);
  final Color color;
}

class StepNode extends StatelessWidget {
  final StepState state;
  final IconData icon;
  final String label;
  final String date;

  const StepNode({super.key, required this.state, required this.icon, required this.label, required this.date});

  @override
  Widget build(BuildContext context) {
    final bool isPending = state == StepState.pending;

    return SizedBox(
      width: 76,
      child: Column(
        children: [
          // จุด pending เป็นวงแหวนโปร่งใสตาม Prototype/Student/case_status.css (.step--pending .step__node)
          // แทนวงกลมทึบสีเทาเดิม — สื่อว่า "ยังไม่ถึง" ชัดกว่าวงกลมทึบซึ่งดูเหมือนเป็นสถานะหนึ่งที่ "เกิดแล้ว"
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: isPending ? Colors.white.withValues(alpha: 0.55) : state.color,
              shape: BoxShape.circle,
              border: isPending ? Border.all(color: kGray200, width: 2) : null,
              boxShadow: isPending
                  ? null
                  : [const BoxShadow(color: Color(0x24000000), blurRadius: 14, offset: Offset(0, 4))],
            ),
            child: Icon(icon, size: 19, color: isPending ? kTextMuted : Colors.white),
          ),
          const SizedBox(height: 6),
          Opacity(
            opacity: isPending ? 0.55 : 1,
            child: Text(
              label,
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: kText, height: 1.3),
            ),
          ),
          Text(
            date,
            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w500, color: kText.withValues(alpha: 0.52)),
          ),
        ],
      ),
    );
  }
}
