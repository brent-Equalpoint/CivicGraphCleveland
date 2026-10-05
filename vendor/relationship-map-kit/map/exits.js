/* ---------- easy ways out ----------
   Every screen that slides over the page has a Done button and closes when you tap outside it.
   On a phone, sheets also slide away when you swipe them down, and the phone's back gesture
   closes the open screen instead of leaving the site. */
function swipeDown(el,{when,scroller,close}){let st=null;
  el.addEventListener('touchstart',e=>{if(!when()||e.touches.length>1)return;const sc=scroller&&scroller();
    const head=e.target.closest('.pn-top,.rail-top,.solo-q,.so-head');
    if(head||!sc||sc.scrollTop<=0||!sc.contains(e.target))st={y0:e.touches[0].clientY,dy:0,on:false,h:[[e.timeStamp,0]]};},{passive:true});
  el.addEventListener('touchmove',e=>{if(!st)return;const dy=e.touches[0].clientY-st.y0;
    if(!st.on){if(dy>8){st.on=true;el.style.transition='none';}else if(dy<-8){st=null;return;}else return;}
    e.preventDefault();st.dy=Math.max(0,dy-8);el.style.transform=`translateY(${st.dy}px)`;st.h.push([e.timeStamp,st.dy]);if(st.h.length>6)st.h.shift();},{passive:false});
  const end=e=>{if(!st)return;const s0=st;st=null;if(!s0.on)return;const h=s0.h,a=h[0],b=h[h.length-1];const rest=(e&&e.timeStamp||b[0])-b[0];const v=rest>90?0:(b[1]-a[1])/Math.max(8,b[0]-a[0]);
    if(s0.dy>90||v>.5){close(Math.round(Math.max(140,Math.min(340,(el.offsetHeight-s0.dy)/Math.max(v,.9)))));}
    else{el.style.transition='transform .24s cubic-bezier(.22,1,.36,1)';el.style.transform='';setTimeout(()=>{if(!st)el.style.transition='';},260);}};
  el.addEventListener('touchend',end);el.addEventListener('touchcancel',end);}
(function(){const p=$('#skyPanel');
  swipeDown(p,{when:()=>PHONE()&&p.classList.contains('open'),scroller:()=>p,close:ms=>{p.style.transition=`transform ${ms}ms cubic-bezier(.2,.75,.3,1),visibility 0s linear ${ms}ms`;p.style.transform='';openPanel(false);setTimeout(()=>{p.style.transition='';},ms+60);}});
  const pop=$('#soloPop');
  swipeDown(pop,{when:()=>PHONE()&&SOLO_UI.open,scroller:()=>$('#soloList'),close:ms=>{pop.style.transition=`transform ${ms}ms cubic-bezier(.2,.75,.3,1)`;pop.style.transform='translateY(104%)';
    if(!still())$('#soloScrim').animate([{opacity:1},{opacity:0}],{duration:ms});setTimeout(()=>{soloClose(false,true);pop.style.transition='';pop.style.transform='';},ms);}});})();
/* the back gesture: each open screen gets a step in the browser's history, and going back closes the top one */
const LAYERS=[];let popSkip=0;
try{if(history.state&&history.state.flx)history.replaceState(null,'');}catch(_){}
const LAYER_DEFS=[
  {id:'story',isOpen:()=>{const d=$('#story');return d.open&&!d.classList.contains('pf-out');},back:()=>{const b=$('#pfTop .pf-back');if(b)b.click();else closeProfile();}},
  ...['aboutDlg','accessDlg','dictDlg','draftDlg'].map(id=>({id,isOpen:()=>$('#'+id).open,back:()=>$('#'+id).close()})),
  {id:'solo',isOpen:()=>SOLO_UI.open,back:()=>soloClose(false)},
  {id:'panel',isOpen:()=>innerWidth<=1180&&$('#skyPanel').classList.contains('open'),back:()=>openPanel(false)},
  {id:'pdRail',isOpen:()=>innerWidth<=1000&&$('#pdRail').classList.contains('open'),back:()=>RAILS.pd&&RAILS.pd(false)},
  {id:'agRail',isOpen:()=>innerWidth<=1000&&$('#agRail').classList.contains('open'),back:()=>RAILS.ag&&RAILS.ag(false)},
  {id:'sheet',isOpen:()=>PHONE()&&$('#sheet').classList.contains('show'),back:()=>closeSheet()},
  {id:'menu',isOpen:()=>!!$('#topMenu')&&!$('#topMenu').hidden,back:()=>menuSet(false)}];
function layerPush(L){LAYERS.push(L);try{history.pushState({flx:L.id},'');}catch(_){}}
function layerSync(){
  for(let i=LAYERS.length-1;i>=0;i--){if(!LAYERS[i].isOpen())LAYERS.splice(i,1);}
  /* standing on a step for a screen that's already closed: step back past it quietly, so no back press is ever wasted */
  const st=history.state;if(!popSkip&&st&&st.flx&&!LAYERS.some(L=>L.id===st.flx)){popSkip++;history.back();return;}
  if(popSkip)return;  /* wait for that step back to finish before adding a new one */
  LAYER_DEFS.forEach(L=>{if(L.isOpen()&&!LAYERS.includes(L))layerPush(L);});}
let layerQ=0;const layerLater=()=>{cancelAnimationFrame(layerQ);layerQ=requestAnimationFrame(layerSync);};
{const mo=new MutationObserver(layerLater);['#story','#aboutDlg','#accessDlg','#dictDlg','#draftDlg','#soloPop','#soloTrig','#skyPanel','#pdRail','#agRail','#sheet','#topMenu'].forEach(q=>{const el=$(q);if(el)mo.observe(el,{attributes:true,attributeFilter:['open','class','hidden','aria-expanded']});});}
addEventListener('popstate',()=>{if(popSkip){popSkip--;if(!popSkip)layerLater();return;}const L=LAYERS.pop();if(L&&L.isOpen())L.back();
  setTimeout(()=>{if(L&&L.isOpen()&&!LAYERS.includes(L))layerPush(L);layerSync();},60);});
applyPrefs();skyBuild();soloBuild();
$('#netSub').textContent=`${D.companies.length} startups and ${D.funds.length} investors. Tap anyone to see who fits them.`;
requestAnimationFrame(()=>{skyResize();simWake(still()?0:.3);syncSegs();});
window.addEventListener('resize',()=>{if(NET.mode==='index')kmRender();});
window._vc={D,SKY,KM,NET,MX,MOM,openStory,openMatch:openMatchStory,goTo,openInIndex,showInSky,setMode,setView,skyFocus,kmModel,draftText};
})();
