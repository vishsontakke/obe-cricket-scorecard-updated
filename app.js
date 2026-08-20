const KEY="Daily Cricket_cricket_v1";
let state = load() || {teams:[
 {id:"a",name:"Team A",players:["Player 1","Player 2","Player 3","Player 4","Player 5","Player 6","Player 7","Player 8","Player 9","Player 10","Player 11"]},
 {id:"b",name:"Team B",players:["Player 1","Player 2","Player 3","Player 4","Player 5","Player 6","Player 7","Player 8","Player 9","Player 10","Player 11"]}
],history:[],match:null};
const $=id=>document.getElementById(id);
function load(){try{return JSON.parse(localStorage.getItem(KEY))}catch(e){return null}}
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function show(id){document.querySelectorAll(".view").forEach(v=>v.classList.add("hidden"));$(id).classList.remove("hidden")}
function renderTeams(){
 $("teamEditor").innerHTML=state.teams.map((t,i)=>`
 <div class="team-row" data-team="${t.id}">
   <div class="team-head"><b>${i===0?"🟢":"🔵"} Team ${i+1}</b>${state.teams.length>2?`<button class="small-btn" onclick="removeTeam('${t.id}')">Delete</button>`:""}</div>
   <label>Team name<input class="team-name" value="${esc(t.name)}" data-id="${t.id}"></label>
   <div class="players">${t.players.map((p,j)=>`<div class="player-input"><input value="${esc(p)}" data-player="${t.id}:${j}" placeholder="Player ${j+1}"></div>`).join("")}</div>
   <button class="add-player" onclick="addPlayer('${t.id}')">+ Add player</button>
 </div>`).join("")+
 (state.teams.length<4?`<button class="secondary full" onclick="addTeam()">+ Add another team</button>`:"");
}
function syncTeams(){
 document.querySelectorAll(".team-name").forEach(x=>{let t=state.teams.find(t=>t.id===x.dataset.id);if(t)t.name=x.value});
 document.querySelectorAll("[data-player]").forEach(x=>{let [id,j]=x.dataset.player.split(":");let t=state.teams.find(t=>t.id===id);if(t)t.players[+j]=x.value});
 save();
}
function addTeam(){syncTeams();let id=crypto.randomUUID();state.teams.push({id,name:"Team "+(state.teams.length+1),players:["Player 1","Player 2","Player 3","Player 4","Player 5","Player 6","Player 7","Player 8","Player 9","Player 10","Player 11"]});renderTeams()}
function removeTeam(id){if(confirm("Delete this team?")){syncTeams();state.teams=state.teams.filter(t=>t.id!==id);renderTeams()}}
function addPlayer(id){syncTeams();state.teams.find(t=>t.id===id).players.push("Player "+(state.teams.find(t=>t.id===id).players.length+1));renderTeams()}
function blankInnings(team,bowlerTeam){
 return {teamId:team.id,runs:0,wickets:0,balls:0,bat:team.players.map((name,i)=>({name,runs:0,balls:0,fours:0,sixes:0,out:false,dismissal:""})),bowl:bowlerTeam.players.map(name=>({name,balls:0,runs:0,wickets:0,wides:0,noBalls:0})),events:[],striker:0,nonStriker:1,bowler:0,started:false};
}
function startMatch(){
 syncTeams();
 if(state.teams.length<2)return alert("Add at least two teams.");
 let a=state.teams[0],b=state.teams[1];
 state.match={id:crypto.randomUUID(),title:$("matchTitle").value.trim()||`${a.name} vs ${b.name}`,overs:+$("overs").value,teams:[a.id,b.id],innings:[blankInnings(a,b)],current:0,createdAt:new Date().toISOString(),finished:false,result:""};
 save();show("scoreView");renderScore();
}
function current(){return state.match.innings[state.match.current]}
function teamBy(id){return state.teams.find(t=>t.id===id)}
function overText(b){return `${Math.floor(b/6)}.${b%6}`}
function renderScore(){
 let m=state.match,i=current(),t=teamBy(i.teamId),max=m.overs*6;
 $("inningsLabel").textContent=(state.match.current+1)+`${state.match.current===0?"st":state.match.current===1?"nd":"th"} INNINGS`;
 $("battingTeamName").textContent=t.name;$("matchMeta").textContent=`${m.overs} overs · ${m.title}`;
 $("runs").textContent=i.runs;$("wickets").textContent=i.wickets;$("oversDone").textContent=overText(i.balls);
 $("runRate").textContent=i.balls?(i.runs/(i.balls/6)).toFixed(2):"0.00";
 let targetBox=$("targetBox");
 if(state.match.current>0){let first=state.match.innings[0];targetBox.classList.remove("hidden");$("target").textContent=first.runs+1;$("needRuns").textContent=Math.max(0,first.runs+1-i.runs);$("needBalls").textContent=Math.max(0,max-i.balls)}else targetBox.classList.add("hidden");
 let s=i.bat[i.striker],n=i.bat[i.nonStriker],bw=i.bowl[i.bowler];
 $("strikerName").textContent=s?.name||"Striker";$("strikerStats").textContent=s?`${s.runs} (${s.balls})`:"0 (0)";
 $("nonStrikerName").textContent=n?.name||"Non-striker";$("nonStrikerStats").textContent=n?`${n.runs} (${n.balls})`:"0 (0)";
 $("bowlerName").textContent=bw?.name||"Bowler";$("bowlerStats").textContent=bw?`${overText(bw.balls)} ov · ${bw.runs}/${bw.wickets}`:"0.0 ov · 0/0";
 $("recentBalls").innerHTML=i.events.slice(-12).map(e=>`<span class="ball ${e.type==="wicket"?"w":e.type==="declare"?"declare-ball":e.runs>=4?"boundary":""}">${e.label}</span>`).join("")||`<span class="muted">No balls yet</span>`;
 $("ballCount").textContent=`${i.balls} legal balls`;
}
function rotate(){let i=current();[i.striker,i.nonStriker]=[i.nonStriker,i.striker]}
function nextBatter(){
 let i=current();let idx=i.bat.findIndex((b,n)=>!b.out&&n!==i.striker&&n!==i.nonStriker&&b.balls===0&&b.runs===0);
 if(idx<0)idx=i.bat.findIndex((b,n)=>!b.out&&n!==i.striker&&n!==i.nonStriker);
 if(idx>=0)i.striker=idx;
}
function addBall(runs,extra=null,declare=false){
 let i=current(),m=state.match,max=m.overs*6;
 if(i.balls>=max||i.wickets>=i.bat.length-1)return finishInnings();
 let s=i.bat[i.striker],bw=i.bowl[i.bowler];
 let legal=!["wide","noball"].includes(extra),total=runs;
 if(extra==="wide")total=1;
 if(extra==="noball")total=1+runs;
 i.runs+=total;s.runs+=runs;
 if(runs===4)s.fours++;if(runs===6)s.sixes++;
 if(legal){i.balls++;s.balls++;bw.balls++}
 else { /* batter does not face a legal ball */ }
 bw.runs+=total;
 if(extra==="wide")bw.wides++;
 if(extra==="noball")bw.noBalls++;
 i.events.push({label:extra==="wide"?"Wd":extra==="noball"?`Nb${runs||""}`:extra==="bye"?`B${runs}`:extra==="legbye"?`Lb${runs}`:String(runs),runs:total,type:"run"});
 if(legal && (runs%2===1) && !declare)rotate();
 if(i.balls%6===0 && legal){rotate();i.bowler=(i.bowler+1)%i.bowl.length}
 if(i.runs>=((m.current||0)>0?m.innings[0].runs+1:Infinity)){if(state.match.current>0)return finishMatch(true)}
 if(i.balls>=max||i.wickets>=i.bat.length-1)finishInnings();
 save();renderScore();
}
function declareBall(){
 let i=current(),m=state.match,max=m.overs*6;
 if(i.balls>=max||i.wickets>=i.bat.length-1)return;
 window.undoStack=window.undoStack||[];
 window.undoStack.push(JSON.parse(JSON.stringify(state)));
 let s=i.bat[i.striker],bw=i.bowl[i.bowler];
 // "Declare" is a legal ball/event but DOES NOT change striker.
 i.runs+=1;
 s.runs+=1;
 s.balls++;
 i.balls++;
 bw.balls++;
 bw.runs+=1;
 i.events.push({label:"D",runs:1,type:"declare"});
 // Deliberately no striker rotation here.
 if(i.balls%6===0){
   // End of over still changes the striker, as per normal over change.
   rotate();
   i.bowler=(i.bowler+1)%i.bowl.length;
 }
 if(i.runs>=((m.current||0)>0?m.innings[0].runs+1:Infinity)){
   if(state.match.current>0)return finishMatch(true);
 }
 if(i.balls>=max||i.wickets>=i.bat.length-1)finishInnings();
 save();renderScore();
}
function wicket(){
 let i=current();if(i.balls>=state.match.overs*6)return;
 openModal("Wicket",`<div class="modal-grid">
 <button class="primary" onclick="confirmWicket('Bowled')">Bowled</button>
 <button onclick="confirmWicket('Caught')">Caught</button>
 <button onclick="confirmWicket('LBW')">LBW</button>
 <button onclick="confirmWicket('Run Out')">Run Out</button>
 <button onclick="confirmWicket('Stumped')">Stumped</button>
</div>`);
}
function confirmWicket(kind){
 closeModal();let i=current(),s=i.bat[i.striker],bw=i.bowl[i.bowler];
 s.out=true;s.dismissal=kind;i.wickets++;i.balls++;s.balls++;bw.balls++;bw.wickets++;
 i.events.push({label:"W",runs:0,type:"wicket"});
 if(i.wickets<i.bat.length-1){nextBatter()}
 if(i.balls%6===0){rotate();i.bowler=(i.bowler+1)%i.bowl.length}
 if(i.balls>=state.match.overs*6||i.wickets>=i.bat.length-1)finishInnings();
 save();renderScore();
}
function finishInnings(){
 let m=state.match,i=current();
 if(m.current===0){
   if(!m.innings[1])m.innings[1]=blankInnings(teamBy(m.teams[1]),teamBy(m.teams[0]));
   m.current=1;save();renderScore();return;
 }
 finishMatch(i.runs>m.innings[0].runs);
}
function finishMatch(chased){
 let m=state.match,a=m.innings[0],b=m.innings[1];
 m.finished=true;
 if(b.runs>a.runs)m.result=`${teamBy(b.teamId).name} won by ${b.bat.length-b.wickets} wickets`;
 else if(a.runs>b.runs)m.result=`${teamBy(a.teamId).name} won by ${a.runs-b.runs} runs`;
 else m.result="Match tied";
 state.history=[m,...(state.history||[])].slice(0,50);save();renderScorecard();show("scorecardView");
}
function undo(){
 let i=current();if(!i.events.length)return;
 alert("For a reliable score history, undo removes the last ball by restoring the previous saved state. This version uses a page-level snapshot.");
 // lightweight snapshot stack is maintained below
 if(window.undoStack?.length){state=JSON.parse(JSON.stringify(window.undoStack.pop()));save();renderScore()}
}
function openModal(title,body){$("modalTitle").textContent=title;$("modalBody").innerHTML=body;$("modal").classList.remove("hidden")}
function closeModal(){$("modal").classList.add("hidden")}
function renderScorecard(){
 let m=state.match||state.history[0];if(!m)return;
 $("scorecardTitle").textContent=m.title;
 let html="";
 if(m.finished)html+=`<div class="result"><h2>${esc(m.result)}</h2><p>${esc(m.title)} · ${m.overs} overs</p></div>`;
 m.innings.forEach((i,k)=>{if(!i)return;let t=teamBy(i.teamId);
 html+=`<div class="score-section"><h3>${esc(t.name)} <span style="float:right">${i.runs}/${i.wickets} (${overText(i.balls)})</span></h3>
 <div class="table-wrap"><table class="score-table"><thead><tr><th>Batter</th><th>R</th><th>B</th><th>4s</th><th>6s</th></tr></thead><tbody>
 ${i.bat.map(b=>`<tr><td>${esc(b.name)}${b.out?` <small class="muted">(${esc(b.dismissal)})</small>`:"*"}</td><td>${b.runs}</td><td>${b.balls}</td><td>${b.fours}</td><td>${b.sixes}</td></tr>`).join("")}
 <tr class="total-row"><td>Total</td><td>${i.runs}</td><td colspan="3">${i.wickets} wkts · ${overText(i.balls)} ov</td></tr></tbody></table></div></div>`;
 html+=`<div class="score-section"><h3>Bowling</h3><div class="table-wrap"><table class="score-table"><thead><tr><th>Bowler</th><th>O</th><th>R</th><th>W</th></tr></thead><tbody>${i.bowl.map(b=>`<tr><td>${esc(b.name)}</td><td>${overText(b.balls)}</td><td>${b.runs}</td><td>${b.wickets}</td></tr>`).join("")}</tbody></table></div></div>`;
 });
 $("scorecardContent").innerHTML=html;
}
function renderHistory(){
 let list=state.history||[];
 $("historyList").innerHTML=list.length?list.map(m=>`<div class="history-item"><div class="history-head"><div><h3>${esc(m.title)}</h3><div class="history-meta">${new Date(m.createdAt).toLocaleString()} · ${m.overs} overs</div></div><b>${esc(m.result||"In progress")}</b></div><div class="history-actions"><button class="secondary" onclick="loadHistory('${m.id}')">View</button><button class="danger-btn" onclick="deleteHistory('${m.id}')">Delete</button></div></div>`).join(""):`<div class="empty">No saved matches yet.</div>`;
}
function loadHistory(id){let m=state.history.find(x=>x.id===id);if(!m)return;state.match=JSON.parse(JSON.stringify(m));save();renderScorecard();show("scorecardView")}
function deleteHistory(id){if(confirm("Delete this match permanently?")){state.history=state.history.filter(x=>x.id!==id);save();renderHistory()}}
$("startMatchBtn").onclick=startMatch;$("newMatchBtn").onclick=()=>{show("setupView");renderTeams()};$("historyBtn").onclick=()=>{renderHistory();show("historyView")};$("closeHistoryBtn").onclick=()=>show(state.match&&!state.match.finished?"scoreView":"setupView");$("scorecardBtn").onclick=()=>{renderScorecard();show("scorecardView")};$("backScoreBtn").onclick=()=>show("scoreView");$("modalClose").onclick=closeModal;$("undoBtn").onclick=undo;$("wicketBtn").onclick=wicket;$("declareBtn").onclick=declareBall;
document.addEventListener("click",e=>{
 if(e.target.dataset.run!==undefined){
   window.undoStack=window.undoStack||[];window.undoStack.push(JSON.parse(JSON.stringify(state)));addBall(+e.target.dataset.run);
 }
 if(e.target.dataset.extra){window.undoStack=window.undoStack||[];window.undoStack.push(JSON.parse(JSON.stringify(state)));addBall(0,e.target.dataset.extra)}
});
renderTeams();
if(state.match&&!state.match.finished){show("scoreView");renderScore()}
