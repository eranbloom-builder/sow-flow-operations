(function(root){
'use strict';
const roles=['Contract Manager','Finance Director','Legal Counsel','Delivery Prime'];
const terms=[
 ['Change control','Changes to scope, fees, deliverables or schedule require written agreement by both parties and renewed internal approval where applicable.'],
 ['Acceptance','Customer reviews deliverables against the stated success criteria. Acceptance timing and remediation terms must be agreed by both parties before signature.'],
 ['Fees and payment','Fees are stated in the selected currency. Taxes, invoicing schedule, payment terms and approved expenses must be agreed before signature.'],
 ['Confidentiality and data','Each party protects confidential information and uses it only for this engagement. Privacy, security and data-processing requirements must be agreed before signature.'],
 ['Other contract terms','Intellectual property, warranties, liability, termination, dispute resolution and governing law must be settled in an applicable master agreement or reviewed contract. This demonstration does not supply those terms.']
];
const fields=['project','pmName','pmEmail','vendor','vendorContact','vendorEmail','customer','customerContact','customerEmail','start','end','requirements','scope','success','quantity','milestones'];
function route(d){if(!Number.isFinite(Number(d.amount))||Number(d.amount)<=0)throw Error('Total amount must be a positive number.');return roles.slice(0,Number(d.amount)>100000||d.thirdParty||d.additionalVendor||d.hardware||d.software?4:Number(d.amount)>=50000?2:1);}
function validate(d){const errors=[];for(const k of fields)if(!String(d[k]??'').trim())errors.push('Required: '+k);for(const k of ['pmEmail','vendorEmail','customerEmail'])if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d[k]||''))errors.push('Valid email required: '+k);for(const k of ['start','end']){const s=d[k]||'';if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||(!Number.isFinite(new Date(s+'T00:00:00Z').getTime())||new Date(s+'T00:00:00Z').toISOString().slice(0,10)!==s))errors.push('Valid date required: '+k);}if(d.start>d.end)errors.push('Project end must follow start.');try{route(d);}catch(e){errors.push(e.message);}if(d.travelRequired&&!String(d.travel||'').trim())errors.push('Describe travel and estimated expenses.');if(!['CAD','USD','EUR','GBP'].includes(d.currency))errors.push('Select a currency.');if((d.thirdParty||d.additionalVendor||d.hardware||d.software)&&!String(d.dependencies||'').trim())errors.push('Describe external vendors, hardware or software.');return errors;}
function create(d,sequence){const e=validate(d);if(e.length)throw Error(e.join('\n'));if(!Number.isSafeInteger(sequence)||sequence<1)throw Error('Invalid sequence');return {id:'SOW-'+new Date().getFullYear()+'-'+String(sequence).padStart(5,'0'),revision:1,attempt:0,data:JSON.parse(JSON.stringify(d)),state:'PM review',route:route(d),step:0,reviewed:false,history:[],emails:[]};}
function event(s,text){s.history.push({time:new Date().toISOString(),revision:s.revision,attempt:s.attempt,text});}
function mail(s,to,subject,body){s.emails.push({time:new Date().toISOString(),revision:s.revision,attempt:s.attempt,to,subject:s.id+' r'+s.revision+' — '+subject,body});}
function notifyRole(s){const role=s.route[s.step];mail(s,role+' (demo role inbox)','Approval requested',role+': review the current SOW. '+s.data.project+'; '+s.data.currency+' '+s.data.amount+'.');}
function review(s){if(s.state!=='PM review')throw Error('PM review is unavailable');s.reviewed=true;event(s,'PM confirmed review of revision '+s.revision);}
function submit(s){if(s.state!=='PM review'||!s.reviewed)throw Error('PM must review before submission');s.attempt++;s.step=0;s.state='Pending approval';event(s,'Submitted; approval sequence started');mail(s,s.data.pmEmail,'Submitted','Awaiting '+s.route[0]);notifyRole(s);}
function decide(s,role,approved,comment){if(s.state!=='Pending approval'||role!==s.route[s.step])throw Error('Only the next approver may act');if(!approved&&!String(comment||'').trim())throw Error('Rejection reason is required');event(s,role+' '+(approved?'approved':'rejected')+(comment?' — '+comment:''));if(!approved){s.state='Rejected';s.reviewed=false;mail(s,s.data.pmEmail,'Rejected by '+role,comment+' Revise, review and resubmit; all approvals restart.');return;}s.step++;if(s.step===s.route.length){s.state='Fully approved';mail(s,s.data.pmEmail,'Fully approved','Internal approvals complete. Vendor and customer signatures are still required.');}else{mail(s,s.data.pmEmail,role+' approved','Awaiting '+s.route[s.step]);notifyRole(s);}}
function revise(s,d){if(s.state!=='Rejected'&&s.state!=='PM review')throw Error('Only drafts or rejected SOWs may be edited');const e=validate(d);if(e.length)throw Error(e.join('\n'));s.data=JSON.parse(JSON.stringify(d));s.revision++;s.state='PM review';s.reviewed=false;s.step=0;s.route=route(d);event(s,'Revised; prior approvals invalidated');}
function documentModel(s){
 const d=s.data,b=[],missing='Not provided — PM to confirm before signature.';
 const add=(type,text)=>b.push({type,text});
 const h=t=>add('heading',t),sub=(t,p)=>{add('subheading',t);add('body',p||missing);};
 add('title','STATEMENT OF WORK');add('meta',s.id+' | Revision '+s.revision+' | '+s.state);
 add('note','DEMONSTRATION ONLY — synthetic data; generic clauses require legal review.');
 add('body','Vendor: '+d.vendor+'\nCustomer: '+d.customer);
 h('E1.0 Engagement scope');
 sub('E1.1 Project name',d.project);
 sub('E1.2 Engagement summary',d.introduction||d.requirements);
 sub('E1.3 Budget and price assumptions',d.currency+' '+Number(d.amount).toLocaleString('en-CA',{minimumFractionDigits:2,maximumFractionDigits:2})+'\n'+(d.priceNotes||'Tax treatment, expenses and any separate charges are not specified; PM and Finance must confirm.'));
 sub('E1.4 Intended outcomes',d.objectives||d.success);
 sub('E1.5 Context, deliverables and boundaries',(d.background?'Context: '+d.background+'\n\n':'')+d.scope);
 h('E2.0 Delivery requirements');sub('Required activities',d.requirements);
 add('subheading','E2.1 Delivery work breakdown');
 const milestones=String(d.milestones).split(/\r?\n/).filter(x=>x.trim());
 b.push({type:'table',headers:['Work item','Deliverable / checkpoint','Vendor effort','Customer review','Payment basis','Planned date'],rows:milestones.map((m,i)=>{const match=m.match(/^(\d{4}-\d{2}-\d{2})\s*:\s*(.*)$/);return ['Work item '+(i+1),match?match[2]:m,'Allocation not provided',d.customerContact+'; see E2.4',d.paymentSchedule||'Not provided',match?match[1]:'Date not separately provided'];})});
 add('body','Total engagement effort: '+d.quantity+'\nMilestones and timelines as entered:\n'+d.milestones);
 sub('E2.2 Delivery quality measures',d.standards||d.success);
 sub('E2.3 Working environment and dependencies',(d.environment||'Operating environment: '+missing)+'\nThird party: '+(d.thirdParty?'Yes':'No')+' | Additional vendor: '+(d.additionalVendor?'Yes':'No')+' | Hardware: '+(d.hardware?'Yes':'No')+' | Software: '+(d.software?'Yes':'No')+'\n'+(d.dependencies||'No external dependencies declared.'));
 sub('E2.4 Review and acceptance approach','Success criteria:\n'+d.success+'\n\nCustomer reviewer: '+d.customerContact+' <'+d.customerEmail+'>. '+terms[1][1]);
 sub('E2.5 Progress communications',d.reporting);
 sub('E2.6 Oversight and decision controls','PM: '+d.pmName+' <'+d.pmEmail+'>.\nInternal approval sequence: '+s.route.join(' → ')+'.\n'+(d.controls||'Progress meeting frequency, escalation process and payment controls: '+missing)+'\nRejections return to the PM for revision and renewed review. Every required internal approval restarts for the revised submission.');
 sub('E2.7 Handling changes',terms[0][1]);
 sub('E2.8 Rights in project outputs',d.ipTerms||'Ownership and use rights are to be agreed in the reviewed contract or applicable master agreement. No ownership assignment is implied by this demo.');
 h('E3.0 Engagement conditions');
 sub('E3.1 Contacts and accountable parties','Project manager: '+d.pmName+' <'+d.pmEmail+'>\nVendor focal point: '+d.vendorContact+' <'+d.vendorEmail+'>\nCustomer focal point: '+d.customerContact+' <'+d.customerEmail+'>\nContract administration / invoice contact: '+(d.contractContact||missing));
 sub('E3.2 Customer support responsibilities',d.customerObligations||'DEMO CLAUSE: Customer provides agreed access, relevant information and a focal point for deliverable review. Specific obligations and response times require agreement.');
 sub('E3.3 Vendor delivery responsibilities',d.vendorObligations||'DEMO CLAUSE: Vendor delivers the agreed scope and milestones, raises blockers with the PM and protects confidential information. Specific obligations require agreement.');
 sub('E3.4 Delivery location',d.location);
 sub('E3.5 Working language',d.language);
 sub('E3.6 Permits and other special conditions',d.specialRequirements);
 sub('E3.7 Information safeguards',d.security||terms[3][1]);
 sub('E3.8 Insurance arrangements',d.insurance);
 sub('E3.9 Travel, expenses and payment','Travel required: '+(d.travelRequired===true?'Yes':d.travelRequired===false?'No':'Not specified')+'\n'+(d.travel||'')+'\n'+terms[2][1]);
 add('note','Additional demo contract placeholder: '+terms[4][1]);
 h('E4.0 Timing and capacity');
 sub('E4.1 Engagement dates','Start date: '+d.start+'\nEnd date: '+d.end);
 sub('E4.2 Timeline and effort allocation','Total quantity / effort: '+d.quantity+'\n'+d.milestones+'\nSee E2.1 for work breakdown. Per-work-item effort and payment allocation require confirmation.');
 h('E5.0 Staffing and expertise');sub('E5.1 Required delivery roles',d.resources||'Vendor coordination: '+d.vendorContact+'.\nTotal effort: '+d.quantity+'.\nDetailed staffing mix, qualifications and role allocation: '+missing);
 h('E6.0 Supporting material and execution');
 sub('E6.1 Reference materials',d.documents);
 sub('E6.2 Terminology','SOW: statement of work. PM: project manager. Vendor: '+d.vendor+'. Customer: '+d.customer+'.');
 sub('E6.3 Authorized signatures','Vendor and customer signatories review the final agreed version before signing. Internal approval does not constitute signature.');
 add('body','Vendor authorized signatory: ____________________\nOrganization: '+d.vendor+'\nName / Title: ____________________\nSignature: ____________________  Date: ____________________');
 add('body','Customer authorized signatory: ____________________\nOrganization: '+d.customer+'\nName / Title: ____________________\nSignature: ____________________  Date: ____________________');
 return b;
}
function paragraphs(s){return documentModel(s).flatMap(b=>b.type==='table'?[b.headers.join(' | '),...b.rows.map(r=>r.join(' | '))]:[b.text]);}
const esc=x=>String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
// Minimal dependency-free, uncompressed ZIP writer for a real OOXML Word document.
function zip(entries){const enc=new TextEncoder(),parts=[],central=[];let offset=0;const u16=n=>[n&255,(n>>>8)&255],u32=n=>[n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255];for(const [name,content] of entries){const filename=enc.encode(name),data=enc.encode(content);let crc=0xffffffff;for(const b of data){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}crc=(crc^0xffffffff)>>>0;const head=new Uint8Array([...u32(0x04034b50),...u16(20),...u16(0),...u16(0),...u16(0),...u16(33),...u32(crc),...u32(data.length),...u32(data.length),...u16(filename.length),...u16(0),...filename]);parts.push(head,data);central.push(new Uint8Array([...u32(0x02014b50),...u16(20),...u16(20),...u16(0),...u16(0),...u16(0),...u16(33),...u32(crc),...u32(data.length),...u32(data.length),...u16(filename.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset),...filename]));offset+=head.length+data.length;}const len=central.reduce((n,x)=>n+x.length,0);parts.push(...central,new Uint8Array([...u32(0x06054b50),...u16(0),...u16(0),...u16(entries.length),...u16(entries.length),...u32(len),...u32(offset),...u16(0)]));const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let p=0;for(const a of parts){out.set(a,p);p+=a.length;}return out;}
function preview(s){return documentModel(s).map(b=>b.type==='table'?'<div class="sow-table-wrap"><table><thead><tr>'+b.headers.map(x=>'<th>'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+b.rows.map(r=>'<tr>'+r.map(x=>'<td>'+esc(x)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>':'<'+({title:'h2',heading:'h3',subheading:'h4'}[b.type]||'p')+' class="sow-'+b.type+'">'+esc(b.text).replace(/\n/g,'<br>')+'</'+({title:'h2',heading:'h3',subheading:'h4'}[b.type]||'p')+'>').join('');}
function wordP(text,type='body',size){const bold=['title','heading','subheading','tableHead'].includes(type),points=size||(['meta','note','footer'].includes(type)?18:type==='title'?28:['heading','subheading'].includes(type)?24:22);return '<w:p><w:pPr><w:keepLines/>'+(['title','heading','subheading','tableHead'].includes(type)?'<w:keepNext/>':'')+'<w:spacing w:before="'+(type==='heading'?200:type==='subheading'?120:0)+'" w:after="'+(['meta','note','footer'].includes(type)?80:120)+'" w:line="240" w:lineRule="auto"/>'+(type==='title'?'<w:jc w:val="center"/>':'')+'</w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/>'+ (bold?'<w:b/>':'')+(['note','footer'].includes(type)?'<w:i/>':'')+'<w:sz w:val="'+points+'"/></w:rPr>'+String(text).split('\n').map((line,i)=>(i?'<w:br/>':'')+'<w:t xml:space="preserve">'+esc(line)+'</w:t>').join('')+'</w:r></w:p>';}
function wordTable(b){const widths=[1296,2304,1224,1512,1296,1008];return '<w:tbl><w:tblPr><w:tblW w:w="8640" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>'+['top','left','bottom','right','insideH','insideV'].map(k=>'<w:'+k+' w:val="single" w:sz="4" w:color="555555"/>').join('')+'</w:tblBorders><w:tblCellMar><w:top w:w="80" w:type="dxa"/><w:left w:w="90" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="90" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>'+widths.map(w=>'<w:gridCol w:w="'+w+'"/>').join('')+'</w:tblGrid>'+[b.headers,...b.rows].map((r,i)=>'<w:tr><w:trPr><w:cantSplit/>'+(i===0?'<w:tblHeader/>':'')+'</w:trPr>'+r.map((c,j)=>'<w:tc><w:tcPr><w:tcW w:w="'+widths[j]+'" w:type="dxa"/>'+(i===0?'<w:shd w:fill="EEEEEE"/>':'')+'</w:tcPr>'+wordP(c,i===0?'tableHead':'body',18)+'</w:tc>').join('')+'</w:tr>').join('')+'</w:tbl>';}
function docx(s){
 const xml='<?xml version="1.0" encoding="UTF-8"?>',ns='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
 const footer=xml+'<w:ftr '+ns+'>'+wordP(s.id+' | Revision '+s.revision+' | Portfolio demonstration','footer')+'<w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">Page </w:t></w:r><w:fldSimple w:instr="PAGE"/></w:p></w:ftr>';
 const body=documentModel(s).map(b=>b.type==='table'?wordTable(b):wordP(b.text,b.type)).join('');
 return zip([
 ['[Content_Types].xml',xml+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>'],
 ['_rels/.rels',xml+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
 ['word/_rels/document.xml.rels',xml+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rFooter" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>'],
 ['word/footer1.xml',footer],
 ['word/document.xml',xml+'<w:document '+ns+' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>'+body+'<w:sectPr><w:footerReference w:type="default" r:id="rFooter"/><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:bottom="1440" w:left="1800" w:right="1800" w:header="720" w:footer="720"/></w:sectPr></w:body></w:document>']
 ]);
}
const api={roles,route,validate,create,review,submit,decide,revise,paragraphs,documentModel,preview,docx};if(typeof module!=='undefined')module.exports=api;else root.SOW=api;
})(typeof globalThis!=='undefined'?globalThis:this);
