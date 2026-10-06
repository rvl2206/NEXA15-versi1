const fs = require('fs');
let content = fs.readFileSync('src/lib/store.ts', 'utf-8');

content = content.replace(/this\.triggerSubscribers\(\);/g, 'this.notify();');
content = content.replace(/this\.saveToLocalStore\(\);/g, 'this.saveLocalData();');

fs.writeFileSync('src/lib/store.ts', content, 'utf-8');
console.log('Fixed triggerSubscribers and saveToLocalStore in store.ts');
