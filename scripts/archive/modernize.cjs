const fs = require('fs');
let content = fs.readFileSync('src/components/SettingsPage.tsx', 'utf8');

// Container Styles -> Glassmorphism Bento Grid
content = content.replace(/bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm/g, 'bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-3xl shadow-2xl shadow-black/40 relative overflow-hidden');

content = content.replace(/bg-gradient-to-br from-slate-50 to-blue-50\/40 dark:from-slate-800\/60 dark:to-blue-950\/20 p-5 rounded-2xl border border-slate-200 dark:border-slate-700\/80/g, 'bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-md p-6 rounded-3xl border border-white/10 relative overflow-hidden');

content = content.replace(/bg-slate-50 dark:bg-slate-800\/50 border border-slate-200 dark:border-slate-700 p-4 rounded-xl/g, 'bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-md');

content = content.replace(/bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600/g, 'bg-white/10 border-white/20');
content = content.replace(/bg-slate-50 dark:bg-slate-800/g, 'bg-white/5');

content = content.replace(/rounded-2xl/g, 'rounded-3xl');
content = content.replace(/rounded-xl/g, 'rounded-2xl');

// Inputs
content = content.replace(/bg-slate-50 dark:bg-slate-800\/50 border-slate-200 dark:border-slate-700/g, 'bg-black/20 border-white/10 text-white placeholder-white/40 backdrop-blur-md');
content = content.replace(/bg-white dark:bg-slate-900/g, 'bg-black/20 backdrop-blur-md');

// Buttons
content = content.replace(/bg-blue-600 hover:bg-blue-700/g, 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 border border-white/10 shadow-lg shadow-blue-500/20');
content = content.replace(/bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/g, 'bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-md');

fs.writeFileSync('src/components/SettingsPage.tsx', content, 'utf8');
console.log('Styles replaced');
