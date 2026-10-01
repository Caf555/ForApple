// 遊戲資料：角色、技能、敵人、道具、配方、史卷……
// 數值依據：文字RPG企劃/設定集/04_系統數值.md

export const ELEMENTS = ['金', '木', '水', '火', '土', '陰', '陽', '無'];

// 相剋：key 剋 value
export const OVERCOME = { 金: '木', 木: '土', 土: '水', 水: '火', 火: '金' };
// 相生：key 生 value
export const GENERATE = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' };

export function elementMult(atk, def) {
  if (!atk || atk === '無' || !def || def === '無') return 1;
  if ((atk === '陰' && def === '陽') || (atk === '陽' && def === '陰')) return 1.3;
  if (atk === def) return 0.8;
  if (OVERCOME[atk] === def) return 1.5;
  if (OVERCOME[def] === atk) return 0.7;
  return 1;
}

export const STAT_NAMES = { hp: '體', mp: '墨', atk: '力', def: '守', mag: '神', res: '定', spd: '疾', luk: '緣' };

// ───────── 角色 ─────────
export const CHARACTERS = {
  知墨: {
    title: '補史人', element: '水', weapon: '裁紙刀', charm: null,
    base: { hp: 60, mp: 20, atk: 10, def: 9, mag: 10, res: 9, spd: 10, luk: 10 },
    growth: { hp: 9, mp: 3, atk: 2.0, def: 1.8, mag: 2.0, res: 1.8, spd: 1.5, luk: 1.0 },
    skills: [[1, '墨刃'], [3, '補字'], [6, '濃墨']],
    desc: '臺南的古籍修復師。安靜、耐心，習慣對舊書說話。',
  },
  蘅: {
    title: '硯中器靈', element: '水', weapon: '墨絲', charm: null,
    base: { hp: 45, mp: 35, atk: 6, def: 7, mag: 14, res: 12, spd: 12, luk: 12 },
    growth: { hp: 6, mp: 5, atk: 1.0, def: 1.3, mag: 2.8, res: 2.2, spd: 1.8, luk: 1.2 },
    skills: [[1, '墨愈'], [1, '洞察'], [3, '寒墨'], [5, '潮息']],
    desc: '從千秋硯中醒來的少女。好奇、愛吐槽，偶爾說出不屬於任何時代的詞。',
  },
  蒂娃: {
    title: '新港社的少女', element: '木', weapon: '竹彈弓', charm: null,
    base: { hp: 50, mp: 15, atk: 11, def: 7, mag: 8, res: 8, spd: 15, luk: 11 },
    growth: { hp: 7, mp: 2, atk: 2.2, def: 1.4, mag: 1.4, res: 1.5, spd: 2.4, luk: 1.3 },
    skills: [[1, '連射'], [3, '竹哨'], [5, '風中石']],
    desc: '西拉雅族的少女，跟著傳教士學用羅馬字書寫自己的語言。（「蒂娃」為暫定名）',
  },
  楊: {
    title: '公司的通譯', element: '金', weapon: '短火繩槍', charm: null,
    base: { hp: 55, mp: 18, atk: 13, def: 8, mag: 9, res: 8, spd: 8, luk: 9 },
    growth: { hp: 8, mp: 2.5, atk: 2.4, def: 1.6, mag: 1.5, res: 1.4, spd: 1.2, luk: 0.9 },
    skills: [[1, '齊射'], [3, '雙語號令']],
    desc: '楊・范登堡。荷蘭東印度公司的年輕通譯，真心喜歡西拉雅語。',
  },
  阿順: {
    title: '赤崁的佃農', element: '土', weapon: '扁擔', charm: null,
    base: { hp: 75, mp: 10, atk: 12, def: 12, mag: 5, res: 8, spd: 7, luk: 10 },
    growth: { hp: 11, mp: 1.5, atk: 2.2, def: 2.4, mag: 0.8, res: 1.6, spd: 1.0, luk: 1.2 },
    skills: [[1, '扁擔掃'], [1, '硬頸'], [1, '甘蔗汁']],
    desc: '陳阿順。從福建渡海來臺的漢人佃農，在赤崁種甘蔗。老實、愛說笑。',
  },
  石頭: {
    title: '鄭軍的藤牌兵', element: '火', weapon: '藤牌刀', charm: null,
    base: { hp: 58, mp: 12, atk: 14, def: 9, mag: 6, res: 7, spd: 12, luk: 8 },
    growth: { hp: 8, mp: 2, atk: 2.6, def: 1.6, mag: 1.0, res: 1.3, spd: 1.9, luk: 1.1 },
    skills: [[1, '藤牌衝'], [1, '滾刀'], [12, '死守']],
    desc: '鄭軍中十八歲的金門籍小兵。沒見過世面，暈船暈得很厲害，笑起來有一顆虎牙。',
  },
  潮歌: {
    title: '墨靈', element: '水', weapon: null, charm: null, spirit: true,
    base: { hp: 70, mp: 30, atk: 9, def: 10, mag: 13, res: 12, spd: 11, luk: 8 },
    growth: { hp: 8, mp: 3, atk: 1.5, def: 1.8, mag: 2.3, res: 2.0, spd: 1.5, luk: 1.0 },
    skills: [[1, '潮音'], [1, '墨愈']],
    desc: '由失去聲音的妖物煉成的墨靈。偶爾會哼出一段沒有歌詞的旋律。',
  },

  // 卷二〈牧野〉
  妌: {
    title: '貞人之女', element: '火', weapon: '契刀', charm: null,
    base: { hp: 48, mp: 30, atk: 9, def: 7, mag: 14, res: 11, spd: 12, luk: 11 },
    growth: { hp: 6.5, mp: 4.5, atk: 1.2, def: 1.3, mag: 2.7, res: 2.1, spd: 1.8, luk: 1.2 },
    skills: [[1, '灼骨'], [1, '契刻'], [17, '烈兆']],
    desc: '貞人箙的女兒。每天整治龜甲牛骨，偷偷在碎骨上練習刻字。問題很多。（「妌」為暫定名）',
  },
  十七: {
    title: '羌人少年', element: '土', weapon: '牧杖', charm: null,
    base: { hp: 62, mp: 12, atk: 14, def: 10, mag: 5, res: 8, spd: 13, luk: 9 },
    growth: { hp: 8.5, mp: 2, atk: 2.5, def: 1.7, mag: 0.9, res: 1.4, spd: 1.9, luk: 1.1 },
    skills: [[1, '杖擊'], [1, '投石'], [1, '山歌']],
    desc: '被關在大邑商城西的羌人少年。商人只用數字叫他。笑起來有一顆虎牙。',
  },
  // 不會加入隊伍的角色：只用來記錄羈絆（論辯的「共感」會用到）
  箙: {
    title: '王室的貞人', element: '火', weapon: null, charm: null, npc: true,
    base: { hp: 40, mp: 20, atk: 6, def: 6, mag: 10, res: 10, spd: 8, luk: 8 },
    growth: { hp: 5, mp: 3, atk: 1, def: 1, mag: 2, res: 2, spd: 1, luk: 1 },
    skills: [],
    desc: '妌的父親，替王問卜的人。溫和、謹慎，刻字的手很穩。',
  },
};

// ───────── 技能 ─────────
// type: phy 物理 / mag 術法 / heal 治療 / buff 增益 / debuff 減益 / cure 解除
// target: enemy / enemies / ally / allies / self
export const SKILLS = {
  墨刃: { cost: 4, type: 'mag', target: 'enemy', power: 18, element: '水', desc: '以墨凝成薄刃，水屬性術法攻擊。' },
  補字: { cost: 5, type: 'cure', target: 'ally', power: 20, cures: ['褪色', '失語'], desc: '替隊友補回被抹去的字，解除褪色與失語並少量回復。' },
  濃墨: { cost: 9, type: 'mag', target: 'enemy', power: 40, element: '水', desc: '研出最濃的一筆，強力水屬性攻擊。' },
  雙語對照: { cost: 6, type: 'debuff', target: 'enemy', status: '迷惘', chance: 0.65, desc: '【大員法統】同時說出兩種語言，使敵人迷惘。' },
  牽星: { cost: 6, type: 'buff', target: 'allies', buff: { stat: 'acc', mult: 1.2, turns: 3 }, desc: '【大員法統】依星位定向，全隊攻擊更準。' },
  灼骨問卜: { cost: 6, type: 'debuff', target: 'enemy', omen: true, buff: { stat: 'acc', mult: 0.85, turns: 2 }, desc: '【牧野法統】在骨上灼出裂紋，讀出敵人下一次的行動（招式與目標），並使其命中下降。' },

  灼骨: { cost: 5, type: 'mag', target: 'enemy', power: 26, element: '火', desc: '把燒紅的木枝按進骨上的凹槽。火屬性術法攻擊。' },
  契刻: { cost: 4, type: 'phy', target: 'enemy', power: 1.2, element: '金', buff: { stat: 'def', mult: 0.8, turns: 3 }, desc: '用青銅契刀刻下去，金屬性攻擊，並降低敵人的守與定。' },
  烈兆: { cost: 10, type: 'mag', target: 'enemies', power: 16, element: '火', desc: '整片卜骨同時爆出裂紋。火屬性全體攻擊。' },

  杖擊: { cost: 4, type: 'phy', target: 'enemy', power: 1.5, element: '土', desc: '趕羊用的木杖，打下去很沉。土屬性強力一擊。' },
  投石: { cost: 5, type: 'phy', target: 'enemy', power: 0.7, hits: 2, element: '土', desc: '山上的孩子都會丟石頭趕狼。連續投出兩顆。' },
  山歌: { cost: 6, type: 'buff', target: 'allies', buff: { stat: 'res', mult: 1.35, turns: 3 }, desc: '一首沒有人聽得懂的山歌。全隊的定提升。' },

  墨愈: { cost: 5, type: 'heal', target: 'ally', power: 30, desc: '以溫潤的墨色撫平傷口。' },
  洞察: { cost: 4, type: 'debuff', target: 'enemy', buff: { stat: 'def', mult: 0.75, turns: 3 }, desc: '看穿敵人的破綻，降低其守與定。' },
  寒墨: { cost: 8, type: 'mag', target: 'enemies', power: 14, element: '水', desc: '冰冷的墨雨，水屬性全體攻擊。' },
  潮息: { cost: 12, type: 'heal', target: 'allies', power: 28, desc: '像潮水一樣的呼吸，全隊回復。' },

  連射: { cost: 4, type: 'phy', target: 'enemy', power: 0.65, hits: 2, element: '木', desc: '連續射出兩顆石子。' },
  竹哨: { cost: 6, type: 'buff', target: 'allies', buff: { stat: 'spd', mult: 1.25, turns: 3 }, desc: '吹響竹哨，全隊疾提升。' },
  風中石: { cost: 7, type: 'phy', target: 'enemy', power: 1.6, element: '木', desc: '順著風勢射出，木屬性強力一擊。' },

  齊射: { cost: 5, type: 'phy', target: 'enemies', power: 0.8, element: '金', desc: '火繩槍的轟鳴，金屬性全體攻擊。' },
  雙語號令: { cost: 6, type: 'buff', target: 'allies', buff: { stat: 'atk', mult: 1.2, turns: 3 }, desc: '用兩種語言喊出號令，全隊力提升。' },

  扁擔掃: { cost: 5, type: 'phy', target: 'enemies', power: 0.75, element: '土', desc: '掄起扁擔橫掃，土屬性全體攻擊。' },
  硬頸: { cost: 4, type: 'buff', target: 'self', buff: { stat: 'def', mult: 1.6, turns: 3 }, desc: '「做田人的頸，硬啦！」自身守大幅提升。' },
  甘蔗汁: { cost: 3, type: 'heal', target: 'ally', power: 22, desc: '從懷裡掏出一截甘蔗，讓隊友解渴。' },

  藤牌衝: { cost: 4, type: 'phy', target: 'enemy', power: 1.5, element: '火', desc: '舉著藤牌猛衝，火屬性強力一擊。' },
  滾刀: { cost: 6, type: 'phy', target: 'enemies', power: 0.8, element: '火', desc: '藤牌兵的看家本領：伏低身子滾進敵陣，揮刀橫掃。' },
  死守: { cost: 5, type: 'buff', target: 'self', buff: { stat: 'def', mult: 1.8, turns: 3 }, desc: '「阿母說，要活著回去。」自身守大幅提升。' },

  潮音: { cost: 6, type: 'mag', target: 'enemies', power: 12, element: '水', status: '迷惘', chance: 0.25, desc: '無字的歌聲，水屬性全體攻擊，可能使敵人迷惘。' },

  // 敵人技能
  抹字: { cost: 0, type: 'mag', target: 'enemy', power: 8, element: '陰', status: '褪色', chance: 0.4, desc: '白色的筆刷抹過，使對象褪色。' },
  瘴氣: { cost: 0, type: 'mag', target: 'enemies', power: 5, element: '木', status: '瘴毒', chance: 0.35, desc: '濕熱的霧氣。' },
  刺擊: { cost: 0, type: 'phy', target: 'enemy', power: 1.3, element: '木', desc: '竹刺猛然刺出。' },
  硬殼: { cost: 0, type: 'buff', target: 'self', buff: { stat: 'def', mult: 1.5, turns: 3 }, desc: '縮進硬殼裡。' },
  夾擊: { cost: 0, type: 'phy', target: 'enemy', power: 1.2, element: '水', status: '定身', chance: 0.2, desc: '巨螯一夾。' },
  吞聲: { cost: 0, type: 'debuff', target: 'enemies', status: '失語', chance: 0.5, desc: '把聲音吞進肚子裡。' },
  沉默之潮: { cost: 0, type: 'mag', target: 'enemies', power: 16, element: '陰', status: '失語', chance: 0.35, desc: '無聲的潮水漫過所有人。' },
  回聲: { cost: 0, type: 'heal', target: 'self', power: 45, desc: '吞下的聲音在體內回響，回復自身。' },
  燎原: { cost: 0, type: 'mag', target: 'enemies', power: 14, element: '火', desc: '火舌沿著乾枯的蔗葉蔓延開來。' },
  重壓: { cost: 0, type: 'phy', target: 'enemy', power: 1.6, element: '土', status: '定身', chance: 0.3, desc: '沉重的稻草身軀壓了下來。' },
  怨氣: { cost: 0, type: 'mag', target: 'enemies', power: 12, element: '土', status: '迷惘', chance: 0.3, desc: '「稅、稅、稅……」低沉的怨聲在田間迴盪。' },
  收割: { cost: 0, type: 'phy', target: 'enemies', power: 0.85, element: '金', desc: '鐮刀般的手臂掃過一整排。' },
  海嘯: { cost: 0, type: 'mag', target: 'enemies', power: 18, element: '水', desc: '整片海站了起來。' },
  吞舟: { cost: 0, type: 'phy', target: 'enemy', power: 1.9, element: '水', desc: '巨口一張，要把船連人吞下。' },
  潮汐: { cost: 0, type: 'heal', target: 'self', power: 70, desc: '潮水退去又湧回，傷口隨之癒合。' },
  爆裂: { cost: 0, type: 'mag', target: 'enemies', power: 20, element: '火', desc: '火藥庫轟然炸開。' },
  纏帆: { cost: 0, type: 'debuff', target: 'enemies', buff: { stat: 'spd', mult: 0.75, turns: 3 }, desc: '破爛的船帆纏住了手腳。' },
  白筆: { cost: 0, type: 'mag', target: 'enemies', power: 22, element: '陰', status: '褪色', chance: 0.35, desc: '白色的筆輕輕一劃，所有人的字都淡了。' },
  溫柔的過渡: { cost: 0, type: 'debuff', target: 'enemies', buff: { stat: 'atk', mult: 0.75, turns: 3 }, desc: '「不必再記得了。」全體的力下降。' },
  塗改: { cost: 0, type: 'heal', target: 'self', power: 110, desc: '把自己身上的傷，也一併「擦掉」。' },
  疫氣: { cost: 0, type: 'mag', target: 'enemies', power: 13, element: '木', status: '瘴毒', chance: 0.45, desc: '被圍困的城裡，病從井邊蔓延開來。' },
  啃噬: { cost: 0, type: 'phy', target: 'enemy', power: 1.5, element: '土', desc: '餓了太久的東西，什麼都咬。' },
  追問: { cost: 0, type: 'mag', target: 'enemy', power: 14, element: '陰', status: '迷惘', chance: 0.3, desc: '「你真的記得嗎？」' },
  灼燒: { cost: 0, type: 'mag', target: 'enemies', power: 16, element: '火', desc: '骨頭裂開的聲音，像乾柴爆開。' },
  凶兆: { cost: 0, type: 'debuff', target: 'enemies', buff: { stat: 'atk', mult: 0.8, turns: 3 }, desc: '「大凶。」全體的力下降。' },
  裂骨: { cost: 0, type: 'phy', target: 'enemy', power: 1.7, element: '土', status: '定身', chance: 0.25, desc: '一道裂紋從腳下竄上來。' },
  蛀蝕: { cost: 0, type: 'phy', target: 'enemy', power: 1.2, element: '土', status: '褪色', chance: 0.3, desc: '專挑有字的地方咬。' },
  泥沼: { cost: 0, type: 'debuff', target: 'enemies', buff: { stat: 'spd', mult: 0.75, turns: 3 }, desc: '河岸的爛泥纏住了腳。' },
  無字: { cost: 0, type: 'mag', target: 'enemies', power: 18, element: '陰', status: '失語', chance: 0.3, desc: '「我身上本來有字的。你們的，給我。」' },
  熔銅: { cost: 0, type: 'mag', target: 'enemies', power: 17, element: '火', desc: '陶範的裂縫裡，流出燒紅的銅水。' },
  夜啼: { cost: 0, type: 'mag', target: 'enemies', power: 12, element: '陰', status: '迷惘', chance: 0.35, desc: '一聲低低的鴞啼，讓人分不清方向。' },
  吞噬: { cost: 0, type: 'phy', target: 'enemy', power: 1.8, element: '金', desc: '獸面的大口張開。' },
  貪食: { cost: 0, type: 'heal', target: 'self', power: 120, desc: '它把四周的「理由」吃了下去。' },
  威壓: { cost: 0, type: 'debuff', target: 'enemies', buff: { stat: 'def', mult: 0.8, turns: 3 }, desc: '「為了先王。為了天命。」全體的守下降。' },
};

// ───────── 合擊技 ─────────
export const COMBOS = {
  墨潮: { members: ['知墨', '蘅'], bond: 2, cost: 8, type: 'mag', target: 'enemies', power: 34, element: '水', cures: true, desc: '知墨研墨、蘅引潮，水屬性全體攻擊並解除我方異常。' },
  牽星一箭: { members: ['蒂娃', '蘅'], bond: 2, cost: 6, type: 'phy', target: 'enemy', power: 2.4, element: '木', crit: true, desc: '蘅指出星位，蒂娃一發命中，必定暴擊。' },
  田埂上的約定: { members: ['阿順', '知墨'], bond: 2, cost: 6, type: 'buff', target: 'allies', buff: { stat: 'def', mult: 1.6, turns: 2 }, desc: '阿順擋在最前面、知墨在後面研墨，全隊守大幅提升兩回合。' },
  破浪: { members: ['石頭', '知墨'], bond: 2, cost: 7, type: 'phy', target: 'enemies', power: 1.25, element: '火', desc: '知墨以墨分開浪頭，石頭舉牌衝過去，火屬性全體攻擊。' },
  雙語之盾: { members: ['楊', '蒂娃'], bond: 2, cost: 8, type: 'buff', target: 'allies', buff: { stat: 'res', mult: 2, turns: 2 }, desc: '兩種語言交織成盾，全隊術法傷害減半。' },
  灼骨問天: { members: ['知墨', '妌'], bond: 2, cost: 8, type: 'mag', target: 'enemies', power: 32, element: '火', desc: '知墨以時墨畫出凹槽，妌灼骨，裂紋化成火網。火屬性全體攻擊。' },
  山與火: { members: ['十七', '妌'], bond: 1, cost: 6, type: 'phy', target: 'enemy', power: 2.2, element: '土', crit: true, desc: '妌讀出破綻，十七一杖打下去。必定暴擊。' },
};

// ───────── 陣法 ─────────
export const FORMATIONS = {
  一字陣: { desc: '並肩而立，沒有加成也沒有弱點。', mods: {} },
  鋒矢陣: { desc: '全隊力 +15%，守 −10%。', mods: { atk: 1.15, def: 0.9 } },
  方圓陣: { desc: '全隊守、定 +15%，力 −10%。', mods: { def: 1.15, res: 1.15, atk: 0.9 } },
  雁行陣: { desc: '全隊疾 +10%，首回合必定先攻。', mods: { spd: 1.1 }, firstStrike: true },
};

// ───────── 異常狀態 ─────────
export const STATUSES = {
  褪色: { turns: 3, desc: '無法使用術法' },
  失語: { turns: 3, desc: '無法使用合擊' },
  迷惘: { turns: 2, desc: '可能攻擊錯誤的目標' },
  瘴毒: { turns: 5, desc: '每回合損失體' },
  定身: { turns: 1, desc: '無法行動' },
};

// ───────── 敵人 ─────────
// rank: 一般 / 精英 / 首領
export const ENEMIES = {
  褪墨鬼: { element: '陰', rank: '一般', lv: 1, hp: 38, atk: 9, def: 5, mag: 9, res: 5, spd: 8, luk: 5, exp: 8, money: 6,
    skills: [['攻擊', 3], ['抹字', 1]], drops: [['舊紙', 0.5]], desc: '被蝕吃掉的記憶殘片，形狀像一團會走路的灰色墨漬。' },
  瘴霧: { element: '木', rank: '一般', lv: 2, hp: 34, atk: 7, def: 4, mag: 11, res: 8, spd: 9, luk: 5, exp: 10, money: 5,
    skills: [['攻擊', 2], ['瘴氣', 2]], drops: [['薑', 0.4], ['草藥', 0.2]], desc: '人們對瘧疾與疫病的恐懼凝成的霧，在溼熱的黃昏裡特別濃。' },
  刺竹影: { element: '木', rank: '一般', lv: 3, hp: 52, atk: 13, def: 8, mag: 5, res: 5, spd: 10, luk: 6, exp: 13, money: 8,
    skills: [['攻擊', 2], ['刺擊', 2]], drops: [['竹片', 0.5]], desc: '社外刺竹林的影子。刺竹原本是守護聚落的圍籬，被蝕扭曲後開始攻擊所有外人。' },
  沙洲蟹魅: { element: '水', rank: '一般', lv: 4, hp: 64, atk: 12, def: 14, mag: 6, res: 8, spd: 6, luk: 6, exp: 16, money: 10,
    skills: [['攻擊', 2], ['夾擊', 2], ['硬殼', 1]], drops: [['貝殼', 0.5]], desc: '大員沙洲上被蝕附身的巨蟹。守很高，用術法對付比較有效。' },
  褪聲鬼: { element: '陰', rank: '精英', lv: 5, hp: 240, atk: 14, def: 9, mag: 16, res: 10, spd: 11, luk: 8, exp: 60, money: 40,
    skills: [['攻擊', 2], ['抹字', 2], ['吞聲', 1]], drops: [['舊紙', 1]], desc: '吃掉了一首歌後半段的褪墨鬼。肚子裡隱約傳來斷斷續續的旋律。' },
  稻草人偶: { element: '土', rank: '一般', lv: 8, hp: 95, atk: 18, def: 13, mag: 8, res: 8, spd: 9, luk: 6, exp: 26, money: 14,
    skills: [['攻擊', 3], ['重壓', 1]], drops: [['甘蔗', 0.4]], desc: '甘蔗田裡的稻草人被佃農的疲憊與怨氣附身。它們不斷重複同一個動作：彎腰、揮刀、彎腰、揮刀。' },
  火舌: { element: '火', rank: '一般', lv: 9, hp: 72, atk: 12, def: 8, mag: 20, res: 12, spd: 15, luk: 8, exp: 28, money: 12,
    skills: [['攻擊', 2], ['燎原', 2]], drops: [['黑糖', 0.3]], desc: '人們對大火的恐懼所化。乾季的蔗田最怕火，一點火星就能燒掉一整年的收成。用水克制它。' },
  生鏽的火繩槍兵: { element: '金', rank: '一般', lv: 9, hp: 88, atk: 21, def: 15, mag: 6, res: 7, spd: 7, luk: 6, exp: 30, money: 18,
    skills: [['攻擊', 2], ['齊射', 1]], drops: [['鐵片', 0.4]], desc: '戰死者的執念。它記得自己奉命開槍，卻已經不記得為了什麼。' },
  怨火: { element: '火', rank: '精英', lv: 10, hp: 330, atk: 18, def: 11, mag: 23, res: 14, spd: 14, luk: 10, exp: 90, money: 60,
    skills: [['攻擊', 2], ['燎原', 3], ['抹字', 1]], drops: [['黑糖', 1]], desc: '被逼到絕路的人心裡燒起來的火。它不分敵我，燒掉眼前的一切。' },
  稻草人偶王: { element: '土', rank: '首領', lv: 12, hp: 780, atk: 24, def: 16, mag: 17, res: 14, spd: 10, luk: 10, exp: 280, money: 150,
    skills: [['攻擊', 2], ['重壓', 2], ['怨氣', 2], ['收割', 2]], drops: [], desc: '整片甘蔗田的怨氣聚成的巨大人偶。它身上綁滿了寫著名字的木牌——是那些付不出人頭稅的人。' },
  潮魅: { element: '水', rank: '一般', lv: 10, hp: 105, atk: 17, def: 12, mag: 20, res: 15, spd: 13, luk: 8, exp: 34, money: 16,
    skills: [['攻擊', 2], ['海嘯', 1]], drops: [['貝殼', 0.5]], desc: '渡過黑水溝的人們對海的恐懼所化。每一道浪裡，都有一張沒能上岸的臉。' },
  破帆鬼: { element: '木', rank: '一般', lv: 10, hp: 115, atk: 20, def: 13, mag: 10, res: 10, spd: 10, luk: 6, exp: 34, money: 18,
    skills: [['攻擊', 2], ['纏帆', 1]], drops: [['竹片', 0.4]], desc: '沉船的船帆與桅杆糾纏成形。它還在找回家的風。' },
  火藥精: { element: '火', rank: '一般', lv: 11, hp: 80, atk: 14, def: 9, mag: 24, res: 12, spd: 16, luk: 9, exp: 36, money: 20,
    skills: [['攻擊', 1], ['爆裂', 2]], drops: [['鐵片', 0.4]], desc: '戰船上的火藥桶裡鑽出來的東西。一碰就炸。' },
  赫克托之火: { element: '火', rank: '精英', lv: 12, hp: 360, atk: 20, def: 13, mag: 26, res: 15, spd: 15, luk: 10, exp: 120, money: 80,
    skills: [['攻擊', 1], ['爆裂', 3], ['纏帆', 1]], drops: [['鐵片', 1]], desc: '海戰中爆炸沉沒的荷蘭戰船「赫克托號」上，數百人最後的驚恐所化。' },
  海翁之影: { element: '水', rank: '首領', lv: 14, hp: 1150, atk: 26, def: 17, mag: 25, res: 18, spd: 11, luk: 10, exp: 380, money: 200,
    skills: [['攻擊', 2], ['海嘯', 2], ['吞舟', 2], ['潮汐', 1]], drops: [], desc: '海翁，就是鯨。大航海時代，人們把對海洋一切的敬畏與恐懼，都投射在這片黑色的巨影上。它不恨誰，它只是太大了。' },
  疫鬼: { element: '木', rank: '一般', lv: 12, hp: 120, atk: 17, def: 13, mag: 25, res: 16, spd: 13, luk: 8, exp: 42, money: 20,
    skills: [['攻擊', 1], ['疫氣', 2]], drops: [['草藥', 0.5]], desc: '被圍了好幾個月的城裡，井水發臭、人們腳腫、牙齦流血。疫病的恐懼在夜裡遊蕩。' },
  飢影: { element: '土', rank: '一般', lv: 12, hp: 140, atk: 24, def: 15, mag: 8, res: 11, spd: 11, luk: 8, exp: 42, money: 22,
    skills: [['攻擊', 2], ['啃噬', 2]], drops: [['麻糬', 0.3]], desc: '城外的人缺糧，城裡的人也缺糧。飢餓不分陣營。' },
  城砲殘魂: { element: '金', rank: '一般', lv: 13, hp: 130, atk: 26, def: 19, mag: 8, res: 9, spd: 8, luk: 6, exp: 45, money: 26,
    skills: [['攻擊', 2], ['齊射', 1]], drops: [['鐵片', 0.5]], desc: '日夜轟擊的大砲，砲口裡塞滿了開砲的人的名字。' },
  '無面書記・大員之相': { element: '陰', rank: '首領', lv: 16, hp: 1500, atk: 27, def: 18, mag: 30, res: 20, spd: 14, luk: 12, exp: 520, money: 300,
    skills: [['攻擊', 1], ['白筆', 3], ['追問', 2], ['溫柔的過渡', 1], ['塗改', 1]], drops: [], desc: '無面書記在大員留下的「一面」。它穿著公司的文官服，手上的白筆曾經抹去過無數名字。擊敗它，不代表擊敗了無面書記本身。' },
  失語之影: { element: '陰', rank: '首領', lv: 8, hp: 480, atk: 18, def: 12, mag: 21, res: 13, spd: 12, luk: 10, exp: 150, money: 90,
    skills: [['攻擊', 2], ['沉默之潮', 2], ['追問', 2], ['回聲', 1]], drops: [], desc: '因失去語言而生的影子。它不是誰的仇人，只是一個再也說不出話的聲音。' },

  // 卷二〈牧野〉
  裂兆: { element: '火', rank: '一般', lv: 15, hp: 150, atk: 20, def: 13, mag: 26, res: 15, spd: 14, luk: 8, exp: 48, money: 22,
    skills: [['攻擊', 2], ['灼燒', 2]], drops: [['牛骨', 0.4]], desc: '灼燒卜骨時爆開的裂紋。每一道裂紋，都是有人在等一個答案時的心跳。' },
  骨蠹: { element: '土', rank: '一般', lv: 15, hp: 175, atk: 25, def: 19, mag: 8, res: 10, spd: 9, luk: 7, exp: 50, money: 24,
    skills: [['攻擊', 3], ['蛀蝕', 2]], drops: [['龜甲', 0.35]], desc: '在窖穴裡啃食甲骨的蟲。被蝕附身之後，專挑有字的地方咬。' },
  洹水瘴: { element: '水', rank: '一般', lv: 16, hp: 145, atk: 16, def: 12, mag: 27, res: 18, spd: 15, luk: 8, exp: 52, money: 22,
    skills: [['攻擊', 2], ['泥沼', 1], ['瘴氣', 1]], drops: [['草藥', 0.3]], desc: '洹水岸邊的濕霧。人們把對河水氾濫的恐懼，都沉在這片霧裡。' },
  銅鏽兵: { element: '金', rank: '一般', lv: 16, hp: 180, atk: 27, def: 20, mag: 8, res: 10, spd: 10, luk: 6, exp: 55, money: 30,
    skills: [['攻擊', 3], ['收割', 1]], drops: [['青銅碎片', 0.4]], desc: '王城守衛的執念，手上的青銅戈長滿了綠鏽。它只記得「守」，不記得守的是什麼。' },
  無字骨: { element: '陰', rank: '精英', lv: 17, hp: 480, atk: 22, def: 15, mag: 29, res: 20, spd: 14, luk: 10, exp: 150, money: 90,
    skills: [['攻擊', 1], ['無字', 2], ['抹字', 1]], drops: [['龜甲', 1]], desc: '字被擦乾淨的卜骨。它記得自己曾經被刻過什麼，卻想不起來是什麼，所以不停地向四周索討文字。' },
  兆魘: { element: '火', rank: '首領', lv: 18, hp: 1300, atk: 28, def: 18, mag: 31, res: 20, spd: 15, luk: 12, exp: 560, money: 320,
    skills: [['攻擊', 2], ['灼燒', 2], ['凶兆', 1], ['裂骨', 2]], drops: [['朱砂', 1]], desc: '等待占卜結果的人心裡，最深的那一份恐懼。它不在乎兆紋說了什麼，它只知道：總有人要付出代價。' },
  夯土傀: { element: '土', rank: '一般', lv: 16, hp: 200, atk: 27, def: 22, mag: 6, res: 10, spd: 8, luk: 6, exp: 56, money: 26,
    skills: [['攻擊', 3], ['重壓', 1]], drops: [['黍餅', 0.25]], desc: '夯土台上一下一下打夯的聲音，聚成了這個土偶。它不知道自己在蓋什麼，只知道不能停。' },
  陶範魅: { element: '土', rank: '一般', lv: 17, hp: 160, atk: 18, def: 16, mag: 27, res: 16, spd: 13, luk: 7, exp: 58, money: 28,
    skills: [['攻擊', 2], ['熔銅', 2]], drops: [['青銅碎片', 0.4]], desc: '鑄銅作坊裡碎掉的陶範。銅水倒進去的那一刻有多燙，它全都記得。' },
  鴞影: { element: '陰', rank: '一般', lv: 17, hp: 150, atk: 20, def: 12, mag: 28, res: 20, spd: 17, luk: 9, exp: 58, money: 26,
    skills: [['攻擊', 2], ['夜啼', 2]], drops: [['鴞羽', 0.4]], desc: '青銅鴞尊上的貓頭鷹，在夜裡睜開了眼睛。它看得見別人看不見的東西，所以從來不睡。' },
  祭火: { element: '火', rank: '精英', lv: 18, hp: 600, atk: 24, def: 16, mag: 31, res: 20, spd: 15, luk: 10, exp: 170, money: 100,
    skills: [['攻擊', 1], ['灼燒', 2], ['燎原', 1]], drops: [['朱砂', 1]], desc: '宗廟前燒了三天三夜的火。沒有人敢讓它熄，也沒有人記得它最早是為了什麼點起來的。' },
  饕餮之影: { element: '金', rank: '首領', lv: 19, hp: 1400, atk: 29, def: 21, mag: 28, res: 19, spd: 13, luk: 12, exp: 640, money: 360,
    skills: [['攻擊', 2], ['吞噬', 2], ['威壓', 1], ['貪食', 1]], drops: [['青銅碎片', 1]], desc: '青銅器上的獸面紋活了過來。它吃的不是人——它吃的是「理由」。每一句「為了先王」「為了天命」，都讓它長大一點。' },
};

// 敵人組
export const ENCOUNTERS = {
  序_褪墨鬼: { enemies: ['褪墨鬼', '褪墨鬼'], tutorial: true },
  序_封靈: { enemies: ['褪墨鬼'], tutorial: 'seal' },
  v1_田野一: { enemies: ['瘴霧', '褪墨鬼'] },
  v1_田野二: { enemies: ['刺竹影'] },
  v1_田野三: { enemies: ['瘴霧', '瘴霧'] },
  v1_田野四: { enemies: ['刺竹影', '褪墨鬼'] },
  v1_沙洲一: { enemies: ['沙洲蟹魅'] },
  v1_沙洲二: { enemies: ['沙洲蟹魅', '褪墨鬼'] },
  v1_竹林: { enemies: ['刺竹影', '刺竹影'] },
  v1_褪聲鬼: { enemies: ['褪墨鬼', '褪聲鬼', '褪墨鬼'], boss: true, noFlee: true },
  v1_山路一: { enemies: ['瘴霧', '刺竹影', '瘴霧'] },
  v1_山路二: { enemies: ['刺竹影', '刺竹影', '褪墨鬼'] },
  v1_失語之影: { enemies: ['失語之影'], boss: true, noFlee: true },
  v1_蔗田一: { enemies: ['稻草人偶', '稻草人偶'] },
  v1_蔗田二: { enemies: ['火舌', '稻草人偶'] },
  v1_蔗田三: { enemies: ['火舌', '火舌', '褪墨鬼'] },
  v1_蔗田四: { enemies: ['生鏽的火繩槍兵', '稻草人偶'] },
  v1_夜火一: { enemies: ['火舌', '生鏽的火繩槍兵', '火舌'] },
  v1_夜火二: { enemies: ['稻草人偶', '生鏽的火繩槍兵', '稻草人偶'] },
  v1_怨火: { enemies: ['火舌', '怨火', '火舌'], boss: true, noFlee: true },
  v1_稻草人偶王: { enemies: ['稻草人偶王'], boss: true, noFlee: true },
  v1_海岸一: { enemies: ['潮魅', '沙洲蟹魅'] },
  v1_海岸二: { enemies: ['破帆鬼', '潮魅'] },
  v1_海岸三: { enemies: ['火藥精', '破帆鬼', '火藥精'] },
  v1_海岸四: { enemies: ['潮魅', '潮魅', '褪墨鬼'] },
  v1_救石頭: { enemies: ['沙洲蟹魅', '沙洲蟹魅', '潮魅'] },
  v1_赫克托: { enemies: ['火藥精', '赫克托之火', '火藥精'], boss: true, noFlee: true },
  v1_海翁之影: { enemies: ['海翁之影'], boss: true, noFlee: true },
  v1_圍城一: { enemies: ['疫鬼', '飢影'] },
  v1_圍城二: { enemies: ['城砲殘魂', '疫鬼'] },
  v1_圍城三: { enemies: ['飢影', '飢影', '褪墨鬼'] },
  v1_圍城四: { enemies: ['城砲殘魂', '火藥精', '城砲殘魂'] },
  v1_檔案室: { enemies: ['褪墨鬼', '疫鬼', '褪墨鬼', '飢影'], boss: true, noFlee: true },
  v1_無面書記: { enemies: ['無面書記・大員之相'], boss: true, noFlee: true },
  v1_無面書記弱: { enemies: ['無面書記・大員之相'], boss: true, noFlee: true, hpMult: 0.75 },
  v2_骨料: { enemies: ['裂兆', '裂兆'] },
  v2_洹水一: { enemies: ['洹水瘴', '裂兆'] },
  v2_洹水二: { enemies: ['骨蠹', '骨蠹'] },
  v2_洹水三: { enemies: ['洹水瘴', '洹水瘴', '褪墨鬼'] },
  v2_城郊一: { enemies: ['銅鏽兵', '裂兆'] },
  v2_城郊二: { enemies: ['骨蠹', '銅鏽兵'] },
  v2_窖穴: { enemies: ['骨蠹', '無字骨', '骨蠹'], boss: true, noFlee: true },
  v2_兆魘: { enemies: ['兆魘'], boss: true, noFlee: true },
  v2_夯土一: { enemies: ['夯土傀', '夯土傀'] },
  v2_城郊三: { enemies: ['陶範魅', '銅鏽兵'] },
  v2_夜一: { enemies: ['鴞影', '鴞影'] },
  v2_夜二: { enemies: ['鴞影', '陶範魅', '裂兆'] },
  v2_祭火: { enemies: ['裂兆', '祭火', '裂兆'], boss: true, noFlee: true },
  v2_饕餮: { enemies: ['饕餮之影'], boss: true, noFlee: true },
};

// 隨機遭遇池
export const POOLS = {
  新港田野: ['v1_田野一', 'v1_田野二', 'v1_田野三', 'v1_田野四'],
  大員沙洲: ['v1_沙洲一', 'v1_沙洲二', 'v1_田野一'],
  北方山路: ['v1_山路一', 'v1_山路二', 'v1_田野三'],
  赤崁蔗田: ['v1_蔗田一', 'v1_蔗田二', 'v1_蔗田三', 'v1_蔗田四'],
  赤崁夜火: ['v1_夜火一', 'v1_夜火二', 'v1_蔗田三'],
  鹿耳門海岸: ['v1_海岸一', 'v1_海岸二', 'v1_海岸三', 'v1_海岸四'],
  熱蘭遮城外: ['v1_圍城一', 'v1_圍城二', 'v1_圍城三', 'v1_圍城四'],
  洹水岸邊: ['v2_洹水一', 'v2_洹水二', 'v2_洹水三', 'v2_城郊一', 'v2_城郊二'],
  商邑之夜: ['v2_夜一', 'v2_夜二', 'v2_城郊三', 'v2_夯土一'],
};

// ───────── 道具 ─────────
// type: use 消耗 / weapon 武器 / charm 飾品 / material 素材 / key 重要
export const ITEMS = {
  草藥: { type: 'use', heal: 50, price: 12, desc: '搗碎的青草，敷在傷口上。回復 50 體。' },
  麻糬: { type: 'use', heal: 110, price: 30, desc: '用小米搗成的糕點，黏牙又耐餓。回復 110 體。' },
  墨丸: { type: 'use', mp: 25, price: 25, desc: '壓成小丸的松煙墨。回復 25 墨。' },
  薑湯: { type: 'use', heal: 70, cures: ['瘴毒'], price: 20, desc: '辛辣的薑湯。回復 70 體並解除瘴毒。' },
  黑糖: { type: 'use', heal: 90, mp: 10, price: 28, desc: '赤崁糖廍熬出來的黑糖塊。回復 90 體、10 墨。' },
  補字符: { type: 'use', heal: 20, cures: ['褪色', '失語'], price: 0, desc: '【煉化】解除褪色與失語，回復 20 體。' },
  驅瘴湯: { type: 'use', heal: 200, cures: ['瘴毒', '迷惘'], price: 0, desc: '【煉化】回復 200 體，並解除瘴毒與迷惘。' },
  還魂墨: { type: 'use', revive: 0.5, price: 0, desc: '【煉化】使倒下的隊友以一半的體復甦。' },

  裁紙刀: { type: 'weapon', who: ['知墨'], element: '金', stats: { atk: 4 }, desc: '修復工作室用的裁紙刀，意外地順手。' },
  竹骨扇: { type: 'weapon', who: ['知墨'], element: '木', stats: { atk: 7, mag: 5 }, desc: '【煉化】刺竹削成的扇骨，開合之間有風。' },
  雙語筆: { type: 'weapon', who: ['知墨'], element: '陰', stats: { atk: 10, mag: 12 }, desc: '【煉化】一端寫羅馬字、一端寫漢字的筆。' },
  墨絲: { type: 'weapon', who: ['蘅'], element: '水', stats: { mag: 4 }, desc: '從蘅的髮梢延伸出的墨色絲線。' },
  竹彈弓: { type: 'weapon', who: ['蒂娃'], element: '木', stats: { atk: 4 }, desc: '蒂娃自己做的彈弓，準頭比社裡的男孩還好。' },
  扁擔: { type: 'weapon', who: ['阿順'], element: '土', stats: { atk: 5, def: 2 }, desc: '挑了十年甘蔗的扁擔，磨得發亮。' },
  鐵胎弓: { type: 'weapon', who: ['蒂娃'], element: '金', stats: { atk: 10, spd: 2 }, desc: '【煉化】以火繩槍的鐵片加固的短弓。' },
  藤牌刀: { type: 'weapon', who: ['石頭'], element: '火', stats: { atk: 7, def: 3 }, desc: '一面藤編的圓盾與一把短刀，鄭軍藤牌兵的標準裝備。' },
  鹿耳門之刃: { type: 'weapon', who: ['知墨'], element: '水', stats: { atk: 14, mag: 8 }, desc: '【煉化】刀身上有潮水的紋路。' },
  短火繩槍: { type: 'weapon', who: ['楊'], element: '金', stats: { atk: 8 }, desc: '公司配發的火繩槍，裝填很慢。' },

  鹿皮護腕: { type: 'charm', stats: { def: 4 }, price: 40, desc: '梅花鹿皮做的護腕。守 +4。' },
  貝殼項鍊: { type: 'charm', stats: { res: 5 }, price: 45, desc: '海邊撿來的貝殼串成的項鍊。定 +5。' },
  田埂護符: { type: 'charm', stats: { def: 8 }, price: 0, desc: '【煉化】守 +8。' },
  潮聲耳墜: { type: 'charm', stats: { mag: 6, res: 4 }, price: 0, desc: '【煉化】神 +6、定 +4。耳邊總有細細的浪聲。' },

  舊紙: { type: 'material', price: 5, desc: '泛黃的紙片。煉化素材。' },
  薑: { type: 'material', price: 6, desc: '辛辣的老薑。煉化素材。' },
  竹片: { type: 'material', price: 6, desc: '削好的刺竹片。煉化素材。' },
  貝殼: { type: 'material', price: 8, desc: '大員沙洲上的貝殼。煉化素材。' },
  甘蔗: { type: 'material', price: 5, desc: '赤崁的甘蔗，甜得發膩。煉化素材。' },
  鐵片: { type: 'material', price: 14, desc: '火繩槍上脫落的鐵片。煉化素材。' },
  新港文書殘片: { type: 'material', price: 0, desc: '一小片寫著西拉雅語羅馬字的紙。從燒毀的檔案室裡搶救出來的。' },
  鹿角: { type: 'material', price: 15, desc: '梅花鹿脫落的角。煉化素材。' },

  新港文書: { type: 'key', desc: '清代的西拉雅語羅馬字契約。契尾有一個被蟲蛀掉一半的名字。' },
  祖父的手冊: { type: 'key', desc: '沈牧之留下的手冊，寫滿了看不懂的年份與地名。' },
  楊的字典: { type: 'key', desc: '楊花了二十五年編的荷蘭語—西拉雅語字典手稿。邊角有燒焦的痕跡。' },
  石頭的家書: { type: 'key', desc: '你替石頭寫的信。「阿母：我在臺灣很好，不用掛念……」' },
  牽星板: { type: 'key', desc: '一組大小不同的木板，伸直手臂比對星星離海面的高度，就能知道船在哪裡。' },
  公司通行令: { type: 'key', desc: '刻著荷蘭東印度公司徽記的木牌。楊冒著風險交給你的。' },
  人頭稅單: { type: 'key', desc: '阿順的人頭稅繳納證明。每個月四分之一里爾，沒帶在身上被士兵查到就要受罰。' },
  楊的單字表: { type: 'key', desc: '楊手抄的荷蘭語—西拉雅語單字表，邊角被翻得起毛。' },

  // 卷二〈牧野〉
  黍餅: { type: 'use', heal: 130, price: 34, desc: '用黍米蒸成的餅，扎實耐餓。回復 130 體。' },
  丹墨: { type: 'use', heal: 40, mp: 40, price: 0, desc: '【煉化】摻了朱砂的墨，紅得發亮。回復 40 體、40 墨。' },
  契刀: { type: 'weapon', who: ['妌'], element: '金', stats: { atk: 3, mag: 5 }, desc: '刻字用的青銅小刀。刀口磨得很薄，妌每天晚上都會偷偷磨它。' },
  牧杖: { type: 'weapon', who: ['十七'], element: '木', stats: { atk: 6, def: 2 }, desc: '一根被手磨得光滑的木杖。在羌人圈裡，它用來挑土。' },
  卜骨之筆: { type: 'weapon', who: ['知墨'], element: '火', stats: { atk: 12, mag: 16 }, desc: '【煉化】筆桿是一截打磨過的骨頭，筆尖帶著一點朱紅。' },
  貝串: { type: 'charm', stats: { luk: 6 }, price: 55, desc: '穿成一串的海貝。在離海很遠的商邑，貝是很珍貴的東西。緣 +6。' },
  龜甲護符: { type: 'charm', stats: { def: 6, res: 6 }, price: 0, desc: '【煉化】一小片磨圓的龜甲，背面有鑽過的凹槽。守 +6、定 +6。' },
  牛骨: { type: 'material', price: 8, desc: '整治過的牛肩胛骨碎片。煉化素材。' },
  龜甲: { type: 'material', price: 14, desc: '龜的腹甲。據說很多是從南方送來的。煉化素材。' },
  青銅碎片: { type: 'material', price: 16, desc: '鑄銅作坊邊撿到的碎片，帶著綠鏽。煉化素材。' },
  朱砂: { type: 'material', price: 20, desc: '紅色的礦石磨成的粉。有些卜辭刻好之後，會用它把字填紅。煉化素材。' },
  藏書票: { type: 'charm', stats: { res: 6, luk: 6 }, price: 0, desc: '【收藏獎勵】藏書閣收錄過半時得到的小紙片，蓋著一枚看不清楚的朱印。定 +6、緣 +6。' },
  千秋書籤: { type: 'charm', stats: { mag: 10, res: 8, luk: 10 }, price: 0, desc: '【收藏獎勵】史卷全部收錄時，夾在藏書閣最後一本書裡的書籤。神 +10、定 +8、緣 +10。' },
  鴞羽: { type: 'material', price: 18, desc: '灰褐色的羽毛，摸起來很軟。煉化素材。' },
  鴞目耳墜: { type: 'charm', stats: { res: 7, luk: 5 }, price: 0, desc: '【煉化】一對圓圓的青銅小墜子，像鴞的眼睛。定 +7、緣 +5。' },
  青銅鏡: { type: 'weapon', who: ['蘅'], element: '金', stats: { mag: 14, res: 4 }, desc: '【煉化】背面鑄著獸面紋的小銅鏡。蘅照的時候，鏡子裡什麼都沒有。' },
  一個名字: { type: 'key', desc: '筆記本最後一頁，用很小的字寫著：「嵐」。山上的風，和山頂的雲。' },
  臨摹的卜辭: { type: 'key', desc: '你在南港用時墨臨摹的卜辭。「用羌」兩個字，和後面的數字。' },
  十七的骨哨: { type: 'key', desc: '十七用羊骨磨成的小哨子。吹起來的聲音，像山上的風。' },
};

// ───────── 煉化配方 ─────────
// 兩種靈（不分順序）＋素材 → 成果
export const RECIPES = [
  { a: '褪墨鬼', b: '褪墨鬼', m: '舊紙', out: '補字符', n: 2, hint: '同樣的灰色墨漬，也許和「紙」有關。' },
  { a: '瘴霧', b: '刺竹影', m: '薑', out: '驅瘴湯', n: 2, hint: '溼熱與刺痛……需要一點辛辣的東西。' },
  { a: '刺竹影', b: '沙洲蟹魅', m: '竹片', out: '竹骨扇', n: 1, hint: '竹林與沙洲，也許能削成什麼。' },
  { a: '褪墨鬼', b: '瘴霧', m: '草藥', out: '還魂墨', n: 1, hint: '褪去的東西，也許能被草木喚回。' },
  { a: '沙洲蟹魅', b: '沙洲蟹魅', m: '鹿角', out: '田埂護符', n: 1, hint: '堅硬的殼，還需要更堅硬的東西。' },
  { a: '褪聲鬼', b: '沙洲蟹魅', m: '貝殼', out: '潮聲耳墜', n: 1, hint: '失去的聲音與海……貝殼裡有海的聲音。' },
  { a: '褪聲鬼', b: '失語之影', m: '貝殼', out: '潮歌', n: 1, spirit: true, hint: '兩個失去聲音的靈，也許能一起重新唱歌。' },
  { a: '褪墨鬼', b: '無面書記・大員之相', m: '新港文書殘片', out: '雙語筆', n: 1, hint: '被抹去的字，與抹去字的筆……還需要一片寫著兩種文字的紙。' },
  { a: '疫鬼', b: '飢影', m: '麻糬', out: '驅瘴湯', n: 3, hint: '病與餓，都需要一碗熱熱的東西。' },
  { a: '海翁之影', b: '潮魅', m: '貝殼', out: '潮聲耳墜', n: 2, hint: '最大的海與最小的浪，都住在貝殼裡。' },
  { a: '稻草人偶', b: '火舌', m: '甘蔗', out: '黑糖', n: 3, hint: '田裡的東西遇到火……甘蔗會變成什麼呢？' },
  { a: '潮魅', b: '生鏽的火繩槍兵', m: '鐵片', out: '鹿耳門之刃', n: 1, hint: '海與鐵……也許能鍛出一把有潮水紋路的刀。' },
  { a: '破帆鬼', b: '潮魅', m: '貝殼', out: '潮聲耳墜', n: 1, hint: '船帆與海浪，貝殼裡藏著浪的聲音。' },
  { a: '火藥精', b: '火舌', m: '草藥', out: '還魂墨', n: 2, hint: '火熄滅之後，灰燼裡還有一點點生機。' },
  { a: '火舌', b: '生鏽的火繩槍兵', m: '鐵片', out: '鐵胎弓', n: 1, hint: '火與鐵，還需要一塊鐵來鍛打。' },
  { a: '稻草人偶', b: '稻草人偶', m: '竹片', out: '田埂護符', n: 1, hint: '兩個守田的稻草人，綁在一起會更牢靠。' },
  { a: '怨火', b: '瘴霧', m: '薑', out: '驅瘴湯', n: 3, hint: '燒不盡的火與散不去的霧，需要辛辣的東西壓住。' },
  { a: '裂兆', b: '骨蠹', m: '牛骨', out: '補字符', n: 3, hint: '裂開的骨頭與咬骨頭的蟲……需要一塊完整的骨頭。' },
  { a: '洹水瘴', b: '裂兆', m: '朱砂', out: '丹墨', n: 2, hint: '水與火之間，缺一點紅色。' },
  { a: '骨蠹', b: '骨蠹', m: '龜甲', out: '龜甲護符', n: 1, hint: '咬不動的東西，最能擋東西。' },
  { a: '銅鏽兵', b: '裂兆', m: '青銅碎片', out: '還魂墨', n: 2, hint: '青銅進了火，會重新流動起來。' },
  { a: '無字骨', b: '兆魘', m: '朱砂', out: '卜骨之筆', n: 1, hint: '沒有字的骨頭、燒出裂紋的恐懼……還需要把字填紅的東西。' },
  { a: '鴞影', b: '祭火', m: '鴞羽', out: '鴞目耳墜', n: 1, hint: '夜裡的眼睛和不熄的火，還差一片羽毛。' },
  { a: '夯土傀', b: '夯土傀', m: '牛骨', out: '田埂護符', n: 1, hint: '兩個打夯的土偶，綁在一起會更牢靠。' },
  { a: '陶範魅', b: '鴞影', m: '黍餅', out: '還魂墨', n: 2, hint: '冷掉的銅與醒著的鳥，需要一點溫暖的東西。' },
  { a: '饕餮之影', b: '陶範魅', m: '青銅碎片', out: '青銅鏡', n: 1, hint: '獸面與陶範——再一塊青銅，就能重新鑄成一面鏡子。' },
];

// ───────── 商店 ─────────
export const SHOPS = {
  赤崁街市: { name: '赤崁的街市', items: ['草藥', '麻糬', '黑糖', '墨丸', '薑湯', '鹿皮護腕', '貝殼項鍊', '甘蔗', '鐵片', '竹片', '薑'] },
  漢人商販: { name: '往來社間的漢人商販', items: ['草藥', '麻糬', '墨丸', '薑湯', '鹿皮護腕', '貝殼項鍊', '薑', '竹片', '鹿角'] },
  商邑市集: { name: '大邑商的市集', items: ['草藥', '黍餅', '墨丸', '貝串', '鹿皮護腕', '牛骨', '龜甲', '青銅碎片', '朱砂', '鴞羽'] },
};

// ───────── 夜話（時之書齋・茶室） ─────────
export const TALKS = [
  { id: '蘅一', who: '蘅', title: '塗掉的字', need: [['羈絆', '蘅', 2]], scene: '夜話.蘅一' },
  { id: '蘅二', who: '蘅', title: '這裡是哪一年', need: [['羈絆', '蘅', 3], ['旗標', 'v1.回二完']], scene: '夜話.蘅二' },
  { id: '蘅三', who: '蘅', title: '像我的聲音', need: [['羈絆', '蘅', 3], ['旗標', 'v1.回三完']], scene: '夜話.蘅三' },
  { id: '蘅四', who: '蘅', title: '那種語言', need: [['羈絆', '蘅', 3], ['旗標', 'v1.卷完']], scene: '夜話.蘅四' },
  { id: '蘅五', who: '蘅', title: '硯台聽得懂的樣子', need: [['羈絆', '蘅', 3], ['旗標', 'v2.回一完']], scene: '夜話.蘅五' },
];

// ───────── 卷 ─────────
export const VOLUMES = [
  { id: '卷一', name: '大員', era: '1636～1662 年・臺灣', theme: 'dayuan', ready: true, start: 'v1.1.開始',
    desc: '一紙新港文書，通往三百九十年前的海岸。' },
  { id: '卷二', name: '牧野', era: '約西元前 1051～前 1046 年・商末周初', theme: 'muye', ready: true, start: 'v2.1.開始',
    need: '卷完.卷一', needText: '完成卷一〈大員〉後開放。',
    desc: '一片卜骨，通往三千多年前的洹水。' },
  { id: '卷三', name: '阿瑪納', era: '西元前 14 世紀・埃及', ready: false },
  { id: '卷四', name: '雅典', era: '西元前 399 年・希臘', ready: false },
  { id: '卷五', name: '羯陵伽', era: '西元前 3 世紀・印度', ready: false },
];

// ───────── 論辯戰 ─────────
export const DEBATES = {
  箙_天命: {
    foe: '箙', topic: '兆紋是天說的，還是讀兆的人說的？',
    foeBelief: 26, myBelief: 22, rounds: 7,
    foeCards: { 立論: 3, 反詰: 2, 引證: 2, 讓步: 2 },
    lines: {
      foe: {
        立論: ['「兆是先王與帝的話。我們只是把它讀出來。」', '「如果每個貞人都照自己的心意去讀，天下就亂了。」', '「我讀了二十年的兆。我的手會抖，可是我的眼睛不會騙人。」'],
        反詰: ['「那你說，平的紋該讀成什麼？讀成凶，王就不打仗、不祭祀了嗎？」', '「你是遠方來的巫。你們那裡的人，就不問天嗎？」'],
        引證: ['「先王祖甲的時候，祭祀的日子都排得好好的，一年到頭，從來沒有亂過。這就是秩序。」', '「王去東方打人方之前問過卜，兆說吉。王打贏了，帶回了這麼多人。」'],
        讓步: ['「……我承認，有些紋，我讀的時候，心裡先有了答案。」', '「平的紋，我這輩子看過很多次。」'],
      },
      me: {
        立論: ['「兆是天給的。可是『吉』這個字，是人說出來的。」', '「讀兆的人，也要為自己讀出來的字負責。」', '「如果天命需要那麼多人死，那天命也該被問一問。」'],
        反詰: ['「平的紋，你為什麼總是讀成吉？」', '「如果今天被點到的是妌，你還會讀成吉嗎？」', '「先王真的需要這些人嗎？還是活著的人需要？」'],
        引證: ['（引用史卷）「卜辭裡也有問『勿用』的——不用。問的人，心裡也猶豫過。」', '（引用史卷）「卜骨上刻著問題、判斷，還有應驗。刻下來，就是要讓以後的人檢查。」'],
        讓步: ['「我知道，你只是在做你父親、你祖父做過的事。」', '「我知道，你的手在抖。」'],
        共感: ['「箙，你那天把骨頭交給妌的時候，為什麼不敢看她？」'],
      },
    },
  },
  無面書記_遺忘: {
    foe: '無面書記', topic: '如果能忘記所有的痛苦，人會不會比較幸福？',
    foeBelief: 30, myBelief: 24, rounds: 8,
    foeCards: { 立論: 3, 反詰: 3, 引證: 2, 讓步: 1 },
    lines: {
      foe: {
        立論: ['「這座島上的人，二十六年來換了三個主人。每一次，都有人死去。忘記，是唯一的解脫。」', '「那個叫阿順的唐人，那個叫蒂娃的女人，他們夜裡都睡不好。你不想讓他們好好睡一覺嗎？」', '「記憶會傳給下一代。仇恨也是。我只是在斬斷它。」'],
        反詰: ['「你修復那些舊紙，是為了誰？為了死去的人，還是為了你自己？」', '「你的祖父也曾經這樣跟我爭辯。你知道他最後怎麼回答嗎？」', '「如果記得是好事，為什麼人們會在夜裡哭？」'],
        引證: ['「新港社的孩子們，現在會讀經文，卻不會唱祖母的歌。你看，他們已經在忘記了。我只是讓它快一點。」', '「麻豆社被燒了，赤崁的甘蔗田被燒了。有誰因為記得，就不再燒了嗎？」'],
        讓步: ['「……你說得很好。你的祖父也說得很好。」'],
      },
      me: {
        立論: ['「痛苦跟愛是纏在一起的。你擦掉一個，另一個也會跟著淡掉。」', '「記得，才能不再重複。」', '「他們有權利記得自己是誰——就算那很痛。」'],
        反詰: ['「那你為什麼沒有臉？是你自己擦掉的嗎？」', '「如果遺忘是仁慈，為什麼你要偷偷地做？為什麼不問問他們？」', '「你說要斬斷仇恨。可是被你擦掉的人，連被原諒的機會都沒有了。」'],
        引證: ['（引用史卷）「新港文書被寫了一百多年。人們選擇用兩種文字記下自己的土地。」', '（引用史卷）「今天的西拉雅族人，正在用這些舊紙，把自己的語言找回來。」'],
        讓步: ['「我承認，有些記憶重得讓人站不起來。」', '「我也有想要忘記的事。」'],
        共感: ['「……你也曾經很痛吧。痛到想把一切都擦掉。」'],
      },
    },
  },
  楊_投降: {
    foe: '楊', topic: '城守不住了。開門投降，是背叛，還是保護？',
    foeBelief: 26, myBelief: 22, rounds: 7,
    foeCards: { 立論: 3, 反詰: 2, 引證: 2, 讓步: 2 },
    lines: {
      foe: {
        立論: ['「我替公司工作了二十五年。現在開門，這二十五年算什麼？」', '「熱蘭遮城還在，揆一長官還在。我們只要守住，援軍就會從巴達維亞來。」', '「國姓爺的軍隊進城，城裡的女人和孩子會怎麼樣？您想過嗎？」'],
        反詰: ['「您每次出現都在勸人放下。您到底站在哪一邊？」', '「投降之後呢？您能保證他們不殺俘虜嗎？」'],
        引證: ['「十年前，赤崁的唐人造反，我們殺了好幾千人。您覺得他們會怎麼對我們？」', '「城裡的井已經乾了一半，火藥也不夠。這我比誰都清楚。」'],
        讓步: ['「……我知道守不住。我只是不知道，投降之後，我還是誰。」'],
      },
      me: {
        立論: ['「城會倒，人不應該跟著倒。」', '「開門，是為了讓城裡的人活下去。」', '「你翻譯了一輩子別人的命令。這一次，說你自己的話。」'],
        反詰: ['「援軍什麼時候會來？你真的相信嗎？」', '「你說要守住。守住的是公司，還是城裡的人？」', '「如果今天被圍的是新港社，你會叫他們死守嗎？」'],
        引證: ['（引用史卷）「國姓爺的軍隊需要懂荷蘭語、也懂這片土地的人。你可以替俘虜說話。」', '（引用史卷）「普羅民遮城才蓋好八年，是郭懷一事件之後，為了看守唐人而蓋的。現在，輪到它被圍。」'],
        讓步: ['「你守了二十五年，這不是一件小事。」', '「我知道，開門比守城更需要勇氣。」'],
        共感: ['「楊，你還記得新港社學堂裡，那些跟著你念錯音的孩子嗎？」'],
      },
    },
  },
  阿順_起事: {
    foe: '阿順', topic: '被逼到活不下去的時候，拿起刀來，是對還是錯？',
    foeBelief: 24, myBelief: 20, rounds: 7,
    foeCards: { 立論: 3, 反詰: 3, 引證: 1, 讓步: 1 },
    lines: {
      foe: {
        立論: ['「一個月四分之一里爾的人頭稅，我們一年到頭種甘蔗，賺的還不夠繳稅！」', '「紅毛兵半夜踹門查稅單，沒帶就打，帶了也說是假的。這樣怎麼活？」', '「郭大哥說得對，這片田是我們開的，憑什麼他們拿走大半？」'],
        反詰: ['「你是公司的人，你當然叫我們忍。你有被踹過門嗎？」', '「不起來，難道等著餓死？你說，還有什麼路？」'],
        引證: ['「隔壁的阿水，稅單被雨淋濕，被打斷了一條腿。你去問他要不要忍。」'],
        讓步: ['「……我也知道打不過。可是總要有人站出來啊。」'],
      },
      me: {
        立論: ['「你倒下了，阿福怎麼辦？」', '「活下來，才有以後。」', '「刀一拿起來，就會有很多跟你一樣的人死掉——兩邊都是。」'],
        反詰: ['「你說紅毛兵會怎麼對付起事的人？你真的想過嗎？」', '「郭懷一有想過新港社、目加溜灣社的人會站在哪一邊嗎？」', '「如果失敗了，你覺得公司會分得清誰有拿刀、誰沒有嗎？」'],
        引證: ['（引用史卷）「公司跟各社結盟很多年了。一打起來，他們會叫社裡的戰士來。」', '（引用史卷）「十幾年前麻豆社跟公司打，整個社被燒光了。」'],
        讓步: ['「你說的沒錯。這個稅，確實不公平。」', '「我不是要你忍一輩子。」'],
        共感: ['「阿順，你第一次看到這片田的時候，是什麼樣子？」'],
      },
    },
  },
  楊_教育: {
    foe: '楊', topic: '把孩子教成會讀經的人，是不是就該讓他們放下祖先的信仰？',
    foeBelief: 22, myBelief: 20, rounds: 7,
    foeCards: { 立論: 3, 反詰: 2, 引證: 2, 讓步: 1 },
    lines: {
      foe: {
        立論: ['「學校讓他們讀書寫字，這是公司給這片土地最好的禮物。」', '「新的信仰會帶來秩序。沒有秩序，就沒有學校。」', '「我也是從貧窮裡爬出來的。讀書，才能改變命運。」'],
        反詰: ['「那你說，不識字的人要怎麼跟公司簽約、保護自己的土地？」', '「你把舊信仰說得那麼好，可是你真的懂它嗎？」'],
        引證: ['「尤羅伯牧師說過：只要孩子們讀懂經文，他們的心就會改變。」', '「阿姆斯特丹的孤兒院，也是靠讀書才讓孩子活下來。」'],
        讓步: ['「……我承認，祖母們的歌很美。我聽得懂一點。」'],
      },
      me: {
        立論: ['「學寫字，不需要先學會忘記。」', '「一個人可以同時會兩種語言，也可以同時記得兩種東西。」', '「字是用來記住的，不是用來取代的。」'],
        反詰: ['「那麼，是誰決定哪一種知識算『秩序』？」', '「如果今天是公司的神被趕走，你會怎麼想？」', '「你學西拉雅語，不也是因為你喜歡這些人本來的樣子？」'],
        引證: ['（引用史卷）「新港社的孩子們在學校裡，用羅馬字拼寫的正是祖母們的語言。」', '（引用史卷）「刺竹圍住的不只是聚落，也是一整套活法。」'],
        讓步: ['「你說得對，讀書確實能保護他們。」', '「我知道你是真心為孩子們好。」'],
        共感: ['「楊，你第一次聽懂她們的歌時，是什麼感覺？」'],
      },
    },
  },
};

// ───────── 小遊戲：譯字／牽星 ─────────

export const TRANSLATE = {
  // 甲骨文目前還沒有收進 Unicode，字形用簡化的筆畫（100×100 座標）畫出來
  甲骨一: {
    kind: '識字', title: '骨上的字', question: true, need: 5,
    rule: '看看骨頭上刻的字形，選出它是今天的哪一個字。',
    intro: '妌拿出一塊練習用的碎牛骨，上面歪歪扭扭地刻滿了字：「爹不准我刻真的卜骨，我只好在這種碎骨頭上練。你認得幾個？」',
    items: [
      { w: '「一個圓圈，中間多了一點。」', glyph: ['M50 18 A32 32 0 1 1 49.9 18', 'M44 50 L56 50'], a: '日', opts: ['日', '口', '田', '丁'] },
      { w: '「一彎細細的弧，中間一小畫。」', glyph: ['M60 12 C24 26 24 74 60 88', 'M60 12 C42 30 42 70 60 88', 'M40 44 L40 58'], a: '月', opts: ['月', '刀', '弓', '人'] },
      { w: '「側著身子站的樣子，手往前伸。」', glyph: ['M58 12 L40 88', 'M53 34 L70 58'], a: '人', opts: ['人', '大', '子', '女'] },
      { w: '「一對向上翹的角。」', glyph: ['M26 14 C26 36 74 36 74 14', 'M50 30 L50 86', 'M34 58 L50 72 L66 58'], a: '牛', opts: ['牛', '羊', '木', '王'] },
      { w: '「一對向下彎的角。」', glyph: ['M26 16 C30 34 42 36 50 32 C58 36 70 34 74 16', 'M50 32 L50 74', 'M36 52 L64 52', 'M40 74 L50 86 L60 74'], a: '羊', opts: ['羊', '牛', '犬', '馬'] },
      { w: '「一個側身的人，頭上戴著一對羊角。」', glyph: ['M38 12 C40 24 58 24 60 12', 'M49 22 L40 88', 'M46 44 L62 64'], a: '羌', opts: ['羌', '人', '羊', '美'] },
      { w: '「上面一橫是天，下面一點一點落下來。」', glyph: ['M16 20 L84 20', 'M50 20 L50 36', 'M30 34 L30 44', 'M30 58 L30 68', 'M50 50 L50 60', 'M50 74 L50 84', 'M70 34 L70 44', 'M70 58 L70 68'], a: '雨', opts: ['雨', '水', '川', '木'] },
      { w: '「一直，旁邊斜斜地岔出一筆——就像骨頭燒出來的裂紋。」', glyph: ['M44 12 L44 88', 'M44 44 L70 30'], a: '卜', opts: ['卜', '十', '人', '刀'] },
    ],
    note: '「羌」就是一個頭上戴著羊角的人。在爹刻的卜辭裡，這個字常常跟數字寫在一起。——妌',
  },
  牽星一: {
    kind: '牽星', title: '夜渡鹿耳門', question: true, need: 4,
    rule: '夜裡的鹿耳門水道又窄又淺。回答石頭與蒂娃的問題，引導小船平安通過。',
    intro: '石頭拿出一組大小不同的木板：「這是我阿爸教我的牽星板。伸直手，用板子去比星星離海面多高，就知道船在哪裡。可是我……我暈船暈到看不清楚。」',
    items: [
      { w: '北方天空中，整夜幾乎不動、可以用來辨認方向的是哪顆星？', a: '北極星', opts: ['北極星', '金星', '月亮', '天狼星'] },
      { w: '牽星板是用來量什麼的？', a: '星星離海面的高度', opts: ['海水的深度', '星星離海面的高度', '風的速度', '船的重量'] },
      { w: '漲潮的時候，鹿耳門的水道會變得怎樣？', a: '變深，大船比較能通過', opts: ['變淺，大船會擱淺', '變深，大船比較能通過', '完全不會改變', '水會變成淡水'] },
      { w: '潮水漲退，主要是受到什麼的影響？', a: '月亮的引力', opts: ['風向', '月亮的引力', '海裡的鯨魚', '雨季'] },
      { w: '臺灣海峽的夏天，季風大多從哪個方向吹來？', a: '西南方', opts: ['東北方', '西南方', '正北方', '不一定，沒有季風'] },
      { w: '要回金門，船大致上要往哪個方向開？', a: '西北方', opts: ['東南方', '西北方', '正南方', '正東方'] },
    ],
    note: '「阿爸說，海很大，可是星星不會騙人。」——石頭',
  },
  荷蘭語一: {
    title: '楊的單字表', intro: '楊拿出一張手抄的單字表，蓋住中文的那一欄：「如果你真的從巴達維亞來，這些應該難不倒你。」',
    need: 4,
    items: [
      { w: 'school', a: '學校', opts: ['學校', '船', '魚', '鹽'] },
      { w: 'hert', a: '鹿', opts: ['心', '鹿', '樹', '雨'] },
      { w: 'suiker', a: '糖', opts: ['鹽', '米', '糖', '酒'] },
      { w: 'zee', a: '海', opts: ['山', '海', '河', '天'] },
      { w: 'brief', a: '信', opts: ['信', '書', '筆', '紙'] },
      { w: 'land', a: '土地', opts: ['房屋', '道路', '土地', '國王'] },
    ],
    note: '「hert」是鹿。這些年公司從大員運走的鹿皮，一年有好幾萬張。——楊',
  },
};

// ───────── 史卷 ─────────
// fact：史實 / 史實改編 / 虛構
export const CODEX = {
  // 器物誌
  新港文書: { cat: '器物誌', fact: '史實', vol: '序卷',
    text: '清代西拉雅族等平埔族群所留下的契約文書，常以羅馬字書寫族語，有時與漢字並列。這套書寫方式源自荷蘭時期傳教士在新港社等地以羅馬字拼寫西拉雅語的教育，在荷蘭人離開臺灣之後，仍被族人沿用了一百多年，現存的文書最晚約到十九世紀初。它們是研究西拉雅語最重要的材料之一。' },
  千秋硯: { cat: '器物誌', fact: '虛構', vol: '序卷',
    text: '巴掌大小的紫石硯，硯池中央有一道細如髮絲的裂痕，墨在其中會像潮水一樣自己流動。以它研出的「時墨」書寫，可以進入文字所記載的時空。傳說是倉頡造字時，落在人間的第一滴墨。' },
  刺竹: { cat: '器物誌', fact: '史實', vol: '卷一',
    text: '一種枝節上長著尖刺的竹子。早期臺灣的許多聚落會在周圍密植刺竹作為圍籬，用來防禦外人與野獸。漢人移民的村莊也常這樣做，所以臺灣至今仍有不少以「竹圍」為名的地方。' },
  扁擔: { cat: '器物誌', fact: '史實改編', vol: '卷一',
    text: '一根竹子或木頭，兩端挑著竹籃。早期渡海來臺的漢人移民，很多人就是靠著一根扁擔討生活。' },
  牽星板: { cat: '器物誌', fact: '史實', vol: '卷一',
    text: '古代航海者用來測量星辰高度的工具，由大小不同的方形木板組成。航行時伸直手臂，以木板比對北極星等星辰與海平面的高度，推算船隻所在的緯度。明代的航海紀錄中就有「過洋牽星」的方法。' },
  // 地理誌
  熱蘭遮城: { cat: '地理誌', fact: '史實', vol: '卷一',
    text: '荷蘭東印度公司在大員建造的城堡，1624 年起建，是公司在臺灣的統治與貿易中心。1661 年起被鄭軍圍困約九個月，1662 年初公司投降撤離。遺址在今天的臺南安平，一般稱為「安平古堡」，現存的城牆殘蹟是荷蘭時期留下來的。' },
  烏特勒支堡: { cat: '地理誌', fact: '史實', vol: '卷一',
    text: '熱蘭遮城旁邊小山丘上的一座稜堡，居高臨下保護主城。圍城後期，一名叛逃的荷蘭軍士向鄭軍透露這裡是防守的弱點。1662 年 1 月鄭軍猛烈砲擊並攻下此堡，熱蘭遮城從此失去屏障，不久便決定投降。' },
  神農街: { cat: '地理誌', fact: '史實', vol: '序卷',
    text: '臺南市中西區的老街，清代稱為「北勢街」，位在當時繁忙的五條港水運區一帶。如今是兩旁保留老屋的窄巷，入夜後掛滿燈籠。' },
  新港社: { cat: '地理誌', fact: '史實', vol: '卷一',
    text: '十七世紀西拉雅族的大社之一，位在今天臺南新市一帶。它是荷蘭人最早接觸、傳教與設立學校的地方之一，「新港文書」的名稱就來自這裡。' },
  大員: { cat: '地理誌', fact: '史實', vol: '卷一',
    text: '今天臺南安平一帶，當時是臺江內海外側的一座沙洲。1624 年荷蘭東印度公司在此建城，城堡後來被命名為「熱蘭遮城」。「大員」一詞也被認為與「臺灣」這個名稱的由來有關。' },
  赤崁: { cat: '地理誌', fact: '史實', vol: '卷一',
    text: '臺江內海東岸的平原，大約是今天臺南市中西區一帶，隔著內海與大員相望。荷蘭時期，這裡是漢人移民聚居、開墾種植甘蔗與稻米的地方。' },
  鹿耳門: { cat: '地理誌', fact: '史實', vol: '卷一',
    text: '臺江內海北邊通往外海的水道之一，水淺多沙洲，大船平時難以通過。1661 年鄭成功的艦隊趁漲潮從這裡駛入臺江內海，繞過熱蘭遮城的砲火，直接在赤崁一帶登陸。民間流傳「鹿耳門潮水大漲」是天助的傳說；事實上，鄭軍也掌握了水道的情報。後來臺江內海逐漸淤積成陸地，今天的鹿耳門已經不再是海口。' },
  普羅民遮城: { cat: '地理誌', fact: '史實', vol: '卷一',
    text: '郭懷一事件後，荷蘭東印度公司於 1653 年在赤崁興建的城堡，用來控制當地的漢人。它的遺址就是今天臺南的赤崁樓，不過現存的樓閣大多是清代以後改建的。' },
  // 人物誌
  西拉雅族: { cat: '人物誌', fact: '史實', vol: '卷一',
    text: '世居今天臺南一帶平原的原住民族群。十七世紀時，新港、目加溜灣、蕭壠、麻豆等是較大的社。女性負責耕作，男性狩獵，並以「社」為單位共同生活。當代的西拉雅族人持續推動族語與文化的復振，並爭取法定原住民族身分。' },
  尤羅伯: { cat: '人物誌', fact: '史實', vol: '卷一',
    text: '尤羅伯（Robert Junius），荷蘭改革宗傳教士，1629 年來到臺灣，在新港等社傳教、設立學校，教孩子以羅馬字讀寫西拉雅語，也把教義翻譯成族語。另一方面，他也推動了驅逐傳統女祭司的政策。1643 年離開臺灣。本作中僅作為背景人物出現。' },
  楊范登堡: { cat: '人物誌', fact: '虛構', vol: '卷一',
    text: '楊・范登堡，本作虛構的荷蘭東印度公司通譯。出身阿姆斯特丹的貧窮家庭，十九歲時在新港社協助傳教士辦學。他學西拉雅語，起初只是為了工作，後來卻真心喜歡上這個語言。' },
  陳阿順: { cat: '人物誌', fact: '虛構', vol: '卷一',
    text: '本作虛構的漢人佃農，約 1622 年生於福建，二十出頭時帶著弟弟阿福渡海來臺，在赤崁替人種甘蔗。愛說笑，說什麼都要加一句「好啦」。' },
  鄭成功: { cat: '人物誌', fact: '史實', vol: '卷一',
    text: '明末清初的軍事領袖，父親是海商鄭芝龍，母親是日本人田川氏。南明政權賜姓朱，人稱「國姓爺」。1661 年率軍渡海攻臺，次年迫使荷蘭東印度公司投降，隨後不久病逝。後世對他的評價多元而分歧。本作中他只遠遠出現。' },
  何斌: { cat: '人物誌', fact: '史實', vol: '卷一',
    text: '荷蘭時期在大員為公司工作的漢人通事與商人。因財務糾紛逃往廈門，投靠鄭成功，據說提供了臺灣的地圖與鹿耳門水道的情報，促成了鄭軍攻臺。又一個在兩種語言、兩個陣營之間生存的人。' },
  石頭: { cat: '人物誌', fact: '虛構', vol: '卷一',
    text: '本作虛構的鄭軍藤牌兵，十八歲，金門人，家裡是討海人。第一次出遠門就是渡海打仗。他總覺得知墨很面熟。' },
  揆一: { cat: '人物誌', fact: '史實', vol: '卷一',
    text: '揆一（Frederick Coyett），荷蘭東印度公司在臺灣的最後一任長官。他在鄭軍圍城期間堅守熱蘭遮城約九個月，1662 年初簽約投降。回到巴達維亞後被公司追究責任、判處流放，多年後才獲釋。後來出版了一本為自己辯護的書，記錄臺灣失守的經過。' },
  亨布魯克: { cat: '人物誌', fact: '史實', vol: '卷一',
    text: '亨布魯克（Antonius Hambroek），荷蘭改革宗牧師，在臺灣傳教多年。1661 年被鄭軍俘虜後，被派進熱蘭遮城勸守軍投降；他進城後卻鼓勵守軍堅守，然後依約返回鄭營，不久遭到處死。他的故事後來在荷蘭被改編成戲劇。本作中僅在史卷中提及。' },
  郭懷一: { cat: '人物誌', fact: '史實', vol: '卷一',
    text: '荷蘭時期赤崁一帶的漢人農民領袖。1652 年因不滿人頭稅與士兵的欺壓，號召農民起事，但計畫事先走漏，起事很快被公司的軍隊與原住民盟友鎮壓，郭懷一本人也在戰鬥中身亡。本作中他不直接登場，只從旁人的口中出現。' },
  蒂娃: { cat: '人物誌', fact: '虛構', vol: '卷一',
    text: '本作虛構的新港社少女（「蒂娃」為暫定名）。好奇、敢說話，是學校裡學羅馬字學得最快的孩子。她能看見知墨真正的樣子。' },
  // 典故
  荷蘭東印度公司: { cat: '典故', fact: '史實', vol: '卷一',
    text: '1602 年成立於荷蘭的貿易公司，擁有建立據點、締約與動用武力的權力。1624 年至 1662 年間統治臺灣西南部，以大員為貿易據點，經營鹿皮、糖與轉口貿易。' },
  鹿皮貿易: { cat: '典故', fact: '史實', vol: '卷一',
    text: '十七世紀的臺灣平原上有大量梅花鹿。荷蘭東印度公司把鹿皮大量輸往日本，多的時候一年可達數萬張。過度獵捕使梅花鹿逐漸減少，臺灣野生的梅花鹿族群後來一度消失，現今的族群是經過復育而來。' },
  赫克托號: { cat: '典故', fact: '史實', vol: '卷一',
    text: '荷蘭東印度公司的大型戰船。1661 年鄭軍抵達臺灣後不久，赫克托號在與鄭軍船隊的海戰中爆炸沉沒。這場海戰，以及同一時期北線尾沙洲上荷軍的敗退，讓公司失去了在海上與陸上正面阻擋鄭軍的力量。' },
  無名客: { cat: '典故', fact: '虛構', vol: '卷一',
    text: '蘅說，有些靈魂被「寫過很多次」。他們在不同的時代以不同的身分出生，不記得前世，卻會在某些人面前莫名地感到熟悉。' },
  西拉雅語的復振: { cat: '典故', fact: '史實', vol: '卷一',
    text: '西拉雅語曾經有很長一段時間沒有人在日常生活中使用。近年來，西拉雅族人與學者合作，以荷蘭時期傳教士留下的文獻和新港文書為基礎，重建族語的發音與詞彙，編寫教材、開設族語課程，讓孩子們重新學習祖先的語言。那些三百多年前被寫下的字，成了找回語言的線索。' },
  人頭稅: { cat: '典故', fact: '史實', vol: '卷一',
    text: '荷蘭東印度公司向在臺漢人按人頭徵收的稅，要求隨身攜帶繳稅證明。士兵常藉查驗之名勒索、毆打漢人，是漢人不滿的主要原因之一。' },
  郭懷一事件: { cat: '典故', fact: '史實', vol: '卷一',
    text: '1652 年 9 月，赤崁一帶的漢人農民在郭懷一的號召下起事，攻擊公司人員。公司調集士兵，並動員新港等社的原住民戰士協助鎮壓。短短十幾天內，數千名漢人被殺。這是荷蘭統治臺灣期間規模最大的漢人反抗事件。事件後，公司在赤崁興建了普羅民遮城。' },
  甘蔗與糖: { cat: '典故', fact: '史實', vol: '卷一',
    text: '荷蘭東印度公司鼓勵漢人移民來臺開墾，種植甘蔗、熬製砂糖，外銷到日本、波斯等地。糖後來成為臺灣最重要的產業之一，一直延續到二十世紀。' },
  唐人移民: { cat: '典故', fact: '史實', vol: '卷一',
    text: '十七世紀渡海來臺的漢人，多半來自福建沿海，當時的人常自稱「唐人」。他們大多是單身的年輕男性，來臺灣打工、開墾，有些人賺了錢就回鄉，有些人則留了下來。' },
  尪姨: { cat: '典故', fact: '史實', vol: '卷一',
    text: '西拉雅族傳統信仰中的女性祭司。荷蘭時期，傳教士為了推行基督教，將許多尪姨逐出部落。這項傳統並沒有因此斷絕，今天西拉雅族的阿立祖信仰仍由尪姨傳承。本作遵守原則：不把仍在延續的信仰寫成法術。' },
  蝕: { cat: '典故', fact: '虛構', vol: '序卷',
    text: '從史冊邊緣開始蔓延的「褪色」。被蝕吞噬的事物，會漸漸沒有人記得。它侵入人心時，會放大「想忘記」的念頭。' },
  萬象史冊: { cat: '典故', fact: '虛構', vol: '序卷',
    text: '人類所有被記住的事，都寫在這部看不見的書上。千萬人記得的「大字」墨跡太厚，誰也改不了；沒什麼人記得的「小字」，則可以改寫。' },
  無面書記: { cat: '妖物誌', fact: '虛構', vol: '卷一',
    text: '沒有五官的書記官，手持一支會抹去字跡的白筆。說話溫和有禮，似乎真心相信遺忘是一種仁慈。' },

  // ───── 卷二〈牧野〉 ─────
  歷史文物陳列館: { cat: '地理誌', fact: '史實', vol: '卷二',
    text: '中央研究院歷史語言研究所在臺北南港設立的博物館，展出史語所數十年來發掘與收藏的文物，包括殷墟出土的甲骨、青銅器與玉器，以及明清檔案等。' },
  大邑商: { cat: '地理誌', fact: '史實', vol: '卷二',
    text: '商朝後期的王都，位於今河南安陽的洹水兩岸，今天稱為「殷墟」。從盤庚遷殷到商朝滅亡的兩百多年間，這裡是商王處理政事與祭祀的中心。遺址中有宮殿宗廟、王陵、鑄銅與製骨作坊，以及大量的甲骨。傳世文獻說商朝最後一位王晚年常住在南方的朝歌，考古上仍有待更多證據。' },
  洹水: { cat: '地理誌', fact: '史實', vol: '卷二',
    text: '流經安陽的河流。殷墟的宮殿宗廟區就在洹水南岸的一個河灣裡，洹水像一道天然的護城河，繞過王都的北邊與東邊。' },
  甲骨文: { cat: '器物誌', fact: '史實', vol: '卷二',
    text: '刻在龜甲與獸骨上的文字，大多是商王室占卜的紀錄，是目前所知中國最早成系統的文字。一般認為在 1899 年首次被學者辨識出來。至今出土的甲骨約有十幾萬片，單字四千多個，能確定釋讀的約一千多個。甲骨文目前還沒有收進電腦的通用字碼，所以本作用筆畫畫出它們的樣子。' },
  卜骨: { cat: '器物誌', fact: '史實', vol: '卷二',
    text: '占卜用的牛肩胛骨與龜甲。貞人先在背面鑽鑿出成排的小凹槽，再用燒紅的木枝灼燒凹槽，正面就會爆出「卜」字形的裂紋，稱為「兆」。王或貞人依兆紋判斷吉凶，事後把占卜的日期、貞人、問題、判斷與應驗，刻在兆紋旁邊，有時還填上朱砂或墨。' },
  貨貝: { cat: '器物誌', fact: '史實', vol: '卷二',
    text: '商周時期珍貴的財物。離海很遠的中原把海貝視為寶物，常用來賞賜臣下，以「朋」為單位計算。青銅器銘文裡常見「賜貝若干朋」的紀錄。' },
  殷墟發掘: { cat: '典故', fact: '史實', vol: '卷二',
    text: '1928 年到 1937 年間，中央研究院歷史語言研究所在河南安陽進行了十五次科學發掘，由董作賓、李濟、梁思永等學者主持，出土了大量甲骨、青銅器與宮殿、王陵遺跡。1936 年的 YH127 坑，一次就出土了一萬七千多片甲骨。這批文物在戰亂中跟著史語所一路遷徙，後來渡海來到臺灣，今天有一部分在南港的歷史文物陳列館展出。' },
  貞人: { cat: '典故', fact: '史實', vol: '卷二',
    text: '替商王主持占卜的人。卜辭的開頭常寫「某日卜，某貞」，那個「某」就是貞人的名字。學者依照貞人的名字與字體，替甲骨分出不同的時期。' },
  人牲: { cat: '典故', fact: '史實', vol: '卷二',
    text: '以人作為祭品。殷墟的王陵與宗廟區發現了大量祭祀坑，卜辭中也常見「用羌」若干人的紀錄，有時一次多達數十、數百人。人牲多半來自戰爭中的俘虜，其中以羌人最多。到了周代，以人祭祀大幅減少，但以人殉葬仍延續到春秋戰國，並不是一夕之間就停止的。' },
  羌: { cat: '典故', fact: '史實', vol: '卷二',
    text: '商人對西方許多族群的泛稱。甲骨文的「羌」字，是一個頭上戴著羊角的人。羌人常是商人征伐的對象，被俘後用於勞役或祭祀。後來周武王伐商時，盟軍之中也有羌人。它與今天的羌族有什麼關係，學界仍有不同看法。' },
  帝辛: { cat: '人物誌', fact: '史實', vol: '卷二',
    text: '商朝最後一位王，周人與後世多稱他為「紂」。「酒池肉林」「炮烙」等暴君故事，大多出自周代以後的文獻。孔子的學生子貢就說過：「紂之不善，不如是之甚也。」——紂也許沒有那麼壞，只是天下的壞事都被算到了他的頭上。' },
  妌: { cat: '人物誌', fact: '虛構', vol: '卷二',
    text: '貞人箙的女兒。每天整治龜甲牛骨，偷偷在碎骨上練習刻字。「妌」這個字也出現在商王武丁時期的卜辭裡，是一位王婦的名字；本作只是借用這個字，與那位王婦無關。' },
  貞人箙: { cat: '人物誌', fact: '虛構', vol: '卷二',
    text: '妌的父親，王室的貞人之一。溫和、謹慎，刻字的手很穩。他常說：「不是我們決定，是兆決定。」' },
  宗廟: { cat: '地理誌', fact: '史實', vol: '卷二',
    text: '商王祭祀先王的地方。殷墟的宮殿宗廟區在洹水南岸，建在一座座夯土台基上，台基周圍發現了許多祭祀坑。商人相信死去的先王仍然能降福或降禍，所以祭祀非常頻繁。' },
  夯土: { cat: '器物誌', fact: '史實', vol: '卷二',
    text: '把黃土一層一層鋪上去，再用木杵反覆夯打，打得又平又硬。商代的宮殿、宗廟與城牆都建在夯土台基上。這是極費人力的工作。' },
  饕餮紋: { cat: '器物誌', fact: '史實', vol: '卷二',
    text: '商周青銅器上最常見的獸面紋樣：一對大眼、彎角、張開的嘴。「饕餮」這個名稱是宋代以後的學者取的，借用了古書裡一種貪吃怪獸的名字。商人自己怎麼稱呼它、它代表什麼，至今仍然沒有定論。' },
  鴞尊: { cat: '器物誌', fact: '史實', vol: '卷二',
    text: '做成貓頭鷹形狀的青銅酒器。殷墟婦好墓出土的一對鴞尊最為有名。鴞在商代器物上經常出現，後世卻漸漸把它看成不祥的鳥——同一種東西，在不同的時代有完全不同的意思。' },
  征人方: { cat: '典故', fact: '史實', vol: '卷二',
    text: '商朝末年的卜辭記錄了商王征伐「人方」的長途遠征。人方大約在今天的淮河一帶或山東，學界仍有不同看法。這類戰爭帶回的俘虜，常被用於勞役或祭祀。' },
  周原甲骨: { cat: '典故', fact: '史實', vol: '卷二',
    text: '1977 年起，在陝西岐山、扶風一帶的周原遺址出土了周人的甲骨，字刻得極小，有的要用放大鏡才看得清。其中有周人祭祀商朝先王的紀錄——在牧野之戰以前，周人也灼骨問卜，也曾經祭祀商的祖先。' },
  嵐: { cat: '人物誌', fact: '虛構', vol: '卷二',
    text: '十七想起來的名字。原本是他族人語言裡的一個音，意思是山上的風，和山頂的雲。知墨用漢字把它寫成「嵐」。' },
  十七: { cat: '人物誌', fact: '虛構', vol: '卷二',
    text: '被關在大邑商城西的羌人少年。被抓來的時候太小，已經不記得自己的名字，商人只用數字叫他。會用羊骨磨哨子，笑起來有一顆虎牙。' },
};

// 敵人第一次被擊敗時自動加入妖物誌
export function enemyCodexId(name) { return '妖・' + name; }
