// Render the editable vector mark into browser / home-screen PNG sizes.
// Use installed sharp, or SHARP_MODULE_PATH to point to an existing sharp module.
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),sharp=require(process.env.SHARP_MODULE_PATH||'sharp');
const root=new URL('../assets/icons/',import.meta.url);
for(const [file,size] of [['icon-512.png',512],['icon-192.png',192],['apple-touch-icon.png',180],['favicon-32.png',32]]){
 await sharp(fileURLToPath(new URL('icon.svg',root)),{density:192}).resize(size,size).png({compressionLevel:9,palette:true,colours:128}).toFile(fileURLToPath(new URL(file,root)));
 console.log(`${file}: ${size}×${size}`);
}
