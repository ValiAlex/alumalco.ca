/* Alumalco — site scripts. Loaded with `defer` on every page; sections run in order.
   Each URL is now its own HTML file with its language baked in (see build.py), so there is
   no hash router and no JS language swap. Functions used by inline onclick attributes
   (lbOpen, specNav, specGo, applyFor, submitCareer) must stay global. */

/* ==== hero-emblem-align ==== */
(function(){
  function align(){
    var hero=document.querySelector('.hero'), em=document.querySelector('.hero-emblem'), acts=document.querySelector('.hero .hero-actions');
    if(!hero||!em||!acts) return;
    var hr=hero.getBoundingClientRect(), ar=acts.getBoundingClientRect();
    em.style.top='auto'; em.style.transform='none';
    em.style.bottom=Math.max(0,Math.round(hr.bottom-ar.bottom))+'px';
  }
  function schedule(){ setTimeout(align,80); }
  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('hashchange',function(){ setTimeout(align,80); });
  if(document.fonts&&document.fonts.ready){ document.fonts.ready.then(align); }
  if(document.readyState!=='loading') align(); else document.addEventListener('DOMContentLoaded',align);
  setTimeout(align,450); setTimeout(align,900);
  if('ResizeObserver' in window){ try{ var ro=new ResizeObserver(function(){ align(); }); ['.hero h1','.hero .hero-actions','.hero .hero-inner'].forEach(function(sel){ var n=document.querySelector(sel); if(n) ro.observe(n); }); }catch(e){} }
  setTimeout(align,1300);
})();

/* ==== intro-js ==== */
(function(){
  var intro=document.getElementById('intro'); if(!intro) return;
  // Intro plays once per browser session (every page is now a full page load).
  var seen=false; try{ seen=sessionStorage.getItem('al_intro')==='1'; sessionStorage.setItem('al_intro','1'); }catch(e){}
  try{ if(seen || (window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches)){ intro.parentNode.removeChild(intro); return; } }catch(e){}
  var de=document.documentElement; de.classList.add('intro-lock');
  var revealed=false;
  function done(){ if(revealed) return; revealed=true; intro.style.display='none'; de.classList.remove('intro-lock'); if(document.body) document.body.classList.remove('intro-lock'); }
  function start(){
    if(document.body) document.body.classList.add('intro-lock');
    var hl=document.querySelector('.brand img.logo'); var lsrc=hl?(hl.currentSrc||hl.src||''):'';
    var wm=intro.querySelector('.intro-wordmark'), il=intro.querySelector('.intro-logo');
    if(il && lsrc) il.src=lsrc;
    if(il) requestAnimationFrame(function(){ il.classList.add('go'); });
    // dissolve away "lumalco", then glide the "A" to the centre of the screen
    setTimeout(function(){ if(wm) wm.classList.add('erase'); }, 1850);
    setTimeout(function(){ if(wm) wm.classList.add('center'); }, 2700);
    setTimeout(function(){ if(wm) wm.classList.add('spin'); }, 3700);
    setTimeout(function(){ intro.classList.add('reveal'); }, 4950);
    intro.addEventListener('animationend', function(e){ if(e.animationName==='introReveal') done(); });
    setTimeout(done, 6200); // safety
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

/* ==== film-play ==== */
(function(){
  var v=document.querySelector('.film-media'); if(!v) return;
  var film=document.querySelector('.film');
  // On phones, swap to the lighter mobile encode for faster, more reliable autoplay.
  try{
    var small = (window.matchMedia && window.matchMedia('(max-width:820px)').matches) || (Math.min(window.innerWidth||9999, window.screen?window.screen.width:9999) <= 820);
    if(small && v.dataset.mobile){ v.innerHTML=''; v.setAttribute('src', v.dataset.mobile); }
  }catch(e){}
  // iOS requires muted + inline set as PROPERTIES (not just attributes) before play().
  v.muted=true; v.defaultMuted=true; v.setAttribute('muted','');
  v.playsInline=true; v.setAttribute('playsinline',''); v.setAttribute('webkit-playsinline','');
  v.setAttribute('autoplay','');
  var hasSrc = v.currentSrc || v.getAttribute('src') || v.querySelector('source');
  if(!hasSrc) return; // offline/embedded copy: poster still only
  var inView=true, hint=null;
  function ok(){ return !v.paused && !v.ended && v.currentTime>0; }
  function tryplay(){ v.muted=true; try{ var p=v.play(); if(p&&p.then){ p.then(hideHint).catch(function(){}); } }catch(e){} }
  // iOS fires these at different, sometimes late, moments — hook them all.
  ['loadedmetadata','loadeddata','canplay','canplaythrough','playing','stalled','suspend'].forEach(function(ev){ v.addEventListener(ev, function(){ if(inView) tryplay(); if(ev==='playing') hideHint(); }); });
  document.addEventListener('visibilitychange', function(){ if(!document.hidden && inView) tryplay(); });
  window.addEventListener('pageshow', function(){ if(inView) tryplay(); });
  // Play only while visible; pause off-screen to save battery/data.
  if('IntersectionObserver' in window){
    try{
      var io=new IntersectionObserver(function(es){ es.forEach(function(e){ inView=e.isIntersecting; if(inView){ tryplay(); } else { try{v.pause();}catch(x){} } }); }, {threshold:0.12});
      io.observe(v);
    }catch(e){}
  }
  // Guaranteed fallback: if autoplay is blocked (Low Power Mode / embed policy),
  // the whole band is tappable and a labelled play button appears while paused.
  function playNow(e){ if(e){ if(e.preventDefault) e.preventDefault(); if(e.stopPropagation) e.stopPropagation(); } v.muted=true; try{ v.load(); }catch(x){} tryplay(); setTimeout(function(){ if(ok()) hideHint(); }, 400); }
  window.addEventListener('touchstart', function(){ tryplay(); }, {passive:true});
  window.addEventListener('click', function(){ tryplay(); });
  if(film){ film.addEventListener('click', playNow); film.addEventListener('touchend', playNow); }
  function showHint(){
    if(hint||!film) return;
    hint=document.createElement('button'); hint.type='button'; hint.className='film-play-btn'; hint.setAttribute('aria-label','Play video');
    hint.innerHTML='<span class="film-play-ic">&#9658;</span><span class="film-play-tx">Tap to play</span>';
    hint.addEventListener('click', playNow);
    hint.addEventListener('touchend', playNow);
    film.appendChild(hint);
  }
  function hideHint(){ if(hint&&hint.parentNode){ hint.parentNode.removeChild(hint); } hint=null; }
  try{ v.load(); }catch(e){}
  tryplay();
  // Once the band is in view and still not playing, show the tap button (persistently).
  var tries=0, iv=setInterval(function(){
    tries++;
    if(ok()){ hideHint(); clearInterval(iv); return; }
    if(inView){ tryplay(); if(tries>=3) showHint(); }
    if(tries>=40) clearInterval(iv);
  }, 500);
})();

/* ==== pro-slider-js ==== */
  (function(){
    var s=document.getElementById('proSlider'); if(!s) return;
    var track=document.getElementById('proTrack');
    var slides=[].slice.call(track.querySelectorAll('.pps-slide'));
    var n=slides.length;
    var cur=s.querySelector('.pps-cur');
    var rail=document.getElementById('proBar'), thumb=document.getElementById('proThumb');
    function pad(x){return (x+1<10?'0':'')+(x+1);}
    function maxScroll(){ return track.scrollWidth - track.clientWidth; }
    function activeIndex(){ var c=track.scrollLeft + track.clientWidth/2, best=0, bd=1e9; slides.forEach(function(sl,i){ var mid=sl.offsetLeft + sl.clientWidth/2; var d=Math.abs(mid-c); if(d<bd){bd=d;best=i;} }); return best; }
    function updThumb(){ var sw=track.scrollWidth, cw=track.clientWidth, rw=rail.clientWidth; var tw=Math.max(40, rw*cw/sw); var ms=sw-cw, left=ms>0 ? (track.scrollLeft/ms)*(rw-tw) : 0; thumb.style.width=tw+'px'; thumb.style.transform='translateX('+Math.round(left)+'px)'; }
    function ui(){ if(cur)cur.textContent=pad(activeIndex()); updThumb(); }
    function scrollToIndex(i){ i=Math.max(0,Math.min(n-1,i)); var sl=slides[i]; track.scrollTo({left: Math.round(sl.offsetLeft - (track.clientWidth - sl.clientWidth)/2), behavior:'smooth'}); }
    var raf=null;
    track.addEventListener('scroll', function(){ if(raf) cancelAnimationFrame(raf); raf=requestAnimationFrame(ui); }, {passive:true});
    s.querySelector('.pps-next').addEventListener('click',function(){ scrollToIndex(activeIndex()+1); });
    s.querySelector('.pps-prev').addEventListener('click',function(){ scrollToIndex(activeIndex()-1); });
    var down=false, sx=0, base=0, moved=0;
    track.addEventListener('pointerdown', function(e){ down=true; sx=e.clientX; base=track.scrollLeft; moved=0; track.classList.add('dragging'); });
    window.addEventListener('pointermove', function(e){ if(!down) return; var dx=e.clientX-sx; if(Math.abs(dx)>moved) moved=Math.abs(dx); track.scrollLeft=base-dx; });
    window.addEventListener('pointerup', function(){ if(!down) return; down=false; track.classList.remove('dragging'); if(moved>10) scrollToIndex(activeIndex()); });
    var td=false, tsx=0, tl0=0;
    function curLeft(){ var m=/-?[\d.]+/.exec(thumb.style.transform); return m?parseFloat(m[0]):0; }
    thumb.addEventListener('pointerdown', function(e){ e.stopPropagation(); td=true; tsx=e.clientX; tl0=curLeft(); document.body.style.userSelect='none'; });
    window.addEventListener('pointermove', function(e){ if(!td) return; var rw=rail.clientWidth, tw=thumb.offsetWidth; var nl=Math.max(0,Math.min(rw-tw, tl0+(e.clientX-tsx))); track.scrollLeft=(rw-tw>0)?(nl/(rw-tw))*maxScroll():0; thumb.style.transform='translateX('+Math.round(nl)+'px)'; if(cur)cur.textContent=pad(activeIndex()); });
    window.addEventListener('pointerup', function(){ if(td){ td=false; document.body.style.userSelect=''; scrollToIndex(activeIndex()); } });
    rail.addEventListener('pointerdown', function(e){ if(e.target===thumb) return; var r=rail.getBoundingClientRect(); var p=(e.clientX-r.left)/r.width; track.scrollTo({left:Math.max(0,Math.min(1,p))*maxScroll(), behavior:'smooth'}); });
    rail.addEventListener('keydown', function(e){ if(e.key==='ArrowRight'){ e.preventDefault(); scrollToIndex(activeIndex()+1);} else if(e.key==='ArrowLeft'){ e.preventDefault(); scrollToIndex(activeIndex()-1);} });
    window.addEventListener('resize', ui, {passive:true});
    setTimeout(ui, 60); ui();

    // ---- click a slide -> open full-screen viewer ----
    slides.forEach(function(sl,i){
      var im=sl.querySelector('.pps-img');
      if(im && !im.querySelector('.pps-view')){ var v=document.createElement('span'); v.className='pps-view'; v.innerHTML='View &#8599;'; im.appendChild(v); }
      sl.addEventListener('click', function(e){ if(e.target.closest('.feat-link')) return; if(moved>10) return; openFs(i); });
    });

    // ---- full-screen viewer ----
    var fs=document.getElementById('proFs'), ftrack=document.getElementById('pfsTrack');
    var fslides=[].slice.call(ftrack.querySelectorAll('.pfs-slide')), fN=fslides.length;
    var fcur=document.getElementById('pfsCur');
    function fActive(){ var c=ftrack.scrollLeft+ftrack.clientWidth/2,best=0,bd=1e9; fslides.forEach(function(sl,i){var mid=sl.offsetLeft+sl.clientWidth/2;var d=Math.abs(mid-c);if(d<bd){bd=d;best=i;}}); return best; }
    function fUi(){ if(fcur) fcur.textContent=pad(fActive()); }
    function fTo(i,inst){ i=Math.max(0,Math.min(fN-1,i)); var sl=fslides[i]; ftrack.scrollTo({left:sl.offsetLeft, behavior: inst?'auto':'smooth'}); }
    function openFs(i){ fs.classList.add('open'); fs.setAttribute('aria-hidden','false'); document.body.classList.add('pro-fs-lock'); requestAnimationFrame(function(){ fTo(i,true); fUi(); requestAnimationFrame(function(){ fTo(i,true); fUi(); }); }); }
    function closeFs(){ fs.classList.remove('open'); fs.setAttribute('aria-hidden','true'); document.body.classList.remove('pro-fs-lock'); try{ if(/^#pro-(architects|builders|homeowners)$/.test(location.hash)) history.replaceState(null,'',location.pathname+location.search); }catch(e){} }
    window.proOpenFs=openFs;
    var fraf=null;
    ftrack.addEventListener('scroll', function(){ if(fraf)cancelAnimationFrame(fraf); fraf=requestAnimationFrame(fUi); }, {passive:true});
    document.getElementById('pfsNext').addEventListener('click', function(){ fTo(fActive()+1); });
    document.getElementById('pfsPrev').addEventListener('click', function(){ fTo(fActive()-1); });
    document.getElementById('pfsClose').addEventListener('click', closeFs);
    [].slice.call(fs.querySelectorAll('.pfs-cap .feat-link')).forEach(function(a){ a.addEventListener('click', closeFs); });
    document.addEventListener('keydown', function(e){ if(!fs.classList.contains('open')) return; if(e.key==='Escape') closeFs(); else if(e.key==='ArrowRight'){ fTo(fActive()+1); } else if(e.key==='ArrowLeft'){ fTo(fActive()-1); } });
    var fdown=false,fsx=0,fbase=0,fmoved=0;
    ftrack.addEventListener('pointerdown', function(e){ fdown=true; fsx=e.clientX; fbase=ftrack.scrollLeft; fmoved=0; ftrack.classList.add('dragging'); });
    window.addEventListener('pointermove', function(e){ if(!fdown) return; var dx=e.clientX-fsx; if(Math.abs(dx)>fmoved) fmoved=Math.abs(dx); ftrack.scrollLeft=fbase-dx; });
    window.addEventListener('pointerup', function(){ if(!fdown) return; fdown=false; ftrack.classList.remove('dragging'); if(fmoved>10) fTo(fActive()); });
    window.addEventListener('resize', function(){ if(fs.classList.contains('open')) fUi(); }, {passive:true});
  })();
  

/* ==== script 5 ==== */
  // graceful image fallback: if a photo is blocked (403/hotlink), fade it out to reveal the gradient
  document.querySelectorAll('img').forEach(img=>{
    img.addEventListener('error',()=>{
      if(img.closest('.partner-track')){img.style.display='none';}
      else{img.style.opacity='0';}
    });
  });

  // sticky nav state
  const hdr=document.getElementById('hdr');
  const onScroll=()=>{hdr.classList.toggle('scrolled',window.scrollY>40)};
  window.addEventListener('scroll',onScroll);onScroll();

  // mobile menu
  const burger=document.getElementById('burger');
  const menu=document.getElementById('menu');
  burger.addEventListener('click',()=>{menu.classList.toggle('open');});
  menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>menu.classList.remove('open')));

  // reveal on scroll
  const io=new IntersectionObserver((entries)=>{
    entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});
  },{threshold:.15});
  document.querySelectorAll('.rv').forEach(el=>io.observe(el));

  // hero reveal immediately
  setTimeout(()=>{document.querySelectorAll('.hero .rv').forEach(el=>el.classList.add('in'));},120);


  // tumbling (odometer) counters
  var reduceM=false; try{ reduceM=window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches; }catch(e){}
  function tumble(stat){
    var fig=stat.querySelector('.figure'); if(!fig) return;
    var span=fig.querySelector('span'); if(!span) return;
    var digits=String(fig.dataset.count||span.textContent).replace(/[^0-9]/g,'').split('');
    if(!digits.length) return;
    if(reduceM){ span.textContent=digits.join(''); return; }
    var SPINS=3; // full 0-9 rolls before landing
    var roll=document.createElement('span'); roll.className='roll';
    var cols=[];
    digits.forEach(function(d){
      var reel=document.createElement('span'); reel.className='reel';
      var col=document.createElement('span'); col.className='reel-col';
      var html='';
      for(var c=0;c<SPINS;c++){ for(var n=0;n<=9;n++){ html+='<span class="reel-d">'+n+'</span>'; } }
      html+='<span class="reel-d">'+d+'</span>';
      col.innerHTML=html;
      reel.appendChild(col); roll.appendChild(reel); cols.push(col);
    });
    span.textContent=''; span.appendChild(roll);
    requestAnimationFrame(function(){ requestAnimationFrame(function(){
      cols.forEach(function(col,i){
        var last=col.children.length-1; // lands on the final digit
        var dur=1.15 + i*0.22;          // cascade left -> right
        col.style.transition='transform '+dur+'s cubic-bezier(.16,1,.3,1)';
        col.style.transitionDelay=(i*0.07)+'s';
        col.style.transform='translateY(-'+last+'em)';
      });
    }); });
  }
  const counted=new Set();
  const cio=new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting && !counted.has(e.target)){
        counted.add(e.target);
        tumble(e.target);
      }
    });
  },{threshold:.6});
  document.querySelectorAll('.stat').forEach(s=>cio.observe(s));

/* ==== script 6 (page init — replaces the old hash router) ==== */
(function(){
  var hdr=document.getElementById('hdr');
  var pg=document.querySelector('.page');
  // Inner pages show their content immediately (only the home page reveals on scroll).
  if(pg && pg.id!=='page-home'){ pg.querySelectorAll('.rv').forEach(function(e){e.classList.add('in');}); }
  // /solutions#pro-architects etc. open the matching audience in the full-screen viewer.
  var AUD={'pro-architects':0,'pro-builders':1,'pro-homeowners':2};
  function aud(){ var h=(location.hash||'').replace('#',''); if(AUD.hasOwnProperty(h) && window.proOpenFs){ window.proOpenFs(AUD[h]); } }
  window.addEventListener('hashchange', aud); aud();
  // Remember an explicit language choice (used by the "/" language redirect).
  document.querySelectorAll('a.lang-toggle').forEach(function(a){ a.addEventListener('click', function(){ try{ localStorage.setItem('al_lang', (a.getAttribute('hreflang')||'en').slice(0,2)); }catch(e){} }); });
  if(hdr) hdr.classList.toggle('scrolled', window.scrollY>40);
})();

/* ==== script 7 ==== */
function lbOpen(src){var l=document.getElementById('lb');document.getElementById('lbi').src=src;l.classList.add('show');}

/* ==== script 8 ==== */
function specNav(id,d){var t=document.getElementById(id);if(t)t.scrollBy({left:d*t.clientWidth,behavior:"smooth"});}function specGo(id,i){var t=document.getElementById(id);if(t)t.scrollTo({left:i*t.clientWidth,behavior:"smooth"});}document.addEventListener("scroll",function(e){var t=e.target;if(t&&t.classList&&t.classList.contains("spec-track")){var i=Math.round(t.scrollLeft/t.clientWidth);var dots=t.parentNode.querySelectorAll(".spec-dots .dot");for(var k=0;k<dots.length;k++)dots[k].classList.toggle("is-on",k===i);}},true);

/* ==== script 9 ==== */
/* (Language is now baked into each page: /en/... and /fr/... — the EN/FR switch is a plain link.) */

/* ==== script 10 ==== */
/* (The quote request form is now the CRM iframe in #contact, so it needs no script here.) */
function submitCareer(f){
  if(!f.checkValidity()){f.reportValidity();return false;}
  function g(n){var el=f.querySelector('[name="'+n+'"]'); return el?el.value:'';}
  var nl=String.fromCharCode(10);
  var body='Career application from the Alumalco website'+nl+nl
    +'Name: '+g('name')+nl
    +'Position: '+g('position')+nl
    +'Email: '+g('email')+nl
    +'Phone: '+g('phone')+nl+nl
    +'Message:'+nl+g('msg')+nl+nl
    +'[Please attach your resume to this email before sending.]'+nl;
  var subj='Career application \u2014 '+g('name')+' \u2014 '+g('position');
  window.location.href='mailto:info@alumalco.ca?subject='+encodeURIComponent(subj)+'&body='+encodeURIComponent(body);
  try{ f.reset(); }catch(e){}
  setTimeout(function(){ location.href=(/^fr/i.test(document.documentElement.lang)?'/fr/merci':'/en/thank-you'); }, 350);
  return false;
}
function applyFor(idx){
  var sel=document.querySelector('#careers-apply select[name="position"]');
  if(sel && idx>0 && idx<sel.options.length) sel.selectedIndex=idx;
  var el=document.getElementById('careers-apply'); if(el) el.scrollIntoView({behavior:'smooth'});
}

/* ==== script 11 ==== */
(function(){
  var IDS=['al750','al480','sl550','sl650','bf850','entry'];
  var SEL=IDS.map(function(i){return '#page-'+i+' .phero h1';}).join(',') + ', .hero h1';
  function fit(h1){
    var box=h1.parentElement; if(!box) return;
    var cs=getComputedStyle(box);
    var avail=box.clientWidth-parseFloat(cs.paddingLeft||0)-parseFloat(cs.paddingRight||0);
    if(avail<=0) return;
    h1.style.whiteSpace='nowrap'; h1.style.maxWidth='none';
    var REF=100; h1.style.fontSize=REF+'px';
    var w=h1.scrollWidth; if(!w) return;
    var size=REF*avail/w;
    if(h1.closest('.hero')) size*=0.75;
    if(size>104) size=104;
    if(size<14) size=14;
    h1.style.fontSize=size+'px';
  }
  function fitAll(){
    var list=document.querySelectorAll(SEL);
    for(var k=0;k<list.length;k++){ var pg=list[k].closest('.page'); if(pg&&!pg.hidden) fit(list[k]); }
  }
  var t; function schedule(){ clearTimeout(t); t=setTimeout(fitAll,60); }
  window.addEventListener('resize', schedule);
  window.addEventListener('hashchange', function(){ setTimeout(fitAll,0); });
  function init(){ fitAll(); if(document.fonts&&document.fonts.ready){ document.fonts.ready.then(fitAll); } setTimeout(fitAll,300); }
  if(document.readyState!=='loading') init(); else document.addEventListener('DOMContentLoaded', init);
})();

/* ==== script 12/13 ==== */
/* Home "featured projects" stack: each item carries its project URL in data-href (set by build.py). */
(function(){
  var st=document.getElementById('pstack'); if(!st) return;
  [].slice.call(st.querySelectorAll('.pstack-item[data-href]')).forEach(function(it){
    function go(){ location.href=it.getAttribute('data-href'); }
    it.addEventListener('click', go);
    it.addEventListener('keydown', function(e){ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); go(); } });
  });
})();

/* ==== script 14 ==== */
(function(){
  var home=document.getElementById('page-home'); if(!home) return;
  var REDUCED=window.matchMedia&&window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  if(REDUCED) return;
  var headings=[].slice.call(home.querySelectorAll('.products h2, .projects .sec-head h2, .craft h2, .process .sec-head h2, .quotes h2, .pro-teaser h2, .contact h2'));
  var reads=[], io=null, built=false;

  function splitHeading(el){
    if(el.getAttribute('data-sr')||!el.offsetParent) return;
    el.setAttribute('data-sr','1'); el.classList.remove('rv'); el.classList.add('sr-h');
    var segs=el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML=''; var words=[];
    segs.forEach(function(seg,si){
      if(si>0) el.appendChild(document.createElement('br'));
      var txt=seg.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim(); if(!txt) return;
      var ws=txt.split(' ');
      ws.forEach(function(w,i){ var s=document.createElement('span'); s.style.display='inline-block'; s.textContent=w; el.appendChild(s); words.push(s); if(i<ws.length-1) el.appendChild(document.createTextNode(' ')); });
    });
    var lines=[], cur=null, top=null;
    words.forEach(function(w){ var t=w.offsetTop; if(top===null||Math.abs(t-top)>6){ cur=[]; lines.push(cur); top=t; } cur.push(w.textContent); });
    el.innerHTML='';
    lines.forEach(function(lw,li){ var line=document.createElement('span'); line.className='sr-line'; var inner=document.createElement('span'); inner.className='sr-line-in'; inner.style.transitionDelay=(li*0.085)+'s'; inner.textContent=lw.join(' '); line.appendChild(inner); el.appendChild(line); });
    if(io) io.observe(el); else el.classList.add('sr-in');
  }
  function setupRead(el){
    if(!el||el.getAttribute('data-sr')||!el.offsetParent) return;
    el.setAttribute('data-sr','1'); el.classList.remove('rv'); el.classList.add('sr-read');
    var txt=el.textContent.replace(/\s+/g,' ').trim(); var ws=txt.split(' ');
    el.innerHTML=''; var spans=[];
    ws.forEach(function(w,i){ var s=document.createElement('span'); s.className='sr-w'; s.textContent=w; el.appendChild(s); spans.push(s); if(i<ws.length-1) el.appendChild(document.createTextNode(' ')); });
    reads.push({el:el,spans:spans});
  }
  function updReads(){
    var vh=window.innerHeight;
    reads.forEach(function(r){
      var rect=r.el.getBoundingClientRect();
      var start=vh*0.82, end=vh*0.40, span=(start-end)+rect.height;
      var p=(start-rect.top)/span; p=Math.max(0,Math.min(1,p));
      var k=Math.round(p*r.spans.length);
      for(var i=0;i<r.spans.length;i++){ var on=i<k; if(r.spans[i]._on!==on){ r.spans[i].classList.toggle('on',on); r.spans[i]._on=on; } }
    });
  }
  function build(){
    if(built) return; built=true;
    if('IntersectionObserver' in window){ io=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('sr-in'); io.unobserve(e.target); } }); },{threshold:0.25}); }
    headings.forEach(splitHeading);
    setupRead(home.querySelector('.manifesto p.big'));
    setupRead(home.querySelector('.craft .craft-text p'));
    updReads();
  }
  function run(){
    if(document.fonts&&document.fonts.ready){ document.fonts.ready.then(build); setTimeout(build,1200); } else build();
    window.addEventListener('scroll', updReads, {passive:true});
    window.addEventListener('resize', updReads, {passive:true});
    window.addEventListener('hashchange', function(){ setTimeout(function(){ headings.forEach(splitHeading); setupRead(home.querySelector('.manifesto p.big')); setupRead(home.querySelector('.craft .craft-text p')); updReads(); }, 80); });
  }
  if(document.readyState!=='loading') run(); else document.addEventListener('DOMContentLoaded', run);
})();

/* ==== script 15 ==== */
(function(){
  var el=document.getElementById('ctaFloat'); if(!el) return;
  var HIDE_NEAR='.contact,.pcta,.proj-cta,.cta,footer';
  function nearCTA(){
    var vh=window.innerHeight, nodes=document.querySelectorAll(HIDE_NEAR);
    for(var i=0;i<nodes.length;i++){
      var n=nodes[i]; if(n.offsetParent===null) continue;
      var r=n.getBoundingClientRect();
      if(r.top < vh*0.80 && r.bottom > 0) return true;
    }
    return false;
  }
  function upd(){
    var y=window.scrollY||document.documentElement.scrollTop||0;
    var onContact=/\/contact$/.test(location.pathname)||/contact/i.test(location.hash);
    var vis = y>420 && !onContact && !nearCTA();
    el.classList.toggle('show', vis);
  }
  window.addEventListener('scroll', upd, {passive:true});
  window.addEventListener('resize', upd, {passive:true});
  window.addEventListener('hashchange', function(){ setTimeout(upd,80); });
  el.addEventListener('click', function(){ setTimeout(function(){ el.classList.remove('show'); }, 30); });
  upd();
})();

/* ==== script 16 ==== */
/* Catalogue viewer: render the PDF inline with pdf.js; iframe fallback; Download button saves the file. Serves the viewer's language. */
(function(){
  if(window.pdfjsLib){ try{ pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; }catch(_){ } }
  function hrefFor(a){ var isfr=/^fr/i.test(document.documentElement.lang); var f=a.getAttribute('data-pdf-fr'); return (isfr&&f)?f:a.getAttribute('href'); }
  var ov=document.getElementById('pdfov'), pages=document.getElementById('pvPages'),
      frm=document.getElementById('pvFrame'), ti=document.getElementById('pvTitle');
  var cur=null, token=0;
  function useFrame(src){ ov.classList.add('use-frame'); frm.src=src; }
  function render(src){
    ov.classList.remove('use-frame'); frm.src='about:blank'; pages.innerHTML='<div class="pv-msg" data-nofr>Loading\u2026</div>';
    if(!window.pdfjsLib){ useFrame(src); return; }
    var my=++token;
    pdfjsLib.getDocument(src).promise.then(function(pdf){
      if(my!==token) return;
      pages.innerHTML='';
      var n=pdf.numPages, done=0;
      for(var i=1;i<=n;i++){ (function(p){
        pdf.getPage(p).then(function(page){
          if(my!==token) return;
          var vw=page.getViewport({scale:1});
          var targetW=Math.min(1600, Math.max(900, (pages.clientWidth||900)*2));
          var scale=targetW/vw.width;
          var vp=page.getViewport({scale:scale});
          var c=document.createElement('canvas'); c.width=vp.width; c.height=vp.height;
          var ctx=c.getContext('2d');
          page.render({canvasContext:ctx, viewport:vp});
          var holder=pages.querySelector('[data-pg="'+p+'"]');
          if(!holder){ holder=document.createElement('div'); holder.setAttribute('data-pg',p); pages.appendChild(holder); }
          holder.appendChild(c);
        });
      })(i); }
    }).catch(function(){ if(my===token) useFrame(src); });
  }
  function openView(a){
    cur=hrefFor(a); if(!cur) return;
    var h3=a.querySelector('h3'); ti.textContent=(h3?h3.textContent:'Catalogue');
    ov.classList.add('show'); document.body.style.overflow='hidden';
    document.getElementById('pvBody').scrollTop=0;
    render(cur);
  }
  function closeView(){ token++; ov.classList.remove('show'); frm.src='about:blank'; pages.innerHTML=''; document.body.style.overflow=''; }
  document.addEventListener('click', function(e){
    var card=e.target.closest ? e.target.closest('a.cat-card') : null;
    if(card){ e.preventDefault(); openView(card); return; }
    var t=e.target;
    if(t.closest && t.closest('#pvClose')){ e.preventDefault(); closeView(); return; }
    if(t.closest && t.closest('#pvDl')){
      e.preventDefault(); if(!cur) return;
      var fn=cur.split('/').pop();
      var x=document.createElement('a'); x.href=cur; x.download=fn; document.body.appendChild(x); x.click(); x.remove();
    }
  });
  document.addEventListener('keydown', function(e){ if(e.key==='Escape' && ov.classList.contains('show')) closeView(); });
})();
