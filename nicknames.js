const fs=require('fs'),path=require('path');
const {PermissionFlagsBits:P}=require('discord.js');
function config(){return JSON.parse(fs.readFileSync(path.join(__dirname,'nickname-config.json'),'utf8').replace(/^\uFEFF/,''));}
async function sync(member,contact){
 try{
 const settings=config();
 if(!member||member.guild?.id!==settings.guildId||member.user.bot)return {updated:false,reason:'ignored'};
 // Vor jeder Umbenennung aktuelle Rollen prüfen; eine einzelne Ausnahme genügt.
 if(member.fetch)member=await member.fetch(true);
 if(settings.excludedRoleIds.some(id=>member.roles.cache.has(id)))return {updated:false,reason:'excluded'};
 const name=[contact.firstName,contact.lastName].map(v=>String(v||'').trim()).join(' ').replace(/\s+/g,' ').trim();
 if(!contact.firstName?.trim()||!contact.lastName?.trim())return {updated:false,reason:'missing'};
 if(name.length>32)return {updated:false,reason:'length',notice:'Deine Angaben sind gespeichert. Der IC-Name ist für einen Server-Spitznamen zu lang (maximal 32 Zeichen).'};
 if(member.nickname===name)return {updated:false,reason:'unchanged'};
 const me=member.guild.members.me||await member.guild.members.fetchMe();
 if(!member.manageable||!me.permissions.has(P.ManageNicknames))return {updated:false,reason:'permissions',notice:'Deine Angaben sind gespeichert. Der Spitzname konnte wegen der Discord-Rollenrechte nicht angepasst werden.'};
 await member.setNickname(name,'IC-Nutzerprofil nach Registrierung oder Ticketformular aktualisiert');return {updated:true};
 }catch(error){console.error('IC-Spitzname:',error.code||error.message);return {updated:false,reason:'failed',notice:'Deine Angaben sind gespeichert. Der Spitzname konnte gerade nicht angepasst werden.'};}
}
module.exports={sync,config};
