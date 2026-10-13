from pathlib import Path
from playwright.sync_api import sync_playwright
import json, sys
ROOT=Path(__file__).resolve().parents[1]
mobile='--mobile' in sys.argv
report={'edition':'portable WebGL2','mobile_emulation':mobile,'checks':{},'errors':[],'requests':[]}
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':390,'height':844} if mobile else {'width':1100,'height':780},device_scale_factor=1,is_mobile=mobile,has_touch=mobile)
 page.on('pageerror',lambda e:report['errors'].append(str(e)))
 page.on('console',lambda m:report['errors'].append(m.text) if m.type=='error' else None)
 page.on('request',lambda r:report['requests'].append(r.url))
 page.set_content((ROOT/'portable/Interactive_Island.html').read_text(),wait_until='load')
 page.wait_for_function("!!window.__island || !document.querySelector('#error-card').hidden",timeout=20000)
 report['checks']['initialization']=page.evaluate("!!window.__island && document.querySelector('#error-card').hidden")
 assert report['checks']['initialization'],page.locator('#error-message').inner_text()
 page.evaluate("window.__island.scene.setQuality('lite')")
 page.wait_for_timeout(350)
 report['initial']=page.evaluate('window.__island.scene.diagnostics()')
 report['checks']['gpu_heightfield']=report['initial']['gpuSimulation'] and report['initial']['readError']==0
 if mobile:
  report['checks']['panel_initially_hidden']=page.locator('#panel').evaluate("p=>p.classList.contains('closed') && p.inert")
  page.locator('#toggle-panel').tap()
  report['checks']['panel_touch_toggle']=page.locator('#panel').evaluate("p=>!p.classList.contains('closed') && !p.inert")
  page.locator('#toggle-panel').tap()
  page.touchscreen.tap(238,420)
  page.wait_for_timeout(300)
  report['checks']['no_horizontal_overflow']=page.evaluate('document.documentElement.scrollWidth <= innerWidth')
  page.screenshot(path=str(ROOT/'tests/mobile-preview.png'))
 else:
  page.locator('#waveHeight').evaluate("e=>{e.value='0.050';e.dispatchEvent(new Event('input',{bubbles:true}))}")
  report['checks']['wave_slider']=page.evaluate("window.__island.scene.settings.waveHeight === .05 && document.querySelector('#waveHeight-output').textContent === '0.050'")
  page.locator('#waterColor').evaluate("e=>{e.value='#53ac84';e.dispatchEvent(new Event('input',{bubbles:true}))}")
  report['checks']['color_picker']=page.evaluate("window.__island.scene.settings.waterColor === '#53ac84'")
  page.evaluate("window.__island.scene.settings.waveHeight=0;window.__island.scene.splash()")
  page.wait_for_timeout(600)
  wave=page.evaluate('window.__island.scene.diagnostics()')
  report['after_splash']=wave
  report['checks']['splash_changes_gpu_height']=wave['readError']==0 and wave['waveMaximum'] > .0001
  page.mouse.move(610,420)
  page.wait_for_timeout(400)
  a=page.evaluate('window.__island.scene.diagnostics()')
  report['checks']['pointer_jelly']=sum(abs(v) for v in a['jelly'])>.0001
  page.mouse.move(610,420);page.mouse.down();page.mouse.move(690,460,steps=4);page.mouse.up()
  page.wait_for_timeout(450)
  b=page.evaluate('window.__island.scene.diagnostics()')
  report['checks']['drag_orbits']=abs(a['camera'][0]-b['camera'][0])>.01
  page.mouse.wheel(0,220);page.wait_for_timeout(300)
  c=page.evaluate('window.__island.scene.diagnostics()')
  report['checks']['wheel_zooms']=abs(b['camera'][2]-c['camera'][2])>.01
  page.locator('[data-view="lagoon"]').click();page.wait_for_timeout(400)
  d=page.evaluate('window.__island.scene.diagnostics()')
  report['checks']['preset_camera']=abs(d['camera'][1]-c['camera'][1])>.01
  page.locator('#pause').click()
  t=page.evaluate('window.__island.scene.diagnostics().time');page.wait_for_timeout(350)
  report['checks']['pause_stops_time']=page.evaluate('window.__island.scene.diagnostics().time')==t
  page.locator('#about').click()
  report['checks']['about_opens']=page.locator('#about-dialog').evaluate('e=>e.open')
  page.locator('#close-about').click()
  page.locator('#reset').click()
  report['checks']['reset_restores_controls']=page.evaluate("window.__island.scene.settings.waterColor === '#35aaa3' && !window.__island.scene.settings.paused && document.querySelector('#pause').getAttribute('aria-pressed') === 'false' && document.querySelector('#waveHeight').value === '0.03'")
  page.evaluate("window.__island.scene.setQuality('lite')")
  page.wait_for_timeout(250)
  report['checks']['lite_reduces_resolution']=page.evaluate('window.__island.scene.diagnostics().resolution[0] < innerWidth')
  with page.expect_download(timeout=15000) as dl:
   page.locator('#capture').click()
  download=dl.value
  report['checks']['png_export']=download.suggested_filename.lower().endswith('.png') and download.failure() is None
 report['final']=page.evaluate('window.__island.scene.diagnostics()')
 report['checks']['webgl_no_error']=page.evaluate("document.querySelector('#scene').getContext('webgl2').getError() === 0")
 report['checks']['no_runtime_errors']=len(report['errors'])==0
 report['checks']['no_network_requests']=len(report['requests'])==0
 browser.close()
report['passed']=all(report['checks'].values())
path=ROOT/'tests'/('mobile-results.json' if mobile else 'desktop-results.json')
path.write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,indent=2))
if not report['passed']:sys.exit(1)
