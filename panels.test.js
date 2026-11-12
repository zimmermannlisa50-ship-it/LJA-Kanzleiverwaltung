const assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const client=new EventEmitter();client.user={id:'bot'};
let stored={},sequence=0;const channels=new Map();
client.channels={fetch:async id=>{if(!channels.has(id)){const messages=new Map();const channel={id,isTextBased:()=>true,messages:{fetch:async arg=>{if(typeof arg==='object'){const batch=new Map([...messages].reverse().filter(([id])=>!arg.before||Number(id)<Number(arg.before)).slice(0,arg.limit));batch.last=()=>[...batch.values()].at(-1);return batch;}if(!messages.has(arg)){const e=new Error();e.code=10008;throw e;}return messages.get(arg);}},send:async payload=>{validate(payload);const m={id:String(++sequence),author:{id:'bot'},content:payload.content,embeds:(payload.embeds||[]).map(e=>e.toJSON()),components:(payload.components||[]).map(r=>({components:r.components.map(c=>({customId:c.data.custom_id}))})),edit:async p=>{validate(p);if(p.embeds)m.embeds=p.embeds.map(e=>e.toJSON());},delete:async()=>messages.delete(m.id)};messages.set(m.id,m);return m;}};channels.set(id,{channel,messages});}return channels.get(id).channel;}};
function validate(p){if(p.content)assert(p.content.length<=2000);for(const e of p.embeds||[]){const d=e.toJSON();assert((d.description?.length||0)<=4096);for(const f of d.fields||[])assert(f.value.length<=1024);}for(const r of p.components||[])r.toJSON();}
const panels=require('./panels')({client,hasRole:()=>true,ADMIN_ROLE_IDS:[],TICKET_CATEGORIES:{test:{label:'Test',emoji:'⚖️'}},readJson:()=>structuredClone(stored),writeJson:(_,s)=>stored=structuredClone(s),DATA_DIR:'.'});
(async()=>{for(const key of ['philosophie','regelwerk','honorare','tickets','punkte','admin','changelog']){await panels.publish(key,'test-'+key);const ids=[...stored[key].ids];await panels.publish(key,'test-'+key);if(key==='changelog')assert.deepEqual(stored[key].ids,ids);else assert(stored[key].ids.every(id=>!ids.includes(id))); delete stored[key]; await panels.publish(key,'test-'+key);assert.equal(channels.get('test-'+key).messages.size,ids.length);}const doc=require('fs').readFileSync('regelwerk.txt','utf8').trim();
const ruleChannel=await client.channels.fetch('test-regelwerk');
const oldParts=[];
for(let n=0;n<doc.length;n+=700)oldParts.push((await ruleChannel.send({content:doc.slice(n,n+700)})).id);
const foreign=await ruleChannel.send({content:'Eine andere Botnachricht, die erhalten bleiben muss.'});
const standaloneQuote=await ruleChannel.send({content:doc.slice(80,180)});
const userMessage=await ruleChannel.send({content:doc.slice(0,700)});userMessage.author={id:'user'};
delete stored.regelwerk;
await panels.publish('regelwerk','test-regelwerk');
const remaining=channels.get('test-regelwerk').messages;
assert(oldParts.every(id=>!remaining.has(id)),'Alle alten Dokumentteile müssen entfernt werden');
assert(remaining.has(foreign.id));assert(remaining.has(standaloneQuote.id));assert(remaining.has(userMessage.id));
await new Promise((resolve,reject)=>{client.emit('interactionCreate',{customId:'lja_role_form_1477932047665332338',isChatInputCommand:()=>false,isModalSubmit:()=>true,deferReply:async()=>{},fields:{getTextInputValue:id=>id==='first'?'Max':'Mustermann'},user:{id:'applicant'},guild:{channels:{fetch:async id=>{assert.equal(id,'1570462925402021920');return {type:0,send:async payload=>{validate(payload);assert(payload.content.includes('1485673349098111170'));return {id:'request-test'};},toString:()=>'<#1570462925402021920>'};}}},editReply:async content=>{try{assert.equal(typeof content,'string');assert.equal(stored.requests['request-test'].user,'applicant');resolve();}catch(e){reject(e);}}});});console.log('OK: Alle sieben Panels gültig; Aktualisierung ohne Duplikate.');})().catch(e=>{console.error(e);process.exitCode=1;});







