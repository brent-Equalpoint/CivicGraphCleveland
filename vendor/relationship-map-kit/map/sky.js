/* =========================================================
   SKY
   ========================================================= */
const SKY={nodes:[],byId:new Map(),T:null,focus:null,cursor:null,hover:null,lit:null,litCenter:null,t0:0,raf:0,W:0,H:0,dpr:1,
  layers:{startup:true,investor:true,industry:true,sector:false,fit:true,pair:true,strong:true},stages:new Set()};
const cv=$('#skyCanvas'),ctx=cv.getContext('2d');
const ST={bg:'#0B0D0C',halo:'rgba(11,13,12,.92)',ink:'#F4F6F5',ink2:'#B7BDB9',ink3:'#8D9591',g:'#3BD75C',p:'#B79CFF',b:'#9CC8F3',a:'#F0C674'};
function skyBuild(){
  const nodes=[],links=[];
  D.industries.filter(i=>i.companies>0).forEach(i=>nodes.push({id:i.id,kind:'industry',e:i,r:9+Math.sqrt(i.companies)*2.3}));
  D.companies.forEach(c=>nodes.push({id:c.id,kind:'startup',e:c,r:2.3+Math.min(3.4,Math.sqrt(c.n.fit[2])*.75)}));
  D.funds.forEach(f=>nodes.push({id:f.id,kind:'investor',e:f,r:3+Math.min(3.8,Math.sqrt(f.n.fit[2])*.5)}));
  const has=new Set(nodes.filter(n=>n.kind==='industry').map(n=>n.id));
  D.companies.forEach(c=>{let ind=realInd(c);if(!ind.length)ind=['Other'];ind.forEach((n,k)=>{const i=INN.get(n);if(i&&has.has(i.id))links.push({source:c.id,target:i.id,s:k===0?.7:.22/ind.length,d:30});});});
  D.funds.forEach(f=>{const ind=realInd(f).map(n=>INN.get(n)).filter(i=>i&&has.has(i.id));ind.forEach(i=>links.push({source:f.id,target:i.id,s:.55/ind.length,d:70}));});
  const sim=d3.forceSimulation(nodes).randomSource(d3.randomLcg(26))
    .force('link',d3.forceLink(links).id(d=>d.id).strength(l=>SKY.soloIds&&l.ss!=null?l.ss:l.s).distance(l=>l.d))
    .force('charge',d3.forceManyBody().strength(d=>d.kind==='industry'?(SKY.soloIds?-150:-480):d.kind==='investor'?-34:-16).distanceMax(520))
    .force('collide',d3.forceCollide(d=>d.r+(d.kind==='industry'?16:2.2)).iterations(2))
    .force('x',d3.forceX(0).strength(.04)).force('y',d3.forceY(0).strength(.05)).stop();
  const pre=still()?360:170;for(let i=0;i<pre;i++)sim.tick();SKY.settling=!still();
  nodes.forEach((n,i)=>{n.ph=(i*2.39996)%(Math.PI*2);SKY.byId.set(n.id,n);n.sec=n.kind==='industry'?secOf(n.e.name):n.kind==='startup'?secOf(realInd(n.e)[0]||'Other'):null;
    n.inds=n.kind==='industry'?[n.id]:(n.kind==='startup'&&!realInd(n.e).length?['Other']:realInd(n.e)).map(nm=>INN.get(nm)).filter(i=>i&&has.has(i.id)).map(i=>i.id);});
  SKY.links=links;
  SKY.nodes=nodes;SKY.sim=sim;sim.on('tick',()=>{skyRequest();SKY.simT=performance.now();if(SKY.settling&&sim.alpha()<.03){SKY.settling=false;if(!SKY.userMoved&&!SKY.focus&&NET.mode==='sky')skyFit(true);}});
  // lines from every startup, and every focused investor, out to its industry
  SKY.spokes=[];
  D.companies.forEach(c=>{let ind=realInd(c);if(!ind.length)ind=['Other'];ind.forEach((nm,k)=>{const i=INN.get(nm),a=i&&SKY.byId.get(i.id);if(a)SKY.spokes.push({a,b:SKY.byId.get(c.id),w:k===0?1:.45});});});
  D.funds.forEach(f=>{const ind=realInd(f);if(ind.length>5)return;ind.forEach(nm=>{const i=INN.get(nm),a=i&&SKY.byId.get(i.id);if(a)SKY.spokes.push({a,b:SKY.byId.get(f.id),w:.55});});});
  SKY.spokes.forEach((s,i)=>{s.d=((i*7)%23)/23;});SKY.edgeT0=performance.now()+300;
  // drawn lines: each startup's top investor fits and top founder pairs
  SKY.fitL={2:[],1:[]};SKY.pairL={2:[],1:[]};
  D.companies.forEach(c=>{const l=fitsC.get(c.id)||[];
    l.filter(x=>x.s===2).slice(0,3).forEach(x=>SKY.fitL[2].push({a:SKY.byId.get(x.f),b:SKY.byId.get(c.id),s:2}));
    l.filter(x=>x.s>=1).slice(0,3).forEach(x=>SKY.fitL[1].push({a:SKY.byId.get(x.f),b:SKY.byId.get(c.id),s:x.s}));});
  const seen={2:new Set(),1:new Set()};
  D.companies.forEach(c=>{const l=peersC.get(c.id)||[];[2,1].forEach(lv=>{l.filter(x=>x.p.s>=lv).slice(0,2).forEach(x=>{const k=[c.id,x.o].sort().join('|');if(seen[lv].has(k))return;seen[lv].add(k);SKY.pairL[lv].push({a:SKY.byId.get(c.id),b:SKY.byId.get(x.o),s:x.p.s});});});});
}
function simWake(kick){if(!SKY.sim||SKY.flow)return;if(still()){SKY.sim.stop();return;}SKY.sim.alphaTarget(P.motion==='live'?.012:0);if(kick)SKY.sim.alpha(Math.max(SKY.sim.alpha(),kick));SKY.sim.restart();}
function simSleep(){if(SKY.sim)SKY.sim.stop();}
function renderLegend(){const L=$('#skyLegend');if(!L)return;const lines='<span><i class="ln ind"></i>In that industry</span><span><i class="ln"></i>Investor fit</span><span><i class="ln dash"></i>Founder pair</span>';
  L.innerHTML=SKY.layers.sector?SECTORS.map(s=>`<span><i class="shape startup" style="background:${s.col}"></i>${esc(s.label)}</span>`).join('')+'<span><i class="shape investor"></i>Investor</span>'+lines
    :'<span><i class="shape startup"></i>Startup</span><span><i class="shape investor"></i>Investor</span><span><i class="shape industry"></i>Industry</span>'+lines;}
function baseVisible(n){if(!SKY.layers[n.kind])return false;if(SKY.stages.size&&n.kind!=='industry'&&!n.e.stages.some(s=>SKY.stages.has(s)))return false;return true;}
function visible(n){return baseVisible(n)&&(!SKY.soloIds||SKY.soloIds.has(n.id));}
// how much of a star to draw: eases in and out while a solo changes
function sa(n){if(!baseVisible(n))return 0;const inNew=!SKY.soloIds||SKY.soloIds.has(n.id);const q=SKY.soloQ;if(q>=1)return inNew?1:0;const inOld=!SKY.soloOld||SKY.soloOld.has(n.id);return inOld===inNew?(inNew?1:0):inNew?q:1-q;}
let NBC={k:null,v:null};function neighborsC(n){const k=n.id+'|'+SKY.layers.strong+SKY.layers.startup+SKY.layers.investor+'|'+[...SKY.stages].join()+'|'+(SKY.soloKey||'');if(NBC.k!==k)NBC={k,v:neighbors(n)};return NBC.v;}
function neighbors(n){ // [{n, s, kind:'fit'|'pair'|'member'}]
  if(!n)return [];const lv=SKY.layers.strong?2:1;const out=[];
  const pick=(arr,f)=>{const a=arr.filter(f);return a.length?a:arr.slice(0,3);};
  if(n.kind==='startup'){pick(fitsC.get(n.id)||[],x=>x.s>=lv).slice(0,12).forEach(x=>out.push({n:SKY.byId.get(x.f),s:x.s,k:'fit'}));
    pick(peersC.get(n.id)||[],x=>x.p.s>=lv).slice(0,8).forEach(x=>out.push({n:SKY.byId.get(x.o),s:x.p.s,k:'pair'}));}
  else if(n.kind==='investor'){pick(fitsF.get(n.id)||[],x=>x.s>=lv).slice(0,24).forEach(x=>out.push({n:SKY.byId.get(x.c),s:x.s,k:'fit'}));}
  else if(n.kind==='industry'){const nm=n.e.name;D.companies.filter(c=>c.industries.includes(nm)).forEach(c=>out.push({n:SKY.byId.get(c.id),s:Math.max(0,bestFit(c)),k:'member'}));
    D.funds.filter(f=>f.industries.includes(nm)&&realInd(f).length<=6).forEach(f=>out.push({n:SKY.byId.get(f.id),s:2,k:'member'}));}
  return out.filter(x=>x.n&&visible(x.n));
}
function skyResize(){const box=$('#sky');const W=box.clientWidth,H=box.clientHeight;if(!W||!H)return;const dpr=Math.min(2,devicePixelRatio||1);
  if(W!==SKY.W||H!==SKY.H||dpr!==SKY.dpr){SKY.W=W;SKY.H=H;SKY.dpr=dpr;cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);if(!SKY.fitted){skyFit(false);SKY.fitted=true;}soloBarPos();}
  skyDraw(performance.now());}
function bbox(ns){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;ns.forEach(n=>{x0=Math.min(x0,n.x-n.r);y0=Math.min(y0,n.y-n.r);x1=Math.max(x1,n.x+n.r);y1=Math.max(y1,n.y+n.r);});return {x0,y0,x1,y1};}
function sheetW(){return $('#sheet').classList.contains('show')&&innerWidth>900?380:0;}
function panelW(){return innerWidth>1180&&NET.mode==='sky'?300:0;}
function sheetH(){const s=$('#sheet');return innerWidth<=900&&s.classList.contains('show')?s.offsetHeight:0;}
function skyFit(anim,ns,o={}){const given=!!(ns&&ns.length);ns=given?ns:SKY.soloIds?SKY.nodes.filter(n=>SKY.soloIds.has(n.id)):SKY.nodes;const b=o.box||bbox(ns);const mob=innerWidth<=900;const some=given&&!o.whole;const padL=panelW()+(mob?44:30),padR=sheetW()+(some&&!mob?170:mob?60:30),padT=mob?64:30,padB=(mob?24:60)+sheetH();
  const bar=$('#soloBar');const barB=NET.mode==='sky'&&bar&&bar.offsetParent?bar.offsetTop+bar.offsetHeight+14:0;const pT=Math.max(padT,barB),pR=padR+(o.whole&&!mob?170:0);
  // while the solo list is open beside the map, the group settles in the space to its right
  const pop=$('#soloPop');const pL=!mob&&SOLO_UI.open&&pop&&!pop.hidden?Math.max(padL,pop.offsetLeft+pop.offsetWidth+30):padL;
  let w=SKY.W-pL-pR,h=SKY.H-pT-padB;if(w<140||h<140){w=Math.max(60,SKY.W-60-sheetW());h=Math.max(60,SKY.H-80-sheetH());}const k=Math.max(.25,Math.min(ns.length<4?2.4:3.2,Math.min(w/(b.x1-b.x0||1),h/(b.y1-b.y0||1))));
  const t=d3.zoomIdentity.translate(pL+w/2-k*(b.x0+b.x1)/2,pT+h/2-k*(b.y0+b.y1)/2).scale(k);skyTo(t,anim,o.dur,o.ease);}
const zoom=d3.zoom().scaleExtent([.2,10]).on('zoom',e=>{if(e.sourceEvent)SKY.userMoved=true;SKY.T=e.transform;skyRequest();if(NET.mode==='linked')klRays();});
// pan and zoom everywhere except on a star, where a press becomes a drag
zoom.filter(ev=>{if(ev.type==='wheel')return !ev.button;if(ev.button||ev.ctrlKey)return false;if(ev.type==='mousedown'||(ev.type==='touchstart'&&ev.touches.length===1)){const r=cv.getBoundingClientRect();const pp=ev.touches?ev.touches[0]:ev;return !hit(pp.clientX-r.left,pp.clientY-r.top);}return true;});
const csel=d3.select(cv);csel.call(zoom).on('dblclick.zoom',null);SKY.T=d3.zoomIdentity;
// momentum: flick the map and it keeps gliding, slowing to a stop like a puck on ice
const MOM={hist:[],raf:0,k0:1};
function momStop(){if(MOM.raf){cancelAnimationFrame(MOM.raf);MOM.raf=0;}}
zoom.on('start.mom',e=>{if(!e.sourceEvent)return;momStop();MOM.hist=[];MOM.k0=e.transform.k;})
  .on('zoom.mom',e=>{if(!e.sourceEvent)return;const t=e.sourceEvent.timeStamp;MOM.hist.push([t,e.transform.x,e.transform.y,e.transform.k]);while(MOM.hist.length>2&&t-MOM.hist[0][0]>100)MOM.hist.shift();})
  .on('end.mom',e=>{if(!e.sourceEvent)return;const h=MOM.hist;MOM.hist=[];if(still()||h.length<2){MOM.why='no flick';return;}const a=h[0],b=h[h.length-1];
    if(Math.abs(b[3]-MOM.k0)>1e-3){MOM.why='pinch';return;}/* a pinch or a zoom, not a flick */
    if(e.sourceEvent.timeStamp-b[0]>100){MOM.why='rested '+Math.round(e.sourceEvent.timeStamp-b[0]);return;}/* the finger came to rest before lifting */
    const dt=Math.max(8,b[0]-a[0]);let vx=(b[1]-a[1])/dt,vy=(b[2]-a[2])/dt;const sp=Math.hypot(vx,vy);MOM.why='speed '+sp.toFixed(2)+' from '+h.length;if(sp<.15)return;if(sp>3.5){vx*=3.5/sp;vy*=3.5/sp;}
    let last=performance.now();const step=now=>{const d=Math.min(40,now-last);last=now;const f=Math.pow(.955,d/16);vx*=f;vy*=f;
      if(Math.hypot(vx,vy)<.03){MOM.raf=0;return;}const k=SKY.T.k;csel.call(zoom.translateBy,vx*d/k,vy*d/k);MOM.raf=requestAnimationFrame(step);};
    MOM.raf=requestAnimationFrame(step);});
function skyTo(t,anim,dur,ease){momStop();if(anim&&!still())csel.transition().duration(dur||700).ease(ease||d3.easeCubicOut).call(zoom.transform,t);else csel.call(zoom.transform,t);}
function skyCenterOn(n,k){const kk=Math.max(SKY.T.k,k||1.8);const cx=(panelW()+(SKY.W-sheetW()))/2,cy=SKY.H/2;skyTo(d3.zoomIdentity.translate(cx-kk*n.x,cy-kk*n.y).scale(kk),true);}
function skyRequest(){if(!SKY.raf)SKY.raf=requestAnimationFrame(skyFrame);}
function skyFrame(now){SKY.raf=0;const more=skyDraw(now);if(more)skyRequest();}
const easeOut=t=>1-Math.pow(1-t,3);
// star size on screen grows gently with zoom, so stars stay readable when zoomed out and don't balloon when zoomed in
const nodeR=(n,k)=>n.r*Math.max(.8,Math.min(2.2,Math.pow(k,.6)))/k;
// investors are hexagons, pointy side up
function hexPath(c,x,y,r){c.beginPath();for(let i=0;i<6;i++){const a=-Math.PI/2+i*Math.PI/3;const px=x+r*Math.cos(a),py=y+r*Math.sin(a);if(i)c.lineTo(px,py);else c.moveTo(px,py);}c.closePath();}
const quietSky=()=>innerWidth<=900&&!SKY.focus&&!SKY.lit&&!SKY.soloIds&&NET.mode==='sky';
function skyDraw(now){
  if(!SKY.W)return false;const T=SKY.T,k=T.k,dpr=SKY.dpr;let anim=false;
  // solo: stars glide into their new places while the rest fade away
  const FL=SKY.flow;if(FL){const q=Math.min(1,(now-FL.t0)/FL.dur);const e=q<.5?4*q*q*q:1-Math.pow(-2*q+2,3)/2;FL.items.forEach(o=>{o.n.x=o.x0+(o.x1-o.x0)*e;o.n.y=o.y0+(o.y1-o.y0)*e;});if(q<1)anim=true;else soloFlowEnd();}
  SKY.soloQ=SKY.soloT0&&!still()?easeOut(Math.min(1,(now-SKY.soloT0)/460)):1;if(SKY.soloQ<1)anim=true;const boost=SKY.soloIds?1.8:1;
  ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,SKY.W,SKY.H);
  const F=SKY.focus,lit=SKY.lit;const nb=F?neighborsC(F):null;const nbSet=nb?new Set(nb.map(x=>x.n.id)):null;
  const on=n=>{if(lit)return lit.has(n.id)||n.id===SKY.litCenter;if(F)return n===F||nbSet.has(n.id);return true;};
  const dim=!!(F||lit);const live=P.motion==='live';if(live)anim=true;
  const quiet=innerWidth<=900&&!dim&&!SKY.soloIds&&NET.mode==='sky';
  const pr=F&&!still()?Math.min(1,(now-SKY.t0)/900):1;if(pr<1)anim=true;
  ctx.save();ctx.translate(T.x,T.y);ctx.scale(k,k);const lw=1/k;
  // industry halos
  const SEC=SKY.layers.sector;
  if(SKY.layers.industry)SKY.nodes.forEach(n=>{if(n.kind!=='industry')return;const v=sa(n);if(!v)return;const a=(dim&&!on(n)?.25:1)*v;const ic=SEC?n.sec.col:ST.b;
    ctx.globalAlpha=(SEC?.09:.05)*a;ctx.fillStyle=ic;ctx.beginPath();ctx.arc(n.x,n.y,n.r*2.2,0,7);ctx.fill();
    ctx.globalAlpha=.10*a;ctx.beginPath();ctx.arc(n.x,n.y,n.r,0,7);ctx.fill();
    ctx.globalAlpha=(SEC?.8:quietSky()?.8:.55)*a;ctx.strokeStyle=ic;ctx.lineWidth=(SEC?1.6:quietSky()?1.6:1.2)*lw;ctx.beginPath();ctx.arc(n.x,n.y,n.r,0,7);ctx.stroke();});
  // industry lines, drawn out from each category on arrival
  if(SKY.layers.industry&&SKY.spokes){const et=still()?1:Math.max(0,Math.min(1,(now-SKY.edgeT0)/1700));if(et<1)anim=true;ctx.strokeStyle=ST.b;ctx.lineWidth=.8*lw;
    SKY.spokes.forEach(s=>{const v=Math.min(sa(s.a),sa(s.b));if(!v)return;const t=easeOut(Math.max(0,Math.min(1,et*1.7-s.d*.7)));if(t<=0)return;const hot=dim&&on(s.a)&&on(s.b);ctx.globalAlpha=Math.min(1,(dim?(hot?.3:.02):quiet?.02:(SEC?.18:.12)*boost)*s.w*v);if(SEC)ctx.strokeStyle=s.a.sec.col;
      ctx.beginPath();ctx.moveTo(s.a.x,s.a.y);ctx.lineTo(s.a.x+(s.b.x-s.a.x)*t,s.a.y+(s.b.y-s.a.y)*t);ctx.stroke();});}
  // base lines
  const lv=SKY.layers.strong?2:1;
  const baseA=dim?.04:quiet?0:1;
  if(SKY.layers.fit){ctx.strokeStyle=ST.p;ctx.lineWidth=.9*lw;SKY.fitL[lv].forEach(l=>{const v=Math.min(sa(l.a),sa(l.b));if(!v)return;ctx.globalAlpha=Math.min(1,(l.s===2?.2:.1)*baseA*boost*v);ctx.beginPath();ctx.moveTo(l.a.x,l.a.y);ctx.lineTo(l.b.x,l.b.y);ctx.stroke();});}
  if(SKY.layers.pair){ctx.strokeStyle=ST.g;ctx.lineWidth=.9*lw;ctx.setLineDash([3*lw,3*lw]);SKY.pairL[lv].forEach(l=>{const v=Math.min(sa(l.a),sa(l.b));if(!v)return;ctx.globalAlpha=Math.min(1,(l.s===2?.3:.14)*baseA*boost*v);ctx.beginPath();ctx.moveTo(l.a.x,l.a.y);ctx.lineTo(l.b.x,l.b.y);ctx.stroke();});ctx.setLineDash([]);}
  // lines of the star you just let go, pulling back in
  const PF=SKY.prevFocus;if(PF&&!still()){const q=1-Math.min(1,(now-PF.t0)/320);if(q>0){anim=true;PF.nb.forEach(x=>{const col=x.k==='pair'?ST.g:x.k==='member'?ST.b:ST.p;ctx.strokeStyle=col;ctx.globalAlpha=.5*q;ctx.lineWidth=1.1*lw;ctx.beginPath();ctx.moveTo(PF.n.x,PF.n.y);ctx.lineTo(PF.n.x+(x.n.x-PF.n.x)*q,PF.n.y+(x.n.y-PF.n.y)*q);ctx.stroke();});}else SKY.prevFocus=null;}
  // focus lines, drawn out from the focus
  if(F&&nb){nb.forEach((x,i)=>{const t=easeOut(Math.max(0,Math.min(1,pr*1.5-i*.018)));if(t<=0)return;const col=x.k==='pair'?ST.g:x.k==='member'?ST.b:ST.p;
    ctx.strokeStyle=col;ctx.globalAlpha=x.s===2?.85:x.s===1?.55:.35;ctx.lineWidth=(x.s===2?1.6:1.1)*lw;if(x.k==='pair')ctx.setLineDash([4*lw,3*lw]);
    ctx.beginPath();ctx.moveTo(F.x,F.y);ctx.lineTo(F.x+(x.n.x-F.x)*t,F.y+(x.n.y-F.y)*t);ctx.stroke();ctx.setLineDash([]);
    if(live&&t>=1){const q=((now/2400)+i*.13)%1;ctx.globalAlpha=.9*(1-Math.abs(q-.5)*2)+.1;ctx.fillStyle=col;ctx.beginPath();ctx.arc(F.x+(x.n.x-F.x)*q,F.y+(x.n.y-F.y)*q,1.8*lw*1.4,0,7);ctx.fill();}});}
  // nodes
  SKY.nodes.forEach(n=>{if(n.kind==='industry')return;const v=sa(n);if(!v)return;let a=(dim&&!on(n)?.13:quiet?.2:1)*v;if(live&&!dim&&!quiet)a*=.82+.18*Math.sin(now/1700+n.ph);
    const rr=nodeR(n,k);
    ctx.globalAlpha=a;ctx.fillStyle=n.kind==='startup'?(SEC?n.sec.col:ST.g):ST.p;
    let gr=1;if(n===SKY.hover&&!still()){const h=Math.min(1,(now-(SKY.hoverT0||0))/180);gr=1+.55*easeOut(h);if(h<1)anim=true;}else if(n===SKY.hover)gr=1.55;const r2=rr*gr;
    if(n.kind==='startup'){ctx.beginPath();ctx.arc(n.x,n.y,r2,0,7);ctx.fill();}else{hexPath(ctx,n.x,n.y,r2*1.22);ctx.fill();}
    if(on(n)&&dim){ctx.globalAlpha=.18;ctx.beginPath();ctx.arc(n.x,n.y,rr*2.6,0,7);ctx.fill();}});
  // a ripple where you tapped
  const RP=SKY.ripple;if(RP&&!still()){const q=Math.min(1,(now-RP.t0)/560);if(q<1){anim=true;ctx.globalAlpha=.7*(1-q);ctx.strokeStyle=RP.col;ctx.lineWidth=2*lw;ctx.beginPath();ctx.arc(RP.n.x,RP.n.y,(nodeR(RP.n,k)+4/k)+(34/k)*easeOut(q),0,7);ctx.stroke();}else SKY.ripple=null;}
  // focus / cursor rings
  [[F,ST.ink,2],[SKY.cursor,ST.a,1.6],[SKY.hover,ST.ink2,1]].forEach(([n,col,w])=>{if(!n)return;const rr=(n.kind==='industry'?n.r+4/k:nodeR(n,k)*1.3+4/k);ctx.globalAlpha=.95;ctx.strokeStyle=col;ctx.lineWidth=w*lw;ctx.beginPath();ctx.arc(n.x,n.y,rr,0,7);ctx.stroke();});
  ctx.restore();ctx.globalAlpha=1;
  skyLabels(nb);
  return anim;
}
function skyLabels(nb){const T=SKY.T,k=T.k;const F=SKY.focus,lit=SKY.lit;const cand=[];
  const seenL=new Set();const add=(n,pri,big)=>{if(!n||!visible(n)||seenL.has(n.id))return;seenL.add(n.id);const [x,y]=T.apply([n.x,n.y]);if(x<-50||y<-20||x>SKY.W+50||y>SKY.H+20)return;cand.push({n,x,y,pri,big});};
  if(F){add(F,100,true);(nb||[]).slice(0,26).forEach((q,i)=>add(q.n,60-i*.5+q.s*5,false));}
  if(lit){SKY.nodes.forEach(n=>{if(lit.has(n.id))add(n,50+(n.kind==='industry'?5:0),false);});if(SKY.litCenter)add(SKY.byId.get(SKY.litCenter),100,true);}
  if(SKY.cursor)add(SKY.cursor,95,true);if(SKY.hover)add(SKY.hover,90,false);
  if(SKY.layers.industry&&!F&&!lit)SKY.nodes.forEach(n=>{if(n.kind==='industry')add(n,40+n.r/10,false);});
  if(!F&&!lit&&(k>2||SKY.soloIds)&&!(quietSky()&&k<3.2))SKY.nodes.forEach(n=>{if(n.kind!=='industry'&&(n.r>3.2||SKY.soloIds))add(n,10+n.r,false);});
  cand.sort((a,b)=>b.pri-a.pri);const boxes=[];const ts=+P.text||1;
  ctx.textBaseline='middle';
  for(const c of cand.slice(0,90)){const n=c.n;ctx.globalAlpha=Math.max(.001,sa(n));const fs=(c.big?13.5:n.kind==='industry'?11.5:11)*ts;ctx.font=`${c.big?800:n.kind==='industry'?700:600} ${fs}px "Public Sans",system-ui,sans-serif`;
    const label=n.kind==='industry'?n.e.short:n.e.name;const w=ctx.measureText(label).width;
    const rr=n.kind==='industry'?n.r*T.k:6;let lx,ly,align;
    if(n.kind==='industry'){lx=c.x;ly=c.y;align='center';}else{lx=c.x+rr+5;ly=c.y;align='left';}
    const bx=align==='center'?lx-w/2-3:lx-3,by=ly-fs/2-2,bw=w+6,bh=fs+4;
    if(c.pri<90&&boxes.some(b=>bx<b[0]+b[2]&&bx+bw>b[0]&&by<b[1]+b[3]&&by+bh>b[1]))continue;boxes.push([bx,by,bw,bh]);
    ctx.textAlign=align;ctx.lineJoin='round';ctx.lineWidth=4;ctx.strokeStyle=ST.halo;ctx.strokeText(label,lx,ly);
    ctx.fillStyle=n.kind==='industry'?(c.big?ST.ink:F||lit?'rgba(214,230,245,.55)':'#D6E6F5'):c.big?ST.ink:ST.ink2;ctx.fillText(label,lx,ly);}
  ctx.globalAlpha=1;}
function hit(px,py){const [x,y]=SKY.T.invert([px,py]);const k=SKY.T.k;let best=null,bd=1e9;
  for(const n of SKY.nodes){if(n.kind==='industry'||!visible(n))continue;const dd=Math.hypot(n.x-x,n.y-y);if(dd<bd){bd=dd;best=n;}}
  if(best&&bd*k<=Math.max(14,nodeR(best,k)*k+6))return best;
  if(SKY.layers.industry)for(const n of SKY.nodes){if(n.kind==='industry'&&visible(n)&&Math.hypot(n.x-x,n.y-y)<=n.r+4/k)return n;}
  return null;}
function describe(n){const e=n.e;if(n.kind==='startup')return `${e.name}. Startup. ${subOf(e)}.${SKY.layers.sector?` Sector: ${n.sec.label}.`:''} ${plural(e.n.fit[2],'strong investor fit')}, ${plural(strongPeers(e),'strong founder match','strong founder matches')}.`;
  if(n.kind==='investor')return `${e.name}. Investor. ${subOf(e)}. ${plural(e.n.fit[2],'strong startup fit')}.`;
  return `${e.name}. Industry. ${e.companies} startups and ${e.funds} investors.`;}
function skyFocus(n,opts={}){if(SKY.focus&&SKY.focus!==n)SKY.prevFocus={n:SKY.focus,nb:neighbors(SKY.focus),t0:performance.now()};if(n)SKY.ripple={n,t0:performance.now(),col:n.kind==='investor'?ST.p:n.kind==='industry'?ST.b:ST.g};SKY.focus=n;SKY.cursor=null;SKY.t0=performance.now();if(n){if(opts.sheet===false)closeSheet();else renderSheet(n);if(opts.center!==false)skyFit(true,[n,...neighbors(n).slice(0,24).map(x=>x.n)]);say(describe(n)+' Press Enter for the full story.');}else{closeSheet(true);}skyRequest();}
/* pointer: tap focuses, hold or double tap opens the story. On a phone a tap only lights up the connections; hold, or tap the star again, for the details sheet */
const PHONE=()=>innerWidth<=900;let tapHinted=false;
let hold=null,drag=null,dragMoved=false;const HOLD_MS=650;
cv.addEventListener('pointerdown',e=>{if(e.button!==0)return;const r=cv.getBoundingClientRect();const n=hit(e.clientX-r.left,e.clientY-r.top);if(!n)return;
  drag={n,x:e.clientX,y:e.clientY,moved:false,id:e.pointerId};
  hold={n,x:e.clientX,y:e.clientY,fired:false,t:setTimeout(()=>{hold.fired=true;$('#holdRing').style.display='none';if(PHONE())skyFocus(n);else openStory(n.id);},HOLD_MS)};
  const ring=$('#holdRing');ring.style.left=(e.clientX-r.left)+'px';ring.style.top=(e.clientY-r.top)+'px';ring.style.display='block';const c=ring.querySelector('circle');const L=2*Math.PI*18;c.style.strokeDasharray=L;
  if(still()){c.style.strokeDashoffset=0;}else{c.animate([{strokeDashoffset:L},{strokeDashoffset:0}],{duration:HOLD_MS,fill:'forwards',easing:'linear'});}});
const cancelHold=()=>{if(hold){clearTimeout(hold.t);}$('#holdRing').style.display='none';};
cv.addEventListener('pointermove',e=>{if(hold&&Math.hypot(e.clientX-hold.x,e.clientY-hold.y)>7){cancelHold();hold=null;}
  if(drag){if(!drag.moved&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>6){drag.moved=true;if(SKY.flow)soloFlowEnd();try{cv.setPointerCapture(drag.id);}catch(_){}$('#tip').style.display='none';if(!still()&&SKY.sim)SKY.sim.alphaTarget(.22).restart();}
    if(drag.moved){const r=cv.getBoundingClientRect();const [wx,wy]=SKY.T.invert([e.clientX-r.left,e.clientY-r.top]);drag.n.fx=wx;drag.n.fy=wy;if(still()||!SKY.sim){drag.n.x=wx;drag.n.y=wy;}cv.style.cursor='grabbing';skyRequest();if(NET.mode==='linked')klRays();return;}}
  if(e.pointerType==='mouse'){const r=cv.getBoundingClientRect();const n=hit(e.clientX-r.left,e.clientY-r.top);if(n!==SKY.hover){SKY.hover=n;SKY.hoverT0=performance.now();skyRequest();const tip=$('#tip');if(n){tip.innerHTML=`${esc(n.e.name)}<small>${esc(n.kind==='industry'?subOf(n.e):kindWord[n.kind]+' · '+subOf(n.e))}</small>`;tip.style.display='block';}else tip.style.display='none';cv.style.cursor=n?'pointer':'';}
    if(n){const tip=$('#tip');tip.style.left=(e.clientX-r.left)+'px';tip.style.top=(e.clientY-r.top)+'px';}}});
cv.addEventListener('pointerleave',()=>{SKY.hover=null;$('#tip').style.display='none';skyRequest();});
['pointerup','pointercancel'].forEach(t=>cv.addEventListener(t,()=>{cancelHold();if(drag){if(drag.moved){dragMoved=true;drag.n.fx=null;drag.n.fy=null;if(SKY.sim&&!still())SKY.sim.alphaTarget(P.motion==='live'?.012:0);cv.style.cursor='';}drag=null;}}));
cv.addEventListener('click',e=>{$('#tip').style.display='none';if(dragMoved){dragMoved=false;hold=null;return;}if(hold&&hold.fired){hold=null;return;}hold=null;const r=cv.getBoundingClientRect();const n=hit(e.clientX-r.left,e.clientY-r.top);
  if(NET.mode==='linked'){if(n)klPick(n.id);return;}
  if(pendTap&&performance.now()-pendTap.t<360){clearTimeout(pendTap.timer);const pn=pendTap.n;pendTap=null;openStory(pn.id);return;}
  if(n){const t0=performance.now();if(n===SKY.focus){pendTap={n,t:t0,timer:setTimeout(()=>{pendTap=null;if(PHONE()&&!$('#sheet').classList.contains('show'))skyFocus(n);},360)};return;}
    SKY.ripple={n,t0,col:n.kind==='investor'?ST.p:n.kind==='industry'?ST.b:ST.g};skyRequest();
    pendTap={n,t:t0,timer:setTimeout(()=>{pendTap=null;if(PHONE()){skyFocus(n,{sheet:false});if(!tapHinted){tapHinted=true;toast('Tap again or hold for details. Tap empty space to go back.');}}else skyFocus(n);},250)};}
  else if(SKY.focus){if(PHONE()&&$('#sheet').classList.contains('show'))closeSheet();else skyFocus(null);}});
let pendTap=null;
/* keyboard */
function stops(){if(SKY.lit)return [...SKY.lit].map(id=>SKY.byId.get(id)).filter(Boolean);if(SKY.focus)return [SKY.focus,...neighbors(SKY.focus).map(x=>x.n)];return SKY.nodes.filter(n=>n.kind==='industry'&&visible(n)).sort((a,b)=>b.e.companies-a.e.companies);}
cv.addEventListener('keydown',e=>{const k=e.key;const T=SKY.T;const step=60;
  if(k===']'||k==='['){e.preventDefault();const s=stops();if(!s.length)return;let i=s.indexOf(SKY.cursor||SKY.focus);i=k===']'?(i+1)%s.length:(i<=0?s.length-1:i-1);SKY.cursor=s[i];say(describe(s[i])+(s[i]===SKY.focus?' Selected.':' Press Enter to select.'));skyRequest();return;}
  if(k==='Enter'||k===' '){e.preventDefault();const n=SKY.cursor||SKY.focus;if(!n)return;if(n===SKY.focus&&!SKY.cursor){openStory(n.id);return;}if(NET.mode==='linked'){klPick(n.id);return;}if(n===SKY.focus){SKY.cursor=null;openStory(n.id);return;}skyFocus(n);return;}
  if(k==='Escape'){if(SKY.cursor){SKY.cursor=null;skyRequest();return;}if(SKY.focus){e.preventDefault();skyFocus(null);say(SKY.soloIds?'Cleared. Press Escape again to show everyone.':'Cleared. Showing everyone.');return;}if(SKY.soloIds){e.preventDefault();soloSet(new Set());}return;}
  if((k==='s'||k==='S')&&!e.metaKey&&!e.ctrlKey&&!e.altKey){const n=SKY.cursor||SKY.focus;if(!n)return;e.preventDefault();const id=n.kind==='industry'?n.id:n.inds[0];if(id)soloToggleInd(id);return;}
  if(k==='ArrowLeft'||k==='ArrowRight'||k==='ArrowUp'||k==='ArrowDown'){e.preventDefault();const dx=k==='ArrowLeft'?step:k==='ArrowRight'?-step:0,dy=k==='ArrowUp'?step:k==='ArrowDown'?-step:0;csel.call(zoom.translateBy,dx/T.k,dy/T.k);return;}
  if(k==='+'||k==='='){e.preventDefault();csel.call(zoom.scaleBy,1.3);return;}
  if(k==='-'||k==='_'){e.preventDefault();csel.call(zoom.scaleBy,1/1.3);return;}
  if(k==='0'){e.preventDefault();skyFit(true);return;}
  });
cv.addEventListener('focus',()=>{if(!SKY.focus&&!SKY.cursor)say(skySummary());});
function skySummary(){return `Network map. ${D.companies.length} startups shown as green circles and ${D.funds.length} investors shown as purple hexagons, grouped around ${SKY.nodes.filter(n=>n.kind==='industry').length} industries. Press the right bracket key to move between industries, Enter to select.`;}
cv.setAttribute('aria-label',`VC Fest 26 network map: ${D.companies.length} startups and ${D.funds.length} investors`);
$('#zIn').onclick=()=>csel.transition().duration(still()?0:300).call(zoom.scaleBy,1.4);
$('#zOut').onclick=()=>csel.transition().duration(still()?0:300).call(zoom.scaleBy,1/1.4);
$('#zFit').onclick=()=>{if(NET.mode==='linked')klFitLit();else skyFit(true);};
$('#zKey').onclick=()=>{const b=$('#zKey'),on=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',String(on));b.setAttribute('aria-label',on?'Hide the key':'Show the key');$('#sky').classList.toggle('key-on',on);};
/* panel */
$$('#skyPanel [data-layer]').forEach(b=>b.onclick=()=>{const L=b.dataset.layer;SKY.layers[L]=!SKY.layers[L];if(L==='sector'){renderLegend();renderSolo();say(SKY.layers.sector?'Colored by sector: '+SECTORS.map(s=>s.label).join(', ')+'.':'Sector colors off.');}if(L==='industry'&&SKY.layers[L])SKY.edgeT0=performance.now();b.setAttribute('aria-checked',String(SKY.layers[L]));if(SKY.focus&&!visible(SKY.focus))skyFocus(null);else if(SKY.focus)renderSheet(SKY.focus);skyRequest();});
$('#skyStages').innerHTML=STAGES.map(s=>`<button aria-pressed="false" data-st="${esc(s)}">${esc(s)}</button>`).join('');
$$('#skyStages button').forEach(b=>b.onclick=()=>{const s=b.dataset.st;if(SKY.stages.has(s))SKY.stages.delete(s);else SKY.stages.add(s);b.setAttribute('aria-pressed',String(SKY.stages.has(s)));say(SKY.stages.size?'Showing '+[...SKY.stages].join(' and ')+' only.':'Showing every stage.');skyRequest();});
$$('[data-motion-seg] button').forEach(b=>b.onclick=()=>{P.motion=b.dataset.mo;savePrefs();applyPrefs();if(still())simSleep();else simWake(.05);skyRequest();});
function openPanel(v,quiet){const p=$('#skyPanel');const was=p.classList.contains('open');p.classList.toggle('open',v);$('#panelOpen').setAttribute('aria-expanded',String(v));$('#panelScrim').hidden=!v;
  if(quiet||was===v)return;if(v&&innerWidth<=1180)requestAnimationFrame(()=>$('#skyPanel [data-panel-close]').focus({preventScroll:true}));else if(!v)$('#panelOpen').focus({preventScroll:true});}
$('#panelScrim').onclick=()=>openPanel(false);$('#skyPanel [data-panel-close]').onclick=()=>openPanel(false);
$('#panelOpen').onclick=()=>openPanel(!$('#skyPanel').classList.contains('open'));
/* ---------- solo: one category and its network, everything else fades away ----------
   Like the solo button on a mixing board: pick one or more categories and only they play.
   A category brings its startups and the investors who back it. */
Object.assign(SKY,{solo:new Set(),soloIds:null,soloOld:null,soloT0:0,soloQ:1,soloKey:'',home:null,flow:null});
function secInds(key){return SKY.nodes.filter(n=>n.kind==='industry'&&n.sec.key===key).map(n=>n.id);}
function soloMembers(set){if(!set.size)return null;const ids=new Set();SKY.nodes.forEach(n=>{if(n.inds.some(i=>set.has(i)))ids.add(n.id);});return ids;}
function bboxAt(ns,tgt){let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;ns.forEach(n=>{const p=tgt.get(n)||[n.x,n.y];x0=Math.min(x0,p[0]-n.r);y0=Math.min(y0,p[1]-n.r);x1=Math.max(x1,p[0]+n.r);y1=Math.max(y1,p[1]+n.r);});return {x0,y0,x1,y1};}
function soloFlowEnd(){const FL=SKY.flow;if(!FL)return;FL.items.forEach(o=>{o.n.x=o.x1;o.n.y=o.y1;o.n.vx=0;o.n.vy=0;});SKY.flow=null;if(!SKY.soloIds)SKY.home=null;simWake(.02);skyRequest();}
function soloSet(next,opts={}){const sim=SKY.sim;if(!sim)return;
  SKY.flow=null; // a new pick mid-glide starts from wherever everyone is right now
  const was=SKY.soloIds,ids=soloMembers(next);SKY.solo=new Set(next);
  if(!was&&!ids){renderSolo();return;}
  if(!was&&ids&&!SKY.home)SKY.home=new Map(SKY.nodes.map(n=>[n.id,[n.x,n.y]]));
  SKY.soloOld=was;SKY.soloIds=ids;SKY.soloKey=[...next].sort().join();SKY.soloT0=opts.instant?0:performance.now();
  if(SKY.focus)skyFocus(null);SKY.cursor=null;
  sim.stop();let ns,tgt;
  if(ids){ns=SKY.nodes.filter(n=>ids.has(n.id));const ls=SKY.links.filter(l=>ids.has(l.source.id)&&ids.has(l.target.id));
    // pull each star only toward the categories that are playing, so the group forms cleanly
    const cnt=new Map();ls.forEach(l=>cnt.set(l.source.id,(cnt.get(l.source.id)||0)+1));ls.forEach(l=>{l.ss=(l.source.kind==='startup'?.7:.6)/cnt.get(l.source.id);});
    const hubs=ns.filter(n=>n.kind==='industry');sim.force('x').x(d3.mean(hubs,n=>n.x));sim.force('y').y(d3.mean(hubs,n=>n.y));
    sim.force('link').links(ls);sim.nodes(ns);
    // work out where everyone settles, then put them back and glide them there
    const start=new Map(ns.map(n=>[n,[n.x,n.y]]));
    // seed a clean orbit: startups close to their category, investors further out, each keeping its side of the sky so nobody crosses paths
    const groups=new Map();ns.forEach(n=>{if(n.kind==='industry')return;const own=n.inds.filter(i=>next.has(i));const key=own.sort().join('|');if(!groups.has(key))groups.set(key,{hubs:own.map(i=>SKY.byId.get(i)),ns:[]});groups.get(key).ns.push(n);});
    groups.forEach(g=>{const cx=d3.mean(g.hubs,h=>h.x),cy=d3.mean(g.hubs,h=>h.y);['startup','investor'].forEach(kind=>{const arr=g.ns.filter(n=>n.kind===kind).sort((a,b)=>Math.atan2(a.y-cy,a.x-cx)-Math.atan2(b.y-cy,b.x-cx));
      const R=(kind==='startup'?38:92)+Math.sqrt(arr.length)*(kind==='startup'?5:4);const a0=arr.length?Math.atan2(arr[0].y-cy,arr[0].x-cx):0;arr.forEach((n,i)=>{const a=a0+i/arr.length*Math.PI*2;n.x=cx+R*Math.cos(a);n.y=cy+R*Math.sin(a);n.vx=0;n.vy=0;});});});
    sim.alpha(.7);for(let i=0;i<200;i++)sim.tick();
    tgt=new Map(ns.map(n=>[n,[n.x,n.y]]));ns.forEach(n=>{const p=start.get(n);n.x=p[0];n.y=p[1];n.vx=0;n.vy=0;});}
  else{ns=SKY.nodes;sim.force('x').x(0);sim.force('y').y(0);sim.force('link').links(SKY.links);sim.nodes(ns);
    tgt=new Map(ns.map(n=>{const h=SKY.home&&SKY.home.get(n.id);return [n,h||[n.x,n.y]];}));}
  const instant=opts.instant||still();
  skyFit(!instant,ns,{box:bboxAt(ns,tgt),whole:true,dur:860,ease:d3.easeCubicInOut});
  if(instant){tgt.forEach((p,n)=>{n.x=p[0];n.y=p[1];n.vx=0;n.vy=0;});SKY.flow=null;if(!ids)SKY.home=null;simWake(.02);}
  else SKY.flow={t0:performance.now(),dur:860,items:[...tgt].map(([n,p])=>({n,x0:n.x,y0:n.y,x1:p[0],y1:p[1]}))};
  NBC={k:null,v:null};renderSolo();skyRequest();
  if(!opts.quiet)say(ids?`Solo: ${soloGroups().map(g=>g.t).join(', ')}. ${soloCounts()}.`:'Showing everyone.');}
function soloToggleInd(id){const next=new Set(SKY.solo);next.has(id)?next.delete(id):next.add(id);soloSet(next);}
function soloToggleSec(key){const ids=secInds(key);const next=new Set(SKY.solo);const all=ids.every(i=>next.has(i));ids.forEach(i=>all?next.delete(i):next.add(i));soloSet(next);}
// name whole sectors when every industry in them is playing, single industries otherwise
function soloGroups(set=SKY.solo){const out=[],left=new Set(set);
  SECTORS.forEach(s=>{const ids=secInds(s.key);if(ids.length>1&&ids.every(i=>left.has(i))){out.push({t:s.label,col:s.col,ids});ids.forEach(i=>left.delete(i));}});
  left.forEach(i=>{const n=SKY.byId.get(i);if(n)out.push({t:n.e.short,col:n.sec.col,ids:[i]});});return out;}
function soloTally(set){const ids=soloMembers(set);if(!ids)return null;let c=0,f=0;ids.forEach(id=>{const n=SKY.byId.get(id);if(n.kind==='startup')c++;else if(n.kind==='investor')f++;});return {c,f};}
function soloCounts(set=SKY.solo){const t=soloTally(set);if(!t)return '';return `${plural(t.c,'startup')} and ${plural(t.f,'investor')} who back ${soloGroups(set).length>1?'them':'it'}`;}
/* the picker: the bar on the sky opens one list of sectors with their industries tucked under each */
const SOLO_UI={open:false,pending:null,t:0,exp:new Set(),q:''};
function soloBarPos(){const b=$('#soloBar');if(!b)return;const W=SKY.W||$('#sky').clientWidth;
  if(innerWidth<=900){const f=$('#panelOpen');const l=12+(f&&f.offsetWidth?f.offsetWidth+8:0);Object.assign(b.style,{left:l+'px',right:'12px',top:'12px',transform:'none',maxWidth:''});}
  else{const l=panelW()+(panelW()?16:0),r=sheetW();const free=W-l-r;Object.assign(b.style,{right:'auto',top:'16px',left:(l+free/2)+'px',transform:'translateX(-50%)',maxWidth:Math.max(240,free-32)+'px'});}
  if(SOLO_UI.open)soloPopPos();}
function soloPopPos(){const p=$('#soloPop'),b=$('#soloBar');if(innerWidth<=900){Object.assign(p.style,{left:'0',right:'0',top:'auto',bottom:'0'});return;}
  const W=SKY.W||$('#sky').clientWidth;const l=panelW()+(panelW()?16:0),r=sheetW();const bb=b.getBoundingClientRect(),sb=$('#sky').getBoundingClientRect();const pw=Math.min(380,W-l-r-24);
  const x=l+12;Object.assign(p.style,{left:x+'px',right:'auto',bottom:'auto',top:(bb.bottom-sb.top+8)+'px',width:pw+'px'});}
function renderSolo(){const on=SKY.solo.size>0;const val=$('#soloVal');const g=soloGroups();
  val.textContent=on?(g.length===1?g[0].t:`${g[0].t} + ${g.length-1} more`):'Pick a sector';val.classList.toggle('idle',!on);
  $('#soloDots').innerHTML=on&&SKY.layers.sector?g.slice(0,3).map(x=>`<i style="background:${x.col}"></i>`).join(''):'';
  $('#soloTrig').setAttribute('aria-label',on?`Solo: ${g.map(x=>x.t).join(', ')}. ${soloCounts()}. Change`:'Solo a sector or industry');
  $('#soloX').hidden=!on;
  const sb=$('#sheet [data-solo-ind]');if(sb){const p=SKY.solo.has(sb.dataset.soloInd);sb.setAttribute('aria-pressed',String(p));sb.textContent=p?'Unsolo':'Solo';}
  if(SOLO_UI.open){SOLO_UI.pending=new Set(SKY.solo);soloSync();}
  soloBarPos();}
function soloBuild(){const count=ids=>SKY.nodes.filter(n=>n.kind==='startup'&&n.inds.some(i=>ids.includes(i))).length;
  $('#soloList').innerHTML=SECTORS.map(s=>{const inds=SKY.nodes.filter(n=>n.kind==='industry'&&n.sec.key===s.key).sort((a,b)=>b.e.companies-a.e.companies);if(!inds.length)return '';
    const one=inds.length===1,sc=count(inds.map(n=>n.id));
    return `<div class="sg" data-sec="${s.key}"><div class="so-row sec" data-q="${esc(s.label.toLowerCase())}"><input class="so-cb" type="checkbox" id="soS-${s.key}" data-solo-sec="${s.key}"><label for="soS-${s.key}"><i class="sdot" style="background:${s.col}" aria-hidden="true"></i><span class="nm">${esc(s.label)}</span><span class="sr">, ${plural(sc,'startup')}</span></label>${one?'':`<button class="so-more" aria-expanded="false" aria-controls="soI-${s.key}" aria-label="${inds.length} industries in ${esc(s.label)}">${inds.length} industries</button>`}<span class="ct" aria-hidden="true">${sc}</span></div>
      ${one?'':`<div class="sg-inds" id="soI-${s.key}" hidden>${inds.map(n=>{const c=count([n.id]);return `<div class="so-row ind" data-q="${esc((n.e.name+' '+n.e.short).toLowerCase())}"><input class="so-cb" type="checkbox" id="soC-${n.id}" data-solo-i="${n.id}"><label for="soC-${n.id}"><span class="nm">${esc(n.e.short)}</span><span class="sr">, ${plural(c,'startup')}</span></label><span class="ct" aria-hidden="true">${c}</span></div>`;}).join('')}</div>`}</div>`;}).join('')+'<p class="so-empty" id="soEmpty" hidden></p>';
  $$('#soloList [data-solo-sec]').forEach(cb=>cb.onchange=()=>{const ids=secInds(cb.dataset.soloSec);const p=new Set(SOLO_UI.pending||SKY.solo);const all=ids.every(i=>p.has(i));ids.forEach(i=>all?p.delete(i):p.add(i));if(!all)SOLO_UI.exp.add(cb.dataset.soloSec);soloChange(p);});
  $$('#soloList [data-solo-i]').forEach(cb=>cb.onchange=()=>{const p=new Set(SOLO_UI.pending||SKY.solo);cb.checked?p.add(cb.dataset.soloI):p.delete(cb.dataset.soloI);soloChange(p);});
  $$('#soloList .so-more').forEach(b=>b.onclick=()=>{const k=b.closest('.sg').dataset.sec;SOLO_UI.exp.has(k)?SOLO_UI.exp.delete(k):SOLO_UI.exp.add(k);soloSync();
    const box=$('#soI-'+k);if(!box.hidden&&!still())box.animate([{opacity:0,transform:'translateY(-4px)'},{opacity:1,transform:'none'}],{duration:200,easing:'cubic-bezier(.22,1,.36,1)'});});
  renderSolo();}
function soloSync(){const p=SOLO_UI.pending||SKY.solo;$('#soloPop').classList.toggle('secol',!!SKY.layers.sector);
  $$('#soloList [data-solo-sec]').forEach(cb=>{const ids=secInds(cb.dataset.soloSec);const n=ids.filter(i=>p.has(i)).length;cb.checked=n>0&&n===ids.length;cb.indeterminate=n>0&&n<ids.length;});
  $$('#soloList [data-solo-i]').forEach(cb=>{cb.checked=p.has(cb.dataset.soloI);});
  $$('#soloList .sg').forEach(g=>{const box=$('.sg-inds',g);if(!box)return;const open=SOLO_UI.exp.has(g.dataset.sec)||!!SOLO_UI.q;box.hidden=!open;const b=$('.so-more',g);b.setAttribute('aria-expanded',String(open));b.textContent=open&&!SOLO_UI.q?'Hide':`${$$('.so-row.ind',g).length} industries`;});
  const t=soloTally(p);$('#soloCnt').textContent=t?`${plural(t.c,'startup')} · ${plural(t.f,'investor')}`:'Nothing picked yet';
  $('#soloClr').hidden=!p.size;$('#soloDone').textContent=innerWidth<=900?(t?`Show ${plural(t.c,'startup')}`:'Close'):'Done';}
function soloChange(p){SOLO_UI.pending=p;soloSync();clearTimeout(SOLO_UI.t);SOLO_UI.t=setTimeout(soloCommit,380);}
function soloCommit(){clearTimeout(SOLO_UI.t);SOLO_UI.t=0;const p=SOLO_UI.pending;if(!p)return;if(p.size===SKY.solo.size&&[...p].every(i=>SKY.solo.has(i)))return;soloSet(new Set(p));}
function soloFilter(raw){const q=SOLO_UI.q=raw.trim().toLowerCase();let any=false;
  $$('#soloList .sg').forEach(g=>{const sec=$('.so-row.sec',g);if(!q){g.hidden=false;$$('.so-row',g).forEach(r=>r.hidden=false);any=true;return;}
    const secHit=sec.dataset.q.includes(q);let hit=secHit;$$('.so-row.ind',g).forEach(r=>{const h=secHit||r.dataset.q.includes(q);r.hidden=!h;if(h)hit=true;});g.hidden=!hit;if(hit)any=true;});
  const e=$('#soEmpty');e.hidden=any;e.textContent=any?'':`No sector or industry matches "${raw.trim()}".`;soloSync();}
function soloOpen(){if(SOLO_UI.open)return;if(SKY.focus)skyFocus(null);SOLO_UI.open=true;SOLO_UI.pending=new Set(SKY.solo);$('#soloQ').value='';SOLO_UI.q='';soloFilter('');
  SOLO_UI.exp=new Set(SECTORS.filter(x=>secInds(x.key).some(i=>SKY.solo.has(i))).map(x=>x.key));soloSync();
  const pop=$('#soloPop'),mob=innerWidth<=900;pop.hidden=false;soloPopPos();$('#soloTrig').setAttribute('aria-expanded','true');$('#soloList').scrollTop=0;
  if(mob)$('#soloScrim').hidden=false;
  if(!still()){pop.animate(mob?[{transform:'translateY(100%)'},{transform:'none'}]:[{opacity:0,transform:'translateY(6px)',filter:'blur(2px)'},{opacity:1,transform:'none',filter:'blur(0)'}],{duration:mob?320:220,easing:'cubic-bezier(.22,1,.36,1)'});if(mob)$('#soloScrim').animate([{opacity:0},{opacity:1}],{duration:220});}
  requestAnimationFrame(()=>{$('#soloQ').focus({preventScroll:true});if(SKY.soloIds&&!mob)skyFit(true,null,{whole:true});});}
function soloClose(ret=true,instant=false){if(!SOLO_UI.open)return;SOLO_UI.open=false;const before=SKY.soloKey;soloCommit();if(SKY.soloIds&&SKY.soloKey===before&&innerWidth>900)skyFit(true,null,{whole:true});SOLO_UI.pending=null;const pop=$('#soloPop'),sc=$('#soloScrim'),mob=innerWidth<=900;$('#soloTrig').setAttribute('aria-expanded','false');
  const done=()=>{if(!SOLO_UI.open){pop.hidden=true;sc.hidden=true;}};
  if(still()||instant)done();else{pop.animate(mob?[{transform:'none'},{transform:'translateY(100%)'}]:[{opacity:1},{opacity:0,transform:'translateY(4px)'}],{duration:mob?240:140,easing:'ease-in'}).onfinish=done;if(mob&&!sc.hidden)sc.animate([{opacity:1},{opacity:0}],{duration:200});}
  if(ret)$('#soloTrig').focus({preventScroll:true});}
$('#soloTrig').onclick=()=>SOLO_UI.open?soloClose():soloOpen();
$('#soloX').onclick=()=>{if(SOLO_UI.open){SOLO_UI.pending=new Set();soloSync();}soloSet(new Set());$('#soloTrig').focus({preventScroll:true});};
$('#soloClr').onclick=()=>{soloChange(new Set());$('#soloQ').focus({preventScroll:true});};
$('#soloDone').onclick=()=>soloClose();
$('#soloScrim').onclick=()=>soloClose(false);
$('#soloQ').addEventListener('input',e=>soloFilter(e.target.value));
$('#soloPop').addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if(e.target.id==='soloQ'&&e.target.value){e.target.value='';soloFilter('');return;}soloClose();return;}
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){const cbs=$$('#soloList .so-cb').filter(c=>c.offsetParent);if(!cbs.length)return;e.preventDefault();const i=cbs.indexOf(document.activeElement);const j=e.key==='ArrowDown'?(i<0?0:Math.min(cbs.length-1,i+1)):(i<=0?-1:i-1);if(j<0)$('#soloQ').focus();else cbs[j].focus();return;}
  if(e.key==='Enter'&&e.target.id==='soloQ'){e.preventDefault();const q=SOLO_UI.q;const row=$$('#soloList .so-row').find(r=>r.offsetParent&&(!q||r.dataset.q.includes(q)));const c=row&&$('.so-cb',row);if(c){c.click();c.focus();}}});
document.addEventListener('pointerdown',e=>{if(!SOLO_UI.open||innerWidth<=900)return;if(e.target.closest('#soloPop,#soloBar'))return;soloClose(false);},true);
$('#soloPop').addEventListener('focusout',e=>{if(!SOLO_UI.open||innerWidth<=900)return;const t=e.relatedTarget;if(t&&!t.closest('#soloPop,#soloBar'))soloClose(false);});
addEventListener('resize',()=>{soloBarPos();if(SOLO_UI.open)soloSync();});
/* search: one bar for the whole network, results grouped like a directory */
const PEOPLE=[];D.companies.forEach(c=>c.people.forEach(p=>PEOPLE.push({n:p.n,t:p.t,e:c})));D.funds.forEach(f=>f.people.forEach(p=>PEOPLE.push({n:p.n,t:p.t,e:f})));
let qSel=-1,qRes=[];
function qRender(){const inp=$('#netQ'),box=$('#netQList');const q=inp.value.trim().toLowerCase();
  if(!q){box.hidden=true;inp.setAttribute('aria-expanded','false');inp.removeAttribute('aria-activedescendant');qRes=[];return;}
  const rank=s=>{s=s.toLowerCase();return s===q?0:s.startsWith(q)?1:2;};const match=(arr,f)=>arr.filter(x=>f(x).toLowerCase().includes(q)).sort((a,b)=>rank(f(a))-rank(f(b)));
  const groups=[['Startups',match(D.companies,e=>e.name).slice(0,4).map(e=>({e,title:e.name,sub:subOf(e)}))],
    ['Investors',match(D.funds,e=>e.name).slice(0,4).map(e=>({e,title:e.name,sub:subOf(e)}))],
    ['Industries',match(D.industries.filter(i=>i.companies>0),e=>e.name).slice(0,3).map(e=>({e,title:e.name,sub:subOf(e)}))],
    ['People',match(PEOPLE_ALL,x=>x.name).slice(0,4).map(x=>({e:x,title:x.name,sub:[x.t,x.org.name].filter(Boolean).join(' · ')}))]].filter(g=>g[1].length)
    .map((g,i)=>[g,Math.min(...g[1].map(it=>rank(it.title))),i]).sort((a,b)=>a[1]-b[1]||a[2]-b[2]).map(x=>x[0]);
  qRes=groups.flatMap(g=>g[1]);qSel=qRes.length?0:-1;let k=0;
  box.innerHTML=(groups.length?groups.map(([lab,items])=>`<div role="group" aria-label="${lab}"><p class="nsr-h" aria-hidden="true">${lab}</p>${items.map(it=>{const i=k++;return `<div class="nsr-o" role="option" id="nq${i}" aria-selected="${i===qSel}" data-qi="${i}">${shape(it.e.kind==='person'?it.e.org.kind:it.e.kind)}<span class="nsr-t">${esc(it.title)}</span><span class="nsr-s">${esc(it.sub)}</span></div>`;}).join('')}</div>`).join(''):'<p class="nsr-empty">Nobody by that name at VC Fest 26.</p>')
    +'<p class="nsr-f" aria-hidden="true"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span></p>';
  box.hidden=false;inp.setAttribute('aria-expanded','true');if(qSel>=0)inp.setAttribute('aria-activedescendant','nq'+qSel);else inp.removeAttribute('aria-activedescendant');
  $$('[data-qi]',box).forEach(o=>o.onmousedown=ev=>{ev.preventDefault();qPick(+o.dataset.qi);});}
function qMove(d){if(!qRes.length)return;qSel=(qSel+d+qRes.length)%qRes.length;$$('#netQList [data-qi]').forEach(o=>o.setAttribute('aria-selected',String(+o.dataset.qi===qSel)));$('#netQ').setAttribute('aria-activedescendant','nq'+qSel);const o=$('#nq'+qSel);o&&o.scrollIntoView({block:'nearest'});}
function qPick(i){const it=qRes[i];if(!it)return;$('#netQ').value='';qRender();if(it.e.kind==='person'){openStory(it.e.id);return;}goTo(it.e.id);
  setTimeout(()=>{if(VIEW!=='network')return;if(NET.mode==='sky')cv.focus({preventScroll:true});else if(NET.mode!=='tree')kmRefocus(true);},60);}
function goTo(id){const e=ent(id);if(!e)return;setView('network');
  if(NET.mode==='index'){KM.stack=[{kind:'root'},{kind:e.kind,id:e.id}];KM.active=0;KM.page=0;kmRender();return;}
  if(NET.mode==='linked'){KM.stack=[{kind:'root'},{kind:e.kind,id:e.id}];KM.active=0;klRender();return;}
  if(NET.mode==='tree'){if(!trFind(id))openStory(id);return;}
  const n=SKY.byId.get(id);if(!n)return;
  if(SKY.soloIds&&!SKY.soloIds.has(n.id))soloSet(new Set(),{instant:true});
  if(!visible(n)){SKY.layers[n.kind]=true;SKY.stages.clear();$$('#skyStages button').forEach(b=>b.setAttribute('aria-pressed','false'));const b=$(`#skyPanel [data-layer="${n.kind}"]`);b&&b.setAttribute('aria-checked','true');}
  skyFocus(n);}
$('#netQ').addEventListener('input',qRender);$('#netQ').addEventListener('focus',()=>{if($('#netQ').value)qRender();});
$('#netQ').addEventListener('keydown',e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();qMove(e.key==='ArrowDown'?1:-1);}
  else if(e.key==='Enter'){e.preventDefault();qPick(qSel);}else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if($('#netQ').value){$('#netQ').value='';qRender();}}});
$('#netQ').addEventListener('blur',()=>setTimeout(()=>{$('#netQList').hidden=true;$('#netQ').setAttribute('aria-expanded','false');if(document.activeElement!==$('#netQ'))$('#netSearch').classList.remove('qopen');},150));
$('#netQ').addEventListener('focus',()=>$('#netSearch').classList.add('qopen'));
document.addEventListener('keydown',e=>{if(e.key!=='/'||VIEW!=='network'||$$('dialog[open]').length)return;const tg=e.target;if(tg&&(tg.tagName==='INPUT'||tg.tagName==='TEXTAREA'||tg.tagName==='SELECT'))return;e.preventDefault();$('#netQ').focus();});

