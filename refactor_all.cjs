const fs = require('fs');

let content = fs.readFileSync('src/lib/store.ts', 'utf-8');

// 1. Make private fields public
content = content.replace(/private students: Student\[\] = \[\];/g, 'public students: Student[] = [];');
content = content.replace(/private teachers: Teacher\[\] = \[\];/g, 'public teachers: Teacher[] = [];');
content = content.replace(/private logs: ActivityLog\[\] = \[\];/g, 'public logs: ActivityLog[] = [];');
content = content.replace(/private config: AppConfig =/g, 'public config: AppConfig =');
content = content.replace(/private syncQueue: SyncQueueItem\[\] = \[\];/g, 'public syncQueue: SyncQueueItem[] = [];');
content = content.replace(/private listeners: Set<\(\) => void> = new Set\(\);/g, 'public listeners: Set<() => void> = new Set();');
content = content.replace(/private isInitialized = false;/g, 'public isInitialized = false;');
content = content.replace(/private isHydrated = false;/g, 'public isHydrated = false;');
content = content.replace(/private settings: SchoolSettings = /g, 'public settings: SchoolSettings = ');

content = content.replace(/private notify\(\) \{/g, 'public notify() {');
content = content.replace(/private enqueueSync\(item: /g, 'public enqueueSync(item: ');
content = content.replace(/private addLog\(action: /g, 'public addLog(action: ');
content = content.replace(/private triggerAutoBackup\(\) \{/g, 'public triggerAutoBackup() {');
content = content.replace(/private createBackupData\(\)/g, 'public createBackupData()');

// 2. Extract StudentOps
const studentStartStr = "  public async addStudent(studentData:";
const studentEndStr = "  public getTeachers(): Teacher[] {";

const studentStartIdx = content.indexOf(studentStartStr);
const studentEndIdx = content.indexOf(studentEndStr);

let studentMethods = content.substring(studentStartIdx, studentEndIdx);

// Transform 'public ' to '  '
studentMethods = studentMethods.replace(/  public /g, '  ');
studentMethods = studentMethods.replace(/  async ([a-zA-Z0-9_]+)\(/g, '  $1: async function(store: StoreContext, ');
studentMethods = studentMethods.replace(/^  ([a-zA-Z0-9_]+)\(/gm, '  $1: function(store: StoreContext, ');
studentMethods = studentMethods.replace(/\(store: StoreContext, \)/g, '(store: StoreContext)');
studentMethods = studentMethods.replace(/this\./g, 'store.');
studentMethods = studentMethods.split('\n').map(line => line.replace(/\r$/, '') === '  }' ? '  },' : line).join('\n');
studentMethods = studentMethods.replace(/},\s*$/g, '}');

const studentOpsContent = `import { StoreContext } from './types';
import { Student } from '../../types';
import { isMatchingNisn, isMatchingRfidUid, isGenericQrCode } from '../constants';

export const studentOps = {
${studentMethods}
};
`;
fs.mkdirSync('src/lib/storeModules', { recursive: true });
fs.writeFileSync('src/lib/storeModules/studentOps.ts', studentOpsContent, 'utf-8');

// Replace student methods in store
let newStoreContent = content.substring(0, studentStartIdx);
newStoreContent += `  public async addStudent(studentData: Omit<Student, 'id' | 'createdAt'>): Promise<Student> {
    return studentOps.addStudent(this, studentData);
  }

  public async updateStudent(id: string, studentData: Partial<Student>): Promise<boolean> {
    return studentOps.updateStudent(this, id, studentData);
  }

  public async deleteStudent(id: string): Promise<boolean> {
    return studentOps.deleteStudent(this, id);
  }

  public async deleteMultipleStudents(ids: string[]): Promise<boolean> {
    return studentOps.deleteMultipleStudents(this, ids);
  }

  public async updateMultipleStudents(ids: string[], updates: Partial<Student>): Promise<boolean> {
    return studentOps.updateMultipleStudents(this, ids, updates);
  }

  public async deleteAllStudents(): Promise<boolean> {
    return studentOps.deleteAllStudents(this);
  }

  public async importStudents(
    importList: Omit<Student, 'id' | 'createdAt'>[],
    mode: 'append' | 'replace' = 'append'
  ): Promise<boolean> {
    return studentOps.importStudents(this, importList, mode);
  }

  public getStudentById(id: string): Student | undefined {
    return studentOps.getStudentById(this, id);
  }

  public getStudentByNisn(nisn: string): Student | undefined {
    return studentOps.getStudentByNisn(this, nisn);
  }

  public getStudentByRfidUid(rfidUid: string): Student | undefined {
    return studentOps.getStudentByRfidUid(this, rfidUid);
  }

  public assignRfidToStudent(studentId: string, rfidUid: string): boolean {
    return studentOps.assignRfidToStudent(this, studentId, rfidUid);
  }

  public findStudentByScannedCode(scannedText: string): Student | undefined {
    return studentOps.findStudentByScannedCode(this, scannedText);
  }

`;
newStoreContent += content.substring(studentEndIdx);

content = newStoreContent;

// 3. Extract TeacherOps
const teacherStartStr = "  public getTeachers(): Teacher[] {";
const teacherEndStr = "  public getTeacherAttendance(): TeacherAttendanceRecord[] {";

const teacherStartIdx = content.indexOf(teacherStartStr);
const teacherEndIdx = content.indexOf(teacherEndStr);

let teacherMethods = content.substring(teacherStartIdx, teacherEndIdx);

teacherMethods = teacherMethods.replace(/  public /g, '  ');
teacherMethods = teacherMethods.replace(/  async ([a-zA-Z0-9_]+)\(/g, '  $1: async function(store: StoreContext, ');
teacherMethods = teacherMethods.replace(/^  ([a-zA-Z0-9_]+)\(/gm, '  $1: function(store: StoreContext, ');
teacherMethods = teacherMethods.replace(/\(store: StoreContext, \)/g, '(store: StoreContext)');
teacherMethods = teacherMethods.replace(/this\./g, 'store.');
teacherMethods = teacherMethods.split('\n').map(line => line.replace(/\r$/, '') === '  }' ? '  },' : line).join('\n');
teacherMethods = teacherMethods.replace(/},\s*$/g, '}');

const teacherOpsContent = `import { StoreContext } from './types';
import { Teacher, Student } from '../../types';
import { isMatchingNip, isMatchingRfidUid, isGenericQrCode } from '../constants';

export const teacherOps = {
${teacherMethods}
};
`;

fs.writeFileSync('src/lib/storeModules/teacherOps.ts', teacherOpsContent, 'utf-8');

// Replace teacher methods in store
newStoreContent = content.substring(0, teacherStartIdx);
newStoreContent += `  public getTeachers(): Teacher[] {
    return teacherOps.getTeachers(this);
  }

  public getTeacherByNip(nip: string): Teacher | undefined {
    return teacherOps.getTeacherByNip(this, nip);
  }

  public getTeacherById(id: string): Teacher | undefined {
    return teacherOps.getTeacherById(this, id);
  }

  public getTeacherByRfidUid(rfidUid: string): Teacher | undefined {
    return teacherOps.getTeacherByRfidUid(this, rfidUid);
  }

  public assignRfidToTeacher(teacherId: string, rfidUid: string): boolean {
    return teacherOps.assignRfidToTeacher(this, teacherId, rfidUid);
  }

  public findByRfidUid(rfidUid: string): { type: 'siswa' | 'guru'; student?: Student; teacher?: Teacher } | undefined {
    return teacherOps.findByRfidUid(this, rfidUid);
  }

  public findPersonByRfidOrCode(codeOrUid: string): { type: 'siswa' | 'guru'; student?: Student; teacher?: Teacher } | undefined {
    return teacherOps.findPersonByRfidOrCode(this, codeOrUid);
  }

  public findTeacherByScannedCode(scannedText: string): Teacher | undefined {
    return teacherOps.findTeacherByScannedCode(this, scannedText);
  }

  public async addTeacher(teacherData: Omit<Teacher, 'id' | 'createdAt'>): Promise<Teacher> {
    return teacherOps.addTeacher(this, teacherData);
  }

  public async updateTeacher(id: string, teacherData: Partial<Teacher>): Promise<boolean> {
    return teacherOps.updateTeacher(this, id, teacherData);
  }

  public async deleteTeacher(id: string): Promise<boolean> {
    return teacherOps.deleteTeacher(this, id);
  }

  public async deleteMultipleTeachers(ids: string[]): Promise<boolean> {
    return teacherOps.deleteMultipleTeachers(this, ids);
  }

  public async deleteAllTeachers(): Promise<boolean> {
    return teacherOps.deleteAllTeachers(this);
  }

  public async importTeachers(
    importList: Omit<Teacher, 'id' | 'createdAt'>[],
    mode: 'append' | 'replace' = 'append'
  ): Promise<boolean> {
    return teacherOps.importTeachers(this, importList, mode);
  }

`;
newStoreContent += content.substring(teacherEndIdx);

content = newStoreContent;

if (!content.includes("import { studentOps }")) {
    content = "import { studentOps } from './storeModules/studentOps';\n" + content;
}
if (!content.includes("import { teacherOps }")) {
    content = "import { teacherOps } from './storeModules/teacherOps';\n" + content;
}

fs.writeFileSync('src/lib/store.ts', content, 'utf-8');
console.log('Successfully refactored both studentOps and teacherOps');
