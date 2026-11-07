const fs = require('fs');
const lines = fs.readFileSync('src/components/SettingsPage.tsx', 'utf8').split('\n');
lines[787] = '                  <span className="font-bold text-slate-700 dark:text-slate-300">❌ Tidak (Hari Sekolah)</span>\r';
lines[792] = '              <span className="text-blue-600 font-bold">ℹ️ Info:</span>\r';
fs.writeFileSync('src/components/SettingsPage.tsx', lines.join('\n'), 'utf8');
