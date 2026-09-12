class StudentProfile {
  final String firstname;
  final String lastname;
  final String phone;
  final String roomNumber;
  final String studentNo;
  final String? imageUrl;

  const StudentProfile({
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
      firstname: json['firstname'] as String? ?? '',
      lastname: json['lastname'] as String? ?? '',
      phone: json['phone'] as String? ?? '',
      roomNumber: json['room_number'] as String? ?? '',
      studentNo: json['student_no'] as String? ?? '',
      imageUrl: json['image_url'] as String?,
    );
  }
}
