const {ChannelType}=require('discord.js'),C=require('./personnel/config'),R=require('./personnel/rules'),workflow=require('./ticket-workflow'),profiles=require('./ticket-profile');
module.exports=async function create(deps,member,lawyer,fields){
 if(!R.lawyer(lawyer))throw Error('Dieser Anwalt ist nicht mehr verfügbar.');
 const existing=Object.values(deps.getTickets()).find(t=>t.source==='lawyer-register'&&!t.closed&&!t.completed&&t.userId===member.id&&t.handlerId===lawyer.id);
 if(existing){const channel=await deps.client.channels.fetch(existing.channelId).catch(e=>{if(e.code===10003)return null;throw e;});if(channel)return channel;}
 const contact=profiles.fromSubmission(deps.registration.profile(member.id),fields);
 const subject=fields.getTextInputValue('subject').trim(),facts=fields.getTextInputValue('facts').trim();if(!subject||!facts)throw Error('Bitte Betreff und Sachverhalt ausfüllen.');
 const forum=await deps.personnel.resolveLawyer(lawyer),counters=deps.getCounters(),ticketNumber=workflow.number(counters,'beratung',Object.values(deps.getTickets()));deps.saveCounters(counters);
 const ticket={...contact,userId:member.id,ticketNumber,categoryKey:'beratung',categoryLabel:'Direkte Anwaltsanfrage',subject,facts,handlerId:lawyer.id,lastHandlerId:lawyer.id,source:'lawyer-register',originalCategoryId:C.QUEUES.beratung,queuePermissions:deps.queuePermissions(member.id),completed:false,closed:false,waiting:false,paymentType:null,dojCaseNumber:null,createdAt:new Date().toISOString(),messageId:null,events:[{event:'Direkte Anwaltsanfrage',userId:member.id,details:'Ausgewählter Anwalt: '+lawyer.id,timestamp:new Date().toISOString()}]};
 const channel=await member.guild.channels.create({name:workflow.name(ticket),type:ChannelType.GuildText,parent:forum.parentId,permissionOverwrites:R.caseOverwrites(member.guild,deps.client.user.id,[member.id,lawyer.id]),reason:'Kontakt über das Anwaltsregister'});ticket.channelId=channel.id;
 try{const message=await channel.send({content:`<@${member.id}> · <@${lawyer.id}>`,embeds:[deps.buildEmbed(ticket)],components:deps.buildComponents(ticket),allowedMentions:{users:[member.id,lawyer.id]}});ticket.messageId=message.id;const all=deps.getTickets();all[channel.id]=ticket;deps.saveTickets(all);}catch(error){await channel.delete('Unvollständige neue Anwaltsanfrage zurücknehmen').catch(()=>{});throw error;}
 profiles.save(deps.registration,member.id,contact);
 await deps.personnel.caseIndex(ticket).catch(e=>require('./bot-diagnostics').error('Direkte Mandatsübersicht',e));
 return channel;
};
