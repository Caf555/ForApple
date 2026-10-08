// 《畫海人》的共用資料：元素、角色、技能、敵人、道具、素材、裝備、船、委託
// 島嶼、事件與劇情文字在 islands.js

// ───────── 元素 ─────────
// 潮剋焰、焰剋風、風剋石、石剋潮（一圈）；星與影互剋
export const ELEMENTS = ['潮', '焰', '風', '石', '星', '影'];
export const BEATS = { 潮: '焰', 焰: '風', 風: '石', 石: '潮' };
export function elementMult(atk, def) {
  if (!atk || !def) return 1;
  if ((atk === '星' && def === '影') || (atk === '影' && def === '星')) return 1.3;
  if (BEATS[atk] === def) return 1.5;
  if (BEATS[def] === atk) return 0.7;
  if (atk === def) return 0.85;
  return 1;
}
export function weaknessOf(el) {
  if (el === '星') return '影';
  if (el === '影') return '星';
  return Object.keys(BEATS).find(k => BEATS[k] === el);
}

// ───────── 隊伍 ─────────
// 數值是 1 級的樣子；每升一級，各項提高 8%
export const HEROES = {
  墨里: { title: '畫海人', job: '製圖師', element: '星', color: '#7fa7d9', hp: 72, mp: 22, atk: 9, def: 6, mag: 14, spd: 11,
    desc: '17 歲。左眼看得見霧裡的東西。背著一本空白的繪圖師之書。', skills: ['標記', '星光筆', '畫線結界'] },
  阿潮: { title: '劍士', job: '劍士', element: '潮', color: '#5fb3a8', hp: 112, mp: 16, atk: 15, def: 10, mag: 4, spd: 9,
    desc: '漁夫的兒子，嘴硬心軟。父親的船，三年前開進霧裡，再也沒有回來。', skills: ['破浪斬', '迴旋', '挑釁'] },
  蓮笙: { title: '巫醫', job: '巫醫', element: '影', color: '#b49ad6', hp: 76, mp: 24, atk: 6, def: 6, mag: 13, spd: 10,
    desc: '不太說話的少女。她說，她聽得見霧的聲音。', skills: ['海草藥', '驅邪', '影針'] },
  小鈴: { title: '吟遊詩人', job: '吟遊詩人', element: '風', color: '#e0a86a', hp: 82, mp: 22, atk: 8, def: 5, mag: 12, spd: 13,
    desc: '把冒險編成歌的流浪歌手。她在找一首被霧吃掉一半的古歌。', skills: ['戰歌', '回聲', '搖籃曲'] },
  費米: { title: '射手', job: '射手', element: '焰', color: '#d98a5f', hp: 84, mp: 18, atk: 14, def: 7, mag: 6, spd: 14, weapon: '帳房短弓',
    desc: '銀貝商會會長的兒子。帳算得很快，箭射得很準，嘴巴有點壞。', skills: ['穿霧箭', '火藥箭', '清點'] },
  葛蘿: { title: '守衛', job: '守衛', element: '石', color: '#c0604a', hp: 132, mp: 16, atk: 14, def: 14, mag: 4, spd: 8, weapon: '紅帆短斧',
    desc: '紅帆海盜的前船長，只有一隻手臂。話很少，一開口，海盜們都會安靜下來。', skills: ['護舷', '落錨', '升帆'] },
};
export const PARTY_MAX = 4; // 一次最多 4 人出戰，其他人在船上待命

// type：phy 近身（後排出手威力減半，只能打前排）／rng 遠程（用攻擊力，可以打後排，站後排也不減半）／mag 法術／heal 回復／buff 增益／debuff 減益
// aim：不會因為霧而落空；loot：打倒時素材一定掉，而且多一份
// target：enemy 一名敵人／enemyFront 敵方前排／allies 對方全體（heal 時是自己人全體）／ally 一名同伴／front 我方前排／team 我方全體／self 自己
// cover：替後排擋攻擊（回合數）；haste：速度變快（回合數）
export const SKILLS = {
  攻擊: { cost: 0, type: 'phy', target: 'enemy', power: 1, desc: '普通攻擊。' },
  標記: { cost: 3, type: 'debuff', target: 'enemy', mark: 3, desc: '在敵人身上畫一個記號：三回合內受到的傷害 +30%，並看穿它的弱點。' },
  星光筆: { cost: 5, type: 'mag', target: 'enemy', power: 22, element: '星', desc: '用發光的筆尖畫出一道星光。星屬性法術，可以打後排。' },
  畫線結界: { cost: 6, type: 'buff', target: 'front', ward: 2, desc: '在地上畫一條線：前排的同伴兩回合內受到的傷害減少 40%。' },
  破浪斬: { cost: 4, type: 'phy', target: 'enemy', power: 1.45, element: '潮', desc: '潮屬性的重斬。' },
  迴旋: { cost: 6, type: 'phy', target: 'enemyFront', power: 0.85, desc: '橫掃敵方整個前排。' },
  挑釁: { cost: 3, type: 'buff', target: 'self', taunt: 2, desc: '大聲吼叫：兩回合內，敵人都會衝著自己來。' },
  海草藥: { cost: 5, type: 'heal', target: 'allies', power: 18, desc: '把海草搗成藥，全隊回復。' },
  驅邪: { cost: 3, type: 'heal', target: 'ally', power: 22, cure: true, desc: '解除一名同伴的異常狀態，並回復一些體力。' },
  影針: { cost: 4, type: 'mag', target: 'enemy', power: 18, element: '影', status: '定身', chance: 0.3, desc: '用影子做的細針。影屬性法術，有機會讓敵人定身。' },
  戰歌: { cost: 4, type: 'buff', target: 'self', morale: 12, desc: '唱一首出海的歌：全隊士氣 +12（士氣越高，攻擊越痛、受傷越少）。' },
  回聲: { cost: 5, type: 'mag', target: 'enemy', power: 20, element: '風', desc: '把敵人的聲音唱回去。風屬性法術，可以打後排。' },
  搖籃曲: { cost: 6, type: 'debuff', target: 'allies', status: '定身', chance: 0.35, desc: '很輕很輕的歌：敵方全體有機會睡著（定身）。' },
  穿霧箭: { cost: 3, type: 'rng', target: 'enemy', power: 1.25, aim: true, desc: '看準了才放的箭：不會因為霧而落空，可以打後排。' },
  火藥箭: { cost: 5, type: 'rng', target: 'enemy', power: 1.2, element: '焰', desc: '箭頭綁著商會的火藥。焰屬性，可以打後排。' },
  清點: { cost: 2, type: 'debuff', target: 'enemy', loot: true, desc: '一眼看穿敵人身上帶了什麼：打倒它的時候，素材一定拿得到，而且多一份。' },
  護舷: { cost: 3, type: 'buff', target: 'self', cover: 2, desc: '用身體當船舷：兩回合內，敵人打向後排同伴的攻擊，都由自己擋下來（擋的時候受傷 −30%）。' },
  落錨: { cost: 5, type: 'phy', target: 'enemy', power: 1.4, element: '石', status: '定身', chance: 0.3, desc: '把整個人的重量砸下去。石屬性的重擊，有機會讓敵人動不了。' },
  升帆: { cost: 5, type: 'buff', target: 'team', haste: 2, desc: '吼一聲海盜的號子：兩回合內，全隊的速度變快，比較容易先出手。' },
  // 敵人的招式
  鉗擊: { cost: 0, type: 'phy', target: 'enemy', power: 1.3, desc: '' },
  鹽霧: { cost: 0, type: 'mag', target: 'allies', power: 9, element: '潮', desc: '' },
  低語: { cost: 0, type: 'debuff', target: 'enemy', status: '迷惘', chance: 0.6, desc: '' },
  纏繞: { cost: 0, type: 'phy', target: 'enemy', power: 0.8, status: '定身', chance: 0.5, desc: '' },
  撲火: { cost: 0, type: 'mag', target: 'enemy', power: 14, element: '焰', desc: '' },
  硬化: { cost: 0, type: 'buff', target: 'self', def: 2, desc: '' },
  啃咬: { cost: 0, type: 'phy', target: 'enemy', power: 1.1, desc: '' },
  拖入水底: { cost: 0, type: 'phy', target: 'enemy', power: 1.9, desc: '' },
  冷霧: { cost: 0, type: 'mag', target: 'allies', power: 13, element: '影', desc: '' },
  燈火: { cost: 0, type: 'mag', target: 'allies', power: 14, element: '焰', desc: '' },
  守夜: { cost: 0, type: 'heal', target: 'self', power: 30, desc: '' },
  熄燈: { cost: 0, type: 'mag', target: 'allies', power: 30, element: '影', desc: '' },
  抹去: { cost: 0, type: 'phy', target: 'enemy', power: 1.15, status: '迷惘', chance: 0.3, desc: '' },
  撞鐘: { cost: 0, type: 'phy', target: 'enemy', power: 1.4, desc: '' },
  鱗粉: { cost: 0, type: 'mag', target: 'enemy', power: 15, element: '風', desc: '' },
  晨露: { cost: 0, type: 'heal', target: 'allies', power: 16, desc: '' },
  群啄: { cost: 0, type: 'phy', target: 'enemyFront', power: 0.75, desc: '' },
  報時: { cost: 0, type: 'mag', target: 'allies', power: 15, element: '風', desc: '' },
  鐘鳴: { cost: 0, type: 'mag', target: 'allies', power: 17, element: '石', desc: '' },
  回音: { cost: 0, type: 'heal', target: 'self', power: 45, desc: '' },
  晨鐘響: { cost: 0, type: 'mag', target: 'allies', power: 30, status: '迷惘', chance: 0.5, desc: '' },
  撕咬: { cost: 0, type: 'phy', target: 'enemy', power: 1.3, desc: '' },
  鬼火: { cost: 0, type: 'mag', target: 'enemy', power: 17, element: '焰', desc: '' },
  錨擊: { cost: 0, type: 'phy', target: 'enemy', power: 1.6, desc: '' },
  舵輪斬: { cost: 0, type: 'phy', target: 'enemy', power: 1.5, element: '潮', desc: '' },
  浪湧: { cost: 0, type: 'mag', target: 'allies', power: 18, element: '潮', desc: '' },
  全帆衝撞: { cost: 0, type: 'phy', target: 'enemyFront', power: 1.9, desc: '' },
  // 第二海域
  討債: { cost: 0, type: 'phy', target: 'enemy', power: 1.2, status: '迷惘', chance: 0.3, desc: '' },
  銀貝雨: { cost: 0, type: 'mag', target: 'allies', power: 16, element: '潮', desc: '' },
  典當: { cost: 0, type: 'mag', target: 'allies', power: 22, element: '石', desc: '' },
  回收: { cost: 0, type: 'heal', target: 'self', power: 55, desc: '' },
  全部當掉: { cost: 0, type: 'mag', target: 'allies', power: 36, status: '迷惘', chance: 0.4, desc: '' },
  鏡光: { cost: 0, type: 'mag', target: 'enemy', power: 20, element: '星', desc: '' },
  丈量: { cost: 0, type: 'phy', target: 'enemy', power: 1.3, status: '定身', chance: 0.35, desc: '' },
  改畫: { cost: 0, type: 'mag', target: 'allies', power: 21, element: '風', desc: '' },
  重畫: { cost: 0, type: 'mag', target: 'allies', power: 38, element: '風', status: '迷惘', chance: 0.3, desc: '' },
  噴墨: { cost: 0, type: 'debuff', target: 'enemy', status: '迷惘', chance: 0.6, desc: '' },
  螫刺: { cost: 0, type: 'mag', target: 'enemy', power: 18, element: '潮', status: '定身', chance: 0.3, desc: '' },
  珠淚: { cost: 0, type: 'mag', target: 'allies', power: 23, element: '潮', desc: '' },
  擁抱: { cost: 0, type: 'phy', target: 'enemy', power: 1.3, status: '定身', chance: 0.4, desc: '' },
  回潮: { cost: 0, type: 'heal', target: 'self', power: 60, desc: '' },
  潮汐之歌: { cost: 0, type: 'mag', target: 'allies', power: 40, element: '潮', desc: '' },
  印章: { cost: 0, type: 'phy', target: 'enemy', power: 1.55, desc: '' },
  登記: { cost: 0, type: 'debuff', target: 'enemy', status: '定身', chance: 0.55, desc: '' },
  抹白: { cost: 0, type: 'mag', target: 'allies', power: 25, element: '星', desc: '' },
  全海圖: { cost: 0, type: 'mag', target: 'allies', power: 44, element: '星', status: '迷惘', chance: 0.3, desc: '' },
  // 第三海域
  劫掠: { cost: 0, type: 'phy', target: 'enemy', power: 1.4, desc: '' },
  火藥桶: { cost: 0, type: 'mag', target: 'allies', power: 24, element: '焰', desc: '' },
  帆影纏身: { cost: 0, type: 'phy', target: 'enemy', power: 1.1, status: '定身', chance: 0.4, desc: '' },
  無名之風: { cost: 0, type: 'mag', target: 'allies', power: 26, element: '風', status: '迷惘', chance: 0.3, desc: '' },
  褪色: { cost: 0, type: 'heal', target: 'self', power: 70, desc: '' },
  帆落: { cost: 0, type: 'mag', target: 'allies', power: 46, element: '風', desc: '' },
  敲壁: { cost: 0, type: 'phy', target: 'enemy', power: 1.35, status: '迷惘', chance: 0.3, desc: '' },
  落石: { cost: 0, type: 'phy', target: 'enemyFront', power: 1.0, element: '石', desc: '' },
  硫磺霧: { cost: 0, type: 'mag', target: 'allies', power: 24, element: '影', desc: '' },
  礦燈: { cost: 0, type: 'mag', target: 'enemy', power: 24, element: '星', desc: '' },
  坍方: { cost: 0, type: 'mag', target: 'allies', power: 48, element: '石', status: '定身', chance: 0.25, desc: '' },
  鍛打: { cost: 0, type: 'phy', target: 'enemy', power: 1.7, desc: '' },
  火花: { cost: 0, type: 'mag', target: 'enemy', power: 25, element: '焰', desc: '' },
  熔流: { cost: 0, type: 'mag', target: 'allies', power: 27, element: '焰', desc: '' },
  添煤: { cost: 0, type: 'heal', target: 'self', power: 75, desc: '' },
  熔爐: { cost: 0, type: 'mag', target: 'allies', power: 50, element: '焰', desc: '' },
  編號: { cost: 0, type: 'debuff', target: 'enemy', status: '迷惘', chance: 0.6, desc: '' },
  噴發: { cost: 0, type: 'mag', target: 'allies', power: 29, element: '焰', desc: '' },
  火山甦醒: { cost: 0, type: 'mag', target: 'allies', power: 52, element: '焰', status: '迷惘', chance: 0.25, desc: '' },
};

// row：'front' 前排／'back' 後排；drop：[素材, 機率, 數量]
export const ENEMIES = {
  // 低語礁
  霧蟹: { element: '石', row: 'front', hp: 42, atk: 10, def: 9, mag: 2, spd: 7, exp: 9, silver: 4, skills: [['攻擊', 3], ['鉗擊', 2]], drop: [['霧苔', 0.5]], desc: '殼上長滿了白色的霧苔。' },
  鹽靈: { element: '潮', row: 'back', hp: 30, atk: 4, def: 4, mag: 11, spd: 9, exp: 10, silver: 5, skills: [['鹽霧', 3], ['攻擊', 1]], drop: [['鹽晶', 0.5]], desc: '被海水泡了很久的一句話，結成了鹽。' },
  礁鼠: { element: '風', row: 'front', hp: 28, atk: 9, def: 4, mag: 2, spd: 15, exp: 7, silver: 3, skills: [['啃咬', 3], ['攻擊', 1]], drop: [['漂流木', 0.4]], desc: '成群結隊，跑得比風還快。' },
  低語者: { element: '影', row: 'back', hp: 34, atk: 5, def: 5, mag: 10, spd: 10, exp: 11, silver: 5, skills: [['低語', 2], ['攻擊', 2]], drop: [['霧苔', 0.35]], desc: '霧裡傳來的聲音，在叫一個你不認識的名字。' },
  漂流骨: { element: '石', row: 'front', hp: 58, atk: 11, def: 12, mag: 2, spd: 5, exp: 12, silver: 6, skills: [['攻擊', 3], ['硬化', 1]], drop: [['漂流木', 0.6]], desc: '被海浪沖上岸的骨頭，自己站了起來。' },
  霧鰻: { element: '潮', row: 'front', hp: 46, atk: 11, def: 7, mag: 4, spd: 11, exp: 11, silver: 5, skills: [['纏繞', 2], ['攻擊', 2]], drop: [['鹽晶', 0.35]], desc: '牠的身體一半在霧裡，一半在水裡。' },
  燈蛾: { element: '焰', row: 'back', hp: 26, atk: 4, def: 3, mag: 12, spd: 13, exp: 9, silver: 4, skills: [['撲火', 3], ['攻擊', 1]], drop: [['燈芯', 0.5]], desc: '一直往燈塔飛，卻從來沒有飛到過。' },
  珊瑚獸: { element: '石', row: 'front', hp: 64, atk: 12, def: 13, mag: 3, spd: 6, exp: 14, silver: 7, skills: [['攻擊', 2], ['硬化', 1], ['鉗擊', 1]], drop: [['珊瑚枝', 0.6]], desc: '整個身體是一座長了腳的珊瑚礁。' },
  溺者之影: { element: '影', row: 'front', rank: '精英', hp: 170, atk: 15, def: 9, mag: 13, spd: 10, exp: 45, silver: 25, skills: [['拖入水底', 2], ['冷霧', 2], ['攻擊', 1]], drop: [['夜光珠', 1]], desc: '霧眼的守門人。它還記得水的冷，卻忘了自己是誰。' },
  燈守: { element: '焰', row: 'front', rank: '首領', hp: 330, atk: 16, def: 10, mag: 15, spd: 9, exp: 120, silver: 60, skills: [['燈火', 2], ['攻擊', 2], ['守夜', 1]], big: '熄燈', drop: [['燈芯', 1, 2]],
    phase2: { element: '影', line: '燈，暗了下來。燈守的影子，比他本人還要高。' }, desc: '低語礁的燈塔守，守了五十年。他在等一艘船。' },
  // 晨忘島
  褪影: { element: '影', row: 'front', hp: 66, atk: 15, def: 10, mag: 8, spd: 10, exp: 17, silver: 8, skills: [['抹去', 2], ['攻擊', 2]], drop: [['褪色羽', 0.35]], desc: '早上醒來時，被忘掉的那個自己。' },
  鐘蟲: { element: '石', row: 'front', hp: 88, atk: 15, def: 17, mag: 4, spd: 6, exp: 19, silver: 9, skills: [['撞鐘', 2], ['硬化', 1], ['攻擊', 1]], drop: [['鐘銅', 0.5]], desc: '住在鐘裡的蟲。殼是青銅色的，敲起來會響。' },
  遺忘蝶: { element: '風', row: 'back', hp: 46, atk: 6, def: 7, mag: 16, spd: 15, exp: 17, silver: 8, skills: [['鱗粉', 3], ['低語', 1]], drop: [['褪色羽', 0.5]], desc: '翅膀上的花紋，是某個人昨天的回憶。' },
  晨露精: { element: '潮', row: 'back', hp: 50, atk: 5, def: 8, mag: 15, spd: 11, exp: 18, silver: 9, skills: [['晨露', 2], ['鹽霧', 2]], drop: [['鹽晶', 0.5]], desc: '天亮前凝在草尖上的水。它會替同伴洗掉傷口。' },
  灰雀群: { element: '風', row: 'back', hp: 52, atk: 14, def: 6, mag: 6, spd: 17, exp: 16, silver: 7, skills: [['群啄', 2], ['攻擊', 2]], drop: [['褪色羽', 0.4]], desc: '一大群灰色的雀，每天早上都在同一個時間叫。' },
  無臉的報時人: { element: '風', row: 'front', rank: '精英', hp: 280, atk: 19, def: 12, mag: 18, spd: 12, exp: 85, silver: 40, skills: [['報時', 2], ['抹去', 2], ['攻擊', 1]], drop: [['鐘銅', 1, 2], ['夜光珠', 1]], desc: '每天天亮以前，挨家挨戶敲門報時的人。他的臉，被自己忘掉了。' },
  晨鐘: { element: '石', row: 'front', rank: '首領', hp: 500, atk: 18, def: 16, mag: 20, spd: 8, exp: 210, silver: 90, skills: [['鐘鳴', 2], ['撞鐘', 2], ['回音', 1]], big: '晨鐘響', drop: [['鐘銅', 1, 3], ['夜光珠', 1]],
    phase2: { element: '影', line: '鐘裂開了一道縫。從縫裡流出來的，是四十年份的早晨。' }, desc: '鐘樓頂上的青銅大鐘。每天天亮，它一響，全村的人就忘了昨天。' },
  // 沉船灣
  藤壺人: { element: '石', row: 'front', hp: 98, atk: 19, def: 19, mag: 4, spd: 6, exp: 25, silver: 11, skills: [['攻擊', 2], ['硬化', 1], ['鉗擊', 1]], drop: [['珊瑚枝', 0.5]], desc: '在船底待了太久，身上長滿了藤壺，連自己都分不清哪裡是船、哪裡是人。' },
  鏽刃魚: { element: '潮', row: 'front', hp: 80, atk: 20, def: 12, mag: 5, spd: 14, exp: 24, silver: 10, skills: [['撕咬', 3], ['攻擊', 1]], drop: [['鏽鐵', 0.5]], desc: '鰭像生鏽的刀。牠們在沉船的骨架之間游來游去。' },
  船燈鬼: { element: '焰', row: 'back', hp: 60, atk: 6, def: 8, mag: 20, spd: 13, exp: 24, silver: 11, skills: [['鬼火', 3], ['低語', 1]], drop: [['燈芯', 0.5]], desc: '沉船上的燈，還在替不存在的船員照路。' },
  霧帆蝠: { element: '風', row: 'back', hp: 64, atk: 18, def: 8, mag: 8, spd: 18, exp: 23, silver: 10, skills: [['群啄', 2], ['攻擊', 2]], drop: [['船帆布', 0.5]], desc: '破掉的船帆，被霧吹成了蝙蝠的形狀。' },
  溺水的水手: { element: '影', row: 'front', hp: 92, atk: 19, def: 13, mag: 15, spd: 9, exp: 26, silver: 12, skills: [['拖入水底', 1], ['冷霧', 2], ['攻擊', 2]], drop: [['船帆布', 0.35], ['鏽鐵', 0.3]], desc: '他還在拉一條早就斷掉的纜繩。' },
  斷錨: { element: '石', row: 'front', rank: '精英', hp: 380, atk: 23, def: 18, mag: 10, spd: 7, exp: 120, silver: 55, skills: [['錨擊', 2], ['硬化', 1], ['攻擊', 2]], drop: [['鏽鐵', 1, 3], ['夜光珠', 1]], desc: '一支斷掉的錨，自己從海底爬了上來。鏈子的另一頭，鎖著船艙的門。' },
  霧中的船長: { element: '潮', row: 'front', rank: '首領', hp: 640, atk: 23, def: 15, mag: 22, spd: 10, exp: 320, silver: 140, skills: [['舵輪斬', 2], ['浪湧', 2], ['攻擊', 1]], big: '全帆衝撞', drop: [['夜光珠', 1, 2], ['船帆布', 1, 2]],
    phase2: { element: '影', line: '船長的外套被風吹開了。外套底下，什麼都沒有——只有霧。' }, desc: '穿著舊雨衣的船長，站在海燕號的舵輪旁邊。他的臉，總是看不清楚。' },
  // ═════ 第二海域：珊瑚環礁 ═════
  // 千帆市
  帳蟲: { element: '石', row: 'front', hp: 108, atk: 24, def: 18, mag: 4, spd: 7, exp: 21, silver: 13, skills: [['啃咬', 2], ['硬化', 1], ['攻擊', 2]], drop: [['帳紙', 0.5]], desc: '吃帳本長大的蟲。牠爬過的地方，數字都會少一位。' },
  銀貝蟹: { element: '潮', row: 'front', hp: 96, atk: 25, def: 16, mag: 7, spd: 10, exp: 20, silver: 20, skills: [['鉗擊', 2], ['攻擊', 2]], drop: [['銀貝殼', 0.6]], desc: '殼上長滿了銀貝。商人們說，抓到一隻，就能吃一個月。' },
  空殼人: { element: '影', row: 'front', hp: 104, atk: 24, def: 14, mag: 16, spd: 9, exp: 22, silver: 12, skills: [['討債', 2], ['抹去', 1], ['攻擊', 2]], drop: [['帳紙', 0.35], ['銀貝殼', 0.3]], desc: '把回憶全部當掉的人。身體還在走，裡面已經空了。' },
  當票鬼: { element: '風', row: 'back', hp: 68, atk: 8, def: 9, mag: 25, spd: 15, exp: 20, silver: 14, skills: [['鱗粉', 2], ['低語', 1], ['攻擊', 1]], drop: [['帳紙', 0.5]], desc: '一張沒有人來贖的當票，被風吹成了鬼。' },
  算盤精: { element: '石', row: 'back', hp: 72, atk: 7, def: 12, mag: 24, spd: 11, exp: 21, silver: 16, skills: [['銀貝雨', 2], ['晨露', 1]], drop: [['銀貝殼', 0.5]], desc: '珠子自己會動的算盤。它在算你們欠了多少。' },
  收帳人: { element: '風', row: 'front', rank: '精英', hp: 462, atk: 28, def: 17, mag: 22, spd: 13, exp: 98, silver: 70, skills: [['討債', 2], ['改畫', 1], ['攻擊', 2]], drop: [['銀貝殼', 1, 3], ['夜光珠', 1]], desc: '每天挨家挨戶收帳的人。他的帳本上，寫的不是錢，是名字。' },
  典當師: { element: '石', row: 'front', rank: '首領', hp: 836, atk: 28, def: 18, mag: 27, spd: 10, exp: 285, silver: 170, skills: [['典當', 2], ['低語', 1], ['攻擊', 1], ['回收', 1]], big: '全部當掉', drop: [['帳紙', 1, 3], ['夜光珠', 1, 2]],
    phase2: { element: '影', line: '典當師打開了身後的櫃子。上千個發光的瓶子，一起嘆了一口氣。' }, desc: '千帆市當鋪的老闆。他收了全市人的回憶，連自己的也收了。' },
  // 雙影嶼
  雙影鷗: { element: '風', row: 'back', hp: 82, atk: 25, def: 10, mag: 11, spd: 19, exp: 23, silver: 13, skills: [['群啄', 2], ['攻擊', 2]], drop: [['鏡砂', 0.4]], desc: '一隻鷗，有兩個影子。兩個影子往不同的方向飛。' },
  量尺蛇: { element: '石', row: 'front', hp: 118, atk: 26, def: 19, mag: 6, spd: 9, exp: 24, silver: 14, skills: [['纏繞', 2], ['攻擊', 2]], drop: [['測繩', 0.5]], desc: '身上刻滿了刻度。被牠纏住的東西，都會被量一遍。' },
  錯線: { element: '影', row: 'back', hp: 76, atk: 7, def: 10, mag: 27, spd: 13, exp: 23, silver: 13, skills: [['冷霧', 2], ['低語', 1]], drop: [['測繩', 0.35], ['墨魚墨', 0.3]], desc: '畫錯的那一條線。它到處找，想找回自己本來該在的地方。' },
  鏡中人: { element: '星', row: 'front', hp: 110, atk: 25, def: 15, mag: 22, spd: 12, exp: 25, silver: 15, skills: [['鏡光', 2], ['抹去', 1], ['攻擊', 2]], drop: [['鏡砂', 0.5]], desc: '長得跟你一模一樣的人。可是他的左右，跟你相反。' },
  墨魚: { element: '潮', row: 'front', hp: 100, atk: 24, def: 14, mag: 13, spd: 12, exp: 22, silver: 13, skills: [['噴墨', 1], ['撕咬', 2], ['攻擊', 1]], drop: [['墨魚墨', 0.6]], desc: '牠吐出來的墨，畫在紙上不會褪色。測量員最喜歡。' },
  量天尺: { element: '石', row: 'front', rank: '精英', hp: 506, atk: 30, def: 21, mag: 16, spd: 9, exp: 105, silver: 75, skills: [['丈量', 2], ['硬化', 1], ['攻擊', 2]], drop: [['測繩', 1, 3], ['夜光珠', 1]], desc: '測量員留下來的巨大量尺，自己站了起來。它身上掛著一串鑰匙。' },
  冊上的測量員: { element: '風', row: 'front', rank: '首領', hp: 946, atk: 29, def: 17, mag: 30, spd: 12, exp: 322, silver: 190, skills: [['改畫', 2], ['丈量', 2], ['抹去', 1]], big: '重畫', drop: [['鏡砂', 1, 3], ['夜光珠', 1, 2]],
    phase2: { element: '影', line: '測量員把自己的臉也擦掉了。他說：「這張也畫錯了。」' }, desc: '五十年前的商會測量員。他還在霧裡，一遍一遍重畫那座島。' },
  // 珠母潟湖
  珠蚌: { element: '潮', row: 'front', hp: 126, atk: 25, def: 22, mag: 9, spd: 6, exp: 25, silver: 16, skills: [['鉗擊', 2], ['硬化', 1], ['攻擊', 1]], drop: [['珍珠', 0.45]], desc: '殼閉得緊緊的。裡面有一顆珍珠，在小聲地哭。' },
  閘門守: { element: '石', row: 'front', hp: 132, atk: 27, def: 20, mag: 6, spd: 7, exp: 26, silver: 15, skills: [['錨擊', 1], ['攻擊', 2], ['硬化', 1]], drop: [['閘石', 0.5]], desc: '潮閘上的石頭守衛。它只記得一件事：不准開門。' },
  白線水母: { element: '潮', row: 'back', hp: 80, atk: 7, def: 10, mag: 27, spd: 12, exp: 24, silver: 14, skills: [['螫刺', 2], ['鹽霧', 1]], drop: [['珍珠', 0.3], ['墨魚墨', 0.3]], desc: '透明的身體裡，有一條白線。看久了，會忘記自己在哪裡。' },
  淚珠精: { element: '星', row: 'back', hp: 78, atk: 6, def: 11, mag: 25, spd: 13, exp: 24, silver: 15, skills: [['晨露', 2], ['鏡光', 2]], drop: [['珍珠', 0.5]], desc: '一顆從珍珠裡逃出來的眼淚。它會替同伴擦掉傷口。' },
  閘門獸: { element: '石', row: 'front', rank: '精英', hp: 550, atk: 31, def: 22, mag: 18, spd: 8, exp: 112, silver: 80, skills: [['錨擊', 2], ['鐘鳴', 1], ['攻擊', 2]], drop: [['閘石', 1, 3], ['夜光珠', 1]], desc: '整座潮閘活了過來。牠的肚子裡，鎖著閘門的鑰匙。' },
  珠母: { element: '潮', row: 'front', rank: '首領', hp: 990, atk: 29, def: 18, mag: 32, spd: 10, exp: 352, silver: 200, skills: [['珠淚', 2], ['擁抱', 2], ['回潮', 1]], big: '潮汐之歌', drop: [['珍珠', 1, 3], ['夜光珠', 1, 2]],
    phase2: { element: '影', line: '湖水往下退。珠母的影子，大得像整片湖。' }, desc: '潟湖底的珊瑚母。三十年前，潮閘關上以後，她就一直在哭。' },
  // 帳房島
  印章兵: { element: '石', row: 'front', hp: 140, atk: 29, def: 22, mag: 7, spd: 8, exp: 28, silver: 18, skills: [['印章', 2], ['攻擊', 2]], drop: [['帳紙', 0.4], ['閘石', 0.3]], desc: '頭是一顆大印章。牠蓋過的東西，就一輩子都是商會的。' },
  帳房書記: { element: '風', row: 'back', hp: 86, atk: 8, def: 11, mag: 29, spd: 14, exp: 27, silver: 18, skills: [['改畫', 2], ['登記', 1]], drop: [['帳紙', 0.5]], desc: '他一直在寫字。寫的都是你們的名字。' },
  白頁蛾: { element: '星', row: 'back', hp: 82, atk: 7, def: 10, mag: 28, spd: 17, exp: 26, silver: 16, skills: [['鏡光', 2], ['鱗粉', 1]], drop: [['白珊瑚', 0.4]], desc: '翅膀是兩張白紙。牠飛過的地方，顏色會淡一點。' },
  灰珊瑚: { element: '影', row: 'front', hp: 136, atk: 28, def: 20, mag: 20, spd: 8, exp: 28, silver: 17, skills: [['擁抱', 1], ['冷霧', 1], ['攻擊', 2]], drop: [['白珊瑚', 0.5]], desc: '五十年沒有長過一寸的珊瑚。它很生氣。' },
  登記的影子: { element: '影', row: 'front', hp: 124, atk: 28, def: 17, mag: 22, spd: 12, exp: 27, silver: 17, skills: [['討債', 2], ['抹去', 1], ['攻擊', 1]], drop: [['帳紙', 0.35], ['白珊瑚', 0.3]], desc: '被登記進冊子裡的人，留在外面的影子。' },
  金庫鎖: { element: '石', row: 'front', rank: '精英', hp: 594, atk: 32, def: 24, mag: 20, spd: 9, exp: 120, silver: 90, skills: [['印章', 2], ['硬化', 1], ['典當', 1]], drop: [['白珊瑚', 1, 3], ['夜光珠', 1]], desc: '帳房塔的大鎖。它吃過七把鑰匙，第八把就在它肚子裡。' },
  白頁: { element: '星', row: 'front', rank: '首領', hp: 1144, atk: 31, def: 19, mag: 35, spd: 11, exp: 420, silver: 240, skills: [['抹白', 2], ['登記', 1], ['印章', 1], ['攻擊', 1]], big: '全海圖', drop: [['白珊瑚', 1, 3], ['夜光珠', 1, 2]],
    phase2: { element: '影', line: '白頁翻了過來。背面不是白的——密密麻麻，畫滿了整片海。' }, desc: '一頁從公會長的「全海圖」上撕下來的紙。被它畫過的地方，霧進不來，可是什麼都不會再長。' },
  // ═════ 第三海域：焰之群島 ═════
  // 紅帆港
  灰鴉: { element: '風', row: 'back', hp: 104, atk: 31, def: 13, mag: 14, spd: 20, exp: 30, silver: 18, skills: [['群啄', 2], ['攻擊', 2]], drop: [['紅赭土', 0.4]], desc: '火山灰染黑的烏鴉。牠們會把亮晶晶的東西叼回帆房。' },
  帆影: { element: '影', row: 'front', hp: 156, atk: 32, def: 19, mag: 22, spd: 13, exp: 32, silver: 19, skills: [['帆影纏身', 2], ['攻擊', 2]], drop: [['舊帆布', 0.5]], desc: '一面帆的影子，掉在甲板上，自己站了起來。' },
  火藥蟹: { element: '焰', row: 'front', hp: 160, atk: 33, def: 23, mag: 16, spd: 9, exp: 32, silver: 20, skills: [['鉗擊', 2], ['火藥桶', 1], ['攻擊', 1]], drop: [['火藥', 0.5]], desc: '把火藥桶當殼背的螃蟹。千萬不要讓牠靠近營火。' },
  繩結蛇: { element: '石', row: 'front', hp: 150, atk: 31, def: 21, mag: 8, spd: 12, exp: 31, silver: 18, skills: [['纏繞', 2], ['攻擊', 2]], drop: [['舊帆布', 0.35], ['紅赭土', 0.3]], desc: '一條打了一百個結的纜繩。每個結，都是一個海盜的故事。' },
  舊旗鬼: { element: '風', row: 'back', hp: 98, atk: 9, def: 13, mag: 31, spd: 15, exp: 31, silver: 19, skills: [['無名之風', 1], ['鱗粉', 2], ['低語', 1]], drop: [['舊帆布', 0.5]], desc: '一面褪色的旗子。上面的字被風吹掉了，它一直在找。' },
  桅頂守望: { element: '風', row: 'front', rank: '精英', hp: 660, atk: 35, def: 23, mag: 24, spd: 15, exp: 135, silver: 95, skills: [['劫掠', 2], ['群啄', 1], ['攻擊', 2]], drop: [['舊帆布', 1, 3], ['夜光珠', 1]], desc: '在桅杆頂上守了二十年的瞭望手。他早就看不見海了，可是他還記得帆房的鑰匙放在哪裡。' },
  無名帆: { element: '風', row: 'front', rank: '首領', hp: 1260, atk: 33, def: 20, mag: 37, spd: 13, exp: 470, silver: 260, skills: [['無名之風', 2], ['帆影纏身', 1], ['攻擊', 1], ['褪色', 1]], big: '帆落', drop: [['舊帆布', 1, 3], ['夜光珠', 1, 2]],
    phase2: { element: '影', line: '紅色從帆上褪掉了。底下的布，是霧的顏色。' }, desc: '帆房最深處，一面沒有字的紅帆。沒有風的時候，它自己飄起來。' },
  // 鐵喉礦坑
  礦燈蟲: { element: '星', row: 'back', hp: 100, atk: 8, def: 14, mag: 32, spd: 14, exp: 31, silver: 18, skills: [['礦燈', 2], ['晨露', 1]], drop: [['礦工牌', 0.4]], desc: '吃礦工燈油長大的蟲。牠的光，只照得到牠自己。' },
  坑道的手: { element: '影', row: 'front', hp: 162, atk: 33, def: 20, mag: 24, spd: 11, exp: 33, silver: 19, skills: [['敲壁', 2], ['拖入水底', 1], ['攻擊', 1]], drop: [['礦工牌', 0.35], ['鐵礦', 0.3]], desc: '從石壁裡伸出來的手。它不抓人，只是想被看見。' },
  碎岩: { element: '石', row: 'front', hp: 178, atk: 34, def: 26, mag: 6, spd: 7, exp: 33, silver: 20, skills: [['落石', 1], ['硬化', 1], ['攻擊', 2]], drop: [['鐵礦', 0.5]], desc: '一塊會走路的礦石。敲下來的碎片，可以拿去煉鐵。' },
  鐵喉鼠: { element: '風', row: 'front', hp: 132, atk: 33, def: 15, mag: 6, spd: 21, exp: 30, silver: 17, skills: [['啃咬', 3], ['攻擊', 1]], drop: [['炭', 0.4]], desc: '礦坑裡的老鼠。牠們最先知道哪裡要塌。' },
  硫磺精: { element: '焰', row: 'back', hp: 104, atk: 9, def: 13, mag: 33, spd: 13, exp: 32, silver: 19, skills: [['硫磺霧', 2], ['火花', 1]], drop: [['硫磺', 0.5]], desc: '從礦坑深處冒出來的黃色煙。聞起來像壞掉的蛋。' },
  失控的礦車: { element: '石', row: 'front', rank: '精英', hp: 720, atk: 37, def: 27, mag: 14, spd: 12, exp: 140, silver: 100, skills: [['落石', 2], ['錨擊', 1], ['攻擊', 2]], drop: [['鐵礦', 1, 3], ['夜光珠', 1]], desc: '三十年前那天，最後一台開出坑道的礦車。它一直在軌道上來回跑，車斗裡放著坑道的鑰匙。' },
  敲壁的人: { element: '石', row: 'front', rank: '首領', hp: 1380, atk: 35, def: 23, mag: 34, spd: 9, exp: 500, silver: 280, skills: [['敲壁', 2], ['落石', 1], ['硫磺霧', 1], ['回收', 1]], big: '坍方', drop: [['礦工牌', 1, 3], ['夜光珠', 1, 2]],
    phase2: { element: '影', line: '石壁上的敲擊聲，一下子變成了幾十個。每一下，都是一個沒有名字的人。' }, desc: '礦坑最深處，一直在敲石壁的人。他的身上，掛滿了沒有刻字的礦工牌。' },
  // 鍛火嶼
  炭蜥: { element: '焰', row: 'front', hp: 166, atk: 34, def: 21, mag: 18, spd: 12, exp: 33, silver: 19, skills: [['撕咬', 2], ['火花', 1], ['攻擊', 1]], drop: [['炭', 0.5]], desc: '背上的鱗片燒得通紅。牠趴過的石頭，三天都是燙的。' },
  鐵砧龜: { element: '石', row: 'front', hp: 190, atk: 33, def: 28, mag: 8, spd: 6, exp: 34, silver: 21, skills: [['鍛打', 1], ['硬化', 1], ['攻擊', 2]], drop: [['鐵礦', 0.5]], desc: '殼是一塊鐵砧。老鐵匠說，牠是自己爬進鍛鋪的。' },
  風箱鬼: { element: '風', row: 'back', hp: 102, atk: 10, def: 13, mag: 33, spd: 16, exp: 32, silver: 19, skills: [['改畫', 1], ['鱗粉', 2], ['攻擊', 1]], drop: [['熔岩玻璃', 0.35], ['炭', 0.3]], desc: '一個破掉的風箱。它一呼一吸，爐火就跟著一明一滅。' },
  熔渣魚: { element: '潮', row: 'front', hp: 158, atk: 34, def: 19, mag: 20, spd: 13, exp: 33, silver: 19, skills: [['撕咬', 2], ['浪湧', 1]], drop: [['熔岩玻璃', 0.5]], desc: '游在冷掉的熔岩裡的魚。鱗片是一片一片的黑玻璃。' },
  火花精: { element: '焰', row: 'back', hp: 98, atk: 8, def: 12, mag: 34, spd: 17, exp: 32, silver: 19, skills: [['火花', 2], ['熔流', 1]], drop: [['硫磺', 0.35], ['炭', 0.3]], desc: '從鐵砧上濺出來的一粒火花，忘了要熄掉。' },
  燒紅的鐵鉗: { element: '焰', row: 'front', rank: '精英', hp: 740, atk: 38, def: 25, mag: 26, spd: 11, exp: 145, silver: 105, skills: [['鍛打', 2], ['熔流', 1], ['攻擊', 2]], drop: [['熔岩玻璃', 1, 3], ['夜光珠', 1]], desc: '老鐵匠的鐵鉗。五十年來一直夾著同一把鑰匙，從來沒有放下。' },
  爐心: { element: '焰', row: 'front', rank: '首領', hp: 1440, atk: 36, def: 22, mag: 39, spd: 11, exp: 520, silver: 290, skills: [['熔流', 2], ['鍛打', 1], ['火花', 1], ['添煤', 1]], big: '熔爐', drop: [['熔岩玻璃', 1, 3], ['夜光珠', 1, 2]],
    phase2: { element: '影', line: '爐火裡的筆，轉過來看著你們。火光底下，是一個很老的人的臉。' }, desc: '鍛火嶼五十年沒熄過的爐火。它替老鐵匠記得一件他不想記得的事。' },
  // 紅岬
  號碼兵: { element: '石', row: 'front', hp: 184, atk: 35, def: 25, mag: 10, spd: 9, exp: 35, silver: 22, skills: [['印章', 2], ['編號', 1], ['攻擊', 1]], drop: [['礦工牌', 0.4], ['鐵礦', 0.3]], desc: '胸口釘著一塊號碼牌的士兵。問他叫什麼名字，他會唸出一串數字。' },
  紅岩蠍: { element: '焰', row: 'front', hp: 170, atk: 36, def: 22, mag: 18, spd: 14, exp: 35, silver: 21, skills: [['螫刺', 1], ['撕咬', 2], ['攻擊', 1]], drop: [['紅赭土', 0.5]], desc: '紅岬的紅色岩石裡爬出來的蠍子。牠的尾巴，指著火山的方向。' },
  冷灰: { element: '影', row: 'back', hp: 108, atk: 9, def: 14, mag: 35, spd: 14, exp: 34, silver: 21, skills: [['冷霧', 2], ['編號', 1]], drop: [['硫磺', 0.35], ['紅赭土', 0.3]], desc: '火山口冷掉以後，積在地上的灰。它記得火的溫度。' },
  熔岩精: { element: '焰', row: 'back', hp: 106, atk: 9, def: 13, mag: 36, spd: 15, exp: 34, silver: 21, skills: [['噴發', 1], ['火花', 2]], drop: [['熔岩玻璃', 0.4], ['硫磺', 0.3]], desc: '睡著的火山，在夢裡流出來的一小團熔岩。' },
  鎖鏈犬: { element: '風', row: 'front', hp: 164, atk: 36, def: 20, mag: 8, spd: 18, exp: 34, silver: 21, skills: [['撕咬', 2], ['纏繞', 1], ['攻擊', 1]], drop: [['鐵礦', 0.4]], desc: '要塞養的狗，脖子上的鏈子比牠還重。牠不會叫，只會追。' },
  第七號的門: { element: '石', row: 'front', rank: '精英', hp: 800, atk: 38, def: 28, mag: 24, spd: 9, exp: 155, silver: 110, skills: [['印章', 2], ['硬化', 1], ['編號', 1], ['攻擊', 1]], drop: [['礦工牌', 1, 3], ['夜光珠', 1]], desc: '要塞的大門，漆著一個大大的「七」。它把鑰匙吞進了門閂裡。' },
  第七號: { element: '石', row: 'front', rank: '首領', hp: 1720, atk: 37, def: 24, mag: 40, spd: 10, exp: 620, silver: 340, skills: [['噴發', 2], ['編號', 1], ['落石', 1], ['添煤', 1]], big: '火山甦醒', drop: [['紅赭土', 1, 3], ['夜光珠', 1, 3]],
    phase2: { element: '焰', line: '號碼牌一塊一塊熔掉了。底下的岩石，是燒紅的。睡了二十年的火山，翻了一個身。' },
    phase3: { element: '影', line: '火山的影子站了起來。它還是想不起自己的名字。「我是……第七號……」' }, desc: '被商會改成號碼的島。它忘了自己的名字，火山也跟著睡著了。' },
};

export const ITEMS = {
  藥草: { price: 8, desc: '回復一名同伴 45% 的體力。', heal: 0.45 },
  海靈露: { price: 7, desc: '回復一名同伴 15 點靈（用技能要花的力氣）。', mp: 15 },
  醒神香: { price: 20, desc: '讓倒下的同伴醒過來（回復 30%）。', revive: 0.3 },
};

// ───────── 素材：打怪、開寶箱得到，在鐵匠打造裝備。不佔貨艙 ─────────
export const MATS = {
  漂流木: '被海浪磨得很光滑的木頭。',
  霧苔: '長在霧最濃的地方，摸起來涼涼的。',
  鹽晶: '一句被海水泡了很久的話，結成的鹽。',
  燈芯: '燈蛾翅膀上的粉，捻起來可以點燈。',
  珊瑚枝: '硬得像石頭，又輕得像骨頭。',
  鐘銅: '晨忘島的青銅。敲一下，會聽見早晨。',
  褪色羽: '灰色的羽毛。拿在手裡，會想不起剛剛在想什麼。',
  鏽鐵: '沉船上的鐵。鏽得很厚，裡面卻還是硬的。',
  船帆布: '泡過海水、晒過太陽，怎麼扯都扯不破。',
  夜光珠: '霧裡的東西消散時，留下的一點光。',
  // 第二海域
  銀貝殼: '千帆市的錢。殼越亮，越值錢。',
  帳紙: '商會的帳本用紙。寫上去的字，很難擦掉。',
  鏡砂: '雙影嶼的沙。看進去，會看見另一邊的海。',
  測繩: '一條打滿結的繩子，每個結是一步。',
  墨魚墨: '畫在紙上，一百年都不會褪色。',
  珍珠: '珠母潟湖的珍珠。貼在耳朵上，聽得見很小的哭聲。',
  閘石: '潮閘上的石頭。泡了三十年的水，還是不肯讓水過去。',
  白珊瑚: '褪成白色的珊瑚。很輕，很硬，很安靜。',
  // 第三海域
  紅赭土: '焰之群島的紅色泥土。紅帆的帆，就是用它染的。',
  舊帆布: '海盜退下來的舊帆。上面繡著一個島的名字。',
  火藥: '紅帆自己調的火藥。用的時候要離營火遠一點。',
  鐵礦: '鐵喉礦坑挖出來的礦石。很重，敲起來聲音很悶。',
  礦工牌: '刻著名字的銅牌。礦工下坑前掛在門口，出來再拿走。',
  炭: '鍛火嶼的炭。燒起來沒有煙，只有很穩很穩的火。',
  硫磺: '黃色的石頭。聞起來很臭，可是能讓火燒得更旺。',
  熔岩玻璃: '熔岩冷掉以後結成的黑玻璃。對著光看，裡面有火在動。',
};

// ───────── 裝備：在鐵匠用素材打造。who：只有誰能用（不寫就是大家都能用） ─────────
// 打造前要先有「圖紙」：start 是一開始就會的，其他的在寶箱、首領、委託裡找
export const SLOTS = ['武器', '防具', '飾品'];
export const EQUIPS = {
  海鷗羽筆: { slot: '武器', who: '墨里', start: true, stats: { mag: 3 }, cost: { 銀貝: 15, 漂流木: 1, 霧苔: 1 }, desc: '用海鷗的羽毛削成的筆。' },
  鹽晶筆: { slot: '武器', who: '墨里', stats: { mag: 6, mp: 3 }, cost: { 銀貝: 40, 鹽晶: 3, 燈芯: 1 }, desc: '筆尖是一小塊鹽晶，畫出來的線會發亮。' },
  鐘銅筆: { slot: '武器', who: '墨里', stats: { mag: 10, mp: 5 }, cost: { 銀貝: 90, 鐘銅: 3, 夜光珠: 1 }, desc: '筆桿是青銅的。寫字的時候，會聽見很遠的鐘聲。' },
  漂流木刀: { slot: '武器', who: '阿潮', start: true, stats: { atk: 3 }, cost: { 銀貝: 15, 漂流木: 3 }, desc: '阿潮自己削的木刀。比看起來硬。' },
  珊瑚刃: { slot: '武器', who: '阿潮', stats: { atk: 6 }, cost: { 銀貝: 40, 珊瑚枝: 3, 鹽晶: 1 }, desc: '用珊瑚枝磨出來的刀刃，紅得像晚霞。' },
  鏽錨刀: { slot: '武器', who: '阿潮', stats: { atk: 11, spd: -1 }, cost: { 銀貝: 90, 鏽鐵: 4, 鐘銅: 1 }, desc: '用沉船的錨打成的大刀。很重，砍下去更重。' },
  霧苔杖: { slot: '武器', who: '蓮笙', start: true, stats: { mag: 3, mp: 3 }, cost: { 銀貝: 15, 霧苔: 3 }, desc: '纏著霧苔的木杖。蓮笙說，拿著它，霧的聲音比較清楚。' },
  燈芯鈴杖: { slot: '武器', who: '蓮笙', stats: { mag: 7, mp: 5 }, cost: { 銀貝: 45, 燈芯: 2, 鹽晶: 2 }, desc: '杖頭掛著一串小鈴，鈴裡點著燈芯。' },
  貝殼琴: { slot: '武器', who: '小鈴', start: true, stats: { mag: 4, spd: 1 }, cost: { 銀貝: 30, 珊瑚枝: 2, 漂流木: 2 }, desc: '用大貝殼做的小琴。彈起來有海浪的聲音。' },
  夜光琴: { slot: '武器', who: '小鈴', stats: { mag: 9, spd: 2 }, cost: { 銀貝: 80, 夜光珠: 1, 鐘銅: 2 }, desc: '琴弦是夜光珠拉成的細絲，在黑暗裡也看得見。' },
  霧苔斗篷: { slot: '防具', start: true, stats: { def: 2, hp: 10 }, cost: { 銀貝: 15, 霧苔: 2, 漂流木: 1 }, desc: '縫著霧苔的斗篷，可以擋一點風。' },
  珊瑚甲: { slot: '防具', stats: { def: 5, hp: 18, spd: -1 }, cost: { 銀貝: 45, 珊瑚枝: 3, 鹽晶: 1 }, desc: '一片一片珊瑚串起來的甲，有點重。' },
  帆布大衣: { slot: '防具', stats: { def: 7, hp: 26 }, cost: { 銀貝: 80, 船帆布: 3, 褪色羽: 1 }, desc: '用沉船的帆布縫的大衣，口袋很多。' },
  燈芯護符: { slot: '飾品', start: true, stats: { spd: 2 }, cost: { 銀貝: 12, 燈芯: 2 }, desc: '一小撮燈芯，包在布裡。據說能讓人腳步變輕。' },
  鹽晶墜子: { slot: '飾品', stats: { mp: 6, mag: 1 }, cost: { 銀貝: 30, 鹽晶: 3 }, desc: '透明的鹽晶墜子。戴著它，比較不容易累。' },
  褪色羽飾: { slot: '飾品', stats: { spd: 3, mp: 4 }, cost: { 銀貝: 45, 褪色羽: 3 }, desc: '灰色的羽毛髮飾。戴著它的人，動作快得讓人記不住。' },
  夜光錨墜: { slot: '飾品', stats: { hp: 20, def: 3, atk: 2 }, cost: { 銀貝: 70, 夜光珠: 1, 鏽鐵: 2 }, desc: '一個小小的錨，錨尖嵌著夜光珠。' },
  // 第二海域
  帳房短弓: { slot: '武器', who: '費米', stats: { atk: 4 }, cost: { 銀貝: 30, 漂流木: 2, 船帆布: 1 }, desc: '商會配給帳房學徒的短弓。費米一直帶在身上。' },
  測繩弓: { slot: '武器', who: '費米', stats: { atk: 10, spd: 1 }, cost: { 銀貝: 110, 測繩: 3, 鏽鐵: 2 }, desc: '弓弦是測量員的繩子，拉開的長度剛好一步。' },
  白珊瑚弓: { slot: '武器', who: '費米', stats: { atk: 15, spd: 2 }, cost: { 銀貝: 170, 白珊瑚: 3, 夜光珠: 1 }, desc: '白珊瑚削成的長弓。射出去的箭，不會被霧擋住。' },
  珍珠筆: { slot: '武器', who: '墨里', stats: { mag: 14, mp: 6 }, cost: { 銀貝: 130, 珍珠: 3, 墨魚墨: 2 }, desc: '筆尖嵌著一顆珍珠。畫出來的線，像月光。' },
  白頁筆: { slot: '武器', who: '墨里', stats: { mag: 18, mp: 8 }, cost: { 銀貝: 190, 白珊瑚: 2, 墨魚墨: 3 }, desc: '用白珊瑚做的筆。寫在白頁上的字，霧也擦不掉。' },
  銀貝刀: { slot: '武器', who: '阿潮', stats: { atk: 15 }, cost: { 銀貝: 130, 銀貝殼: 4, 鏽鐵: 2 }, desc: '刀背嵌著一排銀貝。阿潮說，這是他用過最貴的刀。' },
  閘石大刀: { slot: '武器', who: '阿潮', stats: { atk: 20, spd: -1 }, cost: { 銀貝: 190, 閘石: 4, 夜光珠: 1 }, desc: '潮閘的石頭磨成的大刀。砍下去，像浪打在堤防上。' },
  珊瑚母杖: { slot: '武器', who: '蓮笙', stats: { mag: 13, mp: 9 }, cost: { 銀貝: 150, 珍珠: 2, 白珊瑚: 2 }, desc: '珊瑚母送的杖。蓮笙拿著它的時候，會小聲地哼歌。' },
  鏡砂琴: { slot: '武器', who: '小鈴', stats: { mag: 13, spd: 3 }, cost: { 銀貝: 140, 鏡砂: 3, 銀貝殼: 2 }, desc: '琴身灑了鏡砂。彈的時候，會有另一個聲音跟著唱。' },
  帳紙披風: { slot: '防具', stats: { def: 9, hp: 32 }, cost: { 銀貝: 120, 帳紙: 4, 船帆布: 1 }, desc: '一層一層帳紙糊成的披風。很輕，刀也不太砍得破。' },
  測繩外套: { slot: '防具', stats: { def: 8, hp: 28, spd: 2 }, cost: { 銀貝: 130, 測繩: 3, 墨魚墨: 1 }, desc: '測量員的外套，袖口打滿了結。穿上以後，腳步會變得很準。' },
  珍珠鱗甲: { slot: '防具', stats: { def: 12, hp: 42, spd: -1 }, cost: { 銀貝: 180, 珍珠: 3, 閘石: 2 }, desc: '一片一片珍珠串起來的甲。在燈下會發出淡淡的光。' },
  銀貝耳環: { slot: '飾品', stats: { mag: 3, mp: 8 }, cost: { 銀貝: 90, 銀貝殼: 3 }, desc: '千帆市最流行的耳環。戴著它，講價比較容易。' },
  鏡砂護符: { slot: '飾品', stats: { spd: 4, atk: 2 }, cost: { 銀貝: 100, 鏡砂: 3 }, desc: '一小瓶鏡砂。戴著它，好像有另一個自己在旁邊幫忙。' },
  墨魚墨瓶: { slot: '飾品', stats: { mp: 10, mag: 3 }, cost: { 銀貝: 110, 墨魚墨: 3 }, desc: '一小瓶墨。{名}說，這是畫海人最好的護身符。' },
  珍珠墜: { slot: '飾品', stats: { hp: 30, def: 4 }, cost: { 銀貝: 120, 珍珠: 2, 帳紙: 2 }, desc: '一顆珍珠墜子。貼在胸口，聽得見很小很小的歌聲。' },
  白珊瑚戒: { slot: '飾品', stats: { hp: 20, atk: 4, mag: 4 }, cost: { 銀貝: 170, 白珊瑚: 2, 夜光珠: 1 }, desc: '白珊瑚磨成的戒指。戴著它，會想起很久以前的海。' },
  // 第三海域
  紅帆短斧: { slot: '武器', who: '葛蘿', stats: { atk: 8 }, cost: { 銀貝: 60, 鏽鐵: 2, 船帆布: 1 }, desc: '葛蘿用了二十年的短斧。斧柄上纏著一條紅布。' },
  錨鏈斧: { slot: '武器', who: '葛蘿', stats: { atk: 16, def: 2 }, cost: { 銀貝: 200, 鐵礦: 4, 舊帆布: 2 }, desc: '斧頭後面拖著一段錨鏈。揮出去的時候，像船在下錨。' },
  熔岩斧: { slot: '武器', who: '葛蘿', stats: { atk: 23, def: 3, spd: -1 }, cost: { 銀貝: 280, 熔岩玻璃: 3, 鐵礦: 3, 夜光珠: 1 }, desc: '斧刃是一整片熔岩玻璃。砍下去的地方，會留下一道紅光。' },
  熔岩玻璃筆: { slot: '武器', who: '墨里', stats: { mag: 23, mp: 10 }, cost: { 銀貝: 260, 熔岩玻璃: 3, 炭: 2 }, desc: '黑玻璃磨成的筆。畫出來的線，像剛冷掉的熔岩。' },
  鍛火刀: { slot: '武器', who: '阿潮', stats: { atk: 26 }, cost: { 銀貝: 260, 鐵礦: 4, 炭: 3 }, desc: '鍛火嶼的爐火打出來的刀。阿潮說，終於有一把配得上他的刀了。' },
  硫磺鈴杖: { slot: '武器', who: '蓮笙', stats: { mag: 18, mp: 12 }, cost: { 銀貝: 230, 硫磺: 3, 礦工牌: 2 }, desc: '杖頭的鈴是用礦工牌熔的。搖起來，像有人在遠處應答。' },
  紅帆琴: { slot: '武器', who: '小鈴', stats: { mag: 18, spd: 4 }, cost: { 銀貝: 230, 舊帆布: 3, 紅赭土: 2 }, desc: '琴身蒙著紅帆布。彈起來，有海盜唱歌的聲音。' },
  火藥長弓: { slot: '武器', who: '費米', stats: { atk: 21, spd: 2 }, cost: { 銀貝: 240, 火藥: 3, 鐵礦: 2 }, desc: '紅帆的長弓，箭袋裡裝著火藥箭。費米說，這是他第一次用海盜的東西。' },
  舊帆布外套: { slot: '防具', stats: { def: 13, hp: 44, spd: 1 }, cost: { 銀貝: 200, 舊帆布: 4, 紅赭土: 1 }, desc: '用退下來的紅帆縫的外套。穿上以後，背上有一個島的名字。' },
  礦工皮甲: { slot: '防具', stats: { def: 15, hp: 50 }, cost: { 銀貝: 230, 礦工牌: 3, 鐵礦: 2 }, desc: '礦工的皮甲，胸口縫著一塊銅牌。擋得住落石。' },
  熔岩鱗甲: { slot: '防具', stats: { def: 18, hp: 60, spd: -1 }, cost: { 銀貝: 300, 熔岩玻璃: 3, 炭: 2, 夜光珠: 1 }, desc: '一片一片黑玻璃串起來的甲。在暗的地方，會透出一點紅光。' },
  鐵喉大盾: { slot: '防具', who: '葛蘿', stats: { def: 22, hp: 70, spd: -2 }, cost: { 銀貝: 280, 鐵礦: 5, 礦工牌: 2 }, desc: '用礦車的車斗打成的盾。葛蘿一隻手就舉得起來。' },
  紅赭護符: { slot: '飾品', stats: { atk: 4, spd: 4 }, cost: { 銀貝: 160, 紅赭土: 3 }, desc: '一小包紅色的泥土。海盜出海前，會在額頭上點一下。' },
  礦工牌項鍊: { slot: '飾品', stats: { hp: 36, def: 5 }, cost: { 銀貝: 180, 礦工牌: 3 }, desc: '一串刻著名字的礦工牌。戴著它，就有人記得你從哪裡來。' },
  硫磺香囊: { slot: '飾品', stats: { mp: 14, mag: 5 }, cost: { 銀貝: 180, 硫磺: 3, 舊帆布: 1 }, desc: '很臭的香囊。可是戴著它，腦袋會變得很清楚。' },
  炭火戒: { slot: '飾品', stats: { atk: 6, mag: 6 }, cost: { 銀貝: 220, 炭: 3, 熔岩玻璃: 1 }, desc: '戒面嵌著一小塊不會熄的炭。冬天的時候很好用。' },
  // 黑市才買得到的圖紙
  紅帆旗披風: { slot: '防具', stats: { def: 16, hp: 52, spd: 3 }, cost: { 銀貝: 320, 舊帆布: 4, 紅赭土: 3 }, desc: '一整面紅帆旗改成的披風。紅帆的人看見它，都會讓路。' },
  海盜望遠鏡: { slot: '飾品', stats: { spd: 6, atk: 4, mag: 4 }, cost: { 銀貝: 280, 熔岩玻璃: 2, 鐵礦: 2 }, desc: '鏡片是熔岩玻璃磨的。看得見霧後面的東西——偶爾。' },
};
export const STAT_NAME = { hp: '體', mp: '靈', atk: '攻', def: '防', mag: '法', spd: '速' };

// ───────── 船塢：改造船 ─────────
export const SHIP = {
  貨艙: { desc: '補給的上限', levels: [
    { label: '加大貨艙', cost: { 銀貝: 60, 漂流木: 5 }, note: '貨艙 40 → 55' },
    { label: '雙層貨艙', cost: { 銀貝: 130, 鏽鐵: 3, 船帆布: 2 }, note: '貨艙 55 → 70' },
    { label: '鐵骨貨艙', cost: { 銀貝: 260, 鐵礦: 4, 舊帆布: 3 }, note: '貨艙 70 → 85' }] },
  船帆: { desc: '航海事件的損失', levels: [
    { label: '補好船帆', cost: { 銀貝: 50, 船帆布: 2, 褪色羽: 2 }, note: '航海事件的損失減半' }] },
  船首像: { desc: '登島時看得更遠', levels: [
    { label: '霧燈船首像', cost: { 銀貝: 80, 鐘銅: 2, 燈芯: 3 }, note: '登島時，周圍兩圈的霧會散開' }] },
};
export const cargoMax = g => 40 + 15 * ((g.ship && g.ship.貨艙) || 0);

// ───────── 勢力聲望（第三章開始）：0～100，每 20 一級 ─────────
export const FACTIONS = ['商會', '紅帆'];
export const REP_LEVELS = ['冷淡', '認識', '信任', '夥伴', '至交'];
export const repLevel = n => Math.max(0, Math.min(4, Math.floor((n || 0) / 20)));

// ───────── 黑市：紅帆聲望越高，賣的東西越好。need 是要到的聲望等級 ─────────
export const BLACK_MARKET = [
  { name: '火藥', kind: 'mat', n: 2, price: 30, need: 0 },
  { name: '醒神香', kind: 'supply', n: 1, price: 16, need: 0 },
  { name: '舊帆布', kind: 'mat', n: 2, price: 34, need: 1 },
  { name: '圖紙：紅赭護符', kind: 'bp', bp: '紅赭護符', price: 120, need: 1 },
  { name: '夜光珠', kind: 'mat', n: 1, price: 60, need: 2 },
  { name: '圖紙：紅帆旗披風', kind: 'bp', bp: '紅帆旗披風', price: 220, need: 2 },
  { name: '圖紙：海盜望遠鏡', kind: 'bp', bp: '海盜望遠鏡', price: 260, need: 3 },
  { name: '熔岩玻璃', kind: 'mat', n: 2, price: 70, need: 3 },
];

// ───────── 酒館的委託 ─────────
// kind：kill 擊退指定的敵人／bring 把素材交到酒館／survey 某座島的測繪度達到多少
// island：這座島開放以後，告示板上才會出現（bring 的話，是素材出產的島）
// side：勢力委託。完成時這個勢力的聲望 +rep，另一個勢力 −5
export const COMMISSIONS = [
  { id: '網', title: '咬破漁網的礁鼠', from: '漁市的老周', kind: 'kill', target: '礁鼠', n: 4, island: '低語礁', reward: { 銀貝: 35, 漂流木: 2 }, text: '漁網每天晚上都被咬破。聽說是低語礁那邊游過來的礁鼠。' },
  { id: '燈', title: '燈塔需要的燈芯', from: '燈塔港的守燈人', kind: 'bring', target: '燈芯', n: 3, island: '低語礁', reward: { 銀貝: 30, 圖紙: '燈芯鈴杖' }, text: '鹽灣島的燈快沒芯了。燈蛾的翅膀粉，捻起來就是最好的燈芯。' },
  { id: '鹽', title: '會說話的鹽', from: '雜貨店的阿秀', kind: 'bring', target: '鹽晶', n: 4, island: '低語礁', reward: { 銀貝: 40, 圖紙: '鹽晶墜子' }, text: '鹽靈留下來的鹽晶，泡在水裡，會聽見一句話。我想聽聽看。' },
  { id: '骨', title: '岸邊的骨頭', from: '巡夜的阿土', kind: 'kill', target: '漂流骨', n: 3, island: '低語礁', reward: { 銀貝: 40, 霧苔: 2 }, text: '晚上巡夜的時候，看見骨頭自己在沙灘上走。拜託你們去看看。' },
  { id: '圖一', title: '低語礁的海岸線', from: '酒館的鹽姨', kind: 'survey', island: '低語礁', n: 60, reward: { 銀貝: 50, 圖紙: '珊瑚甲' }, text: '把低語礁畫進書裡，至少六成。漁夫們要知道哪裡有礁石。' },
  { id: '珊', title: '紅色的珊瑚', from: '鐵匠的石伯', kind: 'bring', target: '珊瑚枝', n: 3, island: '低語礁', reward: { 銀貝: 30, 圖紙: '珊瑚刃' }, text: '我想試試看，用珊瑚磨一把刀。可是我老了，抓不到珊瑚獸。' },
  { id: '蝶', title: '偷走回憶的蝴蝶', from: '晨忘島的村長', kind: 'kill', target: '遺忘蝶', n: 4, island: '晨忘島', reward: { 銀貝: 60, 褪色羽: 2 }, text: '那些灰蝴蝶停過的人，連前天的事也想不起來了。' },
  { id: '鐘', title: '青銅的聲音', from: '鐵匠的石伯', kind: 'bring', target: '鐘銅', n: 3, island: '晨忘島', reward: { 銀貝: 50, 圖紙: '鐘銅筆' }, text: '晨忘島的青銅，敲起來會有早晨的聲音。我想聽一次。' },
  { id: '圖二', title: '晨忘島的地圖', from: '酒館的鹽姨', kind: 'survey', island: '晨忘島', n: 60, reward: { 銀貝: 80, 圖紙: '褪色羽飾' }, text: '晨忘島的人每天早上都會迷路。給他們一張地圖吧。' },
  { id: '雀', title: '吵死人的灰雀', from: '晨忘島的麵包師', kind: 'kill', target: '灰雀群', n: 3, island: '晨忘島', reward: { 銀貝: 55, 鹽晶: 2 }, text: '每天天沒亮就開始叫。叫完了，大家就忘了昨天。' },
  { id: '帆', title: '補帆的布', from: '船塢的大副', kind: 'bring', target: '船帆布', n: 3, island: '沉船灣', reward: { 銀貝: 60, 圖紙: '帆布大衣' }, text: '沉船灣那邊漂來的帆布，比我們織的還耐。' },
  { id: '魚', title: '沉船裡的刀魚', from: '漁市的老周', kind: 'kill', target: '鏽刃魚', n: 4, island: '沉船灣', reward: { 銀貝: 80, 鏽鐵: 2 }, text: '沉船灣的魚，鰭像刀。牠們把我的船底刮破了三次。' },
  { id: '圖三', title: '沉船灣的海圖', from: '酒館的鹽姨', kind: 'survey', island: '沉船灣', n: 60, reward: { 銀貝: 100, 圖紙: '夜光錨墜' }, text: '沉船灣的礁石，三年來吃掉了七艘船。畫下來，就不會有第八艘。' },
  // 第二海域
  { id: '帳', title: '吃帳本的蟲', from: '千帆市的帳房', kind: 'kill', target: '帳蟲', n: 4, island: '千帆市', reward: { 銀貝: 110, 帳紙: 2 }, text: '帳本又被吃掉了一頁。這個月的帳，對不起來了。' },
  { id: '贖', title: '贖回來的東西', from: '千帆市的賣花婆婆', kind: 'bring', target: '銀貝殼', n: 4, island: '千帆市', reward: { 銀貝: 90, 圖紙: '銀貝耳環' }, text: '我在當鋪當掉了一樣東西。我忘了是什麼，可是我想把它贖回來。' },
  { id: '圖四', title: '千帆市的水路', from: '酒館的鹽姨', kind: 'survey', island: '千帆市', n: 60, reward: { 銀貝: 130, 圖紙: '帳紙披風' }, text: '千帆市的船，每天都換位置綁。有一張水路圖，大家才不會迷路。' },
  { id: '鏡', title: '跟自己長得一樣的人', from: '雙影嶼的漁夫', kind: 'kill', target: '鏡中人', n: 3, island: '雙影嶼', reward: { 銀貝: 120, 鏡砂: 2 }, text: '昨天晚上，我在海邊遇到我自己。他對我笑。我不喜歡。' },
  { id: '繩', title: '測量員的繩子', from: '船塢的大副', kind: 'bring', target: '測繩', n: 3, island: '雙影嶼', reward: { 銀貝: 100, 圖紙: '測繩外套' }, text: '量船用的繩子斷了。雙影嶼的繩子，聽說一百年都不會鬆。' },
  { id: '圖五', title: '畫對的那座島', from: '雙影嶼的村長', kind: 'survey', island: '雙影嶼', n: 60, reward: { 銀貝: 150, 圖紙: '鏡砂琴' }, text: '請把我們的島畫對。這一次，畫在對的地方。' },
  { id: '蚌', title: '會哭的蚌', from: '潟湖的撈珠人', kind: 'kill', target: '珠蚌', n: 4, island: '珠母潟湖', reward: { 銀貝: 120, 珍珠: 2 }, text: '這些蚌越來越凶了。可是……我總覺得，牠們是在保護什麼。' },
  { id: '墨', title: '不褪色的墨', from: '鹽灣島的雜貨店阿秀', kind: 'bring', target: '墨魚墨', n: 4, island: '雙影嶼', reward: { 銀貝: 110, 圖紙: '墨魚墨瓶' }, text: '妳的書，用這種墨寫，一百年都不會褪色。我幫妳換一點好紙。' },
  { id: '圖六', title: '潟湖的水路', from: '酒館的鹽姨', kind: 'survey', island: '珠母潟湖', n: 60, reward: { 銀貝: 160, 圖紙: '珍珠鱗甲' }, text: '潮閘打開以後，潟湖的水路全都變了。要重新畫一次。' },
  { id: '印', title: '亂蓋章的兵', from: '帳房島的老書記', kind: 'kill', target: '印章兵', n: 4, island: '帳房島', reward: { 銀貝: 150, 閘石: 2 }, text: '那些印章兵，連海鷗都蓋了章。海鷗現在是商會的財產了。' },
  { id: '白', title: '白色的珊瑚', from: '鐵匠的石伯', kind: 'bring', target: '白珊瑚', n: 3, island: '帳房島', reward: { 銀貝: 140, 圖紙: '白珊瑚戒' }, text: '那種白珊瑚，我只在書上看過。帶幾枝回來，讓我這把老骨頭開開眼界。' },
  { id: '圖七', title: '帳房島的真正地圖', from: '天文台的老人', kind: 'survey', island: '帳房島', n: 60, reward: { 銀貝: 200, 圖紙: '白頁筆' }, text: '商會的地圖上，帳房島只有一座塔。我想看看，塔以外的地方長什麼樣子。' },
  // 第三海域
  { id: '鴉', title: '偷東西的灰鴉', from: '紅帆港的帆匠', kind: 'kill', target: '灰鴉', n: 4, island: '紅帆港', side: '紅帆', rep: 10, reward: { 銀貝: 170, 紅赭土: 2 }, text: '那些灰鴉把我的針全叼走了。沒有針，帆補不起來。' },
  { id: '旗', title: '舊帆的名字', from: '紅帆港的帆匠', kind: 'bring', target: '舊帆布', n: 4, island: '紅帆港', side: '紅帆', rep: 10, reward: { 銀貝: 160, 圖紙: '舊帆布外套' }, text: '退下來的帆，我要一面一面拆開來，把上面的名字縫到新帆上。' },
  { id: '圖八', title: '紅帆港的水道', from: '酒館的鹽姨', kind: 'survey', island: '紅帆港', n: 60, reward: { 銀貝: 220, 圖紙: '錨鏈斧' }, text: '火山口裡的水道彎彎曲曲。紅帆的人說，他們從來不畫地圖。……可是他們偷偷問我，有沒有人畫過。' },
  { id: '查', title: '商會的查帳', from: '商會的巡查員', kind: 'kill', target: '火藥蟹', n: 4, island: '紅帆港', side: '商會', rep: 10, reward: { 銀貝: 180, 火藥: 2 }, text: '紅帆私藏火藥，商會要查。那些背著火藥桶的螃蟹，先處理掉。' },
  { id: '牌', title: '沒有拿回來的牌子', from: '鐵喉礦坑的老礦工', kind: 'bring', target: '礦工牌', n: 4, island: '鐵喉礦坑', reward: { 銀貝: 180, 圖紙: '礦工牌項鍊' }, text: '坑口的牌子，少了二十三塊。那是三十年前那天，沒有出來的人。' },
  { id: '鼠', title: '知道哪裡會塌的老鼠', from: '鐵喉礦坑的工頭', kind: 'kill', target: '鐵喉鼠', n: 4, island: '鐵喉礦坑', side: '商會', rep: 10, reward: { 銀貝: 190, 鐵礦: 2 }, text: '商會的礦場要開新坑道。那些老鼠一直在咬支架。' },
  { id: '圖九', title: '鐵喉礦坑的坑道圖', from: '天文台的老人', kind: 'survey', island: '鐵喉礦坑', n: 60, reward: { 銀貝: 230, 圖紙: '礦工皮甲' }, text: '坑道圖在商會手上，可是他們只畫了有礦的地方。沒有礦的坑道，就沒有人記得。' },
  { id: '炭', title: '不冒煙的炭', from: '鐵匠的石伯', kind: 'bring', target: '炭', n: 4, island: '鍛火嶼', reward: { 銀貝: 170, 圖紙: '炭火戒' }, text: '鍛火嶼的炭，聽說燒起來一點煙都沒有。我打了一輩子鐵，還沒用過。' },
  { id: '花', title: '濺出來的火花', from: '鍛火嶼的顧爐人', kind: 'kill', target: '火花精', n: 4, island: '鍛火嶼', side: '紅帆', rep: 10, reward: { 銀貝: 190, 硫磺: 2 }, text: '火花一直往外跑，燒掉了紅帆寄放在這裡的帆。幫我們抓回來。' },
  { id: '圖十', title: '鍛火嶼的地圖', from: '酒館的鹽姨', kind: 'survey', island: '鍛火嶼', n: 60, reward: { 銀貝: 240, 圖紙: '熔岩鱗甲' }, text: '島上的人輪流顧爐，可是沒有人畫過爐以外的地方。' },
  { id: '號', title: '要塞的巡邏', from: '紅帆的老水手', kind: 'kill', target: '號碼兵', n: 4, island: '紅岬', side: '紅帆', rep: 10, reward: { 銀貝: 220, 礦工牌: 2 }, text: '那些號碼兵每天晚上沿著海岸巡邏。他們以前，都是紅岬的人。' },
  { id: '赭', title: '紅色的土', from: '商會的染坊', kind: 'bring', target: '紅赭土', n: 5, island: '紅帆港', side: '商會', rep: 10, reward: { 銀貝: 200, 圖紙: '紅帆琴' }, text: '商會想做紅帆布來賣。……不要跟海盜說是我們買的。' },
  { id: '圖十一', title: '紅岬的舊名字', from: '葛蘿', kind: 'survey', island: '紅岬', n: 60, reward: { 銀貝: 300, 圖紙: '熔岩斧' }, text: '把紅岬畫進書裡。不是商會的第七號——是我們的島。' },
];
