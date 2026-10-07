const fs = require('fs');

function modernize(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 1. Structural Backgrounds
  content = content.replace(/bg-white\b/g, 'bg-white/5 backdrop-blur-xl border border-white/10');
  content = content.replace(/bg-slate-50\/80/g, 'bg-white/5 border border-white/10');
  content = content.replace(/bg-slate-50/g, 'bg-white/5 border border-white/10');
  content = content.replace(/bg-slate-100/g, 'bg-white/10 border border-white/10');
  
  // 2. Borders and Dividers
  content = content.replace(/border-slate-200/g, 'border-white/10');
  content = content.replace(/border-slate-100/g, 'border-white/5');
  content = content.replace(/border-slate-300/g, 'border-white/20');
  content = content.replace(/divide-slate-100/g, 'divide-white/5');
  content = content.replace(/divide-slate-200/g, 'divide-white/10');

  // 3. Text Colors
  content = content.replace(/text-slate-900/g, 'text-white');
  content = content.replace(/text-slate-800/g, 'text-white');
  content = content.replace(/text-slate-700/g, 'text-slate-200');
  content = content.replace(/text-slate-600/g, 'text-slate-300');
  content = content.replace(/text-slate-500/g, 'text-slate-400');
  content = content.replace(/text-slate-400/g, 'text-slate-400');

  // 4. Hover states
  content = content.replace(/hover:bg-slate-50/g, 'hover:bg-white/5');
  content = content.replace(/hover:bg-slate-100/g, 'hover:bg-white/10');

  fs.writeFileSync(filePath, content);
  console.log(`Modernized ${filePath}`);
}

modernize('src/components/AttendanceRecap.tsx');
