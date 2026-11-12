const assert=require('node:assert/strict');const names=require('./nicknames');
function member(){let calls=[];const m={guild:{id:'1477731363082993665',members:{me:{permissions:{has:()=>true}}}},user:{bot:false},roles:{cache:new Map()},manageable:true,nickname:null,setNickname:async name=>{calls.push(name);m.nickname=name;},fetch:async()=>m};return {m,calls};}
(async()=>{const ids=names.config().excludedRoleIds;assert.equal(ids.length,16);assert.equal(new Set(ids).size,16);
for(const id of ids){const f=member();f.m.roles.cache.set(id,{});const r=await names.sync(f.m,{firstName:'Lisa',lastName:'Kessingtan'});assert.equal(r.reason,'excluded');assert.equal(f.calls.length,0);}
let f=member();f.m.roles.cache.set('1477932235842654299',{});assert((await names.sync(f.m,{firstName:' Lisa ',lastName:'Kessingtan'})).updated);assert.deepEqual(f.calls,['Lisa Kessingtan']);assert.equal((await names.sync(f.m,{firstName:'Lisa',lastName:'Kessingtan'})).reason,'unchanged');
f=member();f.m.fetch=async()=>({...f.m,roles:{cache:new Map([[ids[0],{}]])}});assert.equal((await names.sync(f.m,{firstName:'Neu',lastName:'Name'})).reason,'excluded');assert.equal(f.calls.length,0);
f=member();f.m.user.bot=true;await names.sync(f.m,{firstName:'Bot',lastName:'Name'});assert.equal(f.calls.length,0);
f=member();f.m.manageable=false;assert.equal((await names.sync(f.m,{firstName:'Max',lastName:'Muster'})).reason,'permissions');assert.equal(f.calls.length,0);
f=member();f.m.guild.members.me.permissions.has=()=>false;assert.equal((await names.sync(f.m,{firstName:'Max',lastName:'Muster'})).reason,'permissions');assert.equal(f.calls.length,0);
f=member();assert.equal((await names.sync(f.m,{firstName:'a'.repeat(32),lastName:'Muster'})).reason,'length');assert.equal(f.calls.length,0);
f=member();f.m.setNickname=async()=>{throw Error('Discord nicht erreichbar');};assert.equal((await names.sync(f.m,{firstName:'Max',lastName:'Muster'})).reason,'failed');
console.log('OK: Alle 16 Ausnahmen, frische Rollenprüfung, Bürger-Spitzname, Bots, Hierarchie, Längenlimit und API-Fehler geprüft.');})().catch(e=>{console.error(e);process.exitCode=1;});
