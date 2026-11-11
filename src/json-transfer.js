'use strict';
// Translate only the two workbench schemas; preserve content and saved versions.
function normalizeResumeTransfer(input, local = 'gamePresets' in INITIAL) {
  const doc = clone(input);
  const pairs = [['gamePresets','experiencePresets'],['activeGame','activeExperience'],
    ['analysisPresets','casePresets'],['activeAnalysis','activeCase'],['showAnalysis','showCase']];
  for (const [legacy, current] of pairs) {
    const from = local ? current : legacy, to = local ? legacy : current;
    if (!(to in doc) && from in doc) doc[to] = doc[from];
    delete doc[from];
  }
  const ids = local ? {experience:'games',cases:'analysis'} : {games:'experience',analysis:'cases'};
  if (Array.isArray(doc.modules)) doc.modules = doc.modules.map(m => ({...m,id:ids[m.id] || m.id}));
  if (Array.isArray(doc.versions)) doc.versions = doc.versions.map(v => ({...v,doc:normalizeResumeTransfer(v.doc,local)}));
  return doc;
}
function validateResumeTransfer(doc) {
  validate(doc);
  for (const key of ['work','campus','awards']) {
    if (doc[key] !== undefined && (!Array.isArray(doc[key]) ||
      !doc[key].every(v => v && ['name','role','date','bullets'].every(k => typeof v[k] === 'string')))) {
      throw Error('经历字段不正确');
    }
  }
  doc.versions.forEach(v => validateResumeTransfer(v.doc));
  return doc;
}
function bindResumeTransfer() {
  const actions = document.querySelector('.actions');
  for (const [id,label] of [['exportJson','导出JSON'],['importJson','导入JSON']]) {
    if (!document.getElementById(id)) {
      const button = document.createElement('button');
      button.id = id; button.textContent = label;
      actions.insertBefore(button, document.getElementById('openVersions'));
    }
  }
  const exportDocument = () => {
    download(filename()+'_全部材料.json',JSON.stringify(normalizeResumeTransfer(data,false),null,2),'application/json;charset=utf-8');
    toast('已导出JSON，可在本地版或在线版导入继续编辑');
  };
  $('#exportJson').onclick = exportDocument;
  $('#backup').onclick = exportDocument;
  $('#importJson').onclick = () => $('#import').click();
  $('#import').onchange = async event => {
    const input = event.target, file = input.files[0];
    if (!file) return;
    const previous = data;
    try {
      if (file.size > 20000000) throw Error('文件超过20MB');
      const next = validateResumeTransfer(normalizeResumeTransfer(JSON.parse((await file.text()).replace(/^\uFEFF/,''))));
      const before = clone(previous); before.versions = [];
      next.versions.push({id:uid(),name:'导入前自动备份',date:new Date().toLocaleDateString('sv-SE'),doc:before});
      data = next;
      prepare(); tab = 'basic'; recordIndex = 0;
      renderTabs(); renderForm(); renderResume(); renderVersions();
      $('#versionName').value = data.versionLabel || '';
      save();
      toast('已导入，原内容保留在版本与备份中');
    } catch (error) {
      data = previous;
      renderTabs(); renderForm(); renderResume(); renderVersions();
      $('#versionName').value = data.versionLabel || '';
      toast('导入失败，原材料未改动：请使用工作台导出的有效JSON（20MB以内）');
    } finally { input.value = ''; }
  };
}
bindResumeTransfer();
