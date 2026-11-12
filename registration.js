const {ActionRowBuilder,ButtonBuilder,ButtonStyle,EmbedBuilder,ModalBuilder,TextInputBuilder,TextInputStyle}=require('discord.js');
const store=require('./registration-store');
const GUILD='1477731363082993665',CITIZEN='1477932235842654299',WELCOME='1477731364403941540',RULES='1477943304694923397';
const row=input=>new ActionRowBuilder().addComponents(input);
const locks=store.locks;
function instanceId(){const state=store.read();if(!state.instanceId){state.instanceId=require('crypto').randomUUID().replace(/-/g,'');store.write(state);}return state.instanceId;}
function buttonId(){return `lja_reg:v2:${instanceId()}:accept`;}
function formId(){return `lja_reg:v2:${instanceId()}:rules-form`;}
function panel(){return {content: 'Bitte lies unser Kanzleiregelwerk und klicke dort auf **REGELWERK AKZEPTIEREN**, um deine IC-Daten zu hinterlegen: https://discord.com/channels/'+GUILD+'/'+RULES,allowedMentions:{parse:[]}};}
function acceptanceRow({setup=false}={}){if(!store.read().active&&!setup)throw Error('Registrierung in dieser Botinstanz nicht aktiv; Regelwerk bleibt unverändert.');return row(new ButtonBuilder().setCustomId(buttonId()).setLabel('REGELWERK AKZEPTIEREN').setStyle(ButtonStyle.Success));}
async function currentMember(client,id){const guild=await client.guilds.fetch(GUILD);return guild.members.fetch({user:id,force:true});}
async function invite(member){
 if(member.guild.id!==GUILD||member.user.bot||!store.mustRegister(member.id))return;
 if(locks.has('invite:'+member.id))return;locks.add('invite:'+member.id);
 try{const data=store.read();if(data.invited?.[member.id])return;await member.send(panel());const latest=store.read();latest.invited||={};latest.invited[member.id]=new Date().toISOString();store.write(latest);}
 catch(e){console.error('Registrierung: Privatnachricht nicht zustellbar; Button im Kanzleiregelwerk.',e.code||e.message);}finally{locks.delete('invite:'+member.id);}
}
async function handle(client,i){
 if(!i.customId?.startsWith('lja_reg:v2:'))return;
 try{
 const state=store.read();if(!state.active)return;
 if(![buttonId(),formId()].includes(i.customId))return;
 if(i.guildId&&i.guildId!==GUILD)return;
 const member=i.customId===buttonId()?(client.guilds.cache.get(GUILD)?.members.cache.get(i.user.id)||await currentMember(client,i.user.id)):await currentMember(client,i.user.id);

 if(store.exempt(i.user.id))return await i.reply({content:'Du bist Bestandsmitglied und musst dich nicht registrieren.',flags:64});
 if(i.customId===buttonId()){
 if(store.profile(i.user.id)){await member.roles.add(CITIZEN,'Registrierung bereits abgeschlossen');return await i.reply({content:'Du bist bereits registriert.',flags:64});}
 const modal=new ModalBuilder().setCustomId(formId()).setTitle('IC-Registrierung');
 for(const [id,label]of [['firstName','IC-Vorname'],['lastName','IC-Nachname'],['phone','IC-Telefonnummer']])modal.addComponents(row(new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(TextInputStyle.Short).setMaxLength(50).setRequired(true)));
 return await i.showModal(modal);
 }
 await i.deferReply({flags:64});if(locks.has(i.user.id))return await i.editReply('Deine Registrierung wird bereits gespeichert.');locks.add(i.user.id);
 try{
 const firstName=i.fields.getTextInputValue('firstName').trim(),lastName=i.fields.getTextInputValue('lastName').trim(),phone=i.fields.getTextInputValue('phone').trim();
 if(!firstName||!lastName||!phone)throw Error('Bitte alle drei Pflichtfelder ausfüllen.');
 if(!/^[+\d][\d\s()+.\/-]{1,48}$/.test(phone))throw Error('Bitte eine gültige IC-Telefonnummer eingeben.');
 // Erst Daten sichern, dann freischalten. Bei Rollenfehlern ermöglicht erneutes Klicken die Wiederholung.
 const latest=store.read();latest.profiles||={};latest.profiles[i.user.id]={firstName,lastName,phone,registeredAt:new Date().toISOString(),rulesAcceptedAt:new Date().toISOString()};store.write(latest);
 await member.roles.add(CITIZEN,'Kanzleiregelwerk akzeptiert und IC-Registrierung abgeschlossen');
 return await i.editReply('Registrierung abgeschlossen. Die Bürgerkanäle sind freigeschaltet. Deine IC-Daten werden für Tickets übernommen.');
 }finally{locks.delete(i.user.id);}
 }catch(e){console.error('Registrierung:',e.code||e.message);const content='Registrierung fehlgeschlagen: '+e.message;if(i.replied||i.deferred)await i.editReply({content}).catch(()=>{});else await i.reply({content,flags:64}).catch(()=>{});}
}
async function publish(client,{setup=false}={}){
 const fs=require('fs'),path=require('path'),DATA_DIR=path.join(__dirname,'data');
 const panels=require('./panels')({client,hasRole:()=>false,ADMIN_ROLE_IDS:[],TICKET_CATEGORIES:{},DATA_DIR,registrationRow:()=>acceptanceRow({setup}),readJson:file=>fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{},writeJson:(file,data)=>fs.writeFileSync(file,JSON.stringify(data,null,2))});
 await panels.publish('regelwerk');
 const channel=await client.channels.fetch(WELCOME);let before;
 while(true){const batch=await channel.messages.fetch({limit:100,...(before?{before}:{})});if(!batch.size)break;const last=batch.last().id;
 for(const m of batch.values())if(m.author.id===client.user.id&&m.components.some(r=>r.components.some(c=>c.customId==='lja_register'||c.customId?.startsWith('lja_reg:v2:'))))await m.delete();
 if(batch.size<100)break;before=last;
 }
 const registry=JSON.parse(fs.readFileSync(path.join(DATA_DIR,'panels.json'),'utf8'));const id=registry.regelwerk.ids.at(-1);const config=store.read();config.panelId=id;config.panelChannelId=RULES;store.write(config);return id;
}
module.exports={panel,handle,invite,publish,buttonId,formId,acceptanceRow};





