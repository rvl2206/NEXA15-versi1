const fs = require('fs');
let content = fs.readFileSync('src/components/StudentManagement.tsx', 'utf8');
content = content.replace(/'\.\/OfficialStudentICCard'/, "'./OfficialStudentIDCard'");
fs.writeFileSync('src/components/StudentManagement.tsx', content);
console.log("Fixed OfficialStudentIDCard import");
