const {ActionRowBuilder,ButtonBuilder,ButtonStyle}=require('discord.js');
const crypto=require('crypto');
const state=require('./ticket-close-state');
const ARCHIVE='1484218994608312553';
function buttonId(owner,action='ask',nonce=''){return `lja_close_v2:${owner}:${action}${nonce?':'+nonce:''}`;}
function hasTranscript(message,botId,ticket,channelId){return message.author?.id===botId&&[...message.attachments.values()].some(a=>a.name===`ticket-${ticket.ticketNumber}-${channelId}-transkript.html`&&a.size>0);}
async function remove(i,d,ticket){
 await i.editReply({content:`HTML-Transkript im Archiv gesichert: ${ticket.archiveUrl}\nDer Ticketkanal wird jetzt gelöscht.`,components:[]}).catch(e=>console.error('Schließbestätigung:',e.message));
 await i.channel.delete('Ticket nach Bestätigung geschlossen; HTML-Transkript erfolgreich im Kanzleiarchiv gesichert');
 const latest=d.getTickets();if(latest[i.channelId]){latest[i.channelId].deletedAt=new Date().toISOString();d.saveTickets(latest);}
}
module.exports=async function closeTicket(i,d){
 const prefix=`lja_close_v2:${d.owner}:`;if(!i.isButton()||!i.customId.startsWith(prefix))return;
 const [action,nonce]=i.customId.slice(prefix.length).split(':');if(!['ask','confirm','cancel'].includes(action))return;
 try{
 const ticket=d.getTickets()[i.channelId];if(!ticket)return await i.reply({content:'Ticketdaten fehlen. Bitte die Kanzleileitung informieren.',flags:64});
 const authorized=i.user.id===ticket.userId||i.user.id===ticket.handlerId||d.isLeadership(i.member);
 if(!authorized)return await i.reply({content:'Du bist nicht berechtigt, dieses Ticket zu schließen.',flags:64});
 if(action==='ask'){
 const now=Date.now();for(const [key,c]of state.confirmations)if(c.expires<now)state.confirmations.delete(key);
 const token=crypto.randomBytes(12).toString('hex');state.confirmations.set(token,{user:i.user.id,channel:i.channelId,expires:now+300000});
 const row=new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(buttonId(d.owner,'confirm',token)).setLabel('JA, TICKET SCHLIESSEN').setStyle(ButtonStyle.Danger),new ButtonBuilder().setCustomId(buttonId(d.owner,'cancel',token)).setLabel('ABBRECHEN').setStyle(ButtonStyle.Secondary));
 return await i.reply({content:'Möchtest du dieses Ticket wirklich schließen?\nDas HTML-Transkript wird im Kanzleiarchiv gespeichert. Anschließend wird dieser Ticketkanal endgültig gelöscht.',components:[row],flags:64});
 }
 const confirmation=state.confirmations.get(nonce);
 if(!confirmation||confirmation.user!==i.user.id||confirmation.channel!==i.channelId||confirmation.expires<Date.now())return await i.reply({content:'Diese Bestätigung ist abgelaufen. Bitte erneut auf „Ticket schließen“ klicken.',flags:64});
 if(action==='cancel'){state.confirmations.delete(nonce);return await i.update({content:'Schließen abgebrochen. Das Ticket bleibt erhalten.',components:[]});}
 if(state.locks.has(i.channelId))return await i.reply({content:'Dieses Ticket wird bereits geschlossen.',flags:64});
 state.locks.add(i.channelId);
 try{
 await i.deferUpdate();
 const archive=await i.client.channels.fetch(ARCHIVE);
 if(!archive?.isTextBased()||typeof archive.send!=='function'||archive.guildId!==i.guildId)throw Error('Der Transkriptkanal ist nicht erreichbar.');
 if(ticket.closed){
 if(ticket.archiveChannelId!==ARCHIVE||!ticket.archiveMessageId)throw Error('Kein gesichertes Transkript zum Löschen vorhanden.');
 const saved=await archive.messages.fetch(ticket.archiveMessageId);
 if(!hasTranscript(saved,i.client.user.id,ticket,i.channelId))throw Error('Das archivierte HTML-Transkript konnte nicht bestätigt werden.');
 await remove(i,d,ticket);state.confirmations.delete(nonce);return;
 }
 const closed={...ticket,closed:true,closedAt:new Date().toISOString(),closedBy:i.user.id,events:[...(ticket.events||[])]};d.addEvent(closed,'Ticket nach Bestätigung geschlossen; Kanal wird nach Archivierung gelöscht',i.user.id);
 const original=i.channel.permissionOverwrites.cache.get(ticket.userId);
 const flags=['SendMessages','AttachFiles','SendMessagesInThreads','CreatePublicThreads','CreatePrivateThreads'];
 const previous=Object.fromEntries(flags.map(flag=>[flag,original?.allow.has(flag)?true:original?.deny.has(flag)?false:null]));
 let uploaded;
 try{
 await i.channel.permissionOverwrites.edit(ticket.userId,Object.fromEntries(flags.map(flag=>[flag,false])),'Ticket nach Nutzerbestätigung schließen');
 const transcript=await d.transcript(i.channel,closed);
 uploaded=await archive.send({content:`📁 **HTML-Transkript · ${ticket.categoryLabel||ticket.categoryKey} · Ticket ${ticket.ticketNumber}**\n**Mandant:** ${ticket.firstName} ${ticket.lastName}\n**Ursprünglicher Ticketkanal:** ${i.channelId}\n**Geschlossen von:** <@${i.user.id}>`,files:[transcript],allowedMentions:{parse:[]}});
 }catch(error){await i.channel.permissionOverwrites.edit(ticket.userId,previous,'Schließen fehlgeschlagen: Schreibrechte wiederherstellen');throw error;}
 closed.archiveChannelId=archive.id;closed.archiveMessageId=uploaded.id;closed.archiveUrl=uploaded.url;
 const latest=d.getTickets();latest[i.channelId]=closed;d.saveTickets(latest);
 await remove(i,d,closed);state.confirmations.delete(nonce);
 }finally{state.locks.delete(i.channelId);}
 }catch(e){console.error('Ticket schließen:',e.message);const archived=d.getTickets()[i.channelId]?.archiveMessageId;const content=archived?'Das Transkript ist gesichert, aber der Ticketkanal konnte nicht gelöscht werden: '+e.message+' Bitte erneut „Ticket schließen“ verwenden.':'Schließen fehlgeschlagen: '+e.message+' Bitte erneut versuchen.';if(i.deferred||i.replied)await i.editReply({content}).catch(()=>{});else await i.reply({content,flags:64}).catch(()=>{});}
};
module.exports.buttonId=buttonId;
module.exports.hasTranscript=hasTranscript;
