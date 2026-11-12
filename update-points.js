require('dotenv').config({quiet:true});
const fs=require('fs'),path=require('path');
const {Client,GatewayIntentBits}=require('discord.js');
const client=new Client({intents:[GatewayIntentBits.Guilds]});
const DATA_DIR=path.join(__dirname,'data');
const readJson=file=>fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};
const writeJson=(file,data)=>fs.writeFileSync(file,JSON.stringify(data,null,2));
client.once('clientReady',async()=>{try{
 const file=path.join(DATA_DIR,'panels.json'),s=readJson(file);
 if(s.pointsTtlMs!==180000){for(const p of Object.values(s.points||{}))p.expires-=1620000;s.pointsTtlMs=180000;writeJson(file,s);}
 process.env.LJA_SKIP_PANEL_REFRESH='1';
 const panels=require('./panels')({client,hasRole:()=>false,ADMIN_ROLE_IDS:[],TICKET_CATEGORIES:{},readJson,writeJson,DATA_DIR});
 await panels.start();await panels.publish('punkte');await require('./changelog')(client,'1570467201352335635');console.log('Nur Punktepanel und Changelog aktualisiert.');
 }catch(e){console.error(e.message);process.exitCode=1;}finally{client.destroy();}});
client.login(process.env.DISCORD_TOKEN).catch(e=>{console.error(e.message);process.exitCode=1;});
