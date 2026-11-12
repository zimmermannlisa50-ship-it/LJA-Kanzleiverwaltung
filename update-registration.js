require('dotenv').config({quiet:true});
const {Client,GatewayIntentBits}=require('discord.js');
const client=new Client({intents:[GatewayIntentBits.Guilds]});
client.once('clientReady',async()=>{try{
 if(!require('./registration-store').read().active)throw Error('Registrierung ist in dieser Instanz nicht aktiv.');
 const id=await require('./registration').publish(client);
 console.log('Registrierungspanel aktualisiert: '+id);
 }catch(e){console.error(e.message);process.exitCode=1;}finally{client.destroy();}});
client.login(process.env.DISCORD_TOKEN).catch(e=>{console.error(e.message);process.exitCode=1;});
