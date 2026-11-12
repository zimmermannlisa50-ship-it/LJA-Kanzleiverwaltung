const fs=require('fs');
const path=require('path');
const {EmbedBuilder}=require('discord.js');
const labels={added:'🟢 HINZUGEFÜGT',changed:'🟡 GEÄNDERT',fixed:'🔧 BEHOBEN',removed:'🔴 ENTFERNT'};
function berlinDate(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const get=type=>parts.find(p=>p.type===type).value;return `${get('year')}-${get('month')}-${get('day')}`;
}
function groupDays(entries){
 const days=new Map();for(const entry of entries){if(!/^\d{4}-\d{2}-\d{2}$/.test(entry.date))throw Error('Ungültiges Changelogdatum: '+entry.id);
 if(!days.has(entry.date))days.set(entry.date,{date:entry.date,ids:[],added:[],changed:[],fixed:[],removed:[]});
 const day=days.get(entry.date);day.ids.push(entry.id);for(const key of Object.keys(labels))for(const item of entry[key]||[])if(!day[key].includes(item))day[key].push(item);
 }return [...days.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
function render(day){
 const date=day.date.split('-').reverse().join('.');
 const blocks=Object.entries(labels).filter(([key])=>day[key]?.length).map(([key,label])=>`**${label}**\n${day[key].map(text=>'• '+text).join('\n')}`);
 const description=`**CHANGELOG · ${date}**\n━━━━━━━━━━━━━━━━━━━━\n${blocks.join('\n\n')}\n━━━━━━━━━━━━━━━━━━━━`;
 if(description.length>4096)throw Error('Tageschangelog zu lang; Stichpunkte kürzen: '+day.date);
 return new EmbedBuilder().setColor(0xD4AF37).setTitle('⚖️ LIBERTY JUSTICE ASSOCIATES').setDescription(description).setFooter({text:`LJA Tageschangelog | ${day.date}`});
}
module.exports=async function publishChangelogs(client,channelId,options={}){
 const entries=options.entries||JSON.parse(fs.readFileSync(path.join(__dirname,'changelog.json'),'utf8').replace(/^\uFEFF/,''));
 const days=groupDays(entries);const payloads=days.map(day=>({day,embed:render(day)}));
 const entryDates=new Map(entries.map(e=>[e.id,e.date]));
 const channel=await client.channels.fetch(channelId);const existing=new Map();const summaries=[];let before;
 while(true){const batch=await channel.messages.fetch({limit:100,...(before?{before}:{})});if(!batch.size)break;
 for(const message of batch.values()){
 if(message.author.id!==client.user.id)continue;
 for(const embed of message.embeds||[]){
 const footer=embed.footer?.text||'';
 const daily=footer.match(/^LJA Tageschangelog \| (\d{4}-\d{2}-\d{2})$/);
 const legacy=footer.match(/^LJA Changelog \| (.+) \| \d+\/\d+$/);
 const date=daily?.[1]||(legacy&&entryDates.get(legacy[1]));
 if(date){if(!existing.has(date))existing.set(date,new Map());existing.get(date).set(message.id,{message,daily:Boolean(daily)});}
 else if(embed.title==='⚖️ LIBERTY JUSTICE ASSOCIATES'&&embed.description?.startsWith('**Changelog · Kanzleiverwaltung**'))summaries.push(message);
 }
 }
 if(batch.size<100)break;before=batch.last().id;}
 const ids=[];
 for(const {day,embed} of payloads){
 const old=[...(existing.get(day.date)?.values()||[])];
 const survivor=old.find(item=>item.daily)||old.at(-1);
 const payload={embeds:[embed],allowedMentions:{parse:[]}};
 let message;
 if(survivor){message=survivor.message;const current=message.embeds[0];if(current?.description!==embed.data.description||current?.footer?.text!==embed.data.footer.text)await message.edit(payload);}
 else message=await channel.send(payload);
 ids.push(message.id);
 // Erst nach erfolgreicher Zusammenfassung die bekannten Vorgängereinträge entfernen.
 for(const item of old)if(item.message.id!==message.id)await item.message.delete();
 }
 if(ids.length)for(const summary of summaries)await summary.delete();
 return {channel:channel.id,ids};
};
module.exports.render=render;
module.exports.groupDays=groupDays;
module.exports.berlinDate=berlinDate;
