require('dotenv').config({quiet:true});const fs=require('fs'),path=require('path');
const {Client,GatewayIntentBits}=require('discord.js');
const allowed=['honorare','philosophie','regelwerk'];const keys=process.argv.slice(2);if(keys.some(k=>!allowed.includes(k)))throw Error('Nur honorare, philosophie und regelwerk sind erlaubt.');
const client=new Client({intents:[GatewayIntentBits.Guilds]});
client.once('clientReady',async()=>{try{const DATA_DIR=path.join(__dirname,'data');fs.mkdirSync(DATA_DIR,{recursive:true});const panels=require('./panels')({client,hasRole:()=>false,ADMIN_ROLE_IDS:[],TICKET_CATEGORIES:{},DATA_DIR,readJson:file=>fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{},writeJson:(file,data)=>fs.writeFileSync(file,JSON.stringify(data,null,2))});
 for(const key of keys.length?keys:allowed){await panels.publish(key);console.log(key+' aktualisiert.');}
 await require('./changelog')(client,'1570467201352335635');
 }catch(e){console.error(e.message);process.exitCode=1;}finally{client.destroy();}});
client.login(process.env.DISCORD_TOKEN).catch(e=>{console.error(e.message);process.exitCode=1;});
