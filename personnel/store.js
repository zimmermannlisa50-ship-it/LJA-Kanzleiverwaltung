const fs=require('fs'),path=require('path');const DIR=path.join(__dirname,'..','data','personnel'),FILE=path.join(DIR,'state.json');
function read(){if(!fs.existsSync(FILE))return {enabled:false,employees:{},leaves:{},sanctions:{},ads:{},panels:{},lawyers:{},cleared:{}};return JSON.parse(fs.readFileSync(FILE,'utf8'));}
function replace(source,target){for(let attempt=0;;attempt++){try{return fs.renameSync(source,target);}catch(error){if(!['EPERM','EACCES','EBUSY'].includes(error.code)||attempt>=5)throw error;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,40*(attempt+1));}}}
function change(fn){const state=read();const result=fn(state);fs.mkdirSync(DIR,{recursive:true});fs.writeFileSync(FILE+'.tmp',JSON.stringify(state,null,2));replace(FILE+'.tmp',FILE);return result;}
module.exports={read,change,DIR};
