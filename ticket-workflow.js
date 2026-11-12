const LABELS={strafverteidigung:'notfall',klage:'klage-staat',beratung:'allg-frage'};
const NAMED=new Set(Object.keys(LABELS));
function status(ticket){if(ticket.closed)return {emoji:'⚫',title:'Geschlossen',color:0x555555};if(ticket.categoryKey==='bewerbung'&&ticket.applicationDecision)return {emoji:ticket.applicationDecision==='hired'?'🟢':'⚫',title:ticket.applicationDecision==='hired'?'Eingestellt':ticket.applicationDecision==='blacklisted'?'Blacklist':'Abgelehnt',color:ticket.applicationDecision==='hired'?0x2ECC71:0x555555};if(ticket.completed)return {emoji:'🟢',title:'Erledigt',color:0x2ECC71};if(ticket.waiting)return {emoji:'🟠',title:'Wartet auf Rückmeldung',color:0xE67E22};if(ticket.handlerId)return {emoji:'🟡',title:'In Bearbeitung',color:0xF1C40F};return {emoji:'🔴',title:'Wartet auf Bearbeitung',color:0xE74C3C};}
function slug(text){return String(text||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'unbekannt';}
function name(ticket){if(ticket.categoryKey==='bewerbung')return `${status(ticket).emoji}-bewerbung-${slug(ticket.firstName)}-${slug(ticket.lastName)}`.slice(0,100);if(!NAMED.has(ticket.categoryKey))return null;return `${ticket.handlerId?'└-':''}${status(ticket).emoji}-${String(ticket.ticketNumber).padStart(4,'0')}-${LABELS[ticket.categoryKey]}-${slug(ticket.firstName)}-${slug(ticket.lastName)}`.slice(0,100);}
function number(counters,categoryKey,tickets=[]){
 const previous=Math.max(Number(counters[categoryKey])||0,...tickets.filter(t=>t.categoryKey===categoryKey).map(t=>Number(t.ticketNumber)||0));
 counters[categoryKey]=previous+1;return String(counters[categoryKey]).padStart(4,'0');
}
// Namenslimits dürfen Statusnachrichten und Kategorieänderungen nicht blockieren.
const createNameQueue=require('./ticket-name-queue');
let nameQueue=createNameQueue({rename:(channel,target)=>channel.setName(target,'Ticketstatus aktualisiert'),onError:(id,error)=>require('./bot-diagnostics').error('Ticketname '+id,error)});
function configureRenames(client){const {REST,Routes}=require('discord.js');const rest=new REST({version:'10',rejectOnRateLimit:()=>true}).setToken(client.token);nameQueue=createNameQueue({rename:async(channel,target)=>{await rest.patch(Routes.channel(channel.id),{body:{name:target},reason:'Ticketstatus aktualisiert'});},onDelay:(id,delay)=>console.log(JSON.stringify({time:new Date().toISOString(),event:'ticket_name_delayed',channelId:id,retryAfterMs:delay})),onError:(id,error)=>require('./bot-diagnostics').error('Ticketname '+id,error)});}
function syncName(channel,ticket){nameQueue.request(channel,name(ticket));}
module.exports={status,name,number,syncName,configureRenames,NAMED};
