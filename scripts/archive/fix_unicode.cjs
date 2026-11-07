const fs = require('fs');

function fixFile(path) {
    let content = fs.readFileSync(path, 'utf8');
    content = content.replace(/â Œ/g, '❌');
    content = content.replace(/â„¹ï¸ /g, 'ℹ️');
    content = content.replace(/âœ…/g, '✅');
    fs.writeFileSync(path, content, 'utf8');
}

fixFile('src/components/SettingsPage.tsx');
