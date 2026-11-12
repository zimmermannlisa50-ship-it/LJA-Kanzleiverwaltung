const {EmbedBuilder}=require('discord.js');
const GOLD=0xD4AF37;
const NAMES={honorare:'Honorarordnung',philosophie:'Kanzleiphilosophie',regelwerk:'Kanzleiregelwerk'};
function parse(text){
 const normalized=text.replace(/^\uFEFF/,'').replace(/\r/g,'').trim();
 const [header,...raw]=normalized.split(/^### /m);let ending='';
 const sections=raw.map((part,index)=>{const line=part.indexOf('\n');const title=part.slice(0,line).trim();let body=part.slice(line+1).trim();if(index===raw.length-1){const split=body.split(/\n━+\n/);body=split.shift();ending=split.join('\n').trim();}return {title,body};});
 return {intro:header.replace(/^# .*\n/,'').replace(/^━+$/gm,'').trim(),sections,ending};
}
function table(rows){
 const widths=rows[0].map((_,column)=>Math.max(...rows.map(row=>row[column].length)));
 const line=row=>row.map((cell,column)=>column===0?cell.padEnd(widths[column]):cell.padStart(widths[column])).join('  ');
 return '```\n'+[line(rows[0]),widths.map(w=>'─'.repeat(w)).join('  '),...rows.slice(1).map(line)].join('\n')+'\n```';
}
function pipeTables(text){return text.replace(/(?:^\|.*\|\s*$\n?)+/gm,block=>{
 const rows=block.trim().split('\n').map(line=>line.trim().slice(1,-1).split('|').map(cell=>cell.trim())).filter(row=>!row.every(cell=>/^:?-+:?$/.test(cell)));
 return table(rows)+'\n';
});}
function card(title,description){const e=new EmbedBuilder().setColor(GOLD).setAuthor({name:'LIBERTY JUSTICE ASSOCIATES'}).setTitle(title);if(description)e.setDescription(description);return e;}
function length(embed){const e=embed.toJSON();return (e.title?.length||0)+(e.description?.length||0)+(e.author?.name.length||0)+(e.footer?.text.length||0)+(e.fields||[]).reduce((sum,f)=>sum+f.name.length+f.value.length,0);}
function render(key,text){
 const {intro,sections,ending}=parse(text);let embeds;
 if(key==='honorare'){
 embeds=[card('⚖️ Honorarordnung & Premiumleistungen',intro.replace('**Honorarordnung & Premiumleistungen**','').trim())];
 const icons=['⚖️','🏛️','📜','🏢'];
 for(const [index,s]of sections.slice(0,4).entries()){
 const rows=s.body.split('\n').filter(Boolean).map(line=>{const match=line.match(/^(.*?) — \*\*(.*?)\*\*$/);if(!match)throw Error('Ungültiger Preiseintrag: '+line);return [match[1],match[2]];});
 embeds.push(card(`${icons[index]} ${s.title}`,table([['Leistung','Honorar'],...rows])));
 }
 const premium=card('◆ Premiumleistungen');premium.addFields(sections.slice(4).map(s=>({name:s.title==='LJA BLACK'?'🖤 LJA BLACK':s.title,value:s.body,inline:false})));
 if(ending)premium.addFields({name:'Hinweise',value:ending,inline:false});embeds.push(premium);
 }else if(key==='philosophie'){
 const e=card('⚖️ Unsere Philosophie & Grundsätze',intro.replace('**Unsere Philosophie & Grundsätze**','').trim());
 e.addFields(sections.map(s=>({name:s.title,value:s.body,inline:false})));
 if(ending)e.addFields({name:'UNSER ANSPRUCH',value:ending.replace(/^\*\*UNSER ANSPRUCH\*\*\s*/,''),inline:false});embeds=[e];
 }else if(key==='regelwerk'){
 embeds=[];for(let start=0;start<sections.length;start+=4){
 const group=sections.slice(start,start+4);const e=card(`📜 Kanzleiregelwerk · § ${String(start+1).padStart(2,'0')}–${String(start+group.length).padStart(2,'0')}`,start===0?intro.replace('**Internes Kanzleiregelwerk**','').trim():undefined);
 e.addFields(group.map(s=>({name:s.title,value:pipeTables(s.body),inline:false})));embeds.push(e);
 }
 }else throw Error('Unbekanntes Dokument: '+key);
 embeds.forEach((e,index)=>e.setFooter({text:`Liberty Justice Associates • ${NAMES[key]} • ${index+1}/${embeds.length}`}));
 const payloads=[];let group=[],size=0;
 for(const e of embeds){const amount=length(e);if(amount>5800)throw Error('Dokumentkarte zu lang.');if(group.length&&(size+amount>5800||group.length===10||key==='regelwerk'&&group.length===2)){payloads.push({embeds:group});group=[];size=0;}group.push(e);size+=amount;}
 if(group.length)payloads.push({embeds:group});return payloads;
}
function matches(key,message){return message.embeds?.some(e=>e.footer?.text?.startsWith(`Liberty Justice Associates • ${NAMES[key]} • `));}
module.exports={render,matches,table,parse,length};
