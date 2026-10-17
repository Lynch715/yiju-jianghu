// Lightweight engraved map marks; no bitmap downloads or font-dependent pictograms.
const travelMarks={
 battle:'<path d="m9 5 10 10m-7-11 8 8-4 4-8-8Zm9 15 4 4M7 18 3 22m17-17L6 19M4 16l4 4"/>',
 elite:'<path d="m5 22 2-10 5-7 5 7 2 10ZM7 12h10M9 18h6M12 2v4"/><path d="m3 5 2 2m14 0 2-2"/>',
 boss:'<path d="M3 22h18M5 22V10l7-7 7 7v12M2 10l10-9 10 9M9 22v-8h6v8M8 10h8"/>',
 rest:'<path d="M7 20q-6-5 0-11-1 4 2 3l4-10q0 7 5 10 5 6-1 9-6 3-10-1ZM5 24l14-3M5 21l14 3"/>',
 shop:'<path d="m3 10 3-7h12l3 7ZM4 10v12h16V10M8 22v-7h8v7M3 10q2 5 5 0 2 5 4 0 2 5 4 0 3 5 5 0"/>',
 event:'<path d="M5 4h15v16H6M5 4q-3 0-3 4h4V4M6 16H2q0 7 4 7h12q4 0 4-4h-4v4M10 8h6m-6 4h5"/>',
 treasure:'<path d="M3 11h18v11H3ZM3 11V8q9-8 18 0v3M3 15h18M9 3v8m6-8v8"/><path d="M10 13h4v5h-4Z"/>',
};
export function travelMark(kind){return `<svg viewBox="0 0 24 26" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${travelMarks[kind]||travelMarks.event}</svg>`;}
export function travelTerrain(chapter,height){
 const water=['#486e64','#566776','#637b71'][chapter],peaks=[];
 for(let i=0;i<8;i++){const x=i%2?510:15,y=145+i*175;peaks.push(`<g transform="translate(${x} ${y})" opacity="${.24+(i%3)*.04}"><path d="m0 100 38-59 14 18 42-60 56 102 28-44 46 62H0Z" fill="#314a3c"/><path d="m28 73 24-14 42-60 27 49 29 53M65 47l29-48 1 45 22 22" fill="none" stroke="#9b9c72" stroke-width="1"/></g>`);}
 return `<svg class="travel-terrain" viewBox="0 0 720 ${height}" preserveAspectRatio="none" aria-hidden="true"><defs><pattern id="travel-paper" width="31" height="37" patternUnits="userSpaceOnUse"><path d="m2 7 3-1m19 17 4 1M9 33h2" stroke="#d5c499" stroke-opacity=".05"/></pattern><linearGradient id="travel-water" x2="1" y2="1"><stop stop-color="${water}" stop-opacity=".12"/><stop offset=".5" stop-color="${water}" stop-opacity=".38"/><stop offset="1" stop-color="${water}" stop-opacity=".1"/></linearGradient></defs><rect width="720" height="${height}" fill="#1d2b24"/><rect width="720" height="${height}" fill="url(#travel-paper)"/><path d="M440 -80C220 80 580 240 400 440S170 700 390 900s-130 310-30 530l65 210h110l-100-240C330 1210 660 1050 480 850S390 650 515 450 350 160 550-80Z" fill="url(#travel-water)"/><path d="M472 -80C255 80 605 240 440 440S210 700 430 900s-130 310-20 530l65 210" fill="none" stroke="${water}" stroke-opacity=".24" stroke-width="2"/>${peaks.join('')}<g fill="none" stroke="#849077" opacity=".2"><path d="M50 340q25-12 48 0m-36 8q19-9 33 0m490 472q22-11 49 0m-40 8q17-8 33 0M70 1320q30-14 50 0m-38 8q21-8 32 0"/></g></svg>`;
}
