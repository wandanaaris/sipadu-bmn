import { createClient } from "@supabase/supabase-js";
const URL="https://yndwbvgjlfilhpubvrtt.supabase.co";
const ANON="sb_publishable_bFw4nEa5GgIuKJk0jOq0mg_SBPrkUsR";
const supabase=createClient(URL,ANON);
// simulasi tombol "Ajukan" untuk pekerjaan spreadsheet (xray, satker 692311)
const payload={action:"submit-link",taskKey:"xray",satkerCode:"692311",senderName:"Operator Test",senderPhone:"",senderNote:"",sheetUrl:"https://docs.google.com/spreadsheets/d/1t3IIrahsooPjPGIb2IfCNDI1gm53XtYtY19oQm3_Ryk"};
const {data,error}=await supabase.functions.invoke("submission-upload",{body:payload});
if(error){console.log("ERR:",error.message);process.exit(0);}
if(data?.error){console.log("DATA ERR:",data.error);process.exit(0);}
console.log("SUBMIT-LINK OK:",JSON.stringify(data));
