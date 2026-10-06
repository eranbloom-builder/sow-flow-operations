(function(root){
'use strict';
const core=typeof module!=='undefined'?require('./core.js'):root.SOW;
const lib=typeof module!=='undefined'?require('./vendor/pdf-lib.min.js'):root.PDFLib;
async function pdf(s){
 if(s.state!=='Fully approved')throw Error('Final PDF is available only after all approvals.');
 const {PDFDocument,StandardFonts,rgb}=lib,doc=await PDFDocument.create();
 const regular=await doc.embedFont(StandardFonts.TimesRoman),bold=await doc.embedFont(StandardFonts.TimesRomanBold),italic=await doc.embedFont(StandardFonts.TimesRomanItalic);
 doc.setTitle(s.id+' — Statement of Work');doc.setAuthor('Eran Bloom');
 const pages=[],W=612,H=792,left=90,right=522,width=right-left,bottom=78;
 let page,y;
 const clean=t=>String(t).replace(/→/g,' > ').replace(/\t/g,'    ').replace(/[^\x00-\x7F]/g,c=>{try{regular.encodeText(c);return c;}catch{return '?';}});
 function next(){page=doc.addPage([W,H]);pages.push(page);y=720;}
 function lines(text,font,size,maxWidth){return clean(text).split('\n').flatMap(part=>{if(!part)return [''];const out=[];let line='';for(const word of part.split(/\s+/)){if(font.widthOfTextAtSize((line?line+' ':'')+word,size)<=maxWidth){line+=(line?' ':'')+word;continue;}if(line){out.push(line);line='';}if(font.widthOfTextAtSize(word,size)<=maxWidth){line=word;continue;}for(const c of word){if(font.widthOfTextAtSize(line+c,size)>maxWidth){out.push(line);line='';}line+=c;}}out.push(line);return out;});}
 function room(height){if(y-height<bottom)next();}
 function textBlock(b,following){const heading=['title','heading','subheading'].includes(b.type),font=heading?bold:b.type==='note'?italic:regular,size=b.type==='title'?14:['heading','subheading'].includes(b.type)?12:['meta','note'].includes(b.type)?9:11;
 const leading=size*1.08,wrapped=lines(b.text,font,size,width),before=b.type==='heading'?10:b.type==='subheading'?6:0,after=['meta','note'].includes(b.type)?4:6;
 // Keep each heading with at least two lines of following content; keep signature blocks whole.
 const extra=heading&&following?(following.type==='table'?130:following.type==='body'?Math.min(160,lines(following.text,regular,11,width).length*11*1.08+6):28):0;
 if(wrapped.length*leading+before+after<=720-bottom)room(wrapped.length*leading+before+after+extra);
 if(b.text.startsWith('Vendor authorized signatory:')&&following)room(wrapped.length*leading+after+lines(following.text,regular,11,width).length*11*1.08+6);
 y-=before;
 for(const line of wrapped){room(leading);const x=b.type==='title'?left+(width-font.widthOfTextAtSize(line,size))/2:left;page.drawText(line,{x,y:y-size,size,font,color:rgb(0,0,0)});y-=leading;}y-=after;
 }
 function table(b){const widths=[64.8,115.2,61.2,75.6,64.8,50.4],size=9,pad=4,leading=10.5;
 function row(values,header){const f=header?bold:regular,wrapped=values.map((v,i)=>lines(v,f,size,widths[i]-2*pad)),height=Math.max(...wrapped.map(x=>x.length))*leading+2*pad;
 let x=left;for(let i=0;i<values.length;i++){page.drawRectangle({x,y:y-height,width:widths[i],height,borderWidth:.4,borderColor:rgb(.35,.35,.35),...(header?{color:rgb(.93,.93,.93)}:{})});for(let j=0;j<wrapped[i].length;j++)page.drawText(wrapped[i][j],{x:x+pad,y:y-pad-size-j*leading,size,font:f});x+=widths[i];}y-=height;return height;
 }
 const estimate=v=>Math.max(...v.map((c,i)=>lines(c,regular,size,widths[i]-pad*2).length))*leading+pad*2;
 room(estimate(b.headers)+estimate(b.rows[0]||b.headers));row(b.headers,true);
 for(const r of b.rows){const h=estimate(r);if(h>720-bottom-45)throw Error('A milestone is too long for a PDF table row. Shorten the milestone description.');if(y-h<bottom){next();row(b.headers,true);}row(r,false);}y-=9;
 }
 next();const blocks=core.documentModel(s);for(let i=0;i<blocks.length;i++){if(blocks[i].type==='table')table(blocks[i]);else textBlock(blocks[i],blocks[i+1]);}
 for(let i=0;i<pages.length;i++){pages[i].drawText(clean(s.id+' | Revision '+s.revision+' | Portfolio demonstration'),{x:left,y:56,size:9,font:italic});const p='Page '+(i+1);pages[i].drawText(p,{x:right-regular.widthOfTextAtSize(p,9),y:42,size:9,font:regular});}
 return doc.save();
}
const api={pdf};if(typeof module!=='undefined')module.exports=api;else root.SOWPDF=api;
})(typeof globalThis!=='undefined'?globalThis:this);
