// 島嶼地圖的地形紋理：看得見的格子，依地形疊一層程式畫的花紋（林地的小樹、沙灘的沙粒、岩地的裂縫……）。
// 不用圖片：格子在手機上只有指頭大，花紋要簡單、淡淡的，不能蓋過格子上的字。
const P = (id, w, h, body) => `<pattern id="tx-${id}" patternUnits="userSpaceOnUse" width="${w}" height="${h}">${body}</pattern>`;
const DEFS = `<defs>${[
  // 林地：錯開排列的小樹
  P('林', 26, 26, '<g fill="#5f7a4c" fill-opacity=".55"><path d="M7 12l4-8 4 8z"/><path d="M20 25l4-8 4 8z"/><path d="M-6 25l4-8 4 8z"/></g><g stroke="#5a4a32" stroke-opacity=".5" stroke-width="1.2"><path d="M11 12v3M24 25v2M-2 25v2"/></g>'),
  // 沙灘：沙粒和一道淺淺的浪痕
  P('灘', 22, 22, '<g fill="#a88e5a" fill-opacity=".55"><circle cx="4" cy="5" r="1"/><circle cx="15" cy="9" r=".9"/><circle cx="9" cy="16" r="1"/><circle cx="19" cy="19" r=".8"/></g><path d="M1 12q3-2 6 0t6 0" fill="none" stroke="#8fa9b0" stroke-opacity=".45" stroke-width="1"/>'),
  // 岩地：折線裂縫
  P('岩', 28, 28, '<path d="M3 5l6 4-2 6 5 3M17 2l3 7 7 2M14 20l5 4 2 4M24 15l-4 3" fill="none" stroke="#6e5a44" stroke-opacity=".6" stroke-width="1.3" stroke-linejoin="round"/>'),
  // 熱地：發紅的裂縫和火星
  P('熱', 26, 26, '<path d="M2 6l7 3-1 6 6 4M16 3l4 6 6 1M12 21l6 3" fill="none" stroke="#a83a1e" stroke-opacity=".65" stroke-width="1.5" stroke-linejoin="round"/><g fill="#f2a24a" fill-opacity=".8"><circle cx="9" cy="9" r="1.2"/><circle cx="20" cy="9" r="1"/></g>'),
  // 噴氣口：一圈一圈的煙
  P('噴', 30, 30, '<g fill="none" stroke="#6a4a3a" stroke-opacity=".5" stroke-width="1.2"><circle cx="10" cy="10" r="3"/><circle cx="10" cy="10" r="6.5"/><circle cx="24" cy="24" r="2.5"/></g>'),
  // 冰：斜斜的反光和小小的亮點
  P('冰', 24, 24, '<g stroke="#ffffff" stroke-opacity=".75" stroke-width="1.3" stroke-linecap="round"><path d="M3 13l8-8M7 19l4-4M15 23l8-8"/></g><path d="M19 5v4M17 7h4" stroke="#ffffff" stroke-opacity=".9" stroke-width="1"/>'),
  // 墨河：流動的墨線
  P('墨', 30, 18, '<path d="M0 6q7-5 15 0t15 0M0 15q7-5 15 0t15 0" fill="none" stroke="#5a5480" stroke-opacity=".7" stroke-width="1.3"/>'),
  // 潮水會來的地方：退潮時細細的浪紋，漲潮時白色浪花
  P('潮', 24, 14, '<path d="M0 7q3-3 6 0t6 0 6 0 6 0" fill="none" stroke="#4f8f9a" stroke-opacity=".55" stroke-width="1.1"/>'),
  P('漲', 24, 14, '<path d="M0 7q3-3 6 0t6 0 6 0 6 0" fill="none" stroke="#e6f4f6" stroke-opacity=".7" stroke-width="1.3"/>'),
].join('')}</defs>`;

export const TEXTURED = ['林', '灘', '岩', '熱', '噴', '冰', '墨'];

// 放進 svg 最前面（每次重畫地圖都要放一次）
export function terrainDefs(svg) { svg.insertAdjacentHTML('afterbegin', DEFS); }

// 這一格要疊哪一種花紋（沒有就回傳空字串）
export function textureOf(t, flood) {
  if (!t.seen) return '';
  if (t.tide) return flood ? '漲' : '潮';
  return TEXTURED.includes(t.land) ? t.land : '';
}
