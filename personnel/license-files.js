const path=require('node:path');
const MIME={'image/png':'png','image/jpeg':'jpg','image/jpg':'jpg','image/webp':'webp','image/gif':'gif','image/heic':'heic','image/heif':'heif','application/pdf':'pdf'};
function extension(file){
 const mime=String(file.contentType||'').toLowerCase().split(';')[0].trim();
 if(MIME[mime])return MIME[mime];
 // Discord may omit the MIME type or classify phone photos as binary files.
 if(!mime||mime==='application/octet-stream'){
  const ext=path.extname(file.name||'').slice(1).toLowerCase();
  if(['png','jpg','jpeg','webp','gif','heic','heif','pdf'].includes(ext))return ext==='jpeg'?'jpg':ext;
 }
 throw Error('Erlaubt sind PNG, JPG, WEBP, GIF, HEIC, HEIF und PDF.');
}
module.exports={extension};
