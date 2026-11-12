const assert=require('node:assert/strict');const decide=require('./role-decisions');
const role='1493622176681558027',ROLES={[role]:'Sheriff'};
async function run(){let data={},added=0,edits=0,fail=true;const message={id:'request',author:{id:'bot'},embeds:[{description:'**IC-Name:** Max Muster\n**Discord-ID:** 123456789012345678\n**Gewünschte Rolle:** Sheriff\n**Status:** Offen'}],edit:async p=>{edits++;if(fail)throw Error('Vorübergehender Discordfehler');assert.equal(p.components.length,0);assert(p.embeds[0].data.description.includes('Angenommen'));}};
const i={channelId:'1570462925402021920',customId:'lja_role_accept',message,user:{id:'reviewer',tag:'Team'},deferReply:async()=>{},editReply:async()=>{},guild:{members:{fetch:async()=>({roles:{add:async()=>{added++;}}})}}};
const options={client:{user:{id:'bot'}},ROLES,state:()=>structuredClone(data),save:s=>data=s,locks:new Set(),authorized:true};
await assert.rejects(()=>decide(i,options));assert.equal(data.requests.request.status,'accepted');fail=false;await decide(i,options);assert.equal(added,1);assert.equal(edits,2);console.log('OK: Fehlende Anfragedaten wiederhergestellt; Annahme gespeichert; Status nach Editfehler repariert, ohne doppelte Rollenvergabe.');}
run().catch(e=>{console.error(e);process.exitCode=1;});
