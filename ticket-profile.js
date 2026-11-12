function validate(values){
 const contact={};for(const [key,label]of [['firstName','IC-Vorname'],['lastName','IC-Nachname'],['phone','IC-Telefonnummer']]){
 const value=String(values[key]??'').trim();if(!value||value.length>50)throw Error(`${label} muss ausgefüllt sein und darf höchstens 50 Zeichen enthalten.`);contact[key]=value;
 }return contact;
}
function merge(previous,values,now=new Date().toISOString()){
 const contact=validate(values);return {...previous,...contact,profileCreatedAt:previous?.profileCreatedAt||previous?.registeredAt||now,profileUpdatedAt:now,profileSource:'ticket'};
}
function save(store,userId,values){
 const current=store.read();current.profiles||={};current.profiles[userId]=merge(current.profiles[userId],values);store.write(current);return current.profiles[userId];
}
module.exports={validate,merge,save};
