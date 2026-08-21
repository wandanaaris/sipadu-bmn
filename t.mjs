import { createClient } from "@supabase/supabase-js";
const URL="https://yndwbvgjlfilhpubvrtt.supabase.co";
const ANON="sb_publishable_bFw4nEa5GgIuKJk0jOq0mg_SBPrkUsR";
const s=createClient(URL,ANON);
const {data}=await s.functions.invoke("submission-upload",{body:{action:"submit-link",taskKey:"xray",satkerCode:"692311",senderName:"TestTolak",senderPhone:"",senderNote:"",sheetUrl:"x"}});
console.log("CREATED:",data.submissionNumber);
