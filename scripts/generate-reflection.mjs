#!/usr/bin/env node
/**
 * 매일 미사 3줄 묵상 자동 생성 스크립트
 * (매일 오전 5시 KST에 GitHub Actions가 실행)
 *
 * 소스: 🇰🇷 주교회의 매일미사  https://missa.cbck.or.kr/DailyMissa/YYYYMMDD
 *   - 날짜별 URL: /DailyMissa/20260912 (로그인 불필요)
 *   - "오늘의 묵상" 섹션의 <p> 본문을 추출해 3줄로 요약
 *   - 복음 구절 참조(예: 루카 6,43-49)도 함께 추출
 *
 * 결과: reflections.json 에 오늘 날짜(KST) 키로 저장 (30일 이전 자동 정리)
 * 실행: node scripts/generate-reflection.mjs
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_FILE = join(ROOT, 'reflections.json');

// ── 오늘 날짜 (KST) ──
function kstParts() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return { y: kst.getUTCFullYear(), m: kst.getUTCMonth() + 1, d: kst.getUTCDate() };
}
const { y, m, d } = kstParts();
const yyyymmdd = `${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`;
const dateKey = `${y}-${m}-${d}`; // 앱이 쓰는 형식 (예: 2026-9-12)
const KR_URL = `https://missa.cbck.or.kr/DailyMissa/${yyyymmdd}`;
console.log(`[info] 대상 날짜(KST): ${dateKey} → ${KR_URL}`);

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; weekly-routine-bot/1.0)',
      'Accept-Language': 'ko,en;q=0.8'
    },
    redirect: 'follow'
  });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.text();
}

// HTML 엔티티 → 문자
function decodeEntities(s) {
  return s
    .replace(/&ldquo;/g, '“').replace(/&rdquo;/g, '”')
    .replace(/&lsquo;/g, '‘').replace(/&rsquo;/g, '’')
    .replace(/&hellip;/g, '…')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
}

// ── "오늘의 묵상" 본문 추출 ──
// <h4>오늘의 묵상 ...</h4> 이후 첫 <p> ... </p> 내용을 가져온다.
function extractReflectionBody(html) {
  const h4Idx = html.indexOf('오늘의 묵상');
  if (h4Idx === -1) return null;
  const after = html.slice(h4Idx);

  // 첫 <p> ~ </p>
  const pMatch = after.match(/<p>([\s\S]*?)<\/p>/i);
  if (!pMatch) return null;

  let body = pMatch[1];
  body = body.replace(/<br\s*\/?>/gi, '\n');   // 줄바꿈 보존
  body = body.replace(/<[^>]+>/g, '');          // 남은 태그 제거
  body = decodeEntities(body);
  body = body.replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n').trim();
  return body || null;
}

// ── 복음 구절 참조 추출 (예: 루카 6,43-49) ──
function extractGospelRef(html) {
  // "루카가 전한 거룩한 복음입니다." 뒤의 <span>6,43-49</span>
  const m = html.match(/(루카|마태오|마르코|요한)가 전한 거룩한 복음입니다\.[\s\S]{0,120}?<span>\s*([\d,\-–]+)\s*<\/span>/);
  if (m) return `${m[1]} ${m[2].replace(/\s+/g, '')}`;
  return null;
}

// ── 본문 → 3줄 요약 ──
// 문장 단위로 나눈 뒤, 핵심 문장 3개를 골라 다듬는다.
function summarizeToThree(body, gospelRef) {
  const sentences = body
    .split(/\n+|(?<=[.。!?”])\s+/)
    .map(s => s.trim())
    .filter(s => s.length >= 10);

  if (!sentences.length) return null;

  const clip = (s) => {
    s = s.replace(/\s+/g, ' ').trim();
    return s.length > 90 ? s.slice(0, 88).trim() + '…' : s;
  };

  // 점수: 실천/권고 어휘가 있으면 가점 (마지막 문단이 대개 결론/적용)
  const KEYWORDS = ['해야', '합시다', '하십시오', '노력', '살아', '나누', '기쁨', '사랑', '희망', '되어', '되도록', '실천', '묵상', '성찰', '기도'];
  const scored = sentences.map((s, i) => {
    let score = 0;
    for (const k of KEYWORDS) if (s.includes(k)) score += 2;
    score += i / sentences.length; // 뒤쪽 문장(결론) 약간 가점
    return { s, i, score };
  });

  // 첫 문장(도입)은 그대로 1줄로, 나머지는 점수 상위에서 선택
  const picked = [];
  picked.push(clip(sentences[0]));

  const rest = scored
    .filter(x => x.i !== 0)
    .sort((a, b) => b.score - a.score);

  for (const x of rest) {
    if (picked.length >= 3) break;
    const c = clip(x.s);
    if (!picked.includes(c)) picked.push(c);
  }

  // 부족하면 순서대로 채움
  for (const s of sentences) {
    if (picked.length >= 3) break;
    const c = clip(s);
    if (!picked.includes(c)) picked.push(c);
  }

  return picked.slice(0, 3);
}

async function main() {
  let lines = null;
  let source = 'fallback';
  let gospelRef = null;

  try {
    const html = await fetchText(KR_URL);
    gospelRef = extractGospelRef(html);
    const body = extractReflectionBody(html);
    if (body) {
      const three = summarizeToThree(body, gospelRef);
      if (three && three.length === 3) {
        lines = three;
        source = 'missa.cbck (오늘의 묵상)';
      }
    }
  } catch (e) {
    console.warn(`[warn] 매일미사 파싱 실패: ${e.message}`);
  }

  if (!lines) {
    lines = [
      gospelRef ? `오늘 복음은 ${gospelRef} 말씀입니다.` : '오늘의 묵상을 불러오지 못했어요.',
      '아래 🇰🇷/🇺🇸 링크에서 오늘 본문을 직접 읽어보세요 🙏',
      '내일 새벽에 다시 자동으로 채워집니다.'
    ];
  }

  console.log(`[info] source=${source}, gospel=${gospelRef}`);
  console.log('[info] lines:', lines);

  let store = {};
  if (existsSync(OUT_FILE)) {
    try { store = JSON.parse(readFileSync(OUT_FILE, 'utf8')); } catch { store = {}; }
  }
  store[dateKey] = { gospel: gospelRef, lines, source, generatedAt: new Date().toISOString() };

  // 30일 이전 정리
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  for (const k of Object.keys(store)) {
    const p = k.split('-').map(Number);
    if (p.length === 3 && new Date(p[0], p[1] - 1, p[2]) < cutoff) delete store[k];
  }

  writeFileSync(OUT_FILE, JSON.stringify(store, null, 2) + '\n', 'utf8');
  console.log(`[done] ${OUT_FILE} 저장 완료 (key: ${dateKey})`);
}

main().catch(e => { console.error('[fatal]', e); process.exit(1); });
