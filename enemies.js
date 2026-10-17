// Novel-inspired combat adaptations. Artwork is original and does not depict actors.
const roster=[
 {id:'qingcheng',name:'青城弟子',rank:'normal',chapter:0,hp:28,faction:'青城派',source:'笑傲江湖',trait:'松风剑与掌法交替，摧心掌施加破绽。',moves:[{label:'松风剑',damage:5},{label:'摧心掌',damage:6,vuln:1},{label:'青城步法',block:5}]},
 {id:'songshan',name:'嵩山门人',rank:'normal',chapter:0,hp:30,faction:'嵩山派',source:'笑傲江湖',trait:'剑掌交替，以虚弱削减你的攻击。',moves:[{label:'嵩山剑法',damage:6},{label:'嵩阳掌',damage:4,weak:1},{label:'剑阵守势',block:6}]},
 {id:'xingxiu',name:'星宿弟子',rank:'normal',chapter:1,hp:29,faction:'星宿派',source:'天龙八部',trait:'毒爪施毒，化功掌把气滞塞入弃牌堆。',moves:[{label:'三阴蜈蚣爪',damage:4,poison:1},{label:'化功毒掌',damage:4,status:1},{label:'星宿护身',block:5}]},
 {id:'xuedao',name:'血刀门人',rank:'normal',chapter:1,hp:31,faction:'血刀门',source:'连城诀',trait:'连刀追击；饮血式只有伤及气血才能回血。',moves:[{label:'血刀连斩',damage:3,hits:2},{label:'追命斩',damage:7},{label:'饮血式',damage:5,leech:3}]},
 {id:'baituo',name:'白驼山门人',rank:'normal',chapter:2,hp:36,faction:'白驼山',source:'射雕英雄传',trait:'灵蛇杖施毒，蓄势增长劲力，再发动连击。',moves:[{label:'灵蛇杖',damage:6,poison:1},{label:'白驼蓄势',block:6,str:1},{label:'蛇行突袭',damage:4,hits:2}]},
 {id:'riyue',name:'日月教高手',rank:'normal',chapter:2,hp:35,faction:'日月神教',source:'笑傲江湖',trait:'连剑与破防交替，回剑时获得格挡。',moves:[{label:'日月连剑',damage:4,hits:2},{label:'破防剑',damage:6,vuln:1},{label:'回剑护身',block:7}]},
 {id:'mugaofeng',name:'木高峰',rank:'elite',chapter:0,hp:52,faction:'塞北明驼',source:'笑傲江湖',trait:'驼背藏刀兼顾攻守，趁破绽发动偷袭。',moves:[{label:'驼峰刀',damage:8},{label:'藏刀守势',damage:4,block:7},{label:'擦身偷袭',damage:5,vuln:2}]},
 {id:'tianboguang',name:'田伯光',rank:'elite',chapter:0,hp:54,faction:'独行快刀客',source:'笑傲江湖',trait:'快刀每段单独结算格挡与反震，回刀后再次连斩。',moves:[{label:'快刀三叠',damage:3,hits:3},{label:'疾风刀',damage:5,hits:2},{label:'回刀蓄势',block:8}]},
 {id:'xuedaolaozu',name:'血刀老祖',rank:'elite',chapter:1,hp:78,faction:'血刀门',source:'连城诀',trait:'血海狂刀伤及气血时，回复至多4气血；完全格挡可阻止回血。',moves:[{label:'血刀刀法',damage:5,hits:2},{label:'血海狂刀',damage:10,leech:4},{label:'刀僧养息',block:10}]},
 {id:'hebiweng',name:'鹤笔翁',rank:'elite',chapter:1,hp:38,faction:'玄冥二老',source:'倚天屠龙记',trait:'阴劲施加虚弱、寒气；鹤杖为同伴提供格挡。',moves:[{label:'玄冥阴劲',damage:4,weak:1},{label:'寒鹤掌',damage:4,chill:1},{label:'鹤杖横挡',block:6,allyBlock:4}]},
 {id:'luzhangke',name:'鹿杖客',rank:'elite',chapter:1,hp:42,faction:'玄冥二老',source:'倚天屠龙记',trait:'鹤笔翁存活时，玄冥合击每段额外造成2伤害；击败一人可拆解配合。',moves:[{label:'鹿杖重击',damage:8},{label:'玄冥合击',damage:7,partner:'hebiweng',combo:2},{label:'鹿杖护身',block:7}]},
 {id:'chengkun',name:'成昆',rank:'elite',chapter:2,hp:96,faction:'混元霹雳手',source:'倚天屠龙记',trait:'幻阴指造成寒气，扰心塞入气滞，随后发动霹雳掌。',moves:[{label:'幻阴指',damage:7,chill:1},{label:'混元功',block:12},{label:'阴谋扰心',status:2},{label:'霹雳掌',damage:13}]},
 {id:'jinlun',name:'金轮法王',rank:'elite',chapter:2,hp:100,faction:'金轮法王',source:'神雕侠侣',trait:'轮刃多段攻击；龙象蓄力增长劲力，久战愈强。',moves:[{label:'五轮连击',damage:3,hits:3},{label:'龙象蓄力',block:10,str:2},{label:'金轮重击',damage:13},{label:'护轮式',damage:5,block:6}]},
 {id:'yucanghai',name:'余沧海',rank:'boss',chapter:0,hp:90,faction:'青城掌门',source:'笑傲江湖',trait:'松风剑试探，摧心掌施加2回合破绽，再以三峡剑重击；守势时可整备。',moves:[{label:'松风剑法',damage:5,hits:2},{label:'摧心掌',damage:6,vuln:2},{label:'三峡剑',damage:12},{label:'鹤唳九霄',block:12}]},
 {id:'dingchunqiu',name:'丁春秋',rank:'boss',chapter:1,hp:130,faction:'星宿老仙',source:'天龙八部',trait:'化功大法塞气滞并压制下回合真气，三笑逍遥散施毒；精简牌组和消耗状态可应对。',moves:[{label:'化功大法',status:1,chill:1},{label:'三笑逍遥散',damage:8,poison:2},{label:'星宿护身',block:12},{label:'腐骨掌',damage:12,status:1}]},
 {id:'ouyangfeng',name:'欧阳锋',rank:'boss',chapter:2,hp:185,faction:'西毒',source:'射雕英雄传',trait:'蓄势为下一次攻击增加4伤害；气血不高于一半时切换逆练阶段，清除旧蓄力并重置招式顺序。',moves:[{label:'灵蛇杖法',damage:7,hits:2},{label:'蛤蟆蓄势',block:14,charge:4},{label:'蛤蟆功',damage:19},{label:'白驼守势',block:10}],enragedMoves:[{label:'逆练蛤蟆功',block:10,str:1,charge:2},{label:'逆转经脉',damage:4,hits:3},{label:'疯魔蛇杖',damage:14,poison:1}]}
];
export const ENEMIES=roster.map(d=>({...d,art:`assets/enemies/runtime/${d.id}.png`}));
export const ENEMY=Object.fromEntries(ENEMIES.map(d=>[d.id,d]));
// Encounter lineups are original game scenarios, rather than claims of novel alliances.
const group=(title,ids,extra={})=>({title,ids,...extra});
export const ENCOUNTER_GROUPS=[
 {normal:[group('青城探路',['qingcheng']),group('嵩山拦路',['songshan']),group('松风双剑',['qingcheng','qingcheng']),group('嵩山双卫',['songshan','songshan']),group('剑掌夹击',['qingcheng','songshan']),group('三路合围',['qingcheng','qingcheng','songshan'])],
  elite:[group('塞北明驼',['mugaofeng']),group('独行快刀',['tianboguang']),group('驼刀伏击',['mugaofeng','qingcheng'],{escorts:true}),group('快刀堵路',['tianboguang','songshan'],{escorts:true})],
  boss:group('青城掌门与门徒',['yucanghai','qingcheng'],{escorts:true})},
 {normal:[group('星宿探子',['xingxiu']),group('血刀游骑',['xuedao']),group('毒刃夹击',['xingxiu','xuedao']),group('星宿双徒',['xingxiu','xingxiu']),group('血刀双僧',['xuedao','xuedao']),group('毒阵藏刀',['xingxiu','xingxiu','xuedao']),group('双刀护毒',['xuedao','xuedao','xingxiu'])],
  elite:[group('血刀老祖',['xuedaolaozu']),group('玄冥二老',['hebiweng','luzhangke']),group('血刀师徒',['xuedaolaozu','xuedao'],{escorts:true}),group('血刀围猎',['xuedaolaozu','xuedao','xuedao'],{escorts:true})],
  boss:group('星宿老仙与门徒',['dingchunqiu','xingxiu','xingxiu'],{escorts:true})},
 {normal:[group('白驼哨卫',['baituo']),group('日月游侠',['riyue']),group('蛇杖连剑',['baituo','riyue']),group('日月双剑',['riyue','riyue']),group('白驼双卫',['baituo','baituo']),group('灵蛇剑阵',['baituo','baituo','riyue']),group('双剑蛇影',['riyue','riyue','baituo'])],
  elite:[group('混元霹雳手',['chengkun']),group('五轮法王',['jinlun']),group('阴谋同党',['chengkun','riyue'],{escorts:true}),group('五轮压阵',['jinlun','riyue','riyue'],{escorts:true})],
  boss:group('西毒与白驼门人',['ouyangfeng','baituo'],{escorts:true})}
];
// Keep ID-only rosters for old-save identity migration and tooling.
export const ENCOUNTERS=ENCOUNTER_GROUPS.map(ch=>({normal:ch.normal.map(x=>x.ids),elite:ch.elite.map(x=>x.ids),boss:ch.boss.ids}));
export const ENEMY_RANK={normal:'普通',elite:'精英',boss:'首领'};
