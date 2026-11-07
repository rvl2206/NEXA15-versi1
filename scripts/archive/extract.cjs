const fs = require('fs');
const content = fs.readFileSync('src/lib/store.ts', 'utf-8');

const startStr = "  public async addStudent(studentData:";
const endStr = "  public getTeachers(): Teacher[] {";

const startIdx = content.indexOf(startStr);
const endIdx = content.indexOf(endStr);

let methods = content.substring(startIdx, endIdx);

methods = methods.replace(/  public /g, '  ');
methods = methods.replace(/  async ([a-zA-Z0-9_]+)\(/g, '  async $1(store: StoreContext, ');
methods = methods.replace(/^  ([a-zA-Z0-9_]+)\(/gm, '  $1(store: StoreContext, ');
methods = methods.replace(/\(store: StoreContext, \)/g, '(store: StoreContext)');
methods = methods.replace(/this\./g, 'store.');

methods = methods.replace(/^  \}/gm, '  },');
methods = methods.replace(/},\s*$/g, '}');

const studentOpsContent = `import { StoreContext } from './types';
import { Student } from '../types';
import { isMatchingNisn, isMatchingRfidUid, isGenericQrCode } from '../attendanceRules';

export const studentOps = {
${methods}
};
`;

fs.writeFileSync('src/lib/storeModules/studentOps.ts', studentOpsContent, 'utf-8');

let newStoreContent = content.substring(0, startIdx);

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

  /**
   * Pengenalan Akurat & Bebas Tabrakan Identitas Siswa dari Hasil Pindai QR / Barcode / Kartu RFID.
   */
  public findStudentByScannedCode(scannedText: string): Student | undefined {
    return studentOps.findStudentByScannedCode(this, scannedText);
  }

`;

newStoreContent += content.substring(endIdx);

if (!newStoreContent.includes("import * as studentOps")) {
    newStoreContent = "import * as studentOps from './storeModules/studentOps';\n" + newStoreContent;
}

fs.writeFileSync('src/lib/store.ts', newStoreContent, 'utf-8');
console.log('Extraction complete');
