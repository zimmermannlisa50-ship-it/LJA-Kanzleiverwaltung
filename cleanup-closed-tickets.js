require('dotenv').config({quiet:true});const fs=require('fs');const {Client,GatewayIntentBits}=require('discord.js');const {hasTranscript}=require('./ticket-close');
const FILE='data/ticket-data.json',ARCHIVE='1484218994608312553';const apply=process.argv.includes('--apply');const client=new Client({intents:[GatewayIntentBits.Guilds]});
client.once('clientReady',async()=>{try{const archive=await client.channels.fetch(ARCHIVE);const tickets=JSON.parse(fs.readFileSync(FILE,'utf8'));for(const ticket of Object.values(tickets)){
 if(!ticket.closed||ticket.deletedAt||ticket.archiveChannelId!==ARCHIVE||!ticket.archiveMessageId)continue;
 const message=await archive.messages.fetch(ticket.archiveMessageId);if(!hasTranscript(message,client.user.id,ticket,ticket.channelId))throw Error('Gesichertes Transkript nicht bestätigt: '+ticket.channelId);
 const channel=await client.channels.fetch(ticket.channelId).catch(e=>{if(e.code===10003)return null;throw e;});if(!channel)continue;
 if(channel.guildId!==archive.guildId)throw Error('Ticketkanal gehört zu einem anderen Server.');
 console.log('Verifiziert: '+ticket.channelId+' → Archivnachricht '+message.id);
 if(apply){const latest=JSON.parse(fs.readFileSync(FILE,'utf8'));if(!latest[ticket.channelId]?.closed||latest[ticket.channelId].archiveMessageId!==ticket.archiveMessageId)throw Error('Ticketstatus wurde zwischenzeitlich geändert.');await channel.delete('Vom Nutzer autorisiert: geschlossenes Ticket nach verifiziertem HTML-Archiv entfernen');const updated=JSON.parse(fs.readFileSync(FILE,'utf8'));updated[ticket.channelId].deletedAt=new Date().toISOString();fs.writeFileSync(FILE,JSON.stringify(updated,null,2));console.log('Geschlossener Ticketkanal entfernt: '+ticket.channelId);}
 }}catch(e){console.error(e.message);process.exitCode=1;}finally{client.destroy();}});
client.login(process.env.DISCORD_TOKEN).catch(e=>{console.error(e.message);process.exitCode=1;});
