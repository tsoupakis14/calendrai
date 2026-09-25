import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSeed,upsertPost,reviewPost,addComment,validateData,validDate,monthDays,dateKey,STORAGE_KEY} from '../js/model.js';
import {Store} from '../js/storage.js';

test('draft → review → requested changes → review → approval; edit requires new approval',()=>{
  let data=createSeed(new Date(2026,8,24));const draft=data.posts.find(p=>p.status==='draft');
  data=upsertPost(data,draft,'review');
  data=reviewPost(data,draft.id,'changes',draft.clientId,'Μικρότερος τίτλος.');
  assert.equal(data.posts.find(p=>p.id===draft.id).status,'changes');
  assert.equal(data.posts.find(p=>p.id===draft.id).comments.at(-1).body,'Μικρότερος τίτλος.');
  data=upsertPost(data,{...data.posts.find(p=>p.id===draft.id),title:'Νέος τίτλος'},'review');
  data=reviewPost(data,draft.id,'approve',draft.clientId);
  assert.equal(data.posts.find(p=>p.id===draft.id).status,'approved');
  data=upsertPost(data,{...data.posts.find(p=>p.id===draft.id),caption:'Νέο περιεχόμενο'},'draft');
  assert.equal(data.posts.find(p=>p.id===draft.id).status,'draft');
});
test('wrong-client approvals, draft approvals, and blank revision requests are rejected',()=>{
  const data=createSeed();const p=data.posts[0];
  assert.throws(()=>reviewPost(data,p.id,'approve','cavo'));
  assert.throws(()=>reviewPost(data,'sample-3','approve','vela'));
  assert.throws(()=>reviewPost(data,p.id,'changes',p.clientId,'  '));
  assert.throws(()=>addComment(data,'sample-3','Hidden draft comment','client','vela'));
  assert.throws(()=>addComment(data,p.id,'Other client comment','client','cavo'));
});
test('new drafts get unique IDs; review requires a caption',()=>{
  const data=createSeed();const values={...data.posts[0],id:'',caption:''};
  const next=upsertPost(data,values,'draft');assert.equal(next.posts.length,data.posts.length+1);
  assert.notEqual(next.posts.at(-1).id,'');assert.equal(next.posts.at(-1).comments.length,0);
  assert.throws(()=>upsertPost(data,values,'review'));
});
test('calendar starts Monday, handles leap years and year boundaries',()=>{
  for(const [year,month] of [[2026,8],[2024,1],[2026,11],[2027,0]]){
    const days=monthDays(year,month);assert.equal(days[0].getDay(),1);assert.equal(days.at(-1).getDay(),0);
    assert.equal(days.filter(d=>d.getMonth()===month).length,new Date(year,month+1,0).getDate());
  }
  assert.equal(validDate('2025-02-29'),false);assert.equal(validDate('2024-02-29'),true);
  assert.equal(dateKey(new Date(2026,0,2)),'2026-01-02');
});
test('untrusted image URLs, malformed dates and duplicate IDs are rejected',()=>{
  const data=createSeed();assert.throws(()=>validateData({...data,posts:[{...data.posts[0],image:'javascript:alert(1)'}]}));
  assert.throws(()=>validateData({...data,posts:[data.posts[0],data.posts[0]]}));
  assert.throws(()=>validateData({...data,posts:[{...data.posts[0],date:'2026-02-31'}]}));
});
test('storage survives reload and quota failure does not mutate committed data',()=>{
  const mem=new Map();let full=false;const storage={getItem:k=>mem.get(k)||null,setItem(k,v){if(full)throw Error('quota');mem.set(k,v);}};
  const first=new Store(storage);first.commit(upsertPost(first.data,{...first.data.posts[0],title:'Saved title'},'draft'));
  const reloaded=new Store(storage);assert.equal(reloaded.data.posts[0].title,'Saved title');
  full=true;assert.throws(()=>reloaded.commit({...reloaded.data,posts:[]}));assert.ok(reloaded.data.posts.length>0);
});
test('corrupt saved data is preserved until explicit reset',()=>{
  const mem=new Map([[STORAGE_KEY,'bad json']]);const storage={getItem:k=>mem.get(k),setItem:(k,v)=>mem.set(k,v)};
  const store=new Store(storage);assert.equal(store.readOnly,true);assert.equal(mem.get(STORAGE_KEY),'bad json');
  assert.throws(()=>store.commit(createSeed()));store.reset();assert.equal(store.readOnly,false);validateData(JSON.parse(mem.get(STORAGE_KEY)));
});
