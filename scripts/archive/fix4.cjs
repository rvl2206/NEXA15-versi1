const fs = require('fs');
let content = fs.readFileSync('src/components/SettingsSecurityAndMaintenance.tsx', 'utf8');
content = content.replace(/import \{ store, SchoolSettings \} from '\.\.\/lib\/store';/, "import { store } from '../lib/store';\nimport { SchoolSettings } from '../types';");
fs.writeFileSync('src/components/SettingsSecurityAndMaintenance.tsx', content);
console.log("Fixed import in SettingsSecurityAndMaintenance");
