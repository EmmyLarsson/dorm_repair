import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:student_dorm/color/colors.dart';
import 'package:student_dorm/widgets/work_type_chip.dart';

class ProblemReportCard extends StatelessWidget {
  const ProblemReportCard({
    super.key,
    required this.descriptionController,
    required this.selectedRepairTypeIds,
    required this.errorWorkType,
    required this.errorDescription,
    required this.onWorkTypeSelected,
    required this.onDescriptionChanged,
  });

  final TextEditingController descriptionController;
  final List<int> selectedRepairTypeIds;

  final bool errorWorkType;
  final bool errorDescription;

  final ValueChanged<String> onWorkTypeSelected;
  final ValueChanged<String> onDescriptionChanged;

  @override
  Widget build(BuildContext context) {
    return _card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              _iconBadge(Icons.build, bg: const Color(0xFFE8EDFF), fg: kRsBlue),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _cardTitle('รายงานปัญหา'),
                    _cardSub('ระบุรายละเอียดความเสียหาย'),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),

          _fieldLabel(Icons.category_outlined, 'ประเภทงาน'),
          const SizedBox(height: 6),

          LayoutBuilder(
            builder: (context, constraints) {
              const int columns = 3;
              const double gap = 9;

              final double cellWidth =
                  (constraints.maxWidth - gap * (columns - 1)) / columns;

              return Wrap(
                spacing: gap,
                runSpacing: gap,
                children: kWorkTypes.map((wt) {
                  return SizedBox(
                    width: cellWidth,
                    child: WorkTypeChip(
                      workType: wt,
                      isSelected: selectedRepairTypeIds.contains(
                        int.parse(wt.id),
                      ),
                      onTap: () => onWorkTypeSelected(wt.id),
                    ),
                  );
                }).toList(),
              );
            },
          ),

          if (errorWorkType) ...[
            const SizedBox(height: 6),
            Text(
              'กรุณาเลือกประเภทงาน',
              style: GoogleFonts.sarabun(
                fontSize: 11.5,
                fontWeight: FontWeight.w500,
                color: kRsError,
              ),
            ),
          ],

          const SizedBox(height: 14),

          _fieldLabel(Icons.edit_note, 'รายละเอียดปัญหา'),
          const SizedBox(height: 6),

          TextField(
            controller: descriptionController,
            maxLines: 4,
            style: GoogleFonts.sarabun(fontSize: 15, color: kRsOnSurface),
            decoration: _fieldDecoration(
              hint:
                  "อธิบายปัญหาที่พบให้ชัดเจน เช่น 'หลอดไฟห้องน้ำดับไม่ติดแม้เปลี่ยนหลอดแล้ว'",
              isError: errorDescription,
            ),
            onChanged: onDescriptionChanged,
          ),

          if (errorDescription) ...[
            const SizedBox(height: 4),
            Text(
              'กรุณาระบุรายละเอียดปัญหา',
              style: GoogleFonts.sarabun(
                fontSize: 11.5,
                fontWeight: FontWeight.w500,
                color: kRsError,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _card({required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: const Color(0xFFD0C6AB).withValues(alpha: 0.35),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 3,
            offset: const Offset(0, 1),
          ),
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 20,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: child,
    );
  }

  Widget _iconBadge(IconData icon, {required Color bg, required Color fg}) {
    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(14),
      ),
      alignment: Alignment.center,
      child: Icon(icon, size: 22, color: fg),
    );
  }

  Widget _cardTitle(String text) {
    return Text(
      text,
      style: GoogleFonts.sarabun(
        fontSize: 15.5,
        fontWeight: FontWeight.w700,
        color: kRsOnSurface,
        height: 1.25,
      ),
    );
  }

  Widget _cardSub(String text) {
    return Padding(
      padding: const EdgeInsets.only(top: 1),
      child: Text(
        text,
        style: GoogleFonts.sarabun(
          fontSize: 11,
          fontWeight: FontWeight.w500,
          color: kRsMuted,
        ),
      ),
    );
  }

  Widget _fieldLabel(IconData icon, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: kRsMuted),
        const SizedBox(width: 5),
        Text(
          text,
          style: GoogleFonts.sarabun(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: kRsOnSurfaceVar,
            letterSpacing: 0.4,
          ),
        ),
      ],
    );
  }

  InputDecoration _fieldDecoration({
    required String hint,
    required bool isError,
  }) {
    OutlineInputBorder border(Color color, double width) {
      return OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: BorderSide(color: color, width: width),
      );
    }

    final Color baseBorder = isError ? kRsError : kRsFieldBorder;

    return InputDecoration(
      hintText: hint,
      hintStyle: GoogleFonts.sarabun(
        fontSize: 14,
        color: const Color(0xFFC0B8A8),
      ),
      filled: true,
      fillColor: kRsFieldBg,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
      border: border(baseBorder, 1.5),
      enabledBorder: border(baseBorder, 1.5),
      focusedBorder: border(isError ? kRsError : kRsBlue, 1.5),
      errorBorder: border(kRsError, 1.5),
    );
  }
}
