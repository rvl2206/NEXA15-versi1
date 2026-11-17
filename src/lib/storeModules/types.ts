import { 
  Student, 
  ActivityLog, 
  SchoolSettings, 
  AttendanceRecord 
} from '../../types';

export interface StoreContext {
  students: Student[];
  logs: ActivityLog[];
  syncQueue: any[];
  settings: SchoolSettings;
  isInitialized?: boolean;
  isHydrated?: boolean;
  
  notify: () => void;
  enqueueSync: (job: any) => void;
  addLog: (action: string, detail: string) => void;
  triggerAutoBackup?: () => void;
  
  // Methods that modules might call
  findStudentByScannedCode?: (scannedText: string) => Student | undefined;
  getStudentById?: (id: string) => Student | undefined;
  getStudentByNisn?: (nisn: string) => Student | undefined;
  getStudentByRfidUid?: (uid: string) => Student | undefined;
}
