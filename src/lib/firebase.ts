import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  deleteDoc, 
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  writeBatch
} from 'firebase/firestore';
import { 
  User, 
  SchoolSettings, 
  Student, 
  Teacher, 
  AttendanceRecord, 
  TeacherAttendanceRecord, 
  ProblematicStudentDispatch, 
  ActivityLog 
} from '../types';

const firebaseConfig = {
  projectId: "favorable-scene-kh7sp",
  appId: "1:726748641497:web:e4cec286da0e0d4442e6c8",
  apiKey: "AIzaSyDa4CqLPMJ72L6b-mJN9nnCZhuje9hASnI",
  authDomain: "favorable-scene-kh7sp.firebaseapp.com",
  storageBucket: "favorable-scene-kh7sp.firebasestorage.app",
  messagingSenderId: "726748641497",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, "ai-studio-nexa15-d614a126-7747-4d88-8d2e-90654248b14b");
export const googleProvider = new GoogleAuthProvider();

export { 
  onAuthStateChanged,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy
};

// App users persistence

/**
 * Fetch all registered application users from Firestore collection 'app_users'
 */
export const fetchUsersFromFirestore = async (): Promise<User[]> => {
  try {
    const usersCol = collection(db, 'app_users');
    const snapshot = await getDocs(usersCol);
    const users: User[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      users.push({
        uid: docSnap.id,
        username: data.username || docSnap.id,
        email: data.email || '',
        name: data.name || data.username || 'User',
        role: data.role || 'Guru',
        subRole: data.subRole || (data.role === 'Guru' ? 'Guru Piket' : undefined),
        assignedClass: data.assignedClass || '',
        nip: data.nip || '',
        phone: data.phone || '',
        password: data.password || '',
        status: data.status || 'aktif',
        avatar: data.avatar || '',
        createdAt: data.createdAt || '',
        updatedAt: data.updatedAt || '',
        lastLoginAt: data.lastLoginAt || '',
        notes: data.notes || '',
      });
    });
    return users;
  } catch (error) {
    console.warn('Firestore fetchUsers error (falling back to local/cached data):', error);
    return [];
  }
};

/**
 * Save / Upsert user to Firestore database
 */
export const saveUserToFirestore = async (user: User): Promise<boolean> => {
  try {
    const userDocRef = doc(db, 'app_users', user.uid);
    await setDoc(userDocRef, {
      uid: user.uid,
      username: user.username,
      email: user.email || '',
      name: user.name,
      role: user.role,
      subRole: user.subRole || '',
      assignedClass: user.assignedClass || '',
      nip: user.nip || '',
      phone: user.phone || '',
      password: user.password || '',
      status: user.status || 'aktif',
      avatar: user.avatar || '',
      createdAt: user.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLoginAt: user.lastLoginAt || '',
      notes: user.notes || '',
    }, { merge: true });
    return true;
  } catch (error) {
    console.warn('Firestore saveUser error:', error);
    return false;
  }
};

/**
 * Delete user from Firestore database
 */
export const deleteUserFromFirestore = async (userId: string): Promise<boolean> => {
  try {
    const userDocRef = doc(db, 'app_users', userId);
    await deleteDoc(userDocRef);
    return true;
  } catch (error) {
    console.warn('Firestore deleteUser error:', error);
    return false;
  }
};

// School settings and homeroom mapping

/**
 * Fetch school settings and homeroom assignments from Firestore
 */
export const fetchSettingsFromFirestore = async (): Promise<Partial<SchoolSettings> | null> => {
  try {
    const settingsDocRef = doc(db, 'settings', 'school_config');
    const docSnap = await getDoc(settingsDocRef);
    if (docSnap.exists()) {
      return docSnap.data() as Partial<SchoolSettings>;
    }
    return null;
  } catch (error) {
    console.warn('Firestore fetchSettings error:', error);
    return null;
  }
};

/**
 * Save / Upsert school settings and homeroom assignments to Firestore
 */
export const saveSettingsToFirestore = async (settings: Partial<SchoolSettings>): Promise<boolean> => {
  try {
    const settingsDocRef = doc(db, 'settings', 'school_config');
    const dataToSave: any = {
      ...settings,
      updatedAt: new Date().toISOString(),
    };
    await setDoc(settingsDocRef, dataToSave, { merge: true });
    return true;
  } catch (error) {
    console.warn('Firestore saveSettings error:', error);
    return false;
  }
};

// Problematic student dispatches

/**
 * Fetch all problematic student dispatches from Firestore
 */
export const fetchDispatchesFromFirestore = async (): Promise<ProblematicStudentDispatch[]> => {
  try {
    const dispatchesCol = collection(db, 'dispatches');
    const snapshot = await getDocs(dispatchesCol);
    const dispatches: ProblematicStudentDispatch[] = [];
    snapshot.forEach((docSnap) => {
      dispatches.push(docSnap.data() as ProblematicStudentDispatch);
    });
    return dispatches;
  } catch (error) {
    console.warn('Firestore fetchDispatches error:', error);
    return [];
  }
};

/**
 * Save / Upsert problematic student dispatch to Firestore
 */
export const saveDispatchToFirestore = async (dispatch: ProblematicStudentDispatch): Promise<boolean> => {
  try {
    const dispatchDocRef = doc(db, 'dispatches', dispatch.id);
    await setDoc(dispatchDocRef, dispatch, { merge: true });
    return true;
  } catch (error) {
    console.warn('Firestore saveDispatch error:', error);
    return false;
  }
};

/**
 * Delete dispatch from Firestore
 */
export const deleteDispatchFromFirestore = async (dispatchId: string): Promise<boolean> => {
  try {
    const dispatchDocRef = doc(db, 'dispatches', dispatchId);
    await deleteDoc(dispatchDocRef);
    return true;
  } catch (error) {
    console.warn('Firestore deleteDispatch error:', error);
    return false;
  }
};

// Students master data

/**
 * Fetch all students from Firestore
 */
export const fetchStudentsFromFirestore = async (): Promise<Student[]> => {
  try {
    const col = collection(db, 'students');
    const snapshot = await getDocs(col);
    const students: Student[] = [];
    snapshot.forEach((docSnap) => {
      students.push(docSnap.data() as Student);
    });
    return students;
  } catch (error) {
    console.warn('Firestore fetchStudents error:', error);
    return [];
  }
};

/**
 * Save single student to Firestore
 */
export const saveStudentToFirestore = async (student: Student): Promise<boolean> => {
  try {
    const studentDocRef = doc(db, 'students', student.id || student.nisn);
    await setDoc(studentDocRef, student, { merge: true });
    return true;
  } catch (error) {
    console.warn('Firestore saveStudent error:', error);
    return false;
  }
};

/**
 * Batch save multiple students to Firestore
 */
export const saveMultipleStudentsToFirestore = async (students: Student[]): Promise<boolean> => {
  try {
    const batch = writeBatch(db);
    students.slice(0, 450).forEach((student) => {
      const docRef = doc(db, 'students', student.id || student.nisn);
      batch.set(docRef, student, { merge: true });
    });
    await batch.commit();
    return true;
  } catch (error) {
    console.warn('Firestore batch save students error:', error);
    return false;
  }
};

/**
 * Delete student from Firestore
 */
export const deleteStudentFromFirestore = async (studentId: string): Promise<boolean> => {
  try {
    const studentDocRef = doc(db, 'students', studentId);
    await deleteDoc(studentDocRef);
    return true;
  } catch (error) {
    console.warn('Firestore deleteStudent error:', error);
    return false;
  }
};

// Teachers master data

/**
 * Fetch all teachers from Firestore
 */
export const fetchTeachersFromFirestore = async (): Promise<Teacher[]> => {
  try {
    const col = collection(db, 'teachers');
    const snapshot = await getDocs(col);
    const teachers: Teacher[] = [];
    snapshot.forEach((docSnap) => {
      teachers.push(docSnap.data() as Teacher);
    });
    return teachers;
  } catch (error) {
    console.warn('Firestore fetchTeachers error:', error);
    return [];
  }
};

/**
 * Save single teacher to Firestore
 */
export const saveTeacherToFirestore = async (teacher: Teacher): Promise<boolean> => {
  try {
    const teacherDocRef = doc(db, 'teachers', teacher.id || teacher.nip);
    await setDoc(teacherDocRef, teacher, { merge: true });
    return true;
  } catch (error) {
    console.warn('Firestore saveTeacher error:', error);
    return false;
  }
};

/**
 * Batch save teachers to Firestore
 */
export const saveMultipleTeachersToFirestore = async (teachers: Teacher[]): Promise<boolean> => {
  try {
    const batch = writeBatch(db);
    teachers.slice(0, 450).forEach((teacher) => {
      const docRef = doc(db, 'teachers', teacher.id || teacher.nip);
      batch.set(docRef, teacher, { merge: true });
    });
    await batch.commit();
    return true;
  } catch (error) {
    console.warn('Firestore batch save teachers error:', error);
    return false;
  }
};

/**
 * Delete teacher from Firestore
 */
export const deleteTeacherFromFirestore = async (teacherId: string): Promise<boolean> => {
  try {
    const teacherDocRef = doc(db, 'teachers', teacherId);
    await deleteDoc(teacherDocRef);
    return true;
  } catch (error) {
    console.warn('Firestore deleteTeacher error:', error);
    return false;
  }
};

// Student attendance records

/**
 * Fetch attendance records from Firestore
 */
export const fetchAttendanceFromFirestore = async (startDate?: string, endDate?: string): Promise<AttendanceRecord[]> => {
  try {
    const col = collection(db, 'attendance');
    let q;
    if (startDate && endDate) {
      // Query by date range (string format YYYY-MM-DD). Avoid orderBy to prevent composite index requirement.
      q = query(col, where('tanggal', '>=', startDate), where('tanggal', '<=', endDate));
    } else {
      q = query(col, orderBy('timestamp', 'desc'), limit(1500));
    }
    const snapshot = await getDocs(q);
    const records: AttendanceRecord[] = [];
    snapshot.forEach((docSnap) => {
      records.push(docSnap.data() as AttendanceRecord);
    });
    
    // Sort descending locally if we didn't use orderBy
    if (startDate && endDate) {
      records.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
    }
    return records;
  } catch (error) {
    console.warn('Firestore fetchAttendance error:', error);
    return [];
  }
};

/**
 * Save single student attendance record to Firestore
 */
export const saveAttendanceToFirestore = async (record: AttendanceRecord): Promise<boolean> => {
  try {
    const docRef = doc(db, 'attendance', record.id);
    await setDoc(docRef, record, { merge: true });
    return true;
  } catch (error) {
    console.warn('Firestore saveAttendance error:', error);
    return false;
  }
};

/**
 * Batch save multiple student attendance records to Firestore
 */
export const saveMultipleAttendanceToFirestore = async (records: AttendanceRecord[]): Promise<boolean> => {
  try {
    const batch = writeBatch(db);
    records.slice(0, 450).forEach((r) => {
      const docRef = doc(db, 'attendance', r.id);
      batch.set(docRef, r, { merge: true });
    });
    await batch.commit();
    return true;
  } catch (error) {
    console.warn('Firestore batch save attendance error:', error);
    return false;
  }
};

/**
 * Delete attendance record from Firestore
 */
export const deleteAttendanceFromFirestore = async (recordId: string): Promise<boolean> => {
  try {
    const docRef = doc(db, 'attendance', recordId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.warn('Firestore deleteAttendance error:', error);
    return false;
  }
};

// Teacher attendance records

/**
 * Fetch teacher attendance records from Firestore
 */
export const fetchTeacherAttendanceFromFirestore = async (startDate?: string, endDate?: string): Promise<TeacherAttendanceRecord[]> => {
  try {
    const col = collection(db, 'teacher_attendance');
    let q;
    if (startDate && endDate) {
      q = query(col, where('tanggal', '>=', startDate), where('tanggal', '<=', endDate));
    } else {
      q = query(col, orderBy('timestamp', 'desc'), limit(1000));
    }
    const snapshot = await getDocs(q);
    const records: TeacherAttendanceRecord[] = [];
    snapshot.forEach((docSnap) => {
      records.push(docSnap.data() as TeacherAttendanceRecord);
    });
    
    if (startDate && endDate) {
      records.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
    }
    return records;
  } catch (error) {
    console.warn('Firestore fetchTeacherAttendance error:', error);
    return [];
  }
};

/**
 * Save single teacher attendance record to Firestore
 */
export const saveTeacherAttendanceToFirestore = async (record: TeacherAttendanceRecord): Promise<boolean> => {
  try {
    const docRef = doc(db, 'teacher_attendance', record.id);
    await setDoc(docRef, record, { merge: true });
    return true;
  } catch (error) {
    console.warn('Firestore saveTeacherAttendance error:', error);
    return false;
  }
};

/**
 * Batch save teacher attendance records to Firestore
 */
export const saveMultipleTeacherAttendanceToFirestore = async (records: TeacherAttendanceRecord[]): Promise<boolean> => {
  try {
    const batch = writeBatch(db);
    records.slice(0, 450).forEach((r) => {
      const docRef = doc(db, 'teacher_attendance', r.id);
      batch.set(docRef, r, { merge: true });
    });
    await batch.commit();
    return true;
  } catch (error) {
    console.warn('Firestore batch save teacher attendance error:', error);
    return false;
  }
};

/**
 * Delete teacher attendance record from Firestore
 */
export const deleteTeacherAttendanceFromFirestore = async (recordId: string): Promise<boolean> => {
  try {
    const docRef = doc(db, 'teacher_attendance', recordId);
    await deleteDoc(docRef);
    return true;
  } catch (error) {
    console.warn('Firestore deleteTeacherAttendance error:', error);
    return false;
  }
};

/**
 * Helper to check if a date string or timestamp falls on a Saturday (Day 6)
 */
export const isDateSaturday = (dateStr?: string, timestamp?: string): boolean => {
  if (dateStr) {
    const s = String(dateStr).trim();
    if (s.includes('T')) {
      const d = new Date(s);
      if (!isNaN(d.getTime())) return d.getDay() === 6;
    }
    const parts = s.split(/[-/]/);
    if (parts.length === 3) {
      let d: Date | null = null;
      if (parts[0].length === 4) {
        d = new Date(`${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].slice(0, 2).padStart(2, '0')}T00:00:00`);
      } else if (parts[2].length === 4) {
        d = new Date(`${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T00:00:00`);
      }
      if (d && !isNaN(d.getTime())) {
        return d.getDay() === 6;
      }
    }
  }
  if (timestamp) {
    const d = new Date(timestamp);
    if (!isNaN(d.getTime())) {
      return d.getDay() === 6;
    }
  }
  return false;
};

/**
 * Revisi & Hapus Seluruh Presensi Hari Sabtu yang Berstatus ALPA dari Firestore
 */
export const purgeSaturdayAlpaFromFirestore = async (): Promise<{
  deletedStudents: number;
  deletedTeachers: number;
}> => {
  let deletedStudents = 0;
  let deletedTeachers = 0;

  try {
    // 1. Purge Student Attendance with status Alpa on Saturday
    const colStudents = collection(db, 'attendance');
    const qStudents = query(colStudents, where('status', '==', 'Alpa'));
    const snapStudents = await getDocs(qStudents);
    const studentDocIds: string[] = [];

    snapStudents.forEach((docSnap) => {
      const data = docSnap.data() as AttendanceRecord;
      if (isDateSaturday(data.tanggal, data.timestamp)) {
        studentDocIds.push(docSnap.id);
      }
    });

    if (studentDocIds.length > 0) {
      for (let i = 0; i < studentDocIds.length; i += 400) {
        const chunk = studentDocIds.slice(i, i + 400);
        const batch = writeBatch(db);
        chunk.forEach((id) => batch.delete(doc(db, 'attendance', id)));
        await batch.commit();
      }
      deletedStudents = studentDocIds.length;
    }

    // 2. Purge Teacher Attendance with status Alpa on Saturday
    const colTeachers = collection(db, 'teacher_attendance');
    const qTeachers = query(colTeachers, where('status', '==', 'Alpa'));
    const snapTeachers = await getDocs(qTeachers);
    const teacherDocIds: string[] = [];

    snapTeachers.forEach((docSnap) => {
      const data = docSnap.data() as TeacherAttendanceRecord;
      if (isDateSaturday(data.tanggal, data.timestamp)) {
        teacherDocIds.push(docSnap.id);
      }
    });

    if (teacherDocIds.length > 0) {
      for (let i = 0; i < teacherDocIds.length; i += 400) {
        const chunk = teacherDocIds.slice(i, i + 400);
        const batch = writeBatch(db);
        chunk.forEach((id) => batch.delete(doc(db, 'teacher_attendance', id)));
        await batch.commit();
      }
      deletedTeachers = teacherDocIds.length;
    }
  } catch (error) {
    console.warn('purgeSaturdayAlpaFromFirestore warning:', error);
  }

  return { deletedStudents, deletedTeachers };
};

// Activity logs audit trail

/**
 * Fetch activity logs from Firestore
 */
export const fetchLogsFromFirestore = async (): Promise<ActivityLog[]> => {
  try {
    const col = collection(db, 'logs');
    const q = query(col, orderBy('timestamp', 'desc'), limit(500));
    const snapshot = await getDocs(q);
    const logs: ActivityLog[] = [];
    snapshot.forEach((docSnap) => {
      logs.push(docSnap.data() as ActivityLog);
    });
    return logs;
  } catch (error) {
    console.warn('Firestore fetchLogs error:', error);
    return [];
  }
};

/**
 * Save single log entry to Firestore
 */
export const saveLogToFirestore = async (log: ActivityLog): Promise<boolean> => {
  try {
    const docRef = doc(db, 'logs', log.id);
    await setDoc(docRef, log, { merge: true });
    return true;
  } catch (error) {
    console.warn('Firestore saveLog error:', error);
    return false;
  }
};

// Google authentication helpers

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

export const signOutUser = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
    throw error;
  }
};

export const sendPasswordResetLink = async (email: string): Promise<{ success: boolean; message: string }> => {
  try {
    await sendPasswordResetEmail(auth, email);
    return {
      success: true,
      message: `Tautan reset kata sandi telah dikirim ke ${email}. Silakan periksa kotak masuk atau folder spam Anda.`,
    };
  } catch (error: any) {
    console.warn("sendPasswordResetEmail error:", error);
    let message = 'Gagal mengirim email reset kata sandi.';
    if (error.code === 'auth/user-not-found') {
      message = 'Email tidak terdaftar dalam sistem autentikasi Google/Firebase.';
    } else if (error.code === 'auth/invalid-email') {
      message = 'Format alamat email tidak valid.';
    } else if (error.code === 'auth/operation-not-allowed') {
      message = 'Metode reset email belum diaktifkan di konsol Firebase.';
    } else if (error.message) {
      message = error.message;
    }
    return { success: false, message };
  }
};
