import sys
import re

files = ['.github/workflows/deploy.yml', '.github/workflows/test.yml']

# The exact fix steps we want to inject
FIX_NAME = "- name: Fix workspace permissions"
FIX_RUN  = "  run: docker run --rm -v \"${{ github.workspace }}:/workspace\" alpine sh -c \"chown -R $(id -u):$(id -g) /workspace\" || true"

for f in files:
    try:
        with open(f, 'r', encoding='utf-8') as file:
            lines = file.readlines()
    except FileNotFoundError:
        print(f"File {f} not found.")
        continue
    
    new_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # If we see our fix, we just skip it (so we can re-inject cleanly)
        if FIX_NAME in line:
            # Skip this line and the next 'run:' line
            i += 2
            continue
            
        # Match checkout step to inject our fix right before it
        match = re.match(r'(^[ \t]*)- uses: actions/checkout@v4', line)
        if match:
            indent = match.group(1)
            new_lines.append(f"{indent}{FIX_NAME}\n")
            new_lines.append(f"{indent}{FIX_RUN}\n")
        
        new_lines.append(line)
        i += 1
        
    with open(f, 'w', encoding='utf-8') as file:
        file.writelines(new_lines)
        print(f"Patched {f}")

print("Done.")
