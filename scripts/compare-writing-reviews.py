"""Compare two completed synthetic review packets without printing sentences."""
import argparse
import json
from pathlib import Path
DIMENSIONS=('meaning','grammar','collocation','register','naturalness')
RATINGS={'appropriate','problematic','uncertain'}
def compare(first,second):
    packets=[json.loads(Path(path).read_text()) for path in (first,second)]
    template=json.loads((Path(__file__).resolve().parents[1]/'evaluations/writing-review-template.json').read_text())
    reference={case['id']:case for case in template['cases']}
    indexed=[]
    for packet in packets:
        if packet.get('version')!=template['version'] or not packet.get('reviewer_id','').strip(): raise ValueError('Version and pseudonymous reviewer ID are required.')
        if packet.get('independent_of_implementation') is not True: raise ValueError('Each reviewer must attest independence from implementation.')
        cases=packet.get('cases',[])
        if len(cases)!=len(reference) or {c['id'] for c in cases}!=set(reference): raise ValueError('Every template case must appear exactly once.')
        for case in cases:
            if any(case.get(k)!=reference[case['id']][k] for k in ('target','definition','sentence')): raise ValueError('Review packet content differs from the template.')
            ratings=case.get('ratings',{})
            if set(ratings)!=set(DIMENSIONS) or any(ratings[k] not in RATINGS for k in DIMENSIONS): raise ValueError('Complete every dimension using appropriate, problematic or uncertain.')
        indexed.append({c['id']:c['ratings'] for c in cases})
    if packets[0]['reviewer_id'].strip()==packets[1]['reviewer_id'].strip(): raise ValueError('Use two distinct reviewers.')
    return dict(cases=len(reference),agreement={k:sum(indexed[0][id][k]==indexed[1][id][k] for id in reference)/len(reference) for k in DIMENSIONS},
        notice='Raw inter-reviewer agreement on an author-created synthetic exercise. Attestations are not verified. This is not grading accuracy, chance-corrected agreement or learning efficacy.')
if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('first');parser.add_argument('second');args=parser.parse_args()
    try: print(json.dumps(compare(args.first,args.second),indent=2))
    except (ValueError,KeyError,TypeError,OSError): parser.exit(2,'Invalid or incomplete review packets; check the template and protocol.\n')
