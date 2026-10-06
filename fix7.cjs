const fs = require('fs');
let content = fs.readFileSync('src/components/QRScanner.tsx', 'utf8');
content = content.replace(/interface ScanOutcome \{/, 'export interface ScanOutcome {');
fs.writeFileSync('src/components/QRScanner.tsx', content);

let modal = fs.readFileSync('src/components/QRScannerModal.tsx', 'utf8');
modal = modal.replace(/import \{ ScanOutcome, Student, Teacher \} from '\.\.\/types';/, "import { Student, Teacher } from '../types';\nimport { ScanOutcome } from './QRScanner';");
fs.writeFileSync('src/components/QRScannerModal.tsx', modal);

let feed = fs.readFileSync('src/components/QRScannerFeed.tsx', 'utf8');
feed = feed.replace(/import \{ ScanOutcome \} from '\.\.\/types';/, "import { ScanOutcome } from './QRScanner';");
fs.writeFileSync('src/components/QRScannerFeed.tsx', feed);
console.log("Fixed ScanOutcome exports");
