import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:student_dorm/color/colors.dart';
import 'package:student_dorm/utils/app_api.dart';

/// ผลที่ได้จากป๊อปอัปเร่งงาน — เหตุผลที่เลือก (id จากตาราง rush_reason) + ข้อความเพิ่มเติม (ว่างได้ ยกเว้นข้อ "อื่นๆ")
class RushRequestInput {
  final int reasonId;
  final String note;

  const RushRequestInput({required this.reasonId, required this.note});
}

Future<RushRequestInput?> showRushDialog(BuildContext context) {
  return showDialog<RushRequestInput>(
    context: context,
    builder: (_) => const _RushDialog(),
  );
}

class _RushReason {
  final int id;
  final String name;

  const _RushReason(this.id, this.name);

  // backend บังคับให้ข้อที่ขึ้นต้น "อื่นๆ" ต้องมีข้อความระบุเพิ่ม (ตรวจซ้ำที่ server) — ฝั่งแอปตรวจก่อนเพื่อไม่ให้เสียเวลายิง API
  bool get needsNote => name.startsWith('อื่นๆ');
}

/// ป๊อปอัปกลางจอเลือกเหตุผลก่อนส่งคำขอเร่งงาน — เป็น Stateful เพราะต้องจำเหตุผลที่เลือก/ข้อความที่พิมพ์/สถานะโหลดรายการ
/// ซึ่งเปลี่ยนจากการกระทำของผู้ใช้ภายในป๊อปอัปเอง (ไม่ใช่ข้อมูลที่ parent ส่งมา)
class _RushDialog extends StatefulWidget {
  const _RushDialog();

  @override
  State<_RushDialog> createState() => _RushDialogState();
}

class _RushDialogState extends State<_RushDialog> {
  final TextEditingController _noteController = TextEditingController();
  List<_RushReason> _reasons = [];
  bool _isLoading = true;
  String? _loadError;
  int? _selectedId;
  String? _noteError;

  @override
  void initState() {
    super.initState();
    _loadReasons();
  }

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _loadReasons() async {
    try {
      final response = await AppAPI.get('/rush_reason/get_all');
      final Map<String, dynamic> json = jsonDecode(response.body);
      if (json['isError'] == true) throw Exception(json['errorMessage']);
      final reasons = (json['data'] as List)
          .map((row) => _RushReason(row['rush_reason_id'] as int, row['rush_reason_name'] as String))
          .toList();
      if (!mounted) return;
      setState(() {
        _reasons = reasons;
        _isLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _isLoading = false;
        _loadError = 'โหลดรายการเหตุผลไม่สำเร็จ กรุณาลองใหม่';
      });
    }
  }

  _RushReason? get _selected {
    for (final r in _reasons) {
      if (r.id == _selectedId) return r;
    }
    return null;
  }

  void _submit() {
    final reason = _selected;
    if (reason == null) return;
    final note = _noteController.text.trim();
    if (reason.needsNote && note.isEmpty) {
      setState(() => _noteError = 'กรุณาระบุเหตุผลเพิ่มเติม');
      return;
    }
    Navigator.of(context).pop(RushRequestInput(reasonId: reason.id, note: note));
  }

  @override
  Widget build(BuildContext context) {
    final reason = _selected;

    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
      title: Row(
        children: [
          const Icon(Icons.bolt, color: kAmberDark),
          const SizedBox(width: 8),
          Text('เร่งการจัดการงาน', style: GoogleFonts.sarabun(fontSize: 17, fontWeight: FontWeight.w700, color: kNavy)),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'เลยช่วงนัดหมายมาแล้ว บอกเหตุผลสั้นๆ เพื่อให้เจ้าหน้าที่ดำเนินการได้ตรงจุด',
              style: GoogleFonts.sarabun(fontSize: 12.5, color: kGray500, height: 1.5),
            ),
            const SizedBox(height: 12),
            Text('เหตุผลที่ขอเร่ง *', style: GoogleFonts.sarabun(fontSize: 12, fontWeight: FontWeight.w700, color: kGray700)),
            const SizedBox(height: 5),
            if (_isLoading)
              const Padding(padding: EdgeInsets.symmetric(vertical: 12), child: Center(child: CircularProgressIndicator()))
            else if (_loadError != null)
              Text(_loadError!, style: GoogleFonts.sarabun(fontSize: 12.5, color: kRsError))
            else
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: kGray100,
                  border: Border.all(color: kGray200, width: 1.5),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<int>(
                    isExpanded: true,
                    value: _selectedId,
                    menuMaxHeight: 260,
                    hint: Text('เลือกเหตุผล', style: GoogleFonts.sarabun(fontSize: 14, color: kGray400)),
                    icon: const Icon(Icons.expand_more, color: kNavy),
                    style: GoogleFonts.sarabun(fontSize: 14, fontWeight: FontWeight.w600, color: kNavy),
                    items: [
                      for (final r in _reasons) DropdownMenuItem(value: r.id, child: Text(r.name, overflow: TextOverflow.ellipsis)),
                    ],
                    onChanged: (value) => setState(() {
                      _selectedId = value;
                      _noteError = null;
                    }),
                  ),
                ),
              ),
            if (reason != null && reason.needsNote) ...[
              const SizedBox(height: 10),
              TextField(
                controller: _noteController,
                maxLength: 200,
                maxLines: 3,
                // Sarabun เสมอ เพราะช่องนี้พิมพ์ภาษาไทย (กฎโปรเจกต์ ห้ามใช้ฟอนต์ละตินล้วน)
                style: GoogleFonts.sarabun(fontSize: 14, color: kGray700),
                decoration: InputDecoration(
                  hintText: 'ระบุรายละเอียด (ห้ามใส่ข้อมูลส่วนตัวที่ไม่เกี่ยวกับงานซ่อม)',
                  hintStyle: GoogleFonts.sarabun(fontSize: 13, color: kGray400),
                  border: const OutlineInputBorder(),
                  errorText: _noteError,
                ),
                onChanged: (_) {
                  if (_noteError != null) setState(() => _noteError = null);
                },
              ),
            ],
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: kGray100, borderRadius: BorderRadius.circular(10)),
              child: Text(
                'ส่งคำขอได้วันละ 1 ครั้งต่อเคส เจ้าหน้าที่จะได้รับแจ้งเตือนทันที',
                style: GoogleFonts.sarabun(fontSize: 11.5, color: kGray500, height: 1.5),
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: Text('ยกเลิก', style: GoogleFonts.sarabun(fontWeight: FontWeight.w700, color: kGray500)),
        ),
        FilledButton(
          onPressed: reason == null ? null : _submit,
          style: FilledButton.styleFrom(backgroundColor: kAmberDark),
          child: Text('ส่งคำขอ', style: GoogleFonts.sarabun(fontWeight: FontWeight.w700)),
        ),
      ],
    );
  }
}
