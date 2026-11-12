const {ActionRowBuilder,ButtonBuilder,ButtonStyle}=require('discord.js');
const crypto=require('crypto');
const state=require('./ticket-close-state');
function buttonId(owner,action='ask',nonce=''){return `lja_close_v2:${owner}:${action}${nonce?':'+nonce:''}`;}
module.exports=async function closeTicket(i,d){
 const prefix=`lja_close_v2:${d.owner}:`;if(!i.isButton()||!i.customId.startsWith(prefix))return;
 const [action,nonce]=i.customId.slice(prefix.length).split(':');if(!['ask','confirm','cancel'].includes(action))return;
 try{
 const ticket=d.getTickets()[i.channelId];if(!ticket)return await i.reply({content:'Ticketdaten fehlen. Bitte die Kanzleileitung informieren.',flags:64});
 const authorized=i.user.id===ticket.userId||i.user.id===ticket.handlerId||d.isLeadership(i.member);
 if(!authorized)return await i.reply({content:'Du bist nicht berechtigt, dieses Ticket zu schließen.',flags:64});
 if(ticket.closed){await i.deferReply({flags:64});await d.update(i.channel,ticket);return await i.editReply('Dieses Ticket ist bereits geschlossen.');}
 if(action==='ask'){
 const now=Date.now();for(const [key,c]of state.confirmations)if(c.expires<now)state.confirmations.delete(key);
 const token=crypto.randomBytes(12).toString('hex');state.confirmations.set(token,{user:i.user.id,channel:i.channelId,expires:now+300000});
 const row=new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(buttonId(d.owner,'confirm',token)).setLabel('JA, TICKET SCHLIESSEN').setStyle(ButtonStyle.Danger),new ButtonBuilder().setCustomId(buttonId(d.owner,'cancel',token)).setLabel('ABBRECHEN').setStyle(ButtonStyle.Secondary));
 return await i.reply({content:'Möchtest du dieses Ticket wirklich schließen?\nNach deiner Bestätigung werden die Schreibrechte entzogen und ein HTML-Transkript gespeichert.',components:[row],flags:64});
 }
 const confirmation=state.confirmations.get(nonce);
 if(!confirmation||confirmation.user!==i.user.id||confirmation.channel!==i.channelId||confirmation.expires<Date.now())return await i.reply({content:'Diese Bestätigung ist abgelaufen. Bitte erneut auf „Ticket schließen“ klicken.',flags:64});
 if(action==='cancel'){state.confirmations.delete(nonce);return await i.update({content:'Schließen abgebrochen. Das Ticket bleibt offen.',components:[]});}
 if(state.locks.has(i.channelId))return await i.reply({content:'Dieses Ticket wird bereits geschlossen.',flags:64});
 state.locks.add(i.channelId);
 try{
 await i.deferUpdate();
 const closed={...ticket,closed:true,closedAt:new Date().toISOString(),closedBy:i.user.id,events:[...(ticket.events||[])]};d.addEvent(closed,'Ticket nach Bestätigung geschlossen',i.user.id);
 const original=i.channel.permissionOverwrites.cache.get(ticket.userId);
 const flags=['SendMessages','AttachFiles','SendMessagesInThreads','CreatePublicThreads','CreatePrivateThreads'];
 const previous=Object.fromEntries(flags.map(flag=>[flag,original?.allow.has(flag)?true:original?.deny.has(flag)?false:null]));
 let uploaded;
 try{
 await i.channel.permissionOverwrites.edit(ticket.userId,Object.fromEntries(flags.map(flag=>[flag,false])),'Ticket nach Nutzerbestätigung schließen');
 const transcript=await d.transcript(i.channel,closed);
 uploaded=await i.channel.send({content:'📁 **HTML-Transkript** · Ticket geschlossen und archiviert.',files:[transcript],allowedMentions:{parse:[]}});
 }catch(error){await i.channel.permissionOverwrites.edit(ticket.userId,previous,'Schließen fehlgeschlagen: Schreibrechte wiederherstellen');throw error;}
 const latest=d.getTickets();latest[i.channelId]=closed;d.saveTickets(latest);state.confirmations.delete(nonce);
 await d.update(i.channel,closed);
 if(!d.workflow.name(closed))void i.channel.setName(`geschlossen-${i.channel.name}`.slice(0,100)).catch(e=>console.error('Archivname:',e.message));
 return await i.editReply({content:'Ticket geschlossen. Das HTML-Transkript ist im Ticket gespeichert.',components:[]});
 }finally{state.locks.delete(i.channelId);}
 }catch(e){console.error('Ticket schließen:',e.message);const content='Schließen fehlgeschlagen: '+e.message+' Bitte erneut versuchen.';if(i.deferred||i.replied)await i.editReply({content}).catch(()=>{});else await i.reply({content,flags:64}).catch(()=>{});}
};
module.exports.buttonId=buttonId;
