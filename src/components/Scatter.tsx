import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { makeRocks, makePlants } from '../core/terrain';
import { compose, random } from '../core/math';
import { sphere, cylinder, leaf, type GeometryData } from '../core/geometry';
import { threeGeometry } from '../lib/threeGeometry';
import { depthMaterial, solidMaterial, type JellyUniforms } from '../lib/materials';

function Instances({data,instances,jelly,tide}:{data:GeometryData;instances:number[][];jelly:JellyUniforms;tide:{value:number}}){
 const ref=useRef<THREE.InstancedMesh>(null);
 const resources=useMemo(()=>({geometry:threeGeometry(data),material:solidMaterial(jelly,tide),depth:depthMaterial(jelly)}),[data,jelly,tide]);
 useLayoutEffect(()=>{const mesh=ref.current;if(!mesh)return;const matrix=new THREE.Matrix4(),color=new THREE.Color();instances.forEach((row,i)=>{matrix.fromArray(row,0);mesh.setMatrixAt(i,matrix);color.setRGB(row[16],row[17],row[18]);mesh.setColorAt(i,color);});mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();},[instances]);
 useEffect(()=>()=>{resources.geometry.dispose();resources.material.dispose();resources.depth.dispose();},[resources]);
 return <instancedMesh ref={ref} args={[resources.geometry,resources.material,instances.length]} customDepthMaterial={resources.depth} castShadow receiveShadow frustumCulled={false}/>;
}
export function Scatter({jelly,tide,quality}:{jelly:JellyUniforms;tide:{value:number};quality:number}){
 const data=useMemo(()=>{
  const rocks=makeRocks().map(r=>[...compose(r.position,r.scale,r.angle),...r.tint]);
  const trunks:number[][]=[],crowns:number[][]=[],leaves:number[][]=[],r=random(215);
  for(const {position:p,scale:s,angle,tint,kind} of makePlants(quality===0?34:49)){
   const h=kind==='palm'?s*1.9:s*1.4;
   trunks.push([...compose(p,[s*.07,h,s*.07],angle),.21,.135,.065]);
   if(kind==='palm')for(let i=0;i<8;i++)leaves.push([...compose([p[0],p[1]+h,p[2]],[s*.95,s*.95,s*.95],angle+i*Math.PI/4),...tint]);
   else for(let j=0;j<5;j++){const a=j*2.399,dx=j===0?0:Math.cos(a)*s*.32,dz=j===0?0:Math.sin(a)*s*.32;crowns.push([...compose([p[0]+dx,p[1]+h+(j===0?.03:0),p[2]+dz],[s*(.40+r()*.15),s*(.27+r()*.14),s*(.40+r()*.13)],angle),...tint]);}
  }
  return {rocks,trunks,crowns,leaves,rock:sphere(11,15,true),trunk:cylinder(7),crown:sphere(6,9,true),leaf:leaf()};
 },[quality]);
 return <group><Instances data={data.rock} instances={data.rocks} jelly={jelly} tide={tide}/><Instances data={data.trunk} instances={data.trunks} jelly={jelly} tide={tide}/><Instances data={data.crown} instances={data.crowns} jelly={jelly} tide={tide}/>{data.leaves.length>0&&<Instances data={data.leaf} instances={data.leaves} jelly={jelly} tide={tide}/>}</group>;
}
