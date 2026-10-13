import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { Leva, useControls } from 'leva';
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three';
import { Diorama, type SceneAPI } from './components/Diorama';
import { defaults, type Settings } from './standalone/engine';

class SceneErrorBoundary extends Component<{children:ReactNode},{error:string|null}>{
 state:{error:string|null}={error:null};
 static getDerivedStateFromError(error:Error){return {error:error.message};}
 render(){return this.state.error?<div className="error-card"><h2>WebGL error</h2><p>{this.state.error}</p><p>Enable hardware acceleration and reload in a WebGL 2 browser.</p></div>:this.props.children;}
}
export default function App(){
 const coarse=useMemo(()=>matchMedia('(pointer: coarse)').matches||innerWidth<760,[]);
 const [panel,setPanel]=useState(!coarse),[autoQuality,setAutoQuality]=useState(coarse?1:2);
 const stats=useRef<HTMLSpanElement>(null),api=useRef<SceneAPI>({splash:()=>{},resetView:()=>{}});
 const [values,set,get]=useControls(()=>({
  waterColor:{value:defaults.waterColor,label:'\u0426\u0432\u0435\u0442 \u0432\u043e\u0434\u044b'},
  waveHeight:{value:defaults.waveHeight,min:0,max:.10,step:.001,label:'\u0412\u044b\u0441\u043e\u0442\u0430 \u0432\u043e\u043b\u043d'},
  rippleStrength:{value:defaults.rippleStrength,min:0,max:2.5,step:.05,label:'\u0421\u0438\u043b\u0430 \u0440\u044f\u0431\u0438'},
  sunAngle:{value:defaults.sunAngle,min:18,max:82,step:1,label:'\u0423\u0433\u043e\u043b \u0441\u043e\u043b\u043d\u0446\u0430'},
  tide:{value:defaults.tide,min:.32,max:.85,step:.01,label:'\u0423\u0440\u043e\u0432\u0435\u043d\u044c \u043c\u043e\u0440\u044f'},
  stiffness:{value:defaults.stiffness,min:0,max:1,step:.01,label:'\u0423\u043f\u0440\u0443\u0433\u043e\u0441\u0442\u044c'},
  dof:{value:defaults.dof,min:0,max:1,step:.01,label:'\u0413\u043b\u0443\u0431\u0438\u043d\u0430 \u0440\u0435\u0437\u043a\u043e\u0441\u0442\u0438'},
  quality:{value:'auto',options:{Auto:'auto',High:'high',Balanced:'balanced',Lite:'lite'},label:'\u041a\u0430\u0447\u0435\u0441\u0442\u0432\u043e'},
  paused:{value:false,label:'\u041f\u0430\u0443\u0437\u0430'},autoRotate:{value:false,label:'\u0410\u0432\u0442\u043e\u043f\u043e\u0432\u043e\u0440\u043e\u0442'}
 }),[]);
 const settings:Settings={...values,quality:values.quality as Settings['quality']};
 const quality=settings.quality==='auto'?autoQuality:settings.quality==='high'?2:settings.quality==='balanced'?1:0;
 const onReady=useCallback((next:SceneAPI)=>{api.current=next;},[]);
 const onDecline=useCallback(()=>{if(get('quality')==='auto')setAutoQuality(q=>Math.max(0,q-1));},[get]);
 const onStats=useCallback((fps:number)=>{if(stats.current)stats.current.textContent=`${fps} FPS / ${['Lite','Balanced','High'][quality]} / R3F 9`;},[quality]);
 const reset=useCallback(()=>{set({...defaults});api.current.resetView();setAutoQuality(coarse?1:2);},[set,coarse]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(['INPUT','SELECT','TEXTAREA','BUTTON'].includes((e.target as HTMLElement).tagName))return;if(e.code==='Space'){e.preventDefault();set({paused:!get('paused')});}if(e.code==='KeyR')reset();};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[set,get,reset]);
 return <main id="app">
  <SceneErrorBoundary><Canvas id="scene" shadows dpr={quality===2?Math.min(devicePixelRatio,1.6):quality===1?1:.72} camera={{position:[8.62,10.40,10.23],fov:29.2,near:.1,far:80}} gl={{antialias:false,alpha:false,powerPreference:'high-performance'}} onCreated={({gl})=>{gl.toneMapping=ACESFilmicToneMapping;gl.toneMappingExposure=1.04;gl.outputColorSpace=SRGBColorSpace;}} fallback={<div className="error-card">WebGL 2 is unavailable. Enable hardware acceleration.</div>}>
   <Suspense fallback={null}><Diorama settings={settings} quality={quality} onReady={onReady} onDecline={onDecline} stats={onStats}/></Suspense>
  </Canvas></SceneErrorBoundary>
  <header className="topbar"><button className="brand" onClick={reset} aria-label="Reset island"><svg width="31" height="26" viewBox="0 0 36 28"><path fill="currentColor" d="M2 24 11 8l9 16zm12-10L21 2l13 22H22z"/></svg><span>{'ISOL\u00c9'}</span></button><span className="edition">A SMALL WORLD / VOL. 001</span><button className="settings-toggle" onClick={()=>setPanel(x=>!x)} aria-expanded={panel}>{'\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438'}</button></header>
  <section className="hero"><div className="eyebrow"><span className="live-dot"/> INTERACTIVE DIORAMA</div><h1>{'\u041e\u0441\u0442\u0440\u043e\u0432.'}<br/>{' \u0412 \u0442\u0432\u043e\u0438\u0445 \u0440\u0443\u043a\u0430\u0445.'}</h1><p className="intro">{'\u041c\u0438\u043d\u0438\u0430\u0442\u044e\u0440\u043d\u044b\u0439 \u043c\u0438\u0440 \u0432 \u043f\u0440\u043e\u0437\u0440\u0430\u0447\u043d\u043e\u0439 \u0431\u0438\u0440\u044e\u0437\u0435. \u041a\u043e\u0441\u043d\u0438\u0441\u044c \u0432\u043e\u0434\u044b \u043a\u0443\u0440\u0441\u043e\u0440\u043e\u043c.'}</p><button className="primary" onClick={()=>api.current.splash()}><span>{'\u0421\u043e\u0437\u0434\u0430\u0442\u044c \u0432\u043e\u043b\u043d\u0443'}</span><span>{'\u2197'}</span></button><div className="hero-note">PROCEDURAL GEOMETRY<br/>REAL-TIME GPU WATER</div></section>
  <aside className={`r3f-controls ${panel?'':'r3f-hidden'}`}><Leva fill flat titleBar={{title:'ISOLE / Scene controls',drag:false,filter:false}} hideCopyButton theme={{sizes:{rootWidth:'260px',controlWidth:'125px'},colors:{elevation1:'#f7f3eb',elevation2:'#ece9e0',elevation3:'#dcded2',accent1:'#3d665a',accent2:'#567e70',accent3:'#80a394',highlight1:'#667061',highlight2:'#404c3e',highlight3:'#283424'}}}/><button className="r3f-reset" onClick={reset}>{'\u0421\u0431\u0440\u043e\u0441\u0438\u0442\u044c \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438'}</button></aside>
  <footer className="bottombar"><div className="eyebrow"><span className="live-dot"/><span ref={stats}>GPU WATER / R3F 9</span></div><div className="interaction-hint">{'\u041a\u0423\u0420\u0421\u041e\u0420 \u2014 \u0412\u041e\u041b\u041d\u042b / \u041f\u0415\u0420\u0415\u0422\u0410\u0429\u0418 \u2014 \u041f\u041e\u0412\u041e\u0420\u041e\u0422'}</div><div className="actions"><button className="quiet" onClick={()=>set({paused:!values.paused})}>{values.paused?'\u041f\u0440\u043e\u0434\u043e\u043b\u0436\u0438\u0442\u044c':'\u041f\u0430\u0443\u0437\u0430'}</button><button className="icon-button" title="Fullscreen" onClick={()=>{const p=document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen?.();p?.catch(()=>{});}}>{'\u26f6'}</button></div></footer>
 </main>;
}
