const assert=require('node:assert/strict'),close=require('./ticket-close'),state=require('./ticket-close-state'),workflow=require('./ticket-workflow');
function fixture(){state.confirmations.clear();state.locks.clear();let tickets={c:{categoryKey:'klage',ticketNumber:'0001',userId:'u',firstName:'Max',lastName:'Muster',events:[]}},transcripts=0,uploads=0;const permissions=[];
const channel={id:'c',name:'test',permissionOverwrites:{cache:new Map([['u',{allow:{has:f=>['SendMessages','AttachFiles'].includes(f)},deny:{has:()=>false}}]]),edit:async(_,value)=>permissions.push(value)},send:async()=>{uploads++;return {url:'transcript'};}};
const d={owner:'instance',workflow,getTickets:()=>structuredClone(tickets),saveTickets:s=>tickets=s,isLeadership:()=>false,update:async()=>{},addEvent:(t,event,userId)=>t.events.push({event,userId}),transcript:async()=>{transcripts++;return 'html';}};
const i={customId:close.buttonId(d.owner),isButton:()=>true,channelId:'c',channel,user:{id:'u'},member:{},reply:async p=>{i.response=p;},update:async p=>{i.response=p;},deferUpdate:async()=>{i.deferred=true;},deferReply:async()=>{i.deferred=true;},editReply:async p=>{i.response=p;}};
return {i,d,permissions,get ticket(){return tickets.c;},get transcripts(){return transcripts;},get uploads(){return uploads;}};}
const action=(f,index)=>f.i.response.components[0].components[index].data.custom_id;
(async()=>{
let f=fixture();await close(f.i,f.d);assert(!f.ticket.closed);assert.equal(f.transcripts,0);f.i.customId=action(f,1);await close(f.i,f.d);assert(!f.ticket.closed);assert.equal(f.permissions.length,0);
f=fixture();await close(f.i,f.d);f.i.customId=action(f,0);await close(f.i,f.d);assert(f.ticket.closed);assert.equal(f.transcripts,1);assert.equal(f.uploads,1);assert.equal(f.permissions[0].SendMessages,false);assert(f.ticket.closedAt);
f=fixture();f.i.customId=close.buttonId(f.d.owner,'confirm','forged');await close(f.i,f.d);assert(!f.ticket.closed);assert.equal(f.transcripts,0);
f=fixture();await close(f.i,f.d);f.i.customId=action(f,0);f.d.transcript=async()=>{throw Error('Transkript fehlgeschlagen');};await close(f.i,f.d);assert(!f.ticket.closed);assert.equal(f.permissions.at(-1).SendMessages,true);assert.equal(f.uploads,0);assert.equal(state.locks.size,0);
f=fixture();f.i.user.id='other';await close(f.i,f.d);assert.equal(f.transcripts,0);assert(!f.i.response.components);
f=fixture();await close(f.i,f.d);f.i.customId=action(f,0);let resolve;f.d.transcript=async()=>new Promise(r=>resolve=r);const first=close(f.i,f.d);await new Promise(setImmediate);let response;await close({...f.i,reply:async p=>{response=p;}},f.d);assert(response.content.includes('bereits'));resolve('html');await first;assert.equal(f.uploads,1);
console.log('OK: Bestätigung, Abbruch, Berechtigungen, gefälschte Bestätigung, Doppelklick und Transkriptfehler geprüft.');
})().catch(e=>{console.error(e);process.exitCode=1;});
