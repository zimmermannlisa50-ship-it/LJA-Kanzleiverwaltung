const C=require('./config'),R=require('./rules'),S=require('./store'),U=require('./ui');
const date=value=>{if(!value)return null;const day=value.slice(0,10);return /^\d{4}-\d{2}-\d{2}$/.test(day)&&Number.isFinite(Date.parse(day))?day:null;};
module.exports=function roster(api){let running;
 async function refresh(){
 const guild=api.guild(),today=R.today();if(guild.members.cache.size<guild.memberCount)await guild.members.fetch();const members=[...guild.members.cache.values()].filter(R.employee);
 S.change(s=>{for(const m of members){const e=s.employees[m.id];if(e&&!date(e.hiredAt)){e.hiredAt=today;e.hiredAtEstimated=true;}}});
 const state=S.read(),groups=new Map(C.RANKS.map(([id,label])=>[id,{label,people:[]}]));groups.set('other',{label:'Mitarbeiter ohne zugeordneten Rang',people:[]});
 for(const m of members){const e=state.employees[m.id];if(!e)continue;const rank=R.rank(m)||'other';groups.get(rank).people.push({id:m.id,name:api.employeeName(m.id),since:R.german(date(e.hiredAt))});}
 const blocks=[];for(const [id,g]of groups){if(!g.people.length)continue;g.people.sort((a,b)=>a.name.localeCompare(b.name,'de'));const heading=id==='other'?`**${g.label}**`:`**${g.label}** · <@&${id}>`;let block=heading;for(const person of g.people){const line=`\n<@${person.id}> · **${person.name}**\nEingestellt seit **${person.since}**`;if((block+line).length>3200){blocks.push(block);block=heading;}block+=line;}blocks.push(block);}
 const pages=[];let body='';for(const block of blocks){if((body+'\n\n'+block).length>3500){pages.push(body);body='';}body+=(body?'\n\n':'')+block;}if(body||!pages.length)pages.push(body||'Aktuell sind keine Mitarbeiter eingetragen.');
 const channel=await api.channel(C.CHANNELS.management),saved=state.rosterIds||[],ids=[];
 for(let i=0;i<pages.length;i++){const embed=U.card('👥 Mitarbeiterübersicht',`**${members.length} Mitarbeiter**\n━━━━━━━━━━━━━━━━━━━━\n\n${pages[i]}`).setFooter({text:`LJA | Mitarbeiterübersicht ${i+1}/${pages.length}`});let message=saved[i]?await channel.messages.fetch(saved[i]).catch(e=>{if(e.code===10008)return null;throw e;}):null;if(message&&message.author.id!==api.client.user.id)throw Error('Mitarbeiterübersicht verweist auf eine fremde Nachricht.');if(message){if(message.embeds[0]?.description!==embed.data.description||message.embeds[0]?.footer?.text!==embed.data.footer.text)await message.edit({embeds:[embed],allowedMentions:{parse:[]}});}else message=await channel.send({embeds:[embed],allowedMentions:{parse:[]}});ids.push(message.id);S.change(s=>s.rosterIds=[...ids,...saved.slice(ids.length)]);}
 for(const id of saved.filter(id=>!ids.includes(id))){const message=await channel.messages.fetch(id).catch(e=>{if(e.code===10008)return null;throw e;});if(message?.author.id===api.client.user.id)await message.delete();}S.change(s=>s.rosterIds=ids);return {employees:members.length,messages:ids.length};
 }
 return ()=>{if(!running)running=refresh().finally(()=>running=null);return running;};
};
