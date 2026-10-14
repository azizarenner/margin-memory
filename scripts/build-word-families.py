"""Extract WordNet 3.0's explicit '+' lexical derivations; no stemming guesses.

Usage: python scripts/build-word-families.py /path/to/wordnet.zip
Input: https://raw.githubusercontent.com/nltk/nltk_data/gh-pages/packages/corpora/wordnet.zip
Format: https://wordnet.princeton.edu/documentation/wndb5wn
Output is a modified reference dataset subject to the accompanying WordNet license.
"""
import gzip
import hashlib
import json
from pathlib import Path
import re
import sys
import zipfile

SHA256='cbda5ea6eef7f36a97a43d4a75f85e07fccbb4f23657d27b4ccbc93e2646ab59'
archive=Path(sys.argv[1])
assert hashlib.sha256(archive.read_bytes()).hexdigest()==SHA256, 'Unexpected reference archive'
output=Path(__file__).resolve().parents[1]/'services/api/app/reference'
output.mkdir(exist_ok=True)
records={}
with zipfile.ZipFile(archive) as z:
    license_text=z.read('wordnet/LICENSE').decode()
    for filename,pos in [('noun','n'),('verb','v'),('adj','a'),('adv','r')]:
        for line in z.read('wordnet/data.'+filename).decode().splitlines():
            if not line or not line[0].isdigit(): continue
            raw,gloss=line.split('|',1);parts=raw.split();count=int(parts[3],16)
            words=[re.sub(r'\((?:a|p|ip)\)$','',w).replace('_',' ').lower() for w in parts[4:4+2*count:2]]
            at=4+2*count;pointer_count=int(parts[at]);at+=1
            pointers=[parts[i:i+4] for i in range(at,at+4*pointer_count,4)]
            records[(pos,parts[0])]=(words,gloss.strip().split('; "')[0],pointers)
    families={}
    for (pos,offset),(words,definition,pointers) in records.items():
        for symbol,target_offset,target_pos,indices in pointers:
            if symbol!='+': continue
            source_index,target_index=int(indices[:2],16)-1,int(indices[2:],16)-1
            assert source_index>=0 and target_index>=0
            target_words,target_definition,_=records[(target_pos,target_offset)]
            word,target=words[source_index],target_words[target_index]
            if word==target: continue
            item=[pos,definition,target,target_pos,target_definition,f'{pos}:{offset}:{source_index+1}',f'{target_pos}:{target_offset}:{target_index+1}']
            families.setdefault(word,[]).append(item)
    families={key:sorted({tuple(row) for row in rows}) for key,rows in sorted(families.items())}
    document=dict(source='Princeton WordNet 3.0',input_sha256=SHA256,
        fields=['source_pos','source_definition','word','pos','definition','source_id','target_id'],families=families)
    raw=json.dumps(document,ensure_ascii=False,separators=(',',':')).encode()
    (output/'word-families.json.gz').write_bytes(gzip.compress(raw,mtime=0))
    (output/'WORDNET-LICENSE.txt').write_text(license_text)
    print(f'{len(families)} word entries; {sum(map(len,families.values()))} derivational links; {len(raw)} uncompressed bytes')
