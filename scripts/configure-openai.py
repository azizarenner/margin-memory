#!/usr/bin/env python3
"""Prompt locally for an API key without echoing it or changing database secrets."""
import getpass
import os
from pathlib import Path
import re
import sys
import tempfile

root = Path(__file__).resolve().parents[1]
target = root / '.env'
if not sys.stdin.isatty():
    raise SystemExit('Run this script in your local Terminal so the key can be entered privately.')
if not target.exists():
    raise SystemExit('Run python3 scripts/setup-env.py first.')
key = getpass.getpass('OpenAI API key (hidden): ').strip()
if not key or not re.fullmatch(r'[A-Za-z0-9_-]+', key):
    raise SystemExit('No valid key entered. Environment unchanged.')
updates = {'OPENAI_API_KEY': key, 'AI_PROVIDER': 'openai'}
lines = []
for line in target.read_text().splitlines():
    name = line.split('=', 1)[0]
    lines.append(f'{name}={updates.pop(name)}' if name in updates else line)
lines.extend(f'{name}={value}' for name, value in updates.items())
fd, temporary = tempfile.mkstemp(prefix='.env.', dir=root)
try:
    with os.fdopen(fd, 'w') as output:
        output.write('\n'.join(lines) + '\n')
    os.replace(temporary, target)
finally:
    if os.path.exists(temporary): os.unlink(temporary)
print('OpenAI configured in the private .env file. Existing database credentials were preserved.')
print('The running app will switch modes when the API container is recreated.')
