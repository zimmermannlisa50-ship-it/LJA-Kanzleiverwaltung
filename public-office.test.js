const assert=require('node:assert/strict'),{EventEmitter}=require('node:events'),{EmbedBuilder}=require('discord.js');
const f=require('./personnel/test-fixture')(),C=require('./personnel/config'),P=require('./office-policy');
let officeState={registerChannel:'register',messages:{}};const store={read:()=>structuredClone(officeState),change:fn=>fn(officeState)};require('./office-store');require.cache[require.resolve('./office-store')].exports=store;
const events=new EventEmitter();f.client.on=events.on.bind(events);f.client.emit=events.emit.bind(events);f.regStore.mustRegister=()=>false;
const user=f.member('user',[C.CITIZEN]),lawyer=f.member('lawyer',[C.EMPLOYEE,C.LAWYERS[0]],'Max Muster'),other=f.member('other',[C.EMPLOYEE,C.LAWYERS[1]]),hr=f.member('hr',[C.HR[0]]),personnel=f.member('personnel',['application-role']),stranger=f.member('stranger',[]);
f.state.applicationRoleId='application-role';f.state.employees.lawyer={id:'lawyer',status:'active',displayName:'Max Muster',licenses:[]};f.state.employees.other={id:'other',status:'active',licenses:[]};f.registration.profiles.user={firstName:'Mandant',lastName:'Test',phone:'555-123',rulesAcceptedAt:'accepted'};
const register=f.createChannel({id:'register'}),announcements=f.createChannel({id:P.ANNOUNCEMENTS}),forum=f.createChannel({parent:'lawyer-private-category'});let counters={},indexed=0;
const deps={client:f.client,registration:f.regStore,...f.deps,personnel:{resolveLawyer:async()=>forum,caseIndex:async()=>indexed++},getCounters:()=>counters,saveCounters:s=>counters=s,queuePermissions:()=>[],buildEmbed:t=>new EmbedBuilder().setDescription(t.facts),buildComponents:()=>[]};
const office=require('./public-office')(deps),prefix='lja_office:'+f.registration.instanceId+':';
const i=(member,action,channel='register')=>{const x={id:f.uid(),customId:prefix+action,guildId:C.GUILD,guild:f.guild,channelId:channel,user:member.user,member,values:[],fields:{getTextInputValue:key=>{assert(['subject','facts'].includes(key),'Stammdaten erneut abgefragt');return {subject:'Beratung',facts:'Privates Anliegen'}[key];}},deferReply:async()=>{x.deferred=true;},deferUpdate:async()=>{x.deferred=true;},showModal:async m=>x.modal=m.toJSON(),reply:async p=>x.result=p,editReply:async p=>x.result=p};return x;};
(async()=>{
 let x=i(stranger,'contact');await office.handle(x);assert(x.result.content.includes('Bürgerrolle'));
 x=i(user,'contact');await office.handle(x);assert(x.result.components.length);
 x=i(user,'choose:user');x.values=['lawyer'];await office.handle(x);assert.deepEqual(x.modal.components.map(r=>r.components[0].custom_id),['subject','facts']);
 x=i(user,'request:lawyer');await office.handle(x);assert.equal(Object.keys(f.tickets).length,1);let ticket=Object.values(f.tickets)[0];assert.equal(ticket.handlerId,'lawyer');assert.equal(ticket.phone,'555-123');assert.equal(indexed,1);
 const channel=f.all.get(ticket.channelId);assert.equal(channel.parentId,'lawyer-private-category');assert(channel.permissionOverwrites.cache.has('user'));assert(channel.permissionOverwrites.cache.has('lawyer'));assert(!channel.permissionOverwrites.cache.has('other'));assert(!channel.permissionOverwrites.cache.has(C.CITIZEN));
 x=i(user,'request:lawyer');await office.handle(x);assert.equal(Object.keys(f.tickets).length,1);
 lawyer.roles.cache.delete(C.EMPLOYEE);x=i(user,'request:lawyer');await office.handle(x);assert(x.result.content.includes('nicht mehr verfügbar'));assert.equal(Object.keys(f.tickets).length,1);
 x=i(user,'announce',P.ANNOUNCEMENTS);await office.handle(x);assert(!x.modal);assert(x.result.content.includes('Nur Personalverwaltung'));
 for(const member of [hr,personnel]){x=i(member,'announce',P.ANNOUNCEMENTS);await office.handle(x);assert(x.modal);}
 x=i(user,'announce',P.ANNOUNCEMENTS);x.member=hr;await office.handle(x);assert(!x.modal,'Frisch geladene Rollen statt veralteter Interaktion');
 x=i(personnel,'announceSubmit',P.ANNOUNCEMENTS);x.fields={getTextInputValue:key=>key==='title'?'Information':'Neue Ankündigung'};await office.handle(x);assert.equal(officeState.announcements.length,1);assert.equal(announcements.messages.cache.size,2);
 const upsert=require('./office-messages');await upsert(register,'register',[{embeds:[new EmbedBuilder().setTitle('Register').setFooter({text:'LJA | Anwaltsregister 1'})],components:[]}],'bot','LJA | Anwaltsregister');const count=register.messages.cache.size;await upsert(register,'register',[{embeds:[new EmbedBuilder().setTitle('Aktualisiert').setFooter({text:'LJA | Anwaltsregister 1'})],components:[]}],'bot','LJA | Anwaltsregister');assert.equal(register.messages.cache.size,count);
 console.log('OK: citizen/role checks, master data reuse, private direct routing, duplicate prevention, departed lawyer denial, announcement authorization and idempotent panels.');
})().catch(e=>{console.error(e);process.exitCode=1;});
