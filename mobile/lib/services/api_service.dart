import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/student.dart';
import '../models/scan_response.dart';
import 'storage_service.dart';

class ApiService {
  static Future<bool> checkHealth() async {
    try {
      final baseUrl = await StorageService.getServerUrl();
      final uri = Uri.parse('$baseUrl/api/health');
      final res = await http.get(uri).timeout(const Duration(seconds: 4));
      return res.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  static Future<ScanResponse> submitScan({
    required String code,
    String scanMethod = 'QR',
    String type = 'Auto',
  }) async {
    final baseUrl = await StorageService.getServerUrl();
    final officer = await StorageService.getOfficerName();
    final uri = Uri.parse('$baseUrl/api/scan');

    try {
      final response = await http
          .post(
            uri,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'code': code.trim(),
              'officer': officer,
              'scanMethod': scanMethod,
              'type': type,
            }),
          )
          .timeout(const Duration(seconds: 6));

      Map<String, dynamic> data = {};
      try {
        data = jsonDecode(response.body);
      } catch (_) {}

      return ScanResponse.fromJson(data, response.statusCode);
    } catch (e) {
      return ScanResponse(
        success: false,
        error: 'Gagal terhubung ke server database: ${e.toString()}',
      );
    }
  }

  static Future<List<Student>> searchStudents(String query) async {
    if (query.trim().isEmpty) return [];

    final baseUrl = await StorageService.getServerUrl();
    final uri = Uri.parse('$baseUrl/api/students/search?q=${Uri.encodeComponent(query.trim())}');

    try {
      final res = await http.get(uri).timeout(const Duration(seconds: 4));
      if (res.statusCode == 200) {
        final List list = jsonDecode(res.body);
        return list.map((item) => Student.fromJson(item)).toList();
      }
      return [];
    } catch (_) {
      return [];
    }
  }
}
