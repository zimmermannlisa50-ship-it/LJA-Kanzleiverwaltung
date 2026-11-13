const {EmbedBuilder}=require('discord.js'),H=require('./bot-health'),O=require('./office-store'),upsert=require('./office-messages');
const stamp=value=>value?`<t:${Math.floor(Date.parse(value)/1000)}:f>`:'Noch nicht erfasst';
const event=value=>value?stamp(value.at)+'\n'+value.reason:'Bisher keiner erfasst';
module.exports=client=>{
 let state=H.begin(H.read(),process.env.RAILWAY_DEPLOYMENT_ID),timer,running=false;H.write(state);
 function error(e){state.lastError={at:new Date().toISOString(),reason:H.safe(e)};H.write(state);}
 require('./bot-diagnostics').subscribe(item=>error(item.label+' · '+item.code+' · '+item.message));
 process.on('uncaughtExceptionMonitor',e=>{state.lastCrash={at:new Date().toISOString(),reason:H.safe(e)};state.running=false;H.write(state);});
 for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>{state.cleanExit=true;state.running=false;state.lastRestart={at:new Date().toISOString(),reason:signal==='SIGTERM'?'Railway hat den Prozess geordnet beendet (z. B. Deployment/Neustart).':'Prozess geordnet beendet.'};H.write(state);client.destroy();process.exit(0);});
 client.on('error',error);client.on('shardError',error);
 client.on('shardDisconnect',e=>{state.lastDisconnect={at:new Date().toISOString(),reason:'Discord-Verbindung unterbrochen · Code '+e.code};H.write(state);});
 async function tick(){if(running||!O.read().statusChannel)return;running=true;try{
  const channel=await client.channels.fetch(O.read().statusChannel),saved=O.read().messages?.status?.[0];
  if(saved){const message=await channel.messages.fetch(saved).catch(e=>{if(e.code===10008)return null;throw e;}),old=message?.embeds?.[0];if(old?.fields.some(f=>f.name==='Verbindung'&&f.value.startsWith('🔴'))&&client.isReady()){const observed=old.fields.find(f=>f.name==='Letzte Unterbrechung')?.value.match(/<t:(\d+):/);if(observed)state.lastDisconnect={at:new Date(Number(observed[1])*1000).toISOString(),reason:'Ausbleibendes Lebenszeichen durch unabhängige Überwachung erkannt; Verbindung wiederhergestellt.'};}}
  state.heartbeatAt=new Date().toISOString();H.write(state);
  const embed=new EmbedBuilder().setColor(client.isReady()?0x2ecc71:0xe74c3c).setAuthor({name:'LIBERTY JUSTICE ASSOCIATES'}).setTitle('🛠️ BOTSTATUS & BETRIEB').setDescription('Betrieb auf Railway · unabhängig von einem privaten Computer.\nEine separate Überwachung prüft dieses Lebenszeichen.').addFields(
   {name:'Verbindung',value:client.isReady()?'🟢 Mit Discord verbunden':'🔴 Discord-Verbindung unterbrochen',inline:true},
   {name:'Letztes Lebenszeichen',value:stamp(state.heartbeatAt),inline:true},
   {name:'Letzter Start',value:stamp(state.startedAt),inline:true},
   {name:'Letzter geordneter Neustart',value:event(state.lastRestart)},
   {name:'Letzter Absturz',value:event(state.lastCrash)},
   {name:'Letzte Unterbrechung',value:event(state.lastDisconnect)},
   {name:'Letzter technischer Fehler',value:event(state.lastError)}
  ).setFooter({text:'LJA | Botstatus · Lebenszeichen alle 45 Sekunden · Überwachung seit '+state.monitoringSince.slice(0,10)}).setTimestamp(new Date(state.heartbeatAt));
  await upsert(channel,'status',[{embeds:[embed],components:[]}],client.user.id,'LJA | Botstatus');
 }finally{running=false;}}
 return {tick,async start(){await tick();if(!timer){timer=setInterval(()=>tick().catch(e=>console.error('Botstatus:',H.safe(e))),45000);timer.unref();}}};
};
