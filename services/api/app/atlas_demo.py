"""Original deterministic scale fixture, not a lexical resource or learner history."""
def fixture():
    from .atlas import node,edge
    groups={
        'Engineering':['resilience','load','stress','yield','tolerance','strain','structure','capacity'],
        'Economics':['yield','capital','return','value','exchange','demand','growth','reserve'],
        'Psychology':['resilience','attention','recall','perception','learning','adaptation','behavior','memory'],
        'Ecology':['diversity','habitat','adaptation','ecosystem','balance','renewal','niche','resource'],
        'Literature':['narrative','voice','metaphor','ambiguity','rhythm','motif','perspective','imagery'],
        'Everyday life':['habit','conversation','journey','choice','care','work','rest','community']}
    nodes=[];edges=[]
    prov={'source':'synthetic-fixture','version':'atlas-demo-v1','verified':False}
    for group,(domain,words) in enumerate(groups.items()):
        did=f'demo-domain-{group}'
        nodes.append(node(did,domain,'Domain',status='synthetic',provenance=prov))
        for i in range(80):
            nid=f'demo-{group}-{i}'
            n=node(nid,f'{words[i%8]} · {i//8+1:02}', 'WordSense',
                definition=f'Synthetic {domain.lower()} specimen for layout testing. Not a dictionary definition.',
                part_of_speech='not classified',translations=[],provenance=prov,status='synthetic',knowledge='unknown',encounters=0)
            n['domains']=[domain];nodes.append(n)
            edges.append(edge('domain-'+nid,nid,did,'BELONGS_TO_DOMAIN','synthetic','Generated fixture membership',prov))
            for step in (1,7):
                edges.append(edge(f'link-{nid}-{step}',nid,f'demo-{group}-{(i+step)%80}','RELATED_TO','synthetic','Generated topology, not a linguistic claim',prov))
            if i>=8 and i%2==0:
                edges.append(edge(f'hub-{nid}',nid,f'demo-{group}-{i%8}','RELATED_TO','synthetic','Synthetic hub topology, not learning importance',prov))
            if i%8==0:
                edges.append(edge(f'cross-{nid}',nid,f'demo-{(group+1)%6}-{(i+19)%80}','RELATED_TO','synthetic','Synthetic cross-domain topology',prov))
        edges.append(edge(f'bridge-{group}',f'demo-{group}-0',f'demo-{(group+1)%6}-0','RELATED_TO','synthetic','Synthetic bridge for interaction testing',prov))
    return dict(dataset='demo',nodes=nodes,edges=edges,truncated=False,history_truncated=False,
        notice='Demonstration')
