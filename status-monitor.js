// Independent Railway worker. Uses REST only; never starts a second bot gateway.
const {REST,Routes}=require('discord.js');
function offlinePayload(message,now=Date.now(),threshold=180000){
 const embed=message.embeds?.[0];if(!embed?.timestamp)return null;
 if(now-Date.parse(embed.timestamp)<=threshold)return null;
 const fields=(embed.fields||[]).map(f=>({...f})),connection=fields.find(f=>f.name==='Verbindung');
 if(connection?.value==='🔴 Kein aktuelles Lebenszeichen')return null;
 if(connection)connection.value='🔴 Kein aktuelles Lebenszeichen';
 const incident=fields.find(f=>f.name==='Letzte Unterbrechung');if(incident)incident.value=`<t:${Math.floor(now/1000)}:f>\nSeit über 3 Minuten kein Lebenszeichen. Prozess oder Verbindung ausgefallen; genaue Ursache noch nicht bekannt.`;
 const {type,provider,video,...rest}=embed;return {embeds:[{...rest,color:0xe74c3c,fields}],allowed_mentions:{parse:[]}};
}
async function run(){
 const token=process.env.DISCORD_TOKEN,channel=process.env.LJA_STATUS_CHANNEL_ID;
 if(!token||!channel)throw Error('DISCORD_TOKEN und LJA_STATUS_CHANNEL_ID erforderlich.');
 const rest=new REST({timeout:15000}).setToken(token);let busy=false;
 async function check(){if(busy)return;busy=true;try{const messages=await rest.get(Routes.channelMessages(channel),{query:new URLSearchParams({limit:'20'})});const message=messages.find(m=>m.author?.id==='1569762821124915274'&&m.embeds?.[0]?.footer?.text?.startsWith('LJA | Botstatus'));if(!message){console.log('Noch kein Statuspanel vorhanden.');return;}const payload=offlinePayload(message);if(payload){await rest.patch(Routes.channelMessage(channel,message.id),{body:payload});console.log('Ausbleibendes Lebenszeichen im Statuspanel gemeldet.');}}catch(e){console.error('Statusüberwachung:',e.code||e.name);}finally{busy=false;}}
 await check();setInterval(()=>void check(),45000);console.log('Unabhängige Statusüberwachung aktiv.');
}
if(require.main===module)run().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={offlinePayload};
