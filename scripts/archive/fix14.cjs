const fs = require('fs');
let content = fs.readFileSync('src/components/StudentManagement.tsx', 'utf8');

content = content.replace(/<StudentRfidBindModal[\s\S]*?rfidBindStudent=\{rfidBindStudent\}/, "<StudentRfidBindModal\n        isOpen={!!rfidBindStudent}\n        rfidBindStudent={rfidBindStudent}");

fs.writeFileSync('src/components/StudentManagement.tsx', content);
console.log("Fixed isOpen prop.");
