import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector2 } from 'three';
import type { Settings } from '../standalone/engine';
export function useJelly(settings:Settings) {
 const data=useMemo(()=>({uJelly:{value:new Vector2()},uTime:{value:0},velocity:new Vector2()}),[]);
 const reduced=useMemo(()=>matchMedia('(prefers-reduced-motion: reduce)').matches,[]);
 useFrame(({pointer},delta)=>{
  if(settings.paused)return;
  data.uTime.value+=Math.min(delta,.1);
  const count=Math.max(1,Math.ceil(Math.min(delta,.08)/.008)),dt=Math.min(delta,.08)/count;
  const k=20+settings.stiffness*150,d=2*Math.sqrt(k)*(.38+settings.stiffness*.4);
  const tx=reduced?0:pointer.x*.14,ty=reduced?0:-pointer.y*.12;
  for(let j=0;j<count;j++){
   data.velocity.x+=((tx-data.uJelly.value.x)*k-data.velocity.x*d)*dt;
   data.velocity.y+=((ty-data.uJelly.value.y)*k-data.velocity.y*d)*dt;
   data.uJelly.value.addScaledVector(data.velocity,dt);
  }
 },-6);
 return data;
}
