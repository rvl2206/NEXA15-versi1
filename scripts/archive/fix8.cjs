const fs = require('fs');
let content = fs.readFileSync('src/components/SettingsDatabaseConfig.tsx', 'utf8');

// Add settings to props
content = content.replace(/export const SettingsDatabaseConfig: React\.FC = \(\) => \{/, "import { SchoolSettings } from '../types';\n\ninterface Props {\n  settings: SchoolSettings;\n  setSettings: (s: SchoolSettings) => void;\n}\n\nexport const SettingsDatabaseConfig: React.FC<Props> = ({ settings, setSettings }) => {");

// Add missing icons
content = content.replace(/Database, Server, HardDrive, Terminal, ArrowRight, Download, CreditCard, Code2, Copy, Trash2, ShieldCheck, RefreshCw, Layers, Check/, 'Database, Server, HardDrive, Terminal, ArrowRight, Download, CreditCard, Code2, Copy, Trash2, ShieldCheck, RefreshCw, Layers, Check, BookOpen, UploadCloud, Zap, CheckCircle2, AlertTriangle, Activity');

fs.writeFileSync('src/components/SettingsDatabaseConfig.tsx', content);
console.log("Fixed SettingsDatabaseConfig");
