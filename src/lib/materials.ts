import * as THREE from 'three';
import { jellyGLSL } from '../core/shaders';
export type JellyUniforms={uJelly:{value:THREE.Vector2};uTime:{value:number}};
const project=`
vec4 mvPosition=vec4(transformed,1.0);
#ifdef USE_BATCHING
 mvPosition=batchingMatrix*mvPosition;
#endif
#ifdef USE_INSTANCING
 mvPosition=instanceMatrix*mvPosition;
#endif
vIslandWorld=jelly(mvPosition.xyz);
mvPosition=modelViewMatrix*vec4(vIslandWorld,1.0);
gl_Position=projectionMatrix*mvPosition;`;
/** Deform after instancing, so trees/rocks stay anchored to the same island.
 * Custom depth materials use the identical displacement for matching shadows. */
function patchVertex(source:string){return `${jellyGLSL}\nvarying vec3 vIslandWorld;\n`+source.replace('#include <project_vertex>',project).replace('#include <worldpos_vertex>','vec4 worldPosition=modelMatrix*vec4(vIslandWorld,1.0);');}
export function solidMaterial(jelly:JellyUniforms,tide:{value:number},roughness=.88){
 const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness,metalness:0});
 material.onBeforeCompile=shader=>{
  shader.uniforms.uJelly=jelly.uJelly;shader.uniforms.uTime=jelly.uTime;shader.uniforms.uTide=tide;
  shader.vertexShader=patchVertex(shader.vertexShader);
  shader.fragmentShader=`uniform float uTime,uTide;varying vec3 vIslandWorld;\n`+shader.fragmentShader
   .replace('#include <color_fragment>',`#include <color_fragment>
    diffuseColor.rgb*=.98+.018*sin(vIslandWorld.y*73.+sin(vIslandWorld.x*35.)+sin(vIslandWorld.z*26.));`)
   .replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
    if(vIslandWorld.y<uTide){vec2 p=vIslandWorld.xz;float f=abs(sin(p.x*8.+sin(p.y*5.)+uTime*.4)*sin(p.y*7.7+sin(p.x*5.3)-uTime*.32));float ca=1.-smoothstep(.025,.11,f);totalEmissiveRadiance+=vec3(.24,.31,.17)*ca*.30*exp(-(uTide-vIslandWorld.y)*.4);}`);
 };
 material.customProgramCacheKey=()=>`isole-solid-v1`;
 return material;
}
export function depthMaterial(jelly:JellyUniforms){const m=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});m.onBeforeCompile=s=>{s.uniforms.uJelly=jelly.uJelly;s.vertexShader=patchVertex(s.vertexShader);};m.customProgramCacheKey=()=>`isole-depth-v1`;return m;}
