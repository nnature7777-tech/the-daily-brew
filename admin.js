const OWNER="nnature7777-tech",REPO="the-daily-brew",FILE="menu-data.json",SITE=`https://${OWNER}.github.io/${REPO}/`;
let token=localStorage.getItem("tdb_gh_token")||"",data=null,sha="";
const $=id=>document.getElementById(id);
function say(t,c){const b=$("statusBox");b.textContent=t;b.className="msg noprint "+c;if(c==="ok")setTimeout(()=>b.className="msg noprint",4000)}
const toB64=s=>btoa(unescape(encodeURIComponent(s))),fromB64=b=>decodeURIComponent(escape(atob(b.replace(/\n/g,""))));

async function unlock(){
  const v=$("tok").value.trim();if(v)token=v;
  if(!token)return say("Paste your token first.","err");
  say("Connecting...","busy");
  try{
    const r=await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE}?t=${Date.now()}`,{headers:{Authorization:"Bearer "+token,Accept:"application/vnd.github+json"}});
    if(!r.ok)throw new Error("Token rejected (HTTP "+r.status+"). Check Contents Read & Write.");
    const j=await r.json();sha=j.sha;data=JSON.parse(fromB64(j.content));
    localStorage.setItem("tdb_gh_token",token);
    $("loginBox").classList.add("hide");$("dashBox").classList.remove("hide");
    say("Connected!","ok");fillUI();
  }catch(e){localStorage.removeItem("tdb_gh_token");say(e.message,"err")}
}

function fillUI(){
  $("iCat").innerHTML=data.categories.map(c=>`<option value="${c}">${c}</option>`).join("");
  $("sName").value=data.cafe.name||"";$("sTag").value=data.cafe.tagline||"";$("sWa").value=data.cafe.whatsapp||"";
  $("sGst").value=data.cafe.gstPercent??5;$("sSc").value=data.cafe.serviceChargePercent??0;$("sTbl").value=data.cafe.tableCount||12;
  renderDishes();
}

function renderDishes(){
  $("cnt").textContent=data.items.length;
  $("dishList").innerHTML=data.items.map(i=>`<div class="dish"><img src="${i.image}" onerror="this.src='https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=200'"><div><strong>${i.name} • ₹${i.price}</strong><div style="font-size:.76rem;color:#6E6259">${i.category} • ${i.veg?"Veg":"Non-Veg"}</div><div class="dacts"><button type="button" class="pill ${i.available!==false?"in":"out"}" onclick="tog('${i.id}')">${i.available!==false?"Available":"Sold Out"}</button><button type="button" class="btn bo bs" onclick="ed('${i.id}')">Edit</button><button type="button" class="btn br bs" onclick="del('${i.id}')">Delete</button></div></div></div>`).join("");
}

async function push(msg){
  say("Saving...","busy");
  const r=await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE}`,{method:"PUT",headers:{Authorization:"Bearer "+token,Accept:"application/vnd.github+json","Content-Type":"application/json"},body:JSON.stringify({message:msg,content:toB64(JSON.stringify(data,null,2)),sha})});
  if(!r.ok)throw new Error("Save failed ("+r.status+")");
  sha=(await r.json()).content.sha;renderDishes();say("Done! The changes will update in ~30s.","ok");
}

async function upImg(f){
  return new Promise((res,rej)=>{
    const rd=new FileReader();
    rd.onload=async()=>{
      try{
        say("Uploading photo...","busy");
        const p=`images/${Date.now()}-${f.name.replace(/[^a-zA-Z0-9.]/g,"-").toLowerCase()}`;
        const r=await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${p}`,{method:"PUT",headers:{Authorization:"Bearer "+token,Accept:"application/vnd.github+json","Content-Type":"application/json"},body:JSON.stringify({message:"Upload photo",content:rd.result.split(",")[1]})});
        if(!r.ok)throw new Error("Photo upload failed");res(SITE+p);
      }catch(e){rej(e)}
    };rd.readAsDataURL(f);
  });
}

$("unlockBtn").onclick=unlock;
$("logoutBtn").onclick=()=>{localStorage.removeItem("tdb_gh_token");location.reload()};
document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");
  ["menu","set","qr"].forEach(p=>$("pane-"+p).classList.toggle("hide",p!==b.dataset.t));
  if(b.dataset.t==="qr"){
    const n=data.cafe.tableCount||12;
    $("qrGrid").innerHTML=Array.from({length:n},(_,k)=>{const t=k+1,u=`${SITE}?table=${t}`,q=`https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=8&data=${encodeURIComponent(u)}`;return`<div class="qrcard"><strong>${data.cafe.name}</strong><div style="color:#A67E38;font-weight:700">TABLE ${t}</div><img src="${q}"><a href="${q}" target="_blank" class="btn bo bs noprint" style="text-decoration:none;display:inline-block">Open QR</a></div>`}).join("");
  }
});

$("saveDishBtn").onclick=async()=>{
  const name=$("iName").value.trim(),price=Number($("iPrice").value);
  if(!name||!price)return say("Enter Name & Price.","err");
  try{
    let img=$("iImg").value.trim();const f=$("iFile").files[0];
    if(f)img=await upImg(f);if(!img)img="https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600";
    const obj={id:$("editId").value||"item-"+Date.now(),name,category:$("iCat").value,price,veg:$("iVeg").value==="true",available:$("iAvail").value==="true",description:$("iDesc").value.trim(),image:img};
    const idx=data.items.findIndex(x=>x.id===obj.id);if(idx>-1)data.items[idx]=obj;else data.items.unshift(obj);
    await push("Save "+name);resetF();
  }catch(e){say(e.message,"err")}
};

function ed(id){const i=data.items.find(x=>x.id===id);if(!i)return;$("editId").value=i.id;$("iName").value=i.name;$("iCat").value=i.category;$("iPrice").value=i.price;$("iVeg").value=String(i.veg);$("iAvail").value=String(i.available!==false);$("iDesc").value=i.description||"";$("iImg").value=i.image||"";$("fHead").textContent="Edit: "+i.name;$("cancelBtn").classList.remove("hide");scrollTo({top:0,behavior:"smooth"})}
function resetF(){["editId","iName","iPrice","iDesc","iImg","iFile"].forEach(k=>$(k).value="");$("fHead").textContent="Add Dish / Drink";$("cancelBtn").classList.add("hide")}
$("cancelBtn").onclick=resetF;
async function tog(id){const i=data.items.find(x=>x.id===id);i.available=!(i.available!==false);try{await push("Toggle "+i.name)}catch(e){say(e.message,"err")}}
async function del(id){const i=data.items.find(x=>x.id===id);if(confirm("Delete "+i.name+"?")){data.items=data.items.filter(x=>x.id!==id);try{await push("Delete "+i.name)}catch(e){say(e.message,"err")}}}
$("saveSetBtn").onclick=async()=>{const wa=$("sWa").value.replace(/\D/g,"");if(!wa)return say("Enter WhatsApp with 91.","err");data.cafe.name=$("sName").value.trim()||"THE DAILY BREW";data.cafe.tagline=$("sTag").value.trim();data.cafe.whatsapp=wa;data.cafe.gstPercent=Number($("sGst").value)||0;data.cafe.serviceChargePercent=Number($("sSc").value)||0;data.cafe.tableCount=Number($("sTbl").value)||12;try{await push("Update settings")}catch(e){say(e.message,"err")}};
if(token)unlock();
                                                                                            
