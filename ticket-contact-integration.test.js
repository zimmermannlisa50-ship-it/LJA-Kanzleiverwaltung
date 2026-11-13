const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),D=require('discord.js');
const source=fs.readFileSync('index.js','utf8'),marker=source.indexOf('// TICKET-AUSWAHL UND TICKET-ERSTELLUNG'),start=source.indexOf('client.on("interactionCreate"',marker),end=source.indexOf('// TICKET-BEARBEITUNG',start);
async function run(category,profile,inputs){
 let handler,tickets={},created=0,data={profiles:{user:profile}},errors=[];
 const registrationStore={profile:()=>data.profiles.user,mustRegister:()=>false,read:()=>structuredClone(data),write:x=>data=x};
 const routing=require('./ticket-routing')({read:()=>({instanceId:'existing'})});
 const channel={id:'new-ticket',name:'ticket',send:async()=>({id:'message'}),toString:()=>'<#new-ticket>'};
 const ctx={...D,require:name=>name==='./nicknames'?{sync:async()=>({})}:require(name),client:{user:{id:'bot'},on:(_,fn)=>handler=fn},ticketRouting:routing,TICKET_CATEGORIES:{[category]:{label:category,categoryId:'category'}},registrationStore,diagnostics:{acknowledged:()=>{},error:(_,e)=>errors.push(e)},personnel:{isBlacklisted:()=>false,applicationOverwrites:()=>[],profileChanged:async()=>{}},ticketWorkflow:{number:()=> '0001',name:()=> 'ticket'},COUNTER_FILE:'counters',readJson:()=>({}),writeJson:()=>{},getTicketData:()=>tickets,saveTicketData:x=>tickets=x,HANDLER_ROLE_IDS:[],addTicketEvent:()=>{},buildTicketEmbed:()=>({}),buildTicketComponents:()=>[],console:{log:()=>{}}};
 vm.runInNewContext(source.slice(start,end),ctx);
 const i={customId:routing.formId(category),user:{id:'user'},member:{},guild:{roles:{everyone:{id:'everyone'}},channels:{create:async()=>{created++;return channel;}}},isStringSelectMenu:()=>false,isModalSubmit:()=>true,isRepliable:()=>true,deferReply:async()=>{i.deferred=true;},editReply:async x=>i.result=x,fields:{fields:new Map(Object.entries(inputs)),getTextInputValue:key=>{if(!Object.hasOwn(inputs,key))throw Error('Unexpected contact question: '+key);return inputs[key];}}};
 await handler(i);assert.deepEqual(errors,[]);assert.equal(created,1);return {ticket:tickets['new-ticket'],profile:data.profiles.user};
}
(async()=>{
 const profile={firstName:'Max',lastName:'Muster',phone:'555-123',rulesAcceptedAt:'existing'};
 for(const category of ['beratung','bewerbung']){const result=await run(category,profile,category==='bewerbung'?{facts:'Meine Bewerbung'}:{subject:'Beratung',facts:'Mein Anliegen'});assert.equal(result.ticket.firstName,profile.firstName);assert.equal(result.ticket.lastName,profile.lastName);assert.equal(result.ticket.phone,profile.phone);assert.equal(result.profile.rulesAcceptedAt,'existing');}
 const partial=await run('beratung',{firstName:'Max',lastName:'Muster'},{phone:'555-456',subject:'Beratung',facts:'Mein Anliegen'});assert.equal(partial.ticket.phone,'555-456');assert.equal(partial.profile.phone,'555-456');
 console.log('OK: actual ticket submission creates regular/application tickets from stored contacts and saves missing details.');
})().catch(e=>{console.error(e);process.exitCode=1;});
