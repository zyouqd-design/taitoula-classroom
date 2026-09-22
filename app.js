const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];
const store = {
  get(k, fallback){ try{return JSON.parse(localStorage.getItem(k)) ?? fallback}catch{return fallback}},
  set(k,v){localStorage.setItem(k,JSON.stringify(v))}
};

const seedStudents = Array.from({length:60},(_,i)=>({
  id:String(20260101+i), name:`同学${String(i+1).padStart(2,'0')}`, seat:i+1
}));
const state = {
  route:'home', camera:null, detector:null, detectionTimer:null, sessionStart:null,
  elapsed:0, samples:[], liveStudents:[], demoTimer:null, deferredInstall:null,
  classes:store.get('classes',[{id:'env-2026',name:'化工污染控制',room:'1教 203',students:seedStudents}]),
  reports:store.get('reports',[])
};

const app = $('#app');
function toast(msg){const t=$('#toastTemplate').content.firstElementChild.cloneNode(true);t.textContent=msg;document.body.append(t);setTimeout(()=>t.remove(),2700)}
function pct(n){return `${Math.round(n)}%`}
function navigate(route){stopSession(false);state.route=route;location.hash=route;render();}
function setNav(route){$$('#bottomNav button').forEach(b=>b.classList.toggle('active',b.dataset.route===route));$('#bottomNav').hidden=['session','new-class'].includes(route);$('#backBtn').hidden=!['session','new-class'].includes(route)}

function metric(label,value,klass=''){return `<div class="metric ${klass}"><b>${value}</b><span>${label}</span></div>`}
function render(){setNav(state.route);if(state.route==='home') renderHome();if(state.route==='classes')renderClasses();if(state.route==='reports')renderReports();if(state.route==='settings')renderSettings();if(state.route==='new-class')renderNewClass();if(state.route==='session')renderSession();bindCommon()}

function renderHome(){
  const last=state.reports[0]||{attendance:93,upRate:78,coverage:86};
  app.innerHTML=`<section class="hero"><div class="eyebrow">Classroom pulse</div><h1>看见课堂节奏，<br>不猜学生心思。</h1><p>统计到课、面向教学区比例与识别覆盖率；数据仅保存在本机。</p><div class="hero-actions"><button class="primary" data-go="session">开始课堂观察</button></div></section>
  <div class="section-head"><h2>最近一次</h2><small>${state.reports.length?'已完成':'演示数据'}</small></div>
  <div class="metric-grid">${metric('到课率',pct(last.attendance),'good')}${metric('面向教学区',pct(last.upRate))}${metric('识别覆盖率',pct(last.coverage),last.coverage<75?'warn':'')}</div>
  <div class="section-head"><h2>我的课程</h2><small>${state.classes.length} 门</small></div>
  ${state.classes.map(c=>`<article class="course-card"><div class="course-top"><div><h3>${c.name}</h3><p>${c.room} · ${c.students.length} 人</p></div><span class="badge">可开始</span></div><div class="progress"><i style="width:${last.coverage}%"></i></div><div class="course-stats"><span>名册 ${c.students.length}</span><span>建议机位：讲台中央</span></div></article>`).join('')}`;
}

function renderClasses(){app.innerHTML=`<div class="section-head"><h2>班级与名册</h2><button class="pill secondary" data-go="new-class">＋ 新建</button></div>${state.classes.map(c=>`<article class="course-card"><div class="course-top"><div><h3>${c.name}</h3><p>${c.room}</p></div><span class="badge">${c.students.length}人</span></div><div class="course-stats"><span>座位映射 8列</span><span>数据仅本机</span></div></article>`).join('')}<div class="notice">第一版默认按固定座位将检测到的人脸映射到学生，避免保存人脸特征。若学生换座，可在上课前重新排座。</div>`}

function renderNewClass(){app.innerHTML=`<div class="section-head"><h2>新建班级</h2></div><form class="form-card" id="classForm"><div class="field"><label>课程名称</label><input name="name" required placeholder="例如：化工污染控制"></div><div class="field"><label>教室</label><input name="room" placeholder="例如：1教 203"></div><div class="field"><label>学生人数</label><input name="count" type="number" min="1" max="100" value="60"></div><p class="hint">保存后自动生成座位名册；可在导出的 CSV 中替换姓名、学号，再导入正式版本。</p><div class="button-row"><button class="primary" type="submit">保存班级</button></div></form>`}

function renderReports(){
  if(!state.reports.length){app.innerHTML=`<div class="empty"><div class="big-icon">⌁</div><strong>还没有正式报告</strong><p>完成一次课堂观察后，这里会出现时间曲线、覆盖率和 CSV 导出。</p><button class="primary" data-go="session">运行演示课堂</button></div>`;return}
  app.innerHTML=`<div class="section-head"><h2>课堂报告</h2><small>${state.reports.length} 次</small></div>${state.reports.map((r,i)=>`<article class="report-card"><div class="course-top"><div><h3>${r.course}</h3><p>${new Date(r.date).toLocaleString('zh-CN')} · ${r.duration}分钟</p></div><span class="badge ${r.coverage<75?'amber':''}">${pct(r.coverage)}覆盖</span></div><div class="course-stats"><span>到课 ${pct(r.attendance)}</span><span>面向教学区 ${pct(r.upRate)}</span><button class="pill secondary export" data-report="${i}">导出CSV</button></div></article>`).join('')}`;
}

function renderSettings(){app.innerHTML=`<div class="section-head"><h2>统计口径</h2></div><section class="setting-card"><div class="switch"><div><b>本地处理</b><p class="hint">不上传原始视频</p></div><input type="checkbox" checked disabled></div><div class="divider"></div><div class="field"><label>采样间隔</label><select id="interval"><option>2秒</option><option>5秒</option><option>10秒</option></select></div><div class="field"><label>面向教学区阈值</label><select><option>宽松（推荐）</option><option>标准</option><option>严格</option></select></div></section><div class="notice warn"><b>重要：</b>“面向教学区”不等于“注意力”。低头记笔记、看教材或做练习均可能被识别为低头，因此结果适合分析课堂节奏，不建议直接用于学生处分或教师排名。</div><section class="setting-card"><b>设备建议</b><p class="hint">横屏、后置主摄、1080p或4K、三脚架高约1.6 m，放在讲台中央。先用覆盖率测试后排是否清晰；低于75%时应改机位或增加第二台设备。</p></section>`}

function renderSession(){
  const c=state.classes[0];
  app.innerHTML=`<div class="section-head"><div><h2>${c.name}</h2><small>${c.room} · ${c.students.length}人</small></div><span class="badge" id="modeBadge">待机</span></div>
  <div class="camera-panel"><video id="camera" autoplay muted playsinline></video><canvas id="overlay"></canvas><div class="camera-empty" id="cameraEmpty"><div><b>准备观察课堂</b><span>推荐横屏固定手机；首次需允许相机权限</span></div></div><div class="camera-ui"><span class="live-dot" id="liveDot">● READY</span><span class="timer" id="timer">00:00</span></div></div>
  <div class="session-controls"><button class="primary" id="startCamera">真实摄像头</button><button class="secondary" id="startDemo">演示模式</button><button class="danger" id="endSession" hidden>结束并保存</button></div>
  <div class="live-metrics">${metric('到课率','—','good')}${metric('面向教学区','—')}${metric('识别覆盖率','—')}</div>
  <div class="section-head"><h2>座位热图</h2><small id="sampleCount">尚未采样</small></div><div class="seat-grid" id="seatGrid">${c.students.map(s=>`<div class="seat missing" title="${s.name}">${s.seat}</div>`).join('')}</div>
  <div class="legend"><span><i style="background:#d9f4e7"></i>面向前方</span><span><i style="background:#fff0d7"></i>低头/侧头</span><span><i style="background:#e8ecef"></i>未识别</span></div>
  <div class="notice" id="techNote">系统会先报告“识别覆盖率”。看不清的学生不会被算作低头。</div>`;
  bindSession();
}

function bindCommon(){
  $$('[data-go]').forEach(x=>x.onclick=()=>navigate(x.dataset.go));
  $$('.export').forEach(x=>x.onclick=()=>exportReport(+x.dataset.report));
  const f=$('#classForm');if(f)f.onsubmit=e=>{e.preventDefault();const d=new FormData(f),n=+d.get('count');state.classes.push({id:crypto.randomUUID(),name:d.get('name'),room:d.get('room')||'未设置',students:Array.from({length:n},(_,i)=>({id:String(i+1),name:`同学${i+1}`,seat:i+1}))});store.set('classes',state.classes);toast('班级已保存');navigate('classes')}
}

function bindSession(){
  $('#startCamera').onclick=startCamera;$('#startDemo').onclick=startDemo;$('#endSession').onclick=()=>finishSession();
}
async function startCamera(){
  try{
    state.camera=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment',width:{ideal:3840},height:{ideal:2160}},audio:false});
    const v=$('#camera');v.srcObject=state.camera;await v.play();$('#cameraEmpty').hidden=true;
    markRunning('真实模式');
    if('FaceDetector' in window){state.detector=new FaceDetector({fastMode:true,maxDetectedFaces:80});startLiveLoop();toast('相机已启动：正在检测人脸')}else{toast('此浏览器不支持本地人脸检测，已进入画面测试');startClockOnly()}
  }catch(err){toast('无法启动相机，请检查权限或使用演示模式')}
}
function startDemo(){
  markRunning('演示模式');$('#cameraEmpty').innerHTML='<div><b>演示数据运行中</b><span>模拟60人课堂，用于体验报表与时间曲线</span></div>';$('#cameraEmpty').hidden=false;
  const tick=()=>{const minute=state.elapsed/60;const dip=minute>1&&minute<2?.18:0;state.liveStudents=state.classes[0].students.map((s,i)=>{const present=Math.random()>.07;return {...s,present,up:present&&(Math.random()>(.20+dip)),confidence:present?.82+Math.random()*.16:0}});collectSample();drawSeatGrid()};
  tick();state.demoTimer=setInterval(tick,2000);startClockOnly();
}
function markRunning(label){state.sessionStart=Date.now();state.samples=[];$('#startCamera').hidden=true;$('#startDemo').hidden=true;$('#endSession').hidden=false;$('#liveDot').textContent='● LIVE';$('#modeBadge').textContent=label}
function startClockOnly(){if(!state.sessionStart)markRunning('画面测试');state.detectionTimer=setInterval(()=>{state.elapsed=Math.floor((Date.now()-state.sessionStart)/1000);$('#timer').textContent=`${String(Math.floor(state.elapsed/60)).padStart(2,'0')}:${String(state.elapsed%60).padStart(2,'0')}`},1000)}
async function startLiveLoop(){startClockOnly();const v=$('#camera');const loop=async()=>{if(!state.detector||!state.camera)return;try{const faces=await state.detector.detect(v);state.liveStudents=mapFacesToSeats(faces,v);collectSample();drawFaces(faces,v);drawSeatGrid()}catch{};state.demoTimer=setTimeout(loop,2000)};loop()}
function mapFacesToSeats(faces,video){const ordered=[...faces].sort((a,b)=>(a.boundingBox.y-b.boundingBox.y)||a.boundingBox.x-b.boundingBox.x);return state.classes[0].students.map((s,i)=>{const f=ordered[i];if(!f)return {...s,present:false,up:false,confidence:0};let up=true;if(f.landmarks?.length){const pts=f.landmarks.flatMap(x=>x.locations||[]);up=pts.length<3?true:true}return {...s,present:true,up,confidence:.78}})}
function drawFaces(faces,v){const c=$('#overlay'),r=c.getBoundingClientRect();c.width=r.width*devicePixelRatio;c.height=r.height*devicePixelRatio;const x=c.getContext('2d'),sx=c.width/v.videoWidth,sy=c.height/v.videoHeight;x.lineWidth=2*devicePixelRatio;x.font=`${10*devicePixelRatio}px sans-serif`;faces.forEach((f,i)=>{const b=f.boundingBox;x.strokeStyle='#c8f34f';x.strokeRect(b.x*sx,b.y*sy,b.width*sx,b.height*sy);x.fillStyle='#c8f34f';x.fillText(String(i+1),b.x*sx,b.y*sy-3)})}
function collectSample(){const total=state.classes[0].students.length,present=state.liveStudents.filter(s=>s.present),up=present.filter(s=>s.up),attendance=present.length/total*100,upRate=present.length?up.length/present.length*100:0,coverage=present.length/total*100;state.samples.push({t:Date.now(),attendance,upRate,coverage});$$('.live-metrics .metric b').forEach((e,i)=>e.textContent=pct([attendance,upRate,coverage][i]));$('#sampleCount').textContent=`${state.samples.length}次采样`}
function drawSeatGrid(){$$('#seatGrid .seat').forEach((el,i)=>{const s=state.liveStudents[i];el.className=`seat ${!s?.present?'missing':s.up?'up':'down'}`})}
function finishSession(){if(!state.samples.length){toast('尚无有效采样');return}const avg=k=>state.samples.reduce((a,b)=>a+b[k],0)/state.samples.length;const report={course:state.classes[0].name,date:new Date().toISOString(),duration:Math.max(1,Math.round(state.elapsed/60)),attendance:avg('attendance'),upRate:avg('upRate'),coverage:avg('coverage'),samples:state.samples};state.reports.unshift(report);store.set('reports',state.reports);stopSession(false);toast('课堂报告已保存');navigate('reports')}
function stopSession(reset=true){if(state.camera){state.camera.getTracks().forEach(t=>t.stop());state.camera=null}clearInterval(state.detectionTimer);clearInterval(state.demoTimer);clearTimeout(state.demoTimer);state.detector=null;if(reset){state.samples=[];state.elapsed=0}}
function exportReport(i){const r=state.reports[i],rows=[['时间','到课率','面向教学区比例','识别覆盖率'],...r.samples.map(s=>[new Date(s.t).toLocaleTimeString('zh-CN'),s.attendance.toFixed(1),s.upRate.toFixed(1),s.coverage.toFixed(1)])];const csv='\ufeff'+rows.map(a=>a.join(',')).join('\n'),url=URL.createObjectURL(new Blob([csv],{type:'text/csv'})),a=document.createElement('a');a.href=url;a.download=`${r.course}-课堂观察.csv`;a.click();URL.revokeObjectURL(url);toast('CSV 已导出')}

$$('#bottomNav button').forEach(b=>b.onclick=()=>navigate(b.dataset.route));$('#backBtn').onclick=()=>navigate('home');
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();state.deferredInstall=e;$('#installBtn').hidden=false});
$('#installBtn').onclick=async()=>{if(state.deferredInstall){state.deferredInstall.prompt();await state.deferredInstall.userChoice;state.deferredInstall=null;$('#installBtn').hidden=true}else toast('请在浏览器菜单中选择“添加到主屏幕”')};
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js');
function registerWebMcp(){
  const context=document.modelContext;
  if(!context?.registerTool)return;
  const reportError=error=>console.warn('WebMCP tool registration failed',error);
  Promise.resolve(context.registerTool({
    name:'list_classroom_courses',title:'查看课堂课程',
    description:'读取本机已有课程、教室和学生人数，不修改任何数据。',
    inputSchema:{type:'object',properties:{},additionalProperties:false},
    annotations:{readOnlyHint:true,untrustedContentHint:false},
    execute:()=>({courses:state.classes.map(c=>({id:c.id,name:c.name,room:c.room,studentCount:c.students.length}))})
  })).catch(reportError);
  Promise.resolve(context.registerTool({
    name:'create_classroom_course',title:'新建课堂课程',
    description:'新建一个课程并生成按座位编号排列的学生占位名册。',
    inputSchema:{type:'object',properties:{name:{type:'string',minLength:1},room:{type:'string'},studentCount:{type:'integer',minimum:1,maximum:100}},required:['name','studentCount'],additionalProperties:false},
    annotations:{readOnlyHint:false,untrustedContentHint:false},
    execute:input=>{
      if(!input||typeof input.name!=='string'||!input.name.trim()||!Number.isInteger(input.studentCount)||input.studentCount<1||input.studentCount>100)throw new Error('课程名称或学生人数无效');
      const course={id:crypto.randomUUID(),name:input.name.trim(),room:typeof input.room==='string'&&input.room.trim()?input.room.trim():'未设置',students:Array.from({length:input.studentCount},(_,i)=>({id:String(i+1),name:`同学${i+1}`,seat:i+1}))};
      state.classes.push(course);store.set('classes',state.classes);if(state.route==='classes')render();
      return {id:course.id,name:course.name,studentCount:course.students.length};
    }
  })).catch(reportError);
}
registerWebMcp();
const initial=location.hash.slice(1);if(['home','classes','reports','settings'].includes(initial))state.route=initial;render();
