// Static, original chapter scenery. Decorative only: no images, filters, masks or animation.
const battleScenes=[
 {name:'江南烟雨',tone:'jiangnan',base:'#1b2c24',body:`
 <circle cx="754" cy="122" r="69" fill="#5a6d52" opacity=".25"/>
 <path d="m-50 288 124-157 122 108 133-157 162 194 143-126 115 103 159-151 112 176v362H-50Z" fill="#435f4d" opacity=".42"/>
 <path d="m-40 343 182-120 153 119 152-76 133 82 143-112 269 131v273H-40Z" fill="#3b5746" opacity=".54"/>
 <path d="M0 414q179-35 319 14t329-7 312 0v219H0Z" fill="#354e42"/>
 <path d="M0 411q198-21 338 13t622-2M72 476h198m289-11h281M8 541h306m157-12h414M185 594h203m234-8h249" fill="none" stroke="#74846a" stroke-width="3" opacity=".28"/>
 <path d="M291 444q190-116 389 0v19H291Z" fill="#68775b" opacity=".55"/>
 <path d="M341 451q138-83 288 0" fill="none" stroke="#263f35" stroke-width="21"/>
 <path d="M305 440v-34m56 3v-33m59 14v-31m64 23v-31m66 40v-32m59 50v-31m57 62v-33" stroke="#8b9271" stroke-width="5" opacity=".38"/>
 <path d="M789 371h153v68H789Zm-25-2 100-64 105 64Z" fill="#263e32"/>
 <path d="m778 364 86-51 91 51m-148 15v59m112-59v59" stroke="#728064" stroke-width="5" fill="none" opacity=".5"/>
 <path d="M115 453q51-109 26-307l-14-38 8 146-37 195Z" fill="#2c4434"/>
 <path d="M140 170Q75 151 21 210m121-18q-39 25-52 101m51-90q53 19 65 96m-68-81q-72 6-113 112" fill="none" stroke="#647653" stroke-width="8" opacity=".55"/>
 <path d="m39 218-15 57m56-74-12 68m38-49-8 83m59-65 10 84m15-58 21 62" stroke="#76815b" stroke-width="4" opacity=".34"/>
 <path d="M0 340q235-34 506-4t454-17M0 389q228-17 451 5t509-12" fill="none" stroke="#8b9780" stroke-width="11" opacity=".07"/>`},
 {name:'中州古道',tone:'zhongzhou',base:'#29291f',body:`
 <circle cx="720" cy="120" r="62" fill="#8b784b" opacity=".18"/>
 <path d="m-34 316 114-133 101 86 160-157 151 139 169-83 145 98 185-117 55 171v320H-34Z" fill="#665b3f" opacity=".38"/>
 <path d="m-30 380 181-84 141 72 173-110 149 93 145-92 214 119v262H-30Z" fill="#55583d" opacity=".55"/>
 <path d="M-60 450q254-117 481-7l147-4q228-94 435 5v196H-60Z" fill="#444c35"/>
 <path d="m441 417-193 223h540L546 417Z" fill="#77704a" opacity=".3"/>
 <path d="m460 444-61 182m122-182 75 182M412 470h143m-185 48h249m-307 63h399" fill="none" stroke="#a08e5e" stroke-width="3" opacity=".18"/>
 <path d="M716 291h170v151H716Zm-16-14 101-48 103 48v18H700Z" fill="#2c382b"/>
 <path d="M766 443V340q32-49 67 0v103" fill="#1e2b23"/>
 <path d="M722 313h158m-158 32h36m81 0h41m-155 34h34m81 0h39" stroke="#7c8059" stroke-width="4" opacity=".35"/>
 <path d="M153 441V238m-11 0h29" stroke="#79805a" stroke-width="6"/>
 <path d="M159 246h72l-17 36 17 39h-72Z" fill="#80583c" opacity=".43"/>
 <path d="m144 447 28-37 40 16-12 28m-136 59 40-35 37 20-12 25m698-37 45-36 60 29-24 30" fill="#60704b" opacity=".35"/>
 <path d="M64 341q30-46 19-104l-7-22 2 72-27 55" fill="#32422e"/>
 <path d="m81 237-49 12 21-26 28-5 41 20-43-1 23 25-65 7" fill="#65734b" opacity=".6"/>
 <path d="M0 395q235-31 491 1t469-12" fill="none" stroke="#a6a17a" stroke-width="10" opacity=".06"/>`},
 {name:'华山云巅',tone:'huashan',base:'#202a2e',body:`
 <circle cx="732" cy="113" r="64" fill="#8a9a93" opacity=".14"/>
 <path d="m-50 395 177-218 67 110L344 58l112 284L611 109l98 211 125-188 173 269v239H-50Z" fill="#566b6d" opacity=".43"/>
 <path d="m298 127 46-69 36 92-32-21-19 7Zm276 35 37-53 28 61-29-14Z" fill="#9aa69a" opacity=".22"/>
 <path d="m-20 480 162-162 94 136 168-218 102 187 133-146 153 188 125-151 64 166v160H-20Z" fill="#435d5e" opacity=".52"/>
 <path d="m348 325 56-89 46 84-38-20-35 36m249 25 42-73 36 44-25-4-30 38" fill="none" stroke="#80928a" stroke-width="4" opacity=".25"/>
 <path d="M-20 513q207-62 430-8t563-11M-20 553q197-41 432-9t561-9" fill="none" stroke="#8eaba4" stroke-width="28" opacity=".08"/>
 <path d="m255 578 125-75 248 4 101 71-88 62H281Z" fill="#4d6460" opacity=".65"/>
 <path d="m255 578 148-37 225 2 101 35m-326-37-23-38m248 4v36" fill="none" stroke="#8a9b88" stroke-width="3" opacity=".4"/>
 <path d="M746 479v-89m119 50v-92m-119 62q51 22 119-41m-119 64q61 20 119-38" stroke="#738b81" stroke-width="4" fill="none" opacity=".44"/>
 <path d="M102 510q35-97 22-215l-16-28 7 104-35 130Z" fill="#2c4740"/>
 <path d="m121 311-74 15 37-32 46-7 55 27-62-2 47 31-104 6m60 7-87 31 44-39 43-4 56 30-60-5 28 29-94 2" fill="#6b8070" opacity=".45"/>
 <path d="M0 438q233-45 441-4t519-10" fill="none" stroke="#9bb5ad" stroke-width="13" opacity=".07"/>`}
];
// Choosing a chapter is a pure lookup, independent of saves, combat state and RNG.
export function battleBackdrop(chapter){const scene=battleScenes[chapter]||battleScenes[0];return `<div class="battle-scenery tone-${scene.tone}" data-battle-scene="${scene.name}" aria-hidden="true"><svg viewBox="0 0 960 640" preserveAspectRatio="none" focusable="false" xmlns="http://www.w3.org/2000/svg"><path fill="${scene.base}" d="M0 0h960v640H0Z"/><g stroke-linecap="round" stroke-linejoin="round">${scene.body}</g></svg></div>`;}
