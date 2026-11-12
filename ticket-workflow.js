const NAMED=new Set(['strafverteidigung','klage','beratung']);
function status(ticket){if(ticket.closed)return {emoji:'⚫',title:'Geschlossen',color:0x555555};if(ticket.categoryKey==='bewerbung'&&ticket.applicationDecision)return {emoji:ticket.applicationDecision==='hired'?'🟢':'⚫',title:ticket.applicationDecision==='hired'?'Eingestellt':ticket.applicationDecision==='blacklisted'?'Blacklist':'Abgelehnt',color:ticket.applicationDecision==='hired'?0x2ECC71:0x555555};if(ticket.completed)return {emoji:'🟢',title:'Erledigt',color:0x2ECC71};if(ticket.waiting)return {emoji:'🟠',title:'Wartet auf Rückmeldung',color:0xE67E22};if(ticket.handlerId)return {emoji:'🟡',title:'In Bearbeitung',color:0xF1C40F};return {emoji:'🔴',title:'Wartet auf Bearbeitung',color:0xE74C3C};}
function slug(text){return String(text||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'unbekannt';}
function name(ticket){if(ticket.categoryKey==='bewerbung')return `${status(ticket).emoji}-bewerbung-${slug(ticket.firstName)}-${slug(ticket.lastName)}`.slice(0,100);if(!NAMED.has(ticket.categoryKey))return null;return `${ticket.handlerId?'└-':''}${status(ticket).emoji}-${String(ticket.ticketNumber).padStart(4,'0')}-${slug(ticket.firstName)}-${slug(ticket.lastName)}`.slice(0,100);}
function number(counters,categoryKey,tickets=[]){
 const previous=Math.max(Number(counters[categoryKey])||0,...tickets.filter(t=>t.categoryKey===categoryKey).map(t=>Number(t.ticketNumber)||0));
 counters[categoryKey]=previous+1;return String(counters[categoryKey]).padStart(4,'0');
}
// Umbenennungen laufen getrennt von Interaktionsantworten. Discord kann Kanalnamen begrenzen.
const renames=new Map();
function syncName(channel,ticket){const desired=name(ticket);if(!desired)return;
 let state=renames.get(channel.id);if(state){state.desired=desired;return;}if(channel.name===desired)return;
 state={desired};renames.set(channel.id,state);
 (async()=>{let actual=channel.name;try{while(actual!==state.desired){const target=state.desired;await channel.setName(target,'Ticketstatus aktualisiert');actual=target;}}catch(e){console.error('Ticketname konnte nicht aktualisiert werden:',e.message);}finally{renames.delete(channel.id);}})();}
module.exports={status,name,number,syncName,NAMED};


