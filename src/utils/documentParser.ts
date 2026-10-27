const MAX_FILE_BYTES=10*1024*1024, MAX_TEXT=200000;
const textTypes=['TXT','MD','CSV','JSON','JS','TS','PY','JAVA','C','CPP','HTML','CSS','LOG','SRT','RST','XML','YAML','YML'];
export async function parseDocumentFile(file:File) {
 const ext=file.name.split('.').pop()?.toUpperCase() || '';
 if(!file.size || file.size>MAX_FILE_BYTES) throw new Error('Choose a nonempty document up to 10 MB.');
 if(!['PDF','DOCX','PPTX',...textTypes].includes(ext)) throw new Error('Unsupported format. Convert legacy DOC/PPT to DOCX/PPTX first.');
 let textContent='';
 if(textTypes.includes(ext)) textContent=await file.text();
 else {
  const bytes=await file.arrayBuffer();
  if(ext==='PDF') {
   if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-') throw new Error('This is not a valid PDF.');
   const pdfjs=await import('pdfjs-dist');
   const {default:workerUrl}=await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
   pdfjs.GlobalWorkerOptions.workerSrc=workerUrl;
   const task=pdfjs.getDocument({data:bytes});
   const timer=setTimeout(()=>void task.destroy(),30000);
   try {
    const pdf=await task.promise;
    if(pdf.numPages>100) throw new Error('PDF exceeds 100 pages. Upload a smaller section.');
    for(let page=1;page<=pdf.numPages;page++) {
     const content=await (await pdf.getPage(page)).getTextContent();
     textContent+=`[Page ${page}]\n`+content.items.map((item:any)=>item.str||'').join(' ')+'\n\n';
     if(textContent.length>MAX_TEXT) throw new Error('Extracted text exceeds 200,000 characters. Split the document.');
    }
   } finally {clearTimeout(timer);await task.destroy();}
  } else {
   const {default:JSZip}=await import('jszip');
   const zip=await JSZip.loadAsync(bytes),entries=Object.values(zip.files);
   let size=0;
   if(entries.length>2000) throw new Error('Document archive has too many entries.');
   for(const entry of entries) {
    const data=(entry as any)._data;size+=data?.uncompressedSize||0;
    if(size>20*1024*1024 || (data?.uncompressedSize>1024*1024 && data.uncompressedSize/Math.max(1,data.compressedSize)>100)) throw new Error('Document archive exceeds safe expansion limits.');
   }
   if(ext==='DOCX') {
    if(!zip.file('word/document.xml')) throw new Error('Invalid DOCX document.');
    const mammoth=await import('mammoth');textContent=(await mammoth.extractRawText({arrayBuffer:bytes})).value;
   } else {
    const slides=entries.filter(f=>/^ppt\/slides\/slide\d+\.xml$/.test(f.name)).sort((a,b)=>Number(a.name.match(/slide(\d+)/)![1])-Number(b.name.match(/slide(\d+)/)![1]));
    if(!slides.length || slides.length>100) throw new Error('PPTX must contain 1–100 slides.');
    for(const slide of slides) {
     const xml=new DOMParser().parseFromString(await slide.async('text'),'application/xml');
     if(xml.getElementsByTagName('parsererror').length) throw new Error('Invalid slide XML.');
     textContent+=`[Slide ${slide.name.match(/slide(\d+)/)![1]}]\n`+Array.from(xml.getElementsByTagNameNS('*','t')).map(n=>n.textContent).join(' ')+'\n\n';
    }
   }
  }
 }
 textContent=textContent.trim();
 if(textContent.replace(/\[(Page|Slide) \d+\]/g,'').trim().length<20) throw new Error('No readable text found. Scanned documents need OCR before upload.');
 if(textContent.length>MAX_TEXT) throw new Error('Extracted text exceeds 200,000 characters. Split the document.');
 return {fileName:file.name,fileType:ext,fileSize:file.size,textContent};
}
