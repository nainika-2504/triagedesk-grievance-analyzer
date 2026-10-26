import { getState, putState } from "../lib/db.js";
import { PRESETS, ICONS, getProfile } from "../lib/profiles.js";
export const access="public";
export const methods=["GET","POST"];
export default async function(req,res) {
 try {
  if(req.method==="GET"){const s=await getState();return res.json({complaints:s.complaints||[],cases:s.cases||[],audit:s.audit||[],benchmark:s.benchmark||[],aiMocked:s.aiMocked!==false,aiMode:s.aiMode||(s.aiMocked!==false?"mock":"real"),aiSummary:s.aiSummary||(s.aiMocked!==false?"Mock":"Real model"),aiFallbackReason:s.aiFallbackReason||"",workspace:getProfile(s.workspace),profiles:PRESETS,icons:ICONS});}
  const b=req.body||{}; const allowed=["complaints","cases","audit","benchmark","aiMocked","workspace","aiMode","aiSummary","aiFallbackReason"];
  for(const k of Object.keys(b)) if(!allowed.includes(k)) return res.status(400).json({error:"Unsupported state field"});
  const current=await getState(); for(const k of Object.keys(b)) await putState(k,b[k]);
  return res.json({ok:true,updated:Object.keys(b)});
 } catch(e){return res.status(500).json({error:"State storage failed",detail:String(e?.message||e)});}
}