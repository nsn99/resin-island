import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useFBO } from '@react-three/drei';
import * as THREE from 'three';
import { fullScreenVertex, simulationFragment } from '../core/shaders';
import { makeTerrainMap, terrainHeight, HALF, SIZE } from '../core/terrain';
import type { Settings } from '../standalone/engine';

/** Independent fixed-step GPU wave solver. Two targets alternate read/write.
 * R: height, G: vertical velocity. Wet cells use the same CPU terrain function.
 * If float attachments are unavailable, analytic drops stay interactive.
 */
export function useHeightField(settings:Settings,clock:{value:number},quality:number) {
 const {gl}=useThree();
 const supported=useMemo(()=>gl.extensions.has('EXT_color_buffer_float'),[gl]);
 const resolution=quality===0?64:quality===1?96:128;
 const a=useFBO(resolution,resolution,{type:supported?THREE.HalfFloatType:THREE.UnsignedByteType,format:THREE.RGBAFormat,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthBuffer:false,stencilBuffer:false});
 const b=useFBO(resolution,resolution,{type:supported?THREE.HalfFloatType:THREE.UnsignedByteType,format:THREE.RGBAFormat,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,depthBuffer:false,stencilBuffer:false});
 const data=useMemo(()=>{
  const terrain=new THREE.DataTexture(makeTerrainMap(256),256,256,THREE.RGBAFormat,THREE.FloatType);
  terrain.minFilter=terrain.magFilter=THREE.NearestFilter;terrain.needsUpdate=true;
  const zero=new THREE.DataTexture(new Float32Array([0,0,0,1]),1,1,THREE.RGBAFormat,THREE.FloatType);zero.needsUpdate=true;
  const drops=new Float32Array(48);for(let i=0;i<12;i++)drops[i*4+2]=-100;
  const uniforms={uPrevious:{value:zero as THREE.Texture},uTerrain:{value:terrain},uTexel:{value:new THREE.Vector2(1/resolution,1/resolution)},uPointer:{value:new THREE.Vector2(-10,-10)},uImpulse:{value:0},uTide:{value:settings.tide}};
  const material=new THREE.RawShaderMaterial({vertexShader:fullScreenVertex.replace('#version 300 es',''),fragmentShader:simulationFragment.replace('#version 300 es',''),glslVersion:THREE.GLSL3,uniforms,depthTest:false,depthWrite:false,toneMapped:false});
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute([-1,-1,0,3,-1,0,-1,3,0],3));
  const quad=new THREE.Mesh(geometry,material);quad.frustumCulled=false;
  const scene=new THREE.Scene();scene.add(quad);
  return {terrain,zero,uniforms,material,geometry,scene,camera:new THREE.Camera(),clearColor:new THREE.Color(),waves:{uHeight:{value:zero as THREE.Texture},uHasSim:{value:supported?1:0},uDrops:{value:drops},uTime:clock,uTide:uniforms.uTide,uWaveHeight:{value:settings.waveHeight}}};
 },[supported,clock]);
 const state=useRef({initialized:false,read:a,write:b,accumulator:0,impulse:0,dropIndex:0});
 useEffect(()=>{state.current={initialized:false,read:a,write:b,accumulator:0,impulse:0,dropIndex:0};data.uniforms.uTexel.value.set(1/resolution,1/resolution);},[a,b,resolution,data]);
 useEffect(()=>()=>{data.terrain.dispose();data.zero.dispose();data.material.dispose();data.geometry.dispose();},[data]);
 const inject=useCallback((x:number,z:number,strength=.025)=>{
  if(settings.paused||Math.abs(x)>2.35||Math.abs(z)>2.35||terrainHeight(x,z)>settings.tide+.025)return;
  const s=state.current;s.impulse=Math.min(.065,s.impulse+strength*settings.rippleStrength);data.uniforms.uPointer.value.set((x+HALF)/SIZE,(z+HALF)/SIZE);
  const i=(s.dropIndex++%12)*4;data.waves.uDrops.value.set([x,z,clock.value,strength*settings.rippleStrength*2],i);
 },[settings.paused,settings.tide,settings.rippleStrength,clock,data]);
 useFrame((_,delta)=>{
  data.waves.uWaveHeight.value=settings.waveHeight;data.uniforms.uTide.value=settings.tide;
  if(!supported||settings.paused)return;
  const s=state.current,oldTarget=gl.getRenderTarget(),auto=gl.autoClear,alpha=gl.getClearAlpha();gl.getClearColor(data.clearColor);
  try {
   if(!s.initialized){gl.setClearColor(0x000000,1);gl.setRenderTarget(a);gl.clear();gl.setRenderTarget(b);gl.clear();s.initialized=true;}
   s.accumulator=Math.min(s.accumulator+delta,.05);
   while(s.accumulator>=1/60){data.uniforms.uPrevious.value=s.read.texture;data.uniforms.uImpulse.value=s.impulse;s.impulse=0;gl.setRenderTarget(s.write);gl.render(data.scene,data.camera);[s.read,s.write]=[s.write,s.read];s.accumulator-=1/60;}
   data.waves.uHeight.value=s.read.texture;
  } finally {gl.setRenderTarget(oldTarget);gl.autoClear=auto;gl.setClearColor(data.clearColor,alpha);}
 },-4);
 return {uniforms:data.waves,terrain:data.terrain,inject,supported};
}
