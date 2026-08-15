/* RIMPU Admin UI — touch/click user cards for detail, edit, reset, delete */
(function(){
  "use strict";
  function escA(v){
    return String(v==null?"":v).replace(/[&<>\"']/g,function(c){return ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]);});
  }
  function isSA(){return String(window.USER?.role||"").toUpperCase()==="SUPER_ADMIN";}
  function getUserList(){return document.getElementById("usersList");}
  function roleBadge(role){
    var r=String(role||"PETUGAS").toUpperCase();
    return '<span class="admin-role-badge">'+escA(r)+'</span>';
  }
  function renderEnhancedUsers(data){
    var box=getUserList(); if(!box)return;
    var rows=Array.isArray(data)?data:[];
    box.innerHTML=rows.map(function(u){
      var active=u.active!==false;
      return '<button type="button" class="meter-card admin-user-card" data-admin-user="'+escA(u.username)+'">'
        +'<div class="admin-user-main"><b>'+escA(u.name||u.username)+'</b>'
        +'<div>'+escA(u.username)+' · '+roleBadge(u.role)+' · '+escA(u.unit||"-")+'</div></div>'
        +'<div class="admin-user-arrow">›</div>'
        +'</button>';
    }).join("")||'<div class="empty">Belum ada user</div>';
    box.querySelectorAll("[data-admin-user]").forEach(function(el){
      el.addEventListener("click",function(){openUserDetail(el.getAttribute("data-admin-user"));});
      el.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();openUserDetail(el.getAttribute("data-admin-user"));}});
    });
  }
  async function loadUsersEnhanced(){
    var box=getUserList(); if(!box)return;
    box.innerHTML='<div class="empty">Memuat pengguna...</div>';
    try{
      var r=await window.request("getUsers");
      if(!r||!r.ok)throw new Error(r?.error||"Gagal mengambil pengguna");
      renderEnhancedUsers(r.data||[]);
    }catch(e){box.innerHTML='<div class="alert danger">'+escA(e.message||"Gagal mengambil pengguna")+'</div>';}
  }
  function userModalHTML(u){
    var can=isSA();
    return '<div class="admin-detail">'
      +'<div class="admin-detail-head"><div class="admin-avatar">'+escA((u.name||u.username||"U").charAt(0).toUpperCase())+'</div><div><h2>'+escA(u.name||u.username)+'</h2><small>'+escA(u.username)+'</small></div></div>'
      +'<div class="details-grid admin-detail-grid">'
      +'<div class="kv"><small>Nama</small><b>'+escA(u.name||"-")+'</b></div>'
      +'<div class="kv"><small>Username</small><b>'+escA(u.username||"-")+'</b></div>'
      +'<div class="kv"><small>Role</small><b>'+roleBadge(u.role)+'</b></div>'
      +'<div class="kv"><small>Unit</small><b>'+escA(u.unit||"-")+'</b></div>'
      +'<div class="kv"><small>Status</small><b>'+((u.active!==false)?"Aktif":"Nonaktif")+'</b></div>'
      +'</div>'
      +(can?'<div class="admin-actions">'
        +'<button type="button" class="secondary" id="adminResetPass">🔑 Reset Password</button>'
        +'<button type="button" class="secondary danger-btn" id="adminDeleteUser">🗑 Hapus User</button>'
        +'</div>':'')
      +'</div>';
  }
  async function openUserDetail(username){
    try{
      var r=await window.request("getUsers");
      if(!r||!r.ok)throw new Error(r?.error||"Gagal mengambil detail user");
      var u=(r.data||[]).find(function(x){return String(x.username).toLowerCase()===String(username).toLowerCase();});
      if(!u)throw new Error("User tidak ditemukan");
      window.showModal(userModalHTML(u));
      var reset=document.getElementById("adminResetPass");
      var del=document.getElementById("adminDeleteUser");
      if(reset)reset.onclick=function(){resetUserPassword(u.username);};
      if(del)del.onclick=function(){deleteUserAdmin(u.username);};
    }catch(e){alert(e.message||"Gagal membuka detail user");}
  }
  async function resetUserPassword(username){
    if(!isSA())return alert("Hanya SUPER_ADMIN yang dapat mereset password.");
    if(!confirm("Reset password untuk user "+username+"?"))return;
    try{
      var r=await window.request("resetPassword",{method:"POST",body:{targetUsername:username}});
      if(!r||!r.ok)throw new Error(r?.error||"Reset password gagal");
      window.showModal('<h2>Password berhasil direset</h2><div class="alert">Username: <b>'+escA(r.username||username)+'</b><br>Password sementara: <b class="temp-pass">'+escA(r.temporaryPassword||"-")+'</b><br><small>Simpan password ini dan berikan kepada pengguna.</small></div><button class="primary" id="closeAdminResult">Selesai</button>');
      document.getElementById("closeAdminResult").onclick=function(){window.closeModal();};
    }catch(e){alert(e.message||"Reset password gagal");}
  }
  async function deleteUserAdmin(username){
    if(!isSA())return alert("Hanya SUPER_ADMIN yang dapat menghapus user.");
    if(String(username).toLowerCase()===String(window.USER?.username||"").toLowerCase())return alert("Akun sendiri tidak dapat dihapus.");
    if(!confirm("Hapus user "+username+"?\n\nData pemeliharaan yang sudah tersimpan tidak akan dihapus."))return;
    try{
      var r=await window.request("deleteUser",{method:"POST",body:{targetUsername:username}});
      if(!r||!r.ok)throw new Error(r?.error||"Hapus user gagal");
      window.closeModal();
      await loadUsersEnhanced();
    }catch(e){alert(e.message||"Hapus user gagal");}
  }
  function patch(){
    if(!window.request||!window.showModal)return;
    window.loadUsers=loadUsersEnhanced;
    var original=window.renderUsersAdmin;
    if(typeof original==="function" && !original.__rimpuAdminPatched){
      window.renderUsersAdmin=function(){
        var c=document.getElementById("adminContent");
        if(!c)return;
        c.innerHTML='<div class="card"><h2>Kelola Pengguna</h2><button id="addUserBtn" class="primary">+ Tambah User</button><div id="usersList" class="list">Memuat...</div></div>';
        document.getElementById("addUserBtn").onclick=window.userForm;
        loadUsersEnhanced();
      };
      window.renderUsersAdmin.__rimpuAdminPatched=true;
    }
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",patch);else patch();
  window.RIMPUAdmin={openUserDetail,loadUsersEnhanced,resetUserPassword,deleteUserAdmin};
})();
