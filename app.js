const KEY = "obe_cricket_v2";
const OLD_KEY = "obe_cricket_v1";

const defaultTeam = (id, name) => ({
  id, name,
  players: [
    "Player 1","Player 2","Player 3","Player 4","Player 5",
    "Player 6","Player 7","Player 8","Player 9","Player 10","Player 11"
  ].map(name => ({name, canBat:true, canBowl:true}))
});

let state = loadState();
let undoStack = [];

const $ = id => document.getElementById(id);

function defaultState(){
  return {teams:[defaultTeam("a","Team A"),defaultTeam("b","Team B")],history:[],match:null};
}
function normalizePlayer(p,i){
  if(typeof p === "string") return {name:p || `Player ${i+1}`,canBat:true,canBowl:true};
  return {name:String(p?.name || `Player ${i+1}`),canBat:p?.canBat !== false,canBowl:p?.canBowl !== false};
}
function normalizeTeam(t,i){
  return {id:t?.id || crypto.randomUUID(),name:t?.name || `Team ${i+1}`,players:(t?.players || []).map(normalizePlayer)};
}
function migrateState(raw){
  if(!raw) return defaultState();
  const out = {
    teams:(raw.teams || []).map(normalizeTeam),
    history:Array.isArray(raw.history) ? raw.history : [],
    match:raw.match || null
  };
  if(out.teams.length < 2) {
    while(out.teams.length<2) out.teams.push(defaultTeam(String.fromCharCode(97+out.teams.length),`Team ${out.teams.length+1}`));
  }
  // Repair old saved matches that had object/player mismatches.
  if(out.match) out.match = migrateMatch(out.match);
  out.history = out.history.map(migrateMatch);
  return out;
}
function migrateMatch(m){
  if(!m) return null;
  const x = JSON.parse(JSON.stringify(m));
  if(!Array.isArray(x.innings)) x.innings=[];
  x.innings = x.innings.map(i=>{
    if(!i) return i;
    i.bat=(i.bat||[]).map((b,n)=>({
      name:typeof b?.name==="object" ? (b.name?.name || `Player ${n+1}`) : String(b?.name || `Player ${n+1}`),
      runs:+b?.runs||0,balls:+b?.balls||0,fours:+b?.fours||0,sixes:+b?.sixes||0,
      out:!!b?.out,dismissal:b?.dismissal||""
    }));
    i.bowl=(i.bowl||[]).map((b,n)=>({
      name:typeof b?.name==="object" ? (b.name?.name || `Bowler ${n+1}`) : String(b?.name || `Bowler ${n+1}`),
      balls:+b?.balls||0,runs:+b?.runs||0,wickets:+b?.wickets||0,wides:+b?.wides||0,noBalls:+b?.noBalls||0
    }));
    i.runs=+i.runs||0;i.wickets=+i.wickets||0;i.balls=+i.balls||0;
    i.striker=Number.isInteger(i.striker)?i.striker:0;
    i.nonStriker=Number.isInteger(i.nonStriker)?i.nonStriker:1;
    i.bowler=Number.isInteger(i.bowler)?i.bowler:0;
    i.events=Array.isArray(i.events)?i.events:[];
    return i;
  });
  return x;
}
function loadState(){
  try{
    let raw=localStorage.getItem(KEY);
    if(!raw) raw=localStorage.getItem(OLD_KEY);
    const s=migrateState(raw?JSON.parse(raw):null);
    localStorage.setItem(KEY,JSON.stringify(s));
    return s;
  }catch(e){return defaultState();}
}
function save(){localStorage.setItem(KEY,JSON.stringify(state));}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function show(id){document.querySelectorAll(".view").forEach(v=>v.classList.add("hidden"));$(id).classList.remove("hidden");window.scrollTo({top:0,behavior:"smooth"});}
function normalizeTeamsBeforeSave(){
  state.teams=state.teams.map((t,i)=>({...t,players:(t.players||[]).map(normalizePlayer)}));
}
function renderTeams(){
 $("teamEditor").innerHTML=state.teams.map((t,i)=>{
   t.players=t.players||[];
   return `<div class="team-row" data-team="${t.id}">
   <div class="team-head"><b>${i===0?"🟢":"🔵"} Team ${i+1}</b>${state.teams.length>2?`<button class="small-btn" onclick="removeTeam('${t.id}')">Delete</button>`:""}</div>
   <label>Team name<input class="team-name" value="${esc(t.name)}" data-id="${t.id}"></label>
   <div class="team-help">Add only the players you actually need. You can start with 2 players or add 11+ players.</div>
   <div class="players">
     ${t.players.map((p,j)=>`<div class="player-input">
       <input value="${esc(typeof p==="string"?p:p.name)}" data-player="${t.id}:${j}" placeholder="Player ${j+1}">
       <button class="small-btn" onclick="toggleRole('${t.id}',${j})" title="Toggle bowling role">${typeof p==="string"||p.canBowl!==false?"🏏":"🚫"}</button>
       <button class="small-btn delete-player" onclick="removePlayer('${t.id}',${j})" title="Remove player">×</button>
     </div>`).join("")}
   </div>
   <button class="add-player" onclick="addPlayer('${t.id}')">＋ Add player</button>
 </div>`;
 }).join("")+
 (state.teams.length<4?`<button class="secondary full" onclick="addTeam()">+ Add another team</button>`:"");
}
function syncTeams(){
  document.querySelectorAll(".team-name").forEach(x=>{
    const t=state.teams.find(t=>t.id===x.dataset.id); if(t)t.name=x.value.trim()||"Unnamed Team";
  });
  document.querySelectorAll("[data-player]").forEach(x=>{
    const [id,j]=x.dataset.player.split(":");
    const t=state.teams.find(t=>t.id===id);
    if(t && t.players[j]) t.players[j]=normalizePlayer({...t.players[j],name:x.value.trim()||`Player ${+j+1}`},+j);
  });
  normalizeTeamsBeforeSave(); save();
}
function toggleRole(id,j){syncTeams();const t=state.teams.find(t=>t.id===id);if(!t)return;t.players[j].canBowl=!t.players[j].canBowl;save();renderTeams();}
function addTeam(){syncTeams();state.teams.push(defaultTeam(crypto.randomUUID(),`Team ${state.teams.length+1}`));save();renderTeams();}
function removeTeam(id){if(state.teams.length<=2)return;if(confirm("Delete this team?")){syncTeams();state.teams=state.teams.filter(t=>t.id!==id);save();renderTeams();}}
function addPlayer(id){
 syncTeams();
 const t=state.teams.find(t=>t.id===id);
 if(!t)return;
 const n=t.players.length+1;
 t.players.push({name:`Player ${n}`,canBat:true,canBowl:true});
 save();renderTeams();
 setTimeout(()=>{
   const inputs=document.querySelectorAll(`[data-team="${id}"] [data-player]`);
   const last=inputs[inputs.length-1]; if(last){last.focus();last.select();}
 },20);
}
function removePlayer(id,j){
 syncTeams();
 const t=state.teams.find(t=>t.id===id);
 if(!t)return;
 if(t.players.length<=2)return alert("Each team must have at least 2 players.");
 if(confirm(`Remove ${typeof t.players[j]==="string"?t.players[j]:t.players[j].name}?`)){
   t.players.splice(j,1);save();renderTeams();
 }
}
function blankInnings(battingTeam,bowlingTeam){
  const bat=battingTeam.players.filter(p=>p.canBat);
  const bowl=bowlingTeam.players.filter(p=>p.canBowl);
  return {
    teamId:battingTeam.id,runs:0,wickets:0,balls:0,
    bat:bat.map(p=>({name:p.name,runs:0,balls:0,fours:0,sixes:0,out:false,dismissal:""})),
    bowl:bowl.map(p=>({name:p.name,balls:0,runs:0,wickets:0,wides:0,noBalls:0})),
    events:[],striker:0,nonStriker:1,bowler:0
  };
}
function startMatch(){
  syncTeams();
  if(state.teams.length<2)return alert("At least two teams are required.");
  const a=normalizeTeam(state.teams[0],0),b=normalizeTeam(state.teams[1],1);
  state.teams[0]=a;state.teams[1]=b;
  if(a.players.filter(p=>p.canBat).length<2 || b.players.filter(p=>p.canBat).length<2)
    return alert("Each team needs at least 2 batting players.");
  if(!b.players.some(p=>p.canBowl) || !a.players.some(p=>p.canBowl))
    return alert("Each team needs at least 1 bowling player.");
  const title=$("matchTitle").value.trim()||`${a.name} vs ${b.name}`;
  state.match={id:crypto.randomUUID(),title,overs:+$("overs").value,teams:[a.id,b.id],
    innings:[blankInnings(a,b)],current:0,createdAt:new Date().toISOString(),finished:false,result:""};
  undoStack=[];save();show("scoreView");renderScore();
  // Let scorer explicitly choose the opening bowler.
  openBowlerModal();
}
function current(){return state.match.innings[state.match.current];}
function teamBy(id){return state.teams.find(t=>t.id===id);}
function overText(b){return `${Math.floor(Math.max(0,b)/6)}.${Math.max(0,b)%6}`;}
function allOutLimit(i){return Math.max(1,i.bat.length-1);}

function renderScore(){
  if(!state.match)return;
  const m=state.match,i=current(),t=teamBy(i.teamId),max=m.overs*6;
  const ordinal=state.match.current===0?"1st":state.match.current===1?"2nd":`${state.match.current+1}th`;
  $("inningsLabel").textContent=`${ordinal} INNINGS${i.wickets>=allOutLimit(i)?" · ALL OUT":""}`;
  $("battingTeamName").textContent=t?.name||"Team";
  $("matchMeta").textContent=`${m.overs} overs · ${m.title}`;
  $("runs").textContent=i.runs;$("wickets").textContent=i.wickets;$("oversDone").textContent=overText(i.balls);
  $("runRate").textContent=i.balls?(i.runs/(i.balls/6)).toFixed(2):"0.00";
  if(state.match.current>0){
    const first=state.match.innings[0];$("targetBox").classList.remove("hidden");
    $("target").textContent=first.runs+1;$("needRuns").textContent=Math.max(0,first.runs+1-i.runs);$("needBalls").textContent=Math.max(0,max-i.balls);
  }else $("targetBox").classList.add("hidden");
  const s=i.bat[i.striker],n=i.bat[i.nonStriker],bw=i.bowl[i.bowler];
  $("strikerName").textContent=s?.name||"Select batter";
  $("strikerStats").textContent=s?`${s.runs} (${s.balls})`:"0 (0)";
  $("nonStrikerName").textContent=n?.name||"Select batter";
  $("nonStrikerStats").textContent=n?`${n.runs} (${n.balls})`:"0 (0)";
  $("bowlerName").textContent=bw?.name||"Select bowler";
  $("bowlerStats").textContent=bw?`${overText(bw.balls)} ov · ${bw.runs}/${bw.wickets}`:"0.0 ov · 0/0";
  $("recentBalls").innerHTML=i.events.slice(-12).map(e=>{
    const cls=e.type==="wicket"?"w":(e.type==="declare"||e.type==="adjustment")?"declare-ball":e.runs>=4?"boundary":"";
    return `<span class="ball ${cls}">${esc(e.label)}</span>`;
  }).join("")||`<span class="muted">No balls yet</span>`;
  $("ballCount").textContent=`${i.balls} legal balls`;
}

function snapshot(){undoStack.push(JSON.parse(JSON.stringify(state)));if(undoStack.length>30)undoStack.shift();}
function rotate(){const i=current();[i.striker,i.nonStriker]=[i.nonStriker,i.striker];}
function isComplete(){const i=current();return i.balls>=state.match.overs*6 || i.wickets>=allOutLimit(i);}
function checkChase(){
  if(state.match.current===1 && current().runs>state.match.innings[0].runs){finishMatch();return true;}
  return false;
}
function addBall(runs,extra=null){
  const i=current(),max=state.match.overs*6;
  if(isComplete())return finishInnings();
  const s=i.bat[i.striker],bw=i.bowl[i.bowler];
  if(!s || !bw)return alert("Please select batter and bowler first.");
  snapshot();
  let total=runs,legal=true,batterRuns=0;
  if(extra==="wide"){total=1;legal=false;}
  else if(extra==="noball"){total=1+runs;legal=false;batterRuns=runs;}
  else if(extra==="bye" || extra==="legbye"){total=runs;batterRuns=0;}
  else {batterRuns=runs;}
  i.runs+=total;
  s.runs+=batterRuns;
  if(batterRuns===4)s.fours++;
  if(batterRuns===6)s.sixes++;
  if(legal){i.balls++;s.balls++;bw.balls++;}
  bw.runs+=total;
  if(extra==="wide")bw.wides++;
  if(extra==="noball")bw.noBalls++;
  const label=extra==="wide"?"Wd":extra==="noball"?`Nb${runs||""}`:extra==="bye"?`B${runs}`:extra==="legbye"?`Lb${runs}`:String(runs);
  i.events.push({label,runs:total,type:"run"});
  if(legal && (batterRuns%2===1 || ((extra==="bye"||extra==="legbye") && runs%2===1)))rotate();
  if(i.balls>0 && i.balls%6===0)rotate();
  if(checkChase())return;
  if(isComplete())return finishInnings();
  save();renderScore();
  if(i.balls>0 && i.balls%6===0)openBowlerModal();
}
function declareBall(){
  const i=current(),s=i.bat[i.striker],bw=i.bowl[i.bowler];
  if(isComplete())return finishInnings();
  if(!s||!bw)return alert("Please select batter and bowler first.");
  snapshot();
  i.runs+=1;s.runs+=1;s.balls+=1;i.balls+=1;bw.balls+=1;bw.runs+=1;
  i.events.push({label:"D",runs:1,type:"declare"});
  // Special rule: Declare never changes striker because of the run.
  if(i.balls%6===0)rotate();
  if(checkChase())return;
  if(isComplete())return finishInnings();
  save();renderScore();
  if(i.balls%6===0)openBowlerModal();
}
function wicket(){
  const i=current();if(isComplete())return finishInnings();
  if(!i.bat[i.striker])return alert("No striker selected.");
  openModal("Wicket",`<div class="modal-grid">
    <button class="primary" onclick="confirmWicket('Bowled')">Bowled</button>
    <button onclick="confirmWicket('Caught')">Caught</button>
    <button onclick="confirmWicket('LBW')">LBW</button>
    <button onclick="confirmWicket('Run Out')">Run Out</button>
    <button onclick="confirmWicket('Stumped')">Stumped</button>
  </div>`);
}
function confirmWicket(kind){
  closeModal();
  const i=current(),s=i.bat[i.striker],bw=i.bowl[i.bowler];
  snapshot();
  s.out=true;s.dismissal=kind;i.wickets++;i.balls++;s.balls++;bw.balls++;bw.wickets++;
  i.events.push({label:"W",runs:0,type:"wicket"});
  if(i.wickets>=allOutLimit(i)){save();renderScore();return finishInnings();}
  save();renderScore();openNewBatterModal();
}
function openNewBatterModal(){
  const i=current();
  const choices=i.bat.map((p,idx)=>(p.out||idx===i.striker||idx===i.nonStriker)?"":
    `<button onclick="selectNewBatter(${idx})">${esc(p.name)} <span class="muted">${p.runs} runs</span></button>`).join("");
  if(!choices)return finishInnings();
  openModal("Select New Batter",`<div class="warning">Choose the incoming batter. The selected player will become the striker.</div><div class="selection-list">${choices}</div>`);
}
function selectNewBatter(idx){current().striker=idx;save();closeModal();renderScore();}
function openBowlerModal(){
  const i=current();
  if(!i.bowl.length)return alert("No bowling players configured.");
  const choices=i.bowl.map((b,idx)=>`<button class="${idx===i.bowler?"selected":""}" onclick="selectBowler(${idx})">
    ${esc(b.name)} <span class="muted">${overText(b.balls)} ov · ${b.runs}/${b.wickets}</span></button>`).join("");
  openModal("Select Bowler",`<div class="warning">Select the bowler for this over.</div><div class="selection-list">${choices}</div>`);
}
function selectBowler(idx){current().bowler=idx;save();closeModal();renderScore();}
function openAdjustModal(){
  const i=current(),s=i.bat[i.striker],n=i.bat[i.nonStriker],b=i.bowl[i.bowler];
  openModal("Score Adjustment",`
    <div class="warning">Use this only when the scorer entered something incorrectly. This changes the displayed score/figures without deleting the match.</div>
    <div class="adjust-row"><b>Innings runs</b><div class="adjust-grid"><span>Current ${i.runs}</span><input id="adjRuns" type="number" min="0" value="${i.runs}"></div></div>
    <div class="adjust-row"><b>Wickets</b><div class="adjust-grid"><span>Current ${i.wickets}</span><input id="adjWkts" type="number" min="0" max="${allOutLimit(i)}" value="${i.wickets}"></div></div>
    <div class="adjust-row"><b>Legal balls</b><div class="adjust-grid"><span>Current ${i.balls}</span><input id="adjBalls" type="number" min="0" max="${state.match.overs*6}" value="${i.balls}"></div></div>
    <div class="adjust-row"><b>Striker runs</b><div class="adjust-grid"><span>${esc(s?.name||"-")}</span><input id="adjStriker" type="number" min="0" value="${s?.runs||0}"></div></div>
    <div class="adjust-row"><b>Non-striker runs</b><div class="adjust-grid"><span>${esc(n?.name||"-")}</span><input id="adjNon" type="number" min="0" value="${n?.runs||0}"></div></div>
    <div class="adjust-row"><b>Bowler conceded</b><div class="adjust-grid"><span>${esc(b?.name||"-")}</span><input id="adjBowlerRuns" type="number" min="0" value="${b?.runs||0}"></div></div>
    <div class="adjust-row"><b>Bowler wickets</b><div class="adjust-grid"><span>${esc(b?.name||"-")}</span><input id="adjBowlerWkts" type="number" min="0" value="${b?.wickets||0}"></div></div>
    <button class="primary full" onclick="saveAdjustment()">Save Adjustment</button>`);
}
function saveAdjustment(){
  const i=current();snapshot();
  i.runs=Math.max(0,+$("adjRuns").value||0);
  i.wickets=Math.min(allOutLimit(i),Math.max(0,+$("adjWkts").value||0));
  i.balls=Math.min(state.match.overs*6,Math.max(0,+$("adjBalls").value||0));
  if(i.bat[i.striker])i.bat[i.striker].runs=Math.max(0,+$("adjStriker").value||0);
  if(i.bat[i.nonStriker])i.bat[i.nonStriker].runs=Math.max(0,+$("adjNon").value||0);
  if(i.bowl[i.bowler]){
    i.bowl[i.bowler].runs=Math.max(0,+$("adjBowlerRuns").value||0);
    i.bowl[i.bowler].wickets=Math.max(0,+$("adjBowlerWkts").value||0);
  }
  i.events.push({label:"ADJ",runs:0,type:"adjustment"});
  save();closeModal();renderScore();
}
function finishInnings(){
  const m=state.match,i=current();
  if(m.current===0){
    if(!m.innings[1])m.innings[1]=blankInnings(teamBy(m.teams[1]),teamBy(m.teams[0]));
    m.current=1;save();renderScore();openBowlerModal();return;
  }
  finishMatch();
}
function finishMatch(){
  const m=state.match,a=m.innings[0],b=m.innings[1];
  m.finished=true;
  const ta=teamBy(a.teamId)?.name||"Team A",tb=teamBy(b.teamId)?.name||"Team B";
  if(b.runs>a.runs)m.result=`${tb} won by ${Math.max(0,b.bat.length-b.wickets)} wickets`;
  else if(a.runs>b.runs)m.result=`${ta} won by ${a.runs-b.runs} runs`;
  else m.result="Match tied";
  state.history=[JSON.parse(JSON.stringify(m)),...(state.history||[])].slice(0,50);
  save();renderScorecard();show("scorecardView");
}
function undo(){
  if(!undoStack.length)return alert("Nothing to undo.");
  state=undoStack.pop();save();
  if(state.match&&!state.match.finished){show("scoreView");renderScore();}
}
function openModal(title,body){$("modalTitle").textContent=title;$("modalBody").innerHTML=body;$("modal").classList.remove("hidden");}
function closeModal(){$("modal").classList.add("hidden");}
function renderScorecard(){
  const m=state.match||state.history[0];if(!m)return;
  $("scorecardTitle").textContent=m.title||"Match";
  let html="";
  if(m.finished)html+=`<div class="result"><h2>${esc(m.result)}</h2><p>${esc(m.title)} · ${m.overs} overs</p></div>`;
  (m.innings||[]).forEach(i=>{
    if(!i)return;const t=teamBy(i.teamId);
    html+=`<div class="score-section"><h3>${esc(t?.name||"Team")} <span style="float:right">${i.runs}/${i.wickets} (${overText(i.balls)})</span></h3>
      <div class="table-wrap"><table class="score-table"><thead><tr><th>Batter</th><th>R</th><th>B</th><th>4s</th><th>6s</th></tr></thead><tbody>
      ${(i.bat||[]).map(b=>`<tr><td>${esc(b.name)}${b.out?` <small class="muted">(${esc(b.dismissal)})</small>`:"*"}</td><td>${b.runs}</td><td>${b.balls}</td><td>${b.fours}</td><td>${b.sixes}</td></tr>`).join("")}
      <tr class="total-row"><td>Total</td><td>${i.runs}</td><td colspan="3">${i.wickets} wkts · ${overText(i.balls)} ov</td></tr></tbody></table></div></div>`;
    html+=`<div class="score-section"><h3>Bowling</h3><div class="table-wrap"><table class="score-table"><thead><tr><th>Bowler</th><th>O</th><th>R</th><th>W</th></tr></thead><tbody>${(i.bowl||[]).map(b=>`<tr><td>${esc(b.name)}</td><td>${overText(b.balls)}</td><td>${b.runs}</td><td>${b.wickets}</td></tr>`).join("")}</tbody></table></div></div>`;
  });
  $("scorecardContent").innerHTML=html;
}
function renderHistory(){
  const list=state.history||[];
  $("historyList").innerHTML=list.length?list.map(m=>`<div class="history-item"><div class="history-head"><div><h3>${esc(m.title)}</h3><div class="history-meta">${new Date(m.createdAt).toLocaleString()} · ${m.overs} overs</div></div><b>${esc(m.result||"In progress")}</b></div><div class="history-actions"><button class="secondary" onclick="loadHistory('${m.id}')">View</button><button class="danger-btn" onclick="deleteHistory('${m.id}')">Delete</button></div></div>`).join(""):`<div class="empty">No saved matches yet.</div>`;
}
function loadHistory(id){const m=state.history.find(x=>x.id===id);if(!m)return;state.match=JSON.parse(JSON.stringify(m));undoStack=[];save();renderScorecard();show("scorecardView");}
function deleteHistory(id){if(confirm("Delete this match permanently?")){state.history=state.history.filter(x=>x.id!==id);save();renderHistory();}}
function newMatch(){state.match=null;undoStack=[];save();$("matchTitle").value="";show("setupView");renderTeams();}
function resetApp(){if(confirm("Clear all local scorecard data and start fresh?")){localStorage.removeItem(KEY);localStorage.removeItem(OLD_KEY);state=defaultState();undoStack=[];save();show("setupView");renderTeams();}}

$("startMatchBtn").onclick=startMatch;
$("newMatchBtn").onclick=newMatch;
$("historyBtn").onclick=()=>{renderHistory();show("historyView");};
$("closeHistoryBtn").onclick=()=>show(state.match&&!state.match.finished?"scoreView":"setupView");
$("scorecardBtn").onclick=()=>{renderScorecard();show("scorecardView");};
$("backScoreBtn").onclick=()=>show("scoreView");
$("modalClose").onclick=closeModal;
$("undoBtn").onclick=undo;
$("wicketBtn").onclick=wicket;
$("declareBtn").onclick=declareBall;
if($("adjustBtn"))$("adjustBtn").onclick=openAdjustModal;
if($("bowlerBtn"))$("bowlerBtn").onclick=openBowlerModal;

document.addEventListener("click",e=>{
  const run=e.target.closest("[data-run]"),extra=e.target.closest("[data-extra]");
  if(run){addBall(+run.dataset.run);return;}
  if(extra){addBall(0,extra.dataset.extra);return;}
});

renderTeams();
if(state.match&&!state.match.finished){show("scoreView");renderScore();}
