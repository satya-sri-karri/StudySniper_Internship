import { db } from '../db.ts';
import { HttpError } from '../http.ts';
export function ownedDocument(userId: string,id: string) {
 const doc=db.get.documents.find(d=>d.id===id && d.userId===userId);
 if(!doc) throw new HttpError(404,'Document not found.');
 return doc;
}
export function retrieve(text: string,query: string) {
 const words=[...new Set(query.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu)||[])].filter(w=>!['what','which','does','explain','about','this','that','from','with','please','document'].includes(w));
 const chunks: {id:string;text:string;score:number}[]=[];
 for(let offset=0;offset<text.length;offset+=1000) {
  const content=text.slice(offset,offset+1200);
  const score=words.reduce((sum,w)=>sum+(content.toLowerCase().includes(w)?1:0),0);
  chunks.push({id:`chunk-${chunks.length+1}`,text:content,score});
 }
 return chunks.filter(c=>c.score>0).sort((a,b)=>b.score-a.score).slice(0,6);
}
export function sourceForTopic(userId:string,documentId:string,topic:string) {
 const doc=ownedDocument(userId,documentId),chunks=retrieve(doc.extractedText,topic);
 if(!chunks.length) throw new HttpError(422,'No matching source passages. Use a topic present in the selected document.');
 return chunks.map(c=>`[${c.id}] ${c.text}`).join('\n\n');
}
