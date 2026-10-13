from playwright.sync_api import sync_playwright
from pathlib import Path
import json,time
ROOT=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':1440,'height':960},device_scale_factor=1)
 errors=[]
 page.on('pageerror',lambda e: errors.append(str(e)))
 page.on('console',lambda m: errors.append(m.text) if m.type=='error' else None)
 page.set_content((ROOT/'portable/Interactive_Island.html').read_text(), wait_until='load')
 try:page.wait_for_function("document.body.dataset.ready === 'true' || !document.querySelector('#error-card').hidden",timeout=30000)
 except Exception as e:errors.append(str(e))
 page.wait_for_timeout(1200)
 page.screenshot(path=str(ROOT/'tests/desktop-initial.png'))
 print('ERRORS:',json.dumps(errors,ensure_ascii=False))
 print('STATUS:',page.locator('#performance').inner_text())
 print('WEBGL:',page.evaluate("(() => {let g=document.querySelector('canvas').getContext('webgl2');return g?{version:g.getParameter(g.VERSION),renderer:g.getParameter(g.RENDERER),error:g.getError()}:null})()"))
 print('BODY:',page.locator('#error-card').inner_text())
 browser.close()
