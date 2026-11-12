require('dotenv').config({quiet:true});const fs=require('fs');const {Client,GatewayIntentBits}=require('discord.js');const {buildTicketEmbed,buildTicketComponents}=require('./ticket-ui');const workflow=require('./ticket-workflow');
const client=new Client({intents:[GatewayIntentBits.Guilds]});
client.once('clientReady',async()=>{try{const tickets=JSON.parse(fs.readFileSync('data/ticket-data.json','utf8'));for(const ticket of Object.values(tickets)){
 const channel=await client.channels.fetch(ticket.channelId).catch(e=>{if(e.code===10003)return null;throw e;});if(!channel)continue;
 if(ticket.messageId){const message=await channel.messages.fetch(ticket.messageId).catch(e=>{if(e.code===10008)return null;throw e;});if(message?.author.id===client.user.id)await message.edit({embeds:[buildTicketEmbed(ticket)],components:buildTicketComponents(ticket)});}
 const name=workflow.name(ticket);if(name&&channel.name!==name)await channel.setName(name,'Ticketnamen auf Status, Nummer und IC-Name umstellen');console.log('Ticket '+ticket.ticketNumber+' aktualisiert.');
 }}catch(e){console.error(e.message);process.exitCode=1;}finally{client.destroy();}});
client.login(process.env.DISCORD_TOKEN).catch(e=>{console.error(e.message);process.exitCode=1;});
