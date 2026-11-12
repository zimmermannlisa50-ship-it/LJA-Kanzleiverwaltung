const fs=require('fs'),path=require('path');
const FILE=path.join(__dirname,'data','registration.json');
function read(){if(!fs.existsSync(FILE))return {active:false,profiles:{},existingIds:[]};return JSON.parse(fs.readFileSync(FILE,'utf8'));}
function write(value){fs.mkdirSync(path.dirname(FILE),{recursive:true});const temporary=FILE+'.tmp';fs.writeFileSync(temporary,JSON.stringify(value,null,2));fs.renameSync(temporary,FILE);}
function profile(id){return read().profiles?.[id]||null;}
function exempt(id){return Boolean(read().existingIds?.includes(id));}
function mustRegister(id){const data=read();return Boolean(data.active&&!data.existingIds?.includes(id)&&!data.profiles?.[id]);}
module.exports={read,write,profile,exempt,mustRegister,locks:new Set()};

