import re

with open(r'c:\Users\Administrator\.gemini\antigravity-ide\scratch\NEXA15-versi1\src\lib\store.ts', 'r', encoding='utf-8') as f:
    code = f.read()

methods = [
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
]

extracted_methods = []

for m in methods:
    # Match public async method or public method
    pattern = r'^\s*public\s+(?:async\s+)?' + m + r'\s*\((.*?)\)(?:\s*:\s*(.*?))?\s*\{'
    match = re.search(pattern, code, re.MULTILINE)
    if not match:
        print(f"Method {m} not found")
        continue
    
    start_idx = match.start()
    
    # Find matching closing brace
    brace_count = 0
    in_string = False
    escape = False
    string_char = ''
    end_idx = -1
    
    for i in range(start_idx, len(code)):
        c = code[i]
        if escape:
            escape = False
            continue
        if c == '\\':
            escape = True
            continue
        if in_string:
            if c == string_char:
                in_string = False
            continue
        if c in ["'", '"', '`']:
            in_string = True
            string_char = c
            continue
            
        if c == '{':
            brace_count += 1
        elif c == '}':
            brace_count -= 1
            if brace_count == 0:
                end_idx = i + 1
                break
                
    method_body = code[start_idx:end_idx]
    
    # Replace this. with store.
    method_body_modified = re.sub(r'\bthis\.', 'store.', method_body)
    
    # Fix signature to take store
    sig_match = re.search(r'^\s*public\s+(async\s+)?' + m + r'\s*\((.*?)\)(?:\s*:\s*(.*?))?\s*\{', method_body_modified)
    is_async = sig_match.group(1) or ""
    args = sig_match.group(2)
    ret_type = sig_match.group(3) or ""
    
    if args.strip():
        new_args = f"store: StoreContext, {args}"
    else:
        new_args = f"store: StoreContext"
        
    ret_str = f": {ret_type}" if ret_type else ""
    new_sig = f"  {is_async}{m}({new_args}){ret_str} {{"
    
    method_body_modified = method_body_modified[:sig_match.start()] + new_sig + method_body_modified[sig_match.end():]
    
    extracted_methods.append(method_body_modified)
    
    # Replace in store.ts
    args_split = [a.split(':')[0].strip().split('=')[0].strip().split('?')[0].strip() for a in args.split(',') if a.strip()]
    args_passed = ', '.join(args_split)
    
    if args_passed:
        call_str = f"teacherOps.{m}(this, {args_passed})"
    else:
        call_str = f"teacherOps.{m}(this)"
        
    ret_kwd = "return " if ret_type and ret_type != "void" else ""
    if "Promise<" in ret_type:
         ret_kwd = "return "
         
    new_store_method = f"{sig_match.group(0)}\n    {ret_kwd}{call_str};\n  }}"
    code = code[:start_idx] + new_store_method + code[end_idx:]


new_ops_content = "import { StoreContext } from './types';\n"
new_ops_content += "import { Teacher } from '../../types';\n"
new_ops_content += "import { isMatchingNip, isMatchingRfidUid, isGenericQrCode } from '../constants';\n\n"
new_ops_content += "export const teacherOps = {\n"
new_ops_content += ",\n\n".join(extracted_methods)
new_ops_content += "\n};\n"

with open(r'c:\Users\Administrator\.gemini\antigravity-ide\scratch\NEXA15-versi1\src\lib\storeModules\teacherOps.ts', 'w', encoding='utf-8') as f:
    f.write(new_ops_content)

# Add import to store.ts
import_str = "import { teacherOps } from './storeModules/teacherOps';\n"
if "import { teacherOps }" not in code:
    code = import_str + code

with open(r'c:\Users\Administrator\.gemini\antigravity-ide\scratch\NEXA15-versi1\src\lib\store.ts', 'w', encoding='utf-8') as f:
    f.write(code)

print("Done")
