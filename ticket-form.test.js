const assert=require('node:assert/strict'),{build}=require('./ticket-form'),P=require('./ticket-profile');
const profile={firstName:'Max',lastName:'Muster',phone:'555-1234',rulesAcceptedAt:'2026-01-01'};
const fields=(values)=>({getTextInputValue:key=>{assert(Object.hasOwn(values,key),'Gespeichertes Feld erneut abgefragt: '+key);return values[key];}});
const ids=(category,p)=>build('ticket-test',category,p).toJSON().components.map(row=>row.components[0].custom_id);
for(const category of ['beratung','klage','strafverteidigung','vertraege','beschwerde']){
 assert.deepEqual(ids(category,profile),['subject','facts']);
 assert.deepEqual(P.fromSubmission(profile,fields({})),{firstName:'Max',lastName:'Muster',phone:'555-1234'});
}
assert.deepEqual(ids('bewerbung',profile),['facts']);
assert.equal(build('ticket-test','bewerbung',profile).toJSON().components[0].components[0].required,false);
assert.deepEqual(ids('beratung',{firstName:'Max',lastName:'Muster'}),['phone','subject','facts']);
assert.deepEqual(P.fromSubmission({firstName:'Max',lastName:'Muster'},fields({phone:'555-5678'})),{firstName:'Max',lastName:'Muster',phone:'555-5678'});
assert.deepEqual(ids('beratung',null),['firstName','lastName','phone','subject','facts']);
assert.deepEqual(ids('bewerbung',null),['firstName','lastName','phone','facts']);
assert.throws(()=>P.fromSubmission(null,fields({firstName:'Max',lastName:'',phone:'123'})),/IC-Nachname/);
// An old, already open form cannot overwrite newer master data.
assert.deepEqual(P.fromSubmission(profile,fields({firstName:'Alt',lastName:'Alt',phone:'000'})),{firstName:'Max',lastName:'Muster',phone:'555-1234'});
console.log('OK: saved contacts omitted and reused, only missing fields requested, application works without contact questions.');
