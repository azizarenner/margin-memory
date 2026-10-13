#!/usr/bin/env python3
"""Create a private local environment without replacing existing credentials."""
import os
from pathlib import Path
import secrets

root = Path(__file__).resolve().parents[1]
target = root / '.env'
if target.exists():
    print('Using existing .env; no credentials changed.')
else:
    content = (root / '.env.example').read_text().replace(
        'replace-with-a-local-only-password', secrets.token_hex(32)
    )
    descriptor = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, 'w') as output:
        output.write(content)
    print('Created .env with a random local password. The password is not displayed.')
