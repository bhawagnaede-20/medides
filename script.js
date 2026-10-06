const DEMO_USERS = [
  { login: "patient@medidesk.demo", password: "Patient@123", role: "patient", name: "Aarav Sharma" },
  { login: "doctor@medidesk.demo", password: "Doctor@123", role: "doctor", name: "Dr. Maya Rao" }
];

const doctors = [
  { id:"d1", name:"Dr. Maya Rao", specialty:"General Physician" },
  { id:"d2", name:"Dr. Arjun Mehta", specialty:"Dermatologist" },
  { id:"d3", name:"Dr. Sara Khan", specialty:"Pediatrician" }
];

const patients = [
  { id:"P-1042", name:"Aarav Sharma", age:29, blood:"O+", condition:"Seasonal allergy", phone:"90000 10001" },
  { id:"P-1187", name:"Diya Patel", age:34, blood:"A+", condition:"Routine follow-up", phone:"90000 10002" },
  { id:"P-1265", name:"Kabir Singh", age:12, blood:"B+", condition:"Annual check-up", phone:"90000 10003" },
  { id:"P-1310", name:"Meera Nair", age:41, blood:"AB+", condition:"Migraine review", phone:"90000 10004" }
];

const today = new Date();
const isoDate = d => { const x=new Date(d); x.setMinutes(x.getMinutes()-x.getTimezoneOffset()); return x.toISOString().slice(0,10); };
const future = n => { const d=new Date(); d.setDate(d.getDate()+n); return isoDate(d); };

let appointments = [
  {id:1,patientId:"P-1042",doctorId:"d1",date:future(2),time:"10:00 AM",reason:"Seasonal allergy",status:"upcoming"},
  {id:2,patientId:"P-1042",doctorId:"d2",date:future(8),time:"03:00 PM",reason:"Skin consultation",status:"upcoming"},
  {id:3,patientId:"P-1042",doctorId:"d1",date:future(-5),time:"11:00 AM",reason:"Routine consultation",status:"completed"}
];

let currentUser = null;
let activeFilter = "all";
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const doctorById = id => doctors.find(d=>d.id===id);
const patientById = id => patients.find(p=>p.id===id);

function showToast(message){const t=$("#toast");t.textContent=message;t.classList.add("show");clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>t.classList.remove("show"),2600);}
function formatDate(v){return new Date(`${v}T00:00:00`).toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short",year:"numeric"});}
function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}
function capitalize(v){return v.charAt(0).toUpperCase()+v.slice(1);}

function login(login,password){
  const user=DEMO_USERS.find(u=>u.login.toLowerCase()===login.toLowerCase() && u.password===password);
  if(!user){$("#loginError").textContent="Invalid demo login ID or password.";return false;}
  currentUser={...user,loginAt:Date.now()};
  sessionStorage.setItem("medideskSession",JSON.stringify({login:user.login,role:user.role,name:user.name,loginAt:Date.now()}));
  $("#loginScreen").classList.add("hidden");$("#appShell").classList.remove("hidden");$("#loginError").textContent="";
  setupRole();renderAll();navigate("dashboard");showToast(`Signed in as ${user.role === "doctor" ? "Doctor" : "Patient"}.`);
  return true;
}

function restoreSession(){
  try{
    const saved=JSON.parse(sessionStorage.getItem("medideskSession"));
    if(saved && Date.now()-saved.loginAt < 30*60*1000){
      const user=DEMO_USERS.find(u=>u.login===saved.login && u.role===saved.role);
      if(user){currentUser={...user,loginAt:saved.loginAt};$("#loginScreen").classList.add("hidden");$("#appShell").classList.remove("hidden");setupRole();renderAll();return;}
    }
  }catch(e){}
  sessionStorage.removeItem("medideskSession");
}

function logout(){
  currentUser=null;sessionStorage.removeItem("medideskSession");$("#appShell").classList.add("hidden");$("#loginScreen").classList.remove("hidden");
  $("#loginId").value="";$("#loginPassword").value="";showToast("You have been signed out.");
}

function setupRole(){
  const doctor=currentUser?.role==="doctor";
  $$(".doctor-only").forEach(el=>el.classList.toggle("hidden",!doctor));
  $$(".patient-only").forEach(el=>el.classList.toggle("hidden",doctor));
  $("#roleBadge").textContent=doctor?"Doctor":"Patient";
}

function navigate(view){
  if(!currentUser)return;
  if(view==="patients" && currentUser.role!=="doctor")view="dashboard";
  $$(".view").forEach(v=>v.classList.toggle("active",v.id===`${view}View`));
  $$(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  window.scrollTo({top:0,behavior:"smooth"});renderAll();
}

function visibleAppointments(){
  return appointments.filter(a=>currentUser.role==="doctor" || a.patientId==="P-1042");
}

function appointmentMarkup(a){
  const doctor=doctorById(a.doctorId), patient=patientById(a.patientId);
  const person=currentUser.role==="doctor"?patient.name:doctor.name;
  const subtitle=currentUser.role==="doctor"?`${doctor.name} · ${doctor.specialty}`:doctor.specialty;
  return `<div class="appointment-card"><div class="appointment-main"><div class="avatar">${person.split(" ").map(x=>x[0]).slice(0,2).join("")}</div><div><h3>${person}</h3><p class="date-line">${formatDate(a.date)} · ${a.time}</p><p>${subtitle}</p><p>${escapeHtml(a.reason)}</p></div></div><div class="card-actions"><span class="status ${a.status}">${capitalize(a.status)}</span>${a.status==="upcoming"?`<button class="action-btn danger cancel-btn" data-id="${a.id}">Cancel</button>`:""}</div></div>`;
}

function renderStats(){
  const list=visibleAppointments();
  $("#statAppointments").textContent=list.filter(a=>a.status==="upcoming").length;
  $("#statCompleted").textContent=list.filter(a=>a.status==="completed").length;
  $("#statPatients").textContent=patients.length;
}

function renderNext(){
  const list=visibleAppointments().filter(a=>a.status==="upcoming").sort((a,b)=>`${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  $("#nextAppointment").innerHTML=list.length?appointmentMarkup(list[0]):`<div class="empty">No upcoming appointments.</div>`;
}

function renderAppointments(){
  let list=visibleAppointments();
  if(activeFilter!=="all")list=list.filter(a=>a.status===activeFilter);
  list.sort((a,b)=>`${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  $("#appointmentsList").innerHTML=list.length?list.map(appointmentMarkup).join(""):`<div class="empty">No ${activeFilter==="all"?"":activeFilter+" "}appointments found.</div>`;
}

function renderPatients(){
  if(currentUser.role!=="doctor")return;
  $("#patientsGrid").innerHTML=patients.map(p=>`<article class="patient-card"><div class="patient-head"><div class="avatar">${p.name.split(" ").map(x=>x[0]).join("")}</div><div><h3>${p.name}</h3><small>${p.id}</small></div></div><div class="patient-info"><div class="info-box"><span>Age</span><strong>${p.age}</strong></div><div class="info-box"><span>Blood group</span><strong>${p.blood}</strong></div><div class="info-box"><span>Relevant note</span><strong>${p.condition}</strong></div><div class="info-box"><span>Phone</span><strong>${p.phone}</strong></div></div></article>`).join("");
}

function renderAll(){if(!currentUser)return;setupRole();renderStats();renderNext();renderAppointments();renderPatients();}

function openBooking(){
  $("#dateInput").min=isoDate(today);$("#dateInput").value=future(1);$("#doctorSelect").value=doctors[0].id;$("#timeSelect").value="";$("#reasonInput").value="";
  $("#modalBackdrop").classList.remove("hidden");setTimeout(()=>$("#doctorSelect").focus(),0);
}
function closeBooking(){$("#modalBackdrop").classList.add("hidden");}

document.addEventListener("click",e=>{
  const view=e.target.closest("[data-view]");if(view){e.preventDefault();navigate(view.dataset.view);}
  const demo=e.target.closest(".demo-account");if(demo){$("#loginId").value=demo.dataset.login;$("#loginPassword").value=demo.dataset.password;$("#loginPassword").focus();}
  const filter=e.target.closest(".filter-btn");if(filter){activeFilter=filter.dataset.filter;$$(".filter-btn").forEach(b=>b.classList.toggle("active",b===filter));renderAppointments();}
  const cancel=e.target.closest(".cancel-btn");if(cancel){const a=appointments.find(x=>x.id===Number(cancel.dataset.id));if(a&&confirm("Cancel this appointment?")){a.status="cancelled";renderAll();showToast("Appointment cancelled.");}}
});

$("#loginForm").addEventListener("submit",e=>{e.preventDefault();login($("#loginId").value.trim(),$("#loginPassword").value);});
$("#logoutBtn").addEventListener("click",logout);
$("#openBookingBtn").addEventListener("click",openBooking);
$("#closeModalBtn").addEventListener("click",closeBooking);
$("#modalBackdrop").addEventListener("click",e=>{if(e.target===$("#modalBackdrop"))closeBooking();});

$("#bookingForm").addEventListener("submit",e=>{
  e.preventDefault();
  if($("#dateInput").value<isoDate(today)){showToast("Please choose today or a future date.");return;}
  appointments.push({id:Date.now(),patientId:"P-1042",doctorId:$("#doctorSelect").value,date:$("#dateInput").value,time:$("#timeSelect").value,reason:$("#reasonInput").value.trim(),status:"upcoming"});
  closeBooking();activeFilter="all";$$(".filter-btn").forEach(b=>b.classList.toggle("active",b.dataset.filter==="all"));renderAll();navigate("appointments");showToast("Appointment booked successfully.");
});

document.addEventListener("keydown",e=>{if(e.key==="Escape")closeBooking();});
$("#doctorSelect").innerHTML=doctors.map(d=>`<option value="${d.id}">${d.name} — ${d.specialty}</option>`).join("");
restoreSession();
