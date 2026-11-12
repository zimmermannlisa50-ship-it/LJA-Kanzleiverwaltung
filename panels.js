const {EmbedBuilder,ActionRowBuilder,ButtonBuilder,ButtonStyle,StringSelectMenuBuilder,ModalBuilder,TextInputBuilder,TextInputStyle,ChannelType}=require('discord.js');
const fs=require('fs'),path=require('path');
const publishChangelogs=require('./changelog');
const ticketRouting=require('./ticket-routing')();
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
module.exports=function({client,hasRole,ADMIN_ROLE_IDS,TICKET_CATEGORIES,readJson,writeJson,DATA_DIR,registrationRow}){
 const file=path.join(DATA_DIR,'panels.json');
 const state=()=>readJson(file);
 const save=s=>writeJson(file,s);
 const admin=i=>i.guildId==='1477731363082993665'&&hasRole(i.member,ADMIN_ROLE_IDS);
 const locks=new Set();
 function ticketPayload(){return {embeds:[embed('Liberty Justice Associates','Willkommen bei Liberty Justice Associates.\n\nBitte wähle die passende Ticketart für dein Anliegen:\n\n⚖️ Notfall / Strafverteidigung\n🏛️ Klage gegen Staat / Amtshaftung\n💬 Allgemeine Rechtsberatung\n📜 Verträge / Unternehmen\n💼 Bewerbungen\n🚩 Beschwerde\n⚡ Rollenanfrage')],components:[row(new StringSelectMenuBuilder().setCustomId(ticketRouting.menuId()).setPlaceholder('Ticketart auswählen').addOptions([...Object.entries(TICKET_CATEGORIES).map(([value,c])=>({label:c.label,value,emoji:c.emoji})),{label:'Rollenanfrage',value:'rollen',emoji:'⚡'}]))]};}
 async function publish(key,target){
 if(key==='changelog'){if(locks.has('changelog'))throw Error('Changelog wird bereits veröffentlicht.');locks.add('changelog');try{const record=await publishChangelogs(client,target||CHANNELS.changelog);const current=state();current.changelog=record;save(current);return;}finally{locks.delete('changelog');}}
 if(locks.has('publish:'+key))throw Error('Dieses Panel wird gerade aktualisiert.');locks.add('publish:'+key);
 try{
 const channel=await client.channels.fetch(target||CHANNELS[key]);if(!channel?.isTextBased())throw Error('Textkanal nicht gefunden.');
 let payloads; let documentText;
 if(['philosophie','regelwerk','honorare'].includes(key)){
 documentText=fs.readFileSync(path.join(__dirname,key+'.txt'),'utf8');
 payloads=require('./document-panels').render(key,documentText);
 if(key==='regelwerk')payloads.at(-1).components=[registrationRow?registrationRow():require('./registration').acceptanceRow()];
 else if(key==='philosophie')payloads.at(-1).components=[row(button('lja_deco','IN KENNTNIS GENOMMEN',ButtonStyle.Success).setDisabled(true))];
 }else if(key==='tickets')payloads=[ticketPayload()];
 else if(key==='punkte')payloads=[{embeds:[embed('LIBERTY JUSTICE ASSOCIATES','**Punkteübersicht**\n\nErstelle einen Punkt, damit du schnell gefunden wirst. Dein Eintrag wird nach 3 Minuten automatisch gelöscht.')],components:[row(button('lja_point','PUNKT ERSTELLEN',ButtonStyle.Success))]}];
 else if(key==='admin')payloads=[{embeds:[embed('LIBERTY JUSTICE ASSOCIATES','**Botverwaltung**\n\nPanels gesammelt oder einzeln aktualisieren. Der Neustart verbindet den Bot neu und gleicht die Panels ab.')],components:[row(button('lja_admin_all','ALLE PANELS AKTUALISIEREN'),button('lja_admin_restart','BOT NEU STARTEN',ButtonStyle.Danger)),row(new StringSelectMenuBuilder().setCustomId('lja_admin_publish').setPlaceholder('Einzelnes Panel aktualisieren').addOptions(Object.keys(CHANNELS).filter(k=>k!=='changelog').map(k=>({label:k,value:k}))))]}];
 if(!payloads)throw Error('Unbekanntes Panel.');
 const old=state()[key];const ids=[];
 // Auch ohne lokale IDs die eigenen Panels im Discord-Verlauf erkennen.
 const componentIds={tickets:['lja_ticket_type'],punkte:['lja_point'],admin:['lja_admin_all','lja_admin_restart','lja_admin_publish']};
 const normalize=text=>String(text||'').replace(/\s+/g,' ').trim();
 const documentContent=normalize(documentText);
 const matches=m=>{
 if(m.author.id!==client.user.id)return false;
 if(old?.channel===channel.id&&old.ids?.includes(m.id))return true;
 if(m.components?.some(r=>r.components.some(c=>((componentIds[key]||[]).includes(c.customId)||(key==='tickets'&&ticketRouting.isMenu(c.customId))))))return true;
 if(payloads.some(p=>p.content&&p.content===m.content))return true;
 if(documentText&&split(documentText).includes(m.content))return true;
 if(documentText&&require('./document-panels').matches(key,m))return true;

 return payloads.some(p=>p.embeds?.some(e=>m.embeds?.some(previous=>previous.title===e.data.title&&previous.description===e.data.description)));
 };
 const history=[];let before;
 while(true){
 const batch=await channel.messages.fetch({limit:100,...(before?{before}:{})});
 if(!batch.size)break;
 history.push(...batch.values());
 if(batch.size<100)break;before=batch.last().id;
 }
 const completeDocumentParts=new Set();
 if(documentContent){
 const chronological=[...history].reverse();
 for(let start=0;start<chronological.length;start++){
 let joined='',spaced='';const group=[];
 for(let end=start;end<chronological.length;end++){
 const message=chronological[end];
 if(message.author.id!==client.user.id||!message.content)break;
 joined+=message.content;spaced+=(spaced?'\n':'')+message.content;group.push(message.id);
 const exact=normalize(joined),withBreaks=normalize(spaced);
 if(exact===documentContent||withBreaks===documentContent){for(const id of group)completeDocumentParts.add(id);break;}
 if(!documentContent.startsWith(exact)&&!documentContent.startsWith(withBreaks))break;
 }
 }
 }
 for(const message of history)if(matches(message)||completeDocumentParts.has(message.id))await message.delete();
 if(old&&old.channel!==channel.id){
 const previous=await client.channels.fetch(old.channel);
 for(const id of old.ids||[]){const m=await previous.messages.fetch(id).catch(e=>{if(e.code===10008)return null;throw e;});if(m?.author.id===client.user.id)await m.delete();}
 }
 {const current=state();current[key]={channel:channel.id,ids:[]};save(current);}
 for(const payload of payloads){
 const msg=await channel.send({...payload,allowedMentions:{parse:[]}});ids.push(msg.id);
 const current=state();current[key]={channel:channel.id,ids:[...ids]};save(current);
 }
 const current=state();current[key]={channel:channel.id,ids};save(current);
 }finally{locks.delete('publish:'+key);}}
 async function all(){const errors=[];for(const key of Object.keys(CHANNELS).filter(k=>k!=='changelog'))try{await publish(key);}catch(e){console.error(key,e);errors.push(key+': '+e.message);}if(errors.length)throw Error(errors.join('\n'));}
 async function sweep(){const s=state();for(const [id,p] of Object.entries(s.points||{})){if(p.expires>Date.now())continue;try{const c=await client.channels.fetch(CHANNELS.punkte);const m=await c.messages.fetch(p.message).catch(e=>{if(e.code===10008)return null;throw e;});if(m)await m.delete();const latest=state();delete latest.points[id];save(latest);}catch(e){console.error('Punkt löschen:',e);}}}
 async function chooseRole(i){await i.deferReply({flags:64});return i.editReply({content:'Welche Rolle möchtest du anfragen?',components:[row(new StringSelectMenuBuilder().setCustomId('lja_role_select').setPlaceholder('Rolle auswählen').addOptions(Object.entries(ROLES).map(([value,label])=>({label,value}))))]});}
 client.on('interactionCreate',async i=>{try{
 if(i.isChatInputCommand()&&i.commandName==='bot-panel'){
 if(!admin(i))return i.reply({content:'Keine Berechtigung.',flags:64});await i.deferReply({flags:64});await publish('admin',i.channelId);return i.editReply('Botverwaltung veröffentlicht.');}
 if(i.customId?.startsWith('lja_admin_')){
 if(!admin(i))return i.reply({content:'Keine Berechtigung.',flags:64});await i.deferReply({flags:64});
 if(i.customId==='lja_admin_publish')await publish(i.values[0]);else await all();
 if(i.customId==='lja_admin_restart'){await i.editReply('Panels aktualisiert. Bot wird neu verbunden.');await client.destroy();await client.login(process.env.DISCORD_TOKEN);return;}
 return i.editReply('Panels erfolgreich aktualisiert.');}
 if(i.customId==='lja_point'){
 if(i.channelId!==CHANNELS.punkte)return;
 if(locks.has('point:'+i.user.id))return i.reply({content:'Dein Punkt wird bereits erstellt.',flags:64});locks.add('point:'+i.user.id);
 try{await i.deferReply({flags:64});const s=state();s.points||={};if(s.points[i.user.id])return i.editReply('Du hast bereits einen aktiven Punkt.');
 const msg=await i.channel.send({content:`• <@${i.user.id}> — ${i.user.username.replace(/[@*_`~|<>]/g,'')}\nWird nach 3 Minuten gelöscht.`,allowedMentions:{users:[i.user.id]}});s.points[i.user.id]={message:msg.id,expires:Date.now()+180000};const latest=state();latest.points||={};latest.points[i.user.id]=s.points[i.user.id];save(latest);await i.editReply('Punkt erstellt.');}finally{locks.delete('point:'+i.user.id);}return;}
 if(i.customId==='lja_role_select'){
 const role=i.values[0];if(!ROLES[role])throw Error('Ungültige Rolle.');
 const modal=new ModalBuilder().setCustomId('lja_role_form_'+role).setTitle('Rollenanfrage');for(const [id,label]of [['first','IC-Vorname'],['last','IC-Nachname']])modal.addComponents(row(new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(50)));return await i.showModal(modal);}
 if(i.isModalSubmit()&&i.customId.startsWith('lja_role_form_')){
 const role=i.customId.slice('lja_role_form_'.length);if(!ROLES[role])throw Error('Ungültige Rolle.');await i.deferReply({flags:64});
 const first=i.fields.getTextInputValue('first').trim(),last=i.fields.getTextInputValue('last').trim();if(!first||!last)throw Error('Bitte beide Namen ausfüllen.');
 const c=await i.guild.channels.fetch('1570462925402021920'); if(!c || c.type!==ChannelType.GuildText)throw Error('Der Rollenanfrage-Zielkanal muss ein Textkanal sein.');
 const m=await c.send({content:`<@&${APPROVER}>`,allowedMentions:{roles:[APPROVER]},embeds:[embed('⚡ Rollenanfrage',`**IC-Name:** ${first} ${last}\n**Discord:** <@${i.user.id}>\n**Discord-ID:** ${i.user.id}\n**Gewünschte Rolle:** ${ROLES[role]}\n**Status:** Offen`)],components:[row(button('lja_role_accept','ANNEHMEN',ButtonStyle.Success),button('lja_role_reject','ABLEHNEN',ButtonStyle.Danger))]});
 const s=state();s.requests||={};s.requests[m.id]={user:i.user.id,role,first,last,status:'open'};save(s);return i.editReply(`Rollenanfrage erstellt: ${c}`);}
 if(['lja_role_accept','lja_role_reject'].includes(i.customId)){
 const modulePath=require.resolve('./role-decisions');delete require.cache[modulePath];
 return await require(modulePath)(i,{client,ROLES,state,save,locks,authorized:admin(i)||i.member.roles.cache.has(APPROVER)});
 }
 }catch(e){require('./bot-diagnostics').error('Panel-Interaktion',e,i);if([10062,40060].includes(Number(e.code)))return;const payload={content:'Aktion fehlgeschlagen: '+e.message,flags:64};if(i.deferred||i.replied)await i.editReply({content:payload.content}).catch(()=>{});else await i.reply(payload).catch(()=>{});}});
 let timer;
 return {publish,chooseRole,async start(){await sweep();if(!timer){timer=setInterval(()=>sweep().catch(console.error),15000);timer.unref();}if(process.env.LJA_SKIP_PANEL_REFRESH!=='1'){await all();await publish('changelog');const s=state();if(s.admin)await publish('admin',s.admin.channel);}}};
};












