import 'package:flutter/services.dart';

class AudioFeedbackService {
  static void playSuccess() {
    try {
      SystemSound.play(SystemSoundType.click);
      HapticFeedback.lightImpact();
    } catch (_) {}
  }

  static void playWarning() {
    try {
      HapticFeedback.mediumImpact();
    } catch (_) {}
  }

  static void playError() {
    try {
      HapticFeedback.heavyImpact();
    } catch (_) {}
  }
}
