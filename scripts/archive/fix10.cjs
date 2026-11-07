const fs = require('fs');
let content = fs.readFileSync('src/components/StudentManagement.tsx', 'utf8');

// The prop is being passed inside <StudentRfidBindModal ... />
content = content.replace(/handleAssignRfid=\{handleAssignRfid\}/g, 'handleSaveRfidBind={handleAssignRfid}');
content = content.replace(/handleUnassignRfid=\{handleUnassignRfid\}/g, 'handleUnbindRfid={handleUnassignRfid}');

fs.writeFileSync('src/components/StudentManagement.tsx', content);

// Delete backups
if (fs.existsSync('src/components/StudentManagement.orig.tsx')) {
  fs.unlinkSync('src/components/StudentManagement.orig.tsx');
}
if (fs.existsSync('src/components/StudentManagement.restored.tsx')) {
  fs.unlinkSync('src/components/StudentManagement.restored.tsx');
}

console.log("Fixed StudentManagement and deleted backups");
