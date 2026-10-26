const STOP = new Set("the and for this that with from into have has was are were our your please there their they water issue problem not no at in on to of a an is it we i my hostel mess room block supply".split(" "));
export function terms(text) { return String(text||"").toLowerCase().replace(/[^a-z0-9 ]/g," ").split(/\s+/).filter(w=>w.length>2&&!STOP.has(w)); }
export function vector(texts) {
 const docs=texts.map(terms), df={}; docs.forEach(d=>[...new Set(d)].forEach(t=>df[t]=(df[t]||0)+1));
 return docs.map(d=>{const tf={}; d.forEach(t=>tf[t]=(tf[t]||0)+1); const v={}; Object.keys(tf).forEach(t=>v[t]=(1+Math.log(tf[t]))*(Math.log(1+(docs.length+1)/(1+(df[t]||0)))+1)); return v;});
}
export function cosine(a,b) { let dot=0,aa=0,bb=0; Object.keys(a).forEach(k=>{aa+=a[k]*a[k];if(b[k])dot+=a[k]*b[k]});Object.keys(b).forEach(k=>bb+=b[k]*b[k]);return aa&&bb?dot/Math.sqrt(aa*bb):0; }
export function similarityMatrix(items) { const vs=vector(items.map(x=>x.issue||x.text));return items.map((a,i)=>items.map((b,j)=>i===j?1:(a.category===b.category?0.12:0)+0.88*cosine(vs[i],vs[j]))); }