import 'package:flutter/material.dart';
import 'package:student_dorm/color/colors.dart';
import 'package:student_dorm/models/repair_detail_model.dart';
import 'package:student_dorm/widgets/repair_timeline.dart';

/// .stepper — คำนวณ done/active/pending จาก progress_status_id จริงจาก backend
class RepairStepper extends StatelessWidget {
  final RepairDetail detail;
  final List<TimelineStep> timeline;

  const RepairStepper({super.key, required this.detail, required this.timeline});

  String? _eventDateOf(String stepCode) {
    for (final step in timeline) {
      if (step.stepCode == stepCode) return step.eventDate;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final isCancelled = detail.statusId == 4;
    final isDone = detail.statusId == 3;
    final isActive = detail.statusId == 2;

    double widthFactor;
    if (isDone) {
      widthFactor = 1.0;
    } else if (isActive || isCancelled) {
      widthFactor = 0.5;
    } else {
      widthFactor = 0.02;
    }

    final fillColors = isCancelled
        ? const [kSlateDark, kRsError]
        : const [kGreen, kBlue];

    final step2State = isCancelled
        ? StepState.pending
        : (isDone ? StepState.done : (isActive ? StepState.active : StepState.pending));
    final step3State = isDone ? StepState.done : StepState.pending;

    return SizedBox(
      height: 78,
      child: Stack(
        children: [
          Positioned(
            top: 21,
            left: 52,
            right: 52,
            child: Container(
              height: 3,
              decoration: BoxDecoration(
                color: kText.withValues(alpha: 0.14),
                borderRadius: BorderRadius.circular(99),
              ),
              child: FractionallySizedBox(
                alignment: Alignment.centerLeft,
                widthFactor: widthFactor,
                child: Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(colors: fillColors),
                    borderRadius: BorderRadius.circular(99),
                  ),
                ),
              ),
            ),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              StepNode(
                state: StepState.done,
                icon: Icons.check,
                label: 'ได้รับคำร้อง',
                date: formatDateShort(_eventDateOf('submitted') ?? detail.reportDate),
              ),
              StepNode(
                state: step2State,
                icon: Icons.build,
                label: isCancelled ? 'ถูกยกเลิก' : 'กำลังซ่อมแซม',
                date: isCancelled ? '—' : formatDateShort(detail.appointmentDate),
              ),
              StepNode(
                state: step3State,
                icon: Icons.verified,
                label: 'สำเร็จ',
                date: formatDateShort(detail.finishDate),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

enum StepState { done, active, pending }

class StepNode extends StatelessWidget {
  final StepState state;
  final IconData icon;
  final String label;
  final String date;

  const StepNode({super.key, required this.state, required this.icon, required this.label, required this.date});

  @override
  Widget build(BuildContext context) {
    final bool isPending = state == StepState.pending;
    final Color nodeColor = switch (state) {
      StepState.done => kGreen,
      StepState.active => kBlue,
      StepState.pending => Colors.white.withValues(alpha: 0.55),
    };

    return SizedBox(
      width: 76,
      child: Column(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: nodeColor,
              shape: BoxShape.circle,
              border: isPending ? Border.all(color: kText.withValues(alpha: 0.18), width: 2) : null,
              boxShadow: isPending
                  ? null
                  : [const BoxShadow(color: Color(0x24000000), blurRadius: 14, offset: Offset(0, 4))],
            ),
            child: Icon(
              icon,
              size: 19,
              color: isPending ? kText.withValues(alpha: 0.28) : Colors.white,
            ),
          ),
          const SizedBox(height: 6),
          Opacity(
            opacity: isPending ? 0.4 : 1,
            child: Text(
              label,
              textAlign: TextAlign.center,
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
