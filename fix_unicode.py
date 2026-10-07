import sys

def fix_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    content = content.replace('â Œ', '❌')
    content = content.replace('â„¹ï¸ ', 'ℹ️')
    content = content.replace('âœ…', '✅')
    
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

fix_file('src/components/SettingsPage.tsx')
