const store=require('./office-store');
module.exports=async function upsert(channel,key,payloads,botId,marker){
 const state=store.read(),saved=state.messages?.[key]||[],ids=[];
 const history=await channel.messages.fetch({limit:100});
 const owned=[...history.values()].filter(m=>m.author.id===botId&&m.embeds.some(e=>e.footer?.text?.startsWith(marker))).sort((a,b)=>a.createdTimestamp-b.createdTimestamp);
 for(let n=0;n<payloads.length;n++){
  let message=saved[n]?await channel.messages.fetch(saved[n]).catch(e=>{if(e.code===10008)return null;throw e;}):null;
  if(message&&ids.includes(message.id))message=null;
  message||=owned.find(m=>!ids.includes(m.id));
  if(message&&message.author.id!==botId)throw Error('Fremde Nachricht im Panelzustand.');
  const payload={...payloads[n],allowedMentions:{parse:[]}};
  if(message){const json=e=>{const value=e.toJSON?e.toJSON():e;const {type,...rest}=value;return rest;};const current={embeds:message.embeds.map(json),components:message.components.map(c=>c.toJSON?c.toJSON():c)},next={embeds:(payload.embeds||[]).map(json),components:(payload.components||[]).map(c=>c.toJSON?c.toJSON():c)};if(JSON.stringify(current)!==JSON.stringify(next))await message.edit(payload);}else message=await channel.send(payload);
  ids.push(message.id);store.change(s=>{s.messages||={};s.messages[key]=[...ids,...saved.slice(ids.length)];});
 }
 for(const id of new Set([...saved,...owned.map(m=>m.id)])){if(ids.includes(id))continue;const message=await channel.messages.fetch(id).catch(e=>{if(e.code===10008)return null;throw e;});if(message?.author.id===botId)await message.delete();}
 store.change(s=>{s.messages||={};s.messages[key]=ids;});return ids;
};
