const fs = require('fs');
let content = fs.readFileSync('src/components/StudentManagement.tsx', 'utf8');

content = content.replace(/handleAssignRfid=\{handleSaveRfidBind\}/g, 'handleSaveRfidBind={handleSaveRfidBind}');
content = content.replace(/handleUnassignRfid=\{handleUnbindRfid\}/g, 'handleUnbindRfid={handleUnbindRfid}');

fs.writeFileSync('src/components/StudentManagement.tsx', content);
console.log("Fixed prop names");
