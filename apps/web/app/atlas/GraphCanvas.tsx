"use client";
import {useEffect,useRef,useState} from 'react';
import Graph from 'graphology';
import type Sigma from 'sigma';
import type FA2Layout from 'graphology-layout-forceatlas2/worker';
import {type AtlasData,type AtlasMode,color,hash,neighborhood} from '../../lib/atlas';

export default function GraphCanvas({data,mode,selected,onSelect,hops,reducedMotion}:{data:AtlasData;mode:AtlasMode;selected:string;onSelect:(id:string)=>void;hops:number;reducedMotion:boolean}){
 const container=useRef<HTMLDivElement>(null),renderer=useRef<Sigma|null>(null),layout=useRef<FA2Layout|null>(null);
 const glow=useRef<HTMLCanvasElement>(null);
 const selectedRef=useRef(selected),callback=useRef(onSelect);callback.current=onSelect;selectedRef.current=selected;
 const [error,setError]=useState(''),[settling,setSettling]=useState(false),[names,setNames]=useState<'off'|'key'|'all'>('key');
 const namesRef=useRef(names);namesRef.current=names;
 const orbitRoot=mode==='orbit'?selected:'';
 useEffect(()=>{
  let disposed=false,timer:ReturnType<typeof setTimeout>|undefined;
  const g=new Graph({multi:true,type:'directed'});
  const distances=mode==='orbit'&&orbitRoot?neighborhood(data,orbitRoot,hops):null;
  const domains=[...new Set(data.nodes.map(n=>n.domains[0]||(n.kind==='Domain'?n.label:'Unclassified')))].sort();
  for(const n of data.nodes){
   const group=domains.indexOf(n.domains[0]||(n.kind==='Domain'?n.label:'Unclassified'));
   const a=(hash(n.id)%10000)/10000*Math.PI*2,r=8+Math.sqrt(hash(n.id+'radius')%1000)*2;
   const ga=group/Math.max(1,domains.length)*Math.PI*2;
   let x=Math.cos(ga)*120+Math.cos(a)*r,y=Math.sin(ga)*120+Math.sin(a)*r;
   if(mode==='orbit'&&distances){const depth=distances.get(n.id)??(hops+1);x=depth*Math.cos(a)*70;y=depth*Math.sin(a)*70;}
   g.addNode(n.id,{x,y,label:n.label,color:color(n),kind:n.kind,size:1.2,
    hidden:!!distances&&!distances.has(n.id)});
  }
  for(const e of data.edges)if(g.hasNode(e.source)&&g.hasNode(e.target)){
   const hex=g.getNodeAttribute(e.source,'color') as string;
   const rgb=[1,3,5].map(i=>Math.round(parseInt(hex.slice(i,i+2),16)*.45));
   g.addEdgeWithKey(e.id,e.source,e.target,{weight:e.kind==='BELONGS_TO_DOMAIN'?.12:.8,type:'curve',curvature:(hash(e.id)%2?1:-1)*.07,size:.6,color:`rgb(${rgb.join(',')})`,label:e.kind.replaceAll('_',' ').toLowerCase(),hidden:!!distances&&(!distances.has(e.source)||!distances.has(e.target))});
  }
  g.forEachNode(id=>g.setNodeAttribute(id,'size',Math.min(7,.7+Math.sqrt(g.degree(id))*.55)));
  async function mount(){
   try{
    const [{default:SigmaRenderer},{default:ForceLayout},{default:CurveProgram}]=await Promise.all([import('sigma'),import('graphology-layout-forceatlas2/worker'),import('@sigma/edge-curve')]);
    if(disposed||!container.current)return;
    setError('');
    const s=new SigmaRenderer(g,container.current,{edgeProgramClasses:{curve:CurveProgram},labelFont:'monospace',labelColor:{color:'#c4c8c8'},labelSize:10,labelDensity:.08,labelRenderedSizeThreshold:4,renderEdgeLabels:false,hideEdgesOnMove:false,allowInvalidContainer:true,minEdgeThickness:.35,itemSizesReference:'screen',zoomToSizeRatioFunction:r=>Math.max(.8,Math.pow(r,.15)),stagePadding:32,
      defaultDrawNodeHover:(ctx,d)=>{ctx.strokeStyle=d.color;ctx.lineWidth=1;ctx.beginPath();ctx.arc(d.x,d.y,d.size+5,0,Math.PI*2);ctx.stroke();if(d.label){ctx.font='11px monospace';const w=ctx.measureText(d.label).width;ctx.fillStyle='#090909';ctx.fillRect(d.x+d.size+9,d.y-12,w+12,23);ctx.fillStyle='#eff0e9';ctx.fillText(d.label,d.x+d.size+15,d.y+4);}},
      nodeReducer:(id,attrs)=>{const focus=selectedRef.current;const dim=focus&&g.hasNode(focus)&&focus!==id&&!g.areNeighbors(id,focus);return {...attrs,label:namesRef.current==='off'&&id!==focus?'':attrs.label,color:dim?'#34383a':attrs.color,highlighted:id===focus,forceLabel:id===focus||namesRef.current==='all',size:id===focus?Math.max(4,attrs.size):attrs.size};},
      edgeReducer:(id,attrs)=>{const focus=selectedRef.current;const touches=focus&&(g.source(id)===focus||g.target(id)===focus);return {...attrs,color:touches?'#6a7878':focus?'#15191a':attrs.color,size:touches?.7:attrs.size};}});
    renderer.current=s;
    s.on('afterRender',()=>{
     const canvas=glow.current;if(!canvas)return;const rect=container.current!.getBoundingClientRect(),dpr=window.devicePixelRatio||1;
     if(canvas.width!==Math.round(rect.width*dpr)||canvas.height!==Math.round(rect.height*dpr)){canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);}
     const ctx=canvas.getContext('2d');if(!ctx)return;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,rect.width,rect.height);
     g.forEachNode(id=>{const d=s.getNodeDisplayData(id);if(!d||d.hidden)return;const selected=selectedRef.current;if(selected&&id!==selected&&!g.areNeighbors(id,selected))return;
      const p=s.graphToViewport({x:g.getNodeAttribute(id,"x"),y:g.getNodeAttribute(id,"y")});const radius=Math.max(2,d.size);const isHub=g.degree(id)>7;
      if(isHub||id===selected){const gradient=ctx.createRadialGradient(p.x,p.y,radius,p.x,p.y,radius*4);gradient.addColorStop(0,d.color+'36');gradient.addColorStop(1,d.color+'00');ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(p.x,p.y,radius*4,0,2*Math.PI);ctx.fill();}
      if(g.getNodeAttribute(id,'kind')==='Domain'||id===selected){ctx.strokeStyle=d.color;ctx.globalAlpha=.65;ctx.lineWidth=.7;ctx.beginPath();ctx.arc(p.x,p.y,radius+3,0,2*Math.PI);ctx.stroke();ctx.globalAlpha=1;}
     });
    });
    s.on('clickNode',({node})=>callback.current(node));
    s.on('clickStage',()=>callback.current(''));
    let dragging:string|null=null;
    s.on('downNode',({node})=>{dragging=node;layout.current?.stop();if(!s.getCustomBBox())s.setCustomBBox(s.getBBox());});
    s.getMouseCaptor().on('mousemovebody',event=>{if(!dragging)return;const p=s.viewportToGraph(event);g.mergeNodeAttributes(dragging,p);event.preventSigmaDefault();event.original.preventDefault();event.original.stopPropagation();});
    s.getMouseCaptor().on('mouseup',()=>{dragging=null;});
    if(mode==='network'&&g.order>1&&!reducedMotion){
     const worker=new ForceLayout(g,{settings:{barnesHutOptimize:true,adjustSizes:true,linLogMode:true,strongGravityMode:true,gravity:.08,scalingRatio:15,slowDown:5}});layout.current=worker;setSettling(true);worker.start();
     timer=setTimeout(()=>{worker.stop();if(!disposed)setSettling(false);},2200);
    }else setSettling(false);
   }catch{if(!disposed)setError('WebGL is unavailable here. Use the searchable node list to inspect this graph.');}
  }
  void mount();
  return()=>{disposed=true;clearTimeout(timer);layout.current?.kill();layout.current=null;renderer.current?.kill();renderer.current=null;};
 },[data,mode,orbitRoot,hops,reducedMotion]);
 useEffect(()=>{const s=renderer.current;if(!s)return;s.refresh();if(selected){const n=s.getNodeDisplayData(selected);if(n)s.getCamera().animate({x:n.x,y:n.y},{duration:reducedMotion?0:350});}},[selected,reducedMotion]);
 useEffect(()=>{const s=renderer.current;if(!s)return;s.setSetting('labelRenderedSizeThreshold',names==='all'?0:4);s.refresh();},[names]);
 return <><div ref={container} className="atlas-canvas" role="img" aria-label={`${data.nodes.length} nodes in ${mode} view. Use the adjacent node list for keyboard navigation.`}/>
 <canvas ref={glow} className="atlas-glow" aria-hidden="true"/>
 <div className="atlas-name-controls"><span>NAMES</span>{(['off','key','all'] as const).map(value=><button key={value} aria-pressed={names===value} onClick={()=>setNames(value)}>{value.toUpperCase()}</button>)}</div>
 {error&&<p role="alert" className="canvas-notice">{error}</p>}
 <div className="canvas-status">{settling?'Settling network…':'Drag to pan · scroll to zoom · select to explore'}</div>
 <div className="camera-controls" aria-label="Camera controls"><button aria-label="Zoom in" onClick={()=>renderer.current?.getCamera().animatedZoom({duration:reducedMotion?0:200})}>＋</button><button aria-label="Zoom out" onClick={()=>renderer.current?.getCamera().animatedUnzoom({duration:reducedMotion?0:200})}>−</button><button onClick={()=>renderer.current?.getCamera().animatedReset({duration:reducedMotion?0:250})}>Reset view</button></div></>;
}
