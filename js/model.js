/** Pure data operations; the view and storage are kept separate. */
export const STORAGE_KEY = 'calendrai.demo.v1';
export const CLIENTS = [
  {id:'nera',name:'Nera',description:'Περιποίηση δέρματος',initial:'N',image:'assets/nera.png'},
  {id:'cavo',name:'Cavo',description:'Καφές και μικρές καθημερινές στιγμές',initial:'C',image:'assets/cavo.png'},
  {id:'vela',name:'Vela',description:'Αρχιτεκτονική και σχεδιασμός',initial:'V',image:'assets/vela.png'}
];
export const CHANNELS = ['Instagram','Facebook','LinkedIn'];
export const STATUS = {draft:'Προσχέδιο',review:'Προς έγκριση',changes:'Ζητήθηκαν αλλαγές',approved:'Εγκεκριμένο'};
export const uid = () => globalThis.crypto?.randomUUID?.() || `p-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function dateKey(date) {return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function parseDate(value) {const [y,m,d]=value.split('-').map(Number);return new Date(y,m-1,d,12);}
export function validDate(value) {return typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && dateKey(parseDate(value))===value && +value.slice(0,4)>=2000 && +value.slice(0,4)<=2100;}
export function safeImage(value) {return value==='' || CLIENTS.some(c=>c.image===value) || (typeof value==='string' && value.length<1800000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value));}
export function createSeed(now=new Date()) {
  const d=n=>{const next=new Date(now);next.setDate(next.getDate()+n);return dateKey(next);};
  const definitions=[
    ['nera','Φθινοπωρινή φροντίδα','Instagram',1,'10:00','review','Η καθημερινή σου φροντίδα ξεκινά με μικρές στιγμές. Ανακάλυψε τη νέα μας σειρά και βρες τη δική σου ρουτίνα.\n\n#Nera #skincare'],
    ['cavo','Η μικρή σου παύση','Instagram',1,'13:00','approved','Ένας καλός καφές και λίγος χρόνος για σένα. Σε περιμένουμε στο αγαπημένο σου τραπέζι.\n\n#Cavo #coffeetime'],
    ['vela','Χώροι με χαρακτήρα','LinkedIn',2,'17:00','draft','Φως, υλικά και απλές γραμμές. Μια ματιά στο τελευταίο μας έργο.'],
    ['nera','Η νέα συλλογή','Facebook',3,'10:00','review','Νέα υφή, ίδια αγάπη για την καθημερινή φροντίδα. Γνώρισε τη νέα συλλογή της Nera.'],
    ['cavo','Το νέο μας μενού','Instagram',4,'12:00','draft','Αγαπημένες γεύσεις, καινούργιες ιδέες. Το νέο μας μενού έρχεται σύντομα.'],
    ['vela','Η ιστορία του brand','Instagram',5,'18:30','changes','Κάθε χώρος ξεκινά με μια ιστορία. Αυτή είναι η δική μας.'],
    ['nera','Μικρές στιγμές φροντίδας','Instagram',7,'10:00','approved','Αφιέρωσε λίγα λεπτά στην πιο απλή στιγμή της ημέρας: τη φροντίδα σου.'],
    ['cavo','Το πρωινό ξεκινά εδώ','Facebook',8,'09:00','draft','Φρέσκος καφές, κάτι γλυκό και η μέρα μόλις έγινε καλύτερη.']
  ];
  return {version:1,posts:definitions.map(([clientId,title,channel,offset,time,status,caption],i)=>({id:`sample-${i+1}`,clientId,title,channel,date:d(offset),time,status,caption,image:CLIENTS.find(c=>c.id===clientId).image,updatedAt:now.toISOString(),comments:i===0?[{id:'comment-1',author:'Μαρία',role:'designer',body:'Πρόσθεσα το νέο κείμενο. Πώς σου φαίνεται;',at:now.toISOString()}]:i===5?[{id:'comment-2',author:'Πελάτης · Vela',role:'client',body:'Μπορούμε να δώσουμε περισσότερη έμφαση στα υλικά;',at:now.toISOString()}]:[]}))};
}
export function validatePost(post) {
  if(!post || typeof post!=='object') throw new Error('Μη έγκυρη ανάρτηση.');
  if(typeof post.title!=='string'||!post.title.trim()||post.title.length>120) throw new Error('Γράψε έναν τίτλο έως 120 χαρακτήρες.');
  if(!CLIENTS.some(c=>c.id===post.clientId)) throw new Error('Επίλεξε πελάτη.');
  if(!CHANNELS.includes(post.channel)) throw new Error('Επίλεξε έγκυρο κανάλι.');
  if(!validDate(post.date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(post.time)) throw new Error('Έλεγξε την ημερομηνία (2000–2100) και την ώρα.');
  if(!Object.hasOwn(STATUS,post.status)) throw new Error('Μη έγκυρη κατάσταση.');
  if(typeof post.caption!=='string'||post.caption.length>5000) throw new Error('Το κείμενο πρέπει να έχει έως 5.000 χαρακτήρες.');
  if(!safeImage(post.image)) throw new Error('Μη έγκυρη εικόνα.');
  if(typeof post.id!=='string'||!post.id||post.id.length>150) throw new Error('Μη έγκυρος κωδικός ανάρτησης.');
  if(!Array.isArray(post.comments)||post.comments.length>1000) throw new Error('Μη έγκυρα σχόλια.');
  for(const c of post.comments) if(!c || typeof c.id!=='string' || typeof c.author!=='string' || c.author.length>100 || !['designer','client'].includes(c.role) || typeof c.body!=='string' || !c.body.trim() || c.body.length>2000 || !Number.isFinite(Date.parse(c.at))) throw new Error('Μη έγκυρο σχόλιο.');
  return post;
}
export function validateData(data) {
  if(!data||data.version!==1||!Array.isArray(data.posts)||data.posts.length>1000) throw new Error('Μη αναγνωρίσιμα δεδομένα.');
  const ids=new Set();
  data.posts.forEach(p=>{validatePost(p);if(ids.has(p.id))throw new Error('Διπλότυπη ανάρτηση.');ids.add(p.id);});return data;
}
export function upsertPost(data, values, mode='draft') {
  if(!['draft','review'].includes(mode)) throw new Error('Μη έγκυρη ενέργεια.');
  const prior=data.posts.find(p=>p.id===values.id);
  const next={...values,id:prior?.id||uid(),title:values.title.trim(),caption:values.caption.trim(),status:mode,comments:prior?.comments||[],updatedAt:new Date().toISOString()};
  validatePost(next);
  if(mode==='review' && !next.caption) throw new Error('Πρόσθεσε κείμενο πριν στείλεις το post για έγκριση.');
  return {...data,posts:prior?data.posts.map(p=>p.id===next.id?next:p):[...data.posts,next]};
}
export function addComment(data,id,body,role,clientId) {
  const post=data.posts.find(p=>p.id===id); if(!post) throw new Error('Η ανάρτηση δεν βρέθηκε.');
  if(role==='client' && (post.clientId!==clientId || post.status==='draft')) throw new Error('Αυτή η ανάρτηση δεν είναι διαθέσιμη στην προβολή πελάτη.');
  const trimmed=body.trim();if(!trimmed||trimmed.length>2000) throw new Error('Γράψε ένα σχόλιο έως 2.000 χαρακτήρες.');
  const c={id:uid(),author:role==='client'?`Πελάτης · ${CLIENTS.find(c=>c.id===post.clientId).name}`:'Μαρία',role,body:trimmed,at:new Date().toISOString()};
  return {...data,posts:data.posts.map(p=>p.id===id?{...p,comments:[...p.comments,c]}:p)};
}
export function reviewPost(data,id,action,clientId,reason='') {
  const post=data.posts.find(p=>p.id===id);
  if(!post||post.clientId!==clientId||post.status!=='review'||!['approve','changes'].includes(action)) throw new Error('Αυτή η ανάρτηση δεν μπορεί να ελεγχθεί τώρα.');
  if(action==='changes'&&!reason.trim()) throw new Error('Γράψε τι θέλεις να αλλάξει.');
  let updated=action==='changes'?addComment(data,id,reason,'client',clientId):data;
  return {...updated,posts:updated.posts.map(p=>p.id===id?{...p,status:action==='approve'?'approved':'changes',updatedAt:new Date().toISOString()}:p)};
}
export function monthDays(year,month) {
  const start=new Date(year,month,1,12);const offset=(start.getDay()+6)%7;start.setDate(start.getDate()-offset);
  const count=Math.ceil((offset+new Date(year,month+1,0).getDate())/7)*7;
  return Array.from({length:count},(_,i)=>{const d=new Date(start);d.setDate(d.getDate()+i);return d;});
}
