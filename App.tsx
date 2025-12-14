
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, FileInput, Mic, UserCircle, LogOut, MessageSquare, Search } from 'lucide-react';
import StudentTable from './components/StudentTable';
import Dashboard from './components/Dashboard';
import MediaUpload from './components/MediaUpload';
import LiveAttendance from './components/LiveAttendance';
// AuthPage removed as per request
import BottomNav from './components/BottomNav';
import ProfileModal from './components/ProfileModal';
import ClassSelector from './components/ClassSelector';
import SearchPage from './components/SearchPage';
import StudentHistory from './components/StudentHistory';
import { Student, AttendanceRecord, AttendanceStatus, SessionType, ViewMode, AIAnalysisResult, ClassInfo, UploadedFile } from './types';

// Mock Initial Data (Used only if localStorage is empty)
const INITIAL_CLASSES: ClassInfo[] = [
    { id: 'c1', name: 'Class 10-A', totalStudents: 15 },
    { id: 'c2', name: 'Class 11-B', totalStudents: 0 },
];

const INITIAL_STUDENTS: Student[] = Array.from({ length: 15 }, (_, i) => ({
  id: `s-${i + 1}`,
  classId: 'c1',
  name: [`Aarav Patel`, `Vivaan Singh`, `Aditya Sharma`, `Vihaan Gupta`, `Arjun Kumar`, `Sai Iyer`, `Reyansh Reddy`, `Krishna Das`, `Ishaan Joshi`, `Shaurya Verma`, `Rohan Mehta`, `Atharv Malhotra`, `Kabir Saxena`, `Rudra Bhat`, `Ayan Nair`][i],
  rollNo: (i + 1).toString()
}));

// Components defined locally to avoid creating new files
const DesktopSidebar: React.FC<{
  currentView: ViewMode;
  onNavigate: (view: ViewMode) => void;
  onOpenProfile: () => void;
}> = ({ currentView, onNavigate, onOpenProfile }) => {
  const navItems = [
    { mode: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { mode: 'media-upload', icon: FileInput, label: 'Smart Upload' },
    { mode: 'roster', icon: Users, label: 'Attendance' },
    { mode: 'search', icon: Search, label: 'Search' },
    { mode: 'live-agent', icon: Mic, label: 'AI Agent' },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 h-screen sticky top-0 z-30 transition-all duration-300">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-indigo-200 shadow-lg">
          <span className="text-white font-bold text-lg">I</span>
        </div>
        <span className="text-xl font-black text-slate-800 tracking-tight">I Rig</span>
      </div>

      <nav className="flex-1 px-4 space-y-2 mt-4">
        {navItems.map((item) => {
           const Icon = item.icon;
           const isActive = currentView === item.mode;
           return (
             <button
               key={item.mode}
               onClick={() => onNavigate(item.mode as ViewMode)}
               className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium group ${
                 isActive 
                 ? 'bg-indigo-50 text-indigo-600 shadow-sm' 
                 : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
               }`}
             >
               <Icon size={20} className={`transition-transform group-hover:scale-110 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
               {item.label}
             </button>
           );
        })}
      </nav>

      <div className="p-4 mt-auto">
        <button 
          onClick={onOpenProfile}
          className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-100 group"
        >
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-indigo-600 shadow-sm group-hover:scale-105 transition-transform">
            <UserCircle size={24} />
          </div>
          <div className="text-left">
            <p className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">My Profile</p>
            <p className="text-xs text-slate-400">Settings</p>
          </div>
        </button>
      </div>
    </aside>
  );
};

const MobileHeader: React.FC<{ onOpenProfile: () => void }> = ({ onOpenProfile }) => {
  return (
    <header className="lg:hidden bg-white/80 backdrop-blur-md border-b border-slate-200 p-4 sticky top-0 z-40 flex justify-between items-center shadow-sm">
      <div className="flex items-center gap-2">
         <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">I</span>
         </div>
         <span className="text-xl font-black text-slate-800 tracking-tight">I Rig</span>
      </div>
      <button onClick={onOpenProfile} className="p-2 bg-slate-50 rounded-full hover:bg-slate-100 text-slate-600 transition-colors">
         <UserCircle size={24} />
      </button>
    </header>
  );
};

const App: React.FC = () => {
  // Auth State - Default to true to bypass login
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  // App State - Initialize from LocalStorage safely
  const [view, setView] = useState<ViewMode>('dashboard');
  
  const [students, setStudents] = useState<Student[]>(() => {
      try {
          const saved = localStorage.getItem('app_students');
          return saved ? JSON.parse(saved) : INITIAL_STUDENTS;
      } catch { return INITIAL_STUDENTS; }
  });

  const [records, setRecords] = useState<AttendanceRecord[]>(() => {
      try {
          const saved = localStorage.getItem('app_records');
          return saved ? JSON.parse(saved) : [];
      } catch { return []; }
  });
  
  const [teacherName, setTeacherName] = useState(() => localStorage.getItem('app_teacherName') || "Mr. Anderson");
  
  const [classes, setClasses] = useState<ClassInfo[]>(() => {
      try {
          const saved = localStorage.getItem('app_classes');
          return saved ? JSON.parse(saved) : INITIAL_CLASSES;
      } catch { return INITIAL_CLASSES; }
  });

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(() => {
      try {
          const saved = localStorage.getItem('app_files');
          return saved ? JSON.parse(saved) : [];
      } catch { return []; }
  });

  // Persistence Effects
  useEffect(() => localStorage.setItem('app_students', JSON.stringify(students)), [students]);
  useEffect(() => localStorage.setItem('app_records', JSON.stringify(records)), [records]);
  useEffect(() => localStorage.setItem('app_classes', JSON.stringify(classes)), [classes]);
  useEffect(() => localStorage.setItem('app_files', JSON.stringify(uploadedFiles)), [uploadedFiles]);
  useEffect(() => localStorage.setItem('app_teacherName', teacherName), [teacherName]);

  // Class Selection State
  const [selectedClass, setSelectedClass] = useState<{id: string, name: string} | null>(null);
  const [dashboardClassId, setDashboardClassId] = useState<string>(classes[0]?.id || '');
  
  const [currentDate, setCurrentDate] = useState<string>(new Date().toDateString());
  const [currentSession, setCurrentSession] = useState<SessionType>(
    new Date().getHours() < 12 ? SessionType.FORENOON : SessionType.AFTERNOON
  );
  
  // Student Detail State
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // UI State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isChatOverlayOpen, setIsChatOverlayOpen] = useState(false);
  const [hasChatStarted, setHasChatStarted] = useState(false);

  // Initialize demo records if empty
  useEffect(() => {
    if (records.length === 0) {
      const demoRecords: AttendanceRecord[] = students.map(s => ({
        studentId: s.id,
        date: new Date().toDateString(),
        session: SessionType.FORENOON,
        status: Math.random() > 0.1 ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT
      }));
      setRecords(demoRecords);
    }
  }, []);

  // Ensure dashboard class ID is valid
  useEffect(() => {
      if (classes.length > 0 && !classes.find(c => c.id === dashboardClassId)) {
          setDashboardClassId(classes[0].id);
      }
  }, [classes, dashboardClassId]);

  // Handlers
  const handleLogin = () => setIsAuthenticated(true);
  
  const handleLogout = () => {
    // Acts as Reset Data
    if (window.confirm("This will reset all app data. Are you sure?")) {
        localStorage.clear();
        window.location.reload();
    }
  };

  const goHome = () => {
    setView('dashboard');
    setSelectedClass(null);
    setSelectedStudent(null);
    setCurrentDate(new Date().toDateString());
  };

  const handleUpdateStatus = (studentId: string, status: AttendanceStatus, date?: string, session?: SessionType) => {
    const targetDate = date || currentDate;
    const targetSession = session || currentSession;

    setRecords(prev => {
      const existing = prev.findIndex(r => r.studentId === studentId && r.date === targetDate && r.session === targetSession);
      if (existing >= 0) {
        const newRecords = [...prev];
        newRecords[existing] = { ...newRecords[existing], status };
        return newRecords;
      }
      return [...prev, { studentId, date: targetDate, session: targetSession, status }];
    });
  };

  const handleBulkUpdateStatus = (status: AttendanceStatus, targetName?: string) => {
      // Determine the active class context
      let targetClassId = (selectedClass && selectedClass.id) || dashboardClassId || classes[0]?.id;
      let targetClassName = "";

      // AI Override
      if (targetName) {
          const match = classes.find(c => c.name.toLowerCase().includes(targetName.toLowerCase()));
          if (match) {
              targetClassId = match.id;
              targetClassName = match.name;
          }
      } else {
          targetClassName = classes.find(c => c.id === targetClassId)?.name || "Current Class";
      }
      
      if (!targetClassId) return { success: false, message: "No class selected." };

      let count = 0;
      setRecords(prev => {
          const currentClassStudents = students.filter(s => s.classId === targetClassId);
          const newRecords = [...prev];
          
          currentClassStudents.forEach(student => {
              const existingIdx = newRecords.findIndex(r => r.studentId === student.id && r.date === currentDate && r.session === currentSession);
              if (existingIdx >= 0) {
                  newRecords[existingIdx] = { ...newRecords[existingIdx], status };
              } else {
                  newRecords.push({
                      studentId: student.id,
                      date: currentDate,
                      session: currentSession,
                      status
                  });
              }
              count++;
          });
          return newRecords;
      });
      return { success: true, message: `Marked ${count} students as ${status} in ${targetClassName}` };
  };

  const handleAIAnalysisComplete = (results: AIAnalysisResult[], targetClassId: string, date: string, session: SessionType) => {
    const targetClass = classes.find(c => c.id === targetClassId);
    if (!targetClass) { alert("Error: Target class not found."); return; }

    setSelectedClass({ id: targetClass.id, name: targetClass.name });
    setCurrentDate(date);
    setCurrentSession(session);

    setRecords(prevRecords => {
        const newRecords = [...prevRecords];
        const classStudents = students.filter(s => s.classId === targetClassId);
        
        let matchCount = 0;
        results.forEach(res => {
            // Strict normalization: remove all non-alphanumeric, lowercase
            const resRoll = String(res.rollNo).replace(/[^0-9a-zA-Z]/g, '').toLowerCase();
            
            const student = classStudents.find(s => {
                const sRoll = String(s.rollNo).replace(/[^0-9a-zA-Z]/g, '').toLowerCase();
                return sRoll === resRoll;
            });

            if (student) {
                 const existingIdx = newRecords.findIndex(r => r.studentId === student.id && r.date === date && r.session === session);
                 const status = (res.status || 'PRESENT').toUpperCase() as AttendanceStatus;
                 
                 const newRecord: AttendanceRecord = {
                     studentId: student.id,
                     date: date,
                     session: session,
                     status: status
                 };
                 
                 if (existingIdx >= 0) {
                     newRecords[existingIdx] = newRecord;
                 } else {
                     newRecords.push(newRecord);
                 }
                 matchCount++;
            }
        });
        
        // Use timeout to allow UI render cycle to complete before alert
        setTimeout(() => alert(`Successfully updated ${matchCount} records in ${targetClass.name}.`), 100);
        return newRecords;
    });
    setView('roster'); 
  };

  const handleLiveUpdate = (identifier: string, status: AttendanceStatus, targetName?: string): { success: boolean; message: string } => {
      // 0. Handle multiple values in one string (e.g. "1, 2, 3" or "1 and 2")
      // Split by comma or ' and '
      const splitPattern = /[,&]|\s+and\s+/;
      if (identifier.split(splitPattern).length > 1) {
          const parts = identifier.split(splitPattern).map(s => s.trim()).filter(s => s);
          let successCount = 0;
          let messages = [];
          for (const part of parts) {
              const res = handleLiveUpdate(part, status, targetName);
              if (res.success) successCount++;
              messages.push(res.message);
          }
          return { 
              success: successCount > 0, 
              message: successCount === parts.length ? `All ${successCount} marked.` : `Marked ${successCount}/${parts.length}.` 
          };
      }

      // 1. Identify Target Class
      let targetClassId = selectedClass?.id;
      if (targetName) {
        const match = classes.find(c => c.name.toLowerCase().includes(targetName.toLowerCase()));
        if (match) targetClassId = match.id;
      }

      // Default to dashboard class or first class if no target specified and not in roster
      let searchScopeClassId = targetClassId || (view === 'dashboard' ? dashboardClassId : selectedClass?.id) || classes[0]?.id;
      
      const normalize = (s: string) => String(s).trim().toLowerCase().replace(/^0+/, '');
      const searchNorm = normalize(identifier);

      // Helper to search a list with PRIORITY
      const findBestMatch = (list: Student[]) => {
          // Priority 1: Exact Roll Match
          const exactRoll = list.find(s => normalize(s.rollNo) === searchNorm);
          if (exactRoll) return exactRoll;

          // Priority 2: Exact Name Match
          const exactName = list.find(s => s.name.toLowerCase() === searchNorm);
          if (exactName) return exactName;
          
          // Priority 3: Fuzzy Name Match (ONLY if identifier is not a pure number)
          // This prevents "1" matching "User 1"
          const isNumber = /^\d+$/.test(searchNorm);
          if (!isNumber) {
              return list.find(s => s.name.toLowerCase().includes(searchNorm));
          }
          
          return null;
      };

      let student = null;
      
      // 2. Search in scoped class first
      if (searchScopeClassId) {
          student = findBestMatch(students.filter(s => s.classId === searchScopeClassId));
      }

      // 3. Global search fallback (ALWAYS try if not found yet)
      if (!student) {
           // Gather all matches globally
           const allMatches: Student[] = [];
           // Try exact roll first globally
           const exactRolls = students.filter(s => normalize(s.rollNo) === searchNorm);
           if (exactRolls.length > 0) {
               // Prefer the one in the current view context if ambiguous (though we already checked scope)
               // Otherwise just take the first one found
               student = exactRolls[0]; 
           } else {
               // Try name matches globally
               const isNumber = /^\d+$/.test(searchNorm);
               if (!isNumber) {
                    const nameMatches = students.filter(s => s.name.toLowerCase().includes(searchNorm));
                    if (nameMatches.length > 0) student = nameMatches[0];
               }
           }
      }

      if (student) {
          handleUpdateStatus(student.id, status, currentDate, currentSession); 
          const clsName = classes.find(c => c.id === student?.classId)?.name;
          return { success: true, message: `Marked ${student.name} (${clsName}) as ${status}.` };
      } else {
          return { success: false, message: `Student '${identifier}' not found${targetName ? ` in '${targetName}'` : ''}.` };
      }
  };

  // AI-Specific Handlers for List Modification
  const handleAIAddStudent = (name: string, rollNo: string, targetClassName?: string): { success: boolean, message: string } => {
      let targetClassId = selectedClass?.id;
      if (targetClassName) {
          const match = classes.find(c => c.name.toLowerCase().includes(targetClassName.toLowerCase()));
          if (match) targetClassId = match.id;
      } else if (!targetClassId) {
          targetClassId = dashboardClassId || classes[0]?.id;
      }
      
      if (!targetClassId) return { success: false, message: "No target class found." };

      const currentClass = classes.find(c => c.id === targetClassId);
      const newRoll = rollNo || String((currentClass?.totalStudents || 0) + 1);

      const newStudent: Student = {
        id: `s-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        classId: targetClassId,
        name: name || 'New Student',
        rollNo: newRoll
      };
      
      setStudents(prev => [...prev, newStudent]);
      setClasses(prev => prev.map(c => c.id === targetClassId ? { ...c, totalStudents: c.totalStudents + 1 } : c));
      
      return { success: true, message: `Added ${name} to ${currentClass?.name}.` };
  };

  const handleDeleteStudent = (studentId: string) => {
    // Robust delete that ensures we operate on current state
    setStudents(currentStudents => {
        const studentToDelete = currentStudents.find(s => s.id === studentId);
        
        if (!studentToDelete) {
            console.warn("Student not found for deletion:", studentId);
            return currentStudents;
        }

        const classIdToUpdate = studentToDelete.classId;

        // Execute side effects in a timeout to ensure they run after state calc, 
        // or just fire them. This ensures we use the correct classId found in current state.
        setTimeout(() => {
             // 2. Update Records
            setRecords(prev => prev.filter(r => r.studentId !== studentId));

            // 3. Update Class Counts
            if (classIdToUpdate) {
                setClasses(prev => prev.map(c => c.id === classIdToUpdate ? { ...c, totalStudents: Math.max(0, c.totalStudents - 1) } : c));
            }
        }, 0);

        // 1. Remove student
        return currentStudents.filter(s => s.id !== studentId);
    });
  };

  const handleAIRemoveStudent = (identifier: string, targetClassName?: string): { success: boolean, message: string } => {
       let found = false;
       let studentName = "";

       setStudents(currentStudents => {
            let targetClassId = selectedClass?.id;
            if (targetClassName) {
                const match = classes.find(c => c.name.toLowerCase().includes(targetClassName.toLowerCase()));
                if (match) targetClassId = match.id;
            } else if (!targetClassId) {
                targetClassId = dashboardClassId || classes[0]?.id;
            }

            // Fallback: If no target class specified, search GLOBALLY
            let student = null;
            const norm = identifier.toLowerCase().trim();

            if (targetClassId) {
                 student = currentStudents.find(s => 
                    s.classId === targetClassId && 
                    (s.name.toLowerCase().includes(norm) || s.rollNo.toLowerCase() === norm)
                );
            }

            if (!student) {
                 student = currentStudents.find(s => 
                    (s.name.toLowerCase().includes(norm) || s.rollNo.toLowerCase() === norm)
                );
            }
            
            if (student) {
                found = true;
                studentName = student.name;
                setTimeout(() => handleDeleteStudent(student!.id), 0);
            }
            
            return currentStudents;
       });

       if (found) return { success: true, message: `Removed ${studentName}.` };
       return { success: false, message: `Student '${identifier}' not found.` };
  };

  const handleClassSelection = (classId: string, date: string, session: SessionType) => {
      const cls = classes.find(c => c.id === classId);
      if (cls) {
          setSelectedClass({ id: cls.id, name: cls.name });
          setCurrentDate(date);
          setCurrentSession(session);
      }
  };

  const handleSwitchClass = (classId: string) => {
      const cls = classes.find(c => c.id === classId);
      if (cls) {
          setSelectedClass({ id: cls.id, name: cls.name });
      }
  };

  const handleContextUpdate = (date: string, session: SessionType) => {
      setCurrentDate(date);
      setCurrentSession(session);
  };

  const handleNavigate = (newView: ViewMode) => {
      if (newView === 'live-agent') {
          setIsChatOverlayOpen(true);
          setHasChatStarted(true);
          return;
      }
      if (newView === 'roster') {
          if (!selectedClass) setSelectedClass(null);
      }
      setView(newView);
      setIsChatOverlayOpen(false); 
  };
  
  const handleEditSessionFromDashboard = (session: SessionType) => {
      setCurrentSession(session);
      if (!selectedClass && classes.length > 0) {
          const clsToSelect = classes.find(c => c.id === dashboardClassId) || classes[0];
          setSelectedClass({ id: clsToSelect.id, name: clsToSelect.name });
      }
      setView('roster');
  };

  const handleStudentClick = (student: Student) => {
      setSelectedStudent(student);
      setView('student-history');
  };

  const handleSaveAttendance = () => {
      alert("Attendance Saved! Redirecting to Home...");
      goHome();
  };

  const handleViewClassFromProfile = (classId: string) => {
      const cls = classes.find(c => c.id === classId);
      if (cls) {
          setSelectedClass({ id: cls.id, name: cls.name });
          setView('roster');
          setIsProfileOpen(false);
      }
  };

  const handleAddClass = (name: string) => {
      setClasses(prev => [...prev, { id: Math.random().toString(), name, totalStudents: 0 }]);
  };

  const handleRenameClass = (newName: string, classId?: string) => {
      const targetId = classId || selectedClass?.id;
      if (targetId) {
          setClasses(prev => prev.map(c => c.id === targetId ? { ...c, name: newName } : c));
          if (selectedClass && selectedClass.id === targetId) {
              setSelectedClass(prev => prev ? { ...prev, name: newName } : null);
          }
      }
  };

  const handleDeleteClass = (id: string) => {
     setClasses(prev => prev.filter(c => c.id !== id));
     setStudents(prev => prev.filter(s => s.classId !== id));
     
     if (selectedClass?.id === id) {
         setSelectedClass(null);
         setView('dashboard');
     }
  };

  const handleImportClass = async (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
          const data = e.target?.result;
          if (data) {
              const XLSX = (window as any).XLSX;
              if (XLSX) {
                  const workbook = XLSX.read(data, { type: 'array' });
                  const sheetName = workbook.SheetNames[0];
                  const sheet = workbook.Sheets[sheetName];
                  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
                  
                  let headerRowIndex = 0;
                  if (rawData.length > 0) {
                      for(let i=0; i<Math.min(20, rawData.length); i++) {
                          const row = (rawData[i] as any[]).map(c => String(c).toLowerCase());
                          if (row.some(c => c.includes('roll') || c.includes('id') || c.includes('no')) && row.some(c => c.includes('name') || c.includes('student'))) {
                              headerRowIndex = i;
                              break;
                          }
                      }
                  }

                  const jsonData = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex });
                  const newClassId = Math.random().toString();
                  const newClassName = file.name.split('.')[0] || "Imported Class";
                  const newStudents: Student[] = [];
                  
                  // Use Performance.now() for unique IDs in loop
                  const baseTimestamp = Date.now();
                  
                  jsonData.forEach((row: any, index: number) => {
                      const keys = Object.keys(row);
                      const rollKey = keys.find(k => /roll|id|no/i.test(k));
                      const nameKey = keys.find(k => /name|student/i.test(k) && !/roll|id|no/i.test(k));
                      
                      const rollNo = rollKey ? row[rollKey] : (index + 1).toString();
                      const name = nameKey ? row[nameKey] : "Unknown";
                      
                      if (name && name !== "Unknown" && String(rollNo).trim() !== '') {
                          newStudents.push({
                              id: `s-${baseTimestamp}-${index}-${Math.random().toString(36).substr(2,5)}`,
                              classId: newClassId,
                              name: String(name),
                              rollNo: String(rollNo).trim()
                          });
                      }
                  });

                  if (newStudents.length > 0) {
                      const newClass: ClassInfo = {
                          id: newClassId,
                          name: newClassName,
                          totalStudents: newStudents.length
                      };
                      setClasses(prev => [...prev, newClass]);
                      setStudents(prev => [...prev, ...newStudents]);
                      
                      const blobUrl = URL.createObjectURL(file);
                      const uploadedFile: UploadedFile = {
                          id: Math.random().toString(),
                          name: file.name,
                          type: 'document',
                          date: new Date().toDateString(),
                          size: (file.size / 1024).toFixed(1) + ' KB',
                          url: blobUrl
                      };
                      setUploadedFiles(prev => [uploadedFile, ...prev]);
                      alert(`Imported ${newStudents.length} students into '${newClassName}'`);
                  } else {
                      alert("Could not find valid student data (Name, Roll No) in the Excel file.");
                  }
              } else {
                  alert("Excel parser library not loaded. Please refresh.");
              }
          }
      };
      reader.readAsArrayBuffer(file);
  };

  const handleExportClass = (classId: string) => {
      const cls = classes.find(c => c.id === classId);
      if (!cls) return;
      
      const classStudents = students.filter(s => s.classId === classId);
      
      // Pivot data: Students as rows, Date/Session as columns
      const exportData = classStudents.map(student => {
          const row: any = {
              'Roll No': student.rollNo,
              'Name': student.name
          };
          
          // Get all records for this student
          const studentRecords = records.filter(r => r.studentId === student.id);
          
          // Flatten records into columns
          studentRecords.forEach(r => {
              const sessionLabel = r.session === SessionType.FORENOON ? 'FN' : 'AN';
              const key = `${r.date} (${sessionLabel})`;
              row[key] = r.status;
          });
          
          return row;
      });

      const XLSX = (window as any).XLSX;
      if (XLSX) {
          const ws = XLSX.utils.json_to_sheet(exportData);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, cls.name.substring(0, 30));
          XLSX.writeFile(wb, `${cls.name}_Attendance.xlsx`);
      }
  };

  const handleUpdateStudent = (studentId: string, field: 'name' | 'rollNo', value: string) => {
      setStudents(prev => prev.map(s => s.id === studentId ? { ...s, [field]: value } : s));
  };

  const handleFileUpload = (file: UploadedFile) => {
      setUploadedFiles(prev => [file, ...prev]);
  };

  const handleDeleteFile = (fileId: string) => {
      setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleUpdateFile = (updatedFile: UploadedFile) => {
      setUploadedFiles(prev => prev.map(f => f.id === updatedFile.id ? updatedFile : f));
  };

  // --- NEW STUDENT MANAGEMENT HANDLERS (Manual) ---
  const handleAddStudent = () => {
    if (!selectedClass) return;
    const newStudent: Student = {
        id: `s-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        classId: selectedClass.id,
        name: 'New Student',
        rollNo: ''
    };
    setStudents(prev => [...prev, newStudent]);
    setClasses(prev => prev.map(c => c.id === selectedClass.id ? { ...c, totalStudents: c.totalStudents + 1 } : c));
  };

  const handleImportStudentsToClass = (file: File) => {
      if (!selectedClass) return;
      const reader = new FileReader();
      reader.onload = (e) => {
          const data = e.target?.result;
          if (data) {
              const XLSX = (window as any).XLSX;
              if (XLSX) {
                  const workbook = XLSX.read(data, { type: 'array' });
                  const sheetName = workbook.SheetNames[0];
                  const sheet = workbook.Sheets[sheetName];
                  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
                  
                  let headerRowIndex = 0;
                  if (rawData.length > 0) {
                      for(let i=0; i<Math.min(20, rawData.length); i++) {
                          const row = (rawData[i] as any[]).map(c => String(c).toLowerCase());
                          if (row.some(c => c.includes('roll') || c.includes('id') || c.includes('no')) && row.some(c => c.includes('name') || c.includes('student'))) {
                              headerRowIndex = i;
                              break;
                          }
                      }
                  }

                  const jsonData = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex });
                  const newStudents: Student[] = [];
                  const baseTimestamp = Date.now();

                  jsonData.forEach((row: any, index: number) => {
                      const keys = Object.keys(row);
                      const rollKey = keys.find(k => /roll|id|no/i.test(k));
                      const nameKey = keys.find(k => /name|student/i.test(k) && !/roll|id|no/i.test(k));
                      
                      const rollNo = rollKey ? row[rollKey] : '';
                      const name = nameKey ? row[nameKey] : "Unknown";
                      
                      if (name && name !== "Unknown") {
                          newStudents.push({
                              id: `s-${baseTimestamp}-${index}-${Math.random().toString(36).substr(2,5)}`,
                              classId: selectedClass.id,
                              name: String(name),
                              rollNo: String(rollNo).trim()
                          });
                      }
                  });

                  if (newStudents.length > 0) {
                      setStudents(prev => [...prev, ...newStudents]);
                      setClasses(prev => prev.map(c => c.id === selectedClass.id ? { ...c, totalStudents: c.totalStudents + newStudents.length } : c));
                      alert(`Successfully added ${newStudents.length} students to ${selectedClass.name}.`);
                  } else {
                      alert("Could not find valid student data (Name, Roll No) in the Excel file.");
                  }
              }
          }
      };
      reader.readAsArrayBuffer(file);
  };

  // Determine active students based on view
  const activeClassId = view === 'dashboard' ? dashboardClassId : selectedClass?.id;
  const activeStudents = students.filter(s => s.classId === activeClassId);
  const dashboardStudents = students.filter(s => s.classId === dashboardClassId);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      <DesktopSidebar currentView={view} onNavigate={handleNavigate} onOpenProfile={() => setIsProfileOpen(true)} />
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        <MobileHeader onOpenProfile={() => setIsProfileOpen(true)} />
        <div className="flex-1 overflow-auto p-4 md:p-8 scroll-smooth">
            <div className="max-w-5xl mx-auto h-full flex flex-col">
                <div className="flex-1 min-h-0">
                    {view === 'dashboard' && (
                        <Dashboard 
                            students={dashboardStudents} 
                            records={records} 
                            currentDate={currentDate}
                            currentSession={currentSession}
                            onSessionChange={setCurrentSession}
                            onEditSession={handleEditSessionFromDashboard}
                            classes={classes}
                            selectedClassId={dashboardClassId}
                            onClassChange={setDashboardClassId}
                        />
                    )}
                    {view === 'roster' && (
                        !selectedClass ? (
                            <ClassSelector classes={classes} onSelect={handleClassSelection} />
                        ) : (
                            <StudentTable 
                                students={activeStudents} 
                                records={records}
                                initialDate={currentDate}
                                initialSession={currentSession}
                                classNameStr={selectedClass.name}
                                classes={classes}
                                selectedClassId={selectedClass.id}
                                onSwitchClass={handleSwitchClass}
                                onUpdateStatus={handleUpdateStatus}
                                onUpdateStudent={handleUpdateStudent}
                                onRenameClass={handleRenameClass}
                                onBack={() => setSelectedClass(null)}
                                onSave={handleSaveAttendance}
                                onContextUpdate={handleContextUpdate}
                                onAddStudent={handleAddStudent}
                                onDeleteStudent={handleDeleteStudent}
                                onImportStudents={handleImportStudentsToClass}
                            />
                        )
                    )}
                    {view === 'media-upload' && <MediaUpload students={activeStudents} classes={classes} onAnalysisComplete={handleAIAnalysisComplete} onFileUpload={handleFileUpload}/>}
                    {view === 'search' && <SearchPage classes={classes} files={uploadedFiles} students={students} onOpenClass={handleViewClassFromProfile} onStudentClick={handleStudentClick} onDeleteFile={handleDeleteFile} onUpdateFile={handleUpdateFile} onImportClass={handleImportClass} onDeleteClass={handleDeleteClass}/>}
                    {view === 'student-history' && selectedStudent && <StudentHistory student={selectedStudent} records={records} onBack={() => setView('search')} />}
                </div>
            </div>
        </div>
        {!isChatOverlayOpen && (
            <button onClick={() => { setIsChatOverlayOpen(true); setHasChatStarted(true); }} className="fixed bottom-20 lg:bottom-10 right-4 lg:right-10 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-xl shadow-indigo-500/30 z-50 flex items-center gap-2 transition-transform hover:scale-105">
                <MessageSquare size={24} /> <span className="font-bold hidden md:inline">AI Chat</span>
            </button>
        )}
        <div className={`${isChatOverlayOpen ? 'block' : 'hidden'} fixed inset-0 z-[70]`}>
             {hasChatStarted && (
                <LiveAttendance 
                    students={students} 
                    files={uploadedFiles}
                    classes={classes}
                    onLiveUpdate={handleLiveUpdate} 
                    onBulkUpdate={handleBulkUpdateStatus} 
                    onUpdateFile={handleUpdateFile}
                    onDeleteFile={handleDeleteFile}
                    onAddStudent={handleAIAddStudent}
                    onRemoveStudent={handleAIRemoveStudent}
                    onClose={() => setIsChatOverlayOpen(false)} 
                />
             )}
        </div>
        <BottomNav currentView={view} onNavigate={handleNavigate} />
        <ProfileModal 
            isOpen={isProfileOpen} 
            onClose={() => setIsProfileOpen(false)} 
            teacherName={teacherName} 
            setTeacherName={setTeacherName} 
            classes={classes} 
            onAddClass={handleAddClass} 
            onRenameClass={handleRenameClass} 
            onDeleteClass={handleDeleteClass} 
            onViewClass={handleViewClassFromProfile} 
            onImportClass={handleImportClass} 
            students={students} 
            records={records}
            onExportClass={handleExportClass}
            onLogout={handleLogout}
        />
      </main>
    </div>
  );
};
export default App;
