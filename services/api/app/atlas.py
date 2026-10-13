"""Bounded, reader-scoped graph projections. GET requests never enrich or mutate."""
from hashlib import sha256
from typing import Literal
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import Field
from sqlalchemy import select
from sqlalchemy.orm import Session
from .db import get_db
from .models import (Sense, Lexeme, Candidate, Occurrence, Translation, Classification,
    Domain, DomainParent, SemanticAssertion, Relationship, Source)
from .schemas import StrictModel
from .memory import get_or_create

router = APIRouter(prefix='/atlas', tags=['Semantic Atlas'])
LOCAL_USER = '00000000-0000-0000-0000-000000000001'
RelationKind = Literal['SYNONYM_OF','ANTONYM_OF','RELATED_TO','HYPERNYM_OF','MORPHOLOGICALLY_RELATED_TO']
SYMMETRIC = {'SYNONYM_OF','ANTONYM_OF','RELATED_TO','MORPHOLOGICALLY_RELATED_TO'}

def stable(kind, value):
    return kind + ':' + sha256(value.casefold().strip().encode()).hexdigest()[:20]

def node(id, label, kind, **values):
    return dict(id=id, label=label, kind=kind, domains=[], classifications=[], **values)

def edge(id, source, target, kind, status='proposed', evidence='', provenance=None, confidence=None):
    return dict(id=id,source=source,target=target,kind=kind,status=status,evidence=evidence,
        provenance=provenance or {},confidence=confidence)

def visible_senses(user=LOCAL_USER):
    return select(Candidate.sense_id).join(Occurrence, Candidate.occurrence_id == Occurrence.id).where(Occurrence.user_id == user)

def require_sense(db, id):
    sense = db.scalar(select(Sense).where(Sense.id == str(id), Sense.id.in_(visible_senses())))
    if sense is None:
        raise HTTPException(404, 'Meaning not found in your memory')
    return sense

@router.get('')
def graph(limit: int = Query(500, ge=1, le=1000), db: Session = Depends(get_db)):
    rows = list(db.execute(select(Sense, Lexeme).join(Lexeme).where(Sense.id.in_(visible_senses()))
        .order_by(Sense.id).limit(limit + 1)))
    truncated = len(rows) > limit
    rows = rows[:limit]
    ids = [s.id for s, _ in rows]
    nodes, edges = {}, {}
    def add_edge(e): edges[e['id']] = e
    translations = {}
    for t in db.scalars(select(Translation).where(Translation.sense_id.in_(ids)).order_by(Translation.id)):
        translations.setdefault(t.sense_id, []).append(dict(language=t.target_language,text=t.text))
    for s, l in rows:
        nodes[s.id] = node(s.id,l.lemma,'WordSense',definition=s.definition,part_of_speech=s.part_of_speech,
            example=s.example,language=l.language,translations=translations.get(s.id,[]),provenance=s.provenance,
            status='proposed',knowledge='candidate',encounters=0,reviewed_encounters=0)
        lid='lexeme:'+l.id
        nodes[lid] = node(lid,l.lemma,'Lexeme',language=l.language,provenance={'source':'database'},status='structural')
        add_edge(edge('lexical:'+s.id,lid,s.id,'HAS_SENSE','structural','Stored lexical identity',{'source':'database'}))
    # Bounded occurrence snapshots. Context is deliberately absent from the bulk graph.
    occurrences = list(db.scalars(select(Occurrence).where(Occurrence.user_id == LOCAL_USER,
        Occurrence.id.in_(select(Candidate.occurrence_id).where(Candidate.sense_id.in_(ids))))
        .order_by(Occurrence.created_at.desc(),Occurrence.id).limit(2001)))
    history_truncated = len(occurrences) > 2000
    for occurrence in occurrences[:2000]:
        snapshot = occurrence.enrichment or {}
        for index, sid in enumerate(snapshot.get('sense_ids', [])):
            if sid not in nodes: continue
            n = nodes[sid]
            n['encounters'] += 1
            if occurrence.selected_sense_id == sid:
                n['knowledge'] = 'encountered'
                n['reviewed_encounters'] += int(occurrence.reviewed_at is not None)
            meanings=snapshot.get('meanings',[])
            if index >= len(meanings): continue
            meaning=meanings[index]
            provenance=snapshot.get('provenance',{})
            for dimension, field, kind, relation in [('domain','subject_areas','Domain','BELONGS_TO_DOMAIN'),
                    ('collocation','collocations','Collocation','PART_OF_COLLOCATION')]:
                for value in meaning.get(field,[])[:12]:
                    if not isinstance(value,str) or not value.strip(): continue
                    value=value.strip()[:240]
                    nid=stable(kind,value)
                    if nid not in nodes:
                        nodes[nid]=node(nid,value,kind,status='proposed',provenance=provenance)
                    if dimension=='domain' and value not in n['domains']: n['domains'].append(value)
                    eid=f'{relation}:{sid}:{nid}'
                    add_edge(edge(eid,sid,nid,relation,'proposed','Unreviewed provider classification',provenance))
    domain_rows={d.id:d for d in db.scalars(select(Domain))}
    for c in db.scalars(select(Classification).where(Classification.sense_id.in_(ids),Classification.status != 'rejected').order_by(Classification.id)):
        nodes[c.sense_id]['classifications'].append(dict(dimension=c.dimension,value=c.value,
            confidence=c.confidence,status=c.status,evidence=c.evidence,provenance=c.provenance))
        if c.dimension=='domain' and c.domain_id in domain_rows:
            d=domain_rows[c.domain_id]; nid='domain:'+d.id
            nodes[nid]=node(nid,d.name,'Domain',definition=d.description,status=c.status,provenance=d.provenance)
            if d.name not in nodes[c.sense_id]['domains']: nodes[c.sense_id]['domains'].append(d.name)
            add_edge(edge('classification:'+c.id,c.sense_id,nid,'BELONGS_TO_DOMAIN',c.status,c.evidence,c.provenance,c.confidence))
    # Only taxonomy nodes reachable from visible classifications are projected.
    parents=list(db.scalars(select(DomainParent)))
    for _ in range(len(domain_rows)):
        changed=False
        for p in parents:
            child,parent='domain:'+p.child_id,'domain:'+p.parent_id
            if child not in nodes or p.parent_id not in domain_rows: continue
            d=domain_rows[p.parent_id]
            if parent not in nodes:
                nodes[parent]=node(parent,d.name,'Domain',definition=d.description,status='structural',provenance=d.provenance);changed=True
            add_edge(edge(child+':'+parent,child,parent,'SUBDOMAIN_OF','structural','Stored taxonomy; not a detected community',d.provenance))
        if not changed: break
    for model in (SemanticAssertion,Relationship):
        query=select(model).where(model.from_sense_id.in_(ids),model.to_sense_id.in_(ids),model.status != 'rejected')
        if model is SemanticAssertion: query=query.where(model.user_id == LOCAL_USER)
        for r in db.scalars(query):
            add_edge(edge(r.id,r.from_sense_id,r.to_sense_id,r.kind,r.status,
                getattr(r,'evidence','Legacy relationship'),r.provenance,getattr(r,'confidence',None)))
    return dict(dataset='personal',nodes=list(nodes.values()),edges=list(edges.values()),
        truncated=truncated,history_truncated=history_truncated,
        notice='Private local graph. Candidate senses are not demonstrated knowledge. No recall probabilities are estimated.')

class AssertionCreate(StrictModel):
    from_sense_id: UUID
    to_sense_id: UUID
    kind: RelationKind
    evidence: str = Field(min_length=5,max_length=1200)

@router.post('/relationships',status_code=201)
def create_relationship(data: AssertionCreate,db: Session=Depends(get_db)):
    a,b=str(data.from_sense_id),str(data.to_sense_id)
    require_sense(db,a);require_sense(db,b)
    if a==b: raise HTTPException(422,'Choose two different meanings')
    if not data.evidence.strip() or len(data.evidence.strip()) < 5:
        raise HTTPException(422,'Add a short explanation of this relationship')
    if data.kind in SYMMETRIC: a,b=sorted((a,b))
    r=get_or_create(db,SemanticAssertion,dict(user_id=LOCAL_USER,from_sense_id=a,to_sense_id=b,kind=data.kind),
        status='reviewed',evidence=data.evidence.strip(),confidence=None,
        provenance={'source':'reader','version':'atlas-v1','verified':False})
    r.status='reviewed';r.evidence=data.evidence.strip()
    db.commit()
    return dict(id=r.id,status=r.status)

class AssertionReview(StrictModel):
    status: Literal['reviewed','rejected']

@router.post('/relationships/{id}/review')
def review_relationship(id: UUID,data: AssertionReview,db:Session=Depends(get_db)):
    row=db.scalar(select(SemanticAssertion).where(SemanticAssertion.id==str(id),SemanticAssertion.user_id==LOCAL_USER))
    if row is None: raise HTTPException(404,'Relationship not found')
    row.status=data.status;db.commit()
    return dict(id=row.id,status=row.status)

@router.get('/senses/{id}')
def sense_details(id:UUID,db:Session=Depends(get_db)):
    require_sense(db,id)
    rows=db.execute(select(Occurrence,Source.title).outerjoin(Source,Occurrence.source_id==Source.id)
        .join(Candidate,Candidate.occurrence_id==Occurrence.id)
        .where(Occurrence.user_id==LOCAL_USER,Candidate.sense_id==str(id))
        .order_by(Occurrence.created_at.desc()).limit(51)).all()
    return dict(truncated=len(rows)>50,occurrences=[dict(id=o.id,text=o.original_text,context=o.context,source=title,
        created_at=o.created_at.isoformat(),reviewed=bool(o.reviewed_at and o.selected_sense_id==str(id))) for o,title in rows[:50]])

@router.get('/demo')
def demo():
    from .atlas_demo import fixture
    return fixture()
