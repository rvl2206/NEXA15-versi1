const fs = require('fs');

const content = fs.readFileSync('src/lib/store.ts', 'utf-8');

const startStr = "  public async addStudent(studentData:";
const endStr = "  public getTeachers(): Teacher[] {";

const startIdx = content.indexOf(startStr);
const endIdx = content.indexOf(endStr);

let methods = content.substring(startIdx, endIdx);

// Basic transformations
// Remove 'public '
methods = methods.replace(/  public /g, '  ');

// Transform methods to have store: StoreContext as first parameter
// Match 'async methodName('
methods = methods.replace(/  async ([a-zA-Z0-9_]+)\(/g, '  async $1(store: StoreContext, ');
// Match 'methodName(' which are not async
methods = methods.replace(/^  ([a-zA-Z0-9_]+)\(/gm, '  $1(store: StoreContext, ');

// Fix the case where method has no args except store
methods = methods.replace(/\(store: StoreContext, \)/g, '(store: StoreContext)');

// Transform 'this.' to 'store.'
methods = methods.replace(/this\./g, 'store.');

// Add commas between methods. A method ends with '}' and the next one might have JSDoc or just '  async' or '  name'
// Let's just add a comma after EVERY line that ends with '}' EXCEPT the very last one, or just add a comma to all '}' that are at column 2 (i.e. '  }')
methods = methods.replace(/^  \}/gm, '  },');

// Remove the very last comma if it exists before the end of the string
methods = methods.replace(/},\s*$/g, '}');

const studentOpsContent = `import { StoreContext } from './types';
import { Student } from '../types';
import { isMatchingNisn, isMatchingRfidUid, isGenericQrCode } from '../attendanceRules';

export const studentOps = {
${methods}
};
`;

fs.writeFileSync('src/lib/storeModules/studentOps.ts', studentOpsContent, 'utf-8');
console.log('Fixed studentOps.ts');
