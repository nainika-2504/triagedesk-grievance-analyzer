import { PROMPTS } from "./prompts.js";
import { normalizeUrgency } from "./rules.js";
import { getProfile } from "./profiles.js";
function parseJson(s) { const t=String(s||"").replace(/^\x60\x60\x60(?:json)?/i,"").replace(/\x60\x60\x60$/,"").trim(); const a=t.indexOf("{"),b=t.lastIndexOf("}"); if(a<0||b<a) throw new Error("Invalid JSON from model"); return JSON.parse(t.slice(a,b+1)); }
function mock(schemaName,prompt,profile) {
 const full=String(prompt||"").toLowerCase(),p=schemaName==="complaint"?(full.split("complaint:").pop()||full).trim():full,workspace=getProfile(profile),depts=workspace.departments.map(d=>d.name);
 if(schemaName==="pair"){const a=p.split("a:")[1]?.split("b:")[0]||"",b=p.split("b:")[1]||"",aa=new Set(a.match(/[a-z]{4,}/g)||[]),bb=new Set(b.match(/[a-z]{4,}/g)||[]),common=[...aa].filter(x=>bb.has(x)).length;return{same_problem:common>=2,reason:common>=2?"Several meaningful issue terms overlap in this mock comparison.":"The available wording does not establish the same underlying problem."};}
 if(schemaName==="case") {const requested=p.split("category:")[1]?.split(".")[0]?.trim(),department=depts.find(d=>d.toLowerCase()===requested?.toLowerCase())||"Unassigned";return {department,next_action:"Ask the responsible team to verify the report and provide an update.",draft_reply:"Thank you for reporting this issue. The team will review it and determine the next steps.",confidence:department==="Unassigned"?0.2:0.42};}
 const hints=[{words:["water","tap","supply","drinking"],keys:["water","supply","tap","droplet"]},{words:["food","meal","kitchen","canteen","mess"],keys:["food","meal","dining","kitchen"]},{words:["exam","marks","class","course","attendance"],keys:["academic","exam","course","teaching","records"]},{words:["wifi","internet","network","portal","login","computer","app"],keys:["network","wifi","system","digital","technical","connectivity","internet"]},{words:["bus","shuttle","route","driver","transport"],keys:["transport","bus","route","field operations"]},{words:["fire","threat","unsafe","harassment","ragging","shock","sparks","sparking","burning","chemical","cable","spill","injury","emergency","overflow"],keys:["safety","security","compliance","public safety"]},{words:["medical","ambulance","clinic","fever","injury","bleeding"],keys:["health","medical","public health"]},{words:["bill","invoice","payment","tax","charge","receipt"],keys:["billing","tax","revenue","invoice","payment","receipt"]},{words:["waste","garbage","trash","recycle","sanitation"],keys:["waste","sanitation","recycle","cleaning"]},{words:["road","pothole","streetlight","pavement"],keys:["road","streetlight","street","infrastructure"]},{words:["drain","sewage","flood","overflow"],keys:["drain","sewage","drainage"]},{words:["book","library","borrow","reading"],keys:["library","book","study"]},{words:["install","setup","technician","visit","repair"],keys:["install","field","maintenance","repair","operation"]}];
 let best=0,category="Unassigned";for(const d of workspace.departments){const desc=(d.name+" "+d.description).toLowerCase(),words=desc.split(/[^a-z0-9]+/).filter(x=>x.length>3&&!["public","general","service","services","request","requests","issue","issues","and","with","from","this","that","team","support","concerns","concern","reports","report","your","their"].includes(x));let score=0;for(const word of words)if(p.includes(word))score+=2;for(const hint of hints)if(hint.words.some(word=>p.includes(word))&&hint.keys.some(key=>desc.includes(key)))score+=3;if(score>best){best=score;category=d.name;}}if(best===0)category="Unassigned";
 const urgency=/fire|gas leak|shock|harass|ragging|ambulance|threat|stuck in lift|short circuit|injury|unsafe|smoke|sparks|spill|overflow/.test(p)?"high":/urgent|immediately|emergency/.test(p)?"high":/broken|not working|no water|no wifi|problem|issue|leak/.test(p)?"medium":"low";
 const language=/[\u0C00-\u0C7F]/.test(p)?(/[\u0900-\u097F]/.test(p)?"mixed":"te"):/[\u0900-\u097F]/.test(p)?"hi":/\b(anna|ledu|undhi|kavali|hai|nahi|chahiye)\b/.test(p)?"mixed":"en";
 const topic=/water|tap|supply|पानी/.test(p)?"water supply":/fan/.test(p)?"fan repair":/leak/.test(p)?"leak repair":/wifi|internet|network/.test(p)?"network connectivity":/portal|login/.test(p)?"portal access":/bus|shuttle/.test(p)?"transport service":/food|meal|mess/.test(p)?"food quality":/tax|bill|invoice/.test(p)?"billing query":/road|pothole/.test(p)?"road repair":/sewage|drain/.test(p)?"drainage concern":/gas leak|fire|smoke|short circuit|electric shock|sparks/.test(p)?"urgent safety hazard":"service request";
 return {category,issue:category+" — "+topic,urgency,urgency_reason:urgency==="high"?"The text indicates a potentially time-sensitive service or safety concern.":"Priority estimated from the wording and reported impact.",language,confidence:category==="Unassigned"?0.25:0.51};
}
export async function callModel(prompt,schemaName,profile) {
 const workspace=getProfile(profile), names=workspace.departments.map(d=>d.name);
 try {
  const key=typeof process!=="undefined"?process.env.GEMINI_API_KEY:"";
  if(!key)throw new Error("GEMINI_API_KEY missing");
  const model=(typeof process!=="undefined"&&process.env.GEMMA_MODEL)||"gemma-3-12b-it";
  const r=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+encodeURIComponent(model)+":generateContent?key="+encodeURIComponent(key),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:"Return only valid JSON. No markdown. "+prompt}]}],generationConfig:{responseMimeType:"application/json",temperature:0.1}}),signal:AbortSignal.timeout(18000)});
  if(!r.ok)throw new Error("Gemini API HTTP "+r.status);
  const data=await r.json(),raw=data.candidates?.[0]?.content?.parts?.map(x=>x.text||"").join("")||"",value=parseJson(raw);
  if(schemaName==="complaint") {
   if(!["critical","high","medium","low"].includes(value.urgency)||!["en","te","hi","mixed"].includes(value.language)||typeof value.issue!=="string"||typeof value.urgency_reason!=="string"||!(Number(value.confidence)>=0&&Number(value.confidence)<=1))throw new Error("Schema validation failed");
   const valid=names.includes(value.category),confidence=valid?Number(value.confidence):Math.min(Number(value.confidence)||0.2,0.25);
   return {...value,category:valid?value.category:"Unassigned",confidence,needsReview:!valid};
  }
  if(schemaName==="pair"&&typeof value.same_problem==="boolean"&&typeof value.reason==="string")return value;
  if(schemaName==="case"&&typeof value.next_action==="string"&&typeof value.draft_reply==="string"&&Number(value.confidence)>=0&&Number(value.confidence)<=1) {
   const valid=names.includes(value.department),confidence=valid?Number(value.confidence):Math.min(Number(value.confidence)||0.2,0.25);
   return {...value,department:valid?value.department:"Unassigned",confidence,needsReview:!valid};
  }
  throw new Error("Schema validation failed");
 } catch(e) {
  const value=mock(schemaName,prompt,workspace);
  if(schemaName==="complaint"&&!names.includes(value.category))return {...value,category:"Unassigned",confidence:0.2,needsReview:true,_mock:true,_reason:String(e?.message||"Model unavailable").slice(0,100)};
  if(schemaName==="case"&&!names.includes(value.department))return {...value,department:"Unassigned",confidence:0.2,needsReview:true,_mock:true,_reason:String(e?.message||"Model unavailable").slice(0,100)};
  return {...value,_mock:true,_reason:String(e?.message||"Model unavailable").slice(0,100)};
 }
}
export { PROMPTS };