// Private migration snapshot; never upload operational data to GitHub.
const fs=require('node:fs'),path=require('node:path');
const {assertAuthorizedRuntime}=require('./runtime-guard');
function prepare(root=__dirname,target=path.join(root,'.railway-migration',String(Date.now()))){
 const authority=assertAuthorizedRuntime({root});
 const railway={projectId:'5a61c628-d02b-4ed7-af2c-ca15673f8197',serviceId:'4a65d405-c939-4564-a8ee-33eaaa3bd475',environmentId:'57345679-5c01-446f-a792-0bd59fa7f0fc'};
 if(fs.existsSync(target))throw Error('Ziel existiert bereits; vorhandene Sicherung bleibt unverändert.');
 fs.mkdirSync(target,{recursive:true});
 fs.cpSync(path.join(root,'data'),target,{recursive:true,errorOnExist:true,force:false});
 fs.writeFileSync(path.join(target,'runtime-authority.json'),JSON.stringify({instanceId:authority.instanceId,port:authority.port,railway},null,2),{flag:'wx'});
 return target;
}
if(require.main===module)console.log('Privater Railway-Datenstand vorbereitet: '+prepare());
module.exports={prepare};
