import { writeFile } from "node:fs/promises";

// Run only against the explicitly supplied disposable application (see DECORATOR_IMPLEMENTATION.md).
const baseUrl = process.env.QONAQ_UI_TEST_BASE_URL;
if (!baseUrl) throw new Error("Set QONAQ_UI_TEST_BASE_URL to the disposable H2-in-memory application.");
const ws = new WebSocket(process.env.QONAQ_BIDI_URL || "ws://127.0.0.1:19224/session");
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});
let sequence = 0;
const pending = new Map();
ws.addEventListener("message", ({ data }) => {
  const message = JSON.parse(data);
  const handler = pending.get(message.id);
  if (!handler) return;
  pending.delete(message.id);
  clearTimeout(handler.timeout);
  if (message.type === "error") handler.reject(new Error(JSON.stringify(message)));
  else handler.resolve(message.result);
});
function command(method, params = {}) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error("Protocol timeout: " + method)); }, 15000);
    pending.set(id, { resolve, reject, timeout });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
let context;
async function evaluate(expression) {
  const response = await command("script.evaluate", { expression, target: { context }, awaitPromise: true });
  if (response.type === "exception") throw new Error(JSON.stringify(response.exceptionDetails));
  return response.result.value;
}
async function act(source) { return evaluate("(function(){" + source + ";return true;})()"); }
async function wait(expression, label) {
  for (let i = 0; i < 80; i++) {
    if (await evaluate(expression)) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error("Timed out: " + label);
}
async function check(expression, label) {
  if (!(await evaluate(expression))) throw new Error(label);
}
async function service(type, chosen = true) {
  await act("const input=document.querySelector('[data-service-type=" + type + "] input[type=checkbox]'); if(input.checked!==" + chosen + ") input.click()");
}
async function hours(type, value) {
  await act("const input=document.querySelector('[data-service-type=" + type + "] input[type=number]'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'" + value + "');input.dispatchEvent(new Event('input',{bubbles:true}))");
}
async function choosePackage(code) {
  await act("document.querySelector('input[name=packageCode][value=" + code + "]').click()");
  await wait("!document.querySelector('.estimate-result') || document.querySelector('.estimate-result h3').textContent.includes('Сохранённая смета')", "preview invalidated; historical saved snapshot remains labeled");
}
async function submit(total) {
  await act("document.querySelector('.package-configurator form').requestSubmit()");
  await wait("document.querySelector('.estimate-result h3')?.textContent.includes('Предварительный расчёт') && window.lastEstimate?.totalCost===" + total, "current preview " + total);
  await check("document.querySelector('[data-estimate-total]').textContent.replace(/[^0-9,]/g,'')==='" + total + ",00'", "Displayed total does not match server");
}
async function close() {
  await act("document.querySelector('.modal-heading button').click()");
  await wait("!document.querySelector('.package-configurator')", "closed modal");
}
async function open(title) {
  await act("Array.from(document.querySelectorAll('.saved-card')).find(card=>card.querySelector('h2').textContent===" + JSON.stringify(title) + ").querySelector('.service-open').click()");
  await wait("document.querySelectorAll('.package-card').length===3 && document.querySelectorAll('.service-choice input').length===5", "configurator metadata");
}
async function fullSelection() {
  await service("HOST"); await service("PHOTOGRAPHY"); await hours("PHOTOGRAPHY", 2);
  await service("MUSIC"); await hours("MUSIC", 3); await service("CATERING");
}
async function saveCurrent() {
  await act("document.querySelector('[data-save-estimate]').click()");
  await wait("!document.querySelector('[data-draft-dirty]') && document.querySelector('.service-preview-notice').textContent.includes('Смета сохранена')", "saved state");
}
async function instrument() {
  await act("window.previewRequests=[];window.saveRequests=0;window.holdSaves=false;window.saveReady=false;window.failNextSave=false;const nativeFetch=window.fetch.bind(window);window.fetch=(path,options)=>{if(String(path).endsWith('/estimate/preview')){window.previewRequests.push(JSON.parse(options.body));return nativeFetch(path,options).then(async response=>{window.lastEstimate=await response.clone().json();return response;});}if(String(path).endsWith('/package')&&options?.method==='PUT'){window.saveRequests++;if(window.failNextSave){window.failNextSave=false;return Promise.resolve(new Response(JSON.stringify({message:'Проверка ошибки сохранения',errors:{}}),{status:400,headers:{'Content-Type':'application/json'}}));}return nativeFetch(path,options).then(async response=>{if(window.holdSaves){window.saveReady=true;await new Promise(resolve=>setTimeout(resolve,900));}return response;});}return nativeFetch(path,options)}");
}
async function page() {
  await command("browsingContext.navigate", { context, url: baseUrl, wait: "complete" });
  await wait("!!document.querySelector('nav')", "planner");
  await act("Array.from(document.querySelectorAll('nav button')).find(b=>b.textContent.includes('Мои мероприятия')).click()");
  await wait("document.querySelectorAll('.saved-card').length===2", "owned events");
  await instrument();
}
try {
  await command("session.new", { capabilities: {} });
  ({ context } = await command("browsingContext.create", { type: "tab" }));
  const tabA=context;
  await command("browsingContext.navigate", { context, url: baseUrl, wait: "complete" });
  await evaluate("(async()=>{const headers={'Content-Type':'application/json'};const auth=await fetch('/api/auth/register',{method:'POST',headers,body:JSON.stringify({name:'Saved browser test',email:'saved-ui-'+Date.now()+'@example.com',password:'Saved-ui-test-9876'})});if(!auth.ok)throw new Error(await auth.text());const date=new Date();date.setDate(date.getDate()+30);for(const fixture of [{title:'Saved browser event',budget:2000000},{title:'Saved over budget',budget:600000}]){const response=await fetch('/api/events',{method:'POST',headers,body:JSON.stringify({...fixture,venueId:1,type:'CORPORATE',date:date.toISOString().slice(0,10),guests:80,strategy:'ECONOMY'})});if(!response.ok)throw new Error(await response.text());}return true;})()");
  await page();
  await open("Saved browser event");
  await choosePackage("STANDARD");
  await service("PHOTOGRAPHY"); await hours("PHOTOGRAPHY",3);
  await submit(670000); await saveCurrent();
  await close(); await open("Saved browser event");
  await check("document.querySelector('input[value=STANDARD]').checked && document.querySelector('[data-service-type=PHOTOGRAPHY] input[type=number]').value==='3' && document.querySelector('[data-estimate-total]').textContent.replace(/[^0-9,]/g,'')==='670000,00'","Saved values did not restore");
  await page(); await open("Saved browser event");
  await check("document.querySelector('input[value=STANDARD]').checked && document.querySelector('[data-saved-revision]').dataset.savedRevision==='1'","Browser refresh lost saved state");
  console.log("PASS: STANDARD + photography 3h → preview/save 670000; close/reopen and full browser reload restore configuration and quote");

  ({context}=await command("browsingContext.create",{type:"tab"}));
  const tabB=context;
  await page();await open("Saved browser event");
  context=tabA;
  await choosePackage("PREMIUM");await submit(760000);await saveCurrent();
  context=tabB;
  await choosePackage("BASIC");await submit(605000);
  await act("document.querySelector('[data-save-estimate]').click()");
  await wait("!!document.querySelector('[data-refresh-saved]')","stale version conflict");
  await check("document.querySelector('input[value=BASIC]').checked","Conflict lost local draft");
  await act("document.querySelector('[data-refresh-saved]').click()");
  await wait("!document.querySelector('[data-refresh-saved]')","conflict refresh");
  await check("document.querySelector('input[value=BASIC]').checked && document.querySelector('[data-service-type=PHOTOGRAPHY] input[type=number]').value==='3'","Refresh lost draft");
  await submit(605000);await saveCurrent();
  console.log("PASS: PREMIUM save; two-tab stale save rejected; explicit refresh preserves local draft and enables a new revision");

  context=tabA;await close();await open("Saved browser event");
  await choosePackage("STANDARD");await submit(670000);
  await act("window.saveRequests=0;window.holdSaves=true;window.saveReady=false;const button=document.querySelector('[data-save-estimate]');button.click();button.click()");
  await wait("window.saveReady","delayed save response");
  await choosePackage("PREMIUM");await hours("PHOTOGRAPHY",4);await service("CATERING");
  await new Promise(resolve=>setTimeout(resolve,1100));
  await check("window.saveRequests===1 && document.querySelector('input[value=PREMIUM]').checked && document.querySelector('[data-service-type=PHOTOGRAPHY] input[type=number]').value==='4' && !!document.querySelector('[data-draft-dirty]')","Delayed save replaced a newer draft or duplicate request");
  await act("window.holdSaves=false;window.failNextSave=true");
  await submit(1425000);
  await act("document.querySelector('[data-save-estimate]').click()");
  await wait("Array.from(document.querySelectorAll('.field-error')).some(e=>e.textContent.includes('Проверка ошибки'))","ordinary error");
  await check("document.querySelector('input[value=PREMIUM]').checked && !!document.querySelector('[data-draft-dirty]')","Validation error destroyed draft");
  await saveCurrent();
  console.log("PASS: duplicate save suppressed; in-flight save cannot replace newer PREMIUM/4h/catering draft; validation failure preserves draft; retry saves");

  await evaluate("(async()=>{const bootstrap=await(await fetch('/api/bootstrap')).json();const event=bootstrap.events.find(e=>e.title==='Saved browser event');const response=await fetch('/api/events/'+event.id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...event,guests:90})});if(!response.ok)throw new Error(await response.text());return true})()");
  await close();await open("Saved browser event");
  await check("!!document.querySelector('[data-quote-outdated]') && document.querySelector('[data-estimate-total]').textContent.replace(/[^0-9,]/g,'')==='1425000,00'","Changed event did not mark old snapshot outdated");
  await submit(1505000);await saveCurrent();
  await check("!document.querySelector('[data-quote-outdated]')","Fresh save did not update freshness");
  console.log("PASS: event guest change preserves 1425000 snapshot as OUTDATED; explicit calculation/save creates CURRENT 1505000 quote");

  await close();await open("Saved over budget");
  await choosePackage("STANDARD");await service("PHOTOGRAPHY");await hours("PHOTOGRAPHY",3);
  await submit(670000);await saveCurrent();
  await check("!!document.querySelector('.estimate-budget-exceeded') && document.querySelector('[data-budget-excess]').textContent.replace(/[^0-9,]/g,'')==='70000,00'","Saved over-budget warning absent");
  for(const width of [1280,768,390]){
    await command("browsingContext.setViewport",{context,viewport:{width,height:900},devicePixelRatio:1});
    await check("document.querySelector('.package-configurator').scrollWidth<=document.querySelector('.package-configurator').clientWidth","Saved panel overflow at "+width);
  }
  const screenshot=await command("browsingContext.captureScreenshot",{context});
  await writeFile("/tmp/qonaqai-saved-estimate-mobile.png",Buffer.from(screenshot.data,"base64"));
  await close();await open("Saved over budget");
  await check("document.querySelector('input[value=STANDARD]').checked && !!document.querySelector('.estimate-budget-exceeded')","Saved over-budget state failed to restore");
  console.log("PASS: over-budget quote can be saved and restored; desktop/tablet/390px layout is usable");
} finally {
  try {await command("session.end");} catch {}
  ws.close();
}
