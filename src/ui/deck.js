/* ---------- deck UI: a hand of slot cards, a slot dialog, a separate bag page, a loot history ---------- */
import { esc, mix, rgb } from '../core/util.js';
import { ECOL } from '../data/enemy-types.js';
import { CORE, MAT_NAME, MAX_PLUS, RAR, SLOT_LV } from '../data/loot.js';
import { setHpDirty } from '../game/progress.js';
import { setHolding } from '../game/input.js';
import { AFX_BY, S, afxVal, calcStats, coreDmg, mats, slots, slotsOpen, stash } from '../loot/items.js';
import { canPay, salvage, upCost, upgrade } from '../loot/upgrade.js';
import { pickups, setSlotsDirty } from '../loot/drops.js';
import { autoCdOf, skillOf, skillRef } from '../loot/slot-skills.js';
import { CLASSES } from '../skills/index.js';

const slotsEl = document.getElementById('slots'), matsEl = document.getElementById('mats');
export const panelEl = document.getElementById('panel'), invEl = document.getElementById('inv'), histEl = document.getElementById('hist');
const bagBtn = document.getElementById('bagbtn'), bagN = document.getElementById('bagn');
export let paused = false, panelSlot = 0, panelMode = 'info', pickTab = 'skill', invSel = null, invTab = 'all', bagNew = 0;
export function setPaused(v){ return paused = v; }
export function setBagNew(v){ return bagNew = v; }
const BASE_KO = { core:'자동 공격', charm:'부적' };
function cardLook(it){
  if (it.base === 'skill'){ const sk = skillOf(it); return { c:ECOL[sk.elem] || [220,220,220], rc:ECOL[sk.elem] || [220,220,220], name:sk.ko, type:`${CLASSES[it.ci].ko} 스킬`, glyph:sk.ko[0], rar:false }; }
  if (it.base === 'core'){ const cb = CORE[it.kind]; return { c:ECOL[cb.elem], rc:RAR[it.rar].c, name:it.name, type:'자동 공격', glyph:cb.short, rar:true }; }
  return { c:[196,180,230], rc:RAR[it.rar].c, name:it.name, type:'부적', glyph:'◆', rar:true };
}
function cardFace(it){
  const L = cardLook(it);
  return `<span class="cframe" style="--c:${rgb(L.c)};--rc:${rgb(L.rc)}">
    <span class="cart"><i>${esc(L.glyph)}</i></span>${L.rar ? '<span class="crar"></span>' : ''}
    <span class="cname">${esc(L.name)}</span><span class="ctype">${L.type}</span>
    ${it.plus ? `<span class="cplus">+${it.plus}</span>` : ''}</span>`;
}
function itemLines(it){
  const out = [];
  if (it.base === 'skill'){ out.push(`${autoCdOf(it).toFixed(1)}초마다 가장 가까운 운석에 자동 시전`); out.push('강화할 때마다 시전 간격 6% 단축'); return out; }
  if (it.base === 'core'){ const cb = CORE[it.kind]; out.push(`피해 ${coreDmg(it)} · 초당 ${(cb.rate*(1 + (S.aspd || 0)/100)).toFixed(1)}회`); out.push(cb.fx); }
  for (const a of it.afx) out.push(AFX_BY[a.k].f(afxVal(it, a)));
  if (it.base === 'charm' && !it.afx.length) out.push('옵션 없음');
  return out;
}
const itemMeta = it => it.base === 'skill' ? `${CLASSES[it.ci].ko} 스킬` : `${RAR[it.rar].n} · ${BASE_KO[it.base]} · iLv ${it.ilvl}`;
/* ----- slots: six flat slabs, like bars on a screen-printed poster ----- */
let slabKey = '', cylKey = '';
export function renderSlots(){
  setSlotsDirty(false);
  matsEl.innerHTML = `<span>${MAT_NAME.shard} <b>${mats.shard}</b></span><span>${MAT_NAME.metal} <b class="m2">${mats.metal}</b></span><span>${MAT_NAME.core} <b class="m3">${mats.core}</b></span>`;
  bagN.textContent = stash.length; bagBtn.classList.toggle('new', bagNew > 0);
  const open = slotsOpen(), key = open + '|' + slots.map(it => it ? it.id + ':' + it.plus : '-').join(',');
  if (key === slabKey && cylKey) return; slabKey = key; cylKey = key;
  slotsEl.innerHTML = SLOT_LV.map((lv, i) => {
    const n = `<span class="sn">0${i + 1}</span>`;
    if (i >= open) return `<button class="slab locked" type="button" id="slot-${i}" disabled aria-label="슬롯 ${i + 1}, 레벨 ${lv}에 열림">${n}<span class="sl">LV${lv}</span></button>`;
    const it = slots[i];
    if (!it) return `<button class="slab empty" type="button" id="slot-${i}" data-i="${i}" aria-label="슬롯 ${i + 1}, 비어 있음">${n}<span class="sg">+</span></button>`;
    const L = cardLook(it);
    return `<button class="slab full" type="button" id="slot-${i}" data-i="${i}" style="--c:${rgb(L.c)};--rc:${rgb(L.rc)}" aria-label="슬롯 ${i + 1}, ${esc(L.name)}">${n}<span class="sg">${esc(L.glyph)}</span>${it.plus ? `<em>+${it.plus}</em>` : ''}<span class="sr"></span></button>`;
  }).join('');
}
export function chamberFire(i){
  const el = document.getElementById('slot-' + i); if (!el) return;
  el.classList.remove('fire'); void el.offsetWidth; el.classList.add('fire');
}
/* ----- slot dialog: info first, change as a second step ----- */
function costText(c){ return [c.shard && `${MAT_NAME.shard} ${c.shard}`, c.metal && `${MAT_NAME.metal} ${c.metal}`, c.core && `${MAT_NAME.core} ${c.core}`].filter(Boolean).join(' · '); }
export function pauseOn(){ paused = true; setHolding(false); }
function openPanel(i){ panelSlot = i; panelMode = slots[i] ? 'info' : 'pick'; pauseOn(); panelEl.hidden = false; renderPanel(); }
function closePanel(){ panelEl.hidden = true; if (invEl.hidden) paused = false; }
function renderPanel(){
  const it = slots[panelSlot];
  if (panelMode === 'info' && it){
    const L = cardLook(it), c = upCost(it), maxed = it.plus >= MAX_PLUS;
    panelEl.innerHTML = `<div class="dlg" role="dialog" aria-modal="true" aria-label="슬롯 ${panelSlot + 1}">
      <div class="bigcard"><span class="card big">${cardFace(it)}</span></div>
      <div class="dinfo">
        <div class="dhead"><span class="dslot">슬롯 ${panelSlot + 1}</span><button type="button" class="pbtn ghost" data-act="close" aria-label="닫기">닫기</button></div>
        <h2 style="color:${rgb(mix(L.rc, [255,255,255], .15))}">${esc(L.name)}${it.plus ? ` <small>+${it.plus}</small>` : ''}</h2>
        <div class="dmeta">${itemMeta(it)}</div>
        <ul class="dlines">${itemLines(it).map(l => `<li>${esc(l)}</li>`).join('')}</ul>
        <div class="dup">
          <button type="button" class="pbtn primary" data-act="up" ${maxed || !canPay(c) ? 'disabled' : ''}>${maxed ? '최대 강화' : `강화 +${it.plus + 1}`}</button>
          ${maxed ? '' : `<span class="cost ${canPay(c) ? '' : 'short'}">${costText(c)}</span>`}
        </div>
        <div class="dacts"><button type="button" class="pbtn" data-act="change">변경</button><button type="button" class="pbtn" data-act="off">비우기</button></div>
      </div></div>`;
    return;
  }
  // pick: skills or bag items, as cards
  const where = (ci, k) => slots.findIndex(x => x && x.base === 'skill' && x.ci === ci && x.k === k);
  const skillGrid = CLASSES.map((cl, ci) => `<h4>${cl.ko}</h4><div class="cgrid">${cl.skills.map((sk, k) => {
      const w = where(ci, k), ref = { base:'skill', ci, k, plus:0 };
      return `<button type="button" class="card mini${w === panelSlot ? ' sel' : ''}" data-act="skill" data-ci="${ci}" data-k="${k}" aria-label="${esc(sk.ko)}">${w >= 0 ? `<span class="cgem">${w + 1}</span>` : ''}${cardFace(ref)}</button>`;
    }).join('')}</div>`).join('');
  const gearGrid = stash.length ? `<div class="cgrid">${stash.map(s => `<button type="button" class="card mini" data-act="equip" data-id="${s.id}" aria-label="${esc(s.name)}">${cardFace(s)}</button>`).join('')}</div>`
    : `<p class="note">가방이 비어 있어요. 엘리트나 보스를 잡으면 장비가 나와요.</p>`;
  panelEl.innerHTML = `<div class="dlg pick" role="dialog" aria-modal="true" aria-label="슬롯 ${panelSlot + 1} 변경">
    <div class="dhead">${it ? '<button type="button" class="pbtn ghost" data-act="back">← 슬롯 정보</button>' : ''}<span class="dslot">슬롯 ${panelSlot + 1}에 넣을 카드</span><button type="button" class="pbtn ghost" data-act="close">닫기</button></div>
    <div class="ptabs" role="tablist">
      <button type="button" role="tab" class="ptab" data-act="tab" data-tab="skill" aria-selected="${pickTab === 'skill'}">스킬</button>
      <button type="button" role="tab" class="ptab" data-act="tab" data-tab="gear" aria-selected="${pickTab === 'gear'}">장비 <span>${stash.length}</span></button>
    </div>
    <div class="pbody">${pickTab === 'skill' ? skillGrid : gearGrid}</div></div>`;
}
function putInSlot(i, card){
  const old = slots[i];
  if (old && old.base !== 'skill') stash.unshift(old);
  card.t = .3; slots[i] = card; calcStats();
}
/* ----- bag page ----- */
function openBag(){ invSel = stash[0] ? stash[0].id : null; bagNew = 0; pauseOn(); invEl.hidden = false; renderBag(); setSlotsDirty(true); }
function closeBag(){ invEl.hidden = true; if (panelEl.hidden) paused = false; }
function salvageGain(it){ return { shard:[2, 5, 10, 20][it.rar] + it.plus*2, metal:[0, 0, 1, 3][it.rar] }; }
function renderBag(){
  const list = stash.filter(s => invTab === 'all' || s.base === invTab);
  const sel = stash.find(s => s.id === invSel) || list[0] || null;
  invSel = sel ? sel.id : null;
  const open = slotsOpen();
  const grid = list.length ? `<div class="cgrid">${list.map(s => `<button type="button" class="card mini${sel && s.id === sel.id ? ' sel' : ''}" data-act="sel" data-id="${s.id}" aria-label="${esc(s.name)}">${cardFace(s)}</button>`).join('')}</div>`
    : `<p class="note">${stash.length ? '이 종류의 장비가 없어요.' : '가방이 비어 있어요. 엘리트나 보스를 잡으면 장비가 나와요.'}</p>`;
  let detail = `<p class="note">장비를 고르면 자세한 정보가 보여요.</p>`;
  if (sel){
    const L = cardLook(sel), g = salvageGain(sel);
    detail = `<div class="bigcard"><span class="card big">${cardFace(sel)}</span></div>
      <h2 style="color:${rgb(mix(L.rc, [255,255,255], .15))}">${esc(L.name)}${sel.plus ? ` <small>+${sel.plus}</small>` : ''}</h2>
      <div class="dmeta">${itemMeta(sel)}</div>
      <ul class="dlines">${itemLines(sel).map(l => `<li>${esc(l)}</li>`).join('')}</ul>
      <div class="eqrow"><span>장착</span>${SLOT_LV.slice(0, open).map((_, i) => `<button type="button" class="pbtn num" data-act="eq" data-i="${i}" aria-label="슬롯 ${i + 1}에 장착">${i + 1}</button>`).join('')}</div>
      <button type="button" class="pbtn" data-act="salv">분해 · ${MAT_NAME.shard} ${g.shard}${g.metal ? ` · ${MAT_NAME.metal} ${g.metal}` : ''}</button>`;
  }
  invEl.innerHTML = `<div class="bag" role="dialog" aria-modal="true" aria-label="가방">
    <header class="bhead"><h2>가방 <span>${stash.length}</span></h2>
      <div class="bmats">${MAT_NAME.shard} <b>${mats.shard}</b> · ${MAT_NAME.metal} <b>${mats.metal}</b> · ${MAT_NAME.core} <b>${mats.core}</b></div>
      <button type="button" class="pbtn ghost" data-act="close">닫기</button></header>
    <div class="ptabs" role="tablist">${[['all', '전체'], ['core', '자동 공격'], ['charm', '부적']].map(([k, n]) => `<button type="button" role="tab" class="ptab" data-act="btab" data-tab="${k}" aria-selected="${invTab === k}">${n}</button>`).join('')}</div>
    <div class="bbody"><div class="blist">${grid}</div><div class="bdetail">${detail}</div></div></div>`;
}
/* ----- loot history (right side) ----- */
export function logEvent(title, sub, col){
  const el = document.createElement('div');
  el.className = 'hitem'; el.style.setProperty('--c', rgb(col || [234,223,206]));
  el.innerHTML = `<b>${esc(title)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}`;
  histEl.prepend(el);
  while (histEl.children.length > 5) histEl.lastChild.remove();
}
function toast(msg, col){ logEvent(msg, '', col); }
export function resetLoadout(){
  slots.fill(null); stash.length = 0; mats.shard = mats.metal = mats.core = 0; pickups.length = 0; bagNew = 0;
  calcStats(); setSlotsDirty(true); cylKey = ''; histEl.innerHTML = '';
}

// runs once at boot, from main.js, in the original file order
export function setup(){
  slotsEl.addEventListener('click', ev => { const b = ev.target.closest('.slab[data-i]'); if (b) openPanel(+b.dataset.i); });
  panelEl.addEventListener('click', ev => {
    if (ev.target === panelEl){ closePanel(); return; }
    const b = ev.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act, it = slots[panelSlot];
    if (act === 'close'){ closePanel(); return; }
    if (act === 'tab'){ pickTab = b.dataset.tab; renderPanel(); return; }
    if (act === 'change'){ panelMode = 'pick'; renderPanel(); return; }
    if (act === 'back'){ panelMode = 'info'; renderPanel(); return; }
    if (act === 'skill'){
      const ci = +b.dataset.ci, k = +b.dataset.k, w = slots.findIndex(x => x && x.base === 'skill' && x.ci === ci && x.k === k);
      if (w !== panelSlot){ if (w >= 0) slots[w] = null; putInSlot(panelSlot, skillRef(ci, k)); }
      panelMode = 'info';
    }
    if (act === 'equip'){ const s = stash.find(x => x.id === +b.dataset.id); if (s){ stash.splice(stash.indexOf(s), 1); putInSlot(panelSlot, s); } panelMode = 'info'; }
    cylKey = '';
    if (act === 'up' && it){ if (upgrade(it)) logEvent(`${cardLook(it).name} +${it.plus} 강화`, '슬롯 ' + (panelSlot + 1), cardLook(it).rc); }
    if (act === 'off' && it){ slots[panelSlot] = null; if (it.base !== 'skill') stash.unshift(it); calcStats(); closePanel(); }
    setHpDirty(true); setSlotsDirty(true); if (!panelEl.hidden) renderPanel();
  });
  bagBtn.addEventListener('click', openBag);
  invEl.addEventListener('click', ev => {
    if (ev.target === invEl){ closeBag(); return; }
    const b = ev.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act, sel = stash.find(s => s.id === invSel);
    if (act === 'close'){ closeBag(); return; }
    if (act === 'btab'){ invTab = b.dataset.tab; invSel = null; }
    if (act === 'sel') invSel = +b.dataset.id;
    if (act === 'eq' && sel){ stash.splice(stash.indexOf(sel), 1); putInSlot(+b.dataset.i, sel); invSel = null; }
    if (act === 'salv' && sel){ salvage(sel); invSel = null; }
    setHpDirty(true); setSlotsDirty(true); renderBag();
  });
  addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!panelEl.hidden) closePanel(); else if (!invEl.hidden) closeBag();
  });
  resetLoadout();
}
