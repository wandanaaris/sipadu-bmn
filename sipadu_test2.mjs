import { createClient } from "@supabase/supabase-js";
const URL="https://yndwbvgjlfilhpubvrtt.supabase.co";
const ANON="sb_publishable_bFw4nEa5GgIuKJk0jOq0mg_SBPrkUsR";
const supabase=createClient(URL,ANON);
const cases=[["xray","692639"],["master-aset","692639"],["rkbmn","692639"],["master-aset","692307"],["rkbmn","692307"]];
for(const [tk,sc] of cases){
  const payload={action:"create",taskKey:tk,satkerCode:sc,senderName:"Tes",senderPhone:"08123456789",senderNote:"",files:[{name:"b.pdf",size:20,type:"application/pdf",requirementKey:"dokumen_1",documentType:"Data Dukung"}]};
  const {data,error}=await supabase.functions.invoke("submission-upload",{body:payload});
  if(error){console.log(tk,sc,"CREATE err:",error.message);continue;}
  if(data?.error){console.log(tk,sc,"CREATE data.err:",data.error);continue;}
  console.log(tk,sc,"CREATE ok:",data.submissionNumber);
  // finalize tanpa upload (cek apakah finalize nolak)
}
