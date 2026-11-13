const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {assertAuthorizedRuntime}=require('./runtime-guard');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'lja-railway-')),data=path.join(root,'data');
fs.mkdirSync(data);
const railway={projectId:'project',serviceId:'service',environmentId:'production'};
const authority={instanceId:'existing-panel-instance',port:43461,railway};
const env={RAILWAY_PROJECT_ID:'project',RAILWAY_SERVICE_ID:'service',RAILWAY_ENVIRONMENT_ID:'production',RAILWAY_VOLUME_MOUNT_PATH:data};
try{
 fs.writeFileSync(path.join(data,'runtime-authority.json'),JSON.stringify(authority));
 fs.writeFileSync(path.join(data,'registration.json'),JSON.stringify({instanceId:authority.instanceId}));
 assert.equal(assertAuthorizedRuntime({root,env,host:'container-one'}).instanceId,authority.instanceId);
 assert.equal(assertAuthorizedRuntime({root,env,host:'replacement-container'}).instanceId,authority.instanceId);
 assert.throws(()=>assertAuthorizedRuntime({root,env:{...env,RAILWAY_VOLUME_MOUNT_PATH:''}}),/Datenspeicher/);
 assert.throws(()=>assertAuthorizedRuntime({root,env:{...env,RAILWAY_VOLUME_MOUNT_PATH:root}}),/Datenspeicher/);
 assert.throws(()=>assertAuthorizedRuntime({root,env:{...env,RAILWAY_SERVICE_ID:'other'}}),/Dienst/);
 assert.throws(()=>assertAuthorizedRuntime({root,env:{...env,RAILWAY_ENVIRONMENT_ID:'preview'}}),/Dienst/);
 fs.writeFileSync(path.join(data,'registration.json'),JSON.stringify({instanceId:'new-instance'}));
 assert.throws(()=>assertAuthorizedRuntime({root,env}),/Datenbestand/);
 fs.unlinkSync(path.join(data,'runtime-authority.json'));
 assert.throws(()=>assertAuthorizedRuntime({root,env}),/Betriebsfreigabe fehlt/);
 console.log('OK: Railway restart preserves instance; wrong service, missing volume/data/authority denied.');
}finally{fs.rmSync(root,{recursive:true,force:true});}
