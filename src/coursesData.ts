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
  pdfFileName?: string;
  syllabusPdfs?: SyllabusFile[]; // Support 2 or more PDF files per course
  pjName?: string;
  pjContact?: string;
  tasks: Task[];
  groups: Group[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  deadline: string;
  type: 'Individu' | 'Kelompok';
  status: 'Belum' | 'Proses' | 'Selesai';
}

export interface Group {
  name: string;
  topic?: string;
  members: string[];
}

export const INITIAL_COURSES: Course[] = [
  {
    id: 'hmpi',
    code: 'HMPI',
    name: 'Hadis Manajemen Pendidikan',
    lecturer: 'Dr. Moh. Sulhan S.Ag., M.Ag.',
    day: 'Jumat',
    time: '06:30 - 09:00',
    room: 'Ruang 16 Lt.3',
    pjName: '',
    pjContact: '',
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
    syllabusSummary: 'Upload silabus mata kuliah ini melalui Panel Admin untuk menampilkan deskripsi perkuliahan.',
    syllabusPdfs: [],
    tasks: [],
    groups: []
  },
  {
    id: 'fmpi',
    code: 'FMPI',
    name: 'Filsafat Manajemen Pend. Islam',
    lecturer: 'Dr. Dian M.Ag.',
    day: 'Jumat',
    time: '09:00 - 11:30',
    room: 'Ruang 16 Lt.3',
    pjName: '',
    pjContact: '',
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
    syllabusSummary: 'Upload silabus mata kuliah ini melalui Panel Admin untuk menampilkan deskripsi perkuliahan.',
    syllabusPdfs: [],
    tasks: [],
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
    pjName: '',
    pjContact: '',
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
    syllabusSummary: 'Upload silabus mata kuliah ini melalui Panel Admin untuk menampilkan deskripsi perkuliahan.',
    syllabusPdfs: [],
    tasks: [],
    groups: []
  },
  {
    id: 'tmpi',
    code: 'TMPI',
    name: 'Tafsir Manajemen Pendidikan',
    lecturer: 'Dr. Heri Khoiruddin M.Ag.',
    day: 'Jumat',
    time: '15:20 - 17:50',
    room: 'Ruang 16 Lt.3',
    pjName: '',
    pjContact: '',
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
    syllabusSummary: 'Upload silabus mata kuliah ini melalui Panel Admin untuk menampilkan deskripsi perkuliahan.',
    syllabusPdfs: [],
    tasks: [],
    groups: []
  },
  {
    id: 'ppi',
    code: 'PPI',
    name: 'Perencanaan Pendidikan Islam',
    lecturer: 'Dr. Dodo Murtado M.Si',
    day: 'Sabtu',
    time: '06:30 - 09:00',
    room: 'Ruang 16 Lt.3',
    pjName: '',
    pjContact: '',
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
    syllabusSummary: 'Upload silabus mata kuliah ini melalui Panel Admin untuk menampilkan deskripsi perkuliahan.',
    syllabusPdfs: [],
    tasks: [],
    groups: []
  },
  {
    id: 'mmtpi',
    code: 'MMTPI',
    name: 'Manajemen Mutu Terpadu Pend. Islam',
    lecturer: 'Dr. H. Hasbiyallah M.Ag.',
    day: 'Sabtu',
    time: '09:00 - 11:30',
    room: 'Ruang 16 Lt.3',
    pjName: '',
    pjContact: '',
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
    syllabusSummary: 'Upload silabus mata kuliah ini melalui Panel Admin untuk menampilkan deskripsi perkuliahan.',
    syllabusPdfs: [],
    tasks: [],
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
    pjName: '',
    pjContact: '',
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
    syllabusSummary: 'Upload silabus mata kuliah ini melalui Panel Admin untuk menampilkan deskripsi perkuliahan.',
    syllabusPdfs: [],
    tasks: [],
    groups: []
  }
];
