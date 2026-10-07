const fs = require('fs');
const path = require('path');
const dir = './src/components';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));
const mappings = {
  'ðŸŸ¢': '🟢',
  'ðŸ“„': '📄',
  'ðŸ ¥': '🏥',
  'ðŸ”´': '🔴',
  'ðŸ“…': '📅',
  'â °': '⏰',
  'âœ…': '✅',
  'â Œ': '❌',
  'â„¹ï¸ ': 'ℹ️',
  'â ³': '⏳',
  'â€¢': '•',
  'â€”': '—',
  'ðŸ“Œ': '📌'
};
files.forEach(f => {
  const p = path.join(dir, f);
  let content = fs.readFileSync(p, 'utf8');
  let changed = false;
  for (const [k, v] of Object.entries(mappings)) {
    if (content.includes(k)) {
      content = content.replaceAll(k, v);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(p, content, 'utf8');
    console.log('Fixed', f);
  }
});
