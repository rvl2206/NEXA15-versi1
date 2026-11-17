import 'student.dart';

class ScanResponse {
  final bool success;
  final bool isDuplicate;
  final String? message;
  final String? error;
  final Student? student;
  final String? targetJenis;
  final String? status;
  final int lateMinutes;

  ScanResponse({
    required this.success,
    this.isDuplicate = false,
    this.message,
    this.error,
    this.student,
    this.targetJenis,
    this.status,
    this.lateMinutes = 0,
  });

  factory ScanResponse.fromJson(Map<String, dynamic> json, int statusCode) {
    Student? parsedStudent;
    if (json['student'] != null && json['student'] is Map<String, dynamic>) {
      parsedStudent = Student.fromJson(json['student']);
    }

    return ScanResponse(
      success: json['success'] == true,
      isDuplicate: json['isDuplicate'] == true || statusCode == 409,
      message: json['message']?.toString(),
      error: json['error']?.toString(),
      student: parsedStudent,
      targetJenis: json['targetJenis']?.toString(),
      status: json['status']?.toString(),
      lateMinutes: (json['lateMinutes'] as num?)?.toInt() ?? 0,
    );
  }
}
