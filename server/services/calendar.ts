import type {StudyPlan} from '../db.ts';
import {addDays} from './learning.ts';
const escape=(s:string)=>s.replace(/\\/g,'\\\\').replace(/\r?\n|\r/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
// RFC 5545: physical lines max 75 UTF-8 octets, continued with a space.
function fold(line:string){let result='',current='',size=0;for(const char of line){const bytes=Buffer.byteLength(char);if(size+bytes>75){result+=current+'\r\n';current=' ';size=1;}current+=char;size+=bytes;}return result+current;}
export function calendar(plan:StudyPlan){
 const stamp=(plan.lastReplannedAt||plan.createdAt).replace(/[-:]/g,'').replace(/\.\d{3}/,'');
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//StudySniper//Study Plan//EN','CALSCALE:GREGORIAN'];
 for(const t of plan.tasks.filter(t=>!t.completed&&!t.unscheduled&&/^\d{4}-\d{2}-\d{2}$/.test(t.day))){
  lines.push('BEGIN:VEVENT','UID:'+escape(plan.id+'-'+t.id+'@studysniper'),'DTSTAMP:'+stamp,'DTSTART;VALUE=DATE:'+t.day.replace(/-/g,''),'DTEND;VALUE=DATE:'+addDays(t.day,1).replace(/-/g,''),'SUMMARY:'+escape(t.subject+': '+t.topic),'DESCRIPTION:'+escape(`${plan.title}\nStudy for ${t.durationMinutes} minutes. Choose your own study time. Dates follow the app UTC schedule.`),'END:VEVENT');
 }
 lines.push('END:VCALENDAR');return lines.map(fold).join('\r\n')+'\r\n';
}
