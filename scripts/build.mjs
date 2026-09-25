import {mkdir,cp} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);const output=new URL('dist/',root);await mkdir(output,{recursive:true});
for(const name of ['index.html','styles.css','js','assets','_headers'])await cp(new URL(name,root),new URL(name,output),{recursive:true});
console.log(`Static build ready: ${fileURLToPath(output)}`);
