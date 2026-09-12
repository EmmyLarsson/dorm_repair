const Map<String, String> _extensionMimeTypes = {
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'webp': 'image/webp',
};

/// เดา MIME type ของไฟล์จากนามสกุล ใช้ตอนอัปโหลดรูปที่ MultipartFile.fromBytes()
/// ไม่ auto-detect content type ให้ (ต่างจาก fromPath ที่ทำให้อัตโนมัติ)
String? guessMimeTypeFromFilename(String filename) {
  final dotIndex = filename.lastIndexOf('.');
  if (dotIndex == -1) return null;

  final ext = filename.substring(dotIndex + 1).toLowerCase();
  return _extensionMimeTypes[ext];
}
