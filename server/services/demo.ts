import { randomUUID } from 'crypto';
import { db, type User } from '../db.ts';
export function createDemoUser() {
 const id=randomUUID(), now=new Date().toISOString();
 const user:User={id,name:'Demo Student',email:`demo-${id}@example.invalid`,passwordHash:'',authProvider:'local',isVerified:true,tokenVersion:0,streakDays:1,lastActiveDate:now,createdAt:now};
 db.get.users.push(user);
 db.get.documents.push({id:randomUUID(),userId:id,fileName:'Demo_Computer_Networks.txt',fileType:'TXT',fileSize:288,extractedText:'TCP provides reliable, ordered delivery using acknowledgements and retransmissions. UDP sends datagrams without delivery guarantees. DNS resolves domain names to IP addresses. A router forwards packets between networks. TCP connection establishment uses SYN, SYN-ACK, and ACK.',summary:'Demo fixture: TCP, UDP, DNS, and routing.',keyTopics:['TCP','UDP','DNS','Routing'],uploadedAt:now});
 db.get.flashcards.push({id:randomUUID(),userId:id,deckTitle:'Demo: Computer Networks',front:'What does DNS do?',back:'Resolves domain names to IP addresses.',difficulty:'easy',repetitions:0,interval:1,easeFactor:2.5,createdAt:now});
 db.get.quizzes.push({id:randomUUID(),userId:id,title:'Demo: Network fundamentals',subject:'Computer Networks',difficulty:'easy',totalQuestions:2,questions:[{id:randomUUID(),type:'mcq',question:'Which protocol provides reliable, ordered delivery?',options:['TCP','UDP'],correctAnswer:'TCP',explanation:'TCP uses acknowledgements and retransmissions.'},{id:randomUUID(),type:'short_answer',question:'What does DNS resolve domain names to?',correctAnswer:'IP addresses',explanation:'DNS resolves domain names to IP addresses.'}],createdAt:now});
 db.save();return user;
}
