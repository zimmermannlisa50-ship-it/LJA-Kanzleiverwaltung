const {EmbedBuilder}=require('discord.js');
module.exports=async function decide(i,{client,ROLES,state,save,locks,authorized}){
 if(!authorized)return i.reply({content:'Keine Berechtigung zur Freigabe.',flags:64});
 if(i.channelId!=='1570462925402021920'||i.message.author.id!==client.user.id)return i.reply({content:'Ungültige Rollenanfrage.',flags:64});
 if(locks.has(i.message.id))return i.reply({content:'Anfrage wird bereits bearbeitet.',flags:64});
 locks.add(i.message.id);
 try{
 await i.deferReply({flags:64});
 let r=state().requests?.[i.message.id];
 if(!r){
 const text=i.message.embeds[0]?.description||'';
 const user=text.match(/\*\*Discord-ID:\*\* (\d+)/)?.[1];
 const name=text.match(/\*\*IC-Name:\*\* (.+)/)?.[1];
 const label=text.match(/\*\*Gewünschte Rolle:\*\* (.+)/)?.[1];
 const role=Object.keys(ROLES).find(id=>ROLES[id]===label);
 if(!user||!name||!role||!text.includes('**Status:** Offen'))return i.editReply('Anfragedaten fehlen. Bitte eine neue Rollenanfrage erstellen.');
 r={user,role,first:name,last:'',status:'open'};
 }
 const accept=i.customId==='lja_role_accept';
 if(r.status==='open'){
 if(!ROLES[r.role])throw Error('Rolle nicht freigegeben.');
 if(accept){const member=await i.guild.members.fetch(r.user);await member.roles.add(r.role,`Freigegeben von ${i.user.tag} (${i.user.id})`);}
 r={...r,status:accept?'accepted':'rejected',reviewer:i.user.id,reviewerName:i.user.tag,reviewedAt:new Date().toISOString()};
 const latest=state();latest.requests||={};latest.requests[i.message.id]=r;save(latest);
 }
 const approved=r.status==='accepted';
 const description=`**IC-Name:** ${r.first} ${r.last}\n**Discord:** <@${r.user}> (${r.user})\n**Rolle:** ${ROLES[r.role]}\n**Status:** ${approved?'Angenommen':'Abgelehnt'}\n**Entschieden von:** ${r.reviewerName||'Discord-Nutzer'} · <@${r.reviewer}> · ID: ${r.reviewer}`;
 await i.message.edit({embeds:[new EmbedBuilder().setColor(approved?0x2ECC71:0xE74C3C).setTitle('⚡ Rollenanfrage').setDescription(description).setFooter({text:'Liberty Justice Associates | Kanzleiverwaltung'})],components:[],allowedMentions:{parse:[]}});
 return i.editReply(approved?'Anfrage angenommen. Rolle vergeben und Status aktualisiert.':'Anfrage abgelehnt. Status aktualisiert.');
 }finally{locks.delete(i.message.id);}
};
