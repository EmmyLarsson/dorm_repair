class StudentProfile {
  // ใช้ระบุตัวเองกับ POST /personnel/:person_id/photo (backend ตรวจว่าตรงกับบัญชีที่ล็อกอินอยู่)
  final int personId;
  final String firstname;
  final String lastname;
  final String phone;
  final String roomNumber;
  final String studentNo;
  final String? imageUrl;

  const StudentProfile({
    required this.personId,
    required this.firstname,
    required this.lastname,
    required this.phone,
    required this.roomNumber,
    required this.studentNo,
    this.imageUrl,
  });

  String get fullName => '$firstname $lastname'.trim();

  factory StudentProfile.fromJson(Map<String, dynamic> json) {
    return StudentProfile(
      personId: json['person_id'] as int? ?? 0,
      firstname: json['firstname'] as String? ?? '',
      lastname: json['lastname'] as String? ?? '',
      phone: json['phone'] as String? ?? '',
      roomNumber: json['room_number'] as String? ?? '',
      studentNo: json['student_no'] as String? ?? '',
      imageUrl: json['image_url'] as String?,
    );
  }
}
