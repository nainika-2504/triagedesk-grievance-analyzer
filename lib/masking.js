export function maskPersonalDetails(text) {
  return String(text || "")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[EMAIL]")
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, m => m.replace(/\D/g,"").length >= 9 ? "[PHONE]" : m)
    .replace(/\b(?:roll\s*(?:no|number)?|student\s*id|id\s*no|registration\s*(?:no|number)?|reg\s*no|employee\s*id)\s*[:#-]?\s*[A-Z0-9/-]{4,}\b/gi, "[ID]")
    .replace(/\b(?:VITAP|VIT-AP)[A-Z0-9-]{5,}\b/gi, "[ID]");
}
export function isEmptyText(text) { return !String(text || "").trim(); }