const workbenchFontCache={};
async function loadWorkbenchFont(key){
  if(!workbenchFontCache[key])workbenchFontCache[key]=(async()=>{
    if(window.WORKBENCH_FONT_DATA?.[key])return Uint8Array.from(atob(window.WORKBENCH_FONT_DATA[key]),c=>c.charCodeAt(0));
    const response=await fetch('assets/fonts/NotoSansSC-'+(key==='bold'?'Bold':'Regular')+'.ttf');
    if(!response.ok)throw Error('字体加载失败，请重试或使用浏览器打印');
    return new Uint8Array(await response.arrayBuffer());
  })().catch(error=>{delete workbenchFontCache[key];throw error});
  return workbenchFontCache[key];
}
/* Export selectable text using embedded TrueType fonts, not viewer substitutions. */
async function resumePdf(paper){
  const {PDFDocument,PDFName,PDFString,rgb,degrees}=PDFLib;
  const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
  doc.setTitle(document.querySelector('.name')?.textContent+' · 简历');
  doc.setCreator('MhWangZi的简历工作台');
  const page=doc.addPage([595.2756,841.8898]);
  const pageHeight=page.getHeight(),px=72/96;
  const origin=paper.getBoundingClientRect(),scale=origin.width/paper.offsetWidth;
  const point=r=>({x:(r.left-origin.left)/scale*px,y:pageHeight-(r.top-origin.top)/scale*px,w:r.width/scale*px,h:r.height/scale*px});
  const color=s=>{const n=s.match(/[\d.]+/g)||[0,0,0];return rgb(...n.slice(0,3).map(x=>Math.max(0,Math.min(1,Number(x)/255))));};
  const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
  const fontCache={};
  await document.fonts.ready;
  async function getFont(style){const key=Number(style.fontWeight)>=600?'bold':'regular';if(!fontCache[key]){const raw=await loadWorkbenchFont(key);const face=fontkit.create(raw);fontCache[key]={font:await doc.embedFont(raw,{subset:false}),descent:-face.descent/face.unitsPerEm,chars:new Set(face.characterSet)};}return {...fontCache[key],syntheticBold:false};}
  page.drawRectangle({x:0,y:0,width:page.getWidth(),height:pageHeight,color:rgb(1,1,1)});
  for(const e of paper.querySelectorAll('h2')){const s=getComputedStyle(e),r=point(e.getBoundingClientRect());if(parseFloat(s.borderBottomWidth)>0)page.drawLine({start:{x:r.x,y:r.y-r.h+.4},end:{x:r.x+r.w,y:r.y-r.h+.4},thickness:parseFloat(s.borderBottomWidth)*px,color:color(s.borderBottomColor)});}
  const walker=document.createTreeWalker(paper,NodeFilter.SHOW_TEXT);let node;
  while(node=walker.nextNode()){
    const parent=node.parentElement,s=getComputedStyle(parent);if(s.display==='none'||s.visibility==='hidden')continue;
    const size=parseFloat(s.fontSize)*px,fill=color(s.color),f=await getFont(s);
    let under=false,strike=false;for(let e=parent;e&&e!==paper;e=e.parentElement){const decor=getComputedStyle(e).textDecorationLine;under ||= decor.includes('underline');strike ||= decor.includes('line-through');}
    for(let i=0;i<node.textContent.length;){
      const code=node.textContent.codePointAt(i),ch=String.fromCodePoint(code),len=ch.length,start=i;i+=len;if(/\s/.test(ch))continue;
      if(!f.chars.has(code))throw Error('字体不支持字符：'+ch+'。可使用浏览器打印。');
      const range=document.createRange();range.setStart(node,start);range.setEnd(node,i);const box=range.getBoundingClientRect();if(!box.width||!box.height)continue;
      const r=point(box),y=r.y-r.h+size*f.descent;
      const opts={x:r.x,y,size,font:f.font,color:fill,xSkew:degrees(s.fontStyle==='italic'?10:0)};
      page.drawText(ch,opts);if(f.syntheticBold)page.drawText(ch,{...opts,x:r.x+.13});
      for(const lineY of [under?y-size*.12:null,strike?y+size*.3:null].filter(x=>x!==null))page.drawLine({start:{x:r.x,y:lineY},end:{x:r.x+r.w,y:lineY},thickness:.45,color:fill});
    }
  }
  for(const li of paper.querySelectorAll('li')){const r=point(li.getBoundingClientRect()),s=getComputedStyle(li),size=parseFloat(s.fontSize)*px,fill=color(s.color),y=r.y-size*.94;if(li.parentElement.tagName==='OL'){const i=[...li.parentElement.children].indexOf(li)+1,f=await getFont(s);page.drawText(i+'.',{x:r.x-10,y,size,font:f.font,color:fill});}else page.drawCircle({x:r.x-4.5,y:y+2,size:.95,color:fill});}
  const photo=paper.querySelector('img.photo');if(photo){await photo.decode();const raw=photo.src;let img;if(raw.startsWith('data:image/png'))img=await doc.embedPng(raw);else if(raw.startsWith('data:image/jpeg'))img=await doc.embedJpg(raw);else{const canvas=document.createElement('canvas');canvas.width=photo.naturalWidth;canvas.height=photo.naturalHeight;canvas.getContext('2d').drawImage(photo,0,0);img=await doc.embedPng(canvas.toDataURL('image/png'));}const r=point(photo.getBoundingClientRect());page.drawImage(img,{x:r.x,y:r.y-r.h,width:r.w,height:r.h});}
  const annots=[];for(const a of paper.querySelectorAll('a[href]'))for(const box of a.getClientRects()){const r=point(box);annots.push(doc.context.register(doc.context.obj({Type:'Annot',Subtype:'Link',Rect:[r.x,r.y-r.h,r.x+r.w,r.y],Border:[0,0,0],A:{S:'URI',URI:PDFString.of(a.href)}})));}page.node.set(PDFName.of('Annots'),doc.context.obj(annots));
  return doc.save();
}
