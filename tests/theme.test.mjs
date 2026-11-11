import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../public/theme.js', import.meta.url), 'utf8');
function browser({ stored = null, prefs = null, dark = false, reduced = false, blocked = false } = {}) {
  const attrs = {}, events = {}, windowEvents = {}, settingsEvents = {}, resetEvents = {};
  const storage = new Map([['jamie-parr-theme',stored],['jamie-parr-accessibility',prefs]]);
  let focused = false;
  const summary = { focus() { focused = true; } };
  const settings = { hidden: true, open: false, querySelector: () => summary, contains: node => node?.inside === true, addEventListener: (type,fn) => { settingsEvents[type]=fn; } };
  const radios = ['system','light','dark'].map(value => ({name:'colour-theme',value,checked:false,dataset:{}}));
  const checks = ['largeText','contrast','reduceMotion'].map(name => ({dataset:{preference:name},checked:false,disabled:false}));
  const media = value => ({ matches: value, addEventListener(_,fn) { this.change=fn; } });
  const system=media(dark),motion=media(reduced);
  const metas=[0,1].map(()=>({content:'',removeAttribute(){}}));
  const context={
    localStorage:{getItem(key){if(blocked)throw Error();return storage.get(key)||null;},setItem(key,value){if(blocked)throw Error();storage.set(key,value);},removeItem(key){if(blocked)throw Error();storage.delete(key);}},
    window:{matchMedia: query=>query.includes('color-scheme')?system:motion,addEventListener:(type,fn)=>{windowEvents[type]=fn;}},
    document:{
      documentElement:{setAttribute:(key,value)=>{attrs[key]=value;},removeAttribute:key=>{delete attrs[key];}},
      querySelectorAll:query=>query.includes('meta[')?metas:query.includes('colour-theme')?radios:checks,
      getElementById:id=>id==='display-settings'?settings:{addEventListener:(type,fn)=>{resetEvents[type]=fn;}},
      addEventListener:(type,fn)=>{events[type]=fn;},
    },
  };
  vm.runInNewContext(source,context);events.DOMContentLoaded();
  return {attrs,settings,radios,checks,system,motion,metas,storage,events,windowEvents,settingsEvents,focused:()=>focused,
    choose(value){settingsEvents.change({target:radios.find(r=>r.value===value)});},
    toggle(name,checked){const input=checks.find(c=>c.dataset.preference===name);input.checked=checked;settingsEvents.change({target:input});},
    reset(){resetEvents.click();},
  };
}

test('defaults to system, responds to device changes and persists manual theme',()=>{
  const page=browser();assert.equal(page.settings.hidden,false);
  page.system.matches=true;page.system.change();
  page.choose('light');assert.equal(page.attrs['data-theme'],'light');
  const next=browser({stored:page.storage.get('jamie-parr-theme'),dark:true});assert.equal(next.radios[1].checked,true);
  next.choose('dark');assert.equal(next.attrs['data-theme'],'dark');
  next.choose('system');assert.equal(next.attrs['data-theme'],undefined);
});
test('all accessibility preferences survive page navigation and reset cleanly',()=>{
  const page=browser();for(const name of ['largeText','contrast','reduceMotion'])page.toggle(name,true);
  const next=browser({prefs:page.storage.get('jamie-parr-accessibility')});
  for(const key of ['data-large-text','data-reduce-motion'])assert.equal(next.attrs[key],'true');
  assert.equal(next.attrs['data-contrast'],'more');
  assert(next.checks.every(c=>c.checked));next.choose('dark');next.reset();
  assert.deepEqual(next.attrs,{});assert.equal(next.storage.size,0);assert(next.checks.every(c=>!c.checked));
});
test('device reduced motion cannot be disabled by site controls or reset',()=>{
  const page=browser({reduced:true});const input=page.checks[2];
  assert.equal(input.checked,true);assert.equal(input.disabled,true);page.reset();assert.equal(page.attrs['data-reduce-motion'],'true');
  page.motion.matches=false;page.motion.change();assert.equal(input.disabled,false);assert.equal(input.checked,false);
});
test('blocked storage and malformed saved preferences leave controls usable',()=>{
  const page=browser({blocked:true});page.choose('dark');page.toggle('largeText',true);
  assert.equal(page.attrs['data-theme'],'dark');assert.equal(page.attrs['data-large-text'],'true');
  assert.equal(browser({stored:'invalid',prefs:'broken JSON'}).attrs['data-theme'],undefined);
});
test('changes from another tab update both theme and accessibility controls',()=>{
  const page=browser();page.storage.set('jamie-parr-theme','dark');page.storage.set('jamie-parr-accessibility','{"contrast":true}');
  page.windowEvents.storage({key:'jamie-parr-accessibility'});
  assert.equal(page.attrs['data-theme'],'dark');assert.equal(page.checks[1].checked,true);
  page.storage.clear();page.windowEvents.storage({key:null});assert.deepEqual(page.attrs,{});
});
test('Escape closes settings and returns focus; outside pointer and tab departure close without stealing focus',()=>{
  const page=browser();page.settings.open=true;let prevented=false;
  page.events.keydown({key:'Escape',preventDefault(){prevented=true;}});
  assert.equal(page.settings.open,false);assert.equal(page.focused(),true);assert.equal(prevented,true);
  const other=browser();other.settings.open=true;other.events.pointerdown({target:{inside:true}});assert.equal(other.settings.open,true);
  other.events.pointerdown({target:{}});assert.equal(other.settings.open,false);assert.equal(other.focused(),false);
  other.settings.open=true;other.settingsEvents.focusout({relatedTarget:{}});assert.equal(other.settings.open,false);
});
