const fs=require('node:fs'),path=require('node:path');
const file=path.join(__dirname,'data','bot-health.json');
function read(){return fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};}
function write(s){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify(s,null,2));fs.renameSync(file+'.tmp',file);}
function safe(error){let text=String(error?.message||error||'Unbekannter Fehler');for(const key of ['DISCORD_TOKEN','RAILWAY_TOKEN','RAILWAY_API_TOKEN'])if(process.env[key])text=text.split(process.env[key]).join('[Geheimnis entfernt]');return text.replace(/https?:\/\/\S+/g,'[URL entfernt]').slice(0,250);}
function begin(previous,deployment,now=new Date().toISOString()){
 const next={...previous,startedAt:now,monitoringSince:previous.monitoringSince||now,running:true,cleanExit:false,deployment};
 if(previous.running&&!previous.cleanExit){if(previous.deployment&&deployment&&previous.deployment!==deployment)next.lastRestart={at:now,reason:'Neues Railway-Deployment'};else next.lastCrash=previous.lastCrash?.at>=previous.startedAt?previous.lastCrash:{at:now,reason:'Voriger Prozess unerwartet beendet. Betriebssystem-/Railway-Abbruch möglich; genaue Ursache nicht erfasst.'};}
 return next;
}
module.exports={read,write,safe,begin};
