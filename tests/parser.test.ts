import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import {parseDocumentFile} from '../src/utils/documentParser.ts';
import {questionSchema,cardSchema} from '../server/validation.ts';
test('text parser preserves real notes and rejects empty or unsupported files',async()=>{
 const parsed=await parseDocumentFile(new File(['TCP provides reliable ordered transport.'],'notes.txt'));
 assert.match(parsed.textContent,/reliable/);
 await assert.rejects(parseDocumentFile(new File([''],'empty.txt')),/nonempty/);
 await assert.rejects(parseDocumentFile(new File(['legacy binary'],'notes.doc')),/Unsupported/);
 await assert.rejects(parseDocumentFile(new File(['not a PDF'],'fake.pdf')),/valid PDF/);
});
test('archive expansion limits reject compressed oversized documents',async()=>{
 const zip=new JSZip();zip.file('word/document.xml','a'.repeat(22*1024*1024));
 const bytes=await zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
 await assert.rejects(parseDocumentFile(new File([bytes],'bomb.docx')),/expansion limits/);
});
test('generated schemas reject malformed choice answers and blank cards',()=>{
 assert.equal(questionSchema.safeParse({type:'mcq',question:'Which?',options:['A','B'],correctAnswer:'C',explanation:'Example'}).success,false);
 assert.equal(cardSchema.safeParse({front:'',back:'Answer'}).success,false);
});
