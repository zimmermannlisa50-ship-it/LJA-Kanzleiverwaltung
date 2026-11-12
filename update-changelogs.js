require('dotenv').config({quiet:true});
const {Client,GatewayIntentBits}=require('discord.js');
const client=new Client({intents:[GatewayIntentBits.Guilds]});
client.once('clientReady',async()=>{try{const result=await require('./changelog')(client,'1570467201352335635');console.log(`${result.ids.length} Changelogs aktualisiert; laufender Bot unverändert.`);}catch(error){console.error(error.message);process.exitCode=1;}finally{client.destroy();}});
client.login(process.env.DISCORD_TOKEN).catch(error=>{console.error(error.message);process.exitCode=1;});
