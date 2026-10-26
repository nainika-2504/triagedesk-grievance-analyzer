import { callModel } from "./callModel.js";
import { PROMPTS } from "./prompts.js";
import { maskPersonalDetails } from "./masking.js";
import { floorUrgency, normalizeUrgency } from "./rules.js";
import { similarityMatrix } from "./similarity.js";
import { getProfile } from "./profiles.js";
export async function analyzeComplaints(complaints, activeProfile) {
 const profile=getProfile(activeProfile), departments=profile.departments, results=[]; let mocked=false;
 for(const c of complaints) {
  const masked=maskPersonalDetails(c.text);
  const a=await callModel(PROMPTS.complaint({text:masked,departments,organisationType:profile.terms.organisationType,itemName:profile.terms.itemName}),"complaint",profile);
  if(a._mock)mocked=true;
  const floor=floorUrgency(normalizeUrgency(a.urgency),masked,profile),valid=departments.some(d=>d.name===a.category);
  results.push({...c,maskedText:masked,category:valid?a.category:"Unassigned",issue:a.issue||"Unclear service request",urgency:floor.urgency,urgency_reason:a.urgency_reason||"Priority requires human assessment.",language:["en","te","hi","mixed"].includes(a.language)?a.language:"en",confidence:valid?(a.confidence??0.5):Math.min(a.confidence??0.2,0.25),needsReview:!valid||!!a.needsReview,departmentFlag:!valid?"Unassigned department requires human review":undefined,safetyRaised:floor.raised,analysisMocked:!!a._mock});
 }
 const matrix=similarityMatrix(results),n=results.length,parent=results.map((_,i)=>i);
 const find=x=>parent[x]===x?x:(parent[x]=find(parent[x]));
 const union=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent[b]=a};
 for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){
  const sim=matrix[i][j],sameCategory=results[i].category===results[j].category;
  if(sim>=0.53&&sameCategory)union(i,j);
  else if(sim>=0.32&&sameCategory&&sim<0.53){const pair=await callModel(PROMPTS.pair(results[i].issue,results[j].issue),"pair",profile);if(pair._mock)mocked=true;if(pair.same_problem)union(i,j);}
 }
 const groups={};results.forEach((c,i)=>{const k=find(i);(groups[k]||(groups[k]=[])).push(c)});
 const cases=[];
 for(const members of Object.values(groups)){
  const cats={};members.forEach(c=>cats[c.category]=(cats[c.category]||0)+1);
  const category=Object.keys(cats).sort((a,b)=>cats[b]-cats[a])[0]||"Unassigned";
  const urgOrder={critical:4,high:3,medium:2,low:1},urgency=members.reduce((a,c)=>urgOrder[c.urgency]>urgOrder[a]?c.urgency:a,"low");
  const langs={};members.forEach(c=>langs[c.language]=(langs[c.language]||0)+1);
  const languages=Object.keys(langs).sort((a,b)=>langs[b]-langs[a]);
  const rec=await callModel(PROMPTS.case({issues:members.map(c=>c.issue),category,languages,departments,organisationType:profile.terms.organisationType,itemName:profile.terms.itemName}),"case",profile);
  if(rec._mock)mocked=true;
  const validDepartment=departments.some(d=>d.name===rec.department),department=validDepartment?rec.department:"Unassigned";
  const caseId="CASE-"+String(cases.length+1).padStart(3,"0");
  cases.push({id:caseId,title:members.length>=5?members.length+" "+profile.terms.itemNamePlural+", "+category+" recurring issue":category+" — "+members[0].issue,category,urgency,urgency_reason:members.find(c=>c.urgency===urgency)?.urgency_reason||"Priority reflects the most urgent complaint in this case.",department,next_action:rec.next_action||"Ask a human reviewer to assign the right department.",draft_reply:rec.draft_reply||"Thank you for the report. A reviewer will assess the next steps.",confidence:Math.min(...members.map(c=>c.confidence),validDepartment?(rec.confidence??0.5):0.2),needsReview:members.some(c=>c.needsReview)||!validDepartment||!!rec.needsReview,departmentFlag:validDepartment?undefined:"Unassigned department requires human review",complaints:members.map(c=>({...c})),status:"Pending review",decision:null,overridden:false,createdAt:new Date().toISOString(),safetyRaised:members.some(c=>c.safetyRaised),analysisMocked:members.some(c=>c.analysisMocked)||!!rec._mock});
 }
 cases.sort((a,b)=>({critical:4,high:3,medium:2,low:1}[b.urgency]-({critical:4,high:3,medium:2,low:1}[a.urgency]))||b.complaints.length-a.complaints.length);
 return {cases,complaints:results,mocked};
}