const fs = require('fs');
let content = fs.readFileSync('src/components/StudentManagement.tsx', 'utf8');

// Fix setFormData calls
content = content.replace(/    setFormData\(\{[\s\S]*?\}\);\n/g, '');

// Fix handleAssignRfid -> handleSaveRfidBind
content = content.replace(/handleAssignRfid=\{handleAssignRfid\}/, 'handleSaveRfidBind={handleAssignRfid}');
content = content.replace(/handleUnassignRfid=\{handleUnassignRfid\}/, 'handleUnbindRfid={handleUnassignRfid}');

fs.writeFileSync('src/components/StudentManagement.tsx', content);
console.log("Fixed StudentManagement issues");
