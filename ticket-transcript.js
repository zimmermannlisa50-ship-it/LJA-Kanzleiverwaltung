const fs=require('fs'),path=require('path');
const {AttachmentBuilder}=require('discord.js');
const workflow=require('./ticket-workflow');
const escape=value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
const text=value=>escape(value).replace(/\n/g,'<br>');
const date=value=>new Date(value).toLocaleString('de-DE',{timeZone:'Europe/Berlin'});
module.exports=async function transcript(channel,ticket,{directory}){
 const messages=[];let before;
 while(true){const batch=await channel.messages.fetch({limit:100,...(before?{before}:{})});if(!batch.size)break;messages.push(...batch.values());if(batch.size<100)break;before=batch.last().id;}
 messages.sort((a,b)=>a.createdTimestamp-b.createdTimestamp);
 const htmlMessages=messages.map(m=>{
 const attachments=[...(m.attachments?.values()||[])].map(a=>{let url;try{url=new URL(a.url);}catch{return '';}if(!['https:','http:'].includes(url.protocol))return '';return `<a href="${escape(url.href)}" rel="noreferrer">${escape(a.name||'Anhang')}</a>`;}).join('<br>');
 const embeds=(m.embeds||[]).map(e=>`<section class="embed"><strong>${text(e.title||e.author?.name||'')}</strong><p>${text(e.description||'')}</p>${(e.fields||[]).map(f=>`<p><b>${text(f.name)}</b><br>${text(f.value)}</p>`).join('')}</section>`).join('');
 return `<article><header>${escape(m.member?.displayName||m.author?.username||'Unbekannt')} <small>(${escape(m.author?.id||'')}) · ${escape(date(m.createdTimestamp))}</small></header><p>${text(m.content)}</p>${embeds}${attachments?'<div>'+attachments+'</div>':''}</article>`;
 }).join('\n');
 const metadata=[['Ticketnummer',ticket.ticketNumber],['Kategorie',ticket.categoryLabel],['Mandant',`${ticket.firstName} ${ticket.lastName}`],['IC-Telefonnummer',ticket.phone||'Nicht hinterlegt'],['Discord-ID',ticket.userId],['Betreff',ticket.subject],['Sachverhalt',ticket.facts],['DOJ-Aktenzeichen',ticket.dojCaseNumber||'Nicht hinterlegt'],['Status',workflow.status(ticket).title],['Erstellt',date(ticket.createdAt)],['Geschlossen',ticket.closedAt?date(ticket.closedAt):'Offen'],['Geschlossen von',ticket.closedBy||'–']];
 const events=(ticket.events||[]).map(e=>`<li>${escape(date(e.timestamp))} · ${text(e.event)} · ${escape(e.userId)} ${text(e.details||'')}</li>`).join('');
 const html=`<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>LJA · Ticket ${escape(ticket.ticketNumber)}</title><style>body{font:15px/1.65 system-ui,sans-serif;background:#111318;color:#eee;max-width:1000px;margin:40px auto;padding:0 24px}h1,h2,b,a{color:#d4af37}h1{border-bottom:1px solid #d4af37;padding-bottom:12px}article,.metadata{padding:20px;margin:16px 0;background:#1c2028;border-radius:10px;overflow-wrap:anywhere}.embed{border-left:3px solid #d4af37;padding:12px 18px;background:#151820}small{color:#aeb4c0}dt{font-weight:700;color:#d4af37}dd{margin:0 0 12px}header{font-weight:700}p{white-space:normal}</style></head><body><h1>⚖ LIBERTY JUSTICE ASSOCIATES</h1><h2>Ticket-Transkript · ${escape(ticket.ticketNumber)}</h2><dl class="metadata">${metadata.map(([k,v])=>`<dt>${escape(k)}</dt><dd>${text(v)}</dd>`).join('')}</dl><h2>Bearbeitungsverlauf</h2><ul>${events}</ul><h2>Nachrichtenverlauf · ${messages.length} Nachrichten</h2>${htmlMessages}</body></html>`;
 fs.mkdirSync(directory,{recursive:true});const name=`ticket-${ticket.ticketNumber}-${channel.id}-transkript.html`;const file=path.join(directory,name);fs.writeFileSync(file,html,'utf8');return new AttachmentBuilder(file,{name});
};
