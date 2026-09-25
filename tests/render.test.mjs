// Render smoke tests use a minimal DOM adapter, not a real browser.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
import * as model from '../js/model.js';
import {Store} from '../js/storage.js';
const source=readFileSync(new URL('../js/app.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
function renderRoute(hash,data=model.createSeed()) {
  const nodes=new Map();
  const node=selector=>{if(!nodes.has(selector))nodes.set(selector,{innerHTML:'',textContent:'',hidden:false,className:'',addEventListener(){},focus(){},querySelector(){const match=this.innerHTML.match(/<h1>(.*?)<\/h1>/);return match?{textContent:match[1]}:null;}});return nodes.get(selector);};
  const saved=new Map([[model.STORAGE_KEY,JSON.stringify(data)]]);
  const localStorage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)};
  const context=vm.createContext({...model,Store,structuredClone,console,URL,Date,Intl,setTimeout,clearTimeout,location:{hash},sessionStorage:localStorage,window:{localStorage,addEventListener(){},scrollTo(){}},document:{querySelector:node,addEventListener(){},title:''}});
  vm.runInContext(source,context);return {nodes,context,html:node('#main').innerHTML};
}
test('every major route renders its real content without a runtime exception',()=>{
  for(const [hash,heading] of [['#plan','Το πλάνο μου'],['#calendar','Ημερολόγιο'],['#content','Περιεχόμενο'],['#edit/new','Νέο post'],['#edit/sample-1','Επεξεργασία post'],['#post/sample-1','Η ανάρτηση'],['#approvals','Εγκρίσεις'],['#clients','Πελάτες']]){
    const {html}=renderRoute(hash);assert.ok(html.includes(`<h1>${heading}</h1>`),hash);assert.ok(!html.includes('undefined'),hash);
  }
});
test('user text is escaped in lists, cards, editor and comments',()=>{
  const data=model.createSeed();data.posts[0].title='<img src=x onerror=alert(1)>';data.posts[0].caption='<script>alert(1)</script>';
  data.posts[0].comments[0].body='<script>bad()</script>';
  for(const route of ['#plan','#content','#post/sample-1','#edit/sample-1','#approvals']){
    const {html}=renderRoute(route,data);assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img src=x'));
    assert.ok(html.includes('&lt;img'),route);
  }
});
test('client rendering hides other brands and direct draft routes',()=>{
  const {context,nodes}=renderRoute('#plan');
  vm.runInContext("state.role='client';state.client='nera';render();",context);
  const html=nodes.get('#main').innerHTML;assert.ok(html.includes('Φθινοπωρινή'));assert.ok(!html.includes('Cavo'));assert.ok(!html.includes('Χώροι με χαρακτήρα'));
  vm.runInContext("location.hash='#post/sample-3';render();",context);assert.ok(nodes.get('#main').innerHTML.includes('δεν είναι διαθέσιμη'));
});
test('all built-in assets and module entry files exist in source and build',()=>{
  for(const name of ['index.html','styles.css','js/app.js','js/model.js','js/storage.js','assets/favicon.svg',...model.CLIENTS.map(c=>c.image)]){
    assert.ok(existsSync(new URL('../'+name,import.meta.url)),name);
  }
});
