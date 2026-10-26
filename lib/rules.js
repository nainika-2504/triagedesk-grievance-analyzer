import { getProfile } from "./profiles.js";
export const URGENCY = ["critical","high","medium","low"];
// Department names are resolved from the active workspace profile.
export function departmentNames(profile) { return getProfile(profile).departments.map(d=>d.name); }
export function safetyRule(text, profile) {
 const p=getProfile(profile), source=String(text||"").toLowerCase();
 return p.safetyKeywords.some(k=>k.trim() && source.includes(k.trim().toLowerCase()));
}
export function floorUrgency(urgency,text,profile) {
 const levels={low:0,medium:1,high:2,critical:3}, raised=safetyRule(text,profile);
 return {urgency:raised&&levels[urgency]<levels.high?"high":urgency,raised};
}
export function normalizeDepartment(x,profile) {
 const names=departmentNames(profile);
 return names.includes(x)?x:"Unassigned";
}
export function normalizeUrgency(x) { return URGENCY.includes(x)?x:"medium"; }