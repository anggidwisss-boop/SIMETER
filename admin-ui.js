/* RIMPU Admin UI — reliable touch/click user cards */
(function(){
  "use strict";
  function escA(v){return String(v==null?"":v).replace(/[&<>\"']/g,function(c){return ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]);});}
  function actor(){try{return JSON.parse(localStorage.getItem("simeter_user")||"null")||{};}catch(e){return {};}}
  function isSA(){return String(actor().role||"").toUpperCase()==="SUPER_ADMIN";}
  function usersBox(){return document.getElementById("usersList");}
  function badge(r){return '<span class="admin-role-badge">'+escA(String(r||"PETUGAS").toUpperCase())+'</span>';}

  function modal(html){
    var m=document.getElementById("modal"),b=document.getElementById("modalBody");
    if(!m||!b){alert("Panel detail belum tersedia.");return;}
    b.innerHTML=html;m.hidden=false;m.setAttribute("aria-hidden","false");m.style.setProperty("display","flex","important");
  }
  function close(){var m=document.getElementById("modal");if(m){m.hidden=true;m.setAttribute("aria-hidden","true");m.style.setProperty("display","none","important");}}

  function detail(u){
    var sa=isSA();
    modal('<div class="admin-detail">'
      +'<div class="admin-detail-head"><div class="admin-avatar">'+escA((u.name||u.username||"U").charAt(0).toUpperCase())+'</div><div><h2>'+escA(u.name||u.username)+'</h2><small>'+escA(u.username)+'</small></div></div>'
      +'<div class="details-grid admin-detail-grid">'
      +'<div class="kv"><small>Nama</small><b>'+escA(u.name||"-")+'</b></div>'
      +'<div class="kv"><small>Username</small><b>'+escA(u.username||"-")+'</b></div>'
      +'<div class="kv"><small>Role</small><b>'+badge(u.role)+'</b></div>'
      +'<div class="kv"><small>Unit</small><b>'+escA(u.unit||"-")+'</b></div>'
      +'<div class="kv"><small>Status</small><b>'+(u.active!==false?"Aktif":"Nonaktif")+'</b></div>'
      +'</div>'
      +(sa?'<div class="admin-actions"><button type="button" class="secondary" id="rimpuReset">🔑 Reset Password</button><button type="button" class="secondary danger-btn" id="rimpuDelete">🗑 Hapus User</button></div>':'')
      +'</div>');
    var rb=document.getElementById("rimpuReset"),db=document.getElementById("rimpuDelete");
    if(rb)rb.onclick=function(){resetPass(u.username);};
    if(db)db.onclick=function(){deleteUser(u.username);};
  }

  async function fetchUsers(){
    var r=await window.request("getUsers");
    if(!r||!r.ok)throw new Error(r&&r.error||"Gagal mengambil pengguna");
    return Array.isArray(r.data)?r.data:[];
  }

  async function loadEnhanced(){
    var box=usersBox();if(!box)return;
    box.innerHTML='<div class="empty">Memuat pengguna...</div>';
    try{render(await fetchUsers());}catch(e){box.innerHTML='<div class="alert danger">'+escA(e.message||"Gagal mengambil pengguna")+'</div>';}
  }

  function render(data){
    var box=usersBox();if(!box)return;
    box.innerHTML=(data||[]).map(function(u){
      return '<button type="button" class="meter-card admin-user-card" data-rimpu-user="'+escA(u.username)+'" aria-label="Buka detail '+escA(u.name||u.username)+'">'
        +'<div class="admin-user-main"><b>'+escA(u.name||u.username)+'</b><div>'+escA(u.username)+' · '+badge(u.role)+' · '+escA(u.unit||"-")+'</div></div>'
        +'<div class="admin-user-arrow">›</div></button>';
    }).join("")||'<div class="empty">Belum ada user</div>';
    box.querySelectorAll("[data-rimpu-user]").forEach(function(el){
      el.onclick=function(ev){ev.preventDefault();ev.stopPropagation();var n=el.getAttribute("data-rimpu-user");fetchUsers().then(function(rows){var u=rows.find(function(x){return String(x.username).toLowerCase()===String(n).toLowerCase();});if(u)detail(u);}).catch(function(e){alert(e.message||"Gagal membuka detail user");});};
    });
  }

  async function resetPass(username){
    if(!isSA())return alert("Hanya SUPER_ADMIN yang dapat mereset password.");
    if(!confirm("Reset password untuk "+username+"?"))return;
    try{
      var a=actor();
      var r=await window.request("resetPassword",{method:"POST",body:{username:username,actorUsername:a.username||""}});
      if(!r||!r.ok)throw new Error(r&&r.error||"Reset password gagal");
      modal('<h2>Password berhasil direset</h2><div class="alert">Username: <b>'+escA(r.username||username)+'</b><br>Password sementara: <b class="temp-pass">'+escA(r.tempPassword||"-")+'</b><br><small>Simpan password ini dan berikan kepada pengguna.</small></div><button class="primary" id="rimpuDone">Selesai</button>');
      document.getElementById("rimpuDone").onclick=close;
    }catch(e){alert(e.message||"Reset password gagal");}
  }

  async function deleteUser(username){
    if(!isSA())return alert("Hanya SUPER_ADMIN yang dapat menghapus user.");
    var a=actor();if(String(username).toLowerCase()===String(a.username||"").toLowerCase())return alert("Akun sendiri tidak dapat dihapus.");
    if(!confirm("Hapus user "+username+"?\n\nData pemeliharaan tetap aman."))return;
    try{
      var r=await window.request("deleteUser",{method:"POST",body:{username:username,actorUsername:a.username||""}});
      if(!r||!r.ok)throw new Error(r&&r.error||"Hapus user gagal");
      close();await loadEnhanced();
    }catch(e){alert(e.message||"Hapus user gagal");}
  }

  function install(){
    /* Do not depend on window.USER/window.showModal. Observe the dynamically rendered admin list. */
    var root=document.getElementById("adminView");if(!root)return;
    var observer=new MutationObserver(function(){
      var box=usersBox();if(!box||box.dataset.rimpuEnhanced)return;
      var cards=box.querySelectorAll(".meter-card");if(!cards.length)return;
      /* Existing cards have no click behavior. Re-read data and replace them with real buttons. */
      box.dataset.rimpuEnhanced="1";
      fetchUsers().then(render).catch(function(){});
    });
    observer.observe(root,{childList:true,subtree:true});
    window.RIMPUAdmin={openUserDetail:function(n){fetchUsers().then(function(rows){var u=rows.find(function(x){return String(x.username).toLowerCase()===String(n).toLowerCase();});if(u)detail(u);});},loadUsersEnhanced:loadEnhanced,resetUserPassword:resetPass,deleteUserAdmin:deleteUser};
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install);else install();
})();