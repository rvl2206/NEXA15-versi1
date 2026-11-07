const fs = require('fs');
const path = require('path');

const dir = 'src/components';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Background replacements
  content = content.replace(/bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/g, 'bg-white/5 backdrop-blur-xl border border-white/10');
  content = content.replace(/bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/g, 'bg-white/5 backdrop-blur-xl border border-white/10');
  content = content.replace(/bg-slate-50 dark:bg-slate-800\/50/g, 'bg-white/5 backdrop-blur-xl border border-white/10');
  content = content.replace(/bg-white dark:bg-slate-800/g, 'bg-white/5 backdrop-blur-xl');
  content = content.replace(/bg-white dark:bg-slate-900/g, 'bg-white/5 backdrop-blur-xl');
  content = content.replace(/bg-slate-50\/50 dark:bg-slate-800\/40/g, 'bg-white/5 backdrop-blur-md');
  content = content.replace(/bg-slate-50\/80 dark:bg-slate-900\/80/g, 'bg-white/5 backdrop-blur-xl');
  
  // Text & Border replacements
  content = content.replace(/border-slate-200 dark:border-slate-700/g, 'border-white/10');
  content = content.replace(/border-slate-100 dark:border-slate-800/g, 'border-white/10');
  content = content.replace(/divide-slate-100 dark:divide-slate-800/g, 'divide-white/10');
  
  // Hovers
  content = content.replace(/hover:bg-slate-50 dark:hover:bg-slate-800\/50/g, 'hover:bg-white/10');
  content = content.replace(/hover:bg-slate-50\/80 dark:hover:bg-slate-800\/50/g, 'hover:bg-white/10');
  content = content.replace(/hover:bg-slate-50/g, 'hover:bg-white/5');
  content = content.replace(/hover:bg-slate-100/g, 'hover:bg-white/10');

  // Fix duplicates that might be generated
  content = content.replace(/bg-white\/5 backdrop-blur-xl border border-white\/10\/5 backdrop-blur-xl/g, 'bg-white/5 backdrop-blur-xl border border-white/10');
  content = content.replace(/border border-white\/10 border border-white\/10/g, 'border border-white/10');
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log('Modernized', file);
  }
});
