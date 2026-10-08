import { 
  Student, 
  Teacher, 
  ActivityLog, 
  SchoolSettings,
  AttendanceRecord,
  TeacherAttendanceRecord
} from '../../types';

export interface StoreContext {
  students: Student[];
  teachers: Teacher[];
  logs: ActivityLog[];
  syncQueue: any[];
  settings: SchoolSettings;
  isInitialized?: boolean;
  isHydrated?: boolean;
  
  notify: () => void;
  enqueueSync: (job: any) => void;
  addLog: (action: string, detail: string) => void;
  triggerAutoBackup?: () => void;
  
  // Methods that modules might call on each other
  getTeacherById?: (id: string) => Teacher | undefined;
  getTeacherByRfidUid?: (uid: string) => Teacher | undefined;
  findStudentByScannedCode?: (scannedText: string) => Student | undefined;
  findTeacherByScannedCode?: (scannedText: string) => Teacher | undefined;
  getStudentById?: (id: string) => Student | undefined;
  getStudentByNisn?: (nisn: string) => Student | undefined;
  getStudentByRfidUid?: (uid: string) => Student | undefined;
}
