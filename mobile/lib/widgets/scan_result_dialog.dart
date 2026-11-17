import 'package:flutter/material.dart';
import '../models/scan_response.dart';

class ScanResultDialog extends StatelessWidget {
  final ScanResponse response;
  final VoidCallback onDismiss;

  const ScanResultDialog({
    super.key,
    required this.response,
    required this.onDismiss,
  });

  @override
  Widget build(BuildContext context) {
    Color bgColor;
    Color accentColor;
    IconData icon;
    String title;
    String subtitle;

    if (response.success) {
      if (response.targetJenis == 'Pulang') {
        bgColor = const Color(0xFF1E3A8A); // Blue-900
        accentColor = const Color(0xFF60A5FA); // Blue-400
        icon = Icons.check_circle_outline;
        title = 'PULANG TERCATAT';
        subtitle = '${response.student?.nama} (${response.student?.kelas})';
      } else if (response.status == 'Terlambat') {
        bgColor = const Color(0xFF78350F); // Amber-900
        accentColor = const Color(0xFFFBBF24); // Amber-400
        icon = Icons.access_time;
        title = 'TERLAMBAT (${response.lateMinutes} MENIT)';
        subtitle = '${response.student?.nama} (${response.student?.kelas})';
      } else {
        bgColor = const Color(0xFF064E3B); // Emerald-900
        accentColor = const Color(0xFF34D399); // Emerald-400
        icon = Icons.check_circle_outline;
        title = 'MASUK TEPAT WAKTU';
        subtitle = '${response.student?.nama} (${response.student?.kelas})';
      }
    } else if (response.isDuplicate) {
      bgColor = const Color(0xFF7C2D12); // Orange-900
      accentColor = const Color(0xFFFB923C); // Orange-400
      icon = Icons.warning_amber_rounded;
      title = 'SUDAH TERCATAT (DUPLIKAT)';
      subtitle = response.message ?? 'Presensi sudah tercatat hari ini.';
    } else {
      bgColor = const Color(0xFF881337); // Rose-900
      accentColor = const Color(0xFFFB7185); // Rose-400
      icon = Icons.cancel_outlined;
      title = 'KARTU TIDAK DIKENAL';
      subtitle = response.error ?? 'Data kartu atau QR tidak ditemukan.';
    }

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
      child: Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: bgColor.withOpacity(0.95),
          borderRadius: BorderRadius.circular(28),
          border: Border.all(color: accentColor.withOpacity(0.5), width: 1.5),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.6),
              blurRadius: 30,
              offset: const Offset(0, 15),
            )
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: accentColor.withOpacity(0.2),
                shape: BoxShape.circle,
                border: Border.all(color: accentColor, width: 2),
              ),
              child: Icon(icon, color: accentColor, size: 36),
            ),
            const SizedBox(height: 18),
            Text(
              title,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: accentColor,
                fontSize: 16,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.1,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            if (response.student?.nisn != null && response.student!.nisn.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text(
                'NISN: ${response.student!.nisn}',
                style: TextStyle(
                  color: Colors.white.withOpacity(0.7),
                  fontSize: 13,
                ),
              ),
            ],
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: onDismiss,
                style: ElevatedButton.styleFrom(
                  backgroundColor: accentColor,
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                child: const Text(
                  'SIAP SCAN BERIKUTNYA',
                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
