const fs = require('fs');

let code = fs.readFileSync('src/lib/store.ts', 'utf-8');

const methods = [
    'addTeacher',
    'updateTeacher',
    'deleteTeacher',
    'deleteMultipleTeachers',
    'deleteAllTeachers',
    'importTeachers',
    'getTeacherById',
    'getTeacherByNip',
    'getTeacherByRfidUid',
    'assignRfidToTeacher',
    'getHomeroomTeacherForClass',
    'assignHomeroomTeacher'
];

let extracted_methods = [];

for (const m of methods) {
    const pattern = new RegExp(`^\\s*public\\s+(?:async\\s+)?${m}\\s*\\(([\\s\\S]*?)\\)(?:\\s*:\\s*([\\s\\S]*?))?\\s*\\{`, 'm');
    const match = code.match(pattern);
    if (!match) {
        console.log(`Method ${m} not found`);
        continue;
    }
    
    const start_idx = match.index;
    
    let brace_count = 0;
    let in_string = false;
    let escape = false;
    let string_char = '';
    let end_idx = -1;
    
    for (let i = start_idx; i < code.length; i++) {
        const c = code[i];
        if (escape) {
            escape = false;
            continue;
        }
        if (c === '\\') {
            escape = true;
            continue;
        }
        if (in_string) {
            if (c === string_char) {
                in_string = false;
            }
            continue;
        }
        if (c === "'" || c === '"' || c === '`') {
            in_string = true;
            string_char = c;
            continue;
        }
            
        if (c === '{') {
            brace_count++;
        } else if (c === '}') {
            brace_count--;
            if (brace_count === 0) {
                end_idx = i + 1;
                break;
            }
        }
    }
    
    let method_body = code.substring(start_idx, end_idx);
    
    // Replace this. with store.
    let method_body_modified = method_body.replace(/\bthis\./g, 'store.');
    
    // Fix signature to take store
    const sig_match = method_body_modified.match(new RegExp(`^\\s*public\\s+(async\\s+)?${m}\\s*\\(([\\s\\S]*?)\\)(?:\\s*:\\s*([\\s\\S]*?))?\\s*\\{`));
    const is_async = sig_match[1] || "";
    const args = sig_match[2];
    const ret_type = sig_match[3] || "";
    
    let new_args = args.trim() ? `store: StoreContext, ${args}` : `store: StoreContext`;
        
    const ret_str = ret_type ? `: ${ret_type}` : "";
    const new_sig = `  ${is_async}${m}(${new_args})${ret_str} {`;
    
    method_body_modified = method_body_modified.substring(0, sig_match.index) + new_sig + method_body_modified.substring(sig_match.index + sig_match[0].length);
    
    extracted_methods.push(method_body_modified);
    
    // Replace in store.ts
    const args_split = args.split(',').filter(a => a.trim()).map(a => a.split(':')[0].trim().split('=')[0].trim().split('?')[0].trim());
    const args_passed = args_split.join(', ');
    
    const call_str = args_passed ? `teacherOps.${m}(this, ${args_passed})` : `teacherOps.${m}(this)`;
        
    let ret_kwd = (ret_type && ret_type !== "void") ? "return " : "";
    if (ret_type && ret_type.includes("Promise<")) {
         ret_kwd = "return ";
    }
         
    const new_store_method = `${sig_match[0]}\n    ${ret_kwd}${call_str};\n  }`;
    code = code.substring(0, start_idx) + new_store_method + code.substring(end_idx);
}

let new_ops_content = "import { StoreContext } from './types';\n";
new_ops_content += "import { Teacher } from '../../types';\n";
new_ops_content += "import { isMatchingNip, isMatchingRfidUid, isGenericQrCode } from '../constants';\n\n";
new_ops_content += "export const teacherOps = {\n";
new_ops_content += extracted_methods.join(",\n\n");
new_ops_content += "\n};\n";

fs.writeFileSync('src/lib/storeModules/teacherOps.ts', new_ops_content, 'utf-8');

// Add import to store.ts
const import_str = "import { teacherOps } from './storeModules/teacherOps';\n";
if (!code.includes("import { teacherOps }")) {
    code = import_str + code;
}

fs.writeFileSync('src/lib/store.ts', code, 'utf-8');

console.log("Done");
