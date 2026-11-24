const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const NOW=new Date("2026-09-09T13:00:00");

const modeInfo={
  normal:{label:"Normal period",desc:"Balanced weekly study and consistency.",weights:{urgency:.25,confidence:.35,difficulty:.20,importance:.20},practice:.15},
  revision:{label:"Revision",desc:"More weight on weaker topics and upcoming assessments.",weights:{urgency:.30,confidence:.40,difficulty:.15,importance:.15},practice:.30},
  test:{label:"Test mode",desc:"Short-term focus on approaching tests.",weights:{urgency:.47,confidence:.28,difficulty:.10,importance:.15},practice:.42},
  exam:{label:"Exam mode",desc:"Highest urgency with exam-practice weighting.",weights:{urgency:.50,confidence:.25,difficulty:.10,importance:.15},practice:.55}
};

const sampleState={
  onboarded:true,
  name:"Alex",
  programme:"A Levels",
  mode:"revision",
  goals:["priority","schedule","focus"],
  theme:"light",
  settings:{sound:true,notifications:false,focusLength:25,breakLength:5},
  availability:{Monday:90,Tuesday:60,Wednesday:120,Thursday:75,Friday:60,Saturday:150,Sunday:90},
  subjects:[
    {id:1,name:"Computer Science",confidence:42,difficulty:5,importance:5,date:"2026-09-19",assessment:"Mock exam",weak:["Algorithms","Networking","Data structures"]},
    {id:2,name:"Mathematics",confidence:71,difficulty:4,importance:5,date:"2026-09-23",assessment:"Test",weak:["Integration","Vectors"]},
    {id:3,name:"Digital Media",confidence:78,difficulty:3,importance:3,date:"2026-10-04",assessment:"Coursework checkpoint",weak:["Research evidence"]}
  ],
  completed:{},
  feedback:[],
  customSessions:[],
  planVersion:0,
  workloadMultiplier:1
};

const freshState={
  onboarded:false,name:"",programme:"A Levels",mode:"revision",goals:["priority"],theme:"light",
  settings:{sound:true,notifications:false,focusLength:25,breakLength:5},
  availability:{Monday:60,Tuesday:60,Wednesday:60,Thursday:60,Friday:60,Saturday:90,Sunday:90},
  subjects:[{id:Date.now(),name:"",confidence:50,difficulty:3,importance:3,date:"",assessment:"Exam",weak:[]}],
  completed:{},feedback:[],customSessions:[],planVersion:0,workloadMultiplier:1
};

let state=JSON.parse(localStorage.getItem("reviseai_full_demo")||"null")||structuredClone(freshState);
let onboardingStep=1;
let onboardingEditing=false;
let focusSession={task:null,segments:[],index:0,remaining:1500,totalSegmentSeconds:1500,running:false,interval:null};

const pages={
  dashboard:["Overview","Dashboard"],plan:["Schedule","Revision plan"],focus:["Study mode","Focus timer"],subjects:["Study profile","Subjects"],
  progress:["Evidence","Progress"],recommendations:["Adaptive guidance","Recommendations"],settings:["Preferences","Settings"]
};

function save(){localStorage.setItem("reviseai_full_demo",JSON.stringify(state))}
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function daysUntil(d){if(!d)return 999;return Math.max(0,Math.ceil((new Date(d+"T12:00:00")-NOW)/86400000))}
function fmtDate(d){return d?new Date(d+"T12:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short"}):"No date"}
function initials(name){return (name||"Student").split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase()}
function showToast(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1800)}
function openModal(id){$("#"+id).classList.add("open")}
function closeModal(id){$("#"+id).classList.remove("open")}

function applyTheme(){
  let theme=state.theme;
  if(theme==="system")theme=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";
  document.documentElement.dataset.theme=theme;
  if($("#themeSelect"))$("#themeSelect").value=state.theme;
}
applyTheme();

function startApp(useSample=false){
  if(useSample){state=structuredClone(sampleState);save()}
  $("#landing").classList.add("hidden");
  $("#app").classList.remove("hidden");
  if(!state.onboarded){onboardingEditing=false;prepareOnboarding();openModal("onboardingModal")}
  renderAll();
}
function exitApp(){stopTimer();$("#app").classList.add("hidden");$("#landing").classList.remove("hidden")}

function prepareOnboarding(){
  onboardingStep=1;
  $("#studentNameInput").value=state.name||"";
  $("#programmeInput").value=state.programme||"A Levels";
  renderOnboardingSubjects();
  renderAvailability();
  $$("#onboardingModeOptions .mode-option").forEach(b=>b.classList.toggle("active",b.dataset.mode===state.mode));
  $$("#goalGrid .goal").forEach(b=>b.classList.toggle("active",state.goals.includes(b.dataset.goal)));
  renderOnboardingStep();
}

function renderOnboardingStep(){
  $$(".onboarding-step").forEach(s=>s.classList.toggle("active",Number(s.dataset.step)===onboardingStep));
  $("#onboardingProgress").style.width=(onboardingStep*20)+"%";
  $("#onboardingBack").style.visibility=onboardingStep===1?"hidden":"visible";
  $("#onboardingNext").textContent=onboardingStep===5?(onboardingEditing?"Save changes":"Create my plan"):"Continue";
}

function renderOnboardingSubjects(){
  $("#onboardingSubjects").innerHTML=state.subjects.map(s=>`
    <div class="subject-editor" data-id="${s.id}">
      <label class="field"><span>Subject</span><input class="ob-name" value="${s.name||""}" placeholder="e.g. Biology"></label>
      <label class="field"><span>Confidence</span><select class="ob-confidence">
        <option value="20" ${s.confidence===20?"selected":""}>1</option>
        <option value="40" ${s.confidence===40?"selected":""}>2</option>
        <option value="60" ${s.confidence===60?"selected":""}>3</option>
        <option value="80" ${s.confidence===80?"selected":""}>4</option>
        <option value="100" ${s.confidence===100?"selected":""}>5</option>
      </select></label>
      <label class="field"><span>Difficulty</span><select class="ob-difficulty">
        <option value="1" ${s.difficulty===1?"selected":""}>1</option>
        <option value="2" ${s.difficulty===2?"selected":""}>2</option>
        <option value="3" ${s.difficulty===3?"selected":""}>3</option>
        <option value="4" ${s.difficulty===4?"selected":""}>4</option>
        <option value="5" ${s.difficulty===5?"selected":""}>5</option>
      </select></label>
      <label class="field"><span>Assessment date</span><input class="ob-date" type="date" value="${s.date||""}"></label>
      <button class="remove" data-remove-subject="${s.id}">Remove</button>
    </div>`).join("");
}

function syncOnboardingSubjects(){
  state.subjects=$$(".subject-editor").map(r=>({
    id:Number(r.dataset.id),
    name:r.querySelector(".ob-name").value.trim()||"Untitled subject",
    confidence:clamp(Number(r.querySelector(".ob-confidence").value)||50,0,100),
    difficulty:clamp(Number(r.querySelector(".ob-difficulty").value)||3,1,5),
    importance:4,
    date:r.querySelector(".ob-date").value,
    assessment:"Assessment",
    weak:[]
  }));
}

function renderAvailability(){
  $("#availabilityGrid").innerHTML=Object.entries(state.availability).map(([d,m])=>`
    <label class="availability-day"><strong>${d.slice(0,3)}</strong><input data-day="${d}" type="number" min="0" max="360" step="15" value="${m}"><span class="muted">minutes</span></label>`).join("");
}

function syncAvailability(){
  $$("#availabilityGrid input").forEach(i=>state.availability[i.dataset.day]=clamp(Number(i.value)||0,0,360));
}

function priorityScore(s){
  const w=modeInfo[state.mode].weights;
  const urgency=1-clamp(daysUntil(s.date)/45,0,1);
  const confidenceGap=(100-s.confidence)/100;
  const difficulty=(s.difficulty||3)/5;
  const importance=(s.importance||4)/5;
  return urgency*w.urgency+confidenceGap*w.confidence+difficulty*w.difficulty+importance*w.importance;
}

function sortedSubjects(){return [...state.subjects].sort((a,b)=>priorityScore(b)-priorityScore(a))}
function priorityLabel(s){const p=priorityScore(s);return p>.72?"High priority":p>.52?"Medium priority":"Lower priority"}

function taskPool(subject){
  const weak=subject.weak||[];
  const generic= state.mode==="exam"
    ?["Timed past paper","Exam questions","Mark scheme review","Recall drill"]
    : state.mode==="test"
    ?["Test questions","Weak-topic practice","Active recall","Quick review"]
    : state.mode==="normal"
    ?["Class consolidation","Topic review","Practice questions","Flashcard recall"]
    :["Weak-topic practice","Active recall","Exam-style questions","Summary review"];
  return [...weak.map(x=>`${x} practice`),...generic];
}

function generatePlan(){
  const days=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
  const subjects=sortedSubjects();
  if(!subjects.length)return days.map(d=>({day:d,items:[]}));
  const plan=days.map(d=>({day:d,items:[]}));
  let taskCounter=0;

  days.forEach((day,di)=>{
    let available=Math.round((state.availability[day]||0)*state.workloadMultiplier);
    let subjectIndex=(di+state.planVersion)%subjects.length;
    let block=0;

    while(available>=25 && block<4){
      const s=subjects[(subjectIndex+block)%subjects.length];
      const score=priorityScore(s);
      let mins= score>.7?60:score>.52?45:30;

      if(state.mode==="exam" && score>.6)mins=60;
      if(state.mode==="normal")mins=Math.min(mins,45);

      mins=Math.min(mins,available);
      if(mins<25)break;

      const pool=taskPool(s);
      const title=pool[(taskCounter+state.planVersion)%pool.length];

      plan[di].items.push({
        id:`v${state.planVersion}-${day}-${taskCounter}-${s.id}`,
        subjectId:s.id,subject:s.name,title,minutes:mins,priority:priorityLabel(s),score
      });

      available-=mins;
      block++;
      taskCounter++;

      if(available<25)break;
    }
  });

  state.customSessions.forEach(c=>{
    const target=plan.find(d=>d.day===c.day)||plan[0];
    target.items.push({...c,id:c.id,priority:"Custom"});
  });

  return plan;
}

function flatPlan(){return generatePlan().flatMap(d=>d.items)}
function todayPlan(){return generatePlan()[0]?.items||[]}
function completionRate(){const tasks=flatPlan();if(!tasks.length)return 0;return Math.round(tasks.filter(t=>state.completed[t.id]).length/tasks.length*100)}
function totalPlannedMinutes(){return flatPlan().reduce((a,b)=>a+b.minutes,0)}
function nextAssessment(){return [...state.subjects].filter(s=>s.date).sort((a,b)=>new Date(a.date)-new Date(b.date))[0]||null}
function stat(label,value,sub){return `<div class="stat-card"><div class="stat-label">${label}</div><div class="stat-value">${value}</div><div class="stat-sub">${sub||""}</div></div>`}

function renderDashboard(){
  const top=sortedSubjects()[0], next=nextAssessment(), tasks=todayPlan();

  $("#dashboardGreeting").textContent=`Good afternoon${state.name?`, ${state.name}`:""}.`;
  $("#heroModeEyebrow").textContent=modeInfo[state.mode].label+" mode";
  $("#dashboardSummary").textContent=getModeSummary();

  $("#dashboardStats").innerHTML=
    stat("Today's study",`${tasks.reduce((a,b)=>a+b.minutes,0)} min`,`${tasks.length} planned sessions`)+
    stat("Weekly plan",`${(totalPlannedMinutes()/60).toFixed(1)} h`,`Based on your availability`)+
    stat("Top priority",top?.name||"—",top?`${top.confidence}% confidence`:"Add subjects")+
    stat("Plan completion",`${completionRate()}%`,`Current generated week`);

  $("#todayTaskCount").textContent=`${tasks.length} tasks`;
  $("#todayTasks").innerHTML=tasks.length?tasks.map(t=>taskRow(t)).join(""):`<div class="muted">Nothing scheduled today.</div>`;
  $("#dashboardRecommendation").innerHTML=top?recommendationSummary(top):"Add subjects and dates to generate recommendations.";

  const plan=generatePlan(), mins=plan.map(d=>d.items.reduce((a,b)=>a+b.minutes,0)), max=Math.max(...mins,1);

  $("#weekChart").innerHTML=plan.map((d,i)=>`<div class="week-col"><div class="week-bar" style="height:${Math.max(12,mins[i]/max*105)}px"></div><div class="week-day">${d.day.slice(0,3)}</div><div class="muted">${mins[i]}m</div></div>`).join("");

  $("#weekTotalLabel").textContent=`${Math.round(totalPlannedMinutes()/60*10)/10} planned hours`;

  if(next){
    $("#nextAssessmentTitle").textContent=next.name;
    $("#nextAssessmentDays").textContent=daysUntil(next.date);
    $("#nextAssessmentMeta").textContent=`days until ${next.assessment||"assessment"} · ${fmtDate(next.date)}`;
  }else{
    $("#nextAssessmentTitle").textContent="No assessment";
    $("#nextAssessmentDays").textContent="—";
    $("#nextAssessmentMeta").textContent="Add an exam or test date.";
  }
}

function taskRow(t){
  return `<div class="task-row">
    <button class="task-check ${state.completed[t.id]?"done":""}" data-complete="${t.id}"></button>
    <div><div class="task-name">${t.title}</div><div class="task-meta">${t.subject} · ${t.priority}</div></div>
    <div class="task-side"><div class="task-minutes">${t.minutes} min</div><button class="start-session" data-focus="${t.id}">Start focus</button></div>
  </div>`
}

function getModeSummary(){
  return {
    normal:"Balanced study across your subjects, with lighter urgency weighting.",
    revision:"Weak topics and upcoming assessments receive more attention while workload stays realistic.",
    test:"Short-term assessment urgency is weighted more heavily than normal weekly balance.",
    exam:"Exam dates, weak topics and exam-practice tasks receive the strongest weighting."
  }[state.mode]
}

function recommendationSummary(top){
  const d=daysUntil(top.date);

  return `<strong>${top.name}</strong> currently receives the highest priority because confidence is <strong>${top.confidence}%</strong>${top.date?` and the next assessment is in <strong>${d} days</strong>`:""}. ${state.mode==="exam"?"Exam Mode is also increasing the weight of timed practice and exam questions.":""}`;
}

function renderPlan(){
  const top=sortedSubjects()[0];

  $("#planIntro").textContent=`${modeInfo[state.mode].label} mode · ${getModeSummary()}`;

  $("#planLogic").textContent=top
    ? `${top.name} currently has the strongest priority score. The calculation uses assessment urgency, confidence gap, difficulty and importance, with different weightings for ${modeInfo[state.mode].label.toLowerCase()} mode. Session durations are then fitted inside your real daily availability.`
    :"Add subjects to generate a plan.";

  $("#planBoard").innerHTML=generatePlan().map(d=>`<div class="plan-day"><h3>${d.day}</h3>${
    d.items.length?d.items.map(t=>`<div class="plan-item"><strong>${t.title}</strong><small>${t.subject} · ${t.minutes} min</small><span class="priority-tag">${t.priority}</span><div class="plan-item-actions"><button class="mini-btn" data-focus="${t.id}">Start</button><button class="mini-btn" data-complete="${t.id}">${state.completed[t.id]?"Done ✓":"Complete"}</button></div></div>`).join(""):`<div class="muted">No study scheduled</div>`
  }</div>`).join("");
}

function renderSubjects(){
  $("#subjectGrid").innerHTML=state.subjects.map(s=>`
    <article class="subject-card">
      <div class="eyebrow">${priorityLabel(s)}</div>
      <h3>${s.name}</h3>
      <div class="subject-meta-row"><span>${s.assessment||"Assessment"} · ${fmtDate(s.date)}</span><span>${s.confidence}% confidence</span></div>
      <div class="progress-track"><div class="progress-fill" style="width:${s.confidence}%"></div></div>
      <div class="subject-meta-row"><span>Difficulty ${s.difficulty}/5</span><span>Priority ${Math.round(priorityScore(s)*100)}</span></div>
      <div class="weak-topics">${(s.weak||[]).length?(s.weak||[]).map(w=>`<span class="topic-chip">${w}</span>`).join(""):`<span class="topic-chip">No weak topics added</span>`}</div>
      <div class="subject-actions"><button class="secondary-btn full-width" data-confidence="${s.id}">Update confidence</button></div>
    </article>`).join("");
}

function renderProgress(){
  const tasks=flatPlan(),done=tasks.filter(t=>state.completed[t.id]).length;

  $("#progressStats").innerHTML=
    stat("Sessions completed",`${done} / ${tasks.length}`,"Current generated week")+
    stat("Focus time",`${Math.round(tasks.filter(t=>state.completed[t.id]).reduce((a,b)=>a+b.minutes,0)/60*10)/10} h`,"Completed planned time")+
    stat("Plan followed",`${completionRate()}%`,"Completion against plan")+
    stat("Study streak",`${Math.min(7,done)} days`,"Demo estimate");

  $("#confidenceBars").innerHTML=state.subjects.map(s=>`<div class="conf-row"><div class="conf-name">${s.name}</div><div class="progress-track"><div class="progress-fill" style="width:${s.confidence}%"></div></div><div class="muted">${s.confidence}%</div></div>`).join("");

  const base=[42,55,50,67,62,74,completionRate()||35];

  $("#trendChart").innerHTML=base.map((v,i)=>`<div class="trend-item"><div class="trend-bar" style="height:${v*1.8}px"></div><div class="trend-label">${["M","T","W","T","F","S","S"][i]}</div></div>`).join("");
}

function buildRecommendations(){
  const recs=[], sorted=sortedSubjects(), top=sorted[0], next=nextAssessment();

  if(top){
    recs.push({
      title:`Prioritise ${top.name}`,
      body:`Your confidence is ${top.confidence}% and its current priority score is ${Math.round(priorityScore(top)*100)}. Keep at least one focused session on this subject in the next two study days.`,
      action:"Open plan",
      view:"plan"
    });
  }

  if(next && daysUntil(next.date)<=14 && state.mode!=="exam"){
    recs.push({
      title:"Consider Exam Mode",
      body:`${next.name} has an assessment in ${daysUntil(next.date)} days. Exam Mode would increase urgency and exam-practice weighting without changing your saved subjects.`,
      action:"Review modes",
      mode:true
    });
  }

  const highConf=state.subjects.find(s=>s.confidence>=75);
  const lowConf=state.subjects.find(s=>s.confidence<=50);

  if(highConf&&lowConf){
    recs.push({
      title:"Rebalance high-confidence study",
      body:`${highConf.name} is at ${highConf.confidence}% confidence while ${lowConf.name} is at ${lowConf.confidence}%. Avoid giving equal time to both unless deadlines justify it.`,
      action:"View subjects",
      view:"subjects"
    });
  }

  const maxDay=Object.entries(state.availability).sort((a,b)=>b[1]-a[1])[0];

  if(maxDay)recs.push({
    title:`Use ${maxDay[0]} for deeper work`,
    body:`You have ${maxDay[1]} minutes available. Use the longer window for past papers, difficult topics or two complete focus cycles rather than only short recall tasks.`,
    action:"Open week",
    view:"plan"
  });

  recs.push({
    title:"Keep breaks inside the session total",
    body:`A 60-minute block should include focus and recovery time. With your current timer settings, the planner treats the full block as 25 focus + 5 break + 25 focus + 5 break.`,
    action:"Open focus timer",
    view:"focus"
  });

  return recs;
}

function renderRecommendations(){
  $("#recommendationsList").innerHTML=buildRecommendations().map((r,i)=>`<article class="recommendation-card"><span class="icon-tile">${i===0?"✦":"→"}</span><div><div class="eyebrow">Recommendation ${i+1}</div><h3>${r.title}</h3><p>${r.body}</p><div class="rec-action"><button class="secondary-btn" ${r.mode?'data-open-mode="1"':`data-jump="${r.view}"`}>${r.action}</button></div></div></article>`).join("");
}

function renderSettings(){
  $("#themeSelect").value=state.theme;
  $("#soundToggle").checked=state.settings.sound;
  $("#notificationToggle").checked=state.settings.notifications;
  $("#focusLengthSelect").value=String(state.settings.focusLength);
  $("#breakLengthSelect").value=String(state.settings.breakLength);
}

function renderHeader(){
  $("#headerName").textContent=state.name||"Student";
  $("#headerAvatar").textContent=initials(state.name);
  $("#sidebarModeLabel").textContent=modeInfo[state.mode].label;
}

function renderAll(){
  renderHeader();
  renderDashboard();
  renderPlan();
  renderSubjects();
  renderProgress();
  renderRecommendations();
  renderSettings();
  renderFocus();
}

function showView(name){
  $$(".view").forEach(v=>v.classList.remove("active"));
  $(`#view-${name}`).classList.add("active");
  $$(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===name));
  $("#pageEyebrow").textContent=pages[name][0];
  $("#pageTitle").textContent=pages[name][1];
  $("#sidebar").classList.remove("open");
}

function modeOptionsHtml(){
  return Object.entries(modeInfo).map(([k,m])=>`<button class="mode-option ${state.mode===k?"active":""}" data-set-mode="${k}"><b>${m.label}</b><span>${m.desc}</span></button>`).join("");
}

function openModeModal(){
  $("#modeOptions").innerHTML=modeOptionsHtml();
  openModal("modeModal");
}

function setMode(m){
  state.mode=m;
  state.planVersion++;
  state.completed={};
  save();
  renderAll();
  closeModal("modeModal");
  showToast(`${modeInfo[m].label} mode selected.`);
}

function sessionBreakdown(total){
  const focus=state.settings.focusLength, brk=state.settings.breakLength;
  let remaining=Math.round(total),cycle=1,segs=[];

  while(remaining>0){
    const f=Math.min(focus,remaining);
    segs.push({type:"study",minutes:f,label:`Focus ${cycle}`});
    remaining-=f;

    if(remaining>0){
      const b=Math.min(brk,remaining);
      segs.push({type:"break",minutes:b,label:`Break ${cycle}`});
      remaining-=b;
    }

    cycle++;
  }

  return segs;
}

function stopTimer(){
  if(focusSession.interval)clearInterval(focusSession.interval);
  focusSession.interval=null;
  focusSession.running=false;
}

function startFocus(taskId){
  const task=flatPlan().find(t=>t.id===taskId);
  if(!task)return;

  stopTimer();
  focusSession.task=task;
  focusSession.segments=sessionBreakdown(task.minutes);
  focusSession.index=0;
  focusSession.remaining=focusSession.segments[0].minutes*60;
  focusSession.totalSegmentSeconds=focusSession.remaining;
  focusSession.running=false;

  renderFocus();
  showView("focus");
}

function toggleTimer(){
  if(!focusSession.task){
    showToast("Choose a task from your dashboard or plan first.");
    return;
  }

  if(focusSession.running){
    stopTimer();
    renderFocus();
    return;
  }

  focusSession.running=true;

  focusSession.interval=setInterval(()=>{
    focusSession.remaining--;

    if(focusSession.remaining<=0)finishSegment();

    updateTimerVisual();
  },1000);

  renderFocus();
}

function finishSegment(){
  stopTimer();
  playChime();

  const last=focusSession.index>=focusSession.segments.length-1;

  if(last){
    state.completed[focusSession.task.id]=true;
    save();
    focusSession.remaining=0;
    notifyUser("Study session complete","Your planned revision block is finished.");
    renderAll();
    showToast("Session complete. Task marked done.");
    return;
  }

  focusSession.index++;

  const seg=focusSession.segments[focusSession.index];

  focusSession.remaining=seg.minutes*60;
  focusSession.totalSegmentSeconds=focusSession.remaining;

  notifyUser(
    seg.type==="break"?"Break time":"Focus time",
    seg.type==="break"?"Step away briefly and reset.":"Start your next focus block."
  );

  renderFocus();
}

function resetTimer(){
  stopTimer();

  if(!focusSession.task)return;

  focusSession.index=0;
  focusSession.remaining=focusSession.segments[0].minutes*60;
  focusSession.totalSegmentSeconds=focusSession.remaining;

  renderFocus();
}

function skipTimer(){
  if(focusSession.task)finishSegment();
}

function updateTimerVisual(){
  if(!$("#timerValue"))return;

  const m=Math.floor(focusSession.remaining/60),s=focusSession.remaining%60;

  $("#timerValue").textContent=`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;

  const circumference=653.45;
  const ratio=focusSession.totalSegmentSeconds?focusSession.remaining/focusSession.totalSegmentSeconds:1;

  $("#timerProgress").style.strokeDashoffset=circumference*(1-ratio);
}

function renderFocus(){
  if(!$("#timerValue"))return;

  if(!focusSession.task){
    $("#focusType").textContent="Focus";
    $("#focusTaskTitle").textContent="Choose a study task";
    $("#focusTaskMeta").textContent="Start a session from your dashboard or revision plan.";
    $("#focusTotalBadge").textContent="No session";
    $("#focusBreakdownTitle").textContent="No task selected";
    $("#focusSegments").innerHTML=`<div class="muted">Your focus/break structure will appear here.</div>`;
    $("#timerValue").textContent=`${String(state.settings.focusLength).padStart(2,"0")}:00`;
    $("#timerStatus").textContent="Ready to focus";
    $("#timerStart").textContent="Start";
    $("#timerProgress").style.strokeDashoffset=0;
    return;
  }

  const seg=focusSession.segments[focusSession.index];

  $("#focusType").textContent=seg?.type==="break"?"Break":"Focus";
  $("#focusTaskTitle").textContent=focusSession.task.title;
  $("#focusTaskMeta").textContent=`${focusSession.task.subject} · ${focusSession.task.priority}`;
  $("#focusTotalBadge").textContent=`${focusSession.task.minutes} min total`;
  $("#focusBreakdownTitle").textContent=`${focusSession.task.minutes}-minute session`;
  $("#timerStatus").textContent=seg?.type==="break"?"Step away briefly":"One task. No switching.";
  $("#timerStart").textContent=focusSession.running?"Pause":"Start";

  $("#focusSegments").innerHTML=focusSession.segments.map((s,i)=>`<div class="segment ${s.type} ${i===focusSession.index?"active":""} ${i<focusSession.index?"done":""}"><div class="segment-number">${i+1}</div><div><strong>${s.label}</strong><small>${s.type==="study"?"Focused study":"Short recovery break"}</small></div><span>${s.minutes} min</span></div>`).join("");

  updateTimerVisual();
}

function playChime(){
  if(!state.settings.sound)return;

  try{
    const Ctx=window.AudioContext||window.webkitAudioContext,ctx=new Ctx();
    const now=ctx.currentTime;

    [523.25,659.25].forEach((freq,i)=>{
      const o=ctx.createOscillator(),g=ctx.createGain();

      o.type="sine";
      o.frequency.value=freq;

      g.gain.setValueAtTime(0,now+i*.12);
      g.gain.linearRampToValueAtTime(.12,now+i*.12+.02);
      g.gain.exponentialRampToValueAtTime(.001,now+i*.12+.45);

      o.connect(g);
      g.connect(ctx.destination);

      o.start(now+i*.12);
      o.stop(now+i*.12+.48);
    });
  }catch(e){}
}

function notifyUser(title,body){
  if(state.settings.notifications && "Notification" in window && Notification.permission==="granted"){
    new Notification(title,{body});
  }
}

document.addEventListener("click",e=>{
  const nav=e.target.closest("[data-view]");
  if(nav)showView(nav.dataset.view);

  const jump=e.target.closest("[data-jump]");
  if(jump)showView(jump.dataset.jump);

  const complete=e.target.closest("[data-complete]");
  if(complete){
    state.completed[complete.dataset.complete]=!state.completed[complete.dataset.complete];
    save();
    renderAll();
  }

  const focus=e.target.closest("[data-focus]");
  if(focus)startFocus(focus.dataset.focus);

  const close=e.target.closest("[data-close]");
  if(close)closeModal(close.dataset.close);

  const setModeBtn=e.target.closest("[data-set-mode]");
  if(setModeBtn)setMode(setModeBtn.dataset.setMode);

  const openMode=e.target.closest("[data-open-mode]");
  if(openMode)openModeModal();

  const remove=e.target.closest("[data-remove-subject]");
  if(remove){
    syncOnboardingSubjects();
    state.subjects=state.subjects.filter(s=>String(s.id)!==remove.dataset.remove);
    renderOnboardingSubjects();
  }

  const modePick=e.target.closest("#onboardingModeOptions .mode-option");
  if(modePick){
    $$("#onboardingModeOptions .mode-option").forEach(b=>b.classList.remove("active"));
    modePick.classList.add("active");
    state.mode=modePick.dataset.mode;
  }

  const goal=e.target.closest(".goal");
  if(goal){
    goal.classList.toggle("active");
  }

  const confidence=e.target.closest("[data-confidence]");
  if(confidence){
    const s=state.subjects.find(x=>String(x.id)===confidence.dataset.confidence);
    const n=prompt(`Update confidence for ${s.name} (0–100):`,s.confidence);

    if(n!==null){
      s.confidence=clamp(Number(n)||0,0,100);
      save();
      renderAll();
    }
  }
});

$("#getStartedBtn").onclick=()=>{
  state=structuredClone(freshState);
  save();
  startApp(false);
};

$("#heroStartBtn").onclick=()=>{
  state=structuredClone(freshState);
  save();
  startApp(false);
};

$("#tryDemoBtn").onclick=()=>startApp(true);
$("#heroDemoBtn").onclick=()=>startApp(true);
$("#exitToLanding").onclick=exitApp;

$("#menuButton").onclick=()=>$("#sidebar").classList.toggle("open");

$("#sidebarModeButton").onclick=openModeModal;
$("#changeModeBtn").onclick=openModeModal;

$("#landingThemeToggle").onclick=()=>{
  state.theme=(document.documentElement.dataset.theme==="dark"?"light":"dark");
  applyTheme();
  save();
};

$("#themeToggle").onclick=()=>{
  state.theme=(document.documentElement.dataset.theme==="dark"?"light":"dark");
  applyTheme();
  save();
};

$("#regenerateBtn").onclick=()=>{
  state.planVersion++;
  state.completed={};
  save();
  renderAll();
  showToast("A new plan was generated.");
};

$("#reduceLoadBtn").onclick=()=>{
  state.workloadMultiplier=state.workloadMultiplier>.8?.75:1;
  state.planVersion++;
  state.completed={};
  save();
  renderAll();
  showToast(state.workloadMultiplier<1?"Workload reduced by 25%.":"Full workload restored.");
};

$("#addCustomSessionBtn").onclick=()=>{
  $("#customSubject").innerHTML=state.subjects.map(s=>`<option>${s.name}</option>`).join("");
  openModal("sessionModal");
};

$("#saveCustomSession").onclick=()=>{
  state.customSessions.push({
    id:"custom-"+Date.now(),
    day:"Monday",
    subject:$("#customSubject").value,
    title:$("#customTask").value.trim()||"Custom revision",
    minutes:clamp(Number($("#customMinutes").value)||45,15,180)
  });

  save();
  closeModal("sessionModal");
  renderAll();
  showToast("Custom session added.");
};

$("#subjectAddBtn").onclick=()=>{
  onboardingEditing=true;
  prepareOnboarding();
  onboardingStep=2;
  renderOnboardingStep();
  openModal("onboardingModal");
};

$("#editProfileBtn").onclick=()=>{
  onboardingEditing=true;
  prepareOnboarding();
  openModal("onboardingModal");
};

$("#onboardingAddSubject").onclick=()=>{
  syncOnboardingSubjects();

  state.subjects.push({
    id:Date.now(),
    name:"",
    confidence:50,
    difficulty:3,
    importance:4,
    date:"",
    assessment:"Assessment",
    weak:[]
  });

  renderOnboardingSubjects();
};

$("#onboardingBack").onclick=()=>{
  if(onboardingStep>1){
    onboardingStep--;
    renderOnboardingStep();
  }
};

$("#onboardingNext").onclick=()=>{
  if(onboardingStep===1){
    state.name=$("#studentNameInput").value.trim()||"Student";
    state.programme=$("#programmeInput").value;
  }

  if(onboardingStep===2)syncOnboardingSubjects();

  if(onboardingStep===3)syncAvailability();

  if(onboardingStep===5){
    state.goals=$$("#goalGrid .goal.active").map(b=>b.dataset.goal);
    state.onboarded=true;
    state.planVersion++;
    state.completed={};

    save();
    closeModal("onboardingModal");
    renderAll();
    showView("dashboard");

    showToast(onboardingEditing?"Study profile updated.":"Your first plan is ready.");
    return;
  }

  onboardingStep++;
  renderOnboardingStep();
};

$("#timerStart").onclick=toggleTimer;
$("#timerReset").onclick=resetTimer;
$("#timerSkip").onclick=skipTimer;

$("#themeSelect").onchange=e=>{
  state.theme=e.target.value;
  save();
  applyTheme();
};

$("#soundToggle").onchange=e=>{
  state.settings.sound=e.target.checked;
  save();

  if(e.target.checked){
    playChime();
    showToast("Timer sound enabled.");
  }
};

$("#notificationToggle").onchange=async e=>{
  if(e.target.checked && "Notification" in window){
    const p=await Notification.requestPermission();

    state.settings.notifications=p==="granted";
    e.target.checked=state.settings.notifications;

    save();

    showToast(
      state.settings.notifications
        ?"Notifications enabled."
        :"Notification permission was not granted."
    );
  }else{
    state.settings.notifications=false;
    save();
  }
};

$("#focusLengthSelect").onchange=e=>{
  state.settings.focusLength=Number(e.target.value);
  save();
  resetTimer();
  renderFocus();
};

$("#breakLengthSelect").onchange=e=>{
  state.settings.breakLength=Number(e.target.value);
  save();
  resetTimer();
  renderFocus();
};

$("#resetAppBtn").onclick=()=>{
  if(confirm("Reset all demo data?")){
    state=structuredClone(freshState);
    save();
    exitApp();
    applyTheme();
    showToast("Demo reset.");
  }
};

renderAll();

if(state.onboarded){
  /* stay on landing until user chooses to enter */
}