/* ---------- right drawer: a short, calm preview of whoever you tapped ---------- */
function renderSheet(n){const e=n.e,sh=$('#sheet');let body='';
  const lab=t=>`<p class="pf-lab">${esc(t)}</p>`;
  if(n.kind==='startup'){const f=(fitsC.get(e.id)||[]).slice(0,4),p=(peersC.get(e.id)||[]).slice(0,3);
    body=`${lab('Investors to meet')}${f.length?`<ul class="pl">${f.map(x=>fitRow(x,'c')).join('')}</ul>`:'<p class="pf-note">No investor on this list lines up yet.</p>'}${p.length?`${lab('Founders to meet')}<ul class="pl">${p.map(peerRow).join('')}</ul>`:''}`;}
  else if(n.kind==='investor'){const f=(fitsF.get(e.id)||[]).slice(0,5);body=`${lab('Startups to meet')}${f.length?`<ul class="pl">${f.map(x=>fitRow(x,'f')).join('')}</ul>`:'<p class="pf-note">No startup on this list lines up yet.</p>'}`;}
  else{const {cs,fs}=inInd(e.name);fs.sort((a,b)=>realInd(a).length-realInd(b).length);cs.sort((a,b)=>b.n.fit[2]-a.n.fit[2]);
    body=`${lab('Investors most focused here')}<ul class="pl">${fs.slice(0,4).map(f=>entRow(f,realInd(f).length<=5?'Focused':`Backs ${realInd(f).length} industries`)).join('')}</ul>${lab('Startups here')}<ul class="pl">${cs.slice(0,5).map(c=>entRow(c,[c.stages.join(', '),c.city].filter(Boolean).join(' · '))).join('')}</ul>`;}
  const av=n.kind==='industry'?avatars([{t:initials(e.short)}],'industry'):peopleAv(e);const wasOpen=sh.classList.contains('show');
  sh.innerHTML=`<div class="sh-top"><div class="grow">${av}</div><button class="done-btn" data-close-sheet>Done</button></div><div class="sh-body"><h2 class="sh-name" id="sheetTitle">${esc(dotName(e.name))}</h2><p class="sh-sent">${esc(sentence(e))}</p>${statusHTML(status(e))}${body}</div><div class="sh-act"><button class="btn pri" data-story="${e.id}">Open profile</button>${n.kind==='industry'?`<button class="btn solo-btn" data-solo-ind="${n.id}" aria-pressed="${SKY.solo.has(n.id)}">${SKY.solo.has(n.id)?'Unsolo':'Solo'}</button>`:''}<button class="btn" data-index="${e.id}">Explore in Index</button></div>`;
  sh.setAttribute('aria-labelledby','sheetTitle');sh.classList.add('show');shInit(wasOpen);
  wireRows(sh);$('[data-close-sheet]',sh).onclick=()=>{skyFocus(null);cv.focus();};{const sb=$('[data-solo-ind]',sh);if(sb)sb.onclick=()=>{soloToggleInd(sb.dataset.soloInd);cv.focus({preventScroll:true});};}soloBarPos();
  if(!still()){const tg=wasOpen?$('.sh-body',sh):sh;$$('.pl li',sh).forEach((li,i)=>li.style.animationDelay=`${80+Math.min(i,8)*40}ms`);if(wasOpen)tg.animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'none'}],{duration:320,easing:'cubic-bezier(.22,1,.36,1)'});}}
function closeSheet(){const sh=$('#sheet');if(typeof shStop==='function'){shStop();shChrome(0);}sh.classList.remove('show','dragging');sh.style.transform='';soloBarPos();}
/* ---------- the details sheet on a phone ----------
   It opens part way up. Pull it up to about three quarters of the screen, push it down to close it.
   It follows your finger, keeps gliding at the speed you let go, and the map moves with it so the star you picked stays in view. */
function shNat(sh){const h=sh.style.height,t=sh.style.transform;sh.style.height='auto';const n=sh.offsetHeight;sh.style.height=h;sh.style.transform=t;return n;}
function shDetents(){const sh=$('#sheet');const stage=SKY.H||$('#sky').clientHeight;const top=$('#sky').getBoundingClientRect().top;
  const nat=shNat(sh);const room=stage-Math.max(88,innerHeight*.25-top);  /* the top edge stops a quarter of the way down the screen, always leaving some map */
  SH.full=Math.round(Math.max(120,Math.min(room,nat)));SH.peek=Math.round(Math.min(SH.full,nat,Math.max(220,stage*.5)));}
function shChrome(p){const t=SH.full>SH.peek?Math.max(0,Math.min(1,(p-SH.peek)/Math.max(1,SH.full-SH.peek))):0;const o=1-Math.min(1,t*1.6);
  [$('.panel-min'),$('#soloBar')].forEach(el=>{if(!el)return;el.style.opacity=o<1?o.toFixed(3):'';el.style.pointerEvents=o<.5?'none':'';});}
/* the map rides with the sheet: the picked star keeps its place in the part of the map you can still see */
function shFollowStart(){csel.interrupt();SH.f=null;const n=SKY.focus;if(!n)return;const [x,y]=SKY.T.apply([n.x,n.y]);const free=SKY.H-SH.p;SH.f={T:SKY.T,y0:y,frac:Math.max(.2,Math.min(.8,y/Math.max(1,free)))};}
function shFollow(p){const f=SH.f;if(!f)return;const ny=f.frac*(SKY.H-p);const t=d3.zoomIdentity.translate(f.T.x,f.T.y+(ny-f.y0)).scale(f.T.k);momStop();csel.call(zoom.transform,t);}
function shApply(p){const sh=$('#sheet');SH.p=p;const h=Math.max(p,SH.peek);sh.style.height=h+'px';sh.style.transform=p<SH.peek?`translateY(${(SH.peek-p).toFixed(1)}px)`:'';
  const b=$('.sh-body',sh);if(b)b.style.overflowY=p>=SH.full-1?'auto':'hidden';shChrome(p);shFollow(p);}
function shStop(){if(SH.raf){cancelAnimationFrame(SH.raf);SH.raf=0;}}
function shGlide(to,v){shStop();const sh=$('#sheet');const from=SH.p,d=to-from;if(Math.abs(d)<1){shApply(to);sh.classList.remove('dragging');return;}
  if(still()){shApply(to);sh.classList.remove('dragging');return;}
  const ms=Math.max(180,Math.min(460,Math.abs(d)/Math.max(Math.abs(v)||0,.8)*2.2));const t0=performance.now();sh.classList.add('dragging');
  const step=now=>{const k=Math.min(1,(now-t0)/ms),e=1-Math.pow(1-k,4);shApply(from+d*e);if(k<1)SH.raf=requestAnimationFrame(step);else{SH.raf=0;sh.classList.remove('dragging');}};SH.raf=requestAnimationFrame(step);}
function shExpand(){if(!PHONE()||!$('#sheet').classList.contains('show'))return;shFollowStart();shGlide(SH.full,0);}
function shInit(keep){const sh=$('#sheet');if(!PHONE()){sh.style.height='';sh.style.transform='';shChrome(0);return;}
  const wasFull=keep&&SH.full>SH.peek&&SH.p>=SH.full-1;shStop();shDetents();SH.f=null;shApply(wasFull?SH.full:SH.peek);}
function shClose(ms){const sh=$('#sheet');shStop();sh.style.transition=`transform ${ms}ms cubic-bezier(.2,.75,.3,1),visibility 0s linear ${ms}ms`;closeSheet();setTimeout(()=>{sh.style.transition='';},ms+60);}
(function sheetDrag(){const sh=$('#sheet');let st=null;
  sh.addEventListener('touchstart',e=>{if(!PHONE()||!sh.classList.contains('show')||e.touches.length>1)return;const body=$('.sh-body',sh);
    const inBody=!!(body&&body.contains(e.target));
    if(!inBody||body.scrollTop<=0||SH.p<SH.full-1)st={y0:e.touches[0].clientY,p0:SH.p,on:false,inBody,top:(e.target===sh||!!e.target.closest('.sh-top'))&&!e.target.closest('button,a'),hist:[[e.timeStamp,SH.p]]};},{passive:true});
  sh.addEventListener('touchmove',e=>{if(!st)return;const y=e.touches[0].clientY,dy=y-st.y0;
    if(!st.on){if(Math.abs(dy)<8)return;
      if(st.inBody&&dy<0&&SH.p>=SH.full-1){st=null;return;}  /* at the top already: an upward drag scrolls the text */
      st.on=true;st.y0+=dy>0?8:-8;st.p0=SH.p;shStop();sh.classList.add('dragging');shFollowStart();}
    e.preventDefault();let p=st.p0-(y-st.y0);if(p>SH.full)p=SH.full+(p-SH.full)*.22;if(p<0)p=0;
    shApply(p);st.hist.push([e.timeStamp,p]);if(st.hist.length>6)st.hist.shift();},{passive:false});
  const end=e=>{if(!st)return;const s0=st;st=null;
    if(!s0.on){if(s0.top&&e.type==='touchend'&&SH.full>SH.peek){shFollowStart();shGlide(SH.p>=SH.full-1?SH.peek:SH.full,0);}return;}
    const h=s0.hist,a=h[0],b=h[h.length-1];const rest=(e&&e.timeStamp||b[0])-b[0];const v=rest>90?0:(b[1]-a[1])/Math.max(8,b[0]-a[0]);  /* px per ms, up is positive */
    const proj=SH.p+v*180;  /* where the glide would carry it */
    if(SH.p<SH.peek-80||proj<SH.peek*.6||v<-.5&&SH.p<SH.peek){shClose(Math.round(Math.max(140,Math.min(340,SH.p/Math.max(-v,.9)))));return;}
    const to=Math.abs(proj-SH.full)<Math.abs(proj-SH.peek)?SH.full:SH.peek;shGlide(to,v);};
  sh.addEventListener('touchend',end);sh.addEventListener('touchcancel',end);
  /* reading with a keyboard or screen reader opens it all the way */
  sh.addEventListener('focusin',e=>{const b=$('.sh-body',sh);if(PHONE()&&b&&b.contains(e.target)&&SH.p<SH.full-1)shExpand();});
  addEventListener('resize',()=>{if(!sh.classList.contains('show')||!PHONE()){sh.style.height='';shChrome(0);return;}shInit(true);});})();
function wireRows(root){
  $$('[data-open]',root).forEach(r=>{if(r.dataset.open==='about'||r.dataset.open==='access')return;r.onclick=ev=>{ev.stopPropagation();openStory(r.dataset.open);};});
  $$('[data-fit]',root).forEach(r=>r.onclick=()=>{const [f,c]=r.dataset.fit.split('|');openMatchStory('fit',f,c);});
  $$('[data-pair]',root).forEach(r=>r.onclick=()=>{const [a,b]=r.dataset.pair.split('|');openMatchStory('pair',a,b);});
  $$('[data-draft-fit]',root).forEach(b=>b.onclick=ev=>{ev.stopPropagation();const [f,c]=b.dataset.draftFit.split('|');openDraft('fit',f,c);});
  $$('[data-draft-pair]',root).forEach(b=>b.onclick=ev=>{ev.stopPropagation();const [a,c]=b.dataset.draftPair.split('|');openDraft('pair',a,c);});
  $$('[data-story]',root).forEach(b=>b.onclick=()=>openStory(b.dataset.story));
  $$('[data-index]',root).forEach(b=>b.onclick=()=>{closeDialogs();openInIndex(b.dataset.index);});
  $$('[data-sky]',root).forEach(b=>b.onclick=()=>{closeDialogs();showInSky(b.dataset.sky);});
  $$('[data-agenda]',root).forEach(b=>b.onclick=ev=>{ev.stopPropagation();agGo(b.dataset.agenda);});
  $$('[data-psave]',root).forEach(b=>b.onclick=()=>{const id=b.dataset.psave;const on=!SAVED.has(id);on?SAVED.add(id):SAVED.delete(id);saveSaved();b.setAttribute('aria-pressed',String(on));$('span',b).textContent=on?'Saved':'Save';say(on?'Saved.':'Removed from saved.');if(PD.built)pdRender(false);});}

