import { HALF, SIZE, BOTTOM, terrainHeight, terrainNormal, terrainColor, roundXZ } from './terrain';
import { normalize, noise, type Vec3 } from './math';
export interface GeometryData {positions:Float32Array;normals:Float32Array;colors:Float32Array;indices:Uint32Array;uvs?:Float32Array;}
const pack=(p:number[],n:number[],c:number[],i:number[],u?:number[]):GeometryData=>({positions:new Float32Array(p),normals:new Float32Array(n),colors:new Float32Array(c),indices:new Uint32Array(i),uvs:u?new Float32Array(u):undefined});
export function grid(segments:number,water=false):GeometryData {
 const p:number[]=[],n:number[]=[],c:number[]=[],ix:number[]=[],uv:number[]=[];
 for(let j=0;j<=segments;j++)for(let i=0;i<=segments;i++){
  const [x,z]=roundXZ(i/segments*SIZE-HALF,j/segments*SIZE-HALF),y=water?0:terrainHeight(x,z),normal:Vec3=water?[0,1,0]:terrainNormal(x,z);
  p.push(x,y,z);n.push(...normal);c.push(...(water?[1,1,1]:terrainColor(x,z,y,normal)));uv.push((x+HALF)/SIZE,(z+HALF)/SIZE);
 }
 for(let j=0;j<segments;j++)for(let i=0;i<segments;i++){const a=j*(segments+1)+i,b=a+segments+1;ix.push(a,b,a+1,b,b+1,a+1);}
 return pack(p,n,c,ix,uv);
}
function perimeter(steps=16,r=.18):[number,number][] {
 const a=HALF-r,out:[number,number][]=[];
 for(let k=0;k<4;k++){const angle0=k*Math.PI/2;const cx=(k===0||k===3)?a:-a,cz=k<2?a:-a;
  for(let j=0;j<=steps;j++){const angle=angle0+j/steps*Math.PI/2;out.push([cx+r*Math.cos(angle),cz+r*Math.sin(angle)]);}
 }
 return out;
}
export function sides(water=true):GeometryData {
 const q=perimeter(18),count=q.length,p:number[]=[],n:number[]=[],c:number[]=[],ix:number[]=[],uv:number[]=[];
 const rings=water?20:1;
 for(let i=0;i<=rings;i++)for(let j=0;j<count;j++){
  const [x,z]=q[j],prev=q[(j+count-1)%count],next=q[(j+1)%count];
  const normal=normalize([next[1]-prev[1],0,prev[0]-next[0]]),t=i/rings;
  const y=water?t:BOTTOM+(terrainHeight(x,z)-BOTTOM)*t;
  // Keep the opaque substrate inside the resin, avoiding coplanar depth fighting.
  p.push(x*(water?1:.997),y,z*(water?1:.997));n.push(...normal);c.push(.52,.36,.19);uv.push((x+HALF)/SIZE,(z+HALF)/SIZE);
 }
 for(let i=0;i<rings;i++)for(let j=0;j<count;j++){const a=i*count+j,b=i*count+(j+1)%count;ix.push(a,a+count,b,b,a+count,b+count);}
 return pack(p,n,c,ix,uv);
}
export function sphere(lat=10,lon=14,jagged=false):GeometryData {
 const p:number[]=[],n:number[]=[],c:number[]=[],ix:number[]=[];
 for(let y=0;y<=lat;y++)for(let x=0;x<=lon;x++){
  const a=x/lon*Math.PI*2,b=y/lat*Math.PI;
  const normal:Vec3=[Math.sin(b)*Math.cos(a),Math.cos(b),Math.sin(b)*Math.sin(a)];
  const v=jagged?1+.22*noise(normal[0]*5+normal[1]*3,normal[2]*5)-.065*Math.cos(b*13):1;
  p.push(normal[0]*v,normal[1]*v,normal[2]*v);n.push(...normal);const col=1+noise(normal[0]*9,normal[2]*9)*.13;c.push(col,col,col);
 }
 for(let y=0;y<lat;y++)for(let x=0;x<lon;x++){const a=y*(lon+1)+x,b=a+lon+1;ix.push(a,a+1,b,b,a+1,b+1);}
 return pack(p,n,c,ix);
}
export function cylinder(sidesN=8):GeometryData {
 const p:number[]=[],n:number[]=[],c:number[]=[],ix:number[]=[];
 for(let y=0;y<=1;y++)for(let i=0;i<=sidesN;i++){const a=i/sidesN*Math.PI*2,s=y?.57:1;p.push(Math.cos(a)*s,y,Math.sin(a)*s);n.push(Math.cos(a),.05,Math.sin(a));c.push(1,1,1);}
 for(let i=0;i<sidesN;i++){const a=i,b=i+sidesN+1;ix.push(a,b,a+1,a+1,b,b+1);}
 return pack(p,n,c,ix);
}
export function leaf():GeometryData {
 const p:number[]=[],n:number[]=[],c:number[]=[],ix:number[]=[];
 for(let i=0;i<=10;i++){const t=i/10,w=Math.sin(t*Math.PI)*.15;for(const s of [-1,1]){p.push(t,Math.sin(t*Math.PI)*.24-t*t*.2,s*w);n.push(-.1,1,s*.2);c.push(1-t*.2,1-t*.12,1-t*.2);}}
 for(let i=0;i<10;i++){const a=i*2;ix.push(a,a+1,a+2,a+1,a+3,a+2,a+2,a+1,a,a+2,a+3,a+1);}
 return pack(p,n,c,ix);
}
export function ground():GeometryData {return pack([-60,-1.28,-60,-60,-1.28,60,60,-1.28,-60,60,-1.28,60],[0,1,0,0,1,0,0,1,0,0,1,0],[.80,.74,.64,.80,.74,.64,.80,.74,.64,.80,.74,.64],[0,1,2,1,3,2]);}
