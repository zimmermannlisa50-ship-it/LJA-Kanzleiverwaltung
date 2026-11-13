const assert=require('node:assert/strict'),f=require('./personnel/test-fixture')(),C=require('./personnel/config'),U=require('./personnel/ui');
const api=require('./personnel/service')(f.client,f.deps),actions=require('./personnel/actions')(api);
const lead=f.member('lead',[C.EMPLOYEE,C.HR[0]]),otherLead=f.member('otherLead',[C.EMPLOYEE,C.HR[1]]),staff=f.member('staff',[C.EMPLOYEE,'1477931644219293718'],'Max Muster'),manager=f.member('manager',[C.EMPLOYEE,'1477932417166868571']);
f.registration.profiles.staff={firstName:'Max',lastName:'Muster',phone:'555-123',rulesAcceptedAt:'accepted',registeredAt:'original'};
const interaction=(actor,action,...args)=>{const x={id:f.uid(),guildId:C.GUILD,guild:f.guild,user:actor.user,member:actor,customId:U.id(action,...args),values:[],reply:async p=>{x.result=p;x.replied=true;},deferReply:async()=>{x.deferred=true;},editReply:async p=>x.result=p,update:async p=>{x.updated=true;x.result=p;},showModal:async m=>x.modal=m.toJSON()};return x;};
function fields(values){return {getTextInputValue:key=>values[key]};}
async function open(actor=lead){const e=f.state.employees.staff,x=interaction(actor,'profileEdit','staff');x.channelId=e.topics.profile;x.message=await f.all.get(e.topics.profile).messages.fetch(e.profileMessageId);await actions.handle(x);return x;}
const token=x=>U.parse(x.modal.custom_id)[1];
async function submit(opened,actor=lead,values={first:'Neuer',last:'Name',phone:'555-456',birth:'02.03.2000'},channel=f.state.employees.staff.topics.profile){const x=interaction(actor,'staffDataSubmit',token(opened));x.channelId=channel;x.fields=fields(values);await actions.handle(x);return x;}
(async()=>{
 await api.ensureEmployee(staff);
 const ui=U.management().components[0].components[0].toJSON();assert.equal(ui.type,5);assert.equal(ui.min_values,1);assert.equal(ui.max_values,1);assert(!ui.options);
 let x=interaction(lead,'staffPick');x.values=['staff'];await actions.handle(x);assert(x.deferred);assert(!x.updated,'Öffentliches Panel bleibt unverändert');assert(x.result.content.includes('staff'));assert.equal(api.sessions.get(U.parse(x.result.components[0].components[0].data.custom_id)[1]).user,'staff');
 x=interaction(manager,'staffPick');x.values=['staff'];await actions.handle(x);assert(x.result.content.includes('Nur die berechtigte'));
 const bot=f.member('a-bot',[]);bot.user.bot=true;x=interaction(lead,'staffPick');x.values=['a-bot'];await actions.handle(x);assert(x.result.content.includes('Bitte eine Person'));
 x=await open(staff);assert(!x.modal);assert(x.result.content.includes('Nur die berechtigte'));
 const opened=await open();assert(opened.modal);assert.equal(opened.modal.components[0].components[0].value,'Max');assert.equal(opened.modal.components[2].components[0].value,'555-123');
 const before=structuredClone(f.registration);
 x=await submit(opened,otherLead);assert(x.result.content.includes('Auswahl abgelaufen'));assert.deepEqual(f.registration,before);
 x=await submit(opened,lead,undefined,'another-profile-thread');assert(x.result.content.includes('anderen Mitarbeiterakte'));assert.deepEqual(f.registration,before);
 x=await submit(opened,lead,{first:'Falsch',last:'Test',phone:'555-456',birth:'31.02.2000'});assert(x.result.content.includes('Ungültiges Datum'));assert.deepEqual(f.registration,before);
 x=await submit(opened,lead,{first:' ',last:'Test',phone:'555-456',birth:''});assert(x.result.content.includes('gültigen IC-Vornamen'));assert.deepEqual(f.registration,before);
 lead.roles.cache.delete(C.HR[0]);x=await submit(opened);assert(x.result.content.includes('Nur die berechtigte'));assert.deepEqual(f.registration,before);lead.roles.cache.set(C.HR[0],{});
 x=await submit(opened);assert(x.result.includes('Stammdaten gespeichert'));assert.equal(f.registration.profiles.staff.firstName,'Neuer');assert.equal(f.registration.profiles.staff.phone,'555-456');assert.equal(f.registration.profiles.staff.rulesAcceptedAt,'accepted');assert.equal(f.registration.profiles.staff.registeredAt,'original');assert.equal(f.state.employees.staff.birthDate,'2000-03-02');assert.equal(f.state.employees.staff.firstName,'Neuer');
 const e=f.state.employees.staff,message=await f.all.get(e.topics.profile).messages.fetch(e.profileMessageId);assert(message.components[0].components.some(c=>c.custom_id===U.id('profileEdit','staff')));assert(message.embeds[0].description.includes('555-456'));
 x=await submit(opened);assert(x.result.content.includes('Auswahl abgelaufen'));
 const formatted=await open();x=await submit(formatted,lead,{first:'Max (Dr.)',last:'Muster-Name',phone:'(555) 12-34',birth:''});assert(x.result.includes('Stammdaten gespeichert'));assert.equal(f.registration.profiles.staff.firstName,'Max (Dr.)');assert.equal(f.registration.profiles.staff.lastName,'Muster-Name');assert.equal(f.registration.profiles.staff.phone,'(555) 12-34');
 const placeholder=await open();x=await submit(placeholder,lead,{first:'Max (Dr.)',last:'Muster-Name',phone:'-',birth:''});assert(x.result.includes('Stammdaten gespeichert'));assert.equal(f.registration.profiles.staff.phone,'-');
 f.state.employees.staff.status='former';x=await open();assert(!x.modal);assert(x.result.content.includes('Keine aktive Personalakte'));
 console.log('OK: native live search, private selections, direct record edits, prefilled data, role/actor/channel binding, invalid-input rollback and preserved registration metadata.');
})().catch(e=>{console.error(e);process.exitCode=1;});
