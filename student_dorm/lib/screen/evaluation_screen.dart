import 'dart:convert';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:student_dorm/color/colors.dart';
import 'package:student_dorm/models/repair_detail_model.dart' show RepairPhoto;
import 'package:student_dorm/utils/app_api.dart';
import 'package:student_dorm/widgets/report_submit/existing_photo_grid.dart';
import 'package:student_dorm/widgets/report_submit/image_preview_grid.dart';

/// หน้าจอประเมินงานซ่อม (พอร์ตจาก Prototype/Student/rating.html ตรงๆ) — ให้ดาว 1-5,
/// แนบรูปหลังซ่อม (ไม่บังคับ), เขียนข้อเสนอแนะ (ไม่บังคับ) รองรับทั้งประเมินครั้งแรกและแก้ไขของเดิม
/// เขียนรวมไว้ไฟล์เดียว (เหมือน report_submit_screen.dart) ยังไม่แยก widget ย่อยออกเป็น shared —
/// จะพิจารณาแยกอีกทีถ้ามีหน้าอื่นต้องใช้ซ้ำจริงในอนาคต
/// isFailedCase = เคส "ซ่อมไม่สำเร็จ" (นักศึกษาไม่ยอมรับผลซ่อม): หน้าเดียวกันแต่ไม่มีดาว (ซ่อนการ์ดดาว ไม่ส่ง rating)
/// และบังคับกรอกเหตุผล เพราะไม่มีดาวให้บอกอะไร ข้อความคือข้อมูลเดียวที่เจ้าหน้าที่ใช้ตรวจสอบเคส (backend ตรวจซ้ำ)
class EvaluationScreen extends StatefulWidget {
  const EvaluationScreen({super.key, required this.requestId, this.isFailedCase = false});

  final int requestId;
  final bool isFailedCase;

  @override
  State<EvaluationScreen> createState() => _EvaluationScreenState();
}

class _EvaluationScreenState extends State<EvaluationScreen> {
  final TextEditingController _feedbackController = TextEditingController();
  final ImagePicker _picker = ImagePicker();

  static const int _maxImages = 6;
  static const double _maxFileMb = 10;
  static const int _maxFeedbackLength = 500;

  // (ข้อความ, ไอคอน, สีตัวหนังสือ/ไอคอน, พื้นหลัง, ขอบ) ตามระดับดาว 1-5 — ตรงกับ rating.css
  static const Map<int, (String, IconData, Color, Color, Color)> _ratingLevels = {
    1: ('แย่มาก ไม่พึงพอใจ', Icons.sentiment_very_dissatisfied, kRsError, Color(0xFFFFF2F1), Color(0xFFF5C9C5)),
    2: ('พอใช้ ควรปรับปรุง', Icons.sentiment_dissatisfied, kRsAmber, Color(0xFFFFF3E0), Color(0xFFFFD699)),
    3: ('ปานกลาง', Icons.sentiment_neutral, kRsGoldText, Color(0xFFFFF8D6), Color(0xFFF0DC7A)),
    4: ('ดี พึงพอใจ', Icons.sentiment_satisfied, kRsBlue, Color(0xFFEFF2FF), Color(0xFFC5D0F5)),
    5: ('ยอดเยี่ยม ประทับใจมาก', Icons.sentiment_very_satisfied, kRsGreen, Color(0xFFE8F5E9), Color(0xFFB6DDB8)),
  };

  int _rating = 0;
  bool _isEditMode = false;
  bool _isLoading = true;
  bool _isSubmitting = false;

  final List<XFile> _newPhotos = [];
  List<RepairPhoto> _existingPhotos = [];

  int get _totalImageCount => _existingPhotos.length + _newPhotos.length;

  @override
  void initState() {
    super.initState();
    _loadExistingEvaluation();
  }

  @override
  void dispose() {
    _feedbackController.dispose();
    super.dispose();
  }

  Future<void> _loadExistingEvaluation() async {
    final response = await AppAPI.get('/repair_request/${widget.requestId}/evaluation');
    final Map<String, dynamic> json = jsonDecode(response.body);

    if (!mounted) return;

    if (json['isError'] == true || json['data'] == null) {
      setState(() {
        _isLoading = false;
      });
      return;
    }

    final data = json['data'] as Map<String, dynamic>;
    final photos = (data['photos'] as List? ?? [])
        .map((e) => RepairPhoto(
              photoId: e['evaluation_photo_id'] as int,
              photoUrl: e['photo_url'] as String? ?? '',
            ))
        .toList();

    setState(() {
      _isEditMode = true;
      _rating = (data['rating'] as num?)?.toInt() ?? 0;
      _feedbackController.text = data['feedback'] as String? ?? '';
      _existingPhotos = photos;
      _isLoading = false;
    });
  }

  void _setRating(int value) {
    setState(() {
      _rating = value;
    });
  }

  Future<void> _pickImages() async {
    if (_totalImageCount >= _maxImages) return;

    final List<XFile> picked = await _picker.pickMultiImage(imageQuality: 85);
    if (picked.isEmpty) return;

    int skippedSize = 0;
    final List<XFile> accepted = [];

    for (final xfile in picked) {
      if (_totalImageCount + accepted.length >= _maxImages) break;
      final sizeInMb = await xfile.length() / (1024 * 1024);
      if (sizeInMb > _maxFileMb) {
        skippedSize++;
        continue;
      }
      accepted.add(xfile);
    }

    setState(() {
      _newPhotos.addAll(accepted);
    });

    if (skippedSize > 0 && mounted) {
      _showToast('$skippedSize ไฟล์มีขนาดเกิน ${_maxFileMb.toInt()} MB', isWarn: true);
    }
  }

  Future<void> _pickFromCamera() async {
    if (_totalImageCount >= _maxImages) return;
    final XFile? shot = await _picker.pickImage(source: ImageSource.camera, imageQuality: 85);
    if (shot == null) return;
    setState(() {
      _newPhotos.add(shot);
    });
  }

  void _removeNewPhoto(int index) {
    setState(() {
      _newPhotos.removeAt(index);
    });
  }

  void _removeExistingPhoto(int index) {
    setState(() {
      _existingPhotos.removeAt(index);
    });
  }

  void _showImageSourceSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              ListTile(
                leading: const Icon(Icons.photo_library_outlined, color: kRsBlue),
                title: Text('เลือกจากคลังภาพ', style: GoogleFonts.sarabun(fontSize: 14)),
                onTap: () {
                  Navigator.pop(context);
                  _pickImages();
                },
              ),
              ListTile(
                leading: const Icon(Icons.photo_camera_outlined, color: kRsGoldText),
                title: Text('ถ่ายภาพ', style: GoogleFonts.sarabun(fontSize: 14)),
                onTap: () {
                  Navigator.pop(context);
                  _pickFromCamera();
                },
              ),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
  }

  Future<void> _handleSubmit() async {
    if (widget.isFailedCase) {
      if (_feedbackController.text.trim().isEmpty) {
        _showToast('กรุณาระบุเหตุผลที่ไม่ยอมรับผลการซ่อม', isWarn: true);
        return;
      }
    } else if (_rating == 0) {
      _showToast('โปรดให้คะแนนความพึงพอใจก่อนยืนยัน', isWarn: true);
      return;
    }

    setState(() {
      _isSubmitting = true;
    });

    final fields = {
      if (!widget.isFailedCase) 'rating': '$_rating',
      'feedback': _feedbackController.text.trim(),
    };

    http.Response response;
    try {
      if (_isEditMode) {
        response = await AppAPI.uploadFiles(
          '/repair_request/evaluation/update',
          _newPhotos,
          fieldName: 'photos',
          fields: {
            ...fields,
            'request_id': '${widget.requestId}',
            'keep_urls': jsonEncode(_existingPhotos.map((p) => p.photoUrl).toList()),
          },
        );
      } else {
        response = await AppAPI.uploadFiles(
          '/repair_request/${widget.requestId}/evaluation',
          _newPhotos,
          fieldName: 'photos',
          fields: fields,
        );
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isSubmitting = false;
      });
      _showToast('ส่งการประเมินไม่สำเร็จ: $e', isWarn: true);
      return;
    }

    if (!mounted) return;

    setState(() {
      _isSubmitting = false;
    });

    final Map<String, dynamic> json = jsonDecode(response.body);
    if (json['isError'] == true) {
      _showToast(json['errorMessage'] as String? ?? 'ส่งการประเมินไม่สำเร็จ', isWarn: true);
      return;
    }

    _showSuccessModal();
  }

  Future<void> _handleDelete() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('ลบการประเมินนี้?'),
        content: const Text('ลบแล้วจะสามารถประเมินใหม่ได้อีกครั้ง'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('ยกเลิก')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('ลบ')),
        ],
      ),
    );
    if (confirmed != true) return;

    final response = await AppAPI.post('/repair_request/evaluation/delete', {
      'request_id': widget.requestId,
    });
    final Map<String, dynamic> json = jsonDecode(response.body);

    if (!mounted) return;

    if (json['isError'] == true) {
      _showToast(json['errorMessage'] as String? ?? 'ลบไม่สำเร็จ', isWarn: true);
      return;
    }

    Navigator.of(context).pop(true);
  }

  void _showToast(String message, {bool isWarn = false}) {
    ScaffoldMessenger.of(context).clearSnackBars();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        backgroundColor: const Color(0xFF2A2C2E),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        margin: const EdgeInsets.only(bottom: 84, left: 40, right: 40),
        duration: const Duration(seconds: 3),
        content: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(isWarn ? Icons.warning_amber_rounded : Icons.info_outline, size: 17, color: kRsGold),
            const SizedBox(width: 8),
            Flexible(
              child: Text(
                message,
                style: GoogleFonts.sarabun(fontSize: 13, fontWeight: FontWeight.w500, color: const Color(0xFFF0F0F3)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showSuccessModal() {
    final BuildContext pageContext = context;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black.withValues(alpha: 0.5),
      builder: (sheetContext) {
        return Container(
          padding: EdgeInsets.fromLTRB(24, 12, 24, max(32, MediaQuery.of(context).padding.bottom + 20)),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.only(topLeft: Radius.circular(28), topRight: Radius.circular(28)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4.5,
                margin: const EdgeInsets.only(bottom: 24),
                decoration: BoxDecoration(color: const Color(0xFFDADADC), borderRadius: BorderRadius.circular(999)),
              ),
              Container(
                width: 88,
                height: 88,
                margin: const EdgeInsets.only(bottom: 18),
                decoration: BoxDecoration(color: kRsGreen.withValues(alpha: 0.1), shape: BoxShape.circle),
                alignment: Alignment.center,
                child: Container(
                  width: 68,
                  height: 68,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [kRsGreen, Color(0xFF4CAF50)],
                    ),
                    boxShadow: [
                      BoxShadow(color: kRsGreen.withValues(alpha: 0.38), blurRadius: 20, offset: const Offset(0, 6)),
                    ],
                  ),
                  child: const Icon(Icons.check, color: Colors.white, size: 38),
                ),
              ),
              Text(
                widget.isFailedCase ? 'ขอบคุณที่แจ้งเหตุผล' : 'ขอบคุณสำหรับการประเมิน',
                style: GoogleFonts.sarabun(fontSize: 22, fontWeight: FontWeight.w800, color: kRsOnSurface, letterSpacing: -0.2),
              ),
              const SizedBox(height: 8),
              Text(
                widget.isFailedCase
                    ? 'เจ้าหน้าที่จะตรวจสอบเหตุผลของคุณ\nและนำไปปรับปรุงการบริการซ่อม'
                    : 'ความคิดเห็นของคุณจะช่วยพัฒนา\nคุณภาพการบริการซ่อมของเราให้ดียิ่งขึ้น',
                textAlign: TextAlign.center,
                style: GoogleFonts.sarabun(fontSize: 13.5, color: const Color(0xFF7E775F), height: 1.75),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: Material(
                  color: Colors.transparent,
                  child: Ink(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(999),
                      gradient: const LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [kRsNavyMid, kRsNavyDark],
                      ),
                      boxShadow: [
                        BoxShadow(color: kRsNavy.withValues(alpha: 0.4), blurRadius: 24, offset: const Offset(0, 6)),
                      ],
                    ),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(999),
                      onTap: () {
                        Navigator.of(sheetContext).pop();
                        Navigator.of(pageContext).pop(true);
                      },
                      child: Center(
                        child: Text(
                          'เสร็จสิ้น',
                          style: GoogleFonts.sarabun(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = GoogleFonts.sarabunTextTheme(Theme.of(context).textTheme);

    return Theme(
      data: Theme.of(context).copyWith(textTheme: textTheme),
      child: Scaffold(
        backgroundColor: kRsSurface,
        body: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : Column(
                children: [
                  _buildAppBar(context),
                  Expanded(
                    child: Stack(
                      children: [
                        SingleChildScrollView(
                          padding: const EdgeInsets.fromLTRB(18, 20, 18, 140),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              if (!widget.isFailedCase) ...[
                                _buildRatingCard(),
                                const SizedBox(height: 18),
                              ],
                              _buildPhotoCard(),
                              const SizedBox(height: 18),
                              _buildSuggestionsCard(),
                            ],
                          ),
                        ),
                        Positioned(left: 0, right: 0, bottom: 0, child: _buildBottomBar()),
                      ],
                    ),
                  ),
                ],
              ),
      ),
    );
  }

  Widget _buildAppBar(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(top: MediaQuery.of(context).padding.top),
      decoration: BoxDecoration(
        gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [kRsGold, kRsGoldLight]),
        borderRadius: const BorderRadius.only(bottomLeft: Radius.circular(28), bottomRight: Radius.circular(28)),
        boxShadow: [BoxShadow(color: kRsGoldText.withValues(alpha: 0.18), blurRadius: 10, offset: const Offset(0, 2))],
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(12, 14, 20, 17),
        child: Row(
          children: [
            Material(
              color: Colors.transparent,
              child: InkWell(
                borderRadius: BorderRadius.circular(20),
                onTap: () => Navigator.of(context).maybePop(),
                child: Container(
                  width: 40,
                  height: 40,
                  alignment: Alignment.center,
                  child: const Icon(Icons.close, size: 20, color: kRsOnPrimary),
                ),
              ),
            ),
            const SizedBox(width: 4),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.isFailedCase ? 'เหตุผลที่ไม่ยอมรับ' : 'ประเมินงานซ่อม',
                    style: GoogleFonts.sarabun(fontSize: 20, fontWeight: FontWeight.w800, color: kRsOnPrimary, letterSpacing: -0.3, height: 1.2),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    widget.isFailedCase ? 'บอกเจ้าหน้าที่ว่าผลซ่อมยังมีปัญหาอะไร' : 'ให้คะแนนความพึงพอใจในการซ่อม',
                    style: GoogleFonts.sarabun(fontSize: 11.5, fontWeight: FontWeight.w500, color: kRsOnPrimary.withValues(alpha: 0.52)),
                  ),
                ],
              ),
            ),
            if (_isEditMode)
              Material(
                color: Colors.transparent,
                child: InkWell(
                  borderRadius: BorderRadius.circular(20),
                  onTap: _handleDelete,
                  child: Container(
                    width: 40,
                    height: 40,
                    alignment: Alignment.center,
                    child: const Icon(Icons.delete_outline, size: 20, color: kRsOnPrimary),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildRatingCard() {
    final level = _ratingLevels[_rating];

    return _card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              _iconBadge(Icons.star, bg: const Color(0xFFFFF8D6), fg: kRsGoldText),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _cardTitle('ความพึงพอใจ'),
                    _cardSub('แตะดาวเพื่อให้คะแนนงานซ่อม'),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: List.generate(5, (index) {
              final value = index + 1;
              final isActive = value <= _rating;
              return GestureDetector(
                onTap: () => _setRating(value),
                child: AnimatedScale(
                  scale: isActive ? 1.0 : 0.92,
                  duration: const Duration(milliseconds: 180),
                  curve: Curves.easeOutBack,
                  child: Icon(Icons.star, size: 38, color: isActive ? kRsGold : const Color(0xFFDCD8C8)),
                ),
              );
            }),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 4),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('ปรับปรุง', style: GoogleFonts.sarabun(fontSize: 11, fontWeight: FontWeight.w600, color: kRsMuted)),
                Text('ยอดเยี่ยม', style: GoogleFonts.sarabun(fontSize: 11, fontWeight: FontWeight.w600, color: kRsMuted)),
              ],
            ),
          ),
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 12),
            decoration: BoxDecoration(
              color: level?.$4 ?? const Color(0xFFFAF9F5),
              border: Border.all(color: level?.$5 ?? const Color(0xFFE8E0C4), width: 1.5),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Row(
              children: [
                Icon(level?.$2 ?? Icons.sentiment_neutral, size: 19, color: level?.$3 ?? const Color(0xFF4D4732)),
                const SizedBox(width: 8),
                Text(
                  level?.$1 ?? 'โปรดให้คะแนนความพึงพอใจ',
                  style: GoogleFonts.sarabun(fontSize: 13, fontWeight: FontWeight.w600, color: level?.$3 ?? const Color(0xFF4D4732)),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPhotoCard() {
    final bool isFull = _totalImageCount >= _maxImages;

    return _card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              _iconBadge(Icons.add_a_photo, bg: const Color(0xFFE8EDFF), fg: kRsBlue),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _cardTitle(widget.isFailedCase ? 'รูปภาพประกอบ' : 'รูปภาพหลังการซ่อม'),
                    _cardSub(widget.isFailedCase ? 'แนบรูปจุดที่ยังมีปัญหา (ไม่บังคับ)' : 'แนบรูปเพื่อยืนยันผลงาน (ไม่บังคับ)'),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 4),
                decoration: BoxDecoration(color: const Color(0xFFEEEEF0), borderRadius: BorderRadius.circular(999)),
                child: Text(
                  '$_totalImageCount / $_maxImages',
                  style: GoogleFonts.sarabun(fontSize: 11.5, fontWeight: FontWeight.w700, color: kRsOnSurfaceVar),
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          // กรอบเดียวรวมปุ่มอัปโหลดกับรูปที่แนบแล้ว (เดิมรูปลอยอยู่นอกกรอบ)
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: kRsFieldBg,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFFCCC5B0), width: 2),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Opacity ครอบเฉพาะแถวปุ่ม ไม่ครอบรูป ไม่งั้นรูปที่แนบแล้วจะจางไปด้วยตอนแนบครบ
                GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: isFull ? null : () => _showImageSourceSheet(context),
                  child: Opacity(
                    opacity: isFull ? 0.5 : 1,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Row(
                        children: [
                          Container(
                            width: 46,
                            height: 46,
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFFFFF8D6), Color(0xFFFFF3B0)]),
                              borderRadius: BorderRadius.circular(14),
                              boxShadow: [BoxShadow(color: kRsGoldText.withValues(alpha: 0.14), blurRadius: 10, offset: const Offset(0, 2))],
                            ),
                            child: Icon(Icons.upload, size: 24, color: kRsGoldText),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('แนบรูปภาพประกอบ', style: GoogleFonts.sarabun(fontSize: 13.5, fontWeight: FontWeight.w700, color: kRsOnSurface)),
                                const SizedBox(height: 2),
                                Text(
                                  'สูงสุด $_maxImages รูป • ไม่เกินรูปละ ${_maxFileMb.toInt()} MB',
                                  style: GoogleFonts.sarabun(fontSize: 11.5, color: kRsMuted),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                if (_existingPhotos.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  ExistingPhotoGrid(photos: _existingPhotos, onRemove: _removeExistingPhoto),
                ],
                if (_newPhotos.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  ImagePreviewGrid(images: _newPhotos, onRemove: _removeNewPhoto),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSuggestionsCard() {
    return _card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              _iconBadge(Icons.rate_review, bg: const Color(0xFFFFF3E0), fg: kRsAmber),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _cardTitle(widget.isFailedCase ? 'เหตุผลที่ไม่ยอมรับ *' : 'ข้อเสนอแนะ'),
                    _cardSub(widget.isFailedCase ? 'จำเป็นต้องระบุ' : 'แสดงความคิดเห็นเพิ่มเติม (ไม่บังคับ)'),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Stack(
            children: [
              TextField(
                controller: _feedbackController,
                maxLines: 4,
                maxLength: _maxFeedbackLength,
                onChanged: (_) => setState(() {}),
                // Inter เป็นฟอนต์ Latin-only ไม่มีตัวอักษรไทย ใช้กับข้อความไทยแล้วหลุดไป fallback
                // เป็นฟอนต์ระบบเริ่มต้นแทน หน้าตาต่างจาก Sarabun ที่ใช้อยู่ทุกจุดอื่นในหน้านี้
                style: GoogleFonts.sarabun(fontSize: 15, color: kRsOnSurface),
                decoration: InputDecoration(
                  counterText: '',
                  hintText: widget.isFailedCase
                      ? 'เช่น ซ่อมแล้วยังใช้งานไม่ได้เหมือนเดิม...'
                      : 'โปรดระบุข้อเสนอแนะเพื่อพัฒนาคุณภาพการซ่อม...',
                  hintStyle: GoogleFonts.sarabun(fontSize: 15, color: const Color(0xFFC0B8A8)),
                  filled: true,
                  fillColor: kRsFieldBg,
                  contentPadding: const EdgeInsets.fromLTRB(16, 13, 16, 28),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: kRsFieldBorder, width: 1.5)),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: kRsFieldBorder, width: 1.5)),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: kRsBlue, width: 1.5)),
                ),
              ),
              Positioned(
                bottom: 10,
                right: 14,
                child: Text(
                  '${_feedbackController.text.length} / $_maxFeedbackLength',
                  style: GoogleFonts.sarabun(fontSize: 11, color: kRsMuted.withValues(alpha: 0.6)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildBottomBar() {
    return Container(
      padding: EdgeInsets.fromLTRB(20, 14, 20, max(24, MediaQuery.of(context).padding.bottom + 10)),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [kRsSurface.withValues(alpha: 0.0), kRsSurface.withValues(alpha: 0.6), kRsSurface],
          stops: const [0.0, 0.4, 1.0],
        ),
      ),
      child: SizedBox(
        height: 54,
        child: Material(
          color: Colors.transparent,
          child: Ink(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(999),
              gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [kRsNavyMid, kRsNavyDark]),
              boxShadow: [BoxShadow(color: kRsNavy.withValues(alpha: 0.4), blurRadius: 24, offset: const Offset(0, 6))],
            ),
            child: InkWell(
              borderRadius: BorderRadius.circular(999),
              onTap: _isSubmitting ? null : _handleSubmit,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.task_alt, color: Colors.white, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    _isSubmitting ? 'กำลังส่ง...' : (_isEditMode ? 'บันทึกการแก้ไข' : (widget.isFailedCase ? 'ส่งเหตุผล' : 'ประเมิน')),
                    style: GoogleFonts.sarabun(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _card({required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFD0C6AB).withValues(alpha: 0.35)),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 3, offset: const Offset(0, 1)),
          BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 20, offset: const Offset(0, 6)),
        ],
      ),
      child: child,
    );
  }

  Widget _iconBadge(IconData icon, {required Color bg, required Color fg}) {
    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(14)),
      alignment: Alignment.center,
      child: Icon(icon, size: 22, color: fg),
    );
  }

  Widget _cardTitle(String text) {
    return Text(text, style: GoogleFonts.sarabun(fontSize: 15.5, fontWeight: FontWeight.w700, color: kRsOnSurface, height: 1.25));
  }

  Widget _cardSub(String text) {
    return Padding(
      padding: const EdgeInsets.only(top: 1),
      child: Text(text, style: GoogleFonts.sarabun(fontSize: 11, fontWeight: FontWeight.w500, color: kRsMuted)),
    );
  }
}
