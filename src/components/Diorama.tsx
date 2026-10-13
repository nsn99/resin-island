import { useEffect, useRef, type ComponentRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerformanceMonitor } from '@react-three/drei';
import { useJelly } from '../hooks/useJelly';
import { useHeightField } from '../hooks/useHeightField';
import { Terrain } from './Terrain';
import { Scatter } from './Scatter';
import { Water } from './Water';
import { Studio } from './Studio';
import { PerspectiveCamera } from 'three';
import type { Settings } from '../standalone/engine';
export interface SceneAPI { splash:()=>void; resetView:()=>void }
export function Diorama({settings,quality,onReady,onDecline,stats}:{settings:Settings;quality:number;onReady:(api:SceneAPI)=>void;onDecline:()=>void;stats:(fps:number)=>void}) {
 const {camera,size}=useThree();
 useEffect(()=>{if(camera instanceof PerspectiveCamera){camera.fov=2*Math.atan(Math.tan(29.2*Math.PI/360)*Math.max(1,.88/(size.width/size.height)))*180/Math.PI;camera.updateProjectionMatrix();}},[camera,size.width,size.height]);
 const jelly=useJelly(settings),field=useHeightField(settings,jelly.uTime,quality);
 const orbit=useRef<ComponentRef<typeof OrbitControls>>(null);
 const frame=useRef({time:0,count:0});
 useFrame((_,dt)=>{frame.current.time+=dt;frame.current.count++;if(frame.current.time>=1){stats(Math.round(frame.current.count/frame.current.time));frame.current={time:0,count:0};}});
 useEffect(()=>{onReady({splash:()=>{field.inject(.9,1.1,.06);field.inject(1.5,-.35,.045);},resetView:()=>orbit.current?.reset()});},[field.inject,onReady]);
 return <>
  <PerformanceMonitor bounds={()=>[30,55]} onDecline={onDecline} flipflops={2}/>
  <OrbitControls ref={orbit} makeDefault enableDamping dampingFactor={.06} enablePan={false} target={[0,.23,0]} minDistance={11} maxDistance={24} minPolarAngle={.38} maxPolarAngle={1.34} rotateSpeed={.6} zoomSpeed={.65} autoRotate={settings.autoRotate&&!settings.paused} autoRotateSpeed={.4}/>
  <Terrain jelly={jelly} tide={field.uniforms.uTide} quality={quality}/>
  <Scatter jelly={jelly} tide={field.uniforms.uTide} quality={quality}/>
  <Water field={field} jelly={jelly} settings={settings} quality={quality}/>
  <Studio settings={settings} quality={quality}/>
 </>;
}
