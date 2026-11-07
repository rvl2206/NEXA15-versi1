const fs = require('fs');
let content = fs.readFileSync('src/components/SettingsPage.tsx', 'utf8');

const startStr = "{/* Clear Entire Database (Server + Local) Card */}";
const startIndex = content.indexOf(startStr);
if (startIndex !== -1) {
    // Find the end of this div (the next </div>)
    let searchIdx = content.indexOf('</div>', startIndex);
    searchIdx = content.indexOf('</div>', searchIdx + 1); // <div> (text)
    searchIdx = content.indexOf('</div>', searchIdx + 1); // <div>
    
    // Let's just find the start of the next section and remove everything in between
    const endStr = '<div className="p-4 bg-red-50/50';
    const endIndex = content.indexOf(endStr, startIndex);
    
    if (endIndex !== -1) {
        content = content.substring(0, startIndex) + content.substring(endIndex);
    }
}

const startStr2 = "Kosongkan Khusus Database Siswa";
const startIndex2 = content.indexOf(startStr2);
if (startIndex2 !== -1) {
    // We should probably just delete all of these since they're in Security and Maintenance... wait!
    // I already moved ALL of "Pembersihan Cache & Reset Data" to SettingsSecurityAndMaintenance.tsx!
    // Let me check if there's a whole section called "Pembersihan Cache" in SettingsPage.tsx.
}

fs.writeFileSync('src/components/SettingsPage.tsx', content);
console.log("Removed clear DB block.");
