const fs = require('fs');
let content = fs.readFileSync('src/components/SettingsPage.tsx', 'utf8');
content = content.replace(/<SettingsDatabaseConfig \/>/g, '<SettingsDatabaseConfig settings={settings} setSettings={setSettings} />');
fs.writeFileSync('src/components/SettingsPage.tsx', content);
console.log("Updated SettingsPage.tsx for SettingsDatabaseConfig props");
