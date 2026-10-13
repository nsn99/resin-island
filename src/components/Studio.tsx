import { Component, Suspense, useMemo, type ReactNode } from 'react';
import { Environment, Lightformer, ContactShadows } from '@react-three/drei';
import { Bloom, DepthOfField, EffectComposer, Vignette } from '@react-three/postprocessing';
import { Vector3 } from 'three';
import type { Settings } from '../standalone/engine';
function GeneratedEnvironment(){return <Environment resolution={128} frames={1}><color attach="background" args={['#ebe7df']}/><Lightformer intensity={3} position={[-5,7,-4]} rotation={[Math.PI/3,0,Math.PI/5]} scale={[9,4,1]}/><Lightformer intensity={2} position={[5,3,0]} rotation={[0,-Math.PI/2,0]} scale={[3,7,1]}/><Lightformer intensity={1.4} position={[0,5,6]} rotation={[Math.PI/2,0,0]} scale={[8,2,1]}/></Environment>;}
class EnvironmentFallback extends Component<{children:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}render(){return this.state.failed?<GeneratedEnvironment/>:this.props.children;}}
export function Studio({settings,quality}:{settings:Settings;quality:number}){
 const a=settings.sunAngle*Math.PI/180,focus=useMemo(()=>new Vector3(0,.42,0),[]);
 return <>
  <color attach="background" args={['#f2eee5']}/>
  <ambientLight intensity={.40}/><hemisphereLight color="#fff4df" groundColor="#6b8078" intensity={.9}/>
  <directionalLight position={[-Math.cos(a)*9,Math.sin(a)*9,-5]} intensity={3.2} color="#fff4df" castShadow shadow-mapSize={[quality===2?1024:512,quality===2?1024:512]} shadow-camera-left={-5} shadow-camera-right={5} shadow-camera-top={5} shadow-camera-bottom={-5} shadow-camera-near={.1} shadow-camera-far={24} shadow-bias={-.00025} shadow-normalBias={.018}/>
  <EnvironmentFallback><Suspense fallback={<GeneratedEnvironment/>}><Environment preset="sunset" environmentIntensity={.62} environmentRotation={[0,1.15,0]}/></Suspense></EnvironmentFallback>
  <mesh rotation={[-Math.PI/2,0,0]} position={[0,-1.29,0]} receiveShadow><planeGeometry args={[100,100]}/><meshStandardMaterial color="#eee6d8" roughness={1}/></mesh>
  <ContactShadows position={[0,-1.275,0]} opacity={.35} scale={10} blur={2.8} far={4.0} resolution={quality===2?512:256} frames={1} color="#514d3f"/>
  {quality>0&&<EffectComposer multisampling={quality===2?2:0} enableNormalPass={false}>
   <DepthOfField target={focus} bokehScale={settings.dof*1.2} resolutionScale={.5}/>
   <Bloom intensity={.15} luminanceThreshold={1.1} mipmapBlur/>
   <Vignette eskil={false} offset={.2} darkness={.18}/>
  </EffectComposer>}
 </>;
}
