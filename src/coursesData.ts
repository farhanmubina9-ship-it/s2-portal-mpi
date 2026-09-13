export interface SyllabusFile {
  id: string;
  name: string;
  url: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  lecturer: string;
  day: 'Jumat' | 'Sabtu';
  time: string;
  room: string;
  colorTheme: {
    bgLight: string;
    borderLight: string;
    textLight: string;
    badgeBgLight: string;
    badgeTextLight: string;
    darkBg: string;
    darkBorder: string;
    darkText: string;
    accent: string;
  };
  syllabusSummary: string;
  syllabusPdfUrl?: string;
  syllabusDriveUrl?: string;
  driveFolderUrl?: string;
  pdfFileName?: string;
  syllabusPdfs?: SyllabusFile[];
  pjName?: string;
  pjContact?: string;
  tasks: Task[];
  groups: Group[];
  guidelineSections?: GuidelineSection[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  deadline: string;
  type: 'Individu' | 'Kelompok';
  category?: 'Jurnal' | 'UAS' | 'Proyek' | 'Tugas';
  status: 'Belum' | 'Proses' | 'Selesai';
  driveUrl?: string;
}

export interface Group {
  name: string;
  topic?: string;
  members: string[];
  status?: 'Belum' | 'Selesai';
  completedAt?: string;
  driveUrl?: string;
}

export interface GuidelineSection {
  heading: string;
  items: string[];
}

export interface GuidelineItem {
  id: string;
  title: string;
  badge: string;
  icon: string;
  description: string;
  sections: GuidelineSection[];
}

// PEDOMAN PENULISAN (Hanya Sistematika Makalah & Penulisan Artikel 2026)
export const ALL_GUIDELINES: GuidelineItem[] = [
  {
    id: 'sistematika-makalah',
    title: 'Sistematika Penulisan Makalah',
    badge: 'Standar Resmi MPS Pascasarjana UIN SGD',
    icon: 'FileText',
    description: 'Pedoman struktur baku 4 BAB penyusunan makalah ilmiah semester untuk program Magister Manajemen Pendidikan Islam.',
    sections: [
      {
        heading: 'BAB I PENDAHULUAN',
        items: [
          'A. Latar Belakang: Mengurai kesenjangan/problem antara Das Sein (Ranah realitas/fakta empiris) vs Das Sollen (Ranah harapan/teori) serta pentingnya penulisan makalah.',
          'B. Rumusan Masalah: Kesenjangan Antara Das Sollen dan Das Sein. Wajib diawali kata tanya "Bagaimana..." (contoh: 1. Tuliskan sub pokok materi diawali kata bagaimana, 2. dst).',
          'C. Tujuan Penulisan: 1) Tujuan Umum (Mengetahui topik utama kajian/judul) & 2) Tujuan Khusus (Mengetahui sub-pokok uraian rinci).',
          'D. Manfaat Penulisan: 1) Manfaat Teoritis (Menambah teori baru pengembangan keilmuan) & 2) Manfaat Praktis (Sumbang saran pemahaman).',
          'E. Metode Penulisan: Studi Pustaka ((1) Mengumpulkan referensi relevan, (2) Memilih teori penunjang, (3) Menginterpretasikan teori).',
          'F. Sistematika Pembahasan: Menguraikan alur pembahasan dari BAB I hingga BAB IV.'
        ]
      },
      {
        heading: 'BAB II LANDASAN TEORI / KAJIAN PUSTAKA',
        items: [
          '1. Deskripsi Teori: Mendeskripsikan dan menjawab pertanyaan penulisan dengan pendekatan teoritis mendasar.',
          '2. Interpretasi Teori: Mengkritisi dan menginterpretasikan berbagai teori dari berbagai pendekatan keilmuan yang digunakan.'
        ]
      },
      {
        heading: 'BAB III PEMBAHASAN',
        items: [
          '1. Analisis ➔ Menghubungkan teori dan fakta empiris.',
          '2. Interpretasi ➔ Dijelaskan kembali dengan bahasa dan gagasan kritis penulis (diungkap apa adanya & digabungkan dengan bahasa penulis).',
          '3. Diskusi ➔ Penambahan referensi dengan buku-buku / literatur lain.',
          '4. Integrasi Analisis-Interpretasi-Diskusi ➔ Terintegrasi secara sistematis untuk memunculkan solusi terkait topik bahasan yang didukung berbagai teori maupun realitas.'
        ]
      },
      {
        heading: 'BAB IV KESIMPULAN DAN REKOMENDASI',
        items: [
          'A. Kesimpulan: 1) Kesimpulan Umum (Menemukan konsep tentang judul) & 2) Kesimpulan Khusus (Menjawab tujuan khusus / pertanyaan penelitian).',
          'B. Implikasi: Hasil kajian berimplikasi terhadap pengembangan pengetahuan, wawasan konsep, serta membantu/menginspirasi dalam proses kegiatan pengelolaan.',
          'C. Rekomendasi: Mengusulkan saran yang dianjurkan (misal: penumbuhan jiwa kepemimpinan pribadi, peningkatan efisiensi, dll).',
          'D. Daftar Pustaka: Memuat referensi rujukan ilmiah secara lengkap.'
        ]
      }
    ]
  },
  {
    id: 'artikel-jurnal',
    title: 'Pedoman Penulisan Artikel 2026',
    badge: 'Format Standar Artikel & Layout 4-4-3-3',
    icon: 'FileText',
    description: 'Panduan khusus penulisan artikel ilmiah berbasis riset pustaka (library research), alur 4 paragraf pendahuluan, pembahasan, hingga layout margin.',
    sections: [
      {
        heading: 'ALUR 4 PARAGRAF PENDAHULUAN ARTIKEL',
        items: [
          'Paragraf 1 (Mengapa Masalah Ini Penting?): Menggambarkan fenomena, fakta empiris, data, perubahan kebijakan, dan kesenjangan antara kondisi ideal vs kondisi aktual.',
          'Paragraf 2 (Apa yang Sudah Diketahui?): Menjelaskan state of the art dan penelitian terdahulu. Membandingkan, mengaitkan, dan menyintesiskan artikel jurnal mutakhir.',
          'Paragraf 3 (Apa yang Belum Diketahui?): Menguraikan research gap (objek, teori, metode) & novelty (kebaruan/kontribusi baru penelitian). Pola: "Penelitian terdahulu menjelaskan X, tetapi belum menjelaskan Y, maka penelitian ini menawarkan Z".',
          'Paragraf 4 (Apa yang Dilakukan?): Menyatakan secara tegas tujuan, fokus, dan kontribusi penelitian untuk mengisi kesenjangan.'
        ]
      },
      {
        heading: 'METODE & PEMBAHASAN ARTIKEL LITERATUR',
        items: [
          'Metode Riset Pustaka (Library Research): Menjelaskan pendekatan (kualitatif-deskriptif, filosofis, tafsir tematik), sumber primer & sekunder, kriteria pemilihan literatur, teknik analisis, serta penjaminan kredibilitas (triangulasi perspektif).',
          'Temuan & Pembahasan: Hasil dikelompokkan berdasarkan tema/konsep utama (bukan sekadar tafsir ayat per ayat terpisah). Pembahasan mendialogkan temuan dengan teori & penelitian terdahulu (Temuan ➔ Bukti Pustaka ➔ Analisis ➔ Dialog Teori ➔ Sintesis/Novelty ➔ Implikasi).',
          'Simpulan: Jawaban akhir ringkas & terintegrasi merumuskan temuan utama, kontribusi, dan implikasi/rekomendasi.',
          'Daftar Pustaka & Sitasi: Menggunakan gaya APA 7th Edition (memuat DOI). Format footnote untuk buku, jurnal, kitab tafsir (misal: Al-Tabari, Jami\' al-Bayan), dan website resmi.'
        ]
      },
      {
        heading: 'TATA LETAK HALAMAN & MARGIN (PAGE SETUP)',
        items: [
          'Margin Kertas: Margin Atas: 4 cm, Margin Kiri: 4 cm, Margin Kanan: 3 cm, Margin Bawah: 3 cm (Aturan 4-4-3-3).',
          'Nomor Halaman: Ditempatkan di Bagian Tengah Bawah halaman.'
        ]
      }
    ]
  }
];

export const INITIAL_COURSES: Course[] = [
  {
    id: 'hmpi',
    code: 'HMPI',
    name: 'Hadis Manajemen Pendidikan',
    lecturer: 'Dr. H. Moh. Sulhan, M.Ag. / Dr. Dadan F Ramdan, M.M.Pd',
    day: 'Jumat',
    time: '06:30 - 09:00',
    room: 'Ruang 16 Lt.3',
    pjName: 'PJ HMPI',
    pjContact: '0812-3456-7890',
    colorTheme: {
      bgLight: '#FEF3E2',
      borderLight: '#FDE0B2',
      textLight: '#78350F',
      badgeBgLight: '#FDE68A',
      badgeTextLight: '#92400E',
      darkBg: '#2D2013',
      darkBorder: '#523A1F',
      darkText: '#FDE68A',
      accent: '#D97706',
    },
    syllabusSummary: 'Mengkaji dasar profetis ajaran Nabi SAW tentang Manusia, Perencanaan, Organizing, Actuating, Controlling, Kepemimpinan, Psikologi & Etika Organisasi. Memuat seminar makalah berbasis takhrij & syarah hadis.',
    driveFolderUrl: 'https://drive.google.com/drive/folders/1mj_UXv6kjYZzBuIru8m0mkSMnKSzWFwF',
    syllabusPdfs: [],
    tasks: [
      {
        id: 'hmpi-task-uas',
        title: 'Tugas UAS: Makalah Integratif Hadis Manajemen & Kajian Takhrij',
        description: 'Penyusunan naskah komprehensif mengintegrasikan kajian takhrij, syarah hadis mu\'tabar, tafsir bil ayat, dan implikasinya terhadap tata kelola lembaga pendidikan Islam kontemporer sesuai sistematika baku.',
        deadline: '2026-06-30T23:59',
        type: 'Individu',
        category: 'UAS',
        status: 'Belum'
      }
    ],
    groups: [],
    guidelineSections: [
      {
        heading: 'SISTEMATIKA KHUSUS MAKALAH HADITS MANAJEMEN',
        items: [
          '1. Judul & Tema: Menghubungkan tema hadis dengan masalah atau kondisi umum kontemporer hari ini.',
          '2. Teks Hadis & Terjemah: Memilih dan menyajikan teks hadis Arab beserta terjemahannya.',
          '3. Takhrij Hadis: Menelusuri sumber asli (Mashodir al-Ashliyah) dari Kutubussittah / Kitab 9 Imam.',
          '4. Penjelasan (Syarah Hadis): Menguraikan makna hadis dari kitab-kitab syarah mu\'tabar (Ikmal Al-Mu\'allim, Fathul Bari, Subulus Salam).',
          '5. Tafsir bil Ayat: Memperkaya analisis dengan ayat-ayat Al-Qur\'an pendukung.',
          '6. Tafsir Manajemen Pendidikan: Menganalisis implikasi pesan profetis hadis ke dalam teori & praktik Manajemen Pendidikan Islam.'
        ]
      }
    ]
  },
  {
    id: 'fmpi',
    code: 'FMPI',
    name: 'Filsafat Manajemen Pend. Islam',
    lecturer: 'Dr. Dian, M.Ag. / Dr. Ahmad Masrul Anwar, M.Ag. / Prof. Dr. Karman, M.Ag.',
    day: 'Jumat',
    time: '09:00 - 11:30',
    room: 'Ruang 16 Lt.3',
    pjName: 'PJ FMPI',
    pjContact: '0812-3456-7891',
    colorTheme: {
      bgLight: '#FDE8E8',
      borderLight: '#FBD5D5',
      textLight: '#9B1C1C',
      badgeBgLight: '#F87171',
      badgeTextLight: '#FFFFFF',
      darkBg: '#371B1B',
      darkBorder: '#5F2121',
      darkText: '#F87171',
      accent: '#E02424',
    },
    syllabusSummary: 'Menggali filsafat di balik ilmu pengetahuan, konsep dasar & sejarah pemikiran filosofis (Yunani, Barat, Islam), 3 pilar (Ontologi, Epistemologi, Aksiologi), dan penerapan pada tata kelola Lembaga Pendidikan Islam.',
    driveFolderUrl: 'https://drive.google.com/drive/folders/1oB-e5Q2ZcEMPTwlo-JWygNbgcQkTNdJr',
    syllabusPdfs: [],
    tasks: [
      {
        id: 'fmpi-task-jurnal',
        title: 'Tugas Pembuatan Artikel Jurnal Filsafat MPI (7 Kelompok Jurnal)',
        description: 'Penulisan artikel ilmiah berbasis riset literatur filosofis (Ontologi, Epistemologi, Aksiologi) dalam tata kelola lembaga pendidikan Islam era 5.0, format 4 paragraf pendahuluan dan template jurnal.',
        deadline: '2026-06-20T23:59',
        type: 'Kelompok',
        category: 'Jurnal',
        status: 'Belum'
      },
      {
        id: 'fmpi-task-uas',
        title: 'Tugas Akhir Semester (UAS): Portofolio Kajian Kritis Filsafat MPI',
        description: 'Penyusunan laporan komprehensif dan responsi arah paradigma keilmuan Prodi Manajemen Pendidikan Islam berlandaskan Wahyu Memandu Ilmu (WMI).',
        deadline: '2026-06-30T23:59',
        type: 'Individu',
        category: 'UAS',
        status: 'Belum'
      }
    ],
    groups: []
  },
  {
    id: 'pmpi',
    code: 'PMPI',
    name: 'Problematika Manajemen Pend. Islam',
    lecturer: 'Dr. H. Mulyawan S. Nugraha M.Ag., M.Pd.',
    day: 'Jumat',
    time: '12:50 - 15:20',
    room: 'PPG C10 Lt.2',
    pjName: 'PJ PMPI',
    pjContact: '0812-3456-7892',
    colorTheme: {
      bgLight: '#EBF5FF',
      borderLight: '#D0E1FD',
      textLight: '#1E429F',
      badgeBgLight: '#60A5FA',
      badgeTextLight: '#FFFFFF',
      darkBg: '#132840',
      darkBorder: '#1E429F',
      darkText: '#93C5FD',
      accent: '#2563EB',
    },
    syllabusSummary: 'Menganalisis isu-isu strategis, persoalan manajerial, mutu SDM, dan tata kelola sarana prasarana pada lembaga pendidikan Islam kontemporer.',
    driveFolderUrl: 'https://drive.google.com/drive/folders/15uRwA6i1vDHw1tIRExbrvOWchxmP6UyT',
    syllabusPdfs: [],
    tasks: [
      {
        id: 'pmpi-task-uas',
        title: 'Tugas UAS: Riset Kasus & Solusi Problematika Manajemen Pendidikan Islam',
        description: 'Penyusunan naskah analisis problem empiris di madrasah/pesantren/PTKI disertai rekomendasi solusi strategis manajerial yang aplikatif.',
        deadline: '2026-06-30T23:59',
        type: 'Individu',
        category: 'UAS',
        status: 'Belum'
      }
    ],
    groups: []
  },
  {
    id: 'tmpi',
    code: 'TMPI',
    name: 'Tafsir Manajemen Pendidikan',
    lecturer: 'Dr. Heri Khoiruddin, M.Ag.',
    day: 'Jumat',
    time: '15:20 - 17:50',
    room: 'Ruang 16 Lt.3',
    pjName: 'PJ TMPI',
    pjContact: '0812-3456-7893',
    colorTheme: {
      bgLight: '#F3E8FF',
      borderLight: '#E9D5FF',
      textLight: '#6B21A8',
      badgeBgLight: '#C084FC',
      badgeTextLight: '#FFFFFF',
      darkBg: '#2A183B',
      darkBorder: '#581C87',
      darkText: '#E9D5FF',
      accent: '#9333EA',
    },
    syllabusSummary: 'Menganalisis ayat-ayat Al-Qur\'an menggunakan metodologi tafsir (Tahlili, Ijmali, Muqaran, Maudlu\'i) & mentransformasikan nilai Al-Qur\'an ke manajemen pendidikan. Penugasan publikasi Jurnal SINTA 3.',
    driveFolderUrl: 'https://drive.google.com/drive/folders/1WArJLtyzfeB5AStcz7mNyA62rQhXZmCI',
    syllabusPdfs: [],
    tasks: [
      {
        id: 'tmpi-task-jurnal-sinta3',
        title: 'Tugas Utama: Publikasi Artikel Jurnal Bereputasi SINTA 3 (4 Kelompok)',
        description: 'Penyusunan dan submit artikel ilmiah bereputasi nasional terakreditasi SINTA 3 berbasis 4 fokus Ulumul Qur\'an dalam Manajemen Pendidikan Islam (Kaidah \'Am-Khas, Asbabun Nuzul, Muhkam-Mutasyabih, atau Tafsir Maudlu\'i).',
        deadline: '2026-06-25T23:59',
        type: 'Kelompok',
        category: 'Jurnal',
        status: 'Belum'
      },
      {
        id: 'tmpi-task-uas',
        title: 'Tugas UAS: Naskah Final & Bukti Submit / Letter of Acceptance (LoA) Jurnal',
        description: 'Pengumpulan berkas artikel jurnal utuh beserta bukti pengiriman (submission receipt/LoA) dari jurnal sasaran SINTA 3.',
        deadline: '2026-06-30T23:59',
        type: 'Kelompok',
        category: 'UAS',
        status: 'Belum'
      }
    ],
    groups: [],
    guidelineSections: [
      {
        heading: '4 PILIHAN JUDUL & FOKUS ARTIKEL JURNAL SINTA 3',
        items: [
          '1. Aplikasi Kaidah \'Am dan Khash dalam Ulumul Qur\'an untuk Formulasi Kebijakan dan Regulasi Lembaga Pendidikan Islam (Fokus: Menurunkan kebijakan makro madrasah/pesantren menjadi aturan mikro/SOP yang efektif).',
          '2. Pendekatan Asbabun Nuzul dalam Ulumul Qur\'an sebagai Basis Analisis Kebutuhan (Need Assessment) Perencanaan Strategis Pendidikan (Fokus: Menelaah latar belakang turunnya ayat sebagai model teoretis analisis SWOT/RKJM).',
          '3. Kontekstualisasi Konsep Muhkam dan Mutasyabih dalam Ulumul Qur\'an terhadap Manajemen Konflik Organisasi Madrasah (Fokus: Memetakan konflik prinsipil vs fleksibel serta teknik pengelolaannya).',
          '4. Analisis Tafsir Maudlu\'i sebagai Metode Ulumul Qur\'an dalam Mengonstruksi Teori Kepemimpinan Pendidikan Islam Kontemporer (Fokus: Artikel konseptual menawarkan penemuan teori baru via metode Maudlu\'i).'
        ]
      }
    ]
  },
  {
    id: 'ppi',
    code: 'PPI',
    name: 'Perencanaan Pendidikan Islam',
    lecturer: 'Dr. H. Dodo Murtado, M.Si',
    day: 'Sabtu',
    time: '06:30 - 09:00',
    room: 'Ruang 16 Lt.3',
    pjName: 'PJ PPI',
    pjContact: '0812-3456-7894',
    colorTheme: {
      bgLight: '#EEF2FF',
      borderLight: '#E0E7FF',
      textLight: '#3730A3',
      badgeBgLight: '#818CF8',
      badgeTextLight: '#FFFFFF',
      darkBg: '#1E1B4B',
      darkBorder: '#3730A3',
      darkText: '#C7D2FE',
      accent: '#4F46E5',
    },
    syllabusSummary: 'Membahas konsep, teori, prinsip, & praktik perencanaan pendidikan Islam berbasis Outcome-Based Education (OBE). Menghasilkan dokumen proyek Renstra Lembaga Pendidikan Islam 7 BAB.',
    driveFolderUrl: 'https://drive.google.com/drive/folders/1d_dHYNkw6Ez4E145JKYUgLPfOgjsekB8',
    syllabusPdfs: [],
    tasks: [
      {
        id: 'ppi-task-renstra-proyek',
        title: 'Tugas Proyek Utama: Penyusunan Dokumen Renstra Lembaga Pendidikan Islam 7 BAB',
        description: 'Penyusunan blueprint perencanaan strategis komprehensif 7 BAB (Pendahuluan, Analisis Kondisi, Renstra & KPI, Program Pengembangan, Pembiayaan RAB, Manajemen Risiko & Monev, Penutup) berbasis OBE.',
        deadline: '2026-06-25T23:59',
        type: 'Kelompok',
        category: 'Proyek',
        status: 'Belum'
      },
      {
        id: 'ppi-task-uas',
        title: 'Tugas UAS: Sidang & Evaluasi Kelayakan Dokumen Renstra Lembaga',
        description: 'Ujian Akhir Semester berbasis pertanggungjawaban naskah Renstra dan pemaparan evaluasi kelayakan program pengembangan lembaga.',
        deadline: '2026-06-30T23:59',
        type: 'Individu',
        category: 'UAS',
        status: 'Belum'
      }
    ],
    groups: [],
    guidelineSections: [
      {
        heading: 'DOKUMEN PROYEK RENSTRA 7 BAB',
        items: [
          'BAB I PENDAHULUAN: Latar Belakang, Identifikasi Masalah, Tujuan Perencanaan.',
          'BAB II ANALISIS KONDISI: Profil Lembaga, Analisis Internal & Eksternal, Needs Assessment, Analisis SWOT/TOWS.',
          'BAB III PERENCANAAN STRATEGIS: Visi, Misi, Tujuan Strategis, Sasaran, Key Performance Indicators (KPI), Formulasi Strategi.',
          'BAB IV PROGRAM PENGEMBANGAN: Program Prioritas, Rencana Kegiatan, Target, Penanggung Jawab (PJ), Timeline, Resource Plan.',
          'BAB V PEMBIAYAAN: Rencana Anggaran Biaya (RAB), Sumber Pembiayaan, Prioritas Anggaran, Efisiensi Biaya.',
          'BAB VI RISIKO, MONITORING, DAN EVALUASI: Risk Register, Mitigasi Risiko, Sistem Monitoring, Evaluasi Output/Outcome/Impact, Indikator Keberhasilan.',
          'BAB VII PENUTUP: Kesimpulan & Rekomendasi Kebijakan Pengembangan.'
        ]
      }
    ]
  },
  {
    id: 'mmtpi',
    code: 'MMTPI',
    name: 'Manajemen Mutu Terpadu Pend. Islam',
    lecturer: 'Dr. H. Hasbiyallah, M.Ag.',
    day: 'Sabtu',
    time: '09:00 - 11:30',
    room: 'Ruang 16 Lt.3',
    pjName: 'PJ MMTPI',
    pjContact: '0812-3456-7895',
    colorTheme: {
      bgLight: '#ECFDF5',
      borderLight: '#A7F3D0',
      textLight: '#065F46',
      badgeBgLight: '#34D399',
      badgeTextLight: '#064E3B',
      darkBg: '#0F382C',
      darkBorder: '#065F46',
      darkText: '#6EE7B7',
      accent: '#059669',
    },
    syllabusSummary: 'Penerapan konsep Total Quality Management (TQM/MMT) dalam pendidikan: sejarah & tokoh (Deming, Juran, Crosby), model TQM/TQE/ISO/Malcolm Baldrige, alat bantu (Fishbone, Pareto), & SPMI BAN-S/M.',
    driveFolderUrl: 'https://drive.google.com/drive/folders/1bJRMS_MoXu4GFGSG5rgIjRRr0-7Dsxli',
    syllabusPdfs: [],
    tasks: [
      {
        id: 'mmtpi-task-audit-mutu',
        title: 'Tugas Proyek: Studi Analisis Penjaminan Mutu & Alat TQM (Fishbone / SPMI)',
        description: 'Penerapan alat bantu mutu (Diagram Tulang Ikan, Analisis Pareto, atau Pemetaan SPMI BAN-S/M) pada lembaga pendidikan Islam rujukan.',
        deadline: '2026-06-25T23:59',
        type: 'Kelompok',
        category: 'Proyek',
        status: 'Belum'
      },
      {
        id: 'mmtpi-task-uas',
        title: 'Tugas UAS: Laporan Evaluasi Implementasi Total Quality Management (TQM)',
        description: 'Laporan komprehensif audit mutu internal dan rekomendasi strategi continuous quality improvement (CQI).',
        deadline: '2026-06-30T23:59',
        type: 'Individu',
        category: 'UAS',
        status: 'Belum'
      }
    ],
    groups: []
  },
  {
    id: 'dmpi',
    code: 'DMPI',
    name: 'Dasar-Dasar Manajemen Pend. Islam',
    lecturer: 'Dr. Ujang Nurjaman M.Ag.',
    day: 'Sabtu',
    time: '12:10 - 14:40',
    room: 'Ruang 16 Lt.3',
    pjName: 'PJ DMPI',
    pjContact: '0812-3456-7896',
    colorTheme: {
      bgLight: '#F0FDF4',
      borderLight: '#BBF7D0',
      textLight: '#166534',
      badgeBgLight: '#4ADE80',
      badgeTextLight: '#14532D',
      darkBg: '#143821',
      darkBorder: '#166534',
      darkText: '#86EFAC',
      accent: '#16A34A',
    },
    syllabusSummary: 'Prinsip dasar pengorganisasian, tata laksana administrasi, supervisi pendidikan, dan kepemimpinan lembaga pendidikan Islam.',
    driveFolderUrl: 'https://drive.google.com/drive/folders/1HzdfjQbpdkud8vsjLm0aMfaMJtPdnLdK',
    syllabusPdfs: [],
    tasks: [
      {
        id: 'dmpi-task-uas',
        title: 'Tugas UAS: Makalah Integrasi Prinsip Dasar Manajemen Pendidikan Islam',
        description: 'Penyusunan naskah kajian ilmiah mengenai penerapan fungsi-fungsi manajemen dasar (POAC) pada institusi pendidikan Islam formal/nonformal.',
        deadline: '2026-06-30T23:59',
        type: 'Individu',
        category: 'UAS',
        status: 'Belum'
      }
    ],
    groups: []
  }
];
