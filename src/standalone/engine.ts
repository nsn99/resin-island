import { clamp, mix, normalize, identity, multiply, perspective, ortho, lookAt, inverse, transform, compose, random, hexToLinear, type Vec3 } from '../core/math';
import { SIZE, HALF, BOTTOM, TIDE, makePlants, makeRocks, makeTerrainMap, terrainHeight } from '../core/terrain';
import { grid, sides, sphere, cylinder, leaf, ground, type GeometryData } from '../core/geometry';
import { fullScreenVertex, opaqueVertex, opaqueFragment, shadowFragment, simulationFragment, waterVertex, waterFragment, postFragment } from '../core/shaders';

export interface Settings { waterColor:string; waveHeight:number; rippleStrength:number; sunAngle:number; tide:number; stiffness:number; dof:number; paused:boolean; autoRotate:boolean; quality:'auto'|'high'|'balanced'|'lite'; }
export const defaults:Settings={waterColor:'#35aaa3',waveHeight:.030,rippleStrength:1,sunAngle:54,tide:TIDE,stiffness:.65,dof:.22,paused:false,autoRotate:false,quality:'auto'};
export interface Stats { fps:number; quality:string; gpuSimulation:boolean; triangles:number; }
export interface SceneHandle { settings:Settings; reset:()=>void; splash:()=>void; capture:()=>void; diagnostics:()=>Record<string,unknown>; dispose:()=>void; view:(v:'island'|'lagoon'|'profile')=>void; setQuality:(q:Settings['quality'])=>void; }
type Program={program:WebGLProgram; uniforms:Record<string,WebGLUniformLocation|null>};
type Mesh={vao:WebGLVertexArrayObject;count:number;instances:number;buffers:WebGLBuffer[];type:'solid'|'ground'|'water'};
type Target={fbo:WebGLFramebuffer;color:WebGLTexture|null;depth:WebGLTexture|null;width:number;height:number};

export function startScene(canvas:HTMLCanvasElement,onStats?:(s:Stats)=>void,onError?:(e:string)=>void):SceneHandle {
 const gl=canvas.getContext('webgl2',{alpha:false,antialias:false,powerPreference:'high-performance',preserveDrawingBuffer:true});
 if(!gl)throw new Error('WebGL 2 is unavailable. Enable hardware acceleration and open this file in a current browser.');
 const G=gl;let disposed=false,raf=0,contextLost=false;
 const settings:Settings={...defaults};
 const coarse=matchMedia('(pointer: coarse)').matches||innerWidth<720;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(reduced){settings.waveHeight=.010;settings.stiffness=.85;}
 let quality=coarse?1:2;
 const hasFloat=!!G.getExtension('EXT_color_buffer_float');
 const resources:{textures:WebGLTexture[];framebuffers:WebGLFramebuffer[];programs:WebGLProgram[];vaos:WebGLVertexArrayObject[];buffers:WebGLBuffer[]}={textures:[],framebuffers:[],programs:[],vaos:[],buffers:[]};
 function program(vertex:string,fragment:string):Program {
  const shaders=[vertex,fragment].map((s,i)=>{const sh=G.createShader(i===0?G.VERTEX_SHADER:G.FRAGMENT_SHADER)!;G.shaderSource(sh,s);G.compileShader(sh);if(!G.getShaderParameter(sh,G.COMPILE_STATUS)){const log=G.getShaderInfoLog(sh);G.deleteShader(sh);throw new Error('Shader compilation failed: '+log);}return sh;});
  const p=G.createProgram()!;shaders.forEach(s=>G.attachShader(p,s));G.linkProgram(p);shaders.forEach(s=>G.deleteShader(s));if(!G.getProgramParameter(p,G.LINK_STATUS))throw new Error('Shader link failed: '+G.getProgramInfoLog(p));resources.programs.push(p);return {program:p,uniforms:{}};
 }
 function location(p:Program,k:string){if(!(k in p.uniforms))p.uniforms[k]=G.getUniformLocation(p.program,k);return p.uniforms[k];}
 function f(p:Program,k:string,v:number){G.uniform1f(location(p,k),v);}
 function i(p:Program,k:string,v:number){G.uniform1i(location(p,k),v);}
 function v2(p:Program,k:string,v:ArrayLike<number>){G.uniform2f(location(p,k),v[0],v[1]);}
 function v3(p:Program,k:string,v:ArrayLike<number>){G.uniform3f(location(p,k),v[0],v[1],v[2]);}
 function m4(p:Program,k:string,v:Float32Array){G.uniformMatrix4fv(location(p,k),false,v);}
 function bind(p:Program,k:string,t:WebGLTexture|null,unit:number){G.activeTexture(G.TEXTURE0+unit);G.bindTexture(G.TEXTURE_2D,t);i(p,k,unit);}
 function texture(width:number,height:number,kind:'color'|'depth'|'float'|'terrain',data:Float32Array|null=null){const t=G.createTexture()!;resources.textures.push(t);G.bindTexture(G.TEXTURE_2D,t);const linear=kind==='color';G.texParameteri(G.TEXTURE_2D,G.TEXTURE_MIN_FILTER,linear?G.LINEAR:G.NEAREST);G.texParameteri(G.TEXTURE_2D,G.TEXTURE_MAG_FILTER,linear?G.LINEAR:G.NEAREST);G.texParameteri(G.TEXTURE_2D,G.TEXTURE_WRAP_S,G.CLAMP_TO_EDGE);G.texParameteri(G.TEXTURE_2D,G.TEXTURE_WRAP_T,G.CLAMP_TO_EDGE);
  if(kind==='depth')G.texImage2D(G.TEXTURE_2D,0,G.DEPTH_COMPONENT24,width,height,0,G.DEPTH_COMPONENT,G.UNSIGNED_INT,null);
  else if(kind==='float'||kind==='terrain')G.texImage2D(G.TEXTURE_2D,0,kind==='terrain'?G.RGBA32F:G.RGBA16F,width,height,0,G.RGBA,G.FLOAT,data);
  else G.texImage2D(G.TEXTURE_2D,0,G.RGBA8,width,height,0,G.RGBA,G.UNSIGNED_BYTE,null);
  return t;
 }
 function target(width:number,height:number,kind:'color'|'depth'|'float'):Target {const fbo=G.createFramebuffer()!;resources.framebuffers.push(fbo);G.bindFramebuffer(G.FRAMEBUFFER,fbo);const color=kind==='depth'?null:texture(width,height,kind),depth=kind==='float'?null:texture(width,height,'depth');if(color)G.framebufferTexture2D(G.FRAMEBUFFER,G.COLOR_ATTACHMENT0,G.TEXTURE_2D,color,0);if(depth)G.framebufferTexture2D(G.FRAMEBUFFER,G.DEPTH_ATTACHMENT,G.TEXTURE_2D,depth,0);if(!color){G.drawBuffers([G.NONE]);G.readBuffer(G.NONE);}if(G.checkFramebufferStatus(G.FRAMEBUFFER)!==G.FRAMEBUFFER_COMPLETE)throw new Error('The graphics device cannot create a required render target.');G.clearColor(0,0,0,1);G.clear(G.COLOR_BUFFER_BIT|G.DEPTH_BUFFER_BIT);G.bindFramebuffer(G.FRAMEBUFFER,null);return {fbo,color,depth,width,height};}
 function destroyTarget(t:Target|null){if(!t)return;G.deleteFramebuffer(t.fbo);if(t.color)G.deleteTexture(t.color);if(t.depth)G.deleteTexture(t.depth);}
 function mesh(data:GeometryData,type:Mesh['type']='solid',instanceData?:number[]):Mesh {
  const vao=G.createVertexArray()!;resources.vaos.push(vao);G.bindVertexArray(vao);const interleaved=new Float32Array(data.positions.length*3);for(let j=0;j<data.positions.length/3;j++){interleaved.set(data.positions.subarray(j*3,j*3+3),j*9);interleaved.set(data.normals.subarray(j*3,j*3+3),j*9+3);interleaved.set(data.colors.subarray(j*3,j*3+3),j*9+6);}
  const buffers:WebGLBuffer[]=[];function buf(type:number,data:ArrayBufferView){const b=G.createBuffer()!;resources.buffers.push(b);buffers.push(b);G.bindBuffer(type,b);G.bufferData(type,data,G.STATIC_DRAW);}
  buf(G.ARRAY_BUFFER,interleaved);for(let j=0;j<3;j++){G.enableVertexAttribArray(j);G.vertexAttribPointer(j,3,G.FLOAT,false,36,j*12);}buf(G.ELEMENT_ARRAY_BUFFER,data.indices);
  let instances=0;if(instanceData){instances=instanceData.length/19;buf(G.ARRAY_BUFFER,new Float32Array(instanceData));for(let j=0;j<4;j++){G.enableVertexAttribArray(3+j);G.vertexAttribPointer(3+j,4,G.FLOAT,false,76,j*16);G.vertexAttribDivisor(3+j,1);}G.enableVertexAttribArray(7);G.vertexAttribPointer(7,3,G.FLOAT,false,76,64);G.vertexAttribDivisor(7,1);}
  G.bindVertexArray(null);return {vao,count:data.indices.length,instances,buffers,type};
 }
 const opaque=program(opaqueVertex,opaqueFragment),shadowProgram=program(opaqueVertex,shadowFragment),water=program(waterVertex,waterFragment),post=program(fullScreenVertex,postFragment),sim=hasFloat?program(fullScreenVertex,simulationFragment):null;
 const fullscreen=G.createVertexArray()!;resources.vaos.push(fullscreen);
 const land=mesh(grid(coarse?116:160)),base=mesh(sides(false)),floor=mesh(ground(),'ground');
 const rockData:number[]=[];makeRocks().forEach(r=>rockData.push(...compose(r.position,r.scale,r.angle),...r.tint));
 const rocks=mesh(sphere(11,15,true),'solid',rockData);
 const trunksData:number[]=[],crownsData:number[]=[],leavesData:number[]=[];const rng=random(215);const plants=makePlants(coarse?34:49);
 for(const plant of plants){const {position:p,scale:s,angle,tint,kind}=plant;const h=kind==='palm'?s*1.9:s*1.4;
  trunksData.push(...compose(p,[s*.070,h,s*.070],angle),.21,.135,.065);
  if(kind==='palm'){
   for(let j=0;j<8;j++)leavesData.push(...compose([p[0],p[1]+h,p[2]],[s*.95,s*.95,s*.95],angle+j*Math.PI/4),...tint);
   crownsData.push(...compose([p[0],p[1]+h,p[2]],[s*.11,s*.11,s*.11]),.19,.22,.055);
  } else {
   for(let j=0;j<5;j++){const a=j*2.399,h0=j===0?.03:0,dx=j===0?0:Math.cos(a)*s*.32,dz=j===0?0:Math.sin(a)*s*.32;crownsData.push(...compose([p[0]+dx,p[1]+h+h0,p[2]+dz],[s*(.40+rng()*.15),s*(.27+rng()*.14),s*(.40+rng()*.13)],angle),...tint);}
  }
 }
 const trunks=mesh(cylinder(7),'solid',trunksData),crowns=mesh(sphere(6,9,true),'solid',crownsData),leaves=mesh(leaf(),'solid',leavesData);
 const solidMeshes=[floor,land,base,rocks,trunks,crowns,leaves];
 const waterTop=mesh(grid(coarse?100:152,true),'water'),waterSides=mesh(sides(true),'water');
 let opaqueTarget:Target|null=null,finalTarget:Target|null=null;
 const shadowSize=coarse?768:1024,shadowTarget=target(shadowSize,shadowSize,'depth');
 const simSize=coarse?96:128,terrainTex=texture(256,256,'terrain',makeTerrainMap(256));
 const zeroTex=texture(1,1,'terrain',new Float32Array([0,0,0,1]));
 let simA=hasFloat?target(simSize,simSize,'float'):null,simB=hasFloat?target(simSize,simSize,'float'):null;
 let width=0,height=0,view=identity(),vp=identity(),invVP=identity();
 let theta=.70,phi=.92,distance=16.8,desiredTheta=theta,desiredPhi=phi,desiredDistance=distance;
 let eye:Vec3=[7,6,8],lightVP=identity(),sun:Vec3=[-1,1,1];
 let time=0,last=0,simAcc=0,frameCount=0,statElapsed=0,age=0,slow=0,lastAdaptive=0;
 let lastSun=-1;let jelly=[0,0],jVelocity=[0,0],pointerTarget=[0,0];
 const pointer=[-10,-10];let pendingImpulse=0,dropCursor=0;const drops=new Float32Array(12*4);for(let j=0;j<12;j++)drops[j*4+2]=-10;
 let isDown=false,downX=0,downY=0,prevX=0,prevY=0,dragging=false,lastMoveStamp=0;
 const activePointers=new Map<number,{x:number;y:number}>();let pinchDistance=0;
 function resize(){const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,quality===2?1.6:quality===1?1.3:1)*(quality===2?1:quality===1?.85:.70);const w=Math.max(1,Math.round(rect.width*dpr)),h=Math.max(1,Math.round(rect.height*dpr));if(w===width&&h===height)return;width=w;height=h;canvas.width=w;canvas.height=h;destroyTarget(opaqueTarget);destroyTarget(finalTarget);opaqueTarget=target(w,h,'color');finalTarget=target(w,h,'color');}
 const ro=new ResizeObserver(resize);ro.observe(canvas);resize();
 function updateCamera(dt:number){if(settings.autoRotate&&!isDown&&!settings.paused)desiredTheta+=dt*.09;theta=mix(theta,desiredTheta,1-Math.exp(-dt*9));phi=mix(phi,desiredPhi,1-Math.exp(-dt*9));distance=mix(distance,desiredDistance,1-Math.exp(-dt*9));
  const aspect=width/height;const responsiveDist=distance*Math.max(1,.88/aspect);const focus:Vec3=[0,.23,0];eye=[Math.sin(theta)*Math.sin(phi)*responsiveDist,Math.cos(phi)*responsiveDist+focus[1],Math.cos(theta)*Math.sin(phi)*responsiveDist];
  view=lookAt(eye,focus);vp=multiply(perspective(.51,aspect,.1,80),view);invVP=inverse(vp);
 }
 function sunMatrix(){if(lastSun===settings.sunAngle)return;lastSun=settings.sunAngle;const a=settings.sunAngle*Math.PI/180;sun=normalize([-Math.cos(a)*1.2,Math.sin(a),-.55]);lightVP=multiply(ortho(-5,5,-5,5,.1,24),lookAt([sun[0]*11,sun[1]*11,sun[2]*11],[0,.25,0]));}
 function addDrop(x:number,z:number,strength=.015){if(settings.paused)return;if(Math.abs(x)>2.35||Math.abs(z)>2.35||terrainHeight(x,z)>settings.tide+.025)return;pointer[0]=(x+HALF)/SIZE;pointer[1]=(z+HALF)/SIZE;pendingImpulse=Math.min(pendingImpulse+strength*settings.rippleStrength,.065);const j=(dropCursor++%12)*4;drops[j]=x;drops[j+1]=z;drops[j+2]=time;drops[j+3]=strength*settings.rippleStrength*2;}
 function hit(clientX:number,clientY:number):Vec3|null{const r=canvas.getBoundingClientRect(),x=(clientX-r.left)/r.width*2-1,y=1-(clientY-r.top)/r.height*2;const a=transform(invVP,[x,y,-1]),b=transform(invVP,[x,y,1]);const t=(settings.tide-a[1])/(b[1]-a[1]);if(t<0)return null;return [a[0]+(b[0]-a[0])*t-jelly[0],settings.tide,a[2]+(b[2]-a[2])*t-jelly[1]];}
 function move(e:PointerEvent){if(activePointers.has(e.pointerId))activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  const rect=canvas.getBoundingClientRect();pointerTarget=[clamp((e.clientX-rect.left)/rect.width*2-1,-1,1)*.14,clamp((e.clientY-rect.top)/rect.height*2-1,-1,1)*.12];
  if(activePointers.size===2){const p=[...activePointers.values()],d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(pinchDistance>0)desiredDistance=clamp(desiredDistance*pinchDistance/d,11,23);pinchDistance=d;return;}
  if(isDown){const delta=Math.hypot(e.clientX-downX,e.clientY-downY);if(delta>5)dragging=true;if(dragging){desiredTheta-=(e.clientX-prevX)*.006;desiredPhi=clamp(desiredPhi+(e.clientY-prevY)*.004,.40,1.34);}}
  if(!dragging&&e.timeStamp-lastMoveStamp>35){const p=hit(e.clientX,e.clientY);if(p)addDrop(p[0],p[2],.008);lastMoveStamp=e.timeStamp;}
  prevX=e.clientX;prevY=e.clientY;
 }
 function down(e:PointerEvent){if(e.button>0)return;activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});isDown=true;dragging=false;downX=prevX=e.clientX;downY=prevY=e.clientY;canvas.setPointerCapture(e.pointerId);const p=hit(e.clientX,e.clientY);if(p)addDrop(p[0],p[2],.035);canvas.style.cursor='grabbing';}
 function up(e:PointerEvent){activePointers.delete(e.pointerId);pinchDistance=0;isDown=activePointers.size>0;dragging=false;if(isDown){const p=[...activePointers.values()][0];downX=prevX=p.x;downY=prevY=p.y;}canvas.style.cursor='grab';}
 function leave(){if(!isDown)pointerTarget=[0,0];}
 function wheel(e:WheelEvent){e.preventDefault();desiredDistance=clamp(desiredDistance*Math.exp(e.deltaY*.0008),11,23);}
 function contextMenu(e:Event){e.preventDefault();}
 canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('pointerleave',leave);canvas.addEventListener('wheel',wheel,{passive:false});canvas.addEventListener('contextmenu',contextMenu);
 function contextLoss(e:Event){e.preventDefault();contextLost=true;onError?.('The graphics context was lost. Reload the page; try Lite quality or close other GPU-heavy tabs.');}
 canvas.addEventListener('webglcontextlost',contextLoss);
 function draw(m:Mesh,p:Program){G.bindVertexArray(m.vao);i(p,'uInstanced',m.instances?1:0);i(p,'uGround',m.type==='ground'?1:0);if(m.instances)G.drawElementsInstanced(G.TRIANGLES,m.count,G.UNSIGNED_INT,0,m.instances);else G.drawElements(G.TRIANGLES,m.count,G.UNSIGNED_INT,0);}
 function common(p:Program){m4(p,'uVP',vp);m4(p,'uLightVP',lightVP);v2(p,'uJelly',jelly);v3(p,'uEye',eye);v3(p,'uSun',sun);f(p,'uTime',time);f(p,'uTide',settings.tide);}
 function stepSimulation(dt:number){if(!sim||!simA||!simB||settings.paused)return;simAcc=Math.min(simAcc+dt,.05);G.useProgram(sim.program);G.bindVertexArray(fullscreen);G.disable(G.DEPTH_TEST);G.disable(G.CULL_FACE);G.viewport(0,0,simSize,simSize);bind(sim,'uTerrain',terrainTex,1);v2(sim,'uTexel',[1/simSize,1/simSize]);f(sim,'uTide',settings.tide);v2(sim,'uPointer',pointer);
  while(simAcc>=1/60){G.bindFramebuffer(G.FRAMEBUFFER,simB.fbo);bind(sim,'uPrevious',simA.color,0);f(sim,'uImpulse',pendingImpulse);pendingImpulse=0;G.drawArrays(G.TRIANGLES,0,3);[simA,simB]=[simB,simA];simAcc-=1/60;}
 }
 function render(dt:number){resize();updateCamera(dt);sunMatrix();
  if(!settings.paused){time+=dt;const k=20+settings.stiffness*150,damping=2*Math.sqrt(k)*(.38+settings.stiffness*.40);const h=Math.min(dt,1/30);for(let j=0;j<2;j++){const target=reduced?0:pointerTarget[j];jVelocity[j]+=((target-jelly[j])*k-jVelocity[j]*damping)*h;jelly[j]+=jVelocity[j]*h;}}
  stepSimulation(dt);
  G.enable(G.DEPTH_TEST);G.depthMask(true);G.enable(G.CULL_FACE);G.cullFace(G.BACK);G.disable(G.BLEND);
  G.bindFramebuffer(G.FRAMEBUFFER,shadowTarget.fbo);G.viewport(0,0,shadowSize,shadowSize);G.clear(G.DEPTH_BUFFER_BIT);G.useProgram(shadowProgram.program);common(shadowProgram);m4(shadowProgram,'uVP',lightVP);G.enable(G.POLYGON_OFFSET_FILL);G.polygonOffset(1,1);for(const m of solidMeshes)if(m!==floor)draw(m,shadowProgram);G.disable(G.POLYGON_OFFSET_FILL);
  G.bindFramebuffer(G.FRAMEBUFFER,opaqueTarget!.fbo);G.viewport(0,0,width,height);G.clearColor(.86,.81,.71,1);G.clear(G.COLOR_BUFFER_BIT|G.DEPTH_BUFFER_BIT);G.useProgram(opaque.program);common(opaque);bind(opaque,'uShadow',shadowTarget.depth,0);bind(opaque,'uHeight',simA?.color||zeroTex,1);f(opaque,'uShadowSize',shadowSize);for(const m of solidMeshes)draw(m,opaque);
  // Copy opaque colour + depth once. Water samples a different target: no feedback.
  G.bindFramebuffer(G.READ_FRAMEBUFFER,opaqueTarget!.fbo);G.bindFramebuffer(G.DRAW_FRAMEBUFFER,finalTarget!.fbo);G.blitFramebuffer(0,0,width,height,0,0,width,height,G.COLOR_BUFFER_BIT|G.DEPTH_BUFFER_BIT,G.NEAREST);
  G.bindFramebuffer(G.FRAMEBUFFER,finalTarget!.fbo);G.useProgram(water.program);common(water);m4(water,'uView',view);v2(water,'uResolution',[width,height]);v3(water,'uWaterColor',hexToLinear(settings.waterColor));f(water,'uWaveHeight',settings.waveHeight);i(water,'uHasSim',hasFloat?1:0);G.uniform4fv(location(water,'uDrops[0]'),drops);bind(water,'uScene',opaqueTarget!.color,0);bind(water,'uSceneDepth',opaqueTarget!.depth,1);bind(water,'uTerrain',terrainTex,2);bind(water,'uHeight',simA?.color||zeroTex,3);
  i(water,'uSurface',0);draw(waterSides,water);i(water,'uSurface',1);draw(waterTop,water);
  G.bindFramebuffer(G.FRAMEBUFFER,null);G.disable(G.DEPTH_TEST);G.disable(G.CULL_FACE);G.useProgram(post.program);G.bindVertexArray(fullscreen);bind(post,'uColor',finalTarget!.color,0);bind(post,'uDepth',finalTarget!.depth,1);v2(post,'uResolution',[width,height]);f(post,'uDOF',quality===0?0:settings.dof);f(post,'uFocus',Math.hypot(eye[0],eye[1]-.4,eye[2]));G.drawArrays(G.TRIANGLES,0,3);
 }
 const triangles=[...solidMeshes,waterSides,waterTop].reduce((sum,m)=>sum+m.count/3*(m.instances||1),0);
 let snapshot=false;
 function tick(now:number){if(disposed)return;raf=requestAnimationFrame(tick);if(document.hidden||contextLost){last=now;return;}const wallDt=Math.max(0,(now-(last||now))/1000),dt=Math.min(wallDt,.05);last=now;age+=wallDt;
  try{render(Math.max(.001,dt));}catch(e){disposed=true;cancelAnimationFrame(raf);onError?.(String(e));console.error(e);return;}
  frameCount++;statElapsed+=wallDt;
  if(snapshot){snapshot=false;const a=document.createElement('a');a.download='isole-island.png';a.href=canvas.toDataURL('image/png');a.click();}
  if(statElapsed>=1){const fps=Math.round(frameCount/statElapsed);onStats?.({fps,quality:['Lite','Balanced','High'][quality],gpuSimulation:hasFloat,triangles});if(age>5&&settings.quality==='auto'&&age-lastAdaptive>4){if(fps<(coarse?27:40))slow++;else slow=0;if(slow>=2&&quality>0){quality--;resize();lastAdaptive=age;slow=0;}}frameCount=0;statElapsed=0;}
 }
 raf=requestAnimationFrame(tick);
 function reset(){Object.assign(settings,defaults);desiredTheta=.70;desiredPhi=.92;desiredDistance=16.8;pointerTarget=[0,0];jelly=[0,0];jVelocity=[0,0];quality=coarse?1:2;time=0;simAcc=0;pendingImpulse=0;for(let j=0;j<12;j++)drops[j*4+2]=-10;[simA,simB].forEach(t=>{if(t){G.bindFramebuffer(G.FRAMEBUFFER,t.fbo);G.clearColor(0,0,0,1);G.clear(G.COLOR_BUFFER_BIT);}});G.bindFramebuffer(G.FRAMEBUFFER,null);resize();}
 function dispose(){disposed=true;cancelAnimationFrame(raf);ro.disconnect();canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',up);canvas.removeEventListener('pointerleave',leave);canvas.removeEventListener('wheel',wheel);canvas.removeEventListener('contextmenu',contextMenu);canvas.removeEventListener('webglcontextlost',contextLoss);resources.textures.forEach(t=>G.deleteTexture(t));resources.framebuffers.forEach(t=>G.deleteFramebuffer(t));resources.programs.forEach(t=>G.deleteProgram(t));resources.vaos.forEach(t=>G.deleteVertexArray(t));resources.buffers.forEach(t=>G.deleteBuffer(t));}
 function diagnostics(){
  let waveMaximum:number|null=null,readError=0;
  if(simA){const old=G.getParameter(G.FRAMEBUFFER_BINDING) as WebGLFramebuffer|null;G.bindFramebuffer(G.FRAMEBUFFER,simA.fbo);const pixels=new Float32Array(simSize*simSize*4);G.readPixels(0,0,simSize,simSize,G.RGBA,G.FLOAT,pixels);readError=G.getError();if(readError===0){waveMaximum=0;for(let i=0;i<pixels.length;i+=4)waveMaximum=Math.max(waveMaximum,Math.abs(pixels[i]));}G.bindFramebuffer(G.FRAMEBUFFER,old);}
  const ext=G.getExtension('WEBGL_debug_renderer_info');
  return {renderer:ext?G.getParameter(ext.UNMASKED_RENDERER_WEBGL):G.getParameter(G.RENDERER),gpuSimulation:hasFloat,quality:['Lite','Balanced','High'][quality],resolution:[width,height],triangles,time,jelly:[...jelly],camera:[theta,phi,distance],waveMaximum,readError};
 }
 return {settings,reset,diagnostics,view:v=>{if(v==='lagoon'){desiredTheta=.05;desiredPhi=.40;desiredDistance=15.8;}else if(v==='profile'){desiredTheta=1.15;desiredPhi=1.17;desiredDistance=16.5;}else{desiredTheta=.70;desiredPhi=.92;desiredDistance=16.8;}},splash:()=>{addDrop(.90,1.1,.06);addDrop(1.50,-.35,.045);},capture:()=>{snapshot=true;},dispose,setQuality:q=>{settings.quality=q;quality=q==='auto'?(coarse?1:2):q==='high'?2:q==='balanced'?1:0;slow=0;lastAdaptive=age;resize();}};
}
