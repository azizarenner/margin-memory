"""Run with python -m app.assessment_benchmark. No database or provider calls."""
import json
from pathlib import Path
from .assessment_quality import baseline_variants,variants,normalize

def evaluate(cases,generate):
    accepted=positive=negative=unknown=valid=0
    groups={}
    for case in cases:
        prediction=normalize(case['answer']) in generate(case['lemma'],case['pos'])
        group=groups.setdefault(case['category'],dict(cases=0,accepted=0))
        group['cases']+=1;group['accepted']+=int(prediction)
        accepted+=int(prediction);valid+=int(case['acceptable'] is True)
        if prediction:
            positive+=int(case['acceptable'] is True)
            negative+=int(case['acceptable'] is False)
            unknown+=int(case['acceptable'] is None)
    return dict(cases=len(cases),accepted=accepted,abstained=len(cases)-accepted,
        coverage=accepted/len(cases) if cases else None,
        precision_on_known_labels=positive/(positive+negative) if positive+negative else None,
        valid_answer_recall=positive/valid if valid else None,false_acceptances=negative,
        unadjudicated_acceptances=unknown,by_category=groups)

def run():
    fixture=json.loads((Path(__file__).resolve().parents[3]/'evaluations/recall-v1.json').read_text())
    return dict(fixture=fixture['version'],limitation=fixture['provenance'],
        baseline=evaluate(fixture['cases'],baseline_variants),candidate=evaluate(fixture['cases'],variants))

if __name__=='__main__': print(json.dumps(run(),indent=2))
