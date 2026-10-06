const fs = require('fs');
const content = fs.readFileSync('src/components/SettingsPage.tsx', 'utf8');

const functionsToExtract = ['handleTestSupabase', 'handleSyncSupabase', 'handleClearQueueOnly', 'handleCopyPostgresSchema', 'handleCopyDockerCompose', 'handleDownloadSqlDump', 'handleDownloadDockerCompose', 'handleCopySupabaseSchema', 'handleCopyTeacherSchema'];

let output = '';
for (const func of functionsToExtract) {
    const searchStr = 'const ' + func + ' = ';
    let startIdx = content.indexOf(searchStr);
    if (startIdx === -1) continue;

    let braceCount = 0;
    let endIdx = -1;
    let started = false;

    for (let i = startIdx; i < content.length; i++) {
        if (content[i] === '{') {
            braceCount++;
            started = true;
        } else if (content[i] === '}') {
            braceCount--;
        }
        
        if (started && braceCount === 0) {
            // Find the semicolon or newline after }
            endIdx = content.indexOf(';', i);
            if (endIdx === -1 || endIdx > i + 10) endIdx = i + 1; // Fallback to just after }
            else endIdx = endIdx + 1;
            break;
        }
    }

    if (endIdx !== -1) {
        output += content.substring(startIdx, endIdx) + '\n\n';
    }
}

fs.writeFileSync('extracted_functions.ts', output);
console.log('Extracted functions');
