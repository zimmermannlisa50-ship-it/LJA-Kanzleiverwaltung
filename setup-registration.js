require('dotenv').config({quiet:true});
const fs=require('fs');
const {Client,GatewayIntentBits,PermissionFlagsBits:P,ChannelType}=require('discord.js');
const store=require('./registration-store');
const GUILD='1477731363082993665',CITIZEN='1477932235842654299';
const OPEN=new Set(['1477731364403941540','1477943304694923397']);
const client=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMembers]});
const apply=process.argv.includes('--apply');
const serial=c=>c.permissionOverwrites.cache.map(o=>({id:o.id,type:o.type,allow:o.allow.bitfield.toString(),deny:o.deny.bitfield.toString()}));
const normalized=values=>JSON.stringify(values.map(o=>({id:o.id,type:o.type,allow:String(o.allow),deny:String(o.deny)})).sort((a,b)=>a.id.localeCompare(b.id)));
const change=(list,id,visible)=>{let o=list.find(o=>o.id===id);if(!o){o={id,type:0,allow:'0',deny:'0'};list.push(o);}o.allow=(visible?BigInt(o.allow)|P.ViewChannel:BigInt(o.allow)&~P.ViewChannel).toString();o.deny=(visible?BigInt(o.deny)&~P.ViewChannel:BigInt(o.deny)|P.ViewChannel).toString();};
client.once('clientReady',async()=>{let backup,legacy,guild,mutated=false;const granted=[];
try{
 guild=await client.guilds.fetch(GUILD);await guild.fetch();await guild.roles.fetch();await guild.channels.fetch();await guild.members.fetch();
 if(store.read().active){console.log('Registrierung ist bereits aktiv. Keine erneuten Rechteänderungen.');return;}
 const citizen=guild.roles.cache.get(CITIZEN);if(!citizen)throw Error('Bürgerrolle fehlt.');
 const me=await guild.members.fetchMe();if(!me.permissions.has(P.ManageRoles)||me.roles.highest.position<=citizen.position)throw Error('Bot kann die Bürgerrolle nicht verwalten.');
 const channels=[...guild.channels.cache.values()].filter(c=>c.permissionOverwrites);
 const members=[...guild.members.cache.values()];
 backup={at:new Date().toISOString(),guildId:GUILD,channels:channels.map(c=>({id:c.id,name:c.name,type:c.type,overwrites:serial(c),everyone:c.permissionsFor(guild.roles.everyone).has(P.ViewChannel),citizen:c.permissionsFor(citizen).has(P.ViewChannel)})),members:members.map(m=>({id:m.id,roles:[...m.roles.cache.keys()],visible:channels.filter(c=>c.permissionsFor(m).has(P.ViewChannel)).map(c=>c.id)}))};
 const targets=backup.channels.filter(c=>c.everyone&&!OPEN.has(c.id));
 const keep=members.filter(m=>!m.roles.cache.has(CITIZEN)&&!m.permissions.has(P.Administrator));
 console.log(JSON.stringify({nativeRulesActive:guild.features.includes('MEMBER_VERIFICATION_GATE_ENABLED'),existingMembers:members.length,legacyAccessNeeded:keep.length,channelsToGate:targets.map(c=>({id:c.id,name:c.name})),publicChannels:[...OPEN]},null,2));
 if(!apply)return;

 fs.mkdirSync('data',{recursive:true});fs.writeFileSync('data/registration-rights-before.json',JSON.stringify(backup,null,2));
 mutated=true;
 if(keep.length){legacy=await guild.roles.create({name:'LJA | Bestandszugang',permissions:0n,reason:'Bisherige Zugriffe für Bestandsmitglieder ohne Bürgerrolle erhalten'});for(const member of keep){await member.roles.add(legacy.id,'Bestandsmitglied: bisherige Zugriffe ohne Pflichtregistrierung erhalten');granted.push(member.id);}}
 const plan=backup.channels.map(c=>{const overwrites=structuredClone(c.overwrites);if(targets.some(t=>t.id===c.id)){change(overwrites,GUILD,false);if(c.citizen)change(overwrites,CITIZEN,true);if(legacy)change(overwrites,legacy.id,true);}return {...c,desired:overwrites};}).sort((a,b)=>(a.type===ChannelType.GuildCategory?0:1)-(b.type===ChannelType.GuildCategory?0:1));
 for(const phase of [true,false]){
 await guild.channels.fetch();
 for(const entry of plan.filter(c=>(c.type===ChannelType.GuildCategory)===phase)){
 const channel=guild.channels.cache.get(entry.id);if(normalized(serial(channel))!==normalized(entry.desired))await channel.permissionOverwrites.set(entry.desired.map(o=>({...o,allow:BigInt(o.allow),deny:BigInt(o.deny)})),'Neue Mitglieder: Bürgerkanäle erst nach IC-Registrierung; Bestandszugriffe erhalten');
 }
 }
 await guild.channels.fetch();for(const id of granted)await guild.members.fetch({user:id,force:true});
 const differences=[];
 for(const previous of backup.members){const member=guild.members.cache.get(previous.id);if(!member)continue;for(const c of backup.channels){const now=guild.channels.cache.get(c.id);if(now&&now.permissionsFor(member).has(P.ViewChannel)!==previous.visible.includes(c.id))differences.push({member:previous.id,channel:c.id});}}
 if(differences.length)throw Error(`Bestandszugriffe weichen ab (${differences.length}); Änderungen werden zurückgesetzt.`);
 const panelId=await require('./registration').publish(client,{setup:true});
 const config=store.read();config.active=true;config.activatedAt=backup.at;config.existingIds=backup.members.map(m=>m.id);config.profiles||={};config.legacyRoleId=legacy?.id||null;config.panelId=panelId;config.permissionChanges=targets.map(c=>({id:c.id,name:c.name,everyoneView:false,citizenView:c.citizen}));store.write(config);
 fs.writeFileSync('data/registration-rights-audit.json',JSON.stringify({at:new Date().toISOString(),changes:config.permissionChanges,legacyRoleId:config.legacyRoleId,grandfathered:config.existingIds.length,visibilityDifferences:0},null,2));
  const changelogFile=require('path').join(__dirname,'changelog.json');
 const entries=JSON.parse(fs.readFileSync(changelogFile,'utf8').replace(/^\uFEFF/,''));
 if(!entries.some(e=>e.id==='registration-activated')){
 entries.push({id:'registration-activated',date:require('./changelog').berlinDate(),title:'Registrierung aktiv',added:['Neue Mitglieder hinterlegen IC-Vorname, IC-Nachname und IC-Telefonnummer ohne zusätzliche Discord-Regelbestätigung; Ticketformulare übernehmen die Angaben.'],permissions:[`Bürgerbereiche sind erst nach Registrierung sichtbar. Willkommen und Regelwerk bleiben zugänglich. ${backup.members.length} Bestandsmitglieder bleiben ausgenommen; ihre bisherige Kanalsichtbarkeit wurde geprüft.`]});
 fs.writeFileSync(changelogFile,JSON.stringify(entries,null,2)+'\n');
 }
 await require('./changelog')(client,'1570467201352335635');
 console.log('AKTIV: Registrierung eingerichtet; alle Bestandszugriffe geprüft und unverändert.');
}catch(e){
 console.error(e.message);process.exitCode=1;
 if(apply&&backup&&mutated&&!store.read().active){
 try{
 for(const entry of [...backup.channels].sort((a,b)=>(a.type===4?0:1)-(b.type===4?0:1))){const c=await guild.channels.fetch(entry.id);await c.permissionOverwrites.set(entry.overwrites.map(o=>({...o,allow:BigInt(o.allow),deny:BigInt(o.deny)})),'Registrierung: Rücksetzen nach fehlgeschlagener Einrichtung');}
 if(legacy)await legacy.delete('Registrierungseinrichtung zurückgesetzt');console.error('Rechteänderungen zurückgesetzt.');
 }catch(rollback){console.error('Rücksetzen unvollständig:',rollback.message);}
 }
}finally{client.destroy();}});
client.login(process.env.DISCORD_TOKEN).catch(e=>{console.error(e.message);process.exitCode=1;});




