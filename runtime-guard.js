const fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto'),net=require('net');
const hostId=()=>crypto.createHash('sha256').update(os.hostname().toLowerCase()).digest('hex');
function validate(authority,registration,host){if(!authority?.instanceId||!authority?.hostId)throw Error('Freigabe für den Botbetrieb fehlt.');if(registration?.instanceId!==authority.instanceId)throw Error('Botstart gesperrt: Dieser Datenbestand gehört nicht zur freigegebenen Instanz. Den bestehenden vollständigen Datenordner verwenden; keine neue Instanz anlegen.');if(host!==authority.hostId)throw Error('Botstart gesperrt: Dieser Rechner ist nicht für den Botbetrieb freigegeben. Der Bot läuft auf dem festgelegten Hauptrechner.');return true;}
function assertAuthorizedRuntime({root=__dirname,env=process.env,host=hostId()}={}){
 const railway=Boolean(env.RAILWAY_PROJECT_ID||env.RAILWAY_SERVICE_ID||env.RAILWAY_ENVIRONMENT_ID),dataDir=path.join(root,'data');
 if(railway&&(!env.RAILWAY_VOLUME_MOUNT_PATH||path.resolve(env.RAILWAY_VOLUME_MOUNT_PATH)!==path.resolve(dataDir)))throw Error('Botstart gesperrt: Railway benötigt einen dauerhaften Datenspeicher unter /app/data.');
 const authorityFile=path.join(railway?dataDir:root,'runtime-authority.json');
 if(!fs.existsSync(authorityFile))throw Error('Botstart gesperrt: Lokale Betriebsfreigabe fehlt. Vollständige Betriebsdaten samt Freigabe auf den Hosting-Datenspeicher übernehmen.');
 const authority=JSON.parse(fs.readFileSync(authorityFile,'utf8'));
 const registrationFile=path.join(dataDir,'registration.json'),registration=fs.existsSync(registrationFile)?JSON.parse(fs.readFileSync(registrationFile,'utf8')):{};
 if(railway){
  const expected=authority.railway;
  if(!expected?.projectId||!expected.serviceId||!expected.environmentId||env.RAILWAY_PROJECT_ID!==expected.projectId||env.RAILWAY_SERVICE_ID!==expected.serviceId||env.RAILWAY_ENVIRONMENT_ID!==expected.environmentId)throw Error('Botstart gesperrt: Dieser Railway-Dienst ist nicht für den Botbetrieb freigegeben.');
  if(!authority.instanceId||registration.instanceId!==authority.instanceId)throw Error('Botstart gesperrt: Dieser Datenbestand gehört nicht zur freigegebenen Instanz.');
 }else{validate(authority,registration,host);}
 return authority;
}
async function acquire(check=assertAuthorizedRuntime){const authority=check();return new Promise((resolve,reject)=>{const server=net.createServer(socket=>socket.destroy());server.once('error',error=>reject(Error(error.code==='EADDRINUSE'?'Botstart gesperrt: Auf diesem Rechner läuft bereits eine Botinstanz.':`Betriebssperre nicht verfügbar: ${error.code}`)));server.listen({host:'127.0.0.1',port:authority.port,exclusive:true},()=>{server.unref();resolve(server);});});}
module.exports={hostId,validate,assertAuthorizedRuntime,acquire};
