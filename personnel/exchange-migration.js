const fs=require('fs'),path=require('path'),crypto=require('crypto');const {ChannelType,PermissionFlagsBits:P,EmbedBuilder,AttachmentBuilder}=require('discord.js');const C=require('./config'),S=require('./store');
async function collect(ch){const result=[];let before;while(true){const batch=await ch.messages.fetch({limit:100,...(before?{before}:{})});if(!batch.size)break;result.push(...batch.values());if(batch.size<100)break;before=batch.last().id;}return result.sort((a,b)=>a.createdTimestamp-b.createdTimestamp);}
const rawEmbed=e=>typeof e.toJSON==='function'?e.toJSON():structuredClone(e);
function hash(m){return crypto.createHash('sha256').update(JSON.stringify({text:m.content,edited:m.editedTimestamp||null,embeds:m.embeds.map(rawEmbed),attachments:[...m.attachments.values()].map(a=>({id:a.id,name:a.name,size:a.size}))})).digest('hex');}
function chunks(text,max=1700){const result=[];while(text.length){let end=Math.min(max,text.length);if(end<text.length&&/[\uD800-\uDBFF]/.test(text[end-1]))end--;result.push(text.slice(0,end));text=text.slice(end);}return result.length?result:[''];}
async function copy(message,target,directory,botId){
 const files=[];for(const [index,a]of [...message.attachments.values()].entries()){
 const url=new URL(a.url);if(url.protocol!=='https:'||!['cdn.discordapp.com','media.discordapp.net'].includes(url.hostname))throw Error('Anhang hat eine unbekannte Quelle. Alter Kanal bleibt erhalten.');const response=await fetch(url);if(!response.ok)throw Error('Anhang konnte nicht gesichert werden. Alter Kanal bleibt erhalten.');const name=(a.name||'anhang.bin').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').replace(/[. ]+$/,'').slice(0,170)||'anhang.bin';const file=path.join(directory,`${message.id}-${index}-${name}`);fs.writeFileSync(file,Buffer.from(await response.arrayBuffer()));files.push({file,name,url:a.url});
 }
 const embeds=message.embeds.map(e=>{const data=rawEmbed(e);delete data.type;delete data.provider;delete data.video;for(const key of ['image','thumbnail'])if(data[key]?.url){const f=files.find(f=>f.url===data[key].url);data[key]={url:f?'attachment://'+f.name:data[key].url};}return EmbedBuilder.from(data);});
 const who=message.member?.displayName||message.author?.username||'Unbekannt',when=new Date(message.createdTimestamp).toLocaleString('de-DE',{timeZone:'Europe/Berlin'});const header=`**Übernommener Verlauf · ${when}**\n**Von:** ${who} · Discord-ID ${message.author.id}\n`;
 const parts=chunks(message.content||'');const ids=[];for(let i=0;i<parts.length;i++){const m=await target.send({content:header+(parts[i]||(!embeds.length&&!files.length?'_Nachricht ohne Text_':'')),embeds:i===0?embeds:[],files:i===0?files.map(f=>new AttachmentBuilder(f.file,{name:f.name})):[],allowedMentions:{parse:[]}});if(m.author.id!==botId)throw Error('Übernommene Nachricht konnte nicht bestätigt werden.');ids.push(m.id);}return {ids,files:files.map(f=>f.file)};
}
module.exports=async function migrate(api,id){
 let e=S.read().employees[id];if(!e?.forumId)throw Error('Personalakte fehlt.');const forum=await api.channel(e.forumId);if(!forum||forum.type!==ChannelType.GuildForum||forum.guildId!==C.GUILD)throw Error('Personalforum ungültig.');
 const tags=[...forum.availableTags];for(const name of C.TAGS)if(!tags.some(t=>t.name===name))tags.push({name,moderated:false,emoji:{name:C.TAG_EMOJI[name]}});await forum.setAvailableTags(tags.map(t=>({id:t.id,name:t.name,moderated:t.moderated,emoji:C.TAG_EMOJI[t.name]?{name:C.TAG_EMOJI[t.name]}:t.emoji})));
 const target=await api.ensureExchange(id);if(target.parentId!==forum.id)throw Error('Austausch gehört nicht zur Personalakte.');
 const sourceId=e.exchangeMigration?.sourceId||((e.portalId&&e.portalId!==target.id)?e.portalId:null);const source=sourceId?await api.channel(sourceId):null;
 const directory=path.join(S.DIR,'exchange-migration',id);fs.mkdirSync(directory,{recursive:true});
 if(source&&source.type!==ChannelType.GuildText)throw Error('Es werden ausschließlich bisherige Text-Austauschkanäle entfernt.');
 if(source&&source.guildId!==C.GUILD)throw Error('Austausch gehört zu einem anderen Server.');
 let previous;
 try{
 if(source){
 previous=source.permissionOverwrites.cache.map(o=>({id:o.id,type:o.type,allow:o.allow.bitfield.toString(),deny:o.deny.bitfield.toString()}));
 if(!e.exchangeMigration)S.change(s=>s.employees[id].exchangeMigration={sourceId,sourcePanelId:e.portalMessageId,startedAt:new Date().toISOString(),copied:{},permissions:previous});
 fs.writeFileSync(path.join(directory,'permissions.json'),JSON.stringify(S.read().employees[id].exchangeMigration.permissions,null,2));
 const locked=previous.map(o=>({...o,allow:BigInt(o.allow)&~(P.SendMessages|P.SendMessagesInThreads),deny:BigInt(o.deny)|P.SendMessages|P.SendMessagesInThreads}));await source.permissionOverwrites.set(locked,'Austausch wird vollständig in die Personalakte übernommen');
 const history=await collect(source);fs.writeFileSync(path.join(directory,'messages-'+Date.now()+'.json'),JSON.stringify(history.map(m=>m.toJSON()),null,2));
 for(const message of history){const current=S.read().employees[id].exchangeMigration;if(message.id===current.sourcePanelId)continue;const checksum=hash(message);if(current.copied[message.id]?.hash===checksum)continue;const result=await copy(message,target,directory,api.client.user.id);S.change(s=>s.employees[id].exchangeMigration.copied[message.id]={...result,hash:checksum});}
 const after=await collect(source),saved=S.read().employees[id].exchangeMigration;
 for(const message of after)if(message.id!==saved.sourcePanelId&&saved.copied[message.id]?.hash!==hash(message))throw Error('Der bisherige Verlauf wurde während der Übernahme verändert. Bitte Abgleich erneut ausführen.');
 for(const record of Object.values(saved.copied))for(const messageId of record.ids){const m=await target.messages.fetch(messageId);if(m.author.id!==api.client.user.id)throw Error('Kopie fehlt im neuen Austausch.');}
 }
 S.change(s=>{const record=s.employees[id];if(record.portalId!==target.id){record.portalId=target.id;record.portalMessageId=null;delete record.portalSignature;}record.exchangeIntegratedAt=new Date().toISOString();});
 await api.applyAccess(id,e.status==='active'?id:null);await api.refreshPortal(id);
 const updated=S.read().employees[id];const panel=await target.messages.fetch(updated.portalMessageId);if(panel.author.id!==api.client.user.id||!panel.embeds.length)throw Error('Unterlagenpanel fehlt im integrierten Austausch.');
 if(source){await source.delete('Vollständiger Austausch und Statuspanel in Mitarbeiterakte übernommen; vom Nutzer freigegebene Entfernung');S.change(s=>s.employees[id].exchangeMigration.deletedAt=new Date().toISOString());}
 return {id,exchangeId:target.id,oldChannelDeleted:Boolean(source),messagesCopied:Object.keys(S.read().employees[id].exchangeMigration?.copied||{}).length};
 }catch(error){if(source&&previous)await source.permissionOverwrites.set(previous.map(o=>({...o,allow:BigInt(o.allow),deny:BigInt(o.deny)})),'Übernahme fehlgeschlagen: bisherige Rechte wiederherstellen').catch(()=>{});throw error;}
};
module.exports.collect=collect;
