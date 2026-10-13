import { clamp, smooth, noise, fbm, normalize, random, mix, type Vec3 } from './math';
export const SIZE=4.8, HALF=SIZE/2, BOTTOM=-1.24, TIDE=.58;
export function terrainHeight(x:number,z:number) {
 const a=(x+1.02)/.97,b=(z+.70)/1.20;
 const angle=Math.atan2(b,a);
 const r=Math.hypot(a,b)+.071*Math.sin(angle*9)+.052*noise(x*9,z*9)+.042*noise(x*4,z*4);
 const shelf=1.63*(1-smooth(1.12,2.02,r));
 const cliff=(1-smooth(.83,1.06,r))*(1.17+.38*fbm(x*3.7,z*3.7)+.14*Math.sin(x*4+z*2));
 const top=.24*(1-smooth(.0,.88,r))+.10*noise(x*6.8,z*6.8)*(1-smooth(.60,.83,r));
 const bay=.25*(1-smooth(.28,.88,Math.hypot(x-.18,z-.35)));
 const original=-1.075+.035*fbm(x*2.6,z*2.6)+shelf+cliff+top-bay;
 const beachR=Math.hypot((x+.42)/1.26,(z-.54)/.96);
 const cove=1-smooth(.49,.86,Math.hypot(x-.58,z-.83));
 const beach=-1.075+1.756*(1-smooth(.70,1.02,beachR))-.66*cove+.012*noise(x*16,z*16);
 return Math.max(original,beach);
}
export function terrainNormal(x:number,z:number):Vec3 { const e=.008;return normalize([terrainHeight(x-e,z)-terrainHeight(x+e,z),2*e,terrainHeight(x,z-e)-terrainHeight(x,z+e)]); }
export function terrainColor(x:number,z:number,y:number,n:Vec3):Vec3 {
 const grain=noise(x*41,z*41)*.035,variation=fbm(x*8,z*8)*.10;
 const sand:Vec3=[.69+grain,.53+grain,.30+grain];
 const rock:Vec3=[.30+variation,.31+variation,.275+variation];
 const grass:Vec3=[.17+variation*.4,.225+variation*.4,.065+variation*.2];
 const cliff=smooth(.67,.90,y);
 const vegetation=smooth(.64,.86,n[1])*smooth(.83,1.3,y);
 return sand.map((s,i)=>mix(s,mix(rock[i],grass[i],vegetation),cliff)) as Vec3;
}
export function roundXZ(x:number,z:number,r=.18):[number,number] { const a=HALF-r;const cx=clamp(x,-a,a),cz=clamp(z,-a,a);const dx=x-cx,dz=z-cz;const l=Math.hypot(dx,dz);return l>r?[cx+dx*r/l,cz+dz*r/l]:[x,z]; }
export interface Plant {position:Vec3;scale:number;angle:number;tint:Vec3;kind:'palm'|'tree'}
export function makePlants(count=65):Plant[] {
 const r=random(88271),out:Plant[]=[];let palms=0;
 for(let i=0;i<5000&&out.length<count;i++){
  const x=-2.10+r()*2.85,z=-2.10+r()*3.15,y=terrainHeight(x,z),n=terrainNormal(x,z);
  if(y<.66||y>2.05||n[1]<.73)continue;
  if(Math.hypot(x+1.03,z+.95)<.20)continue;
  const kind=y<.9?'palm':'tree';
  if(kind==='palm'&&palms>=8)continue;
  if(out.some(p=>Math.hypot(x-p.position[0],z-p.position[2])<(kind==='palm'?.27:.15)))continue;
  if(kind==='palm')palms++;
  out.push({position:[x,y-.025,z],scale:kind==='palm'?.20+r()*.12:.085+r()*.075,angle:r()*Math.PI*2,tint:[.078+r()*.038,.125+r()*.072,.020+r()*.031],kind});
 }
 return out;
}
export interface Rock {position:Vec3;scale:Vec3;angle:number;tint:Vec3}
export function makeRocks():Rock[] {
 const r=random(725);const out:Rock[]=[];
 const main: [number,number,number,number,number][]=[[1.35,.05,.38,.72,.33],[1.38,1.26,.24,.48,.28],[.45,1.65,.20,.35,.21],[-.15,-1.78,.24,.52,.25],[1.65,-1.35,.17,.32,.20],[-1.92,1.22,.17,.30,.2]];
 main.forEach(([x,z,sx,sy,sz])=>{const bed=terrainHeight(x,z)-.08,top=TIDE+sy*.53;out.push({position:[x,(top+bed)/2,z],scale:[sx,(top-bed)/2,sz],angle:r()*6,tint:[.34,.34,.29]});});
 for(let i=0;i<90;i++){
  const x=(r()-.5)*4.50,z=(r()-.5)*4.50,y=terrainHeight(x,z),s=.035+r()*.095;
  if(y>.90)continue;
  out.push({position:[x,y+s*.2,z],scale:[s*(.7+r()),s*(.6+r()*1.3),s],angle:r()*6.28,tint:[.34+r()*.1,.33+r()*.1,.24+r()*.08]});
 }
 return out;
}
export function makeTerrainMap(size:number):Float32Array {const d=new Float32Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const i=(y*size+x)*4;d[i]=terrainHeight((x+.5)/size*SIZE-HALF,(y+.5)/size*SIZE-HALF);d[i+3]=1;}return d;}
