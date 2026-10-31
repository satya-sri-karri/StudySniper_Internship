import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {z} from 'zod';
process.env.JWT_SECRET=randomBytes(48).toString('hex');process.env.XAI_API_KEY='test-private-key';process.env.XAI_MODEL='test-model';
const {askAI,generateValidated}=await import('../server/services/ai.ts');
const original=globalThis.fetch;
after(()=>{globalThis.fetch=original;});
function answer(content:unknown,extra={}){return new Response(JSON.stringify({choices:[{message:{content},...extra}]}),{headers:{'Content-Type':'application/json'}});}
test('Grok uses server authentication, configured model and no external search tools',async()=>{
 globalThis.fetch=async(url,options)=>{assert.equal(url,'https://api.x.ai/v1/chat/completions');assert.equal(options?.method,'POST');assert.equal(new Headers(options?.headers).get('Authorization'),'Bearer test-private-key');const body=JSON.parse(String(options?.body));assert.equal(body.model,'test-model');assert.equal(body.messages[1].content,'Explain TCP');assert.equal(body.stream,false);assert.equal(body.tools,undefined);assert.ok(options?.signal);return answer('TCP uses acknowledgements.');};
 assert.equal(await askAI('Explain TCP'),'TCP uses acknowledgements.');
});
test('missing Grok configuration fails before any provider call',async()=>{
 process.env.XAI_API_KEY='';globalThis.fetch=async()=>{throw new Error('Must not call provider');};
 await assert.rejects(askAI('test'),(e:any)=>e.status===503&&e.message.includes('XAI_API_KEY'));process.env.XAI_API_KEY='test-private-key';
});
test('Grok errors expose safe configuration and retry messages without provider details',async()=>{
 for(const [status,expected] of [[401,503],[403,503],[404,502],[429,429],[500,502]]){
  globalThis.fetch=async()=>new Response('private provider details',{status});await assert.rejects(askAI('test'),(e:any)=>e.status===expected&&!e.message.includes('private provider details'));
 }
});
test('Grok malformed JSON and schema mismatches retry once without weakening validation',async()=>{
 let calls=0;globalThis.fetch=async()=>answer(++calls===1?'not json':'{"score":80}');assert.deepEqual(await generateValidated('Return JSON',z.object({score:z.number().max(100)})),{score:80});assert.equal(calls,2);
 calls=0;globalThis.fetch=async()=>{calls++;return answer('{"score":999}');};await assert.rejects(generateValidated('Return JSON',z.object({score:z.number().max(100)})),/invalid or unsupported content twice/);assert.equal(calls,2);
});
test('Grok rejects empty, truncated and non-JSON transport responses',async()=>{
 for(const response of [answer(''),answer('{"partial":',{finish_reason:'length'}),new Response('not a response envelope')]){globalThis.fetch=async()=>response;await assert.rejects(askAI('test'),(e:any)=>e.status===502);}
});
test('cancellation stops requests and prevents a late response from being accepted',async()=>{
 const controller=new AbortController();controller.abort();let calls=0;globalThis.fetch=async()=>{calls++;return answer('{}');};await assert.rejects(generateValidated('test',z.object({}),controller.signal),(e:any)=>e.status===504);assert.equal(calls,0);
 const late=new AbortController();globalThis.fetch=async()=>{late.abort();return answer('{}');};await assert.rejects(generateValidated('test',z.object({}),late.signal),(e:any)=>e.status===504);
});
