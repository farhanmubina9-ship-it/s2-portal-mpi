import React, { useState, useEffect, useRef, Component, ErrorInfo, ReactNode } from 'react';
import { INITIAL_COURSES, Course, Task, Group, SyllabusFile } from './coursesData';
import { supabase } from './supabaseClient';
import { 
  Sun, Moon, Calendar, Clock, MapPin, UserCheck, BookOpen, 
  FileText, Users, CheckCircle2, Upload,
  Plus, ArrowLeft, Send, Sparkles, ChevronRight, ShieldAlert,
  Lock, LogOut, KeyRound, UserPlus, Search, Download, Trash2,
  Database, Check, Paperclip
} from 'lucide-react';

const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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
    const cleanGroups = Array.isArray(saved.groups) 
      ? saved.groups.filter((g: any) => g && !g.members?.includes('Ahmad') && !g.members?.includes('Fajar')) 
      : [];

    return {
      ...initial,
      ...saved,
      colorTheme: { ...initial.colorTheme, ...(saved.colorTheme || {}) },
      tasks: cleanTasks,
      groups: cleanGroups,
      syllabusPdfs: Array.isArray(saved.syllabusPdfs) ? saved.syllabusPdfs : [],
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
  const [activeTab, setActiveTab] = useState<'jadwal' | 'tugas' | 'admin'>('jadwal');
  
  // Detail Course Tab
  const [detailTab, setDetailTab] = useState<'info' | 'tugas' | 'kelompok' | 'ai'>('info');
  const [activePdfIndex, setActivePdfIndex] = useState<number>(0);

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

  // AI & Admin State
  const [syllabusText, setSyllabusText] = useState('');
  const [uploadedPdfUrl, setUploadedPdfUrl] = useState<string | null>(null);
  const [uploadedPdfName, setUploadedPdfName] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [extractedDraft, setExtractedDraft] = useState<Partial<Course> | null>(null);
  const [targetCourseForUpload, setTargetCourseForUpload] = useState<string>(courses[0]?.id || 'hmpi');

  // Bulk Upload State (3 Slots)
  const [bulkSlots, setBulkSlots] = useState<{ courseId: string; file: File | null }[]>([
    { courseId: courses[0]?.id || 'hmpi', file: null },
    { courseId: courses[1]?.id || 'fmpi', file: null },
    { courseId: courses[2]?.id || 'pmpi', file: null },
  ]);

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
          setIsSyncedWithSupabase(true);
        } else if (error) {
          console.warn("Supabase initial fetch notice:", error.message);
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
        { event: '*', schema: 'public', table: 'mps2_store', filter: 'id=eq.courses_data' },
        (payload: any) => {
          if (payload.new && payload.new.data) {
            const merged = mergeWithDefaults(payload.new.data);
            setCourses(merged);
            localStorage.setItem('mps2_courses', JSON.stringify(merged));
            setIsSyncedWithSupabase(true);
            isInitialFetchCompleted.current = true;
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

  // File PDF Upload Handler (Single)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedPdfName(file.name);
      try {
        const dataUrl = await readFileAsDataUrl(file);
        setUploadedPdfUrl(dataUrl);
      } catch {
        setUploadedPdfUrl(URL.createObjectURL(file));
      }
    }
  };

  const handleBulkSlotFile = (index: number, file: File | null) => {
    setBulkSlots(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], file };
      return copy;
    });
  };

  const handleBulkSlotCourse = (index: number, courseId: string) => {
    setBulkSlots(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], courseId };
      return copy;
    });
  };

  const handleSaveBulkSlots = async () => {
    const validSlots = bulkSlots.filter(s => s.file !== null);
    if (validSlots.length === 0) {
      alert('Silakan pilih minimal 1 file PDF silabus!');
      return;
    }

    const processedSlots = await Promise.all(
      validSlots.map(async slot => ({
        courseId: slot.courseId,
        pdfFileName: slot.file!.name,
        syllabusPdfUrl: await readFileAsDataUrl(slot.file!)
      }))
    );

    setCourses(prev => prev.map(c => {
      const matchedSlot = processedSlots.find(s => s.courseId === c.id);
      if (matchedSlot) {
        const currentPdfs = getCoursePdfs(c);
        const newPdf: SyllabusFile = {
          id: `pdf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: matchedSlot.pdfFileName,
          url: matchedSlot.syllabusPdfUrl
        };
        const updatedList = [...currentPdfs, newPdf];
        return {
          ...c,
          syllabusPdfUrl: updatedList[0]?.url,
          pdfFileName: updatedList[0]?.name,
          syllabusPdfs: updatedList,
          syllabusSummary: c.syllabusSummary === 'Upload silabus mata kuliah ini melalui Panel Admin untuk menampilkan deskripsi perkuliahan.'
            ? `File silabus PDF ${matchedSlot.pdfFileName} telah diunggah.`
            : c.syllabusSummary
        };
      }
      return c;
    }));

    // Reset Slots
    setBulkSlots([
      { courseId: courses[0]?.id || 'hmpi', file: null },
      { courseId: courses[1]?.id || 'fmpi', file: null },
      { courseId: courses[2]?.id || 'pmpi', file: null },
    ]);
    alert(`Berhasil menyimpan ${validSlots.length} silabus sekaligus! Data tersimpan di Cloud Supabase & dapat diakses semua mahasiswa.`);
  };

  const handleAddBulkSlot = () => {
    setBulkSlots(prev => [...prev, { courseId: courses[0]?.id || 'hmpi', file: null }]);
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

  // AI Chat Simulation
  const [chatQuery, setChatQuery] = useState('');
  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'ai'; text: string }[]>([]);

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

  const selectedCourse = courses.find(c => c.id === selectedCourseId);
  const selectedCoursePdfs = selectedCourse ? getCoursePdfs(selectedCourse) : [];

  // Filter Tasks Safely
  const allTasks = courses.flatMap(c => 
    (c.tasks || []).map(t => ({ ...t, courseName: c.name, courseCode: c.code, courseTheme: c.colorTheme }))
  );

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

  const handleSimulateAIParse = () => {
    if (!syllabusText.trim()) return;
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setExtractedDraft({
        syllabusSummary: `[Hasil Ekstraksi AI] Silabus menekankan pada pemahaman teori dasar, penulisan artikel ilmiah, dan presentasi kelompok mingguan.`,
        tasks: [
          {
            id: 'ai-task-1',
            title: 'Presentasi Makalah Kelompok Topik 3',
            description: 'Menyusun slide ppt dan makalah analisis dari silabus bab 3.',
            deadline: '2026-09-30T23:59',
            type: 'Kelompok',
            status: 'Belum'
          }
        ]
      });
    }, 1200);
  };

  const handleSaveExtractedDraft = () => {
    setCourses(prev => prev.map(c => {
      if (c.id === targetCourseForUpload) {
        const currentPdfs = getCoursePdfs(c);
        let updatedPdfs = [...currentPdfs];
        if (uploadedPdfUrl) {
          updatedPdfs.push({
            id: `pdf-${Date.now()}`,
            name: uploadedPdfName || `Silabus_${c.code}_${updatedPdfs.length + 1}.pdf`,
            url: uploadedPdfUrl
          });
        }
        return {
          ...c,
          syllabusSummary: extractedDraft?.syllabusSummary || syllabusText || c.syllabusSummary || 'Silabus PDF telah diunggah.',
          syllabusPdfUrl: updatedPdfs[0]?.url,
          pdfFileName: updatedPdfs[0]?.name,
          syllabusPdfs: updatedPdfs,
          tasks: extractedDraft?.tasks ? [...(c.tasks || []), ...extractedDraft.tasks] : (c.tasks || [])
        };
      }
      return c;
    }));
    setExtractedDraft(null);
    setSyllabusText('');
    setUploadedPdfUrl(null);
    setUploadedPdfName('');
    alert('Data silabus & dokumen PDF berhasil disimpan ke mata kuliah!');
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

  const handleToggleTaskStatus = (courseId: string, taskId: string) => {
    setCourses(prev => prev.map(c => {
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
    }));
  };

  const handleAIChat = () => {
    if (!chatQuery.trim() || !selectedCourse) return;
    const userText = chatQuery;
    setChatMessages(prev => [...prev, { sender: 'user', text: userText }]);
    setChatQuery('');

    setTimeout(() => {
      let aiResponse = `Berdasarkan silabus ${selectedCourse.code}: ${selectedCourse.syllabusSummary}`;
      if (userText.toLowerCase().includes('dosen')) {
        aiResponse = `Dosen pengampu mata kuliah ${selectedCourse.name} adalah ${selectedCourse.lecturer}.`;
      } else if (userText.toLowerCase().includes('tugas') || userText.toLowerCase().includes('kelompok')) {
        aiResponse = `Mata kuliah ini memiliki ${(selectedCourse.tasks || []).length} tugas terdaftar dan ${(selectedCourse.groups || []).length} kelompok terbagi.`;
      }
      setChatMessages(prev => [...prev, { sender: 'ai', text: aiResponse }]);
    }, 800);
  };

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

        {/* TOP TAB NAV (MAIN SCREEN) */}
        <div className="max-w-md md:max-w-3xl mx-auto px-3 flex border-t border-slate-200/60 dark:border-gray-800">
          <button
            onClick={() => {
              setActiveTab('jadwal');
              setSelectedCourseId(null);
            }}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-bold border-b-2 text-center transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'jadwal' && !selectedCourseId
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 dark:text-gray-400 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Jadwal Matkul
          </button>
          <button
            onClick={() => {
              setActiveTab('tugas');
              setSelectedCourseId(null);
            }}
            className={`flex-1 py-2.5 text-xs sm:text-sm font-bold border-b-2 text-center transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'tugas' && !selectedCourseId
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                : 'border-transparent text-slate-500 dark:text-gray-400 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Semua Tugas
            {allTasks.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-full font-bold">
                {allTasks.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* MAIN CONTAINER (WITH EXTRA PB-28 TO PREVENT NETLIFY BADGE / SAFARI BAR OVERLAP) */}
      <main className="max-w-md md:max-w-3xl mx-auto px-3 py-4 pb-28 sm:pb-12 space-y-4">

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
                <div className="mt-3 text-xs font-medium opacity-90 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 shrink-0" />
                  <span>PJ: {selectedCourse.pjName} ({selectedCourse.pjContact})</span>
                </div>
              )}
            </div>

            {/* TAB DETAILED COURSE */}
            <div className="flex rounded-xl bg-slate-200/80 dark:bg-gray-800 p-1 text-xs font-bold">
              <button
                onClick={() => setDetailTab('info')}
                className={`flex-1 py-2 rounded-lg transition-all ${detailTab === 'info' ? 'bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-slate-600 dark:text-gray-400'}`}
              >
                Silabus
              </button>
              <button
                onClick={() => setDetailTab('tugas')}
                className={`flex-1 py-2 rounded-lg transition-all ${detailTab === 'tugas' ? 'bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-slate-600 dark:text-gray-400'}`}
              >
                Tugas ({(selectedCourse.tasks || []).length})
              </button>
              <button
                onClick={() => setDetailTab('kelompok')}
                className={`flex-1 py-2 rounded-lg transition-all ${detailTab === 'kelompok' ? 'bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-xs' : 'text-slate-600 dark:text-gray-400'}`}
              >
                Kelompok ({(selectedCourse.groups || []).length})
              </button>
              <button
                onClick={() => setDetailTab('ai')}
                className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1 ${detailTab === 'ai' ? 'bg-purple-600 text-white shadow-xs' : 'text-purple-600 dark:text-purple-400'}`}
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
                  <button
                    onClick={() => setShowDirectAIModal(true)}
                    className="px-2.5 py-1 rounded-xl bg-purple-100 hover:bg-purple-200 dark:bg-purple-950 dark:hover:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center gap-1 transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> + Ekstrak AI
                  </button>
                </div>
                
                <p className="text-xs sm:text-sm text-slate-700 dark:text-gray-300 leading-relaxed">
                  {selectedCourse.syllabusSummary}
                </p>

                {/* PDF PREVIEW & DOWNLOAD SECTION (MULTI-FILE SUPPORT) */}
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
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {selectedCoursePdfs.map((pdf, idx) => (
                          <button
                            key={pdf.id}
                            onClick={() => setActivePdfIndex(idx)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap border ${
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
                        <div className="space-y-2">
                          <div className="p-3 rounded-xl bg-slate-100 dark:bg-gray-800 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 truncate pr-2">
                              <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span className="font-bold truncate">{activePdf.name}</span>
                            </div>
                            <a
                              href={activePdf.url}
                              download={activePdf.name}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 shadow-xs"
                            >
                              <Download className="w-3.5 h-3.5" /> Unduh
                            </a>
                          </div>

                          {/* Embedded PDF viewer */}
                          <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-gray-700 bg-slate-100 dark:bg-gray-800 h-80">
                            <iframe 
                              src={activePdf.url} 
                              title={activePdf.name} 
                              className="w-full h-full border-none"
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-gray-700 bg-slate-50 dark:bg-gray-800/50 text-center space-y-1">
                    <p className="text-xs font-bold text-slate-600 dark:text-gray-400">Belum ada file PDF silabus resmi (Dapat mengunggah banyak file PDF tanpa batasan).</p>
                    <p className="text-[11px] text-slate-500 dark:text-gray-500">Kosma dapat mengunggah silabus PDF melalui tombol Ekstrak AI atau Panel Admin Kosma.</p>
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
                          <button
                            onClick={() => handleToggleTaskStatus(selectedCourse.id, task.id)}
                            className={`px-2.5 py-1 rounded-xl text-xs font-extrabold transition-all border ${
                              task.status === 'Selesai'
                                ? 'bg-emerald-100 dark:bg-emerald-950 border-emerald-300 text-emerald-700 dark:text-emerald-300'
                                : task.status === 'Proses'
                                ? 'bg-amber-100 dark:bg-amber-950 border-amber-300 text-amber-700 dark:text-amber-300'
                                : 'bg-slate-100 dark:bg-gray-800 border-slate-300 dark:border-gray-700 text-slate-700 dark:text-gray-300'
                            }`}
                          >
                            {task.status}
                          </button>
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

            {detailTab === 'kelompok' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm">Daftar Pembagian Kelompok</h3>
                  {isLoggedInAdmin ? (
                    <button
                      onClick={() => setShowAddGroupModal(true)}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 hover:bg-emerald-700 transition-colors shadow-xs"
                    >
                      <Plus className="w-4 h-4" /> Tambah Kelompok
                    </button>
                  ) : (
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-gray-400 bg-slate-100 dark:bg-gray-800 px-2.5 py-1 rounded-lg flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-500" /> Khusus Admin Kosma
                    </span>
                  )}
                </div>

                {!(selectedCourse.groups && selectedCourse.groups.length > 0) ? (
                  <div className={`p-8 text-center rounded-2xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'}`}>
                    <Users className="w-8 h-8 text-purple-500 mx-auto mb-2 opacity-50" />
                    <p className="text-xs font-semibold text-slate-500 dark:text-gray-400">Pembagian kelompok belum diisi oleh Kosma.</p>
                  </div>
                ) : (
                  selectedCourse.groups.map((group, idx) => (
                    <div 
                      key={idx} 
                      className={`p-4 rounded-2xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'} space-y-2`}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-sm text-emerald-600 dark:text-emerald-400">{group.name}</h4>
                        <div className="flex items-center gap-2">
                          {group.topic && (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400">
                              {group.topic}
                            </span>
                          )}
                          {isLoggedInAdmin && (
                            <button
                              onClick={() => handleDeleteGroup(selectedCourse.id, idx)}
                              className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                              title="Hapus Kelompok"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(group.members || []).map((member, mIdx) => (
                          <span 
                            key={mIdx}
                            className="px-2.5 py-1 text-xs rounded-lg font-medium bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300"
                          >
                            👤 {member}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {detailTab === 'ai' && (
              <div className={`p-4 rounded-2xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'} space-y-3`}>
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-gray-800 pb-3">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <h3 className="font-bold text-sm">Asisten AI Silabus ({selectedCourse.code})</h3>
                </div>

                <div className="h-60 overflow-y-auto space-y-2.5 p-2 rounded-xl bg-slate-50 dark:bg-gray-950/60">
                  {chatMessages.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-10">
                      Tanyakan apa saja seputar tugas, dosen pengampu, atau jadwal perkuliahan {selectedCourse.code}!
                    </p>
                  ) : (
                    chatMessages.map((msg, index) => (
                      <div 
                        key={index} 
                        className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                          msg.sender === 'user' 
                            ? 'bg-emerald-600 text-white rounded-br-none' 
                            : darkMode ? 'bg-gray-800 text-gray-200 rounded-bl-none' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ketik pertanyaan (contoh: Siapa dosen matkul ini?)..."
                    value={chatQuery}
                    onChange={(e) => setChatQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAIChat()}
                    className={`flex-1 px-3 py-2 text-xs rounded-xl border outline-none ${
                      darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                  <button
                    onClick={handleAIChat}
                    className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-xs"
                  >
                    <Send className="w-4 h-4" />
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

            {/* 3. SEMUA TUGAS OVERVIEW */}
            {activeTab === 'tugas' && (
              <div className="space-y-4">
                <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" /> Ringkasan Seluruh Tugas Semester 2
                </h3>

                {allTasks.length === 0 ? (
                  <div className={`p-8 sm:p-10 text-center rounded-2xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'}`}>
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-50" />
                    <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-gray-400">Tidak ada tugas terdaftar di semua mata kuliah.</p>
                  </div>
                ) : (
                  allTasks.map(task => (
                    <div 
                      key={task.id}
                      className={`p-3.5 sm:p-4 rounded-2xl border transition-all ${
                        darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                            {task.courseCode} - {task.courseName}
                          </span>
                          <h4 className="font-bold text-sm mt-1.5">{task.title}</h4>
                          <p className="text-xs text-slate-600 dark:text-gray-400 mt-1 leading-relaxed">{task.description}</p>
                          
                          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 dark:text-gray-400 mt-2">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              Deadline: {new Date(task.deadline).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                            </span>
                            <span className="font-bold text-purple-600 dark:text-purple-400">[{task.type}]</span>
                          </div>
                        </div>

                        <span className={`px-2 py-0.5 text-[10px] sm:text-[11px] font-extrabold rounded-lg shrink-0 ${
                          task.status === 'Selesai' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {task.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 4. KOSMA / ADMIN PANEL (PIN PROTECTED) */}
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
                        Masukkan PIN Keamanan Kosma (5 Digit) untuk mengunggah silabus PDF & mengelola data.
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
                          <p className="text-[11px] text-slate-500 dark:text-gray-400">Hak Akses: Penuh (Upload Multi PDF & Task Sync)</p>
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

                    {/* SECTION: BULK UPLOAD MULTI SLOTS SILABUS */}
                    <div className={`p-4 sm:p-5 rounded-2xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'} space-y-4`}>
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-800 pb-3">
                        <div>
                          <h3 className="font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                            <Upload className="w-4 h-4 shrink-0" /> Upload Sekaligus (Multi Slot PDF Silabus)
                          </h3>
                          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                            Pilih beberapa file PDF sekaligus untuk ditambah langsung ke mata kuliah yang sesuai.
                          </p>
                        </div>
                        <button
                          onClick={handleAddBulkSlot}
                          className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold rounded-xl text-xs flex items-center gap-1 hover:bg-emerald-200 transition-all shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" /> + Slot PDF
                        </button>
                      </div>

                      <div className="space-y-3">
                        {bulkSlots.map((slot, index) => (
                          <div 
                            key={index}
                            className={`p-3 rounded-xl border flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 ${
                              darkMode ? 'bg-gray-800/60 border-gray-700' : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <span className="px-2 py-0.5 bg-emerald-600 text-white rounded-lg text-[11px] font-bold self-start sm:self-center">
                              Slot #{index + 1}
                            </span>

                            {/* Select Course */}
                            <select
                              value={slot.courseId}
                              onChange={(e) => handleBulkSlotCourse(index, e.target.value)}
                              className={`p-2 text-xs font-bold rounded-lg border outline-none ${
                                darkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-slate-300'
                              }`}
                            >
                              {courses.map(c => (
                                <option key={c.id} value={c.id}>
                                  {c.code} - {c.name}
                                </option>
                              ))}
                            </select>

                            {/* File Input */}
                            <input
                              type="file"
                              accept="application/pdf"
                              onChange={(e) => handleBulkSlotFile(index, e.target.files?.[0] || null)}
                              className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-emerald-100 file:text-emerald-700 dark:file:bg-emerald-950 dark:file:text-emerald-300 hover:file:bg-emerald-200 flex-1"
                            />
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={handleSaveBulkSlots}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2"
                      >
                        <Check className="w-4 h-4" /> Simpan {bulkSlots.length} Slot Silabus Sekaligus
                      </button>
                    </div>

                    {/* SECTION 1: SINGLE UPLOAD & EXTRACTION VIA MANUAL/AI */}
                    <div className={`p-4 sm:p-5 rounded-2xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'} space-y-4`}>
                      <h3 className="font-bold text-xs sm:text-sm flex items-center gap-2 text-purple-600 dark:text-purple-400">
                        <Sparkles className="w-4 h-4 shrink-0" /> Upload Single PDF (Tanpa Batasan File) & Ekstraksi AI
                      </h3>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold">1. Pilih Mata Kuliah Target:</label>
                          <select
                            value={targetCourseForUpload}
                            onChange={(e) => setTargetCourseForUpload(e.target.value)}
                            className={`w-full p-2.5 text-xs font-semibold rounded-xl border outline-none ${
                              darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            {courses.map(c => (
                              <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold">2. Unggah Dokumen PDF Silabus Baru (File #1 / File #2):</label>
                          <input
                            type="file"
                            accept="application/pdf"
                            onChange={handleFileUpload}
                            className="w-full text-xs p-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold">3. Tempel Teks Silabus / Catatan Tambahan:</label>
                          <textarea
                            rows={4}
                            placeholder="Tempelkan isi silabus teks di sini untuk dibaca oleh AI..."
                            value={syllabusText}
                            onChange={(e) => setSyllabusText(e.target.value)}
                            className={`w-full p-3 text-xs rounded-xl border outline-none ${
                              darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-slate-50 border-slate-200'
                            }`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <button
                          onClick={handleSaveExtractedDraft}
                          disabled={!uploadedPdfUrl && !syllabusText.trim()}
                          className="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <CheckCircle2 className="w-4 h-4" /> Simpan PDF Ke Matkul
                        </button>
                        <button
                          onClick={handleSimulateAIParse}
                          disabled={isAnalyzing || !syllabusText.trim()}
                          className="py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <Sparkles className="w-4 h-4" /> {isAnalyzing ? 'Membaca...' : 'Ekstrak AI'}
                        </button>
                      </div>

                      {/* PREVIEW & EDIT DRAFT FORM */}
                      {extractedDraft && (
                        <div className="mt-4 p-4 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-800 space-y-3 animate-fadeIn">
                          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                            <ShieldAlert className="w-4 h-4" />
                            Hasil Ekstraksi AI (Review Admin Sebelum Disimpan)
                          </div>

                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-700 dark:text-gray-300">Ringkasan Silabus:</label>
                            <textarea
                              rows={2}
                              value={extractedDraft.syllabusSummary || ''}
                              onChange={(e) => setExtractedDraft({ ...extractedDraft, syllabusSummary: e.target.value })}
                              className={`w-full p-2 text-xs rounded-lg border outline-none ${
                                darkMode ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-amber-200'
                              }`}
                            />
                          </div>

                          <button
                            onClick={handleSaveExtractedDraft}
                            className="w-full py-2 bg-emerald-600 text-white font-bold text-xs rounded-lg hover:bg-emerald-700 shadow-xs"
                          >
                            Simpan ke Data Resmi Matkul
                          </button>
                        </div>
                      )}
                    </div>

                    {/* SECTION 2: EDIT INFO PJ MATKUL */}
                    <div className={`p-4 sm:p-5 rounded-2xl border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-slate-200'} space-y-3`}>
                      <h3 className="font-bold text-xs sm:text-sm flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                        <UserPlus className="w-4 h-4 shrink-0" /> Atur Kontak Penanggung Jawab (PJ Matkul)
                      </h3>

                      <div className="space-y-2">
                        <label className="text-xs font-bold">Pilih Mata Kuliah:</label>
                        <select
                          value={targetCourseForUpload}
                          onChange={(e) => setTargetCourseForUpload(e.target.value)}
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
                        onClick={() => handleUpdatePJInfo(targetCourseForUpload)}
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
