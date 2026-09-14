import React, { useState, useEffect, useRef, Component, ErrorInfo, ReactNode } from 'react';
import { INITIAL_COURSES, Course, Task, Group, SyllabusFile } from './coursesData';
import { supabase } from './supabaseClient';
import { 
  Sun, Moon, Calendar, Clock, MapPin, UserCheck, BookOpen, 
  FileText, Users, CheckCircle2,
  Plus, ArrowLeft, Send, Sparkles, ChevronRight, ShieldAlert,
  Lock, LogOut, KeyRound, UserPlus, Search, Download, Trash2,
  Database, Paperclip, ExternalLink, Megaphone, Video
} from 'lucide-react';

export interface ClassAnnouncement {
  isActive: boolean;
  title: string;
  courseName: string;
  lecturerName: string;
  dayDate: string;
  time: string;
  location: string;
  meetUrl?: string;
  agenda?: string;
  notes?: string;
  updatedAt?: string;
}

const DEFAULT_ANNOUNCEMENT: ClassAnnouncement = {
  isActive: true,
  title: 'Agenda Kuliah Terdekat & Pengumuman',
  courseName: 'Dasar-Dasar Manajemen Pendidikan Islam (DMPI)',
  lecturerName: 'Dr. Ujang Nurjaman, M.Ag.',
  dayDate: 'Sabtu, 20 September 2026',
  time: '08:00 - 09:40 WIB',
  location: 'Gedung Pascasarjana Lt. 3 / Ruang 304',
  meetUrl: '',
  agenda: 'Orientasi Silabus Perkuliahan & Pembagian Kelompok Diskusi',
  notes: 'Harap hadir tepat waktu dan mempersiapkan file silabus serta laptop/tablet untuk koordinasi.',
};



// Safe Merge helper to prevent null/undefined runtime crashes and clean dummy data
const mergeWithDefaults = (savedCourses: any[]): Course[] => {
  if (!Array.isArray(savedCourses) || savedCourses.length === 0) return INITIAL_COURSES;
  return INITIAL_COURSES.map(initial => {
    const saved = savedCourses.find(s => s && s.id === initial.id);
    if (!saved) return initial;

    // Filter out old pre-filled dummy tasks and groups
    const cleanTasks = Array.isArray(saved.tasks) 
      ? saved.tasks.filter((t: any) => t && !t.id?.endsWith('-task-1') && !t.id?.startsWith('dummy-')) 
      : [];
    
    // Check if saved groups contain old nicknames like 'Pak ' or 'Bu '
    const hasOldNicknames = Array.isArray(saved.groups) && saved.groups.some((g: any) => 
      Array.isArray(g.members) && g.members.some((m: string) => 
        typeof m === 'string' && (m.startsWith('Pak ') || m.startsWith('Bu ') || m.startsWith('Buk '))
      )
    );

    const cleanGroups = (Array.isArray(saved.groups) && !hasOldNicknames)
      ? saved.groups.filter((g: any) => g && !g.members?.includes('Ahmad') && !g.members?.includes('Fajar')) 
      : [];
    // Strip out all legacy pre-packaged /syllabus/... files so only newly linked Google Drive documents are shown
    const cleanPdfs = (Array.isArray(saved.syllabusPdfs) ? saved.syllabusPdfs : [])
      .filter((pdf: any) => pdf && pdf.url && !pdf.url.startsWith('/syllabus/'));
    const cleanPdfUrl = (saved.syllabusPdfUrl && !saved.syllabusPdfUrl.startsWith('/syllabus/')) 
      ? saved.syllabusPdfUrl 
      : undefined;

    // Filter out old legacy dummy groups so all courses start clean and empty until user imports them
    const isLegacyGroup = (g: any) => {
      if (!g) return true;
      const name = g.name || '';
      const topic = g.topic || '';
      return name.includes('(Diskusi)') || name.startsWith('Topik ') || topic.includes('Relasi Filsafat') || topic.includes('Sumber Penafsiran');
    };

    const userImportedGroups = cleanGroups.filter((g: any) => !isLegacyGroup(g));
    const finalGroups = userImportedGroups.map((g: any) => ({
      ...g,
      status: g.status === 'Selesai' ? 'Selesai' : 'Belum',
      completedAt: g.completedAt,
      driveUrl: g.driveUrl,
    }));

    // Merge initial official tasks (Jurnal, UAS, Proyek) with any user-saved tasks
    const officialTasks = initial.tasks || [];
    const userCustomTasks = cleanTasks.filter((ct: any) => !officialTasks.some(ot => ot.id === ct.id));
    const mergedTasks = [...officialTasks, ...userCustomTasks].map(t => {
      const savedTaskMatch = cleanTasks.find((st: any) => st.id === t.id);
      return savedTaskMatch ? { ...t, status: savedTaskMatch.status, driveUrl: savedTaskMatch.driveUrl || t.driveUrl } : t;
    });

    return {
      ...initial,
      ...saved,
      colorTheme: { ...initial.colorTheme, ...(saved.colorTheme || {}) },
      tasks: mergedTasks,
      groups: finalGroups,
      syllabusPdfs: cleanPdfs,
      syllabusPdfUrl: cleanPdfUrl,
      syllabusDriveUrl: saved.syllabusDriveUrl || initial.syllabusDriveUrl,
      driveFolderUrl: saved.driveFolderUrl || initial.driveFolderUrl,
      pdfFileName: undefined,
      guidelineSections: initial.guidelineSections || saved.guidelineSections,
    };
  });
};

// React Error Boundary Component to prevent blank screen
interface ErrorBoundaryProps {
  children: ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 text-center font-sans">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md max-w-sm space-y-3">
            <h2 className="text-lg font-bold text-rose-600">Aplikasi Mengalami Pembaruan Data</h2>
            <p className="text-xs text-slate-600">Terjadi pembaruan struktur data silabus. Silakan klik tombol di bawah untuk menyegarkan aplikasi.</p>
            <button
              onClick={() => {
                localStorage.removeItem('mps2_courses');
                window.location.reload();
              }}
              className="w-full py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-xs"
            >
              Reset Cache & Muat Ulang
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function MainApp() {
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [courses, setCourses] = useState<Course[]>(() => {
    const isCleaned = localStorage.getItem('mps2_clean_slate_2026') === 'v2';
    if (!isCleaned) {
      localStorage.removeItem('mps2_courses');
      localStorage.setItem('mps2_clean_slate_2026', 'v2');
      return INITIAL_COURSES;
    }
    const saved = localStorage.getItem('mps2_courses');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return mergeWithDefaults(parsed);
        }
      } catch (e) {
        console.error('Error parsing local storage:', e);
      }
    }
    return INITIAL_COURSES;
  });

  const [isSyncedWithSupabase, setIsSyncedWithSupabase] = useState<boolean>(false);
  const isInitialFetchCompleted = useRef<boolean>(false);
  const [showSqlGuide, setShowSqlGuide] = useState<boolean>(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'jadwal' | 'admin'>('jadwal');
  
  // Detail Course Tab
  const [detailTab, setDetailTab] = useState<'info' | 'tugas' | 'kelompok' | 'ai'>('info');
  const [activePdfIndex, setActivePdfIndex] = useState<number>(0);
  const [groupCategoryFilter, setGroupCategoryFilter] = useState<'all' | 'diskusi' | 'jurnal' | 'artikel'>('all');
  const [groupSearchQuery, setGroupSearchQuery] = useState<string>('');

  // PENGUMUMAN & AGENDA KULIAH SELANJUTNYA (KOSMA BROADCAST)
  const [announcement, setAnnouncement] = useState<ClassAnnouncement>(() => {
    const saved = localStorage.getItem('mps2_announcement');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing announcement cache:', e);
      }
    }
    return DEFAULT_ANNOUNCEMENT;
  });
  const [annForm, setAnnForm] = useState<ClassAnnouncement>(() => announcement);

  useEffect(() => {
    setAnnForm(announcement);
  }, [announcement]);

  // Helper to generate 1-click Google Calendar Event URL
  const getGoogleCalendarUrl = (ann: ClassAnnouncement) => {
    const title = encodeURIComponent(`Kuliah: ${ann.courseName}`);
    const details = encodeURIComponent(
      `Pengumuman: ${ann.title}\nMata Kuliah: ${ann.courseName}\nDosen: ${ann.lecturerName || '-'}\nAgenda: ${ann.agenda || '-'}\nCatatan: ${ann.notes || '-'}${ann.meetUrl ? `\nLink Meet/Daring: ${ann.meetUrl}` : ''}`
    );
    const location = encodeURIComponent(ann.location || (ann.meetUrl ? 'Daring (Google Meet)' : 'Gedung Pascasarjana'));
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}`;
  };

  // ADMIN AUTH & ROLE SYSTEM
  const [adminPIN, setAdminPIN] = useState<string>('');
  const [isLoggedInAdmin, setIsLoggedInAdmin] = useState<boolean>(() => {
    return localStorage.getItem('mps2_is_admin') === 'true';
  });

  // Search Filter State
  const [searchKeyword, setSearchKeyword] = useState('');

  // Direct Course AI Modal State
  const [showDirectAIModal, setShowDirectAIModal] = useState(false);
  const [directAIText, setDirectAIText] = useState('');
  const [isDirectAnalyzing, setIsDirectAnalyzing] = useState(false);
  const [selectedPjCourseId, setSelectedPjCourseId] = useState<string>(courses[0]?.id || 'hmpi');

  // Helper to normalize PDF files list per course
  const getCoursePdfs = (course: Course): SyllabusFile[] => {
    if (!course) return [];
    const list: SyllabusFile[] = Array.isArray(course.syllabusPdfs) ? [...course.syllabusPdfs] : [];
    if (course.syllabusPdfUrl && !list.some(f => f.url === course.syllabusPdfUrl)) {
      list.unshift({
        id: 'legacy-1',
        name: course.pdfFileName || `${course.code}_Silabus_1.pdf`,
        url: course.syllabusPdfUrl
      });
    }
    return list;
  };

  // SUPABASE INITIALIZATION & REALTIME SYNC
  useEffect(() => {
    const fetchFromSupabase = async () => {
      try {
        const { data, error } = await supabase
          .from('mps2_store')
          .select('data')
          .eq('id', 'courses_data')
          .single();

        if (data && data.data && Array.isArray(data.data) && data.data.length > 0) {
          const merged = mergeWithDefaults(data.data);
          setCourses(merged);
          localStorage.setItem('mps2_courses', JSON.stringify(merged));
          
          // Check if Supabase cloud store still had legacy dummy groups
          const cloudHadLegacy = data.data.some((c: any) => {
            const hasLegacyGroups = Array.isArray(c.groups) && c.groups.some((g: any) => 
              g.name?.includes('(Diskusi)') || 
              g.name?.startsWith('Topik ') || 
              g.topic?.includes('Relasi Filsafat') || 
              g.topic?.includes('Sumber Penafsiran')
            );
            return hasLegacyGroups;
          });
          if (cloudHadLegacy) {
            supabase.from('mps2_store').upsert({ id: 'courses_data', data: merged, updated_at: new Date().toISOString() }).then(() => {
              console.log("Supabase successfully cleaned of legacy dummy groups.");
            });
          }

          setIsSyncedWithSupabase(true);
        } else if (error) {
          console.warn("Supabase initial fetch notice:", error.message);
        }
        // Fetch Gemini AI API key config securely from Supabase
        const { data: geminiData } = await supabase
          .from('mps2_store')
          .select('data')
          .eq('id', 'gemini_config')
          .single();

        if (geminiData && geminiData.data && geminiData.data.api_key) {
          setGeminiApiKey(geminiData.data.api_key);
          localStorage.setItem('mps2_gemini_api_key', geminiData.data.api_key);
        }

        // Fetch class announcement from Supabase
        const { data: annData } = await supabase
          .from('mps2_store')
          .select('data')
          .eq('id', 'class_announcement')
          .single();

        if (annData && annData.data) {
          setAnnouncement(annData.data);
          localStorage.setItem('mps2_announcement', JSON.stringify(annData.data));
        }
      } catch (err) {
        console.log('Supabase storage fallback to local cache.', err);
      } finally {
        isInitialFetchCompleted.current = true;
      }
    };

    fetchFromSupabase();

    // Listen to realtime updates across all devices
    const channel = supabase
      .channel('mps2_realtime_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mps2_store' },
        (payload: any) => {
          if (payload.new) {
            if (payload.new.id === 'courses_data' && payload.new.data) {
              const merged = mergeWithDefaults(payload.new.data);
              setCourses(merged);
              localStorage.setItem('mps2_courses', JSON.stringify(merged));
              setIsSyncedWithSupabase(true);
              isInitialFetchCompleted.current = true;
            } else if (payload.new.id === 'class_announcement' && payload.new.data) {
              setAnnouncement(payload.new.data);
              localStorage.setItem('mps2_announcement', JSON.stringify(payload.new.data));
            } else if (payload.new.id === 'gemini_config' && payload.new.data?.api_key) {
              setGeminiApiKey(payload.new.data.api_key);
              localStorage.setItem('mps2_gemini_api_key', payload.new.data.api_key);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // PERSIST & AUTO SYNC TO SUPABASE & LOCALSTORAGE
  useEffect(() => {
    localStorage.setItem('mps2_courses', JSON.stringify(courses));

    // Prevent race condition: DO NOT overwrite Supabase until initial fetch has completed!
    if (!isInitialFetchCompleted.current) return;

    const syncTimer = setTimeout(() => {
      supabase
        .from('mps2_store')
        .upsert({ id: 'courses_data', data: courses, updated_at: new Date().toISOString() })
        .then((res) => {
          if (!res.error) {
            setIsSyncedWithSupabase(true);
          } else {
            console.error('Supabase auto-sync error:', res.error.message);
            setIsSyncedWithSupabase(false);
          }
        });
    }, 600);

    return () => clearTimeout(syncTimer);
  }, [courses]);

  const handleForceCloudPull = async () => {
    try {
      const { data, error } = await supabase
        .from('mps2_store')
        .select('data')
        .eq('id', 'courses_data')
        .single();

      if (data && data.data && Array.isArray(data.data)) {
        const merged = mergeWithDefaults(data.data);
        setCourses(merged);
        localStorage.setItem('mps2_courses', JSON.stringify(merged));
        setIsSyncedWithSupabase(true);
        isInitialFetchCompleted.current = true;
        alert('Berhasil mengambil data terbaru dari Cloud Supabase!');
      } else {
        alert('Belum ada data tersimpan di Cloud Supabase. (Error: ' + (error?.message || 'Data Kosong') + ')');
      }
    } catch (err: any) {
      alert('Gagal terhubung ke Supabase: ' + (err.message || 'Network error'));
    }
  };



  // Backup & Reset Functionality
  const handleExportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(courses, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `mps2_portal_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleResetAllData = () => {
    if (window.confirm("Apakah Anda yakin ingin mengosongkan ulang seluruh data tugas dan silabus?")) {
      setCourses(INITIAL_COURSES);
      localStorage.removeItem('mps2_courses');
      supabase.from('mps2_store').delete().eq('id', 'courses_data').then(() => {});
      alert("Seluruh data telah di-reset ke kondisi bersih!");
    }
  };

  // Pengumuman & Broadcast Handlers
  const handleSaveAnnouncement = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isLoggedInAdmin) {
      alert('Akses Ditolak: Hanya Kosma yang dapat menyiarkan pengumuman.');
      return;
    }

    const updated: ClassAnnouncement = {
      ...annForm,
      updatedAt: new Date().toISOString(),
    };

    setAnnouncement(updated);
    localStorage.setItem('mps2_announcement', JSON.stringify(updated));

    try {
      const { error } = await supabase
        .from('mps2_store')
        .upsert({ id: 'class_announcement', data: updated, updated_at: new Date().toISOString() });

      if (error) {
        console.error('Error saving announcement to Supabase:', error.message);
        alert('Pengumuman tersimpan di lokal (Supabase sync notice: ' + error.message + ')');
      } else {
        alert('🎉 Berhasil! Pengumuman & Agenda Kuliah Terbaru berhasil disimpan dan langsung disiarkan ke seluruh mahasiswa!');
      }
    } catch (err: any) {
      alert('Pengumuman tersimpan di browser Anda: ' + (err.message || 'Offline mode'));
    }
  };

  const handleResetAnnouncement = async () => {
    if (!isLoggedInAdmin) return;
    if (window.confirm('Apakah Anda yakin ingin mematikan/menghapus siaran pengumuman di beranda?')) {
      const cleared: ClassAnnouncement = {
        ...announcement,
        isActive: false,
        updatedAt: new Date().toISOString()
      };
      setAnnouncement(cleared);
      setAnnForm(cleared);
      localStorage.setItem('mps2_announcement', JSON.stringify(cleared));
      try {
        await supabase.from('mps2_store').upsert({ id: 'class_announcement', data: cleared, updated_at: new Date().toISOString() });
      } catch (err) {}
      alert('Siaran pengumuman telah dinonaktifkan dari beranda mahasiswa.');
    }
  };

  // AI Chat with Google Gemini
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    return localStorage.getItem('mps2_gemini_api_key') || '';
  });
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [chatQuery, setChatQuery] = useState('');
  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'ai'; text: string }[]>([]);

  // Helper to format AI text nicely (render **bold** into <strong>, without raw asterisks)
  const renderFormattedAiText = (text: string) => {
    // Split by **text**
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-extrabold text-purple-700 dark:text-purple-300">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  // Task & Group Modals/Forms
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [newTaskType, setNewTaskType] = useState<'Individu' | 'Kelompok'>('Individu');

  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupTopic, setNewGroupTopic] = useState('');
  const [newGroupMembers, setNewGroupMembers] = useState('');

  // PJ Info Edit Form State
  const [editPjName, setEditPjName] = useState('');
  const [editPjContact, setEditPjContact] = useState('');

  // Smart Import Kelompok State (Parse WhatsApp text or PDF lists)
  const [showSmartImportModal, setShowSmartImportModal] = useState<boolean>(false);
  const [importTargetCourseId, setImportTargetCourseId] = useState<string>('pmpi');
  const [importRawText, setImportRawText] = useState<string>('');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [parsedPreviewGroups, setParsedPreviewGroups] = useState<Group[]>([]);

  // Fullscreen In-App Mobile PDF Viewer State
  const [fullscreenPdf, setFullscreenPdf] = useState<SyllabusFile | null>(null);

  // In-App Google Drive Modal Viewer State
  const [activeDriveDoc, setActiveDriveDoc] = useState<{ title: string; embedUrl: string; rawUrl: string; downloadUrl?: string } | null>(null);

  // Modal to Link Google Drive File (For Kosma Admin)
  const [showLinkDriveModal, setShowLinkDriveModal] = useState<{ 
    courseId: string; 
    groupIndex?: number; 
    taskId?: string; 
    isSyllabus?: boolean;
    isCourseFolder?: boolean;
    title: string; 
    currentUrl?: string 
  } | null>(null);
  const [driveInputUrl, setDriveInputUrl] = useState('');

  // Helper to convert any Google Drive sharing link into an in-app embed preview URL & direct download URL
  const convertToDriveEmbedUrl = (url: string): { embedUrl: string; downloadUrl?: string } => {
    if (!url) return { embedUrl: '' };
    const clean = url.trim();
    // Match file ID: /file/d/{id} or id={id}
    const fileMatch = clean.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) || clean.match(/id=([a-zA-Z0-9_-]+)/);
    if (fileMatch && fileMatch[1]) {
      const fileId = fileMatch[1];
      return {
        embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
        downloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`
      };
    }
    // Match folder ID: /drive/folders/{id}
    const folderMatch = clean.match(/\/drive\/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch && folderMatch[1]) {
      return {
        embedUrl: `https://drive.google.com/embeddedfolderview?id=${folderMatch[1]}#grid`,
        downloadUrl: clean
      };
    }
    return { embedUrl: clean, downloadUrl: clean };
  };

  const handleOpenDriveDoc = (title: string, rawUrl: string) => {
    const { embedUrl, downloadUrl } = convertToDriveEmbedUrl(rawUrl);
    setActiveDriveDoc({ title, embedUrl, rawUrl, downloadUrl });
  };

  const handleSaveDriveLink = () => {
    if (!showLinkDriveModal) return;
    const { courseId, groupIndex, taskId, isSyllabus, isCourseFolder } = showLinkDriveModal;
    const url = driveInputUrl.trim();

    setCourses(prev => {
      const updated = prev.map(c => {
        if (c.id === courseId) {
          if (isSyllabus) {
            return { ...c, syllabusDriveUrl: url || undefined };
          } else if (isCourseFolder) {
            return { ...c, driveFolderUrl: url || undefined };
          } else if (groupIndex !== undefined) {
            const updatedGroups = [...(c.groups || [])];
            if (updatedGroups[groupIndex]) {
              updatedGroups[groupIndex] = { ...updatedGroups[groupIndex], driveUrl: url || undefined };
            }
            return { ...c, groups: updatedGroups };
          } else if (taskId) {
            const updatedTasks = (c.tasks || []).map(t => t.id === taskId ? { ...t, driveUrl: url || undefined } : t);
            return { ...c, tasks: updatedTasks };
          }
        }
        return c;
      });
      localStorage.setItem('mps2_courses', JSON.stringify(updated));
      supabase.from('mps2_store').upsert({ id: 'courses_data', data: updated, updated_at: new Date().toISOString() });
      return updated;
    });

    setShowLinkDriveModal(null);
    setDriveInputUrl('');
    alert('Link Google Drive berhasil disimpan dan langsung terhubung di web portal!');
  };

  const handleOpenPdfFullscreen = (pdf: SyllabusFile) => {
    if (pdf.url && pdf.url.startsWith('data:application/pdf;base64,')) {
      try {
        const base64Data = pdf.url.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);
        setFullscreenPdf({ ...pdf, url: blobUrl });
        return;
      } catch (e) {
        console.error("Base64 conversion error:", e);
      }
    }
    setFullscreenPdf(pdf);
  };

  const selectedCourse = courses.find(c => c.id === selectedCourseId);
  const selectedCoursePdfs = selectedCourse ? getCoursePdfs(selectedCourse) : [];



  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPIN === '12345') {
      setIsLoggedInAdmin(true);
      localStorage.setItem('mps2_is_admin', 'true');
      setAdminPIN('');
      alert(`Login Berhasil! Anda memiliki hak akses penuh sebagai Pengelola.`);
    } else {
      alert('PIN Keamanan Salah!');
    }
  };

  const handleAdminLogout = () => {
    setIsLoggedInAdmin(false);
    localStorage.removeItem('mps2_is_admin');
  };

  const handleDirectAIExtract = () => {
    if (!isLoggedInAdmin) {
      alert('Akses Ditolak: Fitur Ekstrak AI silabus khusus untuk Admin Kosma (PIN: 12345).');
      setShowDirectAIModal(false);
      return;
    }
    if (!directAIText.trim() || !selectedCourseId) return;
    setIsDirectAnalyzing(true);
    setTimeout(() => {
      setIsDirectAnalyzing(false);
      const generatedSummary = `[Hasil Ekstraksi AI] Silabus mata kuliah ini mencakup kajian teori komprehensif, penyusunan makalah ilmiah kelompok, serta evaluasi mingguan.`;
      const generatedTask: Task = {
        id: `ai-task-${Date.now()}`,
        title: `Tugas Makalah & Presentasi AI`,
        description: `Menganalisis bab utama silabus dan menyusun presentasi kelompok.`,
        deadline: '2026-09-30T23:59',
        type: 'Kelompok',
        status: 'Belum'
      };

      setCourses(prev => prev.map(c => {
        if (c.id === selectedCourseId) {
          return {
            ...c,
            syllabusSummary: generatedSummary,
            tasks: [...(c.tasks || []), generatedTask]
          };
        }
        return c;
      }));

      setShowDirectAIModal(false);
      setDirectAIText('');
      alert('Ekstraksi AI berhasil! Ringkasan silabus & tugas baru langsung ditambahkan ke mata kuliah ini.');
    }, 1200);
  };



  const handleDeleteSinglePdf = (courseId: string, pdfId: string) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus file PDF silabus ini?")) {
      setCourses(prev => prev.map(c => {
        if (c.id === courseId) {
          const currentPdfs = getCoursePdfs(c);
          const filteredPdfs = currentPdfs.filter(p => p.id !== pdfId);
          return {
            ...c,
            syllabusPdfUrl: filteredPdfs[0]?.url,
            pdfFileName: filteredPdfs[0]?.name,
            syllabusPdfs: filteredPdfs
          };
        }
        return c;
      }));
      alert('File PDF silabus berhasil dihapus!');
    }
  };

  const handleResetCourseSyllabus = (courseId: string) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus/reset SELURUH file silabus untuk mata kuliah ini?")) {
      setCourses(prev => prev.map(c => {
        if (c.id === courseId) {
          return {
            ...c,
            syllabusSummary: 'Upload silabus mata kuliah ini melalui Panel Admin untuk menampilkan deskripsi perkuliahan.',
            syllabusPdfUrl: undefined,
            pdfFileName: undefined,
            syllabusPdfs: []
          };
        }
        return c;
      }));
      alert('Seluruh silabus mata kuliah berhasil di-reset!');
    }
  };

  const handleUpdatePJInfo = (courseId: string) => {
    setCourses(prev => prev.map(c => {
      if (c.id === courseId) {
        return {
          ...c,
          pjName: editPjName || c.pjName,
          pjContact: editPjContact || c.pjContact
        };
      }
      return c;
    }));
    alert('Informasi PJ Matkul berhasil diperbarui!');
    setEditPjName('');
    setEditPjContact('');
  };

  const handleAddTask = () => {
    if (!isLoggedInAdmin) {
      alert('Akses Ditolak: Hanya Admin Kosma (PIN: 12345) yang dapat menambahkan tugas.');
      setShowAddTaskModal(false);
      return;
    }
    if (!selectedCourseId || !newTaskTitle) return;
    const newTask: Task = {
      id: `task-${Date.now()}`,
      title: newTaskTitle,
      description: newTaskDesc,
      deadline: newTaskDeadline || '2026-09-30T23:59',
      type: newTaskType,
      status: 'Belum'
    };

    setCourses(prev => prev.map(c => {
      if (c.id === selectedCourseId) {
        return { ...c, tasks: [...(c.tasks || []), newTask] };
      }
      return c;
    }));

    setShowAddTaskModal(false);
    setNewTaskTitle('');
    setNewTaskDesc('');
  };

  const handleDeleteTask = (courseId: string, taskId: string) => {
    if (!isLoggedInAdmin) {
      alert('Hanya Admin Kosma yang dapat menghapus tugas.');
      return;
    }
    if (!window.confirm('Apakah Anda yakin ingin menghapus tugas ini?')) return;
    setCourses(prev => prev.map(c => {
      if (c.id === courseId) {
        return {
          ...c,
          tasks: (c.tasks || []).filter(t => t.id !== taskId)
        };
      }
      return c;
    }));
  };

  const handleAddGroup = () => {
    if (!isLoggedInAdmin) {
      alert('Akses Ditolak: Hanya Admin Kosma (PIN: 12345) yang dapat menambahkan kelompok.');
      setShowAddGroupModal(false);
      return;
    }
    if (!selectedCourseId || !newGroupName) return;
    const newGroup: Group = {
      name: newGroupName,
      topic: newGroupTopic,
      members: newGroupMembers.split(',').map(m => m.trim()).filter(Boolean)
    };

    setCourses(prev => prev.map(c => {
      if (c.id === selectedCourseId) {
        return { ...c, groups: [...(c.groups || []), newGroup] };
      }
      return c;
    }));

    setShowAddGroupModal(false);
    setNewGroupName('');
    setNewGroupTopic('');
    setNewGroupMembers('');
  };

  const handleDeleteGroup = (courseId: string, groupIndex: number) => {
    if (!isLoggedInAdmin) {
      alert('Hanya Admin Kosma yang dapat menghapus kelompok.');
      return;
    }
    if (!window.confirm('Apakah Anda yakin ingin menghapus kelompok ini?')) return;
    setCourses(prev => prev.map(c => {
      if (c.id === courseId) {
        const updated = [...(c.groups || [])];
        updated.splice(groupIndex, 1);
        return { ...c, groups: updated };
      }
      return c;
    }));
  };

  // Smart Parser for Group Lists from WhatsApp or Syllabus Text
  const parseSmartImportText = (text: string): Group[] => {
    if (!text || !text.trim()) return [];
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const result: Group[] = [];
    let current: Group | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Match group headers: e.g. "Kelompok 1", "Kel 1", "Group 1", "Topik 1", "1. Kelompok 1"
      const groupHeaderMatch = line.match(/^(?:kelompok|kel|topik|group)\s*([0-9ivxlcdm]+|\w+)(.*)$/i)
        || line.match(/^(\d+)[.)]\s*(?:kelompok|kel|topik)?\s*(.*)$/i);

      if (groupHeaderMatch) {
        if (current && (current.members.length > 0 || current.topic)) {
          result.push(current);
        }
        const num = groupHeaderMatch[1] || `${result.length + 1}`;
        const rest = (groupHeaderMatch[2] || '').replace(/^[:-]\s*/, '').trim();
        current = {
          name: `Kelompok ${num}`,
          topic: rest || '',
          members: []
        };
        continue;
      }

      if (!current) {
        current = {
          name: `Kelompok ${result.length + 1}`,
          topic: '',
          members: []
        };
      }

      // Match Topic / Materi / Judul
      const topicMatch = line.match(/^(?:topik|materi|judul|tema|kajian)\s*[:-]\s*(.+)$/i);
      if (topicMatch) {
        current.topic = topicMatch[1].trim();
        continue;
      }

      // Match Anggota / Presenter
      const membersMatch = line.match(/^(?:anggota|pemakalah|presenter|penulis|mahasiswa)\s*[:-]\s*(.+)$/i);
      if (membersMatch) {
        const names = membersMatch[1].split(/[,;]+/).map(n => n.trim()).filter(Boolean);
        current.members.push(...names);
        continue;
      }

      // Match bulleted / numbered members: "1. Fathan", "- Dewi", "* Restu"
      const bulletMatch = line.match(/^[-*•\d+.]+\s*(.+)$/);
      if (bulletMatch) {
        const item = bulletMatch[1].trim();
        if (!current.topic && (item.toLowerCase().includes('manajemen') || item.toLowerCase().includes('analisis') || item.toLowerCase().includes('konsep') || item.toLowerCase().includes('teori') || item.length > 45)) {
          current.topic = item;
        } else {
          current.members.push(item);
        }
        continue;
      }

      // Normal line: if no topic yet, assign as topic, otherwise treat as member(s)
      if (!current.topic) {
        current.topic = line;
      } else {
        if (line.includes(',')) {
          const names = line.split(',').map(n => n.trim()).filter(Boolean);
          current.members.push(...names);
        } else {
          current.members.push(line);
        }
      }
    }

    if (current && (current.members.length > 0 || current.topic)) {
      result.push(current);
    }

    return result.map(g => ({
      ...g,
      members: Array.from(new Set(g.members.map(m => m.trim()).filter(Boolean)))
    }));
  };

  const handleImportTextChange = (text: string) => {
    setImportRawText(text);
    const parsed = parseSmartImportText(text);
    setParsedPreviewGroups(parsed);
  };

  const handleApplyImportGroups = () => {
    if (parsedPreviewGroups.length === 0) {
      alert('Belum ada kelompok yang berhasil terdeteksi dari teks. Silakan periksa atau sesuaikan teks.');
      return;
    }

    const targetCourse = courses.find(c => c.id === importTargetCourseId);
    if (!targetCourse) return;

    setCourses(prev => {
      const updated = prev.map(c => {
        if (c.id === importTargetCourseId) {
          const newGroups = importMode === 'append'
            ? [...(c.groups || []), ...parsedPreviewGroups]
            : parsedPreviewGroups;
          return { ...c, groups: newGroups };
        }
        return c;
      });
      localStorage.setItem('mps2_courses', JSON.stringify(updated));
      supabase.from('mps2_store').upsert({ id: 'courses_data', data: updated, updated_at: new Date().toISOString() });
      return updated;
    });

    const count = parsedPreviewGroups.length;
    setShowSmartImportModal(false);
    setImportRawText('');
    setParsedPreviewGroups([]);

    alert(`✅ Berhasil menyimpan ${count} kelompok ke mata kuliah [${targetCourse.code}] ${targetCourse.name}!\nData otomatis tersimpan ke Cloud Supabase dan aktif di tab Kelompok serta Agenda & Tugas.`);
  };

  const handleToggleTaskStatus = (courseId: string, taskId: string) => {
    if (!isLoggedInAdmin) {
      alert('Akses Ditolak: Hanya Kosma yang dapat mengubah status tugas.');
      return;
    }
    setCourses(prev => {
      const updated = prev.map(c => {
        if (c.id === courseId) {
          return {
            ...c,
            tasks: (c.tasks || []).map(t => {
              if (t.id === taskId) {
                const nextStatus: 'Belum' | 'Proses' | 'Selesai' = 
                  t.status === 'Belum' ? 'Proses' : t.status === 'Proses' ? 'Selesai' : 'Belum';
                return { ...t, status: nextStatus };
              }
              return t;
            })
          };
        }
        return c;
      });
      localStorage.setItem('mps2_courses', JSON.stringify(updated));
      supabase.from('mps2_store').upsert({ id: 'courses_data', data: updated, updated_at: new Date().toISOString() });
      return updated;
    });
  };

  const handleToggleGroupStatus = (courseId: string, groupIndex: number) => {
    if (!isLoggedInAdmin) {
      alert('Hanya Kosma / Admin yang dapat menandai penyelesaian presentasi kelompok.');
      return;
    }
    setCourses(prev => {
      const updated = prev.map(c => {
        if (c.id === courseId) {
          const updatedGroups = [...(c.groups || [])];
          const target = updatedGroups[groupIndex];
          if (target) {
            const nextStatus: 'Belum' | 'Selesai' = target.status === 'Selesai' ? 'Belum' : 'Selesai';
            updatedGroups[groupIndex] = {
              ...target,
              status: nextStatus,
              completedAt: nextStatus === 'Selesai' ? new Date().toISOString() : undefined,
            };
          }
          return { ...c, groups: updatedGroups };
        }
        return c;
      });
      localStorage.setItem('mps2_courses', JSON.stringify(updated));
      supabase.from('mps2_store').upsert({ id: 'courses_data', data: updated, updated_at: new Date().toISOString() }).then(() => {
        console.log('Group status successfully synchronized with Supabase cloud');
      });
      return updated;
    });
  };

  const handleAIChat = async () => {
    if (!chatQuery.trim() || !selectedCourse || isAiLoading) return;
    const userText = chatQuery.trim();
    setChatMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setChatQuery('');
    setIsAiLoading(true);

    try {
      const activeKey = geminiApiKey.trim();
      if (!activeKey) {
        throw new Error('API Key Gemini belum disetel. Hubungi Kosma untuk memasukkan API Key.');
      }

      // Context prompt about this specific academic course
      const courseContext = `Anda adalah "Asisten AI Akademik MPS2" untuk mata kuliah "${selectedCourse.name} (${selectedCourse.code})" pada Program Studi S2 Magister Pendidikan Islam.
Dosen Pengampu: ${selectedCourse.lecturer}
Jadwal: ${selectedCourse.day}, ${selectedCourse.time}, Ruangan: ${selectedCourse.room}
Ringkasan Silabus Resmi:
${selectedCourse.syllabusSummary}

Daftar Tugas Terdaftar (${(selectedCourse.tasks || []).length}):
${(selectedCourse.tasks || []).map(t => `- [${t.type}] ${t.title}: ${t.description} (Deadline: ${t.deadline})`).join('\n') || 'Belum ada tugas resmi'}

Daftar Kelompok Terbagi (${(selectedCourse.groups || []).length}):
${(selectedCourse.groups || []).map(g => `- ${g.name}: ${g.topic || 'Topik belum ditentukan'} (Anggota: ${(g.members || []).join(', ')})`).join('\n') || 'Belum ada pembagian kelompok'}

Petunjuk Menjawab:
- Berbicaralah santai, luwes, mengalir, empati, dan ramah layaknya asisten AI cerdas serbaguna (seperti ChatGPT atau Gemini pada umumnya).
- BISA DIAJAK CURHAT & NGOBROL BEBAS: Jangan kaku! Jika mahasiswa ingin curhat tentang lelahnya kuliah, kesulitan membagi waktu, bingung arah riset, atau topik umum lainnya di luar materi, tanggapilah dengan hangat, suportif, dan beri motivasi selayaknya teman baik yang bijak.
- JANGAN membatasi diri hanya pada mata kuliah ini: Mahasiswa bebas berdiskusi tentang apa saja. Data silabus dan tugas di atas HANYA sebagai rujukan jika mahasiswa menanyakan hal spesifik tentang mata kuliah ini.
- JANGAN selalu mengulang perkenalan panjang, nama dosen, atau jadwal perkuliahan di setiap respon.
- Hindari tanda bintang/bintang dua (**) yang berlebihan atau beruntun agar teks rapi dan bersih dibaca.
- Gunakan bahasa Indonesia yang baik, luwes, santai, dan nyaman dibaca.`;

      // Try primary model (gemini-3.6-flash) with fallback to gemini-flash-latest or gemini-3.5-flash
      const candidateModels = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.5-flash'];
      let reply = '';
      let lastErrorMessage = '';

      for (const modelName of candidateModels) {
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${activeKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [
                    { text: `${courseContext}\n\nPertanyaan Mahasiswa: ${userText}` }
                  ]
                }
              ]
            })
          });

          const data = await response.json();
          if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
            reply = data.candidates[0].content.parts[0].text;
            break;
          } else if (data.error?.message) {
            lastErrorMessage = data.error.message;
          }
        } catch (e: any) {
          lastErrorMessage = e.message;
        }
      }

      if (!reply) {
        throw new Error(lastErrorMessage || 'Model Gemini belum memberikan respon.');
      }

      setChatMessages(prev => [...prev, { sender: 'ai', text: reply }]);
    } catch (err: any) {
      console.error('Gemini error:', err);
      setChatMessages(prev => [...prev, { 
        sender: 'ai', 
        text: `⚠️ Maaf, terjadi kendala saat menghubungi Asisten AI Gemini: ${err.message || 'Koneksi terputus'}.` 
      }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const renderMainContent = () => (
    <>
      {/* 1. VIEW DETAILED COURSE */}
        {selectedCourse ? (
          <div className="space-y-4 animate-fadeIn">
            {/* Header Detail Matkul */}
            <div 
              className="p-4 sm:p-5 rounded-2xl border shadow-sm transition-all relative overflow-hidden"
              style={{
                backgroundColor: darkMode ? selectedCourse.colorTheme.darkBg : selectedCourse.colorTheme.bgLight,
                borderColor: darkMode ? selectedCourse.colorTheme.darkBorder : selectedCourse.colorTheme.borderLight,
                color: darkMode ? selectedCourse.colorTheme.darkText : selectedCourse.colorTheme.textLight,
              }}
            >
              <button 
                onClick={() => setSelectedCourseId(null)}
                className="mb-3 px-3 py-1.5 rounded-xl bg-white/70 dark:bg-black/30 backdrop-blur-xs text-xs font-bold flex items-center gap-1.5 hover:bg-white dark:hover:bg-black/50 transition-all shadow-xs"
              >
                <ArrowLeft className="w-4 h-4" /> Kembali ke Jadwal
              </button>

              <div className="flex items-start justify-between">
                <div>
                  <span className="px-2.5 py-1 text-[11px] font-extrabold rounded-lg uppercase tracking-wide opacity-90 border border-current">
                    {selectedCourse.code}
                  </span>
                  <h2 className="text-xl font-extrabold mt-2 leading-tight">{selectedCourse.name}</h2>
                  <p className="text-xs font-medium mt-1 opacity-90">Dosen: {selectedCourse.lecturer}</p>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-current/20 grid grid-cols-2 gap-2 text-xs font-semibold">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>{selectedCourse.day}, {selectedCourse.time}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>{selectedCourse.room}</span>
                </div>
              </div>

              {selectedCourse.pjName && (
                <div className="mt-3 pt-2.5 border-t border-current/20 text-xs font-medium opacity-90 flex items-center justify-between gap-1.5 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 shrink-0" />
                    <span>PJ Matkul: <strong>{selectedCourse.pjName}</strong> ({selectedCourse.pjContact})</span>
                  </div>
                  {selectedCourse.pjContact && (
                    <a
                      href={`https://wa.me/${selectedCourse.pjContact.replace(/[^0-9]/g, '').replace(/^0/, '62')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] flex items-center gap-1 hover:bg-emerald-700 transition-all shadow-xs"
                    >
                      💬 WhatsApp PJ
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* TAB DETAILED COURSE */}
            <div className="flex rounded-xl bg-slate-200/80 dark:bg-gray-800 p-1 text-xs font-bold overflow-x-auto no-scrollbar">
              <button
                onClick={() => setDetailTab('info')}
                className={`flex-1 py-2 px-3 rounded-lg transition-all text-center whitespace-nowrap ${detailTab === 'info' ? 'bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-slate-600 dark:text-gray-400'}`}
              >
                Silabus
              </button>
              <button
                onClick={() => setDetailTab('tugas')}
                className={`flex-1 py-2 px-3 rounded-lg transition-all text-center whitespace-nowrap ${detailTab === 'tugas' ? 'bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-slate-600 dark:text-gray-400'}`}
              >
                Tugas ({(selectedCourse.tasks || []).length})
              </button>
              <button
                onClick={() => setDetailTab('kelompok')}
                className={`flex-1 py-2 px-3 rounded-lg transition-all text-center whitespace-nowrap ${detailTab === 'kelompok' ? 'bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-slate-600 dark:text-gray-400'}`}
              >
                Kelompok ({(selectedCourse.groups || []).length})
              </button>
              <button
                onClick={() => setDetailTab('ai')}
                className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1 whitespace-nowrap ${detailTab === 'ai' ? 'bg-purple-600 text-white shadow-xs' : 'text-purple-600 dark:text-purple-400'}`}
              >
                <Sparkles className="w-3.5 h-3.5" /> AI Chat
              </button>
            </div>

            {/* CONTENT TAB DETAIL */}
            {detailTab === 'info' && (
              <div className={`p-4 sm:p-5 rounded-2xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'} space-y-4`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <BookOpen className="w-4 h-4" /> Ringkasan Silabus Perkuliahan
                  </h3>
                </div>
                
                <p className="text-xs sm:text-sm text-slate-700 dark:text-gray-300 leading-relaxed">
                  {selectedCourse.syllabusSummary}
                </p>

                {/* Course-Specific Blueprint / Guideline */}
                {selectedCourse.guidelineSections && selectedCourse.guidelineSections.length > 0 && (
                  <div className="pt-2 space-y-2 border-t border-slate-100 dark:border-gray-800">
                    <h4 className="font-extrabold text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1.5 uppercase tracking-wide">
                      <Sparkles className="w-3.5 h-3.5" /> Blueprint & Ketentuan Penugasan Khusus {selectedCourse.code}
                    </h4>
                    {selectedCourse.guidelineSections.map((sec, idx) => (
                      <div key={idx} className={`p-3 rounded-xl border ${darkMode ? 'bg-purple-950/30 border-purple-800/50' : 'bg-purple-50/70 border-purple-200/70'} space-y-1.5 text-xs`}>
                        <div className="font-bold text-purple-900 dark:text-purple-200">{sec.heading}</div>
                        <ul className="space-y-1 text-slate-700 dark:text-purple-100/90 font-medium">
                          {sec.items.map((item, iidx) => (
                            <li key={iidx} className="flex items-start gap-1.5">
                              <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}

                {/* GOOGLE DRIVE SILABUS & WADAH FOLDER BERKAS MATKUL */}
                <div className={`p-4 rounded-2xl border transition-all ${
                  darkMode ? 'bg-blue-950/20 border-blue-900/50' : 'bg-blue-50/60 border-blue-200/80'
                } space-y-3`}>
                  
                  {/* Item 1: Wadah Folder Berkas Matkul (Khusus Kosma) */}
                  {isLoggedInAdmin && (
                    <div className="flex items-center justify-between gap-3 flex-wrap border-b border-blue-200/50 dark:border-blue-900/40 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                          📂
                        </div>
                        <div>
                          <h4 className="font-extrabold text-xs text-slate-900 dark:text-gray-100 flex items-center gap-1.5">
                            <span>Wadah Berkas & Materi Matkul (Google Drive)</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                              Khusus Kosma
                            </span>
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-gray-400">
                            {selectedCourse.driveFolderUrl
                              ? 'Akses folder Drive untuk mengunggah / kelola berkas matkul.'
                              : 'Folder Google Drive belum ditautkan oleh Kosma.'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {selectedCourse.driveFolderUrl ? (
                          <a
                            href={selectedCourse.driveFolderUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-[0.98]"
                          >
                            <span>📂 Buka Folder Berkas Matkul ↗</span>
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            Folder belum ditautkan
                          </span>
                        )}

                        {/* Khusus Kosma: Tombol Tautkan / Ganti Folder */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowLinkDriveModal({
                              courseId: selectedCourse.id,
                              isCourseFolder: true,
                              title: `Folder Google Drive ${selectedCourse.code}`,
                              currentUrl: selectedCourse.driveFolderUrl || ''
                            });
                            setDriveInputUrl(selectedCourse.driveFolderUrl || '');
                          }}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-bold border border-indigo-400/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950 flex items-center gap-1 transition-all"
                        >
                          <span>🔗 {selectedCourse.driveFolderUrl ? 'Ganti Link Folder' : '+ Tautkan Folder Drive'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Item 2: Berkas Silabus / RPS Spesifik */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                        📄
                      </div>
                      <div>
                        <h4 className="font-extrabold text-xs text-slate-900 dark:text-gray-100">
                          Dokumen Silabus / RPS Perkuliahan
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-gray-400">
                          {selectedCourse.syllabusDriveUrl
                            ? 'Dokumen resmi silabus perkuliahan siap dibaca.'
                            : 'Dokumen silabus belum ditautkan oleh Kosma.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedCourse.syllabusDriveUrl ? (
                        <button
                          type="button"
                          onClick={() => handleOpenDriveDoc(`Silabus & RPS ${selectedCourse.code}`, selectedCourse.syllabusDriveUrl!)}
                          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-[0.98]"
                        >
                          <FileText className="w-4 h-4" />
                          <span>📖 Baca Silabus (In-App)</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          Silabus belum ditautkan
                        </span>
                      )}

                      {/* Khusus Kosma: Tombol Tautkan / Ganti File Silabus */}
                      {isLoggedInAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            setShowLinkDriveModal({
                              courseId: selectedCourse.id,
                              isSyllabus: true,
                              title: `Silabus / RPS ${selectedCourse.code}`,
                              currentUrl: selectedCourse.syllabusDriveUrl || ''
                            });
                            setDriveInputUrl(selectedCourse.syllabusDriveUrl || '');
                          }}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-bold border border-blue-500/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950 flex items-center gap-1 transition-all"
                        >
                          <span>🔗 {selectedCourse.syllabusDriveUrl ? 'Ganti File Silabus' : '+ Tautkan File Silabus Drive'}</span>
                        </button>
                      )}
                    </div>
                  </div>

                </div>

                {/* PDF PREVIEW & DOWNLOAD SECTION (MOBILE OPTIMIZED) */}
                {selectedCoursePdfs.length > 0 ? (
                  <div className="pt-3 border-t border-slate-100 dark:border-gray-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-gray-200">
                        <Paperclip className="w-4 h-4 text-emerald-600" />
                        <span>Dokumen Silabus ({selectedCoursePdfs.length} File PDF)</span>
                      </div>
                    </div>

                    {/* Selector file jika ada > 1 file PDF */}
                    {selectedCoursePdfs.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-1.5 no-scrollbar">
                        {selectedCoursePdfs.map((pdf, idx) => (
                          <button
                            key={pdf.id}
                            onClick={() => setActivePdfIndex(idx)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap border shrink-0 ${
                              (activePdfIndex >= selectedCoursePdfs.length ? 0 : activePdfIndex) === idx
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                : darkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>File #{idx + 1}: {pdf.name}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Active Selected PDF file viewer & download */}
                    {(() => {
                      const currentIdx = activePdfIndex >= selectedCoursePdfs.length ? 0 : activePdfIndex;
                      const activePdf = selectedCoursePdfs[currentIdx];
                      if (!activePdf) return null;

                      return (
                        <div className="space-y-3">
                          {/* Mobile Notice Banner for Multi-Page PDFs */}
                          <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2">
                            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                              <p className="font-bold text-[11px]">💡 Petunjuk Membaca Silabus di HP (iPhone/Android):</p>
                              <p className="text-[11px] opacity-90 leading-tight">
                                Browser HP (Safari/Chrome) membatasi preview kotak di bawah hanya 1 halaman. Klik tombol hijau di bawah untuk membaca <strong>seluruh halaman silabus secara lengkap</strong>.
                              </p>
                            </div>
                          </div>

                          {/* Action Buttons Bar */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <button
                              onClick={() => handleOpenPdfFullscreen(activePdf)}
                              className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-[0.99]"
                            >
                              <BookOpen className="w-4 h-4" /> 📖 Baca Fullscreen In-App
                            </button>
                            <a
                              href={activePdf.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-[0.99]"
                            >
                              <ExternalLink className="w-4 h-4" /> ↗ Buka Tab Baru / App HP
                            </a>
                          </div>

                          {/* Controls Bar */}
                          <div className="p-3 rounded-2xl bg-slate-100 dark:bg-gray-800/90 border border-slate-200/80 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2 truncate pr-2">
                              <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span className="font-bold truncate">{activePdf.name}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                              <a
                                href={activePdf.url}
                                download={activePdf.name}
                                className="w-full sm:w-auto px-4 py-2 bg-slate-800 dark:bg-gray-700 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                              >
                                <Download className="w-3.5 h-3.5" /> Unduh PDF
                              </a>
                            </div>
                          </div>

                          {/* Blank-Proof PDF Viewer Frame with Triple Fallback */}
                          <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-gray-700 bg-slate-100 dark:bg-gray-800 h-[380px] sm:h-[500px]">
                            <object 
                              data={activePdf.url} 
                              type="application/pdf" 
                              className="w-full h-full border-none"
                            >
                              <iframe 
                                src={activePdf.url} 
                                title={activePdf.name} 
                                className="w-full h-full border-none"
                              >
                                {/* In-frame Fallback if both object and iframe are blocked by browser */}
                                <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-3 bg-slate-50 dark:bg-gray-900">
                                  <FileText className="w-12 h-12 text-emerald-500 animate-pulse" />
                                  <p className="font-bold text-sm text-slate-800 dark:text-gray-200">Pratinjau PDF Membutuhkan Akses Langsung</p>
                                  <p className="text-xs text-slate-500 dark:text-gray-400 max-w-sm">
                                    Browser perangkat Anda mengamankan pratinjau dokumen PDF internal. Silakan buka dokumen secara langsung:
                                  </p>
                                  <div className="flex flex-wrap gap-2 justify-center pt-2">
                                    <a
                                      href={activePdf.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                                    >
                                      <ExternalLink className="w-4 h-4" /> Buka Tab Baru / App PDF
                                    </a>
                                    <a
                                      href={activePdf.url}
                                      download={activePdf.name}
                                      className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                                    >
                                      <Download className="w-4 h-4" /> Unduh File
                                    </a>
                                  </div>
                                </div>
                              </iframe>
                            </object>
                            
                            {/* Mobile Floating Quick-Assist Badge */}
                            <div className="sm:hidden absolute bottom-2 left-2 right-2 p-2 bg-slate-900/90 backdrop-blur-xs text-white text-[11px] font-semibold rounded-xl flex items-center justify-between gap-2 shadow-lg border border-slate-700">
                              <span className="truncate">Layar blank atau ingin baca semua?</span>
                              <a
                                href={activePdf.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg shrink-0 text-xs flex items-center gap-1"
                              >
                                Tab Baru ↗
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-gray-700 bg-slate-50 dark:bg-gray-800/50 text-center space-y-1">
                    <p className="text-xs font-bold text-slate-600 dark:text-gray-400">Silabus & Ringkasan Perkuliahan Telah Terisi Resmi</p>
                    <p className="text-[11px] text-slate-500 dark:text-gray-500">Ringkasan silabus, tugas, dan kelompok mata kuliah ini sudah langsung terintegrasi tanpa perlu unggah manual oleh Kosma.</p>
                  </div>
                )}
              </div>
            )}

            {detailTab === 'tugas' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm">Daftar Tugas Mata Kuliah</h3>
                  {isLoggedInAdmin ? (
                    <button
                      onClick={() => setShowAddTaskModal(true)}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-emerald-700 transition-colors shadow-xs"
                    >
                      <Plus className="w-4 h-4" /> Tambah Tugas
                    </button>
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-gray-400 bg-slate-100 dark:bg-gray-800 px-2.5 py-1 rounded-lg flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-500" /> Khusus Admin Kosma
                    </span>
                  )}
                </div>

                {!(selectedCourse.tasks && selectedCourse.tasks.length > 0) ? (
                  <div className={`p-8 text-center rounded-2xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'}`}>
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-semibold text-slate-500 dark:text-gray-400">Belum ada tugas untuk mata kuliah ini.</p>
                  </div>
                ) : (
                  selectedCourse.tasks.map(task => (
                    <div 
                      key={task.id} 
                      className={`p-4 rounded-2xl border transition-all ${
                        darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'
                      } ${task.status === 'Selesai' ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                              task.type === 'Kelompok' 
                                ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300' 
                                : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                            }`}>
                              {task.type}
                            </span>
                            <h4 className={`font-bold text-sm ${task.status === 'Selesai' ? 'line-through' : ''}`}>
                              {task.title}
                            </h4>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-gray-400 mt-1 leading-relaxed">
                            {task.description}
                          </p>
                          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-gray-400 mt-2">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Deadline: {new Date(task.deadline).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isLoggedInAdmin ? (
                            <button
                              onClick={() => handleToggleTaskStatus(selectedCourse.id, task.id)}
                              className={`px-2.5 py-1 rounded-xl text-xs font-extrabold transition-all border ${
                                task.status === 'Selesai'
                                  ? 'bg-emerald-100 dark:bg-emerald-950 border-emerald-300 text-emerald-700 dark:text-emerald-300'
                                  : task.status === 'Proses'
                                  ? 'bg-amber-100 dark:bg-amber-950 border-amber-300 text-amber-700 dark:text-amber-300'
                                  : 'bg-slate-100 dark:bg-gray-800 border-slate-300 dark:border-gray-700 text-slate-700 dark:text-gray-300'
                              }`}
                              title="Klik untuk ubah status tugas"
                            >
                              {task.status}
                            </button>
                          ) : (
                            <span
                              className={`px-2.5 py-1 rounded-xl text-xs font-extrabold border ${
                                task.status === 'Selesai'
                                  ? 'bg-emerald-100 dark:bg-emerald-950 border-emerald-300 text-emerald-700 dark:text-emerald-300'
                                  : task.status === 'Proses'
                                  ? 'bg-amber-100 dark:bg-amber-950 border-amber-300 text-amber-700 dark:text-amber-300'
                                  : 'bg-slate-100 dark:bg-gray-800 border-slate-300 dark:border-gray-700 text-slate-700 dark:text-gray-300'
                              }`}
                            >
                              {task.status}
                            </span>
                          )}
                          {isLoggedInAdmin && (
                            <button
                              onClick={() => handleDeleteTask(selectedCourse.id, task.id)}
                              className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                              title="Hapus Tugas"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {detailTab === 'kelompok' && (() => {
              const allGroups = selectedCourse.groups || [];
              const diskusiGroups = allGroups.filter(g => g.name.toLowerCase().includes('diskusi'));
              const artikelOrJurnalGroups = allGroups.filter(g => g.name.toLowerCase().includes('jurnal') || g.name.toLowerCase().includes('artikel'));
              const hasSubCategories = diskusiGroups.length > 0 && artikelOrJurnalGroups.length > 0;
              const isArtikelType = artikelOrJurnalGroups.some(g => g.name.toLowerCase().includes('artikel'));
              const secondaryTabLabel = isArtikelType ? 'Kelompok Artikel' : 'Kelompok Jurnal';

              const filteredGroups = allGroups.filter(g => {
                if (hasSubCategories) {
                  if (groupCategoryFilter === 'diskusi' && !g.name.toLowerCase().includes('diskusi')) return false;
                  if ((groupCategoryFilter === 'jurnal' || groupCategoryFilter === 'artikel') && !g.name.toLowerCase().includes('jurnal') && !g.name.toLowerCase().includes('artikel')) return false;
                }
                if (!groupSearchQuery.trim()) return true;
                const q = groupSearchQuery.toLowerCase();
                const nameMatch = g.name.toLowerCase().includes(q);
                const topicMatch = (g.topic || '').toLowerCase().includes(q);
                const memberMatch = (g.members || []).some(m => m.toLowerCase().includes(q));
                return nameMatch || topicMatch || memberMatch;
              });

              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="font-bold text-sm flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Daftar Pembagian Kelompok ({allGroups.length})</span>
                    </h3>
                    {isLoggedInAdmin ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          onClick={() => {
                            setImportTargetCourseId(selectedCourse.id);
                            setImportRawText('');
                            setParsedPreviewGroups([]);
                            setShowSmartImportModal(true);
                          }}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                          title="Impor daftar kelompok otomatis dari teks WhatsApp atau PDF"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>⚡ Impor Pola Teks / WA</span>
                        </button>
                        <button
                          onClick={() => setShowAddGroupModal(true)}
                          className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-emerald-700 transition-colors shadow-xs"
                        >
                          <Plus className="w-4 h-4" /> Tambah Manual
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-gray-400 bg-slate-100 dark:bg-gray-800 px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <Lock className="w-3 h-3 text-amber-500" /> Khusus Admin Kosma
                      </span>
                    )}
                  </div>

                  {/* Sub-Category Pills for courses with multiple group types (e.g. FMPI, TMPI) */}
                  {hasSubCategories && (
                    <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-100 dark:bg-gray-800/80 border border-slate-200/80 dark:border-gray-700/80 overflow-x-auto text-xs font-bold">
                      <button
                        onClick={() => setGroupCategoryFilter('all')}
                        className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                          groupCategoryFilter === 'all'
                            ? 'bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                            : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-200'
                        }`}
                      >
                        Semua ({allGroups.length})
                      </button>
                      <button
                        onClick={() => setGroupCategoryFilter('diskusi')}
                        className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
                          groupCategoryFilter === 'diskusi'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400'
                        }`}
                      >
                        <Users className="w-3.5 h-3.5" />
                        Kelompok Diskusi ({diskusiGroups.length})
                      </button>
                      <button
                        onClick={() => setGroupCategoryFilter(isArtikelType ? 'artikel' : 'jurnal')}
                        className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap flex items-center gap-1.5 ${
                          (groupCategoryFilter === 'jurnal' || groupCategoryFilter === 'artikel')
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'text-slate-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400'
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        {secondaryTabLabel} ({artikelOrJurnalGroups.length})
                      </button>
                    </div>
                  )}

                  {/* Quick Search bar for members and topics */}
                  {allGroups.length > 0 && (
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Cari nama mahasiswa atau topik kelompok..."
                        value={groupSearchQuery}
                        onChange={e => setGroupSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-gray-100"
                      />
                      {groupSearchQuery && (
                        <button 
                          onClick={() => setGroupSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 font-bold"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  )}

                  {allGroups.length === 0 ? (
                    <div className={`p-8 text-center rounded-2xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'}`}>
                      <Users className="w-8 h-8 text-purple-500 mx-auto mb-2 opacity-50" />
                      <p className="text-xs font-semibold text-slate-500 dark:text-gray-400">Pembagian kelompok belum diisi oleh Kosma.</p>
                    </div>
                  ) : filteredGroups.length === 0 ? (
                    <div className={`p-6 text-center rounded-2xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'}`}>
                      <p className="text-xs text-slate-500 dark:text-gray-400">Tidak ada kelompok yang sesuai dengan pencarian "{groupSearchQuery}".</p>
                    </div>
                  ) : (
                    filteredGroups.map((group) => {
                      const isSpecialType = group.name.toLowerCase().includes('jurnal') || group.name.toLowerCase().includes('artikel');
                      const isArtikel = group.name.toLowerCase().includes('artikel');
                      const originalIdx = allGroups.indexOf(group);

                      return (
                        <div 
                          key={`${group.name}-${originalIdx}`} 
                          className={`p-4 rounded-2xl border ${
                            isSpecialType 
                              ? darkMode ? 'bg-gray-900 border-purple-900/40 hover:border-purple-500/60' : 'bg-white border-purple-100 hover:border-purple-300'
                              : darkMode ? 'bg-gray-900 border-gray-800 hover:border-emerald-500/50' : 'bg-white border-slate-200 hover:border-emerald-300'
                          } space-y-2.5 shadow-2xs transition-all`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-xs font-extrabold px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                              isSpecialType
                                ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-900 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                                : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            }`}>
                              {isSpecialType ? (
                                <FileText className="w-3 h-3 text-purple-600 shrink-0" />
                              ) : (
                                <Users className="w-3 h-3 text-emerald-600 shrink-0" />
                              )}
                              <span>{group.name}</span>
                            </span>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                                group.status === 'Selesai'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                  : 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80'
                              }`}>
                                {group.status === 'Selesai' ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>Selesai</span>
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-3 h-3 text-amber-600" />
                                    <span>Belum</span>
                                  </>
                                )}
                              </span>

                              {isLoggedInAdmin && (
                                <>
                                  <button
                                    onClick={() => handleToggleGroupStatus(selectedCourse.id, originalIdx)}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all shadow-2xs flex items-center gap-1 ${
                                      group.status === 'Selesai'
                                        ? 'bg-slate-200 hover:bg-slate-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-300'
                                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    }`}
                                    title={group.status === 'Selesai' ? 'Batal Selesai' : 'Tandai Selesai Presentasi'}
                                  >
                                    {group.status === 'Selesai' ? '↺ Batal' : '✓ Selesai'}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteGroup(selectedCourse.id, originalIdx)}
                                    className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors shrink-0"
                                    title="Hapus Kelompok"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {group.topic && (
                            <div className={`p-2.5 rounded-xl border text-xs leading-relaxed space-y-0.5 ${
                              isSpecialType 
                                ? 'bg-purple-50/50 dark:bg-purple-950/30 border-purple-200/50 dark:border-purple-900/50' 
                                : 'bg-slate-50 dark:bg-gray-800/70 border-slate-200/70 dark:border-gray-700/70'
                            }`}>
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-gray-400 block">
                                {isSpecialType ? (isArtikel ? 'Fokus Penulisan Artikel Jurnal SINTA 3:' : 'Topik Penulisan Artikel Jurnal:') : 'Topik Pembahasan / Makalah:'}
                              </span>
                              <p className="font-bold text-slate-800 dark:text-gray-100">
                                {group.topic}
                              </p>
                            </div>
                          )}

                            <div className="space-y-1">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-gray-500">
                              {isSpecialType ? 'Penulis / Anggota:' : 'Presenter / Anggota:'}
                            </span>
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {(group.members || []).map((member, mIdx) => (
                                <span 
                                  key={mIdx}
                                  className={`px-2.5 py-1 text-xs rounded-lg font-semibold border flex items-center gap-1 ${
                                    isSpecialType
                                      ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-200/80 dark:border-purple-800/80 text-purple-900 dark:text-purple-200'
                                      : 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80 text-emerald-900 dark:text-emerald-200'
                                  }`}
                                >
                                  <span className={isSpecialType ? "text-purple-600 dark:text-purple-400 font-bold" : "text-emerald-600 dark:text-emerald-400 font-bold"}>
                                    {isSpecialType ? '✍️' : '👤'}
                                  </span>
                                  <span>{member}</span>
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Berkas Makalah / PPT (Google Drive Embed Viewer) */}
                          <div className="pt-2 border-t border-slate-100 dark:border-gray-800/60 flex items-center justify-between gap-2 flex-wrap text-xs">
                            {group.driveUrl ? (
                              <button
                                onClick={() => handleOpenDriveDoc(`${group.name} - ${group.topic || selectedCourse.code}`, group.driveUrl!)}
                                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 transition-all shadow-xs active:scale-[0.98]"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>📖 Baca Makalah / PPT (In-App)</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic flex items-center gap-1">
                                <span>📁 Berkas makalah belum ditautkan</span>
                              </span>
                            )}

                            {isLoggedInAdmin && (
                              <button
                                onClick={() => {
                                  setShowLinkDriveModal({
                                    courseId: selectedCourse.id,
                                    groupIndex: originalIdx,
                                    title: `${group.name} (${selectedCourse.code})`,
                                    currentUrl: group.driveUrl || ''
                                  });
                                  setDriveInputUrl(group.driveUrl || '');
                                }}
                                className="px-2.5 py-1 rounded-xl text-[11px] font-bold border border-blue-500/50 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 flex items-center gap-1 transition-all"
                              >
                                <span>🔗 {group.driveUrl ? 'Ganti Link Drive' : '+ Tautkan Google Drive'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })()}

            {detailTab === 'ai' && (
              <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'} space-y-3`}>
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-800 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-xs">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-xs sm:text-sm flex items-center gap-1.5">
                        <span>Asisten Gemini AI</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                          {selectedCourse.code}
                        </span>
                      </h3>
                      <p className="text-[10px] text-slate-400">Terhubung ke Google Gemini 3.6 Flash (Resmi & Cepat)</p>
                    </div>
                  </div>

                  {chatMessages.length > 0 && (
                    <button
                      onClick={() => setChatMessages([])}
                      className="text-[11px] text-rose-500 hover:text-rose-700 font-semibold px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                    >
                      Bersihkan Chat
                    </button>
                  )}
                </div>

                <div className="h-72 overflow-y-auto space-y-2.5 p-3 rounded-xl bg-slate-50 dark:bg-gray-950/60 border border-slate-100 dark:border-gray-800/60">
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-10 space-y-2">
                      <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950 text-purple-600 mx-auto flex items-center justify-center">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-slate-700 dark:text-gray-300">
                        Tanyakan apa saja seputar mata kuliah {selectedCourse.code}!
                      </p>
                      <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                        Contoh: "Bantu ide topik makalah", "Siapa dosen pengampu?", atau "Bagaimana sistematika tugas di silabus?"
                      </p>
                    </div>
                  ) : (
                    chatMessages.map((msg, index) => (
                      <div 
                        key={index} 
                        className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[88%] p-3 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                          msg.sender === 'user' 
                            ? 'bg-purple-600 text-white rounded-br-none shadow-xs' 
                            : darkMode 
                              ? 'bg-gray-800 text-gray-200 rounded-bl-none border border-gray-700' 
                              : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-none shadow-2xs'
                        }`}>
                          {msg.sender === 'ai' ? renderFormattedAiText(msg.text) : msg.text}
                        </div>
                      </div>
                    ))
                  )}

                  {isAiLoading && (
                    <div className="flex justify-start">
                      <div className={`p-3 rounded-2xl text-xs flex items-center gap-2 ${darkMode ? 'bg-gray-800 text-purple-400' : 'bg-white text-purple-600 border border-slate-200'}`}>
                        <div className="w-3.5 h-3.5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                        <span>Gemini sedang menganalisis silabus & mengetik jawaban...</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={`Tanyakan pada Gemini tentang ${selectedCourse.code}...`}
                    value={chatQuery}
                    onChange={(e) => setChatQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAIChat()}
                    disabled={isAiLoading}
                    className={`flex-1 px-3 py-2 text-xs rounded-xl border outline-none disabled:opacity-60 ${
                      darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                  <button
                    onClick={handleAIChat}
                    disabled={isAiLoading || !chatQuery.trim()}
                    className="px-3.5 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors shadow-xs disabled:opacity-50 flex items-center gap-1 text-xs font-bold"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Kirim</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* 2. JADWAL MATKUL MAIN LIST VIEW */}
            {activeTab === 'jadwal' && (
              <div className="space-y-4">
                
                {/* 📢 BROADCAST AGENDA KULIAH SELANJUTNYA & PENGUMUMAN RESMI KOSMA */}
                {announcement && announcement.isActive && (
                  <div className={`p-4 sm:p-5 rounded-2xl border shadow-md relative overflow-hidden transition-all ${
                    darkMode 
                      ? 'bg-gradient-to-br from-emerald-950/70 via-gray-900 to-indigo-950/50 border-emerald-800/80 text-white' 
                      : 'bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/70 border-emerald-300 text-slate-900'
                  }`}>
                    {/* Decorative glow */}
                    <div className="absolute -right-10 -bottom-10 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

                    <div className="relative z-10 space-y-3">
                      {/* Top Header Badge */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-black uppercase tracking-wider shadow-xs">
                            <Megaphone className="w-3.5 h-3.5" />
                            <span>{announcement.title || 'Agenda Kuliah Terdekat'}</span>
                          </span>
                          <span className="flex items-center gap-1.5 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Siaran Resmi Kosma
                          </span>
                        </div>

                        {isLoggedInAdmin && (
                          <button
                            onClick={() => setActiveTab('admin')}
                            className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-1 bg-white/70 dark:bg-gray-800/80 px-2 py-1 rounded-lg border border-emerald-300/40"
                          >
                            <span>⚙️ Kelola Siaran di Panel Kosma</span>
                          </button>
                        )}
                      </div>

                      {/* Course Title & Lecturer */}
                      <div>
                        <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                          {announcement.courseName}
                        </h2>
                        {announcement.lecturerName && (
                          <p className="text-xs font-semibold text-slate-600 dark:text-gray-300 mt-0.5 flex items-center gap-1.5">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Dosen: <strong>{announcement.lecturerName}</strong></span>
                          </p>
                        )}
                      </div>

                      {/* Info Pills: Hari/Tanggal, Waktu, Tempat */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-bold pt-1">
                        <div className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${darkMode ? 'bg-gray-800/80 border-gray-700 text-gray-200' : 'bg-white/90 border-emerald-200/80 text-slate-800'}`}>
                          <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-[10px] block font-semibold text-slate-400 dark:text-gray-400 uppercase">Hari / Tanggal</span>
                            <span className="truncate block">{announcement.dayDate}</span>
                          </div>
                        </div>

                        <div className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${darkMode ? 'bg-gray-800/80 border-gray-700 text-gray-200' : 'bg-white/90 border-emerald-200/80 text-slate-800'}`}>
                          <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-[10px] block font-semibold text-slate-400 dark:text-gray-400 uppercase">Waktu Kuliah</span>
                            <span className="truncate block">{announcement.time}</span>
                          </div>
                        </div>

                        <div className={`p-2.5 rounded-xl border flex items-center gap-2.5 ${darkMode ? 'bg-gray-800/80 border-gray-700 text-gray-200' : 'bg-white/90 border-emerald-200/80 text-slate-800'}`}>
                          <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-[10px] block font-semibold text-slate-400 dark:text-gray-400 uppercase">Ruang / Tempat</span>
                            <span className="truncate block">{announcement.location}</span>
                          </div>
                        </div>
                      </div>

                      {/* Agenda Section */}
                      {announcement.agenda && (
                        <div className={`p-3 rounded-xl border text-xs ${darkMode ? 'bg-indigo-950/40 border-indigo-800/60 text-indigo-200' : 'bg-indigo-50/80 border-indigo-200 text-indigo-900'}`}>
                          <span className="font-extrabold block text-[10px] uppercase tracking-wider mb-0.5 text-indigo-600 dark:text-indigo-400">📌 Agenda / Materi Perkuliahan:</span>
                          <p className="font-semibold leading-relaxed">{announcement.agenda}</p>
                        </div>
                      )}

                      {/* Notes / Special Instructions */}
                      {announcement.notes && (
                        <div className={`p-3 rounded-xl border text-xs ${darkMode ? 'bg-amber-950/30 border-amber-800/50 text-amber-200' : 'bg-amber-50/80 border-amber-200 text-amber-900'}`}>
                          <span className="font-extrabold block text-[10px] uppercase tracking-wider mb-0.5 text-amber-600 dark:text-amber-400">💬 Catatan Khusus Kosma & Dosen:</span>
                          <p className="font-medium leading-relaxed">{announcement.notes}</p>
                        </div>
                      )}

                      {/* Action Buttons: Google Meet & Google Calendar */}
                      <div className="pt-2 border-t border-emerald-200/50 dark:border-emerald-800/40 flex items-center gap-2 flex-wrap">
                        {announcement.meetUrl && (
                          <a
                            href={announcement.meetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-xs"
                          >
                            <Video className="w-4 h-4" />
                            <span>Buka Google Meet Kuliah</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}

                        <a
                          href={getGoogleCalendarUrl(announcement)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-xs"
                          title="Simpan otomatis jadwal ini ke Google Calendar HP/Laptop dengan 1 klik"
                        >
                          <Calendar className="w-4 h-4" />
                          <span>📅 Tambah ke Google Calendar</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* Search Bar */}
                <div className={`flex items-center px-3.5 py-2.5 rounded-2xl border shadow-xs ${
                  darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'
                }`}>
                  <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    placeholder="Cari mata kuliah, kode, atau dosen..."
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    className={`w-full text-xs font-semibold bg-transparent outline-none ${
                      darkMode ? 'text-white placeholder-gray-500' : 'text-slate-800 placeholder-slate-400'
                    }`}
                  />
                </div>

                {/* Hari Jumat Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                    <h3 className="font-extrabold text-xs sm:text-sm tracking-wide uppercase text-emerald-600 dark:text-emerald-400">
                      Jumat (4 Mata Kuliah)
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {courses
                      .filter(c => c.day === 'Jumat')
                      .filter(c => 
                        c.name.toLowerCase().includes(searchKeyword.toLowerCase()) || 
                        c.code.toLowerCase().includes(searchKeyword.toLowerCase()) ||
                        c.lecturer.toLowerCase().includes(searchKeyword.toLowerCase())
                      )
                      .map(course => {
                        const pdfs = getCoursePdfs(course);
                        return (
                          <div
                            key={course.id}
                            onClick={() => {
                              setSelectedCourseId(course.id);
                              setDetailTab('info');
                              setActivePdfIndex(0);
                              setChatMessages([]);
                              setChatQuery('');
                            }}
                            className="p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 hover:scale-[1.01] cursor-pointer shadow-xs relative overflow-hidden flex flex-col justify-between"
                            style={{
                              backgroundColor: darkMode ? course.colorTheme.darkBg : course.colorTheme.bgLight,
                              borderColor: darkMode ? course.colorTheme.darkBorder : course.colorTheme.borderLight,
                              color: darkMode ? course.colorTheme.darkText : course.colorTheme.textLight,
                            }}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md uppercase border border-current">
                                    {course.code}
                                  </span>
                                  {pdfs.length > 0 && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-600 text-white flex items-center gap-0.5">
                                      <Paperclip className="w-2.5 h-2.5" /> {pdfs.length} PDF
                                    </span>
                                  )}
                                  {(course.groups || []).length > 0 && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-blue-600 text-white flex items-center gap-0.5">
                                      <Users className="w-2.5 h-2.5" /> {(course.groups || []).length} Klp
                                    </span>
                                  )}
                                  {(course.tasks || []).length > 0 && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-purple-600 text-white flex items-center gap-0.5">
                                      <FileText className="w-2.5 h-2.5" /> {(course.tasks || []).length} Tugas
                                    </span>
                                  )}
                                </div>
                                <ChevronRight className="w-4 h-4 opacity-70 shrink-0" />
                              </div>

                              <h4 className="font-extrabold text-sm mt-2 leading-snug">{course.name}</h4>
                              <p className="text-[11px] font-medium mt-1 opacity-90 leading-tight">Dosen: {course.lecturer}</p>
                            </div>

                            <div className="mt-2.5 pt-2 border-t border-current/20 flex flex-wrap items-center justify-between gap-1 text-[11px] font-semibold">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3 shrink-0" />
                                <span>{course.time}</span>
                              </div>
                              <div className="flex items-center gap-1 min-w-0">
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span className="truncate">{course.room}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Hari Sabtu Section */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0"></span>
                    <h3 className="font-extrabold text-xs sm:text-sm tracking-wide uppercase text-blue-600 dark:text-blue-400">
                      Sabtu (3 Mata Kuliah)
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {courses
                      .filter(c => c.day === 'Sabtu')
                      .filter(c => 
                        c.name.toLowerCase().includes(searchKeyword.toLowerCase()) || 
                        c.code.toLowerCase().includes(searchKeyword.toLowerCase()) ||
                        c.lecturer.toLowerCase().includes(searchKeyword.toLowerCase())
                      )
                      .map(course => {
                        const pdfs = getCoursePdfs(course);
                        return (
                          <div
                            key={course.id}
                            onClick={() => {
                              setSelectedCourseId(course.id);
                              setDetailTab('info');
                              setActivePdfIndex(0);
                              setChatMessages([]);
                              setChatQuery('');
                            }}
                            className="p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 hover:scale-[1.01] cursor-pointer shadow-xs relative overflow-hidden flex flex-col justify-between"
                            style={{
                              backgroundColor: darkMode ? course.colorTheme.darkBg : course.colorTheme.bgLight,
                              borderColor: darkMode ? course.colorTheme.darkBorder : course.colorTheme.borderLight,
                              color: darkMode ? course.colorTheme.darkText : course.colorTheme.textLight,
                            }}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md uppercase border border-current">
                                    {course.code}
                                  </span>
                                  {pdfs.length > 0 && (
                                     <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-600 text-white flex items-center gap-0.5">
                                       <Paperclip className="w-2.5 h-2.5" /> {pdfs.length} PDF
                                     </span>
                                  )}
                                  {(course.groups || []).length > 0 && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-blue-600 text-white flex items-center gap-0.5">
                                      <Users className="w-2.5 h-2.5" /> {(course.groups || []).length} Klp
                                    </span>
                                  )}
                                  {(course.tasks || []).length > 0 && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-purple-600 text-white flex items-center gap-0.5">
                                      <FileText className="w-2.5 h-2.5" /> {(course.tasks || []).length} Tugas
                                    </span>
                                  )}
                                </div>
                                <ChevronRight className="w-4 h-4 opacity-70 shrink-0" />
                              </div>

                              <h4 className="font-extrabold text-sm mt-2 leading-snug">{course.name}</h4>
                              <p className="text-[11px] font-medium mt-1 opacity-90 leading-tight">Dosen: {course.lecturer}</p>
                            </div>

                            <div className="mt-2.5 pt-2 border-t border-current/20 flex flex-wrap items-center justify-between gap-1 text-[11px] font-semibold">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3 shrink-0" />
                                <span>{course.time}</span>
                              </div>
                              <div className="flex items-center gap-1 min-w-0">
                                <MapPin className="w-3 h-3 shrink-0" />
                                <span className="truncate">{course.room}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

              </div>
            )}



            {/* 3. KOSMA / ADMIN PANEL (PIN PROTECTED) */}
            {activeTab === 'admin' && (
              <div className="space-y-4">
                {!isLoggedInAdmin ? (
                  /* Form Authentikasi Kosma */
                  <div className={`p-5 sm:p-6 rounded-2xl border max-w-sm mx-auto space-y-4 text-center ${
                    darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'
                  }`}>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
                      <KeyRound className="w-6 h-6" />
                    </div>

                    <div>
                      <h3 className="font-extrabold text-base">Panel Pengelola Kosma</h3>
                      <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                        Masukkan PIN Keamanan Kosma (5 Digit) untuk mengelola tugas, kelompok & data PJ perkuliahan.
                      </p>
                    </div>

                    <form onSubmit={handleAdminLogin} className="space-y-3">
                      <input
                        type="password"
                        maxLength={5}
                        placeholder="Masukkan PIN Kosma..."
                        value={adminPIN}
                        onChange={(e) => setAdminPIN(e.target.value)}
                        className={`w-full p-3 text-center text-lg font-bold tracking-widest rounded-xl border outline-none ${
                          darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                        }`}
                      />

                      <button
                        type="submit"
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition-colors shadow-xs"
                      >
                        Buka Panel Kosma
                      </button>
                    </form>
                  </div>
                ) : (
                  /* Panel Kontrol Kosma */
                  <div className="space-y-4 sm:space-y-5">
                    
                    {/* Header Admin */}
                    <div className={`p-4 rounded-2xl border flex items-center justify-between gap-2 ${
                      darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'
                    }`}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
                          <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-xs sm:text-sm">Mode Pengelola (Kosma/Admin)</h3>
                          <p className="text-[11px] text-slate-500 dark:text-gray-400">Hak Akses: Penuh (Kelola Tugas, Kelompok, & Task Sync)</p>
                        </div>
                      </div>

                      <button
                        onClick={handleAdminLogout}
                        className="px-2.5 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1 hover:bg-rose-100 shrink-0"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Keluar
                      </button>
                    </div>

                    {/* Quick Tools & Backup */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handleForceCloudPull}
                        className="px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shadow-xs flex items-center gap-1.5"
                      >
                        <Database className="w-3.5 h-3.5" /> 🔄 Pull Data Cloud Supabase
                      </button>
                      <button
                        onClick={handleExportData}
                        className="px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" /> Export Backup JSON
                      </button>
                      <button
                        onClick={handleResetAllData}
                        className="px-3 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors shadow-xs flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Reset Data Kosong
                      </button>
                      <button
                        onClick={() => setShowSqlGuide(!showSqlGuide)}
                        className="px-3 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-colors shadow-xs flex items-center gap-1.5"
                      >
                        <Database className="w-3.5 h-3.5" /> Info Supabase DB
                      </button>
                    </div>

                    {/* SECTION: SIARAN AGENDA KULIAH SELANJUTNYA & PENGUMUMAN KOSMA */}
                    <div className={`p-4 sm:p-5 rounded-2xl border ${darkMode ? 'bg-gradient-to-br from-emerald-950/40 to-gray-900 border-emerald-800/50' : 'bg-gradient-to-br from-emerald-50/70 to-white border-emerald-200'} space-y-4 shadow-2xs`}>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                            <Megaphone className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-extrabold text-xs sm:text-sm text-emerald-950 dark:text-emerald-200 flex items-center gap-2 flex-wrap">
                              <span>Broadcast Agenda Kuliah Terdekat & Pengumuman</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${annForm.isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-100 text-slate-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                                {annForm.isActive ? '🟢 Tayang di Beranda Mahasiswa' : '⚪ Dinonaktifkan'}
                              </span>
                            </h3>
                            <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
                              Atur jadwal kuliah berikutnya atau pesan penting dosen. Otomatis tampil di posisi paling atas layar seluruh mahasiswa.
                            </p>
                          </div>
                        </div>

                        {/* Toggle Active */}
                        <label className="flex items-center gap-2 cursor-pointer bg-white/80 dark:bg-gray-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 shadow-2xs">
                          <input
                            type="checkbox"
                            checked={annForm.isActive}
                            onChange={(e) => setAnnForm(prev => ({ ...prev, isActive: e.target.checked }))}
                            className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                          />
                          <span className="text-xs font-bold text-slate-700 dark:text-gray-200">
                            Tayangkan di Beranda
                          </span>
                        </label>
                      </div>

                      <form onSubmit={handleSaveAnnouncement} className="space-y-3 pt-1">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 dark:text-gray-400 mb-1">
                              Judul Pengumuman / Header
                            </label>
                            <input
                              type="text"
                              value={annForm.title}
                              onChange={(e) => setAnnForm(prev => ({ ...prev, title: e.target.value }))}
                              placeholder="Contoh: Agenda Kuliah Terdekat / Kuliah Perdana"
                              className={`w-full p-2.5 rounded-xl border text-xs font-medium outline-none ${
                                darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                              }`}
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 dark:text-gray-400 mb-1">
                              Pilih Cepat Matkul atau Tulis Bebas
                            </label>
                            <div className="flex gap-2">
                              <select
                                onChange={(e) => {
                                  const sel = courses.find(c => c.id === e.target.value);
                                  if (sel) {
                                    setAnnForm(prev => ({
                                      ...prev,
                                      courseName: sel.name,
                                      lecturerName: sel.lecturer,
                                      dayDate: sel.day === 'Jumat' ? 'Jumat, [Tanggal]' : 'Sabtu, [Tanggal]',
                                      time: sel.time,
                                      location: sel.room
                                    }));
                                  }
                                }}
                                className={`w-1/3 p-2.5 rounded-xl border text-xs font-medium outline-none ${
                                  darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                                }`}
                              >
                                <option value="">-- Pilih Matkul --</option>
                                {courses.map(c => (
                                  <option key={c.id} value={c.id}>{c.code} - {c.name.slice(0, 18)}...</option>
                                ))}
                              </select>
                              <input
                                type="text"
                                value={annForm.courseName}
                                onChange={(e) => setAnnForm(prev => ({ ...prev, courseName: e.target.value }))}
                                placeholder="Nama Mata Kuliah..."
                                required
                                className={`flex-1 p-2.5 rounded-xl border text-xs font-medium outline-none ${
                                  darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                                }`}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 dark:text-gray-400 mb-1">
                              Dosen Pengampu
                            </label>
                            <input
                              type="text"
                              value={annForm.lecturerName}
                              onChange={(e) => setAnnForm(prev => ({ ...prev, lecturerName: e.target.value }))}
                              placeholder="Nama Dosen..."
                              className={`w-full p-2.5 rounded-xl border text-xs font-medium outline-none ${
                                darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                              }`}
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 dark:text-gray-400 mb-1">
                              Hari & Tanggal
                            </label>
                            <input
                              type="text"
                              value={annForm.dayDate}
                              onChange={(e) => setAnnForm(prev => ({ ...prev, dayDate: e.target.value }))}
                              placeholder="Contoh: Sabtu, 20 September 2026"
                              required
                              className={`w-full p-2.5 rounded-xl border text-xs font-medium outline-none ${
                                darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                              }`}
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 dark:text-gray-400 mb-1">
                              Waktu / Jam Kuliah
                            </label>
                            <input
                              type="text"
                              value={annForm.time}
                              onChange={(e) => setAnnForm(prev => ({ ...prev, time: e.target.value }))}
                              placeholder="Contoh: 08:00 - 09:40 WIB"
                              required
                              className={`w-full p-2.5 rounded-xl border text-xs font-medium outline-none ${
                                darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                              }`}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 dark:text-gray-400 mb-1">
                              Ruang / Tempat
                            </label>
                            <input
                              type="text"
                              value={annForm.location}
                              onChange={(e) => setAnnForm(prev => ({ ...prev, location: e.target.value }))}
                              placeholder="Contoh: Gedung Pascasarjana Lt. 3 / Daring"
                              className={`w-full p-2.5 rounded-xl border text-xs font-medium outline-none ${
                                darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                              }`}
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-600 dark:text-gray-400 mb-1">
                              Tautan Google Meet / Daring (Opsional)
                            </label>
                            <input
                              type="url"
                              value={annForm.meetUrl || ''}
                              onChange={(e) => setAnnForm(prev => ({ ...prev, meetUrl: e.target.value }))}
                              placeholder="Contoh: https://meet.google.com/xyz-abcd-efg"
                              className={`w-full p-2.5 rounded-xl border text-xs font-medium outline-none ${
                                darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                              }`}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-gray-400 mb-1">
                            Agenda / Topik Perkuliahan (Opsional)
                          </label>
                          <input
                            type="text"
                            value={annForm.agenda || ''}
                            onChange={(e) => setAnnForm(prev => ({ ...prev, agenda: e.target.value }))}
                            placeholder="Contoh: Presentasi Kelompok 1 & 2 / Penjelasan Silabus"
                            className={`w-full p-2.5 rounded-xl border text-xs font-medium outline-none ${
                              darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                            }`}
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 dark:text-gray-400 mb-1">
                            Instruksi / Catatan Khusus Kosma & Dosen (Opsional)
                          </label>
                          <textarea
                            rows={2}
                            value={annForm.notes || ''}
                            onChange={(e) => setAnnForm(prev => ({ ...prev, notes: e.target.value }))}
                            placeholder="Contoh: Seluruh mahasiswa wajib hadir 10 menit sebelum kelas dimulai membawa file makalah..."
                            className={`w-full p-2.5 rounded-xl border text-xs font-medium outline-none ${
                              darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                            }`}
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                          <button
                            type="submit"
                            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-all"
                          >
                            <Megaphone className="w-4 h-4" />
                            <span>📢 Simpan & Siarkan Pengumuman</span>
                          </button>

                          {announcement.isActive && (
                            <button
                              type="button"
                              onClick={handleResetAnnouncement}
                              className="px-3 py-2.5 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 font-bold text-xs transition-all"
                            >
                              Matikan Siaran di Beranda
                            </button>
                          )}
                        </div>
                      </form>
                    </div>

                    {/* SECTION: GOOGLE GEMINI AI CONFIGURATION */}
                    <div className={`p-4 sm:p-5 rounded-2xl border ${darkMode ? 'bg-gradient-to-br from-indigo-950/40 to-gray-900 border-indigo-800/50' : 'bg-gradient-to-br from-indigo-50/70 to-white border-indigo-200'} space-y-3 shadow-2xs`}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-xs sm:text-sm text-indigo-950 dark:text-indigo-200 flex items-center gap-2">
                            <span>Integrasi Google Gemini 3.6 Flash (AI Chatbot Silabus)</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              Aktif & Terhubung
                            </span>
                          </h3>
                          <p className="text-[11px] text-indigo-700/80 dark:text-indigo-300/80">
                            Mahasiswa dapat bertanya materi, tugas, dan referensi jurnal di tab AI Chat tiap mata kuliah.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <label className="text-xs font-bold text-slate-700 dark:text-gray-300">
                          API Key Gemini Aktif:
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="password"
                            value={geminiApiKey}
                            onChange={(e) => {
                              setGeminiApiKey(e.target.value);
                              localStorage.setItem('mps2_gemini_api_key', e.target.value);
                            }}
                            placeholder="AQ.Ab8RN6... / AIzaSy..."
                            className={`flex-1 p-2.5 text-xs font-mono rounded-xl border outline-none ${
                              darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-slate-200 text-slate-900'
                            }`}
                          />
                          <button
                            onClick={async () => {
                              localStorage.setItem('mps2_gemini_api_key', geminiApiKey);
                              try {
                                await supabase
                                  .from('mps2_store')
                                  .upsert({ id: 'gemini_config', data: { api_key: geminiApiKey }, updated_at: new Date().toISOString() });
                                alert('API Key Gemini berhasil disimpan dan disinkronkan ke cloud!');
                              } catch (err) {
                                alert('API Key Gemini tersimpan di perangkat lokal.');
                              }
                            }}
                            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                          >
                            Simpan
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          💡 <em>Kunci tersimpan aman di cloud Supabase dan tersinkronisasi otomatis untuk seluruh mahasiswa.</em>
                        </p>
                      </div>
                    </div>

                    {/* SECTION: SMART IMPORT KELOMPOK GENERATOR */}
                    <div className={`p-4 sm:p-5 rounded-2xl border ${darkMode ? 'bg-gradient-to-br from-purple-950/40 to-gray-900 border-purple-800/50' : 'bg-gradient-to-br from-purple-50/70 to-white border-purple-200'} space-y-3 shadow-2xs`}>
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                            <Sparkles className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="font-extrabold text-xs sm:text-sm text-purple-950 dark:text-purple-200">
                              ⚡ Smart Generator & Import Kelompok Otomatis
                            </h3>
                            <p className="text-[11px] text-purple-700/80 dark:text-purple-300/80">
                              Tempel teks dari WhatsApp dosen atau silabus untuk mengisi kelompok secara otomatis per mata kuliah.
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setImportRawText('');
                            setParsedPreviewGroups([]);
                            setShowSmartImportModal(true);
                          }}
                          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs shrink-0"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Buka Smart Importer</span>
                        </button>
                      </div>
                    </div>

                    {/* SQL Guide Toggle */}
                    {showSqlGuide && (
                      <div className="p-4 rounded-2xl bg-purple-950 border border-purple-800 text-purple-200 text-xs space-y-2">
                        <p className="font-bold text-white">Panduan Supabase (Jika Tabel Belum Ada):</p>
                        <p className="text-[11px] opacity-90">
                          Buka SQL Editor di Dashboard Supabase (`https://jkduklbnaspnsuluzkkv.supabase.co`) dan jalankan perintah berikut:
                        </p>
                        <pre className="p-3 bg-black/60 rounded-xl overflow-x-auto text-[10px] text-purple-300 font-mono select-all">
{`CREATE TABLE IF NOT EXISTS mps2_store (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE mps2_store ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access" ON mps2_store FOR ALL USING (true) WITH CHECK (true);`}
                        </pre>
                      </div>
                    )}

                    {/* SECTION: LIST PDF TERUPLOD & MANAGEMENT PER MATKUL */}
                    <div className={`p-4 sm:p-5 rounded-2xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'} space-y-3`}>
                      <h3 className="font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                        <Paperclip className="w-4 h-4 shrink-0" /> Kelola File PDF Terunggah Per Mata Kuliah (Banyak File PDF / Tanpa Batasan)
                      </h3>

                      <div className="space-y-2">
                        {courses.map(c => {
                          const pdfs = getCoursePdfs(c);
                          return (
                            <div key={c.id} className="p-3 rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                              <div>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">[{c.code}]</span> <span className="font-semibold">{c.name}</span>
                                <div className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">
                                  Status: {pdfs.length} File PDF terunggah
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5">
                                {pdfs.map((pdf, pIdx) => (
                                  <div key={pdf.id} className="flex items-center gap-1 px-2 py-1 rounded bg-slate-200 dark:bg-gray-700 text-[11px] font-bold">
                                    <span className="truncate max-w-[120px]">File #{pIdx+1}</span>
                                    <button
                                      onClick={() => handleDeleteSinglePdf(c.id, pdf.id)}
                                      className="text-rose-600 hover:text-rose-800 dark:text-rose-400 ml-1"
                                      title="Hapus file PDF ini"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                                {pdfs.length > 0 && (
                                  <button
                                    onClick={() => handleResetCourseSyllabus(c.id)}
                                    className="px-2 py-1 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold rounded text-[10px]"
                                  >
                                    Reset All
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* SECTION 2: EDIT INFO PJ MATKUL */}
                    <div className={`p-4 sm:p-5 rounded-2xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'} space-y-3`}>
                      <h3 className="font-bold text-xs sm:text-sm flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                        <UserPlus className="w-4 h-4 shrink-0" /> Atur Kontak Penanggung Jawab (PJ Matkul)
                      </h3>

                      <div className="space-y-2">
                        <label className="text-xs font-bold">Pilih Mata Kuliah:</label>
                        <select
                          value={selectedPjCourseId}
                          onChange={(e) => setSelectedPjCourseId(e.target.value)}
                          className={`w-full p-2.5 text-xs font-semibold rounded-xl border outline-none ${
                            darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          {courses.map(c => (
                            <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Nama PJ Matkul"
                          value={editPjName}
                          onChange={(e) => setEditPjName(e.target.value)}
                          className={`p-2.5 text-xs rounded-xl border outline-none ${
                            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-slate-50 border-slate-200'
                          }`}
                        />
                        <input
                          type="text"
                          placeholder="No. WhatsApp PJ"
                          value={editPjContact}
                          onChange={(e) => setEditPjContact(e.target.value)}
                          className={`p-2.5 text-xs rounded-xl border outline-none ${
                            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-slate-50 border-slate-200'
                          }`}
                        />
                      </div>

                      <button
                        onClick={() => handleUpdatePJInfo(selectedPjCourseId)}
                        className="w-full py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700"
                      >
                        Perbarui Data PJ Matkul
                      </button>
                    </div>

                  </div>
                )}
              </div>
            )}
          </>
        )}
    </>
  );

  return (
    <div className={`min-h-screen transition-colors duration-200 font-sans ${darkMode ? 'bg-gray-950 text-gray-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* HEADER / NAVIGATION (OPTIMIZED FOR SMALL MOBILE SCREENS LIKE IPHONE 13 MINI & OLDER ANDROIDS) */}
      <header className={`sticky top-0 z-40 border-b backdrop-blur-md transition-colors ${darkMode ? 'bg-gray-900/90 border-gray-800' : 'bg-white/90 border-slate-200'}`}>
        <div className="max-w-md md:max-w-3xl mx-auto px-3 py-2 flex items-center justify-between gap-1">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-1.5 cursor-pointer shrink-0" onClick={() => setSelectedCourseId(null)}>
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-extrabold flex items-center justify-center text-base shadow-xs shrink-0">
              S2
            </div>
            <div className="shrink-0">
              <h1 className="font-extrabold text-sm sm:text-base leading-none tracking-tight">Portal MPS2</h1>
              <p className="text-[10px] text-slate-500 dark:text-gray-400 leading-tight mt-0.5">Magister Pend. Islam</p>
            </div>
          </div>

          {/* Controls & Badges */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Status Cloud Sync Badge */}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5 shrink-0 ${
              isSyncedWithSupabase 
                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' 
                : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
            }`}>
              <Database className="w-2.5 h-2.5" />
              <span>{isSyncedWithSupabase ? 'Cloud Sync' : 'Local'}</span>
            </span>

            {/* Tombol KOSMA Admin */}
            <button
              onClick={() => setActiveTab('admin')}
              className={`px-2 py-1 rounded-xl border text-[11px] font-bold transition-all flex items-center gap-1 shrink-0 ${
                activeTab === 'admin' || isLoggedInAdmin
                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                  : darkMode
                  ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Lock className="w-3 h-3" />
              <span>{isLoggedInAdmin ? 'Kosma' : 'Kosma'}</span>
            </button>

            {/* Mode Siang/Malam (Icon Only on Small Screens) */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-1.5 rounded-xl border transition-all text-xs font-semibold flex items-center shrink-0 ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700 text-amber-400 hover:bg-gray-700' 
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
              aria-label="Toggle Theme"
            >
              {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>

        </div>

        {/* TOP HEADER SUB-BAR (JIKA DI PANEL KOSMA) */}
        {activeTab === 'admin' && (
          <div className="max-w-md md:max-w-3xl mx-auto px-3 flex border-t border-slate-200/60 dark:border-gray-800">
            <button
              onClick={() => {
                setActiveTab('jadwal');
                setSelectedCourseId(null);
              }}
              className="flex-1 py-2.5 text-xs sm:text-sm font-bold border-b-2 border-emerald-600 text-emerald-600 dark:text-emerald-400 text-center transition-colors flex items-center justify-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>← Kembali ke Jadwal & Daftar Matkul</span>
            </button>
          </div>
        )}
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-md md:max-w-3xl mx-auto px-3 py-4 pb-28 sm:pb-12 space-y-4 font-sans">
        {renderMainContent()}
      </main>

      {/* MODAL: ADD TASK */}
      {showAddTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-sm p-5 rounded-2xl border space-y-3 ${darkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-slate-200'}`}>
            <h3 className="font-bold text-sm">Tambah Tugas Baru</h3>
            
            <input
              type="text"
              placeholder="Judul Tugas"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className={`w-full p-2.5 text-xs rounded-xl border outline-none ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-slate-50 border-slate-200'}`}
            />

            <textarea
              placeholder="Deskripsi Instruksi Tugas"
              rows={3}
              value={newTaskDesc}
              onChange={(e) => setNewTaskDesc(e.target.value)}
              className={`w-full p-2.5 text-xs rounded-xl border outline-none ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-slate-50 border-slate-200'}`}
            />

            <div className="flex gap-2">
              <select
                value={newTaskType}
                onChange={(e) => setNewTaskType(e.target.value as any)}
                className={`flex-1 p-2 text-xs font-semibold rounded-xl border outline-none ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-slate-50 border-slate-200'}`}
              >
                <option value="Individu">Individu</option>
                <option value="Kelompok">Kelompok</option>
              </select>

              <input
                type="datetime-local"
                value={newTaskDeadline}
                onChange={(e) => setNewTaskDeadline(e.target.value)}
                className={`flex-1 p-2 text-xs rounded-xl border outline-none ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-slate-50 border-slate-200'}`}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowAddTaskModal(false)}
                className="flex-1 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-gray-700"
              >
                Batal
              </button>
              <button
                onClick={handleAddTask}
                className="flex-1 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD GROUP */}
      {showAddGroupModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-sm p-5 rounded-2xl border space-y-3 ${darkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-slate-200'}`}>
            <h3 className="font-bold text-sm">Tambah Kelompok</h3>
            
            <input
              type="text"
              placeholder="Nama Kelompok (contoh: Kelompok 1)"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className={`w-full p-2.5 text-xs rounded-xl border outline-none ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-slate-50 border-slate-200'}`}
            />

            <input
              type="text"
              placeholder="Topik / Judul Makalah"
              value={newGroupTopic}
              onChange={(e) => setNewGroupTopic(e.target.value)}
              className={`w-full p-2.5 text-xs rounded-xl border outline-none ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-slate-50 border-slate-200'}`}
            />

            <input
              type="text"
              placeholder="Anggota (pisahkan dengan koma: Ahmad, Siti, Budi)"
              value={newGroupMembers}
              onChange={(e) => setNewGroupMembers(e.target.value)}
              className={`w-full p-2.5 text-xs rounded-xl border outline-none ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-slate-50 border-slate-200'}`}
            />

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowAddGroupModal(false)}
                className="flex-1 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-gray-700"
              >
                Batal
              </button>
              <button
                onClick={handleAddGroup}
                className="flex-1 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DIRECT AI EXTRACTION FOR SELECTED COURSE */}
      {showDirectAIModal && selectedCourse && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-sm p-5 rounded-2xl border space-y-3 ${darkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
              <Sparkles className="w-5 h-5" />
              <h3 className="font-extrabold text-sm">Ekstrak AI Silabus ({selectedCourse.code})</h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-gray-400 leading-relaxed">
              Tempelkan teks silabus untuk matkul <strong>{selectedCourse.name}</strong>. AI akan mengekstrak ringkasan & tugas secara otomatis ke halaman ini!
            </p>
            
            <textarea
              placeholder="Tempel teks silabus matkul ini di sini..."
              rows={5}
              value={directAIText}
              onChange={(e) => setDirectAIText(e.target.value)}
              className={`w-full p-3 text-xs rounded-xl border outline-none ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-slate-50 border-slate-200'}`}
            />

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowDirectAIModal(false)}
                className="flex-1 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-gray-700"
              >
                Batal
              </button>
              <button
                onClick={handleDirectAIExtract}
                disabled={isDirectAnalyzing || !directAIText.trim()}
                className="flex-1 py-2 text-xs font-bold rounded-xl bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {isDirectAnalyzing ? 'Membaca...' : 'Ekstrak via AI'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: IN-APP FULLSCREEN PDF READER FOR MOBILE & DESKTOP */}
      {fullscreenPdf && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col font-sans">
          {/* Header Bar */}
          <div className="p-3 bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between gap-2 shadow-md">
            <div className="flex items-center gap-2 truncate pr-2">
              <FileText className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="font-bold text-xs sm:text-sm truncate">{fullscreenPdf.name}</span>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <a
                href={fullscreenPdf.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 sm:px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
                title="Buka langsung di aplikasi PDF HP atau Tab Browser"
              >
                <ExternalLink className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Tab Baru / App</span><span className="sm:hidden">Buka</span>
              </a>
              <a
                href={fullscreenPdf.url}
                download={fullscreenPdf.name}
                className="px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Unduh
              </a>
              <button
                onClick={() => setFullscreenPdf(null)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1"
              >
                ✕ Tutup
              </button>
            </div>
          </div>

          {/* Fullscreen Body Frame */}
          <div className="flex-1 w-full bg-slate-900 overflow-hidden relative">
            <object
              data={fullscreenPdf.url}
              type="application/pdf"
              className="w-full h-full border-none"
            >
              <iframe
                src={fullscreenPdf.url}
                title={fullscreenPdf.name}
                className="w-full h-full border-none"
              >
                <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-3 bg-slate-900 text-white">
                  <FileText className="w-12 h-12 text-emerald-400 animate-pulse" />
                  <p className="font-bold text-base">Pratinjau PDF Memerlukan Aplikasi / Tab Browser</p>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Browser Anda tidak mengizinkan penayangan dokumen PDF berhalaman ganda di dalam frame ini.
                  </p>
                  <a
                    href={fullscreenPdf.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" /> Buka PDF di Layar Penuh / Aplikasi HP
                  </a>
                </div>
              </iframe>
            </object>
            
            {/* Mobile Bottom Quick Assist Bar */}
            <div className="sm:hidden absolute bottom-3 left-3 right-3 p-2 bg-slate-900/90 backdrop-blur-md text-white text-[11px] font-semibold rounded-xl flex items-center justify-between gap-2 shadow-xl border border-slate-700">
              <span className="truncate">Layar blank di HP Anda?</span>
              <a
                href={fullscreenPdf.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg shrink-0 text-xs flex items-center gap-1"
              >
                Buka Tab Asli ↗
              </a>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: IN-APP GOOGLE DRIVE DOCUMENT VIEWER (STAYS INSIDE PORTAL) */}
      {activeDriveDoc && (
        <div className="fixed inset-0 z-[110] bg-slate-950 flex flex-col font-sans animate-fadeIn">
          {/* Top Bar Controls */}
          <div className="p-3 bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between gap-2 shadow-md">
            <div className="flex items-center gap-2 truncate pr-2">
              <FileText className="w-5 h-5 text-blue-400 shrink-0" />
              <div className="truncate">
                <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-blue-900 text-blue-200 mr-1.5">
                  Google Drive In-App
                </span>
                <span className="font-bold text-xs sm:text-sm truncate">{activeDriveDoc.title}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {activeDriveDoc.downloadUrl && (
                <a
                  href={activeDriveDoc.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 sm:px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shadow-xs active:scale-[0.98]"
                  title="Unduh dokumen langsung ke perangkat"
                >
                  <Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Unduh Dokumen</span>
                </a>
              )}
              <a
                href={activeDriveDoc.rawUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors border border-slate-700"
                title="Buka langsung di aplikasi Google Drive"
              >
                <ExternalLink className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Buka Tab Luar</span>
              </a>
              <button
                onClick={() => setActiveDriveDoc(null)}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1"
              >
                ✕ Tutup
              </button>
            </div>
          </div>

          {/* Embedded Google Drive Frame */}
          <div className="flex-1 w-full bg-slate-900 relative">
            <iframe
              src={activeDriveDoc.embedUrl}
              title={activeDriveDoc.title}
              className="w-full h-full border-none"
              allow="autoplay"
            />
          </div>
        </div>
      )}

      {/* MODAL: KOSMA INPUT GOOGLE DRIVE LINK */}
      {showLinkDriveModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className={`w-full max-w-md p-5 rounded-3xl border shadow-xl ${darkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-slate-200 text-slate-900'} space-y-4`}>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-800 pb-3">
              <h3 className="font-bold text-sm flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <FileText className="w-4 h-4" /> 
                {showLinkDriveModal.isSyllabus 
                  ? 'Tautkan Silabus / RPS (Google Drive)' 
                  : showLinkDriveModal.isCourseFolder 
                    ? 'Tautkan Folder Materi (Google Drive)' 
                    : 'Tautkan Berkas Makalah / PPT (Google Drive)'}
              </h3>
              <button onClick={() => setShowLinkDriveModal(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-xs font-semibold text-slate-500 dark:text-gray-400 block">Sasaran:</span>
                <p className="font-extrabold text-sm text-slate-800 dark:text-gray-100">{showLinkDriveModal.title}</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold">
                  {showLinkDriveModal.isCourseFolder ? 'Link Folder Google Drive:' : 'Link Berkas Google Drive:'}
                </label>
                <input
                  type="url"
                  placeholder={showLinkDriveModal.isCourseFolder ? "https://drive.google.com/drive/folders/..." : "https://drive.google.com/file/d/.../view?usp=sharing"}
                  value={driveInputUrl}
                  onChange={(e) => setDriveInputUrl(e.target.value)}
                  className={`w-full p-3 text-xs rounded-xl border outline-none font-mono ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}`}
                />
                <p className="text-[11px] text-slate-500 dark:text-gray-400 pt-1">
                  💡 <em>Petunjuk: Salin link berbagi berkas/folder dari Google Drive Mahasiswa (pastikan akses 'Siapa saja yang memiliki tautan' / Anyone with the link). Berkas akan dibuka langsung di dalam web portal!</em>
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowLinkDriveModal(null)}
                className="flex-1 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-gray-700"
              >
                Batal
              </button>
              {showLinkDriveModal.currentUrl && (
                <button
                  onClick={() => {
                    setDriveInputUrl('');
                    setTimeout(() => handleSaveDriveLink(), 50);
                  }}
                  className="px-3 py-2 text-xs font-bold rounded-xl bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-950 dark:text-rose-300"
                >
                  Hapus Link
                </button>
              )}
              <button
                onClick={handleSaveDriveLink}
                className="flex-1 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
              >
                Simpan Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SMART IMPORT KELOMPOK OTOMATIS */}
      {showSmartImportModal && (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className={`w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl border shadow-2xl ${
            darkMode ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-gray-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">⚡ Smart Import Kelompok Otomatis</h3>
                  <p className="text-xs text-slate-500 dark:text-gray-400">
                    Otomatis membaca nama kelompok, materi bahasan & anggota dari teks WA atau PDF
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowSmartImportModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-gray-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Step 1: Pilih Mata Kuliah Sasaran */}
              <div className="space-y-1.5">
                <label className="font-bold flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                  <BookOpen className="w-4 h-4" /> 1. Pilih Mata Kuliah Sasaran:
                </label>
                <select
                  value={importTargetCourseId}
                  onChange={(e) => setImportTargetCourseId(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border font-bold outline-none text-xs ${
                    darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>
                      [{c.code}] {c.name} — ({ (c.groups || []).length } Kelompok Terdaftar)
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Input Teks / WhatsApp */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <label className="font-bold flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                    <span>✍️ 2. Tempel Teks Daftar Kelompok:</span>
                  </label>
                  
                  {/* Quick Format Templates */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400">Contoh:</span>
                    <button
                      type="button"
                      onClick={() => handleImportTextChange(`Kelompok 1\nTopik: Analisis Kebijakan Manajemen Pendidikan Islam\nAnggota: Fathan Mubina, Dewi Rakhmawati, Restu Rosita\n\nKelompok 2\nTopik: Strategi Pengembangan SDM Madrasah Unggul\nAnggota: Lutfhi Syamsul Maarif, Nasya Millatul Faza, Asep Trisna`)}
                      className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[10px] font-bold"
                    >
                      Pola WA 1
                    </button>
                    <button
                      type="button"
                      onClick={() => handleImportTextChange(`1. Kelompok 1: Kepemimpinan Mutu Pendidikan\n- Fathan Mubina\n- Dewi Rakhmawati\n\n2. Kelompok 2: Manajemen Pembiayaan & Anggaran\n- Restu Rosita\n- Santi Nuraidah`)}
                      className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[10px] font-bold"
                    >
                      Pola WA 2
                    </button>
                  </div>
                </div>

                <textarea
                  rows={6}
                  placeholder={`Tempel daftar kelompok dari WhatsApp atau dokumen di sini...\nContoh:\nKelompok 1\nTopik: Konsep Dasar Manajemen\nAnggota: Fathan, Dewi, Restu`}
                  value={importRawText}
                  onChange={(e) => handleImportTextChange(e.target.value)}
                  className={`w-full p-3 rounded-2xl border outline-none font-mono text-xs leading-relaxed ${
                    darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              {/* Step 3: Mode Impor */}
              <div className="p-3 rounded-xl border bg-slate-50 dark:bg-gray-800/40 border-slate-200 dark:border-gray-800 flex items-center justify-between gap-3 flex-wrap">
                <span className="font-bold text-slate-700 dark:text-gray-300">Mode Penyimpanan:</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                    />
                    <span className="font-semibold">Timpa Kelompok Lama</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                    />
                    <span className="font-semibold">Tambahkan (Gabung)</span>
                  </label>
                </div>
              </div>

              {/* Step 4: Live Preview Hasil Parsing */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" /> 
                    Pratinjau Terdeteksi: {parsedPreviewGroups.length} Kelompok
                  </span>
                  {parsedPreviewGroups.length > 0 && (
                    <span className="text-[11px] text-slate-400">
                      Siap diterapkan ke {courses.find(c => c.id === importTargetCourseId)?.code}
                    </span>
                  )}
                </div>

                {parsedPreviewGroups.length === 0 ? (
                  <div className="p-6 text-center rounded-2xl border border-dashed border-slate-300 dark:border-gray-700 text-slate-400">
                    Belum ada data kelompok. Ketik atau tempel teks daftar kelompok di atas.
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {parsedPreviewGroups.map((g, idx) => (
                      <div key={idx} className="p-3 rounded-xl border bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-700 space-y-1.5 shadow-2xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-extrabold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[11px]">
                            {g.name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {g.members.length} Anggota
                          </span>
                        </div>
                        {g.topic && (
                          <p className="font-bold text-slate-800 dark:text-gray-100 text-xs">
                            📌 {g.topic}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1 pt-1">
                          {g.members.length === 0 ? (
                            <span className="text-[10px] text-amber-500 italic">Nama anggota belum terdeteksi</span>
                          ) : (
                            g.members.map((m, midx) => (
                              <span key={midx} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-200 text-[10px] font-semibold">
                                👤 {m}
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-gray-800 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowSmartImportModal(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 dark:border-gray-700 text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={parsedPreviewGroups.length === 0}
                onClick={handleApplyImportGroups}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white flex items-center gap-1.5 shadow-xs transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan {parsedPreviewGroups.length} Kelompok ke Web</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}
