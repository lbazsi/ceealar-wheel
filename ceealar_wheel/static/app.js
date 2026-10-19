'use strict';
const $ = id => document.getElementById(id);
const TAU = Math.PI * 2;
const COLORS = {knowledge:['#087f86','#268f91','#4a9d99','#1b777c'],wildcard:['#dc775c','#e69a73','#cf674e']};
let topics=[], pool=[], angle=0, spinning=false, activePool=[], history=[];
let timerEnd=null, remaining=180000;
let presentationMode=null, ownsFullscreen=false, confettiTimeout=null;
let previousFocus=null, chosenTopic=null;

function openPresentation(mode) {
    clearTimeout(confettiTimeout);
    $('confetti').replaceChildren();
    if ($('presentation').hidden) previousFocus=document.activeElement;
    presentationMode=mode;
    $('presentation').hidden=false;
    document.body.classList.add('presenting');
    for (const section of ['spin','winner','timer']) $('presentation-'+section).hidden=section!==mode;
    for (const element of document.querySelectorAll('header, main, footer')) element.inert=true;
    $('presentation-close').focus();
    // Request native fullscreen synchronously from the click/keypress gesture.
    // The viewport-filling presentation also works if the browser denies it.
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        try {
            Promise.resolve(document.documentElement.requestFullscreen()).then(()=>{
                ownsFullscreen=true;
                if ($('presentation').hidden) releaseFullscreen();
            }).catch(()=>{});
        } catch (_) {}
    }
}
function releaseFullscreen() {
    if (!ownsFullscreen) return;
    ownsFullscreen=false;
    if (document.fullscreenElement && document.exitFullscreen) {
        try { Promise.resolve(document.exitFullscreen()).catch(()=>{}); } catch (_) {}
    }
}
function closePresentation() {
    clearTimeout(confettiTimeout);
    $('confetti').replaceChildren();
    $('presentation').hidden=true;
    presentationMode=null;
    document.body.classList.remove('presenting');
    for (const element of document.querySelectorAll('header, main, footer')) element.inert=false;
    releaseFullscreen();
    if (previousFocus && previousFocus.isConnected) previousFocus.focus();
}
function celebrate(winner) {
    if (presentationMode!=='spin') return;
    // Keep the fullscreen session acquired on spin; no second gesture needed.
    presentationMode='winner';
    $('presentation-spin').hidden=true;
    $('presentation-winner').hidden=false;
    $('winner-category').textContent=winner.category;
    $('winner-topic').textContent=winner.title;
    $('winner-start').focus();
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const colors=['#087f86','#dc775c','#e5b44a','#4a9d99','#173b3b'];
        for (let i=0;i<110;i++) {
            const piece=document.createElement('i');
            piece.className='confetti-piece';
            piece.style.setProperty('--left',randomIndex(101)+'%');
            piece.style.setProperty('--delay',randomIndex(600)+'ms');
            piece.style.setProperty('--color',colors[i%colors.length]);
            piece.style.setProperty('--drift',(randomIndex(301)-150)+'px');
            piece.style.setProperty('--turn',(randomIndex(1441)-720)+'deg');
            $('confetti').append(piece);
        }
    }
    confettiTimeout=setTimeout(()=>$('confetti').replaceChildren(),4200);
}
function startTalk() {
    if (spinning) return;
    if (remaining<=0) resetTimer();
    if (timerEnd===null) timerEnd=performance.now()+remaining;
    $('timer-topic').textContent=chosenTopic?chosenTopic.title:'Your lightning talk';
    $('timer-start').textContent='Pause';
    $('presentation-pause').textContent='Pause';
    openPresentation('timer');
    $('confetti').replaceChildren();
    paintTimer();
}
const storageKey='ceealar-noodles-v1';
try {const saved=JSON.parse(localStorage.getItem(storageKey)||'[]'); if(Array.isArray(saved)) history=saved.filter(Number.isInteger);} catch (_) {}
function save(){try{localStorage.setItem(storageKey,JSON.stringify(history));}catch(_) {}}
// Rejection sampling avoids modulo bias. Every remaining topic has equal odds.
function randomIndex(n){const a=new Uint32Array(1),limit=Math.floor(4294967296/n)*n;do{crypto.getRandomValues(a);}while(a[0]>=limit);return a[0]%n;}
function available(){return topics.filter(t=>($('mode').value==='all'||t.kind===$('mode').value)&&(!$('no-repeat').checked||!history.includes(t.id)));}
function refresh(){pool=available();$('winner-respin').disabled=spinning||!pool.length;$('spin').disabled=spinning||!pool.length;$('spin').innerHTML=pool.length?'Spin the wheel <span>↗</span>':'All served. Start a new evening ↺';$('remaining').textContent=`${pool.length} topics left in the pot`;$('round').textContent=`ROUND ${String(history.length+1).padStart(2,'0')}`;draw();renderHistory();}
function draw(){for(const id of ['wheel','presentation-wheel'])drawWheel($(id));}
function drawWheel(canvas){const ctx=canvas.getContext('2d'),list=spinning?activePool:pool,n=list.length;ctx.clearRect(0,0,1200,1200);ctx.save();ctx.translate(600,600);ctx.rotate(angle-Math.PI/2);if(!n){ctx.beginPath();ctx.arc(0,0,590,0,TAU);ctx.fillStyle='#bdcdbc';ctx.fill();}for(let i=0;i<n;i++){const start=i*TAU/n,end=(i+1)*TAU/n;ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,590,start,end);ctx.closePath();const palette=COLORS[list[i].kind];ctx.fillStyle=palette[i%palette.length];ctx.fill();ctx.strokeStyle='#f6f3e955';ctx.lineWidth=1;ctx.stroke();if(n<=60||i%Math.ceil(n/40)===0){ctx.save();ctx.rotate((start+end)/2);ctx.fillStyle='#fff9e9';ctx.font=`bold ${n>60?17:20}px Arial`;ctx.textAlign='right';ctx.fillText(String(list[i].id).padStart(3,'0'),555,6);ctx.restore();}}ctx.restore();}
function renderHistory(){const list=$('history');list.replaceChildren();$('empty-history').hidden=history.length>0;history.slice(-5).reverse().forEach((id,i)=>{const t=topics.find(t=>t.id===id);if(!t)return;const li=document.createElement('li'),num=document.createElement('span');num.textContent=String(history.length-i).padStart(2,'0');li.append(num,document.createTextNode(t.title));list.append(li);});}
function stopTimer(){if(timerEnd!==null){remaining=Math.max(0,timerEnd-performance.now());timerEnd=null;}$('timer-start').textContent='Start';}
function resetTimer(){stopTimer();if(presentationMode==='timer')closePresentation();remaining=Number($('duration').value)*1000;paintTimer();}
function paintTimer(){
    const ms=timerEnd===null?remaining:Math.max(0,timerEnd-performance.now());
    const sec=Math.ceil(ms/1000);
    const text=`${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;
    for(const id of ['clock','presentation-clock']) {
        $(id).textContent=text;
        $(id).classList.toggle('expired',ms<=0);
    }
    if(ms<=0&&timerEnd!==null){
        remaining=0;timerEnd=null;
        $('timer-start').textContent='Start';
        $('hint').textContent="Time! Bring it home. A round of applause, please.";
        if(presentationMode==='timer')closePresentation();
    }
}
async function spin(){if(spinning||!pool.length)return;resetTimer();spinning=true;openPresentation('spin');activePool=[...pool];const index=randomIndex(activePool.length),winner=activePool[index];const start=angle;
// Pointer sits at twelve o'clock. Stop strictly inside the selected equal-sized slice.
const offset=(index+0.2+randomIndex(601)/1000)*TAU/activePool.length;
const target=((TAU-offset)%TAU+TAU)%TAU;
const end=start+TAU*7+((target-start%TAU+TAU)%TAU);
$('mode').disabled=true;$('no-repeat').disabled=true;$('reset-session').disabled=true;$('spin').disabled=true;$('spin').textContent='Stirring the pot…';$('badge').className='badge';$('badge').textContent='A MOMENT OF SUSPENSE';$('topic').textContent='Let the universe pick.';$('hint').textContent='All remaining topics have an equal chance.';document.body.classList.add('spinning');
const duration=matchMedia('(prefers-reduced-motion: reduce)').matches?120:5200;
await new Promise(resolve=>{const begin=performance.now();function frame(now){const p=Math.min(1,(now-begin)/duration);angle=start+(end-start)*(1-Math.pow(1-p,5));draw();if(p<1)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
angle=end%TAU;chosenTopic=winner;celebrate(winner);history.push(winner.id);save();$('badge').className=`badge ${winner.kind}`;$('badge').textContent=winner.kind==='wildcard'?'WILDCARD · AN UNEXPECTED RABBIT HOLE':winner.category.toUpperCase();$('topic').textContent=winner.title;$('hint').textContent=winner.kind==='wildcard'?'Share what you know, or explore what makes it interesting.':'Offer an explanation, an argument, or a useful example.';document.body.classList.remove('spinning');
// Hold the exact landed-on wheel until the next spin or pool change.
spinning=false;$('mode').disabled=false;$('no-repeat').disabled=false;$('reset-session').disabled=false;
pool=available();$('winner-respin').disabled=spinning||!pool.length;$('spin').disabled=!pool.length;$('spin').innerHTML=pool.length?'One more spin <span>↗</span>':'All served. Start a new evening ↺';$('remaining').textContent=`${pool.length} topics left in the pot`;$('round').textContent=`ROUND ${String(history.length).padStart(2,'0')}`;renderHistory();}
function showTopics(){const query=$('search').value.trim().toLowerCase(),filtered=topics.filter(t=>`${t.title} ${t.category} ${t.kind}`.toLowerCase().includes(query));$('search-count').textContent=`${filtered.length} topics · ${filtered.filter(t=>t.kind==='knowledge').length} knowledge · ${filtered.filter(t=>t.kind==='wildcard').length} wildcard`;$('topic-list').replaceChildren();for(const t of filtered){const row=document.createElement('div');row.className='topic-row';row.textContent=`${String(t.id).padStart(3,'0')} / ${t.title}`;const tag=document.createElement('small');tag.textContent=`${t.category}${history.includes(t.id)?' · already served':''}`;row.append(tag);$('topic-list').append(row);}}
$('spin').addEventListener('click',spin);$('hub').addEventListener('click',spin);
for(const id of ['mode','no-repeat'])$(id).addEventListener('change',refresh);
$('timer-start').addEventListener('click',()=>{if(timerEnd!==null){stopTimer();$('presentation-pause').textContent='Resume';}else startTalk();paintTimer();});
$('presentation-pause').addEventListener('click',()=>{
    if(timerEnd!==null){stopTimer();$('presentation-pause').textContent='Resume';}
    else {timerEnd=performance.now()+remaining;$('timer-start').textContent='Pause';$('presentation-pause').textContent='Pause';}
    paintTimer();
});
$('presentation-reset').addEventListener('click',resetTimer);
$('presentation-close').addEventListener('click',closePresentation);
$('winner-dismiss').addEventListener('click',closePresentation);
$('winner-start').addEventListener('click',startTalk);
$('winner-respin').addEventListener('click',spin);
document.addEventListener('fullscreenchange',()=>{
    if(ownsFullscreen&&!document.fullscreenElement){ownsFullscreen=false;closePresentation();}
});
// Keep keyboard focus within the audience view. Escape always lets the host leave.
$('presentation').addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.preventDefault();closePresentation();return;}
    if(e.key!=='Tab')return;
    const buttons=Array.from($('presentation').querySelectorAll('button')).filter(b=>!b.closest('[hidden]'));
    const first=buttons[0],last=buttons.at(-1);
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
});
$('timer-reset').addEventListener('click',resetTimer);$('duration').addEventListener('change',resetTimer);setInterval(paintTimer,100);
$('reset-session').addEventListener('click',()=>{if(spinning)return;if(history.length&&!confirm('Clear tonight’s played topics and start a fresh evening?'))return;history=[];chosenTopic=null;save();angle=0;resetTimer();$('badge').className='badge';$('badge').textContent='A FRESH POT';$('topic').textContent='New evening. New rabbit holes.';$('hint').textContent='All 200 topics are back on the menu.';refresh();});
$('browse').addEventListener('click',()=>{showTopics();$('library').showModal();$('search').focus();});$('close-library').addEventListener('click',()=>$('library').close());$('search').addEventListener('input',showTopics);
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch(_){$('hint').textContent='Fullscreen is unavailable here. Try your browser’s fullscreen shortcut.';}});
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!e.repeat&&!presentationMode&&!$('library').open&&!['INPUT','SELECT','BUTTON','TEXTAREA','A'].includes(document.activeElement.tagName)){e.preventDefault();spin();}});
fetch('topics.json').then(r=>{if(!r.ok)throw Error('Topics unavailable');return r.json();}).then(data=>{if(!Array.isArray(data)||!data.length)throw Error('No topics');topics=data;history=history.filter(id=>topics.some(t=>t.id===id));refresh();}).catch(()=>{$('topic').textContent='The noodles need a moment.';$('hint').textContent='Could not load topics. Refresh the page, or restart noodles.';$('spin').textContent='Topics unavailable';});
