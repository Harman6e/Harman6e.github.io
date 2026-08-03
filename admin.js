(() => {
  "use strict";
  const cfg = window.TORNDEALS_CONFIG || {};
  const configured = /^https:\/\/.+\.supabase\.co\/?$/.test(cfg.supabaseUrl || "") && cfg.supabaseKey && !String(cfg.supabaseKey).startsWith("PASTE_");
  const sdkReady = Boolean(window.supabase && typeof window.supabase.createClient === "function");
  const client = configured && sdkReady ? window.supabase.createClient(cfg.supabaseUrl.replace(/\/$/, ""), cfg.supabaseKey) : null;
  const els = {
    setup: document.querySelector("#adminSetupRequired"), login: document.querySelector("#loginView"), claim: document.querySelector("#claimAdminView"), claimForm: document.querySelector("#claimAdminForm"), bootstrapCode: document.querySelector("#bootstrapCode"), claimMessage: document.querySelector("#claimMessage"), claimLogout: document.querySelector("#claimLogoutButton"), createAdmin: document.querySelector("#createAdminButton"), dashboard: document.querySelector("#dashboardView"), loginForm: document.querySelector("#loginForm"), loginEmail: document.querySelector("#loginEmail"), loginPassword: document.querySelector("#loginPassword"), loginMessage: document.querySelector("#loginMessage"), logout: document.querySelector("#logoutButton"), adminEmail: document.querySelector("#adminEmail"), rows: document.querySelector("#adminListingRows"), adminEmpty: document.querySelector("#adminEmpty"), adminSearch: document.querySelector("#adminSearch"), statusFilter: document.querySelector("#adminStatusFilter"), add: document.querySelector("#addListingButton"), editor: document.querySelector("#listingEditor"), closeEditor: document.querySelector("#closeEditor"), cancelEditor: document.querySelector("#cancelEditor"), editorTitle: document.querySelector("#editorTitle"), form: document.querySelector("#listingForm"), imageInput: document.querySelector("#imageInput"), imagePreviews: document.querySelector("#imagePreviews"), listingMessage: document.querySelector("#listingMessage"), saveButton: document.querySelector("#saveListingButton"), deleteButton: document.querySelector("#deleteListingButton"), settingsForm: document.querySelector("#settingsForm"), settingsMessage: document.querySelector("#settingsMessage"), toast: document.querySelector("#toast"), sidebarToggle: document.querySelector("#sidebarToggle"), sidebar: document.querySelector(".admin-sidebar"), tabs: document.querySelectorAll("[data-admin-tab]"), listingsTab: document.querySelector("#listingsTab"), settingsTab: document.querySelector("#settingsTab"), activeStat: document.querySelector("#activeStat"), soldStat: document.querySelector("#soldStat"), draftStat: document.querySelector("#draftStat"), totalStat: document.querySelector("#totalStat")
  };

  const state = { session: null, listings: [], settings: null, current: null, existingImages: [], pendingFiles: [], removedPaths: [] };
  const escapeHtml = value => String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const money = (price,currency) => { try { return new Intl.NumberFormat(undefined,{style:"currency",currency:currency||"USD",maximumFractionDigits:2}).format(Number(price||0)); } catch { return `${currency||"USD"} ${Number(price||0).toLocaleString()}`; } };
  const dateText = value => value ? new Intl.DateTimeFormat(undefined,{year:"numeric",month:"short",day:"numeric"}).format(new Date(value)) : "";
  const firstImage = item => Array.isArray(item.images) && item.images[0]?.url ? item.images[0].url : "";

  function toast(message, isError=false) { els.toast.textContent=message; els.toast.className=`toast show${isError?" error":""}`; clearTimeout(toast.timer); toast.timer=setTimeout(()=>els.toast.classList.remove("show"),3200); }
  function setView(name) { els.setup.hidden=name!=="setup"; els.login.hidden=name!=="login"; els.claim.hidden=name!=="claim"; els.dashboard.hidden=name!=="dashboard"; }
  function showTab(name) { els.listingsTab.hidden=name!=="listings"; els.settingsTab.hidden=name!=="settings"; els.tabs.forEach(b=>b.classList.toggle("active",b.dataset.adminTab===name)); els.sidebar.classList.remove("open"); }

  async function init() {
    if (!configured) { setView("setup"); return; }
    if (!sdkReady) {
      setView("login");
      els.loginMessage.textContent = "The admin connection library did not load. Refresh once without an ad blocker or privacy extension.";
      return;
    }
    const { data: { session } } = await client.auth.getSession();
    handleSession(session);
    client.auth.onAuthStateChange((_event, sessionValue) => handleSession(sessionValue));
  }

  async function handleSession(session) {
    state.session=session;
    if (!session) { setView("login"); return; }
    const { data, error } = await client.rpc("current_user_is_admin");
    if (error || data !== true) { setView("claim"); return; }
    setView("dashboard");
    els.adminEmail.textContent=session.user.email || "Admin";
    await Promise.all([loadSettings(), loadListings()]);
  }

  async function loadSettings() {
    const { data,error }=await client.from("site_settings").select("*").eq("id",1).maybeSingle();
    if(error){toast(error.message,true);return;}
    state.settings=data||{};
    const brand=data?.brand_name||"Torn Deals";
    document.querySelectorAll("[data-brand-name]").forEach(el=>el.textContent=brand);
    [...els.settingsForm.elements].forEach(field=>{if(field.name && data && Object.prototype.hasOwnProperty.call(data,field.name)) field.value=data[field.name]??"";});
  }

  async function loadListings() {
    const {data,error}=await client.from("listings").select("*").order("updated_at",{ascending:false});
    if(error){toast(error.message,true);return;}
    state.listings=data||[]; renderRows(); renderStats();
  }

  function renderStats(){const count=s=>state.listings.filter(i=>i.status===s).length; els.activeStat.textContent=count("active");els.soldStat.textContent=count("sold");els.draftStat.textContent=count("draft");els.totalStat.textContent=state.listings.length;}

  function renderRows(){
    const q=els.adminSearch.value.trim().toLowerCase(); const status=els.statusFilter.value;
    const items=state.listings.filter(i=>(status==="all"||i.status===status)&&(!q||[i.title,i.game,i.platform,i.region].join(" ").toLowerCase().includes(q)));
    els.rows.innerHTML=""; els.adminEmpty.hidden=items.length!==0;
    items.forEach(item=>{
      const image=firstImage(item); const tr=document.createElement("tr");
      tr.innerHTML=`<td><div class="table-account">${image?`<img src="${escapeHtml(image)}" alt="">`:`<div class="table-placeholder">T</div>`}<div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.platform)} · ${escapeHtml(item.region)}</span></div></div></td><td>${escapeHtml(item.game)}</td><td><strong>${escapeHtml(money(item.price,item.currency))}</strong></td><td><span class="status-chip ${escapeHtml(item.status)}">${escapeHtml(item.status)}</span></td><td>${escapeHtml(dateText(item.updated_at))}</td><td><button class="row-menu" type="button">Edit</button></td>`;
      tr.querySelector(".row-menu").addEventListener("click",()=>openEditor(item)); els.rows.append(tr);
    });
  }

  function resetEditor(){state.current=null;state.existingImages=[];state.pendingFiles=[];state.removedPaths=[];els.form.reset();els.form.elements.currency.value=state.settings?.default_currency||"USD";els.form.elements.status.value="active";els.form.elements.warranty_days.value="0";els.listingMessage.textContent="";els.deleteButton.hidden=true;els.editorTitle.textContent="Add account";renderImagePreviews();}

  function openEditor(item=null){resetEditor(); if(item){state.current=item;els.editorTitle.textContent="Edit account";els.deleteButton.hidden=false;Object.entries(item).forEach(([key,value])=>{const field=els.form.elements[key];if(!field)return;if(field.type==="checkbox")field.checked=Boolean(value);else if(key==="details")field.value=Array.isArray(value)?value.join("\n"):"";else field.value=value??"";});state.existingImages=Array.isArray(item.images)?structuredClone(item.images):[];renderImagePreviews();} els.editor.showModal();}
  function closeEditor(){els.editor.close();resetEditor();}

  function renderImagePreviews(){
    els.imagePreviews.innerHTML="";
    state.existingImages.forEach((image,index)=>{const card=document.createElement("div");card.className="image-preview";card.innerHTML=`<img src="${escapeHtml(image.url)}" alt="Existing photo"><button type="button" aria-label="Remove photo">×</button><span>${index===0?"Cover":"Photo"}</span>`;card.querySelector("button").addEventListener("click",()=>{if(image.path)state.removedPaths.push(image.path);state.existingImages.splice(index,1);renderImagePreviews();});els.imagePreviews.append(card);});
    state.pendingFiles.forEach((entry,index)=>{const card=document.createElement("div");card.className="image-preview pending";card.innerHTML=`<img src="${escapeHtml(entry.preview)}" alt="New photo"><button type="button" aria-label="Remove photo">×</button><span>${state.existingImages.length+index===0?"Cover":"New"}</span>`;card.querySelector("button").addEventListener("click",()=>{URL.revokeObjectURL(entry.preview);state.pendingFiles.splice(index,1);renderImagePreviews();});els.imagePreviews.append(card);});
    if(!state.existingImages.length&&!state.pendingFiles.length)els.imagePreviews.innerHTML=`<div class="no-images">No photos selected</div>`;
  }

  function addFiles(fileList){
    const files=[...fileList]; const remaining=8-state.existingImages.length-state.pendingFiles.length;
    if(files.length>remaining){toast(`You can add ${remaining} more photo${remaining===1?"":"s"}.`,true);return;}
    for(const file of files){if(!["image/jpeg","image/png","image/webp"].includes(file.type)){toast(`${file.name} is not a supported image.`,true);continue;}if(file.size>8*1024*1024){toast(`${file.name} is larger than 8 MB.`,true);continue;}state.pendingFiles.push({file,preview:URL.createObjectURL(file)});}renderImagePreviews();els.imageInput.value="";
  }

  async function compressImage(file){
    if(file.type==="image/webp"&&file.size<1_200_000)return file;
    try{const bitmap=await createImageBitmap(file);const max=1600;const scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement("canvas");canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);canvas.getContext("2d",{alpha:false}).drawImage(bitmap,0,0,canvas.width,canvas.height);const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/webp",0.84));bitmap.close();return new File([blob],`${file.name.replace(/\.[^.]+$/,"")}.webp`,{type:"image/webp"});}catch{return file;}
  }

  async function uploadPending(){
    const uploaded=[];
    for(let i=0;i<state.pendingFiles.length;i++){
      els.listingMessage.textContent=`Uploading photo ${i+1} of ${state.pendingFiles.length}...`;
      const file=await compressImage(state.pendingFiles[i].file);const safe=(file.name||"photo.webp").toLowerCase().replace(/[^a-z0-9._-]+/g,"-");const path=`accounts/${Date.now()}-${crypto.randomUUID()}-${safe}`;
      const {error}=await client.storage.from("listing-images").upload(path,file,{cacheControl:"31536000",upsert:false,contentType:file.type});if(error)throw error;
      const {data}=client.storage.from("listing-images").getPublicUrl(path);uploaded.push({url:data.publicUrl,path});
    }
    return uploaded;
  }

  async function saveListing(event){
    event.preventDefault(); if(!els.form.reportValidity())return;
    els.saveButton.disabled=true;els.listingMessage.textContent="Saving account...";
    try{
      const fd=new FormData(els.form);const uploaded=await uploadPending();const details=String(fd.get("details")||"").split("\n").map(v=>v.trim()).filter(Boolean);
      const payload={title:String(fd.get("title")).trim(),game:String(fd.get("game")).trim(),platform:String(fd.get("platform")).trim(),region:String(fd.get("region")).trim(),account_type:String(fd.get("account_type")||"").trim(),price:Number(fd.get("price")),currency:String(fd.get("currency")),warranty_days:Number(fd.get("warranty_days")||0),status:String(fd.get("status")),short_description:String(fd.get("short_description")).trim(),description:String(fd.get("description")).trim(),details,featured:fd.get("featured")==="on",ownership_verified:fd.get("ownership_verified")==="on",images:[...state.existingImages,...uploaded],updated_at:new Date().toISOString()};
      let result;if(state.current)result=await client.from("listings").update(payload).eq("id",state.current.id);else result=await client.from("listings").insert(payload);
      if(result.error)throw result.error;
      if(state.removedPaths.length){const {error}=await client.storage.from("listing-images").remove(state.removedPaths);if(error)console.warn(error);}
      state.pendingFiles.forEach(entry=>URL.revokeObjectURL(entry.preview));toast(state.current?"Account updated.":"Account added.");closeEditor();await loadListings();
    }catch(error){els.listingMessage.textContent=error.message||"Could not save the account.";toast(error.message||"Could not save the account.",true);}finally{els.saveButton.disabled=false;}
  }

  async function deleteListing(){
    if(!state.current)return; if(!confirm(`Delete “${state.current.title}”? This cannot be undone.`))return;
    els.deleteButton.disabled=true;
    try{const paths=(Array.isArray(state.current.images)?state.current.images:[]).map(i=>i.path).filter(Boolean);const {error}=await client.from("listings").delete().eq("id",state.current.id);if(error)throw error;if(paths.length)await client.storage.from("listing-images").remove(paths);toast("Account deleted.");closeEditor();await loadListings();}catch(error){toast(error.message||"Could not delete the account.",true);}finally{els.deleteButton.disabled=false;}
  }

  async function saveSettings(event){event.preventDefault();const fd=new FormData(els.settingsForm);const payload={id:1,brand_name:String(fd.get("brand_name")).trim(),tagline:String(fd.get("tagline")).trim(),default_currency:String(fd.get("default_currency")),whatsapp_number:String(fd.get("whatsapp_number")||"").replace(/\D/g,""),telegram_username:String(fd.get("telegram_username")||"").replace(/^@/,"").trim(),support_email:String(fd.get("support_email")||"").trim(),instagram_username:String(fd.get("instagram_username")||"").replace(/^@/,"").trim(),announcement:String(fd.get("announcement")||"").trim(),updated_at:new Date().toISOString()};els.settingsMessage.textContent="Saving...";const {error}=await client.from("site_settings").upsert(payload);if(error){els.settingsMessage.textContent=error.message;toast(error.message,true);return;}els.settingsMessage.textContent="Saved.";state.settings=payload;document.querySelectorAll("[data-brand-name]").forEach(el=>el.textContent=payload.brand_name);toast("Site settings saved.");}

  els.loginForm.addEventListener("submit",async e=>{e.preventDefault();els.loginMessage.textContent="Signing in...";const {error}=await client.auth.signInWithPassword({email:els.loginEmail.value.trim(),password:els.loginPassword.value});els.loginMessage.textContent=error?error.message:"";});
  els.createAdmin.addEventListener("click",async()=>{const email=els.loginEmail.value.trim(),password=els.loginPassword.value;if(!email||password.length<6){els.loginMessage.textContent="Enter an email and a password with at least 6 characters.";return;}els.loginMessage.textContent="Creating account...";const redirectBase=(cfg.siteUrl||window.location.origin).replace(/\/$/,"");const {data,error}=await client.auth.signUp({email,password,options:{emailRedirectTo:`${redirectBase}/admin.html`}});if(error){els.loginMessage.textContent=error.message;return;}els.loginMessage.textContent=data.session?"Account created. Enter the setup code.":"Account created. Confirm the email, then return and sign in.";});
  els.claimForm.addEventListener("submit",async e=>{e.preventDefault();els.claimMessage.textContent="Activating...";const {data,error}=await client.rpc("claim_admin",{p_bootstrap_code:els.bootstrapCode.value.trim().toUpperCase()});if(error){els.claimMessage.textContent=error.message;return;}if(data===true){els.claimMessage.textContent="Activated.";await handleSession(state.session);}});
  els.claimLogout.addEventListener("click",()=>client.auth.signOut());
  els.logout.addEventListener("click",()=>client.auth.signOut());els.add.addEventListener("click",()=>openEditor());els.closeEditor.addEventListener("click",closeEditor);els.cancelEditor.addEventListener("click",closeEditor);els.imageInput.addEventListener("change",e=>addFiles(e.target.files));els.form.addEventListener("submit",saveListing);els.deleteButton.addEventListener("click",deleteListing);els.settingsForm.addEventListener("submit",saveSettings);els.adminSearch.addEventListener("input",renderRows);els.statusFilter.addEventListener("change",renderRows);els.tabs.forEach(button=>button.addEventListener("click",()=>showTab(button.dataset.adminTab)));els.sidebarToggle.addEventListener("click",()=>els.sidebar.classList.toggle("open"));els.editor.addEventListener("click",e=>{if(e.target===els.editor)closeEditor();});
  init();
})();