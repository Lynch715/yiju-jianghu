# v0.17.0 新人物立绘

使用内置 imagegen 工具生成9张新人物全身透明立绘。完整提示词在`art/expansion-portrait-prompts.json`，同时纳入`art/enemy-prompts.json`的全敌人清单。

未改写原图保存在`assets/enemies/<id>.png`，新增9张大图由Git忽略，保持本地可用。发布素材为`assets/enemies/runtime/<id>.webp`，通过`npm run art:prepare`机械等比例缩小到480高，并压缩为带透明度的WebP；只在实际展示对应敌人时加载。新增角色id为qingchengguard、shenlong、riyueguard、dingmian、azi、jiumozhi、zuolengchan、renwoxing、dongfangbubai。

这批是原著人物的游戏改编外观，不对应影视演员。敌人动作、逐击反馈和界面布局沿用原系统。
