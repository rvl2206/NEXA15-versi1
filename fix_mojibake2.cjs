const fs = require('fs');
let c = fs.readFileSync('src/components/SettingsSecurityAndMaintenance.tsx', 'utf8');
c = c.replace(/<span className=\"text-rose-600 dark:text-rose-400 shrink-0 font-bold\">.*?<\/span>/, '<span className=\"text-rose-600 dark:text-rose-400 shrink-0 font-bold\">❌</span>');
fs.writeFileSync('src/components/SettingsSecurityAndMaintenance.tsx', c, 'utf8');
