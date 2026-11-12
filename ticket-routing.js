const crypto=require('crypto');
module.exports=function routing(store=require('./registration-store')){
 function scope(){const s=store.read();if(!s.instanceId){s.instanceId=crypto.randomUUID().replace(/-/g,'');store.write(s);}return s.instanceId;}
 const prefix=()=>`lja_ticket:v3:${scope()}:`;
 const menuId=()=>prefix()+'type';
 function formId(category){if(!/^[a-z]+$/.test(category))throw Error('Ungültige Ticketart');return prefix()+'form:'+category;}
 function parse(id){if(typeof id!=='string'||!id.startsWith('lja_ticket:v3:'))return null;const p=prefix();if(!id.startsWith(p))return null;const tail=id.slice(p.length);if(tail==='type')return {action:'type'};const match=/^form:([a-z]+)$/.exec(tail);return match?{action:'form',category:match[1]}:null;}
 const isMenu=id=>id==='lja_ticket_type'||/^lja_ticket:v3:[a-zA-Z0-9-]+:type$/.test(id||'');
 return {menuId,formId,parse,isMenu};
};
