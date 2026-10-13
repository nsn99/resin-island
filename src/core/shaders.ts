// All lighting patterns and waves are procedural. No image textures or models.
export const fullScreenVertex = `#version 300 es
precision highp float;precision highp int;
out vec2 vUv;
void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);vUv=p;gl_Position=vec4(p*2.-1.,0.,1.);}`;
export const jellyGLSL = `
uniform vec2 uJelly;
vec3 jelly(vec3 p){float w=clamp((p.y+1.24)/1.82,0.,1.45);p.xz+=uJelly*w*w;p.y-=dot(uJelly,p.xz)*w*.16;return p;}
vec3 jellyNormal(vec3 n,vec3 p){float w=clamp((p.y+1.24)/1.82,0.,1.45);n.y-=dot(n.xz,uJelly)*2.*w/1.82;return normalize(n);}
`;
export const opaqueVertex = `#version 300 es
precision highp float;precision highp int;
layout(location=0) in vec3 aPosition;layout(location=1) in vec3 aNormal;layout(location=2) in vec3 aColor;
layout(location=3) in mat4 aInstance;layout(location=7) in vec3 aTint;
uniform mat4 uVP,uLightVP;uniform int uInstanced,uGround;
out vec3 vWorld,vNormal,vColor;out vec4 vLight;
${jellyGLSL}
void main(){vec3 p=aPosition,n=aNormal,c=aColor;if(uInstanced==1){p=(aInstance*vec4(p,1.)).xyz;vec3 scales=vec3(length(aInstance[0].xyz),length(aInstance[1].xyz),length(aInstance[2].xyz));n=mat3(aInstance)*(n/(scales*scales));c*=aTint;}
if(uGround==0){n=jellyNormal(n,p);p=jelly(p);}vWorld=p;vNormal=n;vColor=c;vLight=uLightVP*vec4(p,1.);gl_Position=uVP*vec4(p,1.);}`;
export const shadowFragment=`#version 300 es
precision highp float;precision highp int;void main(){}`;
export const opaqueFragment = `#version 300 es
precision highp float;precision highp int;
in vec3 vWorld,vNormal,vColor;in vec4 vLight;
uniform vec3 uEye,uSun;uniform sampler2D uShadow,uHeight;uniform float uTime,uTide,uShadowSize;uniform int uGround;
out vec4 outColor;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float shadow(vec3 n){vec3 q=vLight.xyz/vLight.w*.5+.5;if(q.x<0.||q.y<0.||q.x>1.||q.y>1.||q.z>1.)return 1.;float b=max(.00035,.0011*(1.-dot(n,uSun))),s=0.;for(int x=0;x<2;x++)for(int y=0;y<2;y++){float d=texture(uShadow,q.xy+(vec2(x,y)-.5)*1.5/uShadowSize).r;s+=q.z-b<=d?1.:.32;}return s*.25;}
float caustic(vec2 p){p+=vec2(sin(p.y*2.+uTime*.51),cos(p.x*2.-uTime*.43))*.14;float f=abs(sin(p.x*8.+sin(p.y*5.)+uTime*.40)*sin(p.y*7.7+sin(p.x*5.3)-uTime*.32));float g=abs(sin(p.x*11.7-p.y*2.+uTime*.31)*sin(p.y*9.5+p.x*1.5-uTime*.23));return (1.-smoothstep(.025,.11,f))*.6+(1.-smoothstep(.015,.065,g))*.25;}
void main(){vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;vec3 col=uGround==1?vec3(1.23,1.105,.93):vColor;float ndl=max(dot(n,uSun),0.),sh=shadow(n);if(uGround==1)sh=mix(.83,1.,sh);
float grain=noise(vWorld.xz*150.+vWorld.y*11.)-.5;
float detail=noise(vWorld.xz*13.+vWorld.y*7.)*.12+grain*.06;
if(uGround==0)col*=.96+detail;
if(uGround==0){float strata=sin(vWorld.y*75.+noise(vWorld.xz*12.)*3.);col*=1.+strata*.025*(1.-abs(n.y));}
vec3 light=vec3(.27,.31,.34)+vec3(1.16,1.02,.81)*ndl*sh;
col*=light;
if(uGround==0&&vWorld.y<uTide){float depth=uTide-vWorld.y;float ca=caustic(vWorld.xz+vWorld.y*.13);col+=vec3(.54,.65,.41)*ca*.36*exp(-depth*.45)*max(n.y,.20)*sh;col*=mix(vec3(1.),vec3(.77,.94,.91),clamp(depth*.35,0.,.6));}
if(uGround==1){vec2 q=abs(vWorld.xz)-vec2(2.05);float distance=length(max(q,0.))+min(max(q.x,q.y),0.);float contact=exp(-max(distance,0.)*3.2);col*=1.-contact*.20;float edge=abs(distance-.39);col+=vec3(.055,.10,.085)*caustic(vWorld.xz*.65)*exp(-edge*edge*4.)*.65;}
vec3 view=normalize(uEye-vWorld);float spec=pow(max(dot(n,normalize(view+uSun)),0.),32.);col+=spec*.008;
outColor=vec4(max(col,0.),1.);}`;
export const simulationFragment=`#version 300 es
precision highp float;precision highp int;in vec2 vUv;
uniform sampler2D uPrevious,uTerrain;uniform vec2 uTexel,uPointer;uniform float uImpulse,uTide;out vec4 outColor;
void main(){vec2 s=texture(uPrevious,vUv).rg;float l=texture(uPrevious,vUv-vec2(uTexel.x,0)).r,r=texture(uPrevious,vUv+vec2(uTexel.x,0)).r,b=texture(uPrevious,vUv-vec2(0,uTexel.y)).r,t=texture(uPrevious,vUv+vec2(0,uTexel.y)).r;
float wet=1.-smoothstep(uTide-.025,uTide+.015,texture(uTerrain,vUv).r);
float velocity=(s.g+(l+r+b+t-4.*s.r)*.24)*.989;
float radius=length(vUv-uPointer);velocity+=exp(-radius*radius/0.00013)*uImpulse;
float h=clamp((s.r+velocity)*.999,-.2,.2)*wet;velocity*=wet;
vec2 edge=min(vUv,1.-vUv);float absorb=smoothstep(0.,.045,min(edge.x,edge.y));outColor=vec4(h*mix(.75,1.,absorb),velocity*mix(.65,1.,absorb),0,1);}`;
export const wavesGLSL=`
uniform sampler2D uHeight;
uniform float uTime,uWaveHeight,uTide;
uniform int uHasSim;
uniform vec4 uDrops[12];
float heightAt(vec2 p){vec2 uv=(p+2.4)/4.8;float edge=smoothstep(0.,.16,min(2.4-abs(p.x),2.4-abs(p.y)));
float h=uWaveHeight*(sin(p.x*3.9+p.y*2.7+uTime*1.1)*.52+sin(p.y*5.6-p.x*1.8-uTime*.87)*.29+sin(p.x*8.1+p.y*6.7+uTime*.60)*.10+sin(p.x*19.+p.y*23.+uTime*1.9)*.019);
if(uHasSim==1){h+=texture(uHeight,uv).r*(.45+uWaveHeight*10.);}else{for(int i=0;i<12;i++){float age=uTime-uDrops[i].z;float d=length(p-uDrops[i].xy),r=d-age*.8;if(age>0.&&age<5.)h+=uDrops[i].w*sin(r*27.)*exp(-r*r*12.)*exp(-age*.75);}}
return h*edge;}
`;
export const waterVertex=`#version 300 es
precision highp float;precision highp int;layout(location=0) in vec3 aPosition;layout(location=1) in vec3 aNormal;
uniform mat4 uVP;uniform int uSurface;
out vec3 vWorld,vLocal,vNormal;out float vRim;
${jellyGLSL}${wavesGLSL}
void main(){vec3 p=aPosition;vec3 n=aNormal;float h=heightAt(p.xz);
if(uSurface==1){p.y=uTide+h;float e=.018;float hx=heightAt(p.xz+vec2(e,0))-heightAt(p.xz-vec2(e,0));float hz=heightAt(p.xz+vec2(0,e))-heightAt(p.xz-vec2(0,e));n=normalize(vec3(-hx,2.*e,-hz));vRim=0.;}
else{float t=p.y;p.y=mix(-1.24,uTide,t)+h*pow(t,4.);float rim=pow(abs(t-.5)*2.,32.);n.y+=(t>.5?1.:-1.)*rim*.40;vRim=rim;}
vLocal=p;vNormal=jellyNormal(n,p);vWorld=jelly(p);gl_Position=uVP*vec4(vWorld,1.);}`;
export const waterFragment=`#version 300 es
precision highp float;precision highp int;in vec3 vWorld,vLocal,vNormal;in float vRim;
uniform sampler2D uScene,uSceneDepth,uTerrain;uniform vec2 uResolution;uniform mat4 uView;uniform vec3 uEye,uSun,uWaterColor;uniform int uSurface;
out vec4 outColor;
${wavesGLSL}
float linearDepth(float d){float n=.1,f=80.;return (2.*n*f)/(f+n-(d*2.-1.)*(f-n));}
vec3 environment(vec3 r){vec3 sky=mix(vec3(.54,.60,.56),vec3(.86,.89,.83),smoothstep(-.3,.85,r.y));float strip=exp(-pow((r.x+.46)/.27,2.)-pow((r.y-.76)/.047,2.));float strip2=exp(-pow((r.z-.65)/.09,2.)-pow((r.y-.56)/.5,2.));return sky+vec3(1.6)*strip+vec3(.5)*strip2;}
float rand(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){vec3 n=normalize(vNormal),V=normalize(uEye-vWorld);if(!gl_FrontFacing)n=-n;
float bed=texture(uTerrain,(vLocal.xz+2.4)/4.8).r;
float depth=uSurface==1?max(uTide-bed,0.):(1.30+(uTide-vLocal.y)*1.20);
vec2 uv=gl_FragCoord.xy/uResolution;vec3 vn=mat3(uView)*n;
vec2 distortion=vn.xy*(uSurface==1?.014:.007)*min(depth,1.8)*(1.-vRim*.9);vec2 refrUV=clamp(uv+distortion,vec2(.001),vec2(.999));
if(texture(uSceneDepth,refrUV).r<gl_FragCoord.z-.0003)refrUV=uv;
vec3 scene=texture(uScene,refrUV).rgb;
vec3 absorption=mix(vec3(1.35,.19,.135),(vec3(1.)-uWaterColor)*1.55,.23);
vec3 transmission=exp(-absorption*depth);
vec3 color=scene*transmission+uWaterColor*(1.-transmission)*.28;
float fresnel=.043+.94*pow(1.-max(dot(n,V),0.),5.);
vec3 refl=environment(reflect(-V,n));color=mix(color,refl,min(fresnel,.86));
float spec=pow(max(dot(n,normalize(V+uSun)),0.),420.);color+=vec3(1.3,1.20,.93)*spec*.30;
float micro=sin(vLocal.x*51.+uTime)*sin(vLocal.z*43.-uTime*.7);
color+=vec3(.025,.048,.045)*micro*spec;
if(uSurface==1){float surfaceDepth=max(linearDepth(texture(uSceneDepth,uv).r)-linearDepth(gl_FragCoord.z),0.);
float shore=1.-smoothstep(.018,.11,depth);float rockFoam=(1.-smoothstep(.009,.055,surfaceDepth))*.62;
float foam=max(shore,rockFoam);float pattern=.60+.4*sin(vLocal.x*61.+sin(vLocal.z*44.)+uTime*1.5);foam*=pattern;
color=mix(color,vec3(1.10,1.09,.98),clamp(foam*.84,0.,.85));
float edge=min(2.4-abs(vLocal.x),2.4-abs(vLocal.z));color+=vec3(.1,.16,.15)*(1.-smoothstep(.007,.026,edge));}
else{color+=refl*vRim*.14;}
outColor=vec4(max(color,0.),1.);}`;
export const postFragment=`#version 300 es
precision highp float;precision highp int;in vec2 vUv;out vec4 outColor;uniform sampler2D uColor,uDepth;uniform vec2 uResolution;uniform float uDOF,uFocus;
float linearDepth(float d){float n=.1,f=80.;return (2.*n*f)/(f+n-(d*2.-1.)*(f-n));}
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){vec3 col=texture(uColor,vUv).rgb;float d=linearDepth(texture(uDepth,vUv).r);float radius=min(abs(d-uFocus)*uDOF*.80,2.5);vec2 px=1./uResolution;vec3 blur=vec3(0.);vec3 bloom=vec3(0.);
for(int i=0;i<8;i++){float a=float(i)*.785398;vec2 offset=vec2(cos(a),sin(a));blur+=texture(uColor,vUv+offset*px*radius).rgb;bloom+=max(texture(uColor,vUv+offset*px*3.).rgb-vec3(.90),vec3(0.));}
col=mix(col,blur*.125,clamp(radius,0.,.65));col+=bloom*.012;
float vig=1.-.10*pow(length((vUv-.5)*vec2(1.,.8)),2.);
col=pow(aces(col*1.04),vec3(1./2.2))*vig;outColor=vec4(col,1.);}`;
