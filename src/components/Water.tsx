import { useEffect, useLayoutEffect, useMemo, useRef, type ComponentRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MeshTransmissionMaterial, useFBO } from '@react-three/drei';
import * as THREE from 'three';
import { grid, sides } from '../core/geometry';
import { jellyGLSL, wavesGLSL } from '../core/shaders';
import { threeGeometry } from '../lib/threeGeometry';
import type { JellyUniforms } from '../lib/materials';
import type { useHeightField } from '../hooks/useHeightField';
import type { Settings } from '../standalone/engine';
type Field=ReturnType<typeof useHeightField>;

function WaterMaterial({surface,buffer,field,jelly,settings,quality}:{surface:boolean;buffer:THREE.Texture;field:Field;jelly:JellyUniforms;settings:Settings;quality:number}){
 const ref=useRef<ComponentRef<typeof MeshTransmissionMaterial>>(null);
 useLayoutEffect(()=>{
  const material=ref.current;if(!material)return;
  // Preserve Drei's transmission implementation, then append our displacement.
  const original=material.onBeforeCompile.bind(material);
  material.onBeforeCompile=(shader,renderer)=>{
   original(shader,renderer);
   Object.assign(shader.uniforms,field.uniforms,{uJelly:jelly.uJelly,uTerrain:{value:field.terrain}});
   shader.vertexShader=`${jellyGLSL}\n${wavesGLSL}\nvarying vec3 vIslandPosition;\n`+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
    ${surface?`float e=.018;objectNormal=normalize(vec3(-(heightAt(position.xz+vec2(e,0))-heightAt(position.xz-vec2(e,0))),2.*e,-(heightAt(position.xz+vec2(0,e))-heightAt(position.xz-vec2(0,e)))));`:''}`);
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    ${surface?'transformed.y=uTide+heightAt(transformed.xz);':'transformed.y=mix(-1.24,uTide,position.y)+heightAt(position.xz)*pow(position.y,4.);'}
    vIslandPosition=transformed;transformed=jelly(transformed);`);
   shader.fragmentShader=`uniform sampler2D uTerrain;uniform float uTide,uTime;varying vec3 vIslandPosition;\n`+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    float bed=texture2D(uTerrain,(vIslandPosition.xz+2.4)/4.8).r;
    float depth=max(uTide-bed,0.);
    diffuseColor.rgb*=mix(vec3(.92,1.,.98),vec3(.34,.80,.77),smoothstep(.10,2.0,depth)*.45);
    ${surface?`float foam=(1.-smoothstep(.018,.105,depth))*(.70+.30*sin(vIslandPosition.x*61.+sin(vIslandPosition.z*44.)+uTime*1.5));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.),foam*.75);`:''}`);
  };
  material.customProgramCacheKey=()=>`isole-water-${surface?'top':'sides'}-v1`;
  material.needsUpdate=true;
  return ()=>{material.onBeforeCompile=original;material.needsUpdate=true;};
 },[field.uniforms,field.terrain,jelly,surface]);
 return <MeshTransmissionMaterial ref={ref} buffer={buffer} samples={quality===2?4:2} transmission={1} roughness={.055} thickness={surface?1.4:1.8} ior={1.36} chromaticAberration={.003} anisotropicBlur={.04} distortion={0} temporalDistortion={0} color="#e2f7ec" attenuationColor={settings.waterColor} attenuationDistance={3.4} envMapIntensity={1.15} clearcoat={1} clearcoatRoughness={.10} depthWrite side={THREE.FrontSide}/>;
}
export function Water({field,jelly,settings,quality}:{field:Field;jelly:JellyUniforms;settings:Settings;quality:number}){
 const root=useRef<THREE.Group>(null);const {size,gl}=useThree();
 const resolution=quality===2?1024:quality===1?640:384;
 const buffer=useFBO(resolution,Math.max(1,Math.round(resolution*size.height/size.width)),{type:gl.extensions.has('EXT_color_buffer_float')?THREE.HalfFloatType:THREE.UnsignedByteType,depthBuffer:true,stencilBuffer:false});
 const geometry=useMemo(()=>({top:threeGeometry(grid(quality===0?80:144,true)),sides:threeGeometry(sides(true))}),[quality]);
 useEffect(()=>()=>{geometry.top.dispose();geometry.sides.dispose();},[geometry]);
 // OrbitControls updates at -1. Capture at 0, then the composer renders at 1.
 // Hide ALL water in the capture, never sample from the target being written.
 useFrame(({gl,scene,camera})=>{
  if(!root.current)return;const target=gl.getRenderTarget(),visible=root.current.visible,shadowUpdate=gl.shadowMap.autoUpdate;
  try{root.current.visible=false;gl.shadowMap.autoUpdate=false;gl.setRenderTarget(buffer);gl.clear();gl.render(scene,camera);}finally{root.current.visible=visible;gl.shadowMap.autoUpdate=shadowUpdate;gl.setRenderTarget(target);}
 },0);
 const moveStamp=useRef(0);
 return <group ref={root}>
  <mesh geometry={geometry.sides} renderOrder={20} frustumCulled={false}><WaterMaterial surface={false} buffer={buffer.texture} field={field} jelly={jelly} settings={settings} quality={quality}/></mesh>
  <mesh geometry={geometry.top} renderOrder={21} frustumCulled={false}><WaterMaterial surface buffer={buffer.texture} field={field} jelly={jelly} settings={settings} quality={quality}/></mesh>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,settings.tide+.01,0]}
   onPointerMove={e=>{if(e.buttons!==0||e.timeStamp-moveStamp.current<35)return;moveStamp.current=e.timeStamp;field.inject(e.point.x-jelly.uJelly.value.x,e.point.z-jelly.uJelly.value.y,.008);}}
   onPointerDown={e=>field.inject(e.point.x-jelly.uJelly.value.x,e.point.z-jelly.uJelly.value.y,.035)}>
   <planeGeometry args={[4.8,4.8]}/><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false}/>
  </mesh>
 </group>;
}
