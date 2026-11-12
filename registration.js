const {ActionRowBuilder,ButtonBuilder,ButtonStyle,EmbedBuilder,ModalBuilder,TextInputBuilder,TextInputStyle}=require('discord.js');
const store=require('./registration-store');
const GUILD='1477731363082993665',CITIZEN='1477932235842654299',WELCOME='1477731364403941540';
const row=input=>new ActionRowBuilder().addComponents(input);
const locks=store.locks;
function panel(){return {embeds:[new EmbedBuilder().setColor(0xD4AF37).setTitle('⚖️ LIBERTY JUSTICE ASSOCIATES').setDescription('**Willkommen bei Liberty Justice Associates**\n\nBitte hinterlege IC-Vorname, IC-Nachname und IC-Telefonnummer. Danach werden die Bürgerkanäle freigeschaltet.\n\nBestehende Mitglieder müssen sich nicht registrieren. Deine Angaben werden für deine Tickets gespeichert und hier nicht veröffentlicht.').setFooter({text:'LJA | Registrierung'})],components:[row(new ButtonBuilder().setCustomId('lja_register').setLabel('IC-DATEN HINTERLEGEN').setStyle(ButtonStyle.Success))],allowedMentions:{parse:[]}};}
async function currentMember(client,id){const guild=await client.guilds.fetch(GUILD);return guild.members.fetch({user:id,force:true});}
async function invite(member){
 if(member.guild.id!==GUILD||member.user.bot||!store.mustRegister(member.id))return;
 if(locks.has('invite:'+member.id))return;locks.add('invite:'+member.id);
 try{const data=store.read();if(data.invited?.[member.id])return;await member.send(panel());const latest=store.read();latest.invited||={};latest.invited[member.id]=new Date().toISOString();store.write(latest);}
 catch(e){console.error('Registrierung: Privatnachricht nicht zustellbar; Ersatzbutton in Willkommen.',e.code||e.message);}finally{locks.delete('invite:'+member.id);}
}
async function handle(client,i){
 if(!['lja_register','lja_register_form'].includes(i.customId))return;
 try{
 const state=store.read();if(!state.active)return await i.reply({content:'Die Registrierung wird noch eingerichtet.',flags:64});
 if(i.guildId&&i.guildId!==GUILD)return;
 const member=i.customId==='lja_register'?(client.guilds.cache.get(GUILD)?.members.cache.get(i.user.id)||await currentMember(client,i.user.id)):await currentMember(client,i.user.id);

 if(store.exempt(i.user.id))return await i.reply({content:'Du bist Bestandsmitglied und musst dich nicht registrieren.',flags:64});
 if(i.customId==='lja_register'){
 if(store.profile(i.user.id)){await member.roles.add(CITIZEN,'Registrierung bereits abgeschlossen');return await i.reply({content:'Du bist bereits registriert.',flags:64});}
 const modal=new ModalBuilder().setCustomId('lja_register_form').setTitle('IC-Registrierung');
 for(const [id,label]of [['firstName','IC-Vorname'],['lastName','IC-Nachname'],['phone','IC-Telefonnummer']])modal.addComponents(row(new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(TextInputStyle.Short).setMaxLength(50).setRequired(true)));
 return await i.showModal(modal);
 }
 await i.deferReply({flags:64});if(locks.has(i.user.id))return await i.editReply('Deine Registrierung wird bereits gespeichert.');locks.add(i.user.id);
 try{
 const firstName=i.fields.getTextInputValue('firstName').trim(),lastName=i.fields.getTextInputValue('lastName').trim(),phone=i.fields.getTextInputValue('phone').trim();
 if(!firstName||!lastName||!phone)throw Error('Bitte alle drei Pflichtfelder ausfüllen.');
 if(!/^[+\d][\d\s()+.\/-]{1,48}$/.test(phone))throw Error('Bitte eine gültige IC-Telefonnummer eingeben.');
 // Erst Daten sichern, dann freischalten. Bei Rollenfehlern ermöglicht erneutes Klicken die Wiederholung.
 const latest=store.read();latest.profiles||={};latest.profiles[i.user.id]={firstName,lastName,phone,registeredAt:new Date().toISOString()};store.write(latest);
 await member.roles.add(CITIZEN,'IC-Registrierung abgeschlossen');
 return await i.editReply('Registrierung abgeschlossen. Die Bürgerkanäle sind freigeschaltet. Deine IC-Daten werden für Tickets übernommen.');
 }finally{locks.delete(i.user.id);}
 }catch(e){console.error('Registrierung:',e.code||e.message);const content='Registrierung fehlgeschlagen: '+e.message;if(i.replied||i.deferred)await i.editReply({content}).catch(()=>{});else await i.reply({content,flags:64}).catch(()=>{});}
}
async function publish(client){
 const channel=await client.channels.fetch(WELCOME);let found;let before;
 while(true){const batch=await channel.messages.fetch({limit:100,...(before?{before}:{})});if(!batch.size)break;for(const m of batch.values())if(m.author.id===client.user.id&&m.components.some(r=>r.components.some(c=>c.customId==='lja_register'))){if(!found){await m.edit(panel());found=m;}else await m.delete();}if(batch.size<100)break;before=batch.last().id;}
 if(!found)found=await channel.send(panel());return found.id;
}
module.exports={panel,handle,invite,publish};


