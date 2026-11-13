const {PermissionFlagsBits:P}=require('discord.js'),C=require('./personnel/config');
const GENERAL='1477731364403941539',ANNOUNCEMENTS='1478007932552614021';
const INFO=['1477731364403941540','1477943304694923397','1477946486330364036',ANNOUNCEMENTS,'1489239488705331240','1478026700859244584','1477737326343094483'];
const WRITERS=C.HR;
const WRITE=P.SendMessages|P.SendMessagesInThreads|P.CreatePublicThreads|P.CreatePrivateThreads;
function readonly(existing,bot){
 const map=new Map(existing.map(o=>[o.id,{id:o.id,type:o.type,allow:BigInt(o.allow?.bitfield??o.allow??0)&~WRITE,deny:BigInt(o.deny?.bitfield??o.deny??0)&~WRITE}]));
 const get=(id,type=0)=>{if(!map.has(id))map.set(id,{id,type,allow:0n,deny:0n});return map.get(id);};
 get(C.GUILD).deny|=WRITE;
 for(const id of WRITERS){const o=get(id);o.allow|=P.ViewChannel|P.ReadMessageHistory|WRITE;o.deny&=~(P.ViewChannel|P.ReadMessageHistory|WRITE);}
 const me=get(bot,1);me.allow|=P.ViewChannel|P.ReadMessageHistory|P.SendMessages|P.EmbedLinks|P.AttachFiles|P.ManageMessages;me.deny&=~me.allow;
 return [...map.values()];
}
function gated(bot,internal=false){const list=[{id:C.GUILD,type:0,allow:0n,deny:P.ViewChannel}];if(!internal)list.push({id:C.CITIZEN,type:0,allow:P.ViewChannel|P.ReadMessageHistory,deny:0n});return readonly(list,bot);}
const signature=list=>JSON.stringify(list.map(o=>({id:o.id,type:o.type,allow:String(o.allow?.bitfield??o.allow),deny:String(o.deny?.bitfield??o.deny)})).sort((a,b)=>a.id.localeCompare(b.id)));
module.exports={GENERAL,ANNOUNCEMENTS,INFO,WRITERS,WRITE,readonly,gated,signature};
