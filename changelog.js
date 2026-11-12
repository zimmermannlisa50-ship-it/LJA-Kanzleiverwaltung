const fs=require('fs');
const path=require('path');
const {EmbedBuilder}=require('discord.js');
const labels={added:'🟢 HINZUGEFÜGT',changed:'🟡 GEÄNDERT',fixed:'🔧 BEHOBEN',removed:'🔴 ENTFERNT'};
function render(entry){
 const date=entry.date.split('-').reverse().join('.');
 const blocks=Object.entries(labels).filter(([key])=>entry[key]?.length).map(([key,label])=>`**${label}**\n${entry[key].map(text=>'• '+text).join('\n')}`);
 const pages=[];let body='';for(const block of blocks){if((body+'\n\n'+block).length>3600&&body){pages.push(body);body='';}if(block.length>3600)throw Error('Changelogabschnitt zu lang: '+entry.id);body+=(body?'\n\n':'')+block;}if(body)pages.push(body);
 return pages.map((description,index)=>new EmbedBuilder().setColor(0xD4AF37).setTitle('⚖️ LIBERTY JUSTICE ASSOCIATES').setDescription(`**CHANGELOG · ${date} · ${entry.id}**\n**${entry.title}**\n━━━━━━━━━━━━━━━━━━━━\n${description}\n━━━━━━━━━━━━━━━━━━━━`).setFooter({text:`LJA Changelog | ${entry.id} | ${index+1}/${pages.length}`}));
}
module.exports=async function publishChangelogs(client,channelId){
 const entries=JSON.parse(fs.readFileSync(path.join(__dirname,'changelog.json'),'utf8').replace(/^\uFEFF/,''));
 const channel=await client.channels.fetch(channelId);const existing=new Map();let before;
 while(true){const batch=await channel.messages.fetch({limit:100,...(before?{before}:{})});if(!batch.size)break;for(const message of batch.values())if(message.author.id===client.user.id)for(const embed of message.embeds||[])if(embed.footer?.text)existing.set(embed.footer.text,message.id);if(batch.size<100)break;before=batch.last().id;}
 const ids=[];
 for(const entry of entries)for(const embed of render(entry)){const marker=embed.data.footer.text;if(existing.has(marker)){ids.push(existing.get(marker));continue;}const message=await channel.send({embeds:[embed],allowedMentions:{parse:[]}});ids.push(message.id);existing.set(marker,message.id);}
 return {channel:channel.id,ids};
};
module.exports.render=render;
