import 'package:flutter/material.dart';
import '../models/student.dart';
import '../services/api_service.dart';
import '../services/audio_feedback_service.dart';
import '../widgets/scan_result_dialog.dart';

class LupaKartuScreen extends StatefulWidget {
  const LupaKartuScreen({super.key});

  @override
  State<LupaKartuScreen> createState() => _LupaKartuScreenState();
}

class _LupaKartuScreenState extends State<LupaKartuScreen> {
  final _searchController = TextEditingController();
  List<Student> _results = [];
  bool _isLoading = false;

  Future<void> _performSearch(String query) async {
    if (query.trim().isEmpty) {
      setState(() => _results = []);
      return;
    }
    setState(() => _isLoading = true);
    final list = await ApiService.searchStudents(query);
    setState(() {
      _isLoading = false;
      _results = list;
    });
  }

  Future<void> _submitManualAttendance(Student student) async {
    setState(() => _isLoading = true);
    final response = await ApiService.submitScan(
      code: student.nisn,
      scanMethod: 'Manual',
      type: 'Auto',
    );
    setState(() => _isLoading = false);

    if (response.success) {
      AudioFeedbackService.playSuccess();
    } else if (response.isDuplicate) {
      AudioFeedbackService.playWarning();
    } else {
      AudioFeedbackService.playError();
    }

    if (mounted) {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => ScanResultDialog(
          response: response,
          onDismiss: () {
            Navigator.pop(ctx);
            Navigator.pop(context); // return to scanner
          },
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: const Text('Presensi Siswa (Lupa Kartu)', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF1E293B),
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: TextField(
              controller: _searchController,
              autofocus: true,
              style: const TextStyle(color: Colors.white),
              onChanged: _performSearch,
              decoration: InputDecoration(
                filled: true,
                fillColor: const Color(0xFF1E293B),
                hintText: 'Ketik Nama atau NISN Siswa...',
                hintStyle: TextStyle(color: Colors.white.withOpacity(0.3)),
                prefixIcon: const Icon(Icons.search, color: Color(0xFF38BDF8)),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, color: Colors.white70),
                        onPressed: () {
                          _searchController.clear();
                          _performSearch('');
                        },
                      )
                    : null,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),
          if (_isLoading)
            const Padding(
              padding: EdgeInsets.all(20),
              child: Center(child: CircularProgressIndicator(color: Color(0xFF38BDF8))),
            ),
          Expanded(
            child: _results.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(32),
                      child: Text(
                        _searchController.text.trim().isEmpty
                            ? 'Cari nama atau NISN siswa untuk presensi cepat tanpa kartu.'
                            : 'Tidak ada siswa ditemukan dengan kata kunci "${_searchController.text}".',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 14),
                      ),
                    ),
                  )
                : ListView.separated(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: _results.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, index) {
                      final std = _results[index];
                      return Container(
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E293B),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.white.withOpacity(0.05)),
                        ),
                        child: Row(
                          children: [
                            CircleAvatar(
                              backgroundColor: const Color(0xFF38BDF8).withOpacity(0.2),
                              foregroundColor: const Color(0xFF38BDF8),
                              child: Text(std.nama.isNotEmpty ? std.nama[0] : 'S'),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    std.nama,
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 15,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    '${std.kelas} • NISN: ${std.nisn}',
                                    style: TextStyle(
                                      color: Colors.white.withOpacity(0.5),
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            ElevatedButton(
                              onPressed: () => _submitManualAttendance(std),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF10B981),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              child: const Text('Absen', style: TextStyle(fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}
