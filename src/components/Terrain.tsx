import { useEffect, useMemo } from 'react';
import { grid, sides } from '../core/geometry';
import { threeGeometry } from '../lib/threeGeometry';
import { solidMaterial, depthMaterial, type JellyUniforms } from '../lib/materials';
export function Terrain({jelly,tide,quality}:{jelly:JellyUniforms;tide:{value:number};quality:number}) {
 const resources=useMemo(()=>({surface:threeGeometry(grid(quality===0?96:152)),base:threeGeometry(sides(false)),material:solidMaterial(jelly,tide),depth:depthMaterial(jelly)}),[quality,jelly,tide]);
 useEffect(()=>()=>{resources.surface.dispose();resources.base.dispose();resources.material.dispose();resources.depth.dispose();},[resources]);
 return <group><mesh geometry={resources.surface} material={resources.material} customDepthMaterial={resources.depth} castShadow receiveShadow frustumCulled={false}/><mesh geometry={resources.base} material={resources.material} customDepthMaterial={resources.depth} receiveShadow frustumCulled={false}/></group>;
}
