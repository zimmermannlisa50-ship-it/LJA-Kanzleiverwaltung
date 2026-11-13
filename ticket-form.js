const {ModalBuilder,TextInputBuilder,TextInputStyle,ActionRowBuilder}=require('discord.js');
const profiles=require('./ticket-profile');
function build(customId,categoryKey,profile){
 const modal=new ModalBuilder().setCustomId(customId).setTitle('Anfrage an Liberty Justice Associates');
 const labels={firstName:'IC-Vorname',lastName:'IC-Nachname',phone:'IC-Telefonnummer'};
 const inputs=profiles.missing(profile).map(key=>new TextInputBuilder().setCustomId(key).setLabel(labels[key]).setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(50));
 if(categoryKey!=='bewerbung')inputs.push(new TextInputBuilder().setCustomId('subject').setLabel('Betreff des Anliegens').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(100));
 // A modal needs at least one component, even when all contact data is saved.
 inputs.push(new TextInputBuilder().setCustomId('facts').setLabel(categoryKey==='bewerbung'?'Nachricht zur Bewerbung (optional)':'Sachverhalt').setStyle(TextInputStyle.Paragraph).setRequired(categoryKey!=='bewerbung').setMaxLength(4000));
 modal.addComponents(...inputs.map(input=>new ActionRowBuilder().addComponents(input)));
 return modal;
}
module.exports={build};
