class Student {
  final String id;
  final String nisn;
  final String nama;
  final String kelas;
  final String? foto;
  final String? rfidUid;

  Student({
    required this.id,
    required this.nisn,
    required this.nama,
    required this.kelas,
    this.foto,
    this.rfidUid,
  });

  factory Student.fromJson(Map<String, dynamic> json) {
    return Student(
      id: json['id']?.toString() ?? '',
      nisn: json['nisn']?.toString() ?? '',
      nama: json['nama']?.toString() ?? '',
      kelas: json['kelas']?.toString() ?? '',
      foto: json['foto']?.toString(),
      rfidUid: json['rfidUid']?.toString() ?? json['rfid_uid']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'nisn': nisn,
      'nama': nama,
      'kelas': kelas,
      'foto': foto,
      'rfidUid': rfidUid,
    };
  }
}
