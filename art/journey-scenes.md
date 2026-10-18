# 江湖途中轻量场景图

v0.16.3将八种奇遇、行商驿站、松间歇脚、洞中遗藏和战后奖励的页头改为绘画场景，与三章战斗背景保持相同的山水、旧木石材和灰青墨绿风格。原有八种操作小图标仍为轻量内联SVG，卡牌和奇物立绘沿用原素材。

使用内置 imagegen 生成，以`assets/battles/runtime/jiangnan.webp`仅作绘画风格参考。完整提示词见`art/journey-prompts-v2.json`。未改写的全尺寸原图保存在本地`assets/journey/originals/`，该目录被Git忽略；发布仅包含下表中的WebP。

| 场景 | 发布素材 | 宽度 | 字节数 |
|---|---|---|---|
| 行商驿站 | assets/journey/runtime/shop.webp | 840 px | 46,616 |
| 松间茶亭 | assets/journey/runtime/rest.webp | 960 px | 47,348 |
| 松下高人 | assets/journey/runtime/master.webp | 840 px | 47,364 |
| 破庙藏珍 | assets/journey/runtime/shrine.webp | 960 px | 46,260 |
| 行医石桥 | assets/journey/runtime/traveller.webp | 840 px | 46,976 |
| 绝壁留书 | assets/journey/runtime/cliff.webp | 960 px | 48,290 |
| 山野药庐 | assets/journey/runtime/clinic.webp | 840 px | 48,506 |
| 行脚旧匣 | assets/journey/runtime/cache.webp | 840 px | 47,738 |
| 残碑悟武 | assets/journey/runtime/stone.webp | 960 px | 48,342 |
| 渡口试手 | assets/journey/runtime/ferry.webp | 960 px | 38,936 |
| 洞中遗藏 | assets/journey/runtime/treasure.webp | 960 px | 45,812 |
| 交锋有悟 | assets/journey/runtime/reward.webp | 960 px | 48,784 |

12张运行素材合计560,972字节（约548 KiB），每张最多48 KiB，按当前界面只加载一张，不预加载整套。运行`npm run art:journey`使用cwebp机械缩放与压缩，结果参数见`art/journey-art-sizes-v2.json`。

场景仅覆盖页头，不延伸到下方的卡牌、奇物和操作面板。标题侧使用静态暗部渐变，图片不响应点击和拖拽，无动画、滤镜或额外绘制循环。手机390宽的卡牌仍为151×224，320宽仍为126×224，商品和奇物保留双列；查看完整牌面和购买分开操作。

网页版使用独立静态WebP；独立HTML内嵌12张场景，可离线使用。卡牌、奇物、奖励抽取、价格、事件效果、战斗及存档规则未修改。
