'use strict';
function toBase64(bytes){let value='';for(let i=0;i<bytes.length;i+=32768)value+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(value);}
$('#exportHtml').onclick=async()=>{
  const button=$('#exportHtml');button.disabled=true;button.textContent='正在打包…';
  try{
    document.querySelectorAll('dialog[open]').forEach(d=>d.close());
    const root=document.documentElement.cloneNode(true);root.dataset.store=uid();
    root.querySelector('#embedded-state').textContent=JSON.stringify(data).replace(/</g,'\\u003c');
    root.querySelector('#form').innerHTML='';root.querySelector('#resume').innerHTML='';
    root.querySelector('#toast').style.display='none';
    root.querySelector('#exportHtml').disabled=false;root.querySelector('#exportHtml').textContent='保存网页';
    const fonts={regular:toBase64(await loadWorkbenchFont('regular')),bold:toBase64(await loadWorkbenchFont('bold'))};
    let css=Array.from(document.styleSheets).map(s=>Array.from(s.cssRules).map(r=>r.cssText).join('\n')).join('\n');
    css=css.replace(/url\(["']?[^)"']*NotoSansSC-Regular\.ttf["']?\)/g,'url(data:font/ttf;base64,'+fonts.regular+')').replace(/url\(["']?[^)"']*NotoSansSC-Bold\.ttf["']?\)/g,'url(data:font/ttf;base64,'+fonts.bold+')');
    root.querySelectorAll('link[rel="stylesheet"],style,link[rel="icon"],script[data-portable-fonts]').forEach(s=>s.remove());
    const style=document.createElement('style');style.textContent=css;root.querySelector('head').append(style);
    const fontData=document.createElement('script');fontData.dataset.portableFonts='true';fontData.textContent='window.WORKBENCH_FONT_DATA='+JSON.stringify(fonts)+';';root.querySelector('head').append(fontData);
    for(const script of root.querySelectorAll('script[src]')){
      const response=await fetch(script.getAttribute('src'));if(!response.ok)throw Error('脚本打包失败');
      script.textContent=(await response.text()).replace(/<\/script/gi,'<\\/script');script.removeAttribute('src');
    }
    download(filename()+'_工作台.html','<!doctype html>\n'+root.outerHTML,'text/html;charset=utf-8');
    toast('已保存含当前材料和字体的独立网页，可离线使用');
  }catch(error){toast('网页打包失败：'+error.message+'；可先备份全部材料');}
  finally{button.disabled=false;button.textContent='保存网页';}
};
$('#confirmPrint').onclick=async()=>{
  if($('#resume').offsetHeight>1124){toast('直接下载支持一页，请先调整版式；多页可用浏览器打印');return;}
  const button=$('#confirmPrint');button.disabled=true;button.textContent='正在生成…';
  try{const bytes=await resumePdf($('#resume'));download(filename()+'.pdf',bytes,'application/pdf');$('#exportHelp').close();toast('PDF已生成，保留文字和链接');}
  catch(error){toast('导出失败：'+error.message+'；可使用浏览器打印');}
  finally{button.disabled=false;button.textContent='下载PDF文件';}
};
