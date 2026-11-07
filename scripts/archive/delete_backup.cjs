const fs = require('fs');
if (fs.existsSync('src/components/StudentManagement.orig.tsx')) {
  fs.unlinkSync('src/components/StudentManagement.orig.tsx');
  console.log('Deleted StudentManagement.orig.tsx');
} else {
  console.log('StudentManagement.orig.tsx not found.');
}
