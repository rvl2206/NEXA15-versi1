import 'package:shared_preferences/shared_preferences.dart';

class StorageService {
  static const String _keyServerUrl = 'nexa_server_url';
  static const String _keyOfficerName = 'nexa_officer_name';
  static const String _defaultUrl = 'http://192.168.1.100:3000';

  static Future<String> getServerUrl() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyServerUrl) ?? _defaultUrl;
  }

  static Future<void> setServerUrl(String url) async {
    final prefs = await SharedPreferences.getInstance();
    String cleanUrl = url.trim();
    if (cleanUrl.endsWith('/')) {
      cleanUrl = cleanUrl.substring(0, cleanUrl.length - 1);
    }
    await prefs.setString(_keyServerUrl, cleanUrl);
  }

  static Future<String> getOfficerName() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyOfficerName) ?? 'Petugas Gerbang';
  }

  static Future<void> setOfficerName(String name) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyOfficerName, name.trim());
  }
}
