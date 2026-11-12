const assert=require('node:assert/strict'),fs=require('fs');const docs=require('./document-panels');
for(const key of ['honorare','philosophie','regelwerk']){
 const source=fs.readFileSync(key+'.txt','utf8');const payloads=docs.render(key,source);let output='';
 for(const payload of payloads){assert(payload.embeds.length<=10);assert(payload.embeds.reduce((n,e)=>n+docs.length(e),0)<=6000);
 for(const e of payload.embeds){const d=e.toJSON();assert.equal(d.color,0xD4AF37);assert((d.description?.length||0)<=4096);assert((d.fields?.length||0)<=25);for(const f of d.fields||[]){assert(f.name.length<=256);assert(f.value.length<=1024);}assert(docs.matches(key,{embeds:[d]}));output+=JSON.stringify(d);}}
 for(const section of docs.parse(source).sections)assert(output.includes(section.title),'Abschnitt fehlt: '+section.title);
 if(key==='honorare'){for(const line of source.split('\n')){const m=line.trim().match(/^(.*?) — \*\*(.*?)\*\*$/);if(m){assert(output.includes(m[1]),m[1]);assert(output.includes(m[2]),m[2]);}}assert.equal(payloads.length,1);assert(output.includes('```'));}
 if(key==='regelwerk'){assert.equal(payloads.length,2);for(const phrase of ['500.000 $','1.000.000 $','2.000.000 $','10 %','20 %','30 %'])assert(output.includes(phrase));assert(output.includes('OOC-Wissen'));}
 console.log(`${key}: ${payloads.length} Nachricht(en), Karten gültig, Inhalte geprüft.`);
}
