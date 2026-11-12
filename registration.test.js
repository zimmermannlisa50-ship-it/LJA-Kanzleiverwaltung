const assert=require('node:assert/strict');
const storePath=require.resolve('./registration-store');require(storePath);
let data={active:true,existingIds:['existing'],profiles:{}};
const store={read:()=>structuredClone(data),write:s=>data=structuredClone(s),profile:id=>data.profiles[id]||null,exempt:id=>data.existingIds.includes(id),mustRegister:id=>data.active&&!data.existingIds.includes(id)&&!data.profiles[id],locks:new Set()};
require.cache[storePath].exports=store;
const registration=require('./registration');
(async()=>{let grants=0,modal=0,dms=0;const member={id:'new',pending:undefined,user:{bot:false},guild:{id:'1477731363082993665'},roles:{add:async()=>{grants++;}},send:async()=>{dms++;}};
const client={guilds:{cache:new Map(),fetch:async()=>({members:{fetch:async()=>member}})}};
let result='';const i={customId:'lja_register',user:{id:'new'},reply:async p=>{result=p.content;},showModal:async()=>{modal++;},deferReply:async()=>{},editReply:async p=>{result=typeof p==='string'?p:p.content;}};
data.active=false;await registration.handle(client,i);assert.equal(modal,0);assert.equal(grants,0);assert(result.includes('eingerichtet'));data.active=true;
await registration.invite(member);await registration.invite(member);assert.equal(dms,1);
await registration.handle(client,i);assert.equal(modal,1);
i.customId='lja_register_form';i.fields={getTextInputValue:id=>({firstName:'Max',lastName:'Muster',phone:'555-1234'})[id]};
await registration.handle(client,i);assert.equal(grants,1);assert.equal(data.profiles.new.phone,'555-1234');assert(result.includes('abgeschlossen'));
i.customId='lja_register';i.user.id='existing';await registration.handle(client,i);assert(result.includes('Bestandsmitglied'));assert.equal(grants,1);
i.user.id='other';member.id='other';i.customId='lja_register_form';i.fields={getTextInputValue:id=>id==='phone'?'abc':'Test'};await registration.handle(client,i);assert(!data.profiles.other);assert.equal(grants,1);
console.log('OK: Ohne Discord-Regelbestätigung, Bestandsmitglieder ausgenommen, DM nur einmal, Pflichtdaten gespeichert und Bürgerrolle erst danach vergeben.');
})().catch(e=>{console.error(e);process.exitCode=1;});

