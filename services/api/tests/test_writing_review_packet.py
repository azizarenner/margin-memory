import importlib.util
import json
from pathlib import Path
import pytest

def test_review_comparison_requires_complete_distinct_attested_packets(tmp_path):
    root=Path(__file__).resolve().parents[3]
    spec=importlib.util.spec_from_file_location('writing_review_comparison',root/'scripts/compare-writing-reviews.py')
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    template=root/'evaluations/writing-review-template.json'
    with pytest.raises(ValueError): module.compare(template,template)
    files=[]
    for i in range(2):
        packet=json.loads(template.read_text());packet['reviewer_id']=f'synthetic-test-{i}';packet['independent_of_implementation']=True
        for case in packet['cases']: case['ratings']=dict.fromkeys(module.DIMENSIONS,'uncertain' if i==0 else 'appropriate')
        path=tmp_path/f'packet-{i}.json';path.write_text(json.dumps(packet));files.append(path)
    report=module.compare(*files)
    assert report['cases']==6 and all(value==0 for value in report['agreement'].values())
    with pytest.raises(ValueError): module.compare(files[0],files[0])
    packet['cases'][0]['sentence']='Changed synthetic sentence';files[1].write_text(json.dumps(packet))
    with pytest.raises(ValueError): module.compare(*files)
