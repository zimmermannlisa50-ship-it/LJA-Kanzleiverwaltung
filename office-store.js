const fs=require('node:fs'),path=require('node:path');
const file=path.join(__dirname,'data','public-office.json');
function read(){return fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};}
function change(fn){const state=read(),result=fn(state);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify(state,null,2));fs.renameSync(file+'.tmp',file);return result;}
module.exports={read,change};
