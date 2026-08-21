import { createClient } from '@supabase/supabase-js';
const URL = 'https://yndwbvgjlfilhpubvrtt.supabase.co';
const ANON = 'sb_publishable_bFw4nEa5GgIuKJk0jOq0mg_SBPrkUsR';
const supabase = createClient(URL, ANON);
const taskKey='xray', satkerCode='692311';
const payload={action:'create',taskKey,satkerCode,senderName:'Tes Browser',senderPhone:'08123456789',senderNote:'',files:[{name:'bukti.pdf',size:20,type:'application/pdf',requirementKey:'dokumen_1',documentType:'Data Dukung'}]};
const {data,error}=await supabase.functions.invoke('submission-upload',{body:payload});
if(error){console.log('CREATE error:',error.message);process.exit(0);}
if(data?.error){console.log('CREATE data.error:',data.error);process.exit(0);}
console.log('CREATE ok:',data.submissionNumber,'uploads:',data.uploads.length);
const up=data.uploads[0];
const fakeFile=new File([new Uint8Array([1,2,3,4])],'bukti.pdf',{type:'application/pdf'});
const {error:upErr}=await supabase.storage.from('submission-inbox').uploadToSignedUrl(up.path,up.token,fakeFile,{contentType:'application/pdf'});
if(upErr){console.log('UPLOAD error:',upErr.message,'| status',upErr.status);process.exit(0);}
console.log('UPLOAD ok');
const {data:fin,error:finErr}=await supabase.functions.invoke('submission-upload',{body:{action:'finalize',submissionNumber:data.submissionNumber}});
if(finErr){console.log('FINALIZE error:',finErr.message);process.exit(0);}
if(fin?.error){console.log('FINALIZE data.error:',fin.error);process.exit(0);}
console.log('FINALIZE ok:',JSON.stringify(fin));
