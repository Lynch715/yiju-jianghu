# 三章轻量战斗场景图

v0.16.2使用内置 imagegen 生成的绘画场景，替代v0.16.1的几何矢量背景。三个完整提示词保存在`art/battle-prompts-v2.json`。

| 章节 | 场景 | 发布素材 | 尺寸 | 字节数 |
|---|---|---|---|---|
| 一 | 江南烟雨：石桥、水岸、柳树、远山 | assets/battles/runtime/jiangnan.webp | 840×560 | 72,140 |
| 二 | 中州古道：山路、石关、夕照 | assets/battles/runtime/zhongzhou.webp | 960×640 | 70,556 |
| 三 | 华山云巅：花岗岩石峰、云海、古松 | assets/battles/runtime/huashan.webp | 960×640 | 69,566 |

三图合计212,262字节。全尺寸原始PNG保存在本地`assets/battles/originals/`，保持不改写并由Git忽略；发布仓库仅携带上述运行用WebP。生成后使用`npm run art:battles`执行机械缩放和WebP压缩（需安装cwebp），单图预算72 KiB。各图实际参数保存在`art/battle-art-sizes-v2.json`。

`battle-art.js`按章节提供一张图片，网页版只加载当前场景。`npm run build`将三个WebP内嵌进独立HTML；`npm run build:pages`将它们作为独立静态文件部署。没有增加外部字体、服务或在线绘图依赖。

绘画在中心留出开阔空间，使用低噪声、柔和明暗；CSS采用居中裁切，透明度0.76并加静态暗部渐变。装饰层位于既有角色面板后方，pointer-events:none及aria-hidden，不占焦点、不改变布局，也没有背景动画、滤镜或额外绘制循环。

应用内浏览器检查三章的390×844和320×640三敌人展开手牌布局，以及单敌人与1280×800桌面；各图正常解码，无横向溢出。独立版确认图片为内嵌WebP。自动化测试641项通过。仅调整背景与构建资源，战斗逻辑、随机数与存档格式未修改；未进行实体手机性能测量。
