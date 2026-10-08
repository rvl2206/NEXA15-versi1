const fs = require('fs');
let code = fs.readFileSync('src/lib/store.ts', 'utf8');

// 1. Add import localforage
if (!code.includes("import localforage")) {
    code = code.replace(
        "import { DEFAULT_SETTINGS } from './defaultSettings';",
        "import { DEFAULT_SETTINGS } from './defaultSettings';\nimport localforage from 'localforage';\n\nlocalforage.config({\n  name: 'NEXA_APP',\n  storeName: 'nexa_data'\n});"
    );
}

// 2. Patch init()
const keysToMigrate = [
    'USERS', 'STUDENTS', 'ATTENDANCE', 'TEACHERS', 'TEACHER_ATTENDANCE', 'LOGS', 'SYNC_QUEUE', 'DISPATCHES'
];

for (const key of keysToMigrate) {
    const searchRegex = new RegExp(`const\\s+([a-zA-Z0-9_]+)\\s*=\\s*localStorage\\.getItem\\(STORAGE_KEYS\\.${key}\\);`, 'g');
    
    code = code.replace(searchRegex, (match, varName) => {
        return `let ${varName} = await localforage.getItem<string>(STORAGE_KEYS.${key});
      if (!${varName}) {
        ${varName} = localStorage.getItem(STORAGE_KEYS.${key});
        if (${varName}) {
          await localforage.setItem(STORAGE_KEYS.${key}, ${varName});
        }
      }`;
    });
}

// 3. Patch saveLocalData()
code = code.replace('const doSave = () => {', 'const doSave = async () => {');

for (const key of keysToMigrate) {
    const searchRegex = new RegExp(`localStorage\\.setItem\\(STORAGE_KEYS\\.${key},`, 'g');
    code = code.replace(searchRegex, `await localforage.setItem(STORAGE_KEYS.${key},`);
}

// 4. Handle clearSyncQueue which calls localStorage.removeItem
code = code.replace(/localStorage\.removeItem\(STORAGE_KEYS\.SYNC_QUEUE\)/g, 'await localforage.removeItem(STORAGE_KEYS.SYNC_QUEUE)');

fs.writeFileSync('src/lib/store.ts', code);
console.log('Patched store.ts successfully.');
