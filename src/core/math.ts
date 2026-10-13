export type Vec3 = [number, number, number];
export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export function smooth(a: number, b: number, x: number) { const t = clamp((x-a)/(b-a)); return t*t*(3-2*t); }
export function random(seed: number) { let a=seed|0; return () => { a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function hash(x: number, y: number) { let h = Math.imul(x,374761393)+Math.imul(y,668265263); h=Math.imul(h^h>>>13,1274126177); return ((h^h>>>16)>>>0)/4294967295; }
export function noise(x: number, y: number) { const i=Math.floor(x),j=Math.floor(y); let u=x-i,v=y-j; u=u*u*(3-2*u);v=v*v*(3-2*v);return mix(mix(hash(i,j),hash(i+1,j),u),mix(hash(i,j+1),hash(i+1,j+1),u),v)*2-1; }
export function fbm(x: number,y: number) { return noise(x,y)*.58+noise(x*2.04+13,y*2.04-7)*.27+noise(x*4.1-5,y*4.1+11)*.15; }
export function normalize(v: ArrayLike<number>): Vec3 { const l=Math.hypot(v[0],v[1],v[2])||1;return [v[0]/l,v[1]/l,v[2]/l]; }
export const cross=(a:ArrayLike<number>,b:ArrayLike<number>):Vec3=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const dot=(a:ArrayLike<number>,b:ArrayLike<number>)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
export function identity() { return new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]); }
export function multiply(a:Float32Array,b:Float32Array) {const o=new Float32Array(16);for(let j=0;j<4;j++) for(let i=0;i<4;i++) o[j*4+i]=a[i]*b[j*4]+a[4+i]*b[j*4+1]+a[8+i]*b[j*4+2]+a[12+i]*b[j*4+3];return o;}
export function perspective(fov:number,aspect:number,near:number,far:number) {const f=1/Math.tan(fov/2),o=new Float32Array(16);o[0]=f/aspect;o[5]=f;o[10]=(far+near)/(near-far);o[11]=-1;o[14]=2*far*near/(near-far);return o;}
export function ortho(l:number,r:number,b:number,t:number,n:number,f:number) { const o=identity();o[0]=2/(r-l);o[5]=2/(t-b);o[10]=-2/(f-n);o[12]=-(r+l)/(r-l);o[13]=-(t+b)/(t-b);o[14]=-(f+n)/(f-n);return o; }
export function lookAt(eye:Vec3,target:Vec3,up:Vec3=[0,1,0]) { const z=normalize([eye[0]-target[0],eye[1]-target[1],eye[2]-target[2]]),x=normalize(cross(up,z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]); }
export function inverse(a:Float32Array) { const out=new Float32Array(16);const m=Array.from({length:4},(_,r)=>Array.from({length:8},(_,c)=>c<4?a[c*4+r]:+(c-4===r)));for(let i=0;i<4;i++){let p=i;for(let j=i+1;j<4;j++)if(Math.abs(m[j][i])>Math.abs(m[p][i]))p=j;[m[i],m[p]]=[m[p],m[i]];let d=m[i][i];if(Math.abs(d)<1e-10)return identity();for(let k=0;k<8;k++)m[i][k]/=d;for(let j=0;j<4;j++)if(j!==i){d=m[j][i];for(let k=0;k<8;k++)m[j][k]-=d*m[i][k];}}for(let r=0;r<4;r++)for(let c=0;c<4;c++)out[c*4+r]=m[r][c+4];return out;}
export function transform(m:Float32Array,p:Vec3,w=1):Vec3 {const d=m[3]*p[0]+m[7]*p[1]+m[11]*p[2]+m[15]*w;return [(m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12]*w)/d,(m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13]*w)/d,(m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]*w)/d];}
export function compose(position:Vec3,scale:Vec3,angle=0) {const c=Math.cos(angle),s=Math.sin(angle);return new Float32Array([c*scale[0],0,-s*scale[0],0,0,scale[1],0,0,s*scale[2],0,c*scale[2],0,...position,1]);}
export function hexToLinear(hex:string):Vec3 { const v=parseInt(hex.replace('#',''),16);return [v>>16&255,v>>8&255,v&255].map(x=>Math.pow(x/255,2.2)) as Vec3; }
