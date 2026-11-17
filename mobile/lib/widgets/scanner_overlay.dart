import 'package:flutter/material.dart';

class ScannerOverlay extends StatelessWidget {
  final double scanAreaSize;

  const ScannerOverlay({super.key, this.scanAreaSize = 260.0});

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Darkened background with cutout
        ColorFiltered(
          colorFilter: ColorFilter.mode(
            Colors.black.withOpacity(0.65),
            BlendMode.srcOut,
          ),
          child: Stack(
            children: [
              Container(
                decoration: const BoxDecoration(
                  color: Colors.red,
                  backgroundBlendMode: BlendMode.dstOut,
                ),
              ),
              Center(
                child: Container(
                  width: scanAreaSize,
                  height: scanAreaSize,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                  ),
                ),
              ),
            ],
          ),
        ),

        // Glowing Corner Borders
        Center(
          child: Container(
            width: scanAreaSize,
            height: scanAreaSize,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: const Color(0xFF10B981).withOpacity(0.5), width: 2),
            ),
          ),
        ),
      ],
    );
  }
}
