import {CLIENTS,CHANNELS,STATUS,STORAGE_KEY,dateKey,parseDate,upsertPost,reviewPost,addComment,monthDays} from './model.js';
import {Store} from './storage.js';

const $=s=>document.querySelector(s);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={plus:'M12 5v14M5 12h14',chevron:'m9 5 7 7-7 7',left:'m15 5-7 7 7 7',arrow:'M5 12h14m-6-6 6 6-6 6',back:'M19 12H5m6-6-6 6 6 6',calendar:'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z',search:'m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z',send:'m22 2-7 20-4-9-9-4 20-7ZM11 13 22 2',close:'m6 6 12 12M6 18 18 6',check:'m5 12 4 4L19 6',file:'M14 2H4v20h16V8l-6-6Zm0 0v6h6M8 13h8m-8 4h6',image:'M3 3h18v18H3V3Zm0 14 6-6 4 4 3-3 5 5M7 7h.01',trash:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7'};
const icon=(name,cls='')=>`<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.file}"/></svg>`;
let storage;
try {storage=window.localStorage;}catch{storage={getItem(){throw Error();}};}
const store=new Store(storage);
const state={role:'designer',client:'nera',clientFilter:'all',channel:'all',search:'',planTab:'upcoming',contentTab:'all',reviewTab:'review',clientPage:'nera',calendarDate:new Date(),calendarView:'month'};
const main=$('#main');const dialog=$('#dialog');
let activeHash='';let editor=null;let dirty=false;let toastTimer;let dialogHandler=null;let ignoreHash=false;
const client=id=>CLIENTS.find(c=>c.id===id)||CLIENTS[0];
const today=()=>dateKey(new Date());
const monthLabel=d=>new Intl.DateTimeFormat('el-GR',{month:'long',year:'numeric'}).format(d);
const shortDate=(d,time)=>`${new Intl.DateTimeFormat('el-GR',{day:'numeric',month:'short'}).format(parseDate(d))}${time?`, ${time}`:''}`;
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);
const status=p=>`<span class="status ${p.status}"><span class="status-dot" aria-hidden="true">${p.status==='approved'?'✓':''}</span>${STATUS[p.status]}</span>`;
const photo=(p,cls='thumb')=>p.image?`<img class="${cls}" src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy">`:`<span class="${cls} initial" aria-label="Χωρίς εικόνα">${client(p.clientId).initial}</span>`;
const plusButton=()=>state.role==='designer'?`<a class="btn primary" href="#edit/new">${icon('plus')}Νέο post</a>`:'';
function visiblePosts(){return store.data.posts.filter(p=>state.role==='designer'||(p.clientId===state.client && p.status!=='draft'));}
function sorted(posts){return [...posts].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));}
function filtered(posts){const page=location.hash.slice(1).split('/')[0]||'plan';const q=page==='content'?state.search.trim().toLocaleLowerCase('el-GR'):'';return posts.filter(p=>(state.clientFilter==='all'||p.clientId===state.clientFilter)&&(page==='plan'||state.channel==='all'||p.channel===state.channel)&&(!q||`${p.title} ${p.caption} ${client(p.clientId).name}`.toLocaleLowerCase('el-GR').includes(q)));}
function toast(text,error=false){const el=$('#toast');el.textContent=text;el.className=`visible${error?' failure':''}`;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.className='',error?7500:3500);}
function notice(){const el=$('#storage-notice');el.hidden=!store.problem;el.textContent=store.problem;$('#storage-label').textContent=store.readOnly?'Προσωρινή προβολή':'Τοπική αποθήκευση';}
function commit(data,message){try{store.commit(data);if(message)toast(message);return true;}catch(e){toast(e.message,true);return false;}}
function empty(title='Δεν βρέθηκαν αναρτήσεις',text='Δοκίμασε διαφορετικά φίλτρα ή δημιούργησε το πρώτο σου post.',add=false){return `<section class="empty">${icon('file')}<h2>${title}</h2><p>${text}</p>${add?plusButton():''}</section>`;}
function clientFilter(){return state.role==='designer'?`<label class="visually-hidden" for="client-filter">Φίλτρο πελάτη</label><select id="client-filter" data-filter="clientFilter"><option value="all">Όλοι οι πελάτες</option>${CLIENTS.map(c=>`<option value="${c.id}" ${state.clientFilter===c.id?'selected':''}>${c.name}</option>`).join('')}</select>`:'';}
function channelFilter(){return `<label class="visually-hidden" for="channel-filter">Φίλτρο καναλιού</label><select id="channel-filter" data-filter="channel"><option value="all">Όλα τα κανάλια</option>${CHANNELS.map(c=>`<option ${state.channel===c?'selected':''}>${c}</option>`).join('')}</select>`;}
function tabs(items,value,action){return `<div class="tabs" role="group" aria-label="Φίλτρο προβολής">${items.map(([id,label])=>`<button class="tab ${value===id?'active':''}" data-action="${action}" data-value="${id}" aria-pressed="${value===id}">${label}</button>`).join('')}</div>`;}
function postList(posts){if(!posts.length)return empty();return `<div class="post-list"><div class="list-head" aria-hidden="true"><span>ΑΝΑΡΤΗΣΗ</span><span>ΗΜΕΡΟΜΗΝΙΑ</span><span>ΚΑΤΑΣΤΑΣΗ</span></div>${posts.map(p=>`<a class="post-row" href="#post/${encodeURIComponent(p.id)}"><div class="post-info">${photo(p)}<div><h3>${esc(p.title)}</h3><p>${client(p.clientId).name} · ${p.channel}</p></div></div><time class="post-date" datetime="${p.date}T${p.time}">${shortDate(p.date,p.time)}</time>${status(p)}${icon('chevron','muted')}</a>`).join('')}</div>`;}
function heading(title,description='',actions=plusButton()){return `<div class="page-head"><div><h1>${title}</h1>${description?`<p>${description}</p>`:''}</div>${actions?`<div class="actions">${actions}</div>`:''}</div>`;}
function planPage(){
  const all=visiblePosts();let posts=filtered(all);
  if(state.planTab==='upcoming')posts=posts.filter(p=>p.date>=today());
  else if(state.planTab!=='all')posts=posts.filter(p=>p.status===state.planTab);
  const choices=[['upcoming','Επόμενα'],['review',`Προς έγκριση · ${all.filter(p=>p.status==='review').length}`],...(state.role==='designer'?[['draft','Προσχέδια']]:[]),['all','Όλα']];
  return heading('Το πλάνο μου',cap(monthLabel(new Date())))+`<div class="toolbar">${tabs(choices,state.planTab,'plan-tab')}<div class="filters">${clientFilter()}</div></div>${postList(sorted(posts))}<div class="list-foot"><a href="#calendar" class="text-button">Άνοιγμα ημερολογίου ${icon('arrow')}</a><span class="count-text">${posts.length} αναρτήσεις</span></div>`;
}
function contentPage(){let posts=filtered(visiblePosts());if(state.contentTab!=='all')posts=posts.filter(p=>p.status===state.contentTab);return heading('Περιεχόμενο','Όλες οι αναρτήσεις σου')+`<div class="toolbar">${tabs([['all','Όλα'],...(state.role==='designer'?[['draft','Προσχέδια']]:[]),['review','Προς έγκριση'],['changes','Αλλαγές'],['approved','Εγκεκριμένα']],state.contentTab,'content-tab')}<div class="filters"><label class="visually-hidden" for="content-search">Αναζήτηση περιεχομένου</label><input type="search" id="content-search" placeholder="Αναζήτηση…" value="${esc(state.search)}" autocomplete="off">${clientFilter()}${channelFilter()}</div></div><div id="content-results">${contentResults(posts)}</div>`;}
function contentResults(posts){return posts.length?`<div class="grid">${sorted(posts).map(p=>`<a class="content-card" href="#post/${encodeURIComponent(p.id)}">${p.image?photo(p,''): `<div class="social-empty">${icon('image')} Χωρίς εικόνα</div>`}<h3>${esc(p.title)}</h3><p>${client(p.clientId).name} · ${p.channel}</p><div class="card-meta">${status(p)}<time datetime="${p.date}">${shortDate(p.date)}</time></div></a>`).join('')}</div>`:empty();}
function calendarPage(){
  const d=state.calendarDate;let days;
  if(state.calendarView==='month')days=monthDays(d.getFullYear(),d.getMonth());
  else{const start=new Date(d);start.setDate(start.getDate()-(start.getDay()+6)%7);days=Array.from({length:7},(_,i)=>{const next=new Date(start);next.setDate(start.getDate()+i);return next;});}
  const title=state.calendarView==='month'?cap(monthLabel(d)):`${shortDate(dateKey(days[0]))} — ${shortDate(dateKey(days[6]))} ${days[6].getFullYear()}`;
  const posts=sorted(filtered(visiblePosts()));
  const weekdays=['ΔΕΥ','ΤΡΙ','ΤΕΤ','ΠΕΜ','ΠΑΡ','ΣΑΒ','ΚΥΡ'];
  return heading('Ημερολόγιο',title)+`<div class="calendar-toolbar"><div class="actions"><button class="icon-btn" data-action="calendar-prev" aria-label="Προηγούμενη περίοδος">${icon('left')}</button><button class="btn" data-action="calendar-today">Σήμερα</button><button class="icon-btn" data-action="calendar-next" aria-label="Επόμενη περίοδος">${icon('chevron')}</button></div><div class="filters"><div class="segmented" role="group" aria-label="Προβολή ημερολογίου"><button data-action="calendar-view" data-value="month" class="${state.calendarView==='month'?'active':''}" aria-pressed="${state.calendarView==='month'}">Μήνας</button><button data-action="calendar-view" data-value="week" class="${state.calendarView==='week'?'active':''}" aria-pressed="${state.calendarView==='week'}">Εβδομάδα</button></div>${clientFilter()}${channelFilter()}</div></div><div class="calendar-grid ${state.calendarView==='week'?'week-grid':''}">${weekdays.map(w=>`<div class="weekday">${w}</div>`).join('')}${days.map(day=>{
    const key=dateKey(day);const list=posts.filter(p=>p.date===key);return `<section class="calendar-cell ${day.getMonth()!==d.getMonth()?'outside':''} ${key===today()?'today':''}" aria-label="${esc(new Intl.DateTimeFormat('el-GR',{dateStyle:'full'}).format(day))}"><span class="week-mobile-label">${new Intl.DateTimeFormat('el-GR',{weekday:'long'}).format(day)}</span>${state.role==='designer'?`<button class="date-button" data-action="day-new" data-value="${key}" aria-label="Νέο post στις ${shortDate(key)}">${day.getDate()}</button>`:`<span class="date-button">${day.getDate()}</span>`}${list.map(p=>`<a class="cal-post" href="#post/${encodeURIComponent(p.id)}" title="${esc(p.title)} · ${STATUS[p.status]}">${state.calendarView==='week'&&p.image?photo(p,''):''}<span class="status ${p.status}"><span class="status-dot"></span></span><span>${client(p.clientId).name} · ${esc(p.title)}</span>${state.calendarView==='week'?`<time>${p.time}</time>`:''}</a>`).join('')}</section>`;
  }).join('')}</div><div class="list-foot"><a class="text-button" href="#plan">Προβολή λίστας ${icon('arrow')}</a><span class="count-text">Οι ημερομηνίες αφορούν το πλάνο περιεχομένου.</span></div>`;
}
function clientsPage(){const clients=state.role==='client'?[client(state.client)]:CLIENTS;const current=client(state.role==='client'?state.client:state.clientPage);const posts=sorted(visiblePosts().filter(p=>p.clientId===current.id));return heading('Πελάτες','Το περιεχόμενο κάθε brand')+`<div class="tabs client-tabs" role="group" aria-label="Επιλογή πελάτη">${clients.map(c=>`<button class="tab ${c.id===current.id?'active':''}" data-action="client-tab" data-value="${c.id}" aria-pressed="${c.id===current.id}"><span class="initial">${c.initial}</span>${c.name}</button>`).join('')}</div><div class="client-head"><div><h2>${current.name}</h2><p>${current.description}</p></div><button class="text-button" data-action="client-calendar" data-value="${current.id}">Άνοιγμα ημερολογίου ${icon('arrow')}</button></div>${postList(posts)}`;}
function previewMarkup(p){return `<div class="social-preview"><div class="social-head"><span class="initial">${client(p.clientId).initial}</span><strong>${client(p.clientId).name}</strong><span class="muted small">${esc(p.channel)}</span></div>${p.image?`<img src="${esc(p.image)}" class="social-image" alt="Προεπισκόπηση εικόνας ανάρτησης">`:'<div class="social-empty">Πρόσθεσε μια εικόνα</div>'}<p class="social-caption">${esc(p.caption||'Το κείμενό σου θα εμφανίζεται εδώ.')}</p></div>`;}
function editorPage(id){
  if(state.role!=='designer')return empty('Η επεξεργασία γίνεται από τον designer','Άλλαξε ρόλο από τις ρυθμίσεις του demo για να επεξεργαστείς αναρτήσεις.');
  const post=id==='new'?null:store.data.posts.find(p=>p.id===id);if(id!=='new'&&!post)return notFound();
  editor=post?structuredClone(post):{id:'',title:'',clientId:state.clientFilter==='all'?'nera':state.clientFilter,channel:'Instagram',date:sessionNewDate||today(),time:'10:00',caption:'',image:'',status:'draft'};sessionNewDate='';
  const p=editor;
  return `<a class="back" href="#content">${icon('back')}Περιεχόμενο</a><form id="post-form">${heading(post?'Επεξεργασία post':'Νέο post','',`<button class="btn" type="submit" name="mode" value="draft">Αποθήκευση</button><button class="btn primary" type="submit" name="mode" value="review">Για έγκριση</button>`)}<div class="editor-layout"><section aria-label="Στοιχεία ανάρτησης"><label class="field">Τίτλος<input name="title" required maxlength="120" value="${esc(p.title)}" placeholder="Δώσε έναν τίτλο στην ανάρτηση"></label><div class="field-pair"><label class="field">Πελάτης<select name="clientId">${CLIENTS.map(c=>`<option value="${c.id}" ${p.clientId===c.id?'selected':''}>${c.name}</option>`).join('')}</select></label><label class="field">Κανάλι<select name="channel">${CHANNELS.map(c=>`<option ${p.channel===c?'selected':''}>${c}</option>`).join('')}</select></label></div><label class="field">Κείμενο<textarea name="caption" maxlength="5000" rows="5" placeholder="Τι θέλεις να πεις με αυτό το post;">${esc(p.caption)}</textarea><small id="caption-count">${p.caption.length} / 5.000 χαρακτήρες</small></label><div class="field-pair"><label class="field">Ημερομηνία<input type="date" name="date" required min="2000-01-01" max="2100-12-31" value="${p.date}"></label><label class="field">Ώρα<input type="time" name="time" required value="${p.time}"></label></div><div class="field"><span>Εικόνα</span><div id="image-current">${imageCurrent(p)}</div><label for="image-upload" class="visually-hidden">Ανέβασμα εικόνας</label><input id="image-upload" type="file" accept="image/jpeg,image/png,image/webp"><small>JPG, PNG ή WebP έως 8 MB. Αποθηκεύεται μόνο στον browser σου.</small></div><p class="form-note">Η ημερομηνία οργανώνει το πλάνο σου. Δεν γίνεται αυτόματη δημοσίευση στα social.${post?.status==='approved'?' Η αλλαγή εγκεκριμένου περιεχομένου απαιτεί νέα έγκριση.':''}</p><p class="error" id="form-error" role="alert"></p>${post?`<div class="delete-area"><button class="text-button neutral" type="button" data-action="delete-post" data-id="${esc(post.id)}">${icon('trash')}Διαγραφή ανάρτησης</button></div>`:''}</section><aside class="preview-column"><h2>Προεπισκόπηση</h2><div id="preview">${previewMarkup(p)}</div></aside></div></form>`;
}
function imageCurrent(p){return `<div class="upload-current">${p.image?photo(p):''}<div class="upload-actions"><button type="button" class="text-button neutral" data-action="sample-image">Χρήση εικόνας demo</button>${p.image?'<button type="button" class="text-button neutral" data-action="remove-image">Αφαίρεση</button>':''}</div></div>`;}
function getPost(id){return visiblePosts().find(p=>p.id===id);}
function notFound(){return empty('Η ανάρτηση δεν είναι διαθέσιμη','Μπορεί να έχει διαγραφεί ή να μην είναι ορατή στον επιλεγμένο ρόλο.')+'<a href="#plan" class="text-button">Επιστροφή στο πλάνο</a>';}
function commentsMarkup(p){return `<section class="comments" aria-label="Σχόλια"><h2>Σχόλια <span class="count-text">${p.comments.length||''}</span></h2><div class="comment-list">${p.comments.length?p.comments.map(c=>`<article class="comment"><span class="initial">${c.role==='designer'?'Μ':'Π'}</span><div class="comment-body"><div class="comment-head"><strong>${esc(c.author)}</strong><time datetime="${esc(c.at)}">${new Intl.DateTimeFormat('el-GR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(c.at))}</time></div><p>${esc(c.body)}</p></div></article>`).join(''):'<p class="empty-inline">Δεν υπάρχουν ακόμη σχόλια. Ξεκίνα τη συζήτηση.</p>'}</div><form class="comment-compose" data-post-id="${esc(p.id)}"><label class="visually-hidden" for="comment-input">Το σχόλιό σου</label><textarea id="comment-input" name="comment" required maxlength="2000" placeholder="Γράψε ένα σχόλιο…"></textarea><div class="actions"><button class="text-button" type="submit">Αποστολή ${icon('send')}</button></div></form>${reviewActions(p)}</section>`;}
function reviewActions(p){if(state.role==='client'&&p.status==='review')return `<div class="review-actions"><button class="btn primary" data-action="approve" data-id="${esc(p.id)}">${icon('check')}Έγκριση</button><button class="btn" data-action="request-changes" data-id="${esc(p.id)}">Ζήτηση αλλαγών</button></div>`;
  if(state.role==='designer'&&p.status==='review')return `<div class="review-actions"><button class="btn" data-action="preview-client" data-id="${esc(p.id)}">Δοκιμή ως πελάτης ${icon('arrow')}</button></div><p class="approve-note">Προσομοίωση έγκρισης στον ίδιο browser.</p>`;
  if(p.status==='changes'&&state.role==='designer')return `<div class="review-actions"><a class="btn primary" href="#edit/${encodeURIComponent(p.id)}">Επεξεργασία αλλαγών</a></div>`;
  return `<p class="approve-note">${p.status==='approved'?'Η ανάρτηση έχει εγκριθεί.':p.status==='draft'?'Το προσχέδιο δεν εμφανίζεται στην προβολή πελάτη.':'Ο designer μπορεί τώρα να επεξεργαστεί το post και να το στείλει ξανά.'}</p>`;
}
function postBody(p){return `<div class="review-layout"><article class="review-post"><div class="detail-meta"><span class="initial">${client(p.clientId).initial}</span><span class="small">${client(p.clientId).name} · ${p.channel}</span>${status(p)}</div>${p.image?photo(p,'social-image'):'<div class="social-empty">Χωρίς εικόνα</div>'}<h2>${esc(p.title)}</h2><p class="caption">${esc(p.caption||'Δεν έχει προστεθεί κείμενο.')}</p><time class="muted small" datetime="${p.date}T${p.time}">${shortDate(p.date,p.time)}</time></article>${commentsMarkup(p)}</div>`;}
function detailPage(id){const p=getPost(id);if(!p)return notFound();return `<a href="#content" class="back">${icon('back')}Περιεχόμενο</a>${heading('Η ανάρτηση','',state.role==='designer'?`<a class="btn" href="#edit/${encodeURIComponent(p.id)}">Επεξεργασία</a>`:'')}${postBody(p)}`;}
function approvalsPage(selectedId){const all=visiblePosts().filter(p=>p.status!=='draft');const posts=sorted(all.filter(p=>state.reviewTab==='all'||p.status===state.reviewTab));const selected=posts.find(p=>p.id===selectedId)||posts[0];return heading('Εγκρίσεις',`${all.filter(p=>p.status==='review').length} αναρτήσεις περιμένουν απάντηση`,'')+`<div class="toolbar">${tabs([['review','Προς έγκριση'],['changes','Αλλαγές'],['approved','Εγκεκριμένα'],['all','Όλα']],state.reviewTab,'review-tab')}</div>${selected?`<div class="review-picker"><label for="review-select" class="small muted">Ανάρτηση</label><select id="review-select">${posts.map(p=>`<option value="${esc(p.id)}" ${p.id===selected.id?'selected':''}>${client(p.clientId).name} · ${esc(p.title)}</option>`).join('')}</select></div>${postBody(selected)}`:empty('Όλα σε τάξη',state.reviewTab==='review'?'Δεν υπάρχουν αναρτήσεις που περιμένουν έγκριση.':'Δεν υπάρχουν αναρτήσεις σε αυτή την κατάσταση.')}`;}
let sessionNewDate='';
function render({focus=false}={}){
  const [page='plan',rawId='']=location.hash.slice(1).split('/');let id;try{id=decodeURIComponent(rawId);}catch{id='';}
  const nav=page==='calendar'?'plan':['edit','post'].includes(page)?'content':page;
  $('#nav').innerHTML=[['plan','Πλάνο'],['content','Περιεχόμενο'],['approvals','Εγκρίσεις'],['clients','Πελάτες']].map(([key,label])=>`<a href="#${key}" class="${nav===key?'active':''}" ${nav===key?'aria-current="page"':''}>${label}</a>`).join('');
  $('#role-bar').innerHTML=state.role==='client'?`<span>Προβολή πελάτη <span class="muted">· Προσομοίωση</span></span><label>Brand <select id="role-client">${CLIENTS.map(c=>`<option value="${c.id}" ${c.id===state.client?'selected':''}>${c.name}</option>`).join('')}</select></label><button class="text-button" data-action="designer">Επιστροφή στον designer</button>`:'';
  $('#demo-settings').textContent=state.role==='client'?'Π':'Μ';
  editor=null;dirty=false;
  const views={plan:planPage,calendar:calendarPage,content:contentPage,clients:clientsPage,edit:()=>editorPage(id),post:()=>detailPage(id),approvals:()=>approvalsPage(id)};
  main.innerHTML=(views[page]||(()=>empty('Η σελίδα δεν βρέθηκε','Επίστρεψε στο πλάνο σου.')+'<a class="text-button" href="#plan">Το πλάνο μου</a>'))();
  document.title=`${main.querySelector('h1')?.textContent||'Calendrai'} · Calendrai`;
  activeHash=location.hash||'#plan';notice();if(focus)main.focus({preventScroll:true});
}
function navigate(hash){if(location.hash===hash)render();else location.hash=hash;}
function openDialog(html,handler){if(dialog.open)dialog.close();dialog.innerHTML=html;dialogHandler=handler;dialog.showModal();}
function confirmAction(title,message,label,fn){openDialog(`<h2 id="dialog-title">${title}</h2><p>${message}</p><div class="actions"><button class="btn" data-dialog="cancel" autofocus>Ακύρωση</button><button class="btn primary" data-dialog="confirm">${label}</button></div>`,action=>{if(action==='confirm'){dialog.close();fn();}else if(action==='cancel')dialog.close();});}
function settings(){if(dirty){confirmAction('Μη αποθηκευμένες αλλαγές','Θέλεις να αφήσεις τις αλλαγές και να ανοίξεις τις ρυθμίσεις;','Συνέχεια',()=>{dirty=false;render();settings();});return;}
  openDialog(`<button class="menu-close" data-dialog="cancel" aria-label="Κλείσιμο">${icon('close')}</button><h2 id="dialog-title">Το demo σου</h2><p>Δοκίμασε τη συνεργασία designer και πελάτη. Οι ρόλοι είναι προσομοίωση, χωρίς πραγματικούς λογαριασμούς.</p><label class="field">Ρόλος<select id="settings-role"><option value="designer" ${state.role==='designer'?'selected':''}>Designer — Μαρία</option><option value="client" ${state.role==='client'?'selected':''}>Πελάτης</option></select></label><label class="field">Πελάτης για προσομοίωση<select id="settings-client">${CLIENTS.map(c=>`<option value="${c.id}" ${state.client===c.id?'selected':''}>${c.name}</option>`).join('')}</select></label><div class="actions"><button class="btn primary" data-dialog="apply">Εφαρμογή</button></div><div class="settings-divider"><h3>Αποθήκευση σε αυτή τη συσκευή</h3><p class="small">Τα posts και οι εικόνες μένουν στον συγκεκριμένο browser. Δεν συγχρονίζονται μεταξύ συσκευών. Δεν στέλνονται emails και δεν γίνεται δημοσίευση στα social.</p><button class="text-button neutral" data-dialog="reset">Επαναφορά demo</button></div>`,action=>{
    if(action==='cancel')dialog.close();
    if(action==='apply'){state.role=$('#settings-role').value;state.client=$('#settings-client').value;state.clientFilter='all';state.channel='all';state.search='';state.planTab='upcoming';state.contentTab='all';state.reviewTab='review';dialog.close();navigate('#plan');render();toast(state.role==='client'?'Βλέπεις το demo ως πελάτης.':'Βλέπεις το demo ως designer.');}
    if(action==='reset'){dialog.close();confirmAction('Επαναφορά demo;','Θα αφαιρεθούν τα δικά σου posts, σχόλια και εικόνες από αυτόν τον browser και θα φορτωθούν ξανά τα δείγματα.','Επαναφορά',()=>{try{store.reset();dirty=false;state.clientFilter='all';state.channel='all';state.search='';state.contentTab='all';state.planTab='upcoming';navigate('#plan');render();toast('Το demo επανήλθε στα αρχικά δείγματα.');}catch(e){toast(e.message,true);}});}
  });
}
dialog.addEventListener('click',e=>{const action=e.target.closest('[data-dialog]')?.dataset.dialog;if(action)dialogHandler?.(action);});
document.addEventListener('click',e=>{
  const link=e.target.closest('a[href^="#"]');
  if(link&&link.getAttribute('href')==='#main'){e.preventDefault();main.focus();return;}
  if(link&&dirty){e.preventDefault();const target=link.getAttribute('href');confirmAction('Να φύγεις από την επεξεργασία;','Οι μη αποθηκευμένες αλλαγές θα χαθούν.','Έξοδος',()=>{dirty=false;navigate(target);});return;}
  const button=e.target.closest('[data-action]');if(!button)return;const {action,value,id}=button.dataset;
  if(action==='settings'){settings();return;}
  if(action==='plan-tab'){state.planTab=value;render();}
  if(action==='content-tab'){state.contentTab=value;render();}
  if(action==='review-tab'){state.reviewTab=value;render();}
  if(action==='client-tab'){state.clientPage=value;render();}
  if(action==='client-calendar'){state.clientFilter=value;state.channel='all';state.search='';navigate('#calendar');}
  if(action==='calendar-view'){state.calendarView=value;render();}
  if(action==='calendar-today'){state.calendarDate=new Date();render();}
  if(action==='calendar-prev'||action==='calendar-next'){
    const delta=action==='calendar-prev'?-1:1;const d=new Date(state.calendarDate);
    if(state.calendarView==='week')d.setDate(d.getDate()+delta*7);else{d.setDate(1);d.setMonth(d.getMonth()+delta);}state.calendarDate=d;render();
  }
  if(action==='day-new'){sessionNewDate=value;navigate('#edit/new');}
  if(action==='sample-image'&&editor){readEditor();editor.image=client(editor.clientId).image;updateEditorImage();}
  if(action==='remove-image'&&editor){editor.image='';updateEditorImage();}
  if(action==='delete-post'&&state.role==='designer')confirmAction('Διαγραφή ανάρτησης;','Θα διαγραφούν η ανάρτηση και όλα τα σχόλιά της από αυτό το demo.','Διαγραφή',()=>{if(commit({...store.data,posts:store.data.posts.filter(p=>p.id!==id)},'Η ανάρτηση διαγράφηκε.')){dirty=false;navigate('#content');}});
  if(action==='preview-client'){const p=getPost(id);if(p){state.role='client';state.client=p.clientId;state.clientFilter='all';render();toast('Προσομοίωση προβολής πελάτη.');}}
  if(action==='designer'){state.role='designer';render();toast('Επιστροφή στον designer.');}
  if(action==='approve'&&state.role==='client'){try{if(commit(reviewPost(store.data,id,'approve',state.client),'Το post εγκρίθηκε.'))render();}catch(err){toast(err.message,true);}}
  if(action==='request-changes'&&state.role==='client')openDialog(`<h2 id="dialog-title">Τι θέλεις να αλλάξει;</h2><p>Το σχόλιό σου θα εμφανιστεί δίπλα στο post.</p><label class="field">Αλλαγές<textarea id="change-reason" maxlength="2000" placeholder="Περιέγραψε τις αλλαγές…" autofocus></textarea></label><p id="change-error" class="error" role="alert"></p><div class="actions"><button class="btn" data-dialog="cancel">Ακύρωση</button><button class="btn primary" data-dialog="send">Αποστολή αλλαγών</button></div>`,a=>{if(a==='cancel')dialog.close();if(a==='send'){try{const next=reviewPost(store.data,id,'changes',state.client,$('#change-reason').value);if(commit(next,'Το αίτημα αλλαγών αποθηκεύτηκε.')){dialog.close();render();}}catch(err){$('#change-error').textContent=err.message;}}});
});
$('#demo-settings').addEventListener('click',settings);
document.addEventListener('change',async e=>{
  if(e.target.dataset.filter){state[e.target.dataset.filter]=e.target.value;render();}
  if(e.target.id==='role-client'){state.client=e.target.value;render();}
  if(e.target.id==='review-select')navigate(`#approvals/${encodeURIComponent(e.target.value)}`);
  if(e.target.id==='image-upload'){
    const file=e.target.files[0];if(!file)return;const currentEditor=editor;
    const submitters=[...document.querySelectorAll('#post-form button[type=submit]')];submitters.forEach(b=>b.disabled=true);$('#form-error').textContent='Προετοιμασία εικόνας…';
    try{const image=await resizeImage(file);if(editor!==currentEditor)return;editor.image=image;updateEditorImage();$('#form-error').textContent='';}
    catch(err){if(editor===currentEditor)$('#form-error').textContent=err.message;}
    finally{submitters.forEach(b=>b.disabled=false);e.target.value='';}
  }
});
document.addEventListener('input',e=>{
  if(e.target.id==='content-search'){state.search=e.target.value;let posts=filtered(visiblePosts());if(state.contentTab!=='all')posts=posts.filter(p=>p.status===state.contentTab);$('#content-results').innerHTML=contentResults(posts);}
  if(e.target.closest('#post-form')&&editor){readEditor();dirty=true;$('#preview').innerHTML=previewMarkup(editor);$('#caption-count').textContent=`${editor.caption.length} / 5.000 χαρακτήρες`;}
});
function readEditor(){const f=$('#post-form');if(!f||!editor)return;for(const key of ['title','clientId','channel','caption','date','time'])editor[key]=f.elements[key].value;}
function updateEditorImage(){dirty=true;$('#image-current').innerHTML=imageCurrent(editor);$('#preview').innerHTML=previewMarkup(editor);}
function resizeImage(file){return new Promise((resolve,reject)=>{
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))return reject(Error('Επίλεξε εικόνα JPG, PNG ή WebP.'));
  if(file.size>8*1024*1024)return reject(Error('Η εικόνα είναι μεγαλύτερη από 8 MB. Επίλεξε μικρότερο αρχείο.'));
  const url=URL.createObjectURL(file);const img=new Image();img.onload=()=>{URL.revokeObjectURL(url);try{const scale=Math.min(1,1000/Math.max(img.width,img.height));const canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);const data=canvas.toDataURL('image/jpeg',.8);if(data.length>1200000)throw Error('Η εικόνα παραμένει πολύ μεγάλη. Δοκίμασε μια μικρότερη έκδοση.');resolve(data);}catch(err){reject(err);}};img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Η εικόνα δεν μπορεί να διαβαστεί. Δοκίμασε άλλο αρχείο.'));};img.src=url;
});}
document.addEventListener('submit',e=>{
  if(e.target.id==='post-form'){e.preventDefault();readEditor();try{const mode=e.submitter?.value||'draft';const next=upsertPost(store.data,editor,mode);if(commit(next,mode==='review'?'Το post είναι έτοιμο για έγκριση.':'Το προσχέδιο αποθηκεύτηκε.')){dirty=false;state.contentTab='all';state.search='';state.clientFilter='all';state.channel='all';navigate('#content');}}catch(err){$('#form-error').textContent=err.message;$('#form-error').scrollIntoView({block:'nearest'});}}
  if(e.target.classList.contains('comment-compose')){e.preventDefault();try{const next=addComment(store.data,e.target.dataset.postId,e.target.elements.comment.value,state.role,state.client);if(commit(next,'Το σχόλιο αποθηκεύτηκε.'))render();}catch(err){toast(err.message,true);}}
});
window.addEventListener('hashchange',()=>{
  if(ignoreHash){ignoreHash=false;return;}
  if(dirty){const next=location.hash;ignoreHash=true;location.hash=activeHash;confirmAction('Μη αποθηκευμένες αλλαγές','Θέλεις να φύγεις από την επεξεργασία; Οι αλλαγές θα χαθούν.','Έξοδος',()=>{dirty=false;navigate(next);});return;}
  render({focus:true});window.scrollTo(0,0);
});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
window.addEventListener('storage',e=>{if(e.key===STORAGE_KEY){store.readOnly=true;store.problem='Τα δεδομένα άλλαξαν σε άλλη καρτέλα. Ανανέωσε αυτή τη σελίδα για να συνεχίσεις με την τελευταία έκδοση.';notice();}});
document.addEventListener('error',e=>{if(e.target.tagName==='IMG'&&e.target.src&&!e.target.dataset.failed){e.target.dataset.failed='true';e.target.removeAttribute('src');e.target.alt='Η εικόνα δεν είναι διαθέσιμη';}},true);
render();
