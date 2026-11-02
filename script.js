document.addEventListener("DOMContentLoaded", () => {
  /* ====== 엔딩 이미지(Data URL) ====== */
  /* 베이스64를 쓰고 싶다면 아래 ENDING_IMG 값만 교체 */
  const ENDING_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700">
      <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#0f172a"/><stop offset="1" stop-color="#1f2937"/>
      </linearGradient></defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <circle cx="950" cy="120" r="60" fill="#fef08a" opacity="0.9"/>
      <path d="M0 520 L200 420 L320 480 L520 380 L700 460 L900 360 L1200 500 L1200 700 L0 700 Z" fill="#111827"/>
      <path d="M0 560 L180 480 L360 520 L540 460 L760 500 L980 440 L1200 520 L1200 700 L0 700 Z" fill="#374151"/>
    </svg>
  `);
  
  /* ========= 공통 유틸 ========= */
  const $ = (s, el=document)=>el.querySelector(s);
  const $$ = (s, el=document)=>Array.from(el.querySelectorAll(s));
  const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
  
  /* 해결된 라운드(선언문 조각 공개 완료) 기록 */
  const solvedProblems = new Set();
  
  /* ========= 라운드 진행 상태 ========= */
  let cur = 1; // 1..8
  const area = $('#problemArea');
  const roundNoEl = $('#roundNo');
  const roundActions = $('#roundActions');
  const slotHint = $('#slotHint');
  
  function setRound(n){
    cur = n; roundNoEl.textContent = n;
    roundActions.innerHTML='';
    openProblem(n);
    enableSlotNavigation(true); // 클릭 이동 허용(단, 미공개 슬롯은 무시)
  }
  function showNextControls(){
    roundActions.innerHTML = '';
    const retry = Object.assign(document.createElement('button'), {className:'btn warn', textContent:'다시 풀기'});
    const next  = Object.assign(document.createElement('button'), {className:'btn success', textContent: (cur<8?'다음 문제로':'모든 라운드 완료!')});
    retry.onclick = ()=> setRound(cur);
    next.onclick  = ()=> { if(cur<8) setRound(cur+1); else openFinal1(); };
    roundActions.append(retry, next);
  }
  
  /* ========= 선언문 연결 ========= */
  const declarationSlots = {
    /* 1 우리는 / 2 말과 / 3 글을 / 4 지켜서 / 5 불멸의 / 6 정신을 / 7 후대에 / 8 전한다. */
    1: { key:'우리는',  rewardMap:{'★★★':'우리는','★★':'우리ㄴ','★':'ㅇ리ㄴ','☆':'ㅇㄹㄴ'},       fromProblem:4 },
    2: { key:'말과',    rewardMap:{'★★★':'말과','★★':'ㅁ과','★':'ㅁㄱ'},                          fromProblem:6 },
    3: { key:'글을',    rewardMap:{'★★★':'글을','★★':'ㄱ을','★':'ㄱㅇ'},                          fromProblem:5 },
    4: { key:'지켜서',  rewardMap:{'★★★':'지켜서','★★':'지ㅋ서','★':'ㅈㅋ서','☆':'ㅈㅋㅅ'},        fromProblem:7 },
    5: { key:'불멸의',  rewardMap:{'★★★':'불멸의','★★':'불ㅁ의','★':'ㅂㅁ의','☆':'ㅂㅁㅇ'},        fromProblem:3 },
    6: { key:'정신을',  rewardMap:{'★★★':'정신을','★★':'정ㅅ을','★':'ㅈㅅ을','☆':'ㅈㅅㅇ'},        fromProblem:8 },
    7: { key:'후대에',  rewardMap:{'★★★':'후대에','★★':'ㅎ대에','★':'ㅎㄷ에','☆':'ㅎㄷㅇ'},        fromProblem:2 },
    8: { key:'전한다.', rewardMap:{'★★★':'전한다.','★★':'ㅈ한다.','★':'ㅈㅎ다.','☆':'ㅈㅎㄷ.'},    fromProblem:1 },
  };
  function revealByReward(fromProblem, grade){
    solvedProblems.add(fromProblem);
    const pair = Object.entries(declarationSlots).find(([,v])=>v.fromProblem===fromProblem);
    if(!pair) return;
    const [slotIndex, def] = pair;
    const text = (def.rewardMap && def.rewardMap[grade]) ? def.rewardMap[grade] : def.key;
    const el = document.querySelector(`.slot[data-slot="${slotIndex}"]`);
    if(el){
      el.textContent = text;
      el.classList.add('ring','ring-indigo-400');
      setTimeout(()=>el.classList.remove('ring','ring-indigo-400'), 600);
    }
    logResult(fromProblem, `보상 ${grade} → 선언문 [${slotIndex}] “${text}” 공개`);
  }
  function enableSlotNavigation(enabled){
    slotHint.classList.toggle('hidden', !enabled);
    $$('#declaration .slot').forEach(sl=>{
      sl.classList.toggle('disabled', !enabled);
      sl.onclick = enabled ? ()=>{
        const idx = Number(sl.dataset.slot);
        const info = declarationSlots[idx];
        if(!info || !info.fromProblem) return;
        // ⛔ 아직 공개되지 않은(=해결되지 않은) 라운드는 무시
        if(!solvedProblems.has(info.fromProblem)) return;
        setRound(info.fromProblem);
      } : null;
    });
  }
  
  /* ========= 결과 로그 ========= */
  const resultsEl = $('#results');
  function logResult(no, msg){
    const line = document.createElement('div');
    line.className = 'panel';
    line.innerHTML = `<span class="font-semibold">문제 ${no}</span> — ${msg}`;
    resultsEl.prepend(line);
  }
  
  /* ========= 문제 분기 ========= */
  function openProblem(n){
    switch(n){
      case 1: renderQ1(); break;
      case 2: renderQ2(); break;
      case 3: renderQ3(); break;
      case 4: renderQ4(); break;
      case 5: renderQ5(); break;
      case 6: renderQ6(); break;
      case 7: renderQ7(); break;
      case 8: renderQ8(); break;
    }
  }
  
  /* ---------------- 문제 1 ---------------- (오답 시 정답 공개 금지) */
  function renderQ1(){
    area.innerHTML = `
      <div class="fade-in space-y-3">
        <div class="muted text-sm">평가 요소: <b>품사의 분류 기준</b></div>
        <h3 class="font-bold">문제 1 — 품사의 분류 기준 세 가지를 쓰세요.</h3>
        <div class="bar items-center">
          <div id="timerB1" class="btn muted">경과: 0.0s</div>
          <div class="muted text-xs">15</div>
        </div>
        <div class="flex items-center gap-2">
          <input id="ans1a" class="panel w-32" />
          <span class="muted">,</span>
          <input id="ans1b" class="panel w-32" />
          <span class="muted">,</span>
          <input id="ans1c" class="panel w-32" />
        </div>
        <div class="bar">
          <button class="btn primary" id="submit1">제출</button>
          <div id="feedback1" class="text-sm"></div>
        </div>
      </div>
    `;
    const wanted = new Set(['형태','기능','의미']);
    let start = performance.now(), visible = true;
    const timerEl = $('#timerB1');
    const iv = setInterval(()=>{
      const t=(performance.now()-start)/1000;
      if(visible){
        timerEl.textContent = '경과: ' + t.toFixed(1) + 's';
        if(t>=10){ timerEl.textContent='경과: —'; visible=false; }
      }
    },50);
    $('#submit1').onclick=()=>{
      clearInterval(iv);
      const t=(performance.now()-start)/1000;
      const vals=[$('#ans1a').value,$('#ans1b').value,$('#ans1c').value]
        .map(s=>s.replace(/[,\s]/g,'').trim()).filter(Boolean);
      const ok = wanted.size===vals.length && [...wanted].every(x=>vals.includes(x));
      const fb=$('#feedback1');
      if(!ok){
        fb.innerHTML = `<span class="text-rose-600">오답입니다.</span>`;
        logResult(1, `오답 — 제출 ${t.toFixed(2)}s`);
        return;
      }
      let grade='☆';
      if(t>=14.5 && t<=15.5) grade='★★★';
      else if((t>=14 && t<14.5) || (t>15.5 && t<=16)) grade='★★';
      else if((t>=13 && t<14) || (t>16 && t<=17)) grade='★';
      fb.innerHTML = `<span class="text-emerald-700 font-semibold">정답!</span> 제출 ${t.toFixed(2)}s → 보상 <b>${grade}</b>`;
      logResult(1, `정답 — 제출 ${t.toFixed(2)}s → 보상 ${grade}`);
      revealByReward(1, grade);
      showNextControls();
    };
  }
  
  /* ---------------- 문제 2 ---------------- (가변어/불변어, 5문항) */
  const Q2_WORDS = [
    {w:'달리다', type:'가변어'},{w:'가르치다', type:'가변어'},{w:'아름답다', type:'가변어'},
    {w:'차갑다', type:'가변어'},{w:'웃다', type:'가변어'},
    {w:'바다', type:'불변어'},{w:'학교', type:'불변어'},{w:'하지만', type:'불변어'},
    {w:'어제', type:'불변어'},{w:'그리고', type:'불변어'},
    {w:'읽다', type:'가변어'},{w:'작다', type:'가변어'},{w:'빠르다', type:'가변어'},
    {w:'행복하다', type:'가변어'},{w:'들다', type:'가변어'},{w:'앉다', type:'가변어'},
    {w:'먹다', type:'가변어'},{w:'생각하다', type:'가변어'},{w:'곤두서다', type:'가변어'},
    {w:'죽다', type:'가변어'},{w:'귀엽다', type:'가변어'},{w:'가볍다', type:'가변어'},
    {w:'밉다', type:'가변어'},{w:'울다', type:'가변어'},{w:'핥다', type:'가변어'},
    {w:'고양이', type:'불변어'},{w:'마음', type:'불변어'},{w:'산', type:'불변어'},{w:'물', type:'불변어'},
    {w:'와', type:'불변어'},{w:'또', type:'불변어'},{w:'그러나', type:'불변어'},{w:'그래서', type:'불변어'},
    {w:'매우', type:'불변어'},{w:'곧', type:'불변어'},{w:'이제', type:'불변어'},{w:'자주', type:'불변어'},
    {w:'에서', type:'불변어'},{w:'가', type:'불변어'},{w:'의', type:'불변어'},
  ];
  function renderQ2(){
    area.innerHTML = `
      <div class="fade-in space-y-3">
        <div class="muted text-sm">평가 요소: <b>가변어와 불변어의 판단</b></div>
        <h3 class="font-bold">문제 2 — 주어진 단어가 가변어인지 불변어인지 판단하세요.</h3>
        <div id="q2box" class="panel">
          <div class="flex items-center justify-between">
            <div id="q2timer" class="btn muted">남은 시간: 10s</div>
            <div class="muted text-xs">소문항 <span id="q2idx">1</span> / 5 · 누적점수 <span id="q2sum">0</span></div>
          </div>
          <div class="mt-3 text-lg font-semibold" id="q2word">—</div>
          <div class="mt-3 bar">
            <button class="chip" data-k="가변어">가변어</button>
            <button class="chip" data-k="불변어">불변어</button>
          </div>
          <div class="mt-2 text-sm" id="q2feedback"></div>
          <div class="mt-2 text-xs muted" id="q2each"></div>
        </div>
      </div>
    `;
    const pool=shuffleUnique(Q2_WORDS).slice(0,5);
    let idx=0,sum=0,remaining=10,iv=null; const each=[];
    const wordEl=$('#q2word'), timerEl=$('#q2timer'), idxEl=$('#q2idx'), sumEl=$('#q2sum'), fbEl=$('#q2feedback'), eachEl=$('#q2each');
    function next(){
      if(iv){clearInterval(iv);iv=null;}
      if(idx>=5){
        let grade='☆'; if(sum>=40) grade='★★★'; else if(sum>=35) grade='★★'; else if(sum>=30) grade='★'; else if(sum>=15) grade='☆';
        fbEl.innerHTML = `종료! 총점 <b>${sum}</b> → 보상 <b>${grade}</b>`;
        logResult(2, `총점 ${sum} → 보상 ${grade}`);
        revealByReward(2, grade);
        showNextControls();
        return;
      }
      const cur=pool[idx];
      wordEl.textContent=cur.w; idxEl.textContent=idx+1; remaining=10;
      timerEl.textContent=`남은 시간: ${remaining}s`; fbEl.textContent=''; eachEl.textContent=`문항별 점수: ${each.join(' / ')}`;
      iv=setInterval(()=>{ remaining=Math.max(0,remaining-0.1); timerEl.textContent=`남은 시간: ${Math.ceil(remaining)}s`; if(remaining<=0){clearInterval(iv);iv=null; each.push(0); idx++; next();}},100);
      $$('#q2box .chip').forEach(btn=>{
        btn.onclick=()=>{
          if(!iv) return; clearInterval(iv); iv=null;
          $$('#q2box .chip').forEach(x=>x.classList.remove('selected')); btn.classList.add('selected');
          const pick=btn.dataset.k; const correct=(pick===cur.type);
          if(correct){ const pts=Math.floor(remaining); sum+=pts; each.push(pts); fbEl.innerHTML=`<span class="text-emerald-700">정답!</span> +${pts}점`; }
          else{ each.push(0); fbEl.innerHTML=`<span class="text-rose-600">오답입니다.</span>`; }
          sumEl.textContent=sum; idx++; setTimeout(next,500);
        };
      });
    } next();
  }
  
  /* ---------------- 문제 3 ---------------- (체언 고르기) */
  const Q3_POOL=[
    '하나','둘','바다','너','그것','웃다','믿다','빨리','사랑','휴대폰','늘','다시',
    '자유','미래','교실','인터넷','기억','자연','열쇠',
    '이것','저것','아무','누구','너희','그','나','너',
    '서른','백','열','다섯','육','일곱','여덟'
  ];
  const Q3_IS_CHEON=new Set([
    '하나','둘','바다','너','그것','사랑','휴대폰',
    '자유','미래','교실','인터넷','기억','자연','열쇠',
    '이것','저것','아무','누구','너희','그','나','너',
    '서른','백','열','다섯','육','일곱','여덟'
  ]);
  function renderQ3(){
    const items=shuffleUnique(Q3_POOL).slice(0,6);
    area.innerHTML=`
      <div class="fade-in space-y-3">
        <div class="muted text-sm">평가 요소: <b>체언 여부 판단하기</b></div>
        <h3 class="font-bold">문제 3 — 주어진 단어 중 체언을 모두 선택하세요.</h3>
        <div class="bar items-center">
          <div id="timerB3" class="btn muted">경과: 0.0s</div>
          <div class="muted text-xs">빼빼로</div>
        </div>
        <div id="q3cards" class="grid grid-cols-3 gap-2"></div>
        <div class="bar mt-2">
          <button class="btn primary" id="submit3">제출</button>
          <div id="feedback3" class="text-sm"></div>
        </div>
      </div>
    `;
    const cards=$('#q3cards');
    items.forEach(w=>{ const b=document.createElement('button'); b.className='chip'; b.textContent=w; b.onclick=()=>b.classList.toggle('selected'); cards.appendChild(b); });
    let start=performance.now(), visible=true; const timerEl=$('#timerB3');
    const iv=setInterval(()=>{ const t=(performance.now()-start)/1000; if(visible){ timerEl.textContent='경과: '+t.toFixed(1)+'s'; if(t>=8){timerEl.textContent='경과: —'; visible=false;} }},50);
    $('#submit3').onclick=()=>{
      clearInterval(iv);
      const t=(performance.now()-start)/1000, fb=$('#feedback3');
      const picks=$$('#q3cards .chip.selected').map(b=>b.textContent);
      const wanted=items.filter(w=>Q3_IS_CHEON.has(w));
      const ok=picks.length===wanted.length && picks.every(p=>Q3_IS_CHEON.has(p));
      if(!ok){
        fb.innerHTML=`<span class="text-rose-600">오답입니다.</span>`;
        logResult(3,`오답 — 제출 ${t.toFixed(2)}s`);
        return;
      }
      let grade='☆';
      if(t>=10.5&&t<=11.5) grade='★★★';
      else if((t>=10&&t<10.5)||(t>11.5&&t<=12)) grade='★★';
      else if((t>=9&&t<10)||(t>12&&t<=13)) grade='★';
      fb.innerHTML=`<span class="text-emerald-700 font-semibold">정답!</span> 제출 ${t.toFixed(2)}s → 보상 <b>${grade}</b>`;
      logResult(3,`정답 — 제출 ${t.toFixed(2)}s → 보상 ${grade}`);
      revealByReward(3,grade);
      showNextControls();
    };
  }
  
  /* ---------------- 문제 4 ---------------- (동사/형용사, 5문항) */
  const Q4_WORDS=[
    {w:'시리다', pos:'형용사'},{w:'따뜻하다', pos:'형용사'},{w:'조용하다', pos:'형용사'},{w:'아름답다', pos:'형용사'},
    {w:'웃다', pos:'동사'},{w:'잠들다', pos:'동사'},{w:'기억하다', pos:'동사'},
    {w:'생각하다', pos:'동사'},{w:'가르치다', pos:'동사'},{w:'앉다', pos:'동사'},{w:'열다', pos:'동사'},
    {w:'잡다', pos:'동사'},{w:'쓰다', pos:'동사'},{w:'만들다', pos:'동사'},{w:'마시다', pos:'동사'},
    {w:'뛰다', pos:'동사'},{w:'쫓다', pos:'동사'},{w:'추다', pos:'동사'},{w:'핥다', pos:'동사'},{w:'듣다', pos:'동사'},{w:'닫다', pos:'동사'},
    {w:'작다', pos:'형용사'},{w:'길다', pos:'형용사'},{w:'빠르다', pos:'형용사'},{w:'높다', pos:'형용사'},{w:'낮다', pos:'형용사'},
    {w:'즐겁다', pos:'형용사'},{w:'귀엽다', pos:'형용사'},{w:'착하다', pos:'형용사'},{w:'어렵다', pos:'형용사'},
    {w:'부드럽다', pos:'형용사'},{w:'무겁다', pos:'형용사'},{w:'슬프다', pos:'형용사'},{w:'행복하다', pos:'형용사'},{w:'건강하다', pos:'형용사'},{w:'느리다', pos:'형용사'},
  ];
  function renderQ4(){
    area.innerHTML=`
      <div class="fade-in space-y-3">
        <div class="muted text-sm">평가 요소: <b>동사와 형용사의 판단</b></div>
        <h3 class="font-bold">문제 4 — 주어진 단어가 동사인지 형용사인지 판단하세요.</h3>
        <div id="q4box" class="panel">
          <div class="flex items-center justify-between">
            <div id="q4timer" class="btn muted">남은 시간: 10s</div>
            <div class="muted text-xs">소문항 <span id="q4idx">1</span> / 5 · 누적점수 <span id="q4sum">0</span></div>
          </div>
          <div class="mt-3 text-lg font-semibold" id="q4word">—</div>
          <div class="mt-3 bar">
            <button class="chip" data-k="동사">동사</button>
            <button class="chip" data-k="형용사">형용사</button>
          </div>
          <div class="mt-2 text-sm" id="q4feedback"></div>
          <div class="mt-2 text-xs muted" id="q4each"></div>
        </div>
      </div>
    `;
    const pool=shuffleUnique(Q4_WORDS).slice(0,5);
    let idx=0,sum=0,remaining=10,iv=null; const each=[];
    const wordEl=$('#q4word'), timerEl=$('#q4timer'), idxEl=$('#q4idx'), sumEl=$('#q4sum'), fbEl=$('#q4feedback'), eachEl=$('#q4each');
    function next(){
      if(iv){clearInterval(iv);iv=null;}
      if(idx>=5){
        let grade='☆'; if(sum>=40) grade='★★★'; else if(sum>=35) grade='★★'; else if(sum>=30) grade='★'; else if(sum>=15) grade='☆';
        fbEl.innerHTML=`종료! 총점 <b>${sum}</b> → 보상 <b>${grade}</b>`;
        logResult(4,`총점 ${sum} → 보상 ${grade}`);
        revealByReward(4,grade);
        showNextControls();
        return;
      }
      const cur=pool[idx];
      wordEl.textContent=cur.w; idxEl.textContent=idx+1; remaining=10;
      timerEl.textContent=`남은 시간: ${remaining}s`; fbEl.textContent=''; eachEl.textContent=`문항별 점수: ${each.join(' / ')}`;
      iv=setInterval(()=>{ remaining=Math.max(0,remaining-0.1); timerEl.textContent=`남은 시간: ${Math.ceil(remaining)}s`; if(remaining<=0){clearInterval(iv);iv=null; each.push(0); idx++; next();}},100);
      $$('#q4box .chip').forEach(btn=>{
        btn.onclick=()=>{
          if(!iv) return; clearInterval(iv); iv=null;
          $$('#q4box .chip').forEach(x=>x.classList.remove('selected')); btn.classList.add('selected');
          const pick=btn.dataset.k; const correct=(pick===cur.pos);
          if(correct){ const pts=Math.floor(remaining); sum+=pts; each.push(pts); fbEl.innerHTML=`<span class="text-emerald-700">정답!</span> +${pts}점`; }
          else{ each.push(0); fbEl.innerHTML=`<span class="text-rose-600">오답입니다.</span>`; }
          sumEl.textContent=sum; idx++; setTimeout(next,500);
        };
      });
    } next();
  }
  
  /* ---------------- 문제 5 ---------------- (기믹 C: 오답 5초 잠금 → 2회 오답 시 교체) */
  const Q5_BANK = {
    '★★★': [
      { sentence:'오늘의 날씨는 정말 너무 더웠다.', answers:new Set(['정말','너무']) },
      { sentence:'민수가 조용히 책을 읽다가 갑자기 웃음을 터뜨렸다.', answers:new Set(['조용히','갑자기']) },
      { sentence:'날씨가 벌써 추워지고 결국 눈이 내리기 시작했다.', answers:new Set(['벌써','결국']) },
      { sentence:'우리는 이미 숙제를 끝냈고, 곧 점심을 먹으러 갈 것이다.', answers:new Set(['이미','곧']) },
      { sentence:'하늘이 너무 맑아서 기분이 정말 좋았다.', answers:new Set(['너무','정말']) },
      { sentence:'동생은 그림을 그리면서 정말 너무 즐거워했다.', answers:new Set(['정말','너무']) },
      { sentence:'아주 새 책을 사서 기분이 매우 좋다.', answers:new Set(['아주','매우']) },
    ],
    '★★': [
      { sentence:'나는 결코 거짓말을 하지 않았어.', answers:new Set(['결코']) },
      { sentence:'심지어 선생님도 그 소식을 몰랐다.', answers:new Set(['심지어']) },
      { sentence:'도대체 뭐가 그렇게 짜증나길래 화를 내는 거야?', answers:new Set(['도대체']) },
      { sentence:'결국 그는 자신의 잘못을 인정하였다.', answers:new Set(['결국']) },
      { sentence:'나는 반드시 승리할 것이다.', answers:new Set(['반드시']) },
    ],
    '★': [
      { sentence:'영수는 정말 성실하다.', answers:new Set(['정말']) },
      { sentence:'버스가 벌써 떠나버렸다.', answers:new Set(['벌써']) },
      { sentence:'다시 시작한다면 이번에는 잘 할 수 있을 거야.', answers:new Set(['다시']) },
      { sentence:'동생은 내 물건을 일부러 숨겼다.', answers:new Set(['일부러']) },
      { sentence:'선생님은 발표 자세를 특히 칭찬하셨다.', answers:new Set(['특히']) },
      { sentence:'나는 숙제를 벌써 끝냈다.', answers:new Set(['벌써']) },
      { sentence:'친구가 밥을 빨리 먹었다.', answers:new Set(['빨리']) },
    ],
  };
  function eojeolize(s){ return s.split(/\s+/).map(x=>x.trim()).filter(Boolean); }
  function renderQ5(){
    area.innerHTML=`
      <div class="fade-in space-y-3">
        <div class="muted text-sm">평가 요소: <b>주어진 문장에서 부사 찾기</b></div>
        <h3 class="font-bold">문제 5</h3>
        <div class="bar">
          <button class="btn" data-g="★★★">★★★</button>
          <button class="btn" data-g="★★">★★</button>
          <button class="btn" data-g="★">★</button>
        </div>
        <div id="q5box"></div>
      </div>
    `;
    $$('#problemArea [data-g]').forEach(b=>b.onclick=()=>startQ5(b.dataset.g));
  
    function startQ5(gradePick){
      let tries = 0;
      let pool = [...Q5_BANK[gradePick]];
      let picked = pool[Math.floor(Math.random()*pool.length)];
      function pickNew(){
        let np = pool[Math.floor(Math.random()*pool.length)];
        for(let i=0;i<5 && np === picked;i++) np = pool[Math.floor(Math.random()*pool.length)];
        return np;
      }
  
      const eos=eojeolize(picked.sentence).map(x=>({text:x,sel:false}));
      const multi = (gradePick==='★★★');
      $('#q5box').innerHTML=`
        <div class="panel mt-3">
          <div class="font-semibold mb-1">${ multi ? '다음 중 부사를 모두 고르시오.' : '다음 중 부사를 고르시오.'}</div>
          <div class="muted text-xs mb-2">선택 규칙: ${multi?'여러 개 선택 가능':'하나만 선택'}</div>
          <div id="q5eo" class="bar"></div>
          <div class="bar mt-3">
            <button class="btn primary" id="q5submit">제출</button>
            <div id="q5fb" class="text-sm"></div>
          </div>
        </div>
      `;
      const cont=$('#q5eo');
      eos.forEach((eo,i)=>{
        const btn=document.createElement('button');
        btn.className='chip'; btn.textContent=eo.text;
        btn.onclick=()=>{
          if(multi){ eo.sel=!eo.sel; btn.classList.toggle('selected',eo.sel); }
          else{ eos.forEach((e,j)=>e.sel=(i===j?!e.sel:false)); $$('#q5eo .chip').forEach((x,idx)=>x.classList.toggle('selected',eos[idx].sel)); }
        };
        cont.appendChild(btn);
      });
  
      $('#q5submit').onclick = async ()=>{
        if($('#q5submit').disabled) return;  // 잠금 중
        const picks = eos.filter(e=>e.sel).map(e=>e.text.replace(/[,.!?]/g,''));
        const answers = [...picked.answers].map(a=>a.replace(/[,.!?]/g,''));
        const ok = picks.length>0 && picks.length===answers.length && picks.every(p=>answers.includes(p));
        const fb = $('#q5fb');
  
        if(ok){
          fb.innerHTML = `<span class="text-emerald-700">정답!</span> → 보상 <b>${gradePick}</b>`;
          logResult(5,`정답 → 보상 ${gradePick}`);
          revealByReward(5,gradePick);
          showNextControls();
          return;
        }
  
        // ❌ 오답: 5초 잠금
        tries++;
        fb.innerHTML = `<span class="text-rose-600">오답입니다. 5초간 어떤 행동도 할 수 없습니다.</span>`;
        lockInputs(true);
        await sleep(5000);
        lockInputs(false);
  
        if(tries >= 2){
          picked = pickNew();
          fb.innerHTML = `<span class="text-gray-600">새 문장으로 교체되었습니다.</span>`;
          startQ5(gradePick);
          return;
        }
  
        function lockInputs(flag){
          $('#q5submit').disabled = flag;
          $$('#q5eo .chip').forEach(b=>b.disabled = flag);
        }
      };
    }
  }
  
  /* ---------------- 문제 6 ---------------- (기믹 C 동일) */
  const Q6_BANK = {
    '★★★': [
      { sentence:'<u>한</u> 사람이라도 포기하지 말자.', answer:'관형사' },
      { sentence:'<u>저</u> 건물이 바로 시청이다.', answer:'관형사' },
      { sentence:'<u>울던</u> 아이가 금세 웃음을 되찾았다.', answer:'동사' },
      { sentence:'<u>부지런한</u> 사람은 늘 성공해.', answer:'형용사' },
    ],
    '★★': [
      { sentence:'<u>흐린</u> 하늘 아래, 비가 내렸다.', answer:'용언' },
      { sentence:'<u>떨어진</u> 연필을 주웠다.', answer:'용언' },
      { sentence:'<u>읽은</u> 책을 다시 꺼내 보았다.', answer:'용언' },
      { sentence:'<u>새</u> 교과서를 받았다.', answer:'관형사' },
    ],
    '★': [
      { sentence:'<u>새</u> 책이 오늘 배송되었다.', answer:'관형사' },
      { sentence:'<u>먹을</u> 음식이 아직 남아 있다.', answer:'용언' },
      { sentence:'<u>모든</u> 준비가 끝났다.', answer:'관형사' },
    ],
  };
  function renderQ6(){
    area.innerHTML=`
      <div class="fade-in space-y-3">
        <div class="muted text-sm">평가 요소: <b>관형사 vs 용언의 관형사형</b></div>
        <h3 class="font-bold">문제 6</h3>
        <div class="bar">
          <button class="btn" data-g="★★★">★★★</button>
          <button class="btn" data-g="★★">★★</button>
          <button class="btn" data-g="★">★</button>
        </div>
        <div id="q6box"></div>
      </div>
    `;
    $$('#problemArea [data-g]').forEach(b=>b.onclick=()=>startQ6(b.dataset.g));
  
    function startQ6(gradePick){
      let tries = 0;
      let pool = [...Q6_BANK[gradePick]];
      let picked = pool[Math.floor(Math.random()*pool.length)];
      function pickNew(){
        let np = pool[Math.floor(Math.random()*pool.length)];
        for(let i=0;i<5 && np === picked;i++) np = pool[Math.floor(Math.random()*pool.length)];
        return np;
      }
  
      $('#q6box').innerHTML=`
        <div class="panel mt-3">
          <div class="mb-2"><b>문장:</b> ${picked.sentence}</div>
          <div id="q6ops" class="bar"></div>
          <div class="bar mt-3">
            <button class="btn primary" id="q6submit">제출</button>
            <div id="q6fb" class="text-sm"></div>
          </div>
        </div>
      `;
      const ops=$('#q6ops'); let pick=null;
      const options = (gradePick==='★★★') ? ['관형사','동사','형용사'] : ['관형사','용언'];
      options.forEach(op=>{
        const b=document.createElement('button'); b.className='chip'; b.textContent=op;
        b.onclick=()=>{ pick=op; $$('#q6ops .chip').forEach(x=>x.classList.remove('selected')); b.classList.add('selected'); };
        ops.appendChild(b);
      });
  
      $('#q6submit').onclick = async ()=>{
        if($('#q6submit').disabled) return;
        const fb = $('#q6fb');
  
        if(pick === picked.answer){
          fb.innerHTML = `<span class="text-emerald-700">정답!</span>`;
          logResult(6,`정답 → 보상 ${gradePick}`);
          revealByReward(6,gradePick);
          showNextControls();
          return;
        }
  
        // ❌ 오답: 5초 잠금
        tries++;
        fb.innerHTML = `<span class="text-rose-600">오답입니다. 5초간 어떤 행동도 할 수 없습니다.</span>`;
        lockInputs(true);
        await sleep(5000);
        lockInputs(false);
  
        if(tries >= 2){
          picked = pickNew();
          fb.innerHTML = `<span class="text-gray-600">새 문장으로 교체되었습니다.</span>`;
          startQ6(gradePick);
          return;
        }
  
        function lockInputs(flag){
          $('#q6submit').disabled = flag;
          $$('#q6ops .chip').forEach(b=>b.disabled = flag);
        }
      };
    }
  }
  
  /* ---------------- 문제 7 ---------------- (관형사/명사/수사) */
  function renderQ7(){
    const items = [
      { text:'박 선생님의 <u>첫째</u>는 아들이다.', answer:'명사' },
      { text:'매월 <u>첫째</u> 주 토요일은 항상 약속이 있다.', answer:'관형사' },
      { text:'다이어트를 위해서는 <u>첫째</u>, 6시 이후에 금식해야 한다. 둘째, 액상과당 섭취를 줄여야 한다.', answer:'수사' },
    ];
    const OPS = ['관형사','명사','수사'];
    area.innerHTML=`
      <div class="fade-in space-y-3">
        <div class="muted text-sm">평가 요소: <b>관형사, 명사, 수사의 구분</b></div>
        <h3 class="font-bold">문제 7 — 각 문장의 밑줄 친 단어의 품사를 선택하세요.</h3>
        <div class="bar items-center">
          <div id="timerB7" class="btn muted">경과: 0.0s</div>
          <div class="muted text-xs">자축인묘진사오미신유술해</div>
        </div>
        <div id="q7wrap" class="space-y-3"></div>
        <div class="bar">
          <button class="btn primary" id="submit7">제출</button>
          <div id="feedback7" class="text-sm"></div>
        </div>
      </div>
    `;
    const wrap=$('#q7wrap'); const picks=new Array(items.length).fill(null);
    items.forEach((it, idx)=>{
      const row=document.createElement('div'); row.className='panel';
      row.innerHTML=`<div class="mb-2">${it.text}</div><div class="bar" id="ops-${idx}"></div>`;
      wrap.appendChild(row);
      const opsEl=row.querySelector(`#ops-${idx}`);
      OPS.forEach(op=>{
        const b=document.createElement('button'); b.className='chip'; b.textContent=op;
        b.onclick=()=>{ picks[idx]=op; $$('#ops-'+idx+' .chip', row).forEach(x=>x.classList.remove('selected')); b.classList.add('selected'); };
        opsEl.appendChild(b);
      });
    });
    let start=performance.now(), visible=true; const timerEl=$('#timerB7');
    const iv=setInterval(()=>{ const t=(performance.now()-start)/1000; if(visible){ timerEl.textContent='경과: '+t.toFixed(1)+'s'; if(t>=6){timerEl.textContent='경과: —'; visible=false;} }},50);
    $('#submit7').onclick=()=>{
      clearInterval(iv);
      const t=(performance.now()-start)/1000; const fb=$('#feedback7');
      const allPicked=picks.every(x=>!!x);
      const allCorrect = allPicked && picks.every((p,i)=>p===items[i].answer);
      if(!allCorrect){
        fb.innerHTML=`<span class="text-rose-600">오답입니다.</span>`;
        logResult(7,`오답 — 제출 ${t.toFixed(2)}s`);
        return;
      }
      let grade='☆';
      if(t>=11.5&&t<=12.5) grade='★★★';
      else if((t>=11&&t<11.5)||(t>12.5&&t<=13)) grade='★★';
      else if((t>=10&&t<11)||(t>13&&t<=14)) grade='★';
      fb.innerHTML=`<span class="text-emerald-700 font-semibold">정답!</span> 제출 ${t.toFixed(2)}s → 보상 <b>${grade}</b>`;
      logResult(7,`정답 — 제출 ${t.toFixed(2)}s → 보상 ${grade}`);
      revealByReward(7, grade);
      showNextControls();
    };
  }
  
  /* ---------------- 문제 8 ---------------- (감탄사 여부, 5문항) */
  const Q8_POOL = [
    { s:'<u>흥수야</u>, 어디 가?', isInterj:false },
    { s:'<u>야</u>, 어디 가?', isInterj:true },
    { s:'<u>아</u>, 정말 아름답다.', isInterj:true },
    { s:'미정<u>아</u>, 너 정말 예쁘다.', isInterj:false }, // 호격 조사
    { s:'<u>여보세요</u>, 거기 집게리아죠?', isInterj:true },
    { s:'<u>그래</u>, 결심했어!', isInterj:true },
    { s:'<u>와</u>, 저기 무지개다!', isInterj:true },
    { s:'<u>아니요</u>, 저는 그렇게 생각하지 않는데요?', isInterj:true },
    { s:'<u>아하!</u> 이제 이해가 되었어.', isInterj:true },
    { s:'<u>어이</u>, 거기 누구 없소?', isInterj:true },
    { s:'<u>이봐</u>, 그러면 안 되지.', isInterj:true },
    { s:'<u>친구야</u>, 나랑 같이 가자.', isInterj:false }, // 호격
  ];
  function renderQ8(){
    area.innerHTML=`
      <div class="fade-in space-y-3">
        <div class="muted text-sm">평가 요소: <b>감탄사 여부 판단하기</b></div>
        <h3 class="font-bold">문제 8 — 밑줄 친 부분이 감탄사인지 아닌지 판단하시오.</h3>
        <div id="q8box" class="panel">
          <div class="flex items-center justify-between">
            <div id="q8timer" class="btn muted">남은 시간: 10s</div>
            <div class="muted text-xs">소문항 <span id="q8idx">1</span> / 5 · 누적점수 <span id="q8sum">0</span></div>
          </div>
          <div class="mt-3 text-lg font-semibold" id="q8sent">—</div>
          <div class="mt-3 bar">
            <button class="chip" data-k="true">감탄사이다</button>
            <button class="chip" data-k="false">감탄사가 아니다</button>
          </div>
          <div class="mt-2 text-sm" id="q8feedback"></div>
          <div class="mt-2 text-xs muted" id="q8each"></div>
        </div>
      </div>
    `;
    const pool=shuffleUnique(Q8_POOL).slice(0,5);
    let idx=0,sum=0,remaining=10,iv=null; const each=[];
    const sentEl=$('#q8sent'), timerEl=$('#q8timer'), idxEl=$('#q8idx'), sumEl=$('#q8sum'), fbEl=$('#q8feedback'), eachEl=$('#q8each');
    function next(){
      if(iv){clearInterval(iv);iv=null;}
      if(idx>=5){
        let grade='☆'; if(sum>=40) grade='★★★'; else if(sum>=35) grade='★★'; else if(sum>=30) grade='★'; else if(sum>=15) grade='☆';
        fbEl.innerHTML=`종료! 총점 <b>${sum}</b> → 보상 <b>${grade}</b>`;
        logResult(8,`총점 ${sum} → 보상 ${grade}`);
        revealByReward(8,grade);
        showNextControls();
        return;
      }
      const cur=pool[idx];
      sentEl.innerHTML = cur.s;
      idxEl.textContent=idx+1; remaining=10;
      timerEl.textContent=`남은 시간: ${remaining}s`; fbEl.textContent=''; eachEl.textContent=`문항별 점수: ${each.join(' / ')}`;
      iv=setInterval(()=>{ remaining=Math.max(0,remaining-0.1); timerEl.textContent=`남은 시간: ${Math.ceil(remaining)}s`; if(remaining<=0){clearInterval(iv);iv=null; each.push(0); idx++; next();}},100);
      $$('#q8box .chip').forEach(btn=>{
        btn.onclick=()=>{
          if(!iv) return; clearInterval(iv); iv=null;
          $$('#q8box .chip').forEach(x=>x.classList.remove('selected')); btn.classList.add('selected');
          const pick=(btn.dataset.k==='true'); const correct=(pick===cur.isInterj);
          if(correct){ const pts=Math.floor(remaining); sum+=pts; each.push(pts); fbEl.innerHTML=`<span class="text-emerald-700">정답!</span> +${pts}점`; }
          else{ each.push(0); fbEl.innerHTML=`<span class="text-rose-600">오답입니다.</span>`; }
          sumEl.textContent=sum; idx++; setTimeout(next,500);
        };
      });
    } next();
  }
  
  /* ===================== 숨겨진 문제 1 ===================== */
  function openFinal1(){
    const prompt = '최종 선언문을 정확하게 입력하면 서고의 문이 열립니다.';
    area.innerHTML = `
      <div class="fade-in space-y-3">
        <div class="font-bold text-lg">🔒 숨겨진 문제</div>
        <div class="muted text-sm">${prompt}</div>
        <div class="panel">
          <input id="finalInput" class="w-full panel" placeholder="여기에 선언문 전체를 입력하세요."/>
          <div class="bar mt-3">
            <button id="finalSubmit" class="btn primary">제출</button>
            <div id="finalFb" class="text-sm"></div>
          </div>
        </div>
      </div>
    `;
    const targetA = '우리는 말과 글을 지켜서 불멸의 정신을 후대에 전한다.';
    const targetB = '우리는 말과 글을 지켜서 불멸의 정신을 후대에 전한다'; // 마침표 없이
    const input = $('#finalInput'); const btn = $('#finalSubmit'); const fb = $('#finalFb');
  
    btn.onclick = async ()=>{
      const val = (input.value || '').trim();
      if(val===targetA || val===targetB){
        fb.innerHTML = `<span class="text-emerald-700 font-semibold">정답!</span> 서고의 문이 열립니다…`;
        await sleep(600);
        openFinal2();
      }else{
        fb.innerHTML = `<span class="text-rose-600">오답입니다.</span> 10초 동안 입력이 잠깁니다.`;
        input.disabled = true; btn.disabled = true;
        await lockCountdown(btn, 10, '남은 잠금');
        input.disabled = false; btn.disabled = false; 
        fb.innerHTML = `<span class="text-gray-700">이제 다시 입력하거나, 위 선언문 조각을 클릭해 해당 문제를 다시 풀 수 있습니다.</span>`;
      }
    };
  }
  
  /* ===================== 숨겨진 문제 2 ===================== */
  function openFinal2(){
    area.innerHTML = `
      <div class="fade-in space-y-3">
        <div class="font-bold text-lg">🔒 숨겨진 문제 2</div>
        <div class="muted text-sm">최종 선언문에 사용된 조사의 개수를 쓰시오.</div>
        <div class="panel">
          <input id="final2Input" class="panel w-40" type="number" min="0" placeholder="숫자 입력" />
          <div class="bar mt-3">
            <button id="final2Submit" class="btn primary">제출</button>
            <div id="final2Fb" class="text-sm"></div>
          </div>
        </div>
      </div>
    `;
    const input = $('#final2Input'); const btn = $('#final2Submit'); const fb = $('#final2Fb');
  
    btn.onclick = async ()=>{
      const val = String(input.value||'').trim();
      if(val === '6'){
        fb.innerHTML = `<span class="text-emerald-700 font-semibold">정답!</span> 축하합니다.`;
        await sleep(300);
        showEnding();
      }else{
        fb.innerHTML = `<span class="text-rose-600">오답입니다.</span> 10초 동안 입력이 잠깁니다.`;
        input.disabled = true; btn.disabled = true;
        await lockCountdown(btn, 10, '남은 잠금');
        input.disabled = false; btn.disabled = false;
        fb.innerHTML = `<span class="text-gray-700">다시 시도해 보세요.</span>`;
      }
    };
  }
  
  /* 잠금 카운트다운 버튼 라벨 보조 */
  async function lockCountdown(buttonEl, secs, prefix){
    const base = buttonEl.textContent;
    for(let t=secs; t>0; t--){
      buttonEl.textContent = `${prefix} ${t}s`;
      await sleep(1000);
    }
    buttonEl.textContent = base;
  }
  
  /* ===================== 엔딩 ===================== */
  function showEnding(){
    const lines = [
      '참으로 장하구나, 우리 후손들이여.',
      '너희의 손끝과 마음으로',
      '흩어진 품사의 조각들이 다시 하나로 이어졌다.',
      '이로써 우리말의 숨결이 되살아났고',
      '이제 그 숨결을 이어갈 사람들이 바로 너희다.',
      '말 한마디에 마음을 담고,',
      '글 한 줄에 세상을 담아라.',
      '그것이 우리말을 지키는 진정한 길이니라.'
    ];
    const imgSrc = ENDING_IMG; // 내장 이미지 사용
  
    area.innerHTML = `
      <div class="fade-in">
        <div class="ending-wrap">
          <img class="ending-img" src="${imgSrc}" alt="말의 비밀 서고"/>
        </div>
        <div class="bar mt-3">
          <button class="btn" id="stayBtn">그 자리에서 감상하기</button>
        </div>
      </div>
    `;
    const wrap = $('.ending-wrap');
    const topStart = 8, step = 9;
    lines.forEach((txt, i)=>{
      const dv = document.createElement('div');
      dv.className = 'ending-line';
      dv.style.top = (topStart + i*step) + '%';
      dv.style.fontSize = (i<2? '1.35rem':'1.25rem');
      dv.textContent = txt;
      wrap.appendChild(dv);
    });
    (async ()=>{
      const els = $$('.ending-line', wrap);
      for(let i=0;i<els.length;i++){
        await sleep(3000);
        els[i].classList.add('show');
      }
    })();
    $('#stayBtn').onclick = ()=>{};
  }
  
  /* ===== 공통: 셔플 유틸 ===== */
  function shuffleUnique(arr){
    const a=[...arr];
    for(let i=a.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [a[i],a[j]]=[a[j],a[i]];
    }
    return a;
  }
  /* ===== 입장 인트로 제어 ===== */
  const intro = document.getElementById('introOverlay');
  const enterBtn = document.getElementById('enterBtn');
  const pwArea = document.getElementById('pwArea');
  const pwInput = document.getElementById('pwInput');
  const pwSubmit = document.getElementById('pwSubmit');
  const pwFb = document.getElementById('pwFb');
  
  enterBtn.onclick = () => {
    enterBtn.classList.add('hidden');
    pwArea.classList.remove('hidden');
    pwInput.focus();
  };
  
  pwSubmit.onclick = () => {
    const val = pwInput.value.trim();
    if (val === '0308') {
      pwFb.textContent = '';
      intro.classList.add('fade-out');
      setTimeout(() => {
        intro.remove();      // 오버레이 제거
        setRound(1);         // 게임 시작
      }, 500);
    } else {
      pwFb.textContent = '비밀번호가 올바르지 않습니다.';
      pwInput.value = '';
      pwInput.focus();
    }
  };
  
  // 초기에는 문제를 자동 시작하지 않음
  
  /* ---------------- 시작: 라운드 1 ---------------- */
});
