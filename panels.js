const {EmbedBuilder,ActionRowBuilder,ButtonBuilder,ButtonStyle,StringSelectMenuBuilder,ModalBuilder,TextInputBuilder,TextInputStyle,ChannelType}=require('discord.js');
const fs=require('fs'),path=require('path');
const VERSION='2026-11-panels-v1';
const APPROVER='1485673349098111170';
const ROLES={
'1477932047665332338':'⚖️ Department of Justice',
'1493622795421352026':'🕵️‍♂️ Federal Investigation Bureau',
'1477932513597984862':'🚓 International Affairs Agency',
'1493623199748067328':'🪖 United States Army Cooperation',
'1493622167676522557':'🚔 Los Santos Police Department',
'1493622176681558027':'🚓 Blaine County Sheriff Department',
'1493623748430135387':'⚕️ Los Santos Medical Department'};
const CHANNELS={philosophie:'1477946486330364036',regelwerk:'1477943304694923397',honorare:'1489239488705331240',punkte:'1478026700859244584',tickets:'1477737326343094483',changelog:'1570467201352335635'};
// Reserviert für eine spätere Bewerbungsphase, noch ohne zusätzliche Aktionen.
const APPLICATION_NEXT_CATEGORY='1570448935992954921';
const row=(...components)=>new ActionRowBuilder().addComponents(...components);
const button=(id,label,style=ButtonStyle.Primary)=>new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style);
const embed=(title,description)=>new EmbedBuilder().setColor(0xD4AF37).setTitle(title).setDescription(description).setFooter({text:'Liberty Justice Associates | Kanzleiverwaltung'});
function split(text,max=1900){const parts=[];let part='';for(const line of text.trim().split('\n')){if((part+'\n'+line).length>max){parts.push(part);part='';}part+=(part?'\n':'')+line;}if(part)parts.push(part);return parts;}
module.exports=function({client,hasRole,ADMIN_ROLE_IDS,TICKET_CATEGORIES,readJson,writeJson,DATA_DIR}){
 const file=path.join(DATA_DIR,'panels.json');
 const state=()=>readJson(file);
 const save=s=>writeJson(file,s);
 const admin=i=>i.guildId==='1477731363082993665'&&hasRole(i.member,ADMIN_ROLE_IDS);
 const locks=new Set();
 function ticketPayload(){return {embeds:[embed('Liberty Justice Associates','Willkommen bei Liberty Justice Associates.\n\nBitte wähle die passende Ticketart für dein Anliegen:\n\n⚖️ Notfall / Strafverteidigung\n🏛️ Klage gegen Staat / Amtshaftung\n📜 Verträge / Unternehmen\n💼 Bewerbungen\n🚩 Beschwerde\n⚡ Rollenanfrage')],components:[row(new StringSelectMenuBuilder().setCustomId('lja_ticket_type').setPlaceholder('Ticketart auswählen').addOptions([...Object.entries(TICKET_CATEGORIES).map(([value,c])=>({label:c.label,value,emoji:c.emoji})),{label:'Rollenanfrage',value:'rollen',emoji:'⚡'}]))]};}
 async function publish(key,target){
 if(locks.has('publish:'+key))throw Error('Dieses Panel wird gerade aktualisiert.');locks.add('publish:'+key);
 try{
 const channel=await client.channels.fetch(target||CHANNELS[key]);if(!channel?.isTextBased())throw Error('Textkanal nicht gefunden.');
 let payloads;
 if(['philosophie','regelwerk','honorare'].includes(key)){
 payloads=split(fs.readFileSync(path.join(__dirname,key+'.txt'),'utf8')).map(content=>({content,allowedMentions:{parse:[]}}));
 if(key!=='honorare')payloads.at(-1).components=[row(button('lja_deco','IN KENNTNIS GENOMMEN',ButtonStyle.Success).setDisabled(true))];
 }else if(key==='tickets')payloads=[ticketPayload()];
 else if(key==='punkte')payloads=[{embeds:[embed('LIBERTY JUSTICE ASSOCIATES','**Punkteübersicht**\n\nErstelle einen Punkt, damit du schnell gefunden wirst. Dein Eintrag wird nach 30 Minuten automatisch gelöscht.')],components:[row(button('lja_point','PUNKT ERSTELLEN',ButtonStyle.Success))]}];
 else if(key==='admin')payloads=[{embeds:[embed('LIBERTY JUSTICE ASSOCIATES','**Botverwaltung**\n\nPanels gesammelt oder einzeln aktualisieren. Der Neustart verbindet den Bot neu und gleicht die Panels ab.')],components:[row(button('lja_admin_all','ALLE PANELS AKTUALISIEREN'),button('lja_admin_restart','BOT NEU STARTEN',ButtonStyle.Danger)),row(new StringSelectMenuBuilder().setCustomId('lja_admin_publish').setPlaceholder('Einzelnes Panel aktualisieren').addOptions(Object.keys(CHANNELS).filter(k=>k!=='changelog').map(k=>({label:k,value:k}))))]}];
 else if(key==='changelog')payloads=[{embeds:[embed('⚖️ LIBERTY JUSTICE ASSOCIATES','**Changelog · Kanzleiverwaltung**\n━━━━━━━━━━━━━━━━━━━━\n• Philosophie, Regelwerk und Honorarordnung veröffentlicht.\n• Sechs Ticketarten mit IC-Telefonnummer und Bewerbungsformular.\n• Rollenanfragen mit Freigabe, Ablehnung und Rollenvergabe.\n• Punkte-Panel mit automatischer Löschung nach 30 Minuten.\n• Botverwaltung und automatische Panel-Aktualisierung.\n━━━━━━━━━━━━━━━━━━━━\n*Präzision. Integrität. Durchsetzungskraft.*')]}];
 if(!payloads)throw Error('Unbekanntes Panel.');
 const s=state();const old=s[key];const ids=[];
 for(let n=0;n<payloads.length;n++){
 const payload={...payloads[n],allowedMentions:{parse:[]}};
 let msg=old?.channel===channel.id&&old.ids[n]?await channel.messages.fetch(old.ids[n]).catch(e=>{if(e.code===10008)return null;throw e;}):null;
 if(msg&&msg.author.id===client.user.id)await msg.edit({...payload,components:payload.components||[],embeds:payload.embeds||[]});else msg=await channel.send(payload);
 ids.push(msg.id);
 const current=state();current[key]={channel:channel.id,ids:[...ids,...(old?.channel===channel.id?old.ids.slice(n+1):[])]};save(current);
 }
 if(old){const previous=await client.channels.fetch(old.channel);for(const id of old.ids.filter(id=>!ids.includes(id))){const m=await previous.messages.fetch(id).catch(()=>null);if(m?.author.id===client.user.id)await m.delete();}}
 // Alte Ticket-Panels aus der bisherigen Implementierung gezielt entfernen.
 if(key==='tickets'){let before;while(true){const batch=await channel.messages.fetch({limit:100,...(before?{before}:{})});for(const m of batch.values())if(!ids.includes(m.id)&&m.author.id===client.user.id&&m.components.some(r=>r.components.some(c=>c.customId==='lja_ticket_type')))await m.delete();if(batch.size<100)break;before=batch.last().id;}}
 const current=state();current[key]={channel:channel.id,ids};save(current);
 }finally{locks.delete('publish:'+key);}}
 async function all(){const errors=[];for(const key of Object.keys(CHANNELS).filter(k=>k!=='changelog'))try{await publish(key);}catch(e){console.error(key,e);errors.push(key+': '+e.message);}if(errors.length)throw Error(errors.join('\n'));}
 async function sweep(){const s=state();for(const [id,p] of Object.entries(s.points||{})){if(p.expires>Date.now())continue;try{const c=await client.channels.fetch(CHANNELS.punkte);const m=await c.messages.fetch(p.message).catch(e=>{if(e.code===10008)return null;throw e;});if(m)await m.delete();const latest=state();delete latest.points[id];save(latest);}catch(e){console.error('Punkt löschen:',e);}}}
 async function chooseRole(i){await i.deferReply({ephemeral:true});return i.editReply({content:'Welche Rolle möchtest du anfragen?',components:[row(new StringSelectMenuBuilder().setCustomId('lja_role_select').setPlaceholder('Rolle auswählen').addOptions(Object.entries(ROLES).map(([value,label])=>({label,value}))))]});}
 client.on('interactionCreate',async i=>{try{
 if(i.isChatInputCommand()&&i.commandName==='bot-panel'){
 if(!admin(i))return i.reply({content:'Keine Berechtigung.',ephemeral:true});await i.deferReply({ephemeral:true});await publish('admin',i.channelId);return i.editReply('Botverwaltung veröffentlicht.');}
 if(i.customId?.startsWith('lja_admin_')){
 if(!admin(i))return i.reply({content:'Keine Berechtigung.',ephemeral:true});await i.deferReply({ephemeral:true});
 if(i.customId==='lja_admin_publish')await publish(i.values[0]);else await all();
 if(i.customId==='lja_admin_restart'){await i.editReply('Panels aktualisiert. Bot wird neu verbunden.');await client.destroy();await client.login(process.env.DISCORD_TOKEN);return;}
 return i.editReply('Panels erfolgreich aktualisiert.');}
 if(i.customId==='lja_point'){
 if(i.channelId!==CHANNELS.punkte)return;
 if(locks.has('point:'+i.user.id))return i.reply({content:'Dein Punkt wird bereits erstellt.',ephemeral:true});locks.add('point:'+i.user.id);
 try{await i.deferReply({ephemeral:true});const s=state();s.points||={};if(s.points[i.user.id])return i.editReply('Du hast bereits einen aktiven Punkt.');
 const msg=await i.channel.send({content:`• <@${i.user.id}> — ${i.user.username.replace(/[@*_`~|<>]/g,'')}\nWird nach 30 Minuten gelöscht.`,allowedMentions:{users:[i.user.id]}});s.points[i.user.id]={message:msg.id,expires:Date.now()+1800000};const latest=state();latest.points||={};latest.points[i.user.id]=s.points[i.user.id];save(latest);await i.editReply('Punkt erstellt.');}finally{locks.delete('point:'+i.user.id);}return;}
 if(i.customId==='lja_role_select'){
 const role=i.values[0];if(!ROLES[role])throw Error('Ungültige Rolle.');
 const modal=new ModalBuilder().setCustomId('lja_role_form_'+role).setTitle('Rollenanfrage');for(const [id,label]of [['first','IC-Vorname'],['last','IC-Nachname']])modal.addComponents(row(new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(50)));return await i.showModal(modal);}
 if(i.isModalSubmit()&&i.customId.startsWith('lja_role_form_')){
 const role=i.customId.slice('lja_role_form_'.length);if(!ROLES[role])throw Error('Ungültige Rolle.');await i.deferReply({ephemeral:true});
 const first=i.fields.getTextInputValue('first').trim(),last=i.fields.getTextInputValue('last').trim();if(!first||!last)throw Error('Bitte beide Namen ausfüllen.');
 const c=await i.guild.channels.fetch('1570462925402021920'); if(!c || c.type!==ChannelType.GuildText)throw Error('Der Rollenanfrage-Zielkanal muss ein Textkanal sein.');
 const m=await c.send({content:`<@&${APPROVER}>`,allowedMentions:{roles:[APPROVER]},embeds:[embed('⚡ Rollenanfrage',`**IC-Name:** ${first} ${last}\n**Discord:** <@${i.user.id}>\n**Discord-ID:** ${i.user.id}\n**Gewünschte Rolle:** ${ROLES[role]}\n**Status:** Offen`)],components:[row(button('lja_role_accept','ANNEHMEN',ButtonStyle.Success),button('lja_role_reject','ABLEHNEN',ButtonStyle.Danger))]});
 const s=state();s.requests||={};s.requests[m.id]={user:i.user.id,role,first,last,status:'open'};save(s);return i.editReply(`Rollenanfrage erstellt: ${c}`);}
 if(['lja_role_accept','lja_role_reject'].includes(i.customId)){
 if(!admin(i)&&!i.member.roles.cache.has(APPROVER))return i.reply({content:'Keine Berechtigung zur Freigabe.',ephemeral:true});
 if(locks.has(i.message.id))return i.reply({content:'Anfrage wird bereits bearbeitet.',ephemeral:true});locks.add(i.message.id);
 try{await i.deferReply({ephemeral:true});const s=state(),r=s.requests?.[i.message.id];if(!r||r.status!=='open')return i.editReply('Anfrage wurde bereits entschieden.');const accept=i.customId==='lja_role_accept';
 if(accept){if(!ROLES[r.role])throw Error('Rolle nicht freigegeben.');const member=await i.guild.members.fetch(r.user);await member.roles.add(r.role,`Freigegeben von ${i.user.tag} (${i.user.id})`);}
 r.status=accept?'accepted':'rejected';r.reviewer=i.user.id;r.reviewedAt=new Date().toISOString();const latest=state();latest.requests[i.message.id]=r;save(latest);
 await i.message.edit({embeds:[embed('⚡ Rollenanfrage',`**IC-Name:** ${r.first} ${r.last}\n**Discord:** <@${r.user}> (${r.user})\n**Rolle:** ${ROLES[r.role]}\n**Status:** ${accept?'Angenommen':'Abgelehnt'}\n**Entschieden von:** ${i.user.tag} · <@${i.user.id}> · ID: ${i.user.id}`)],components:[],allowedMentions:{parse:[]}});await i.editReply(accept?'Rolle vergeben.':'Anfrage abgelehnt.');}finally{locks.delete(i.message.id);}return;}
 }catch(e){console.error('Panel-Interaktion:',e);const payload={content:'Aktion fehlgeschlagen: '+e.message,ephemeral:true};if(i.deferred||i.replied)await i.editReply({content:payload.content}).catch(()=>{});else await i.reply(payload).catch(()=>{});}});
 let timer;
 return {publish,chooseRole,async start(){await sweep();if(!timer){timer=setInterval(()=>sweep().catch(console.error),15000);timer.unref();}await all();const s=state();if(s.version!==VERSION){await publish('changelog');const latest=state();latest.version=VERSION;save(latest);}if(s.admin)await publish('admin',s.admin.channel);}};
};



