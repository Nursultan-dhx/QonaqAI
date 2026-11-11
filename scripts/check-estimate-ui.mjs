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
  await wait("!document.querySelector('.estimate-result')", "preview invalidated on package change");
}
async function submit(total) {
  await act("document.querySelector('.package-configurator form').requestSubmit()");
  await wait("!!document.querySelector('[data-estimate-total]') && window.lastEstimate.totalCost===" + total, "estimate " + total);
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
try {
  await command("session.new", { capabilities: {} });
  ({ context } = await command("browsingContext.create", { type: "tab" }));
  await command("browsingContext.setViewport", { context, viewport: { width: 1280, height: 1000 }, devicePixelRatio: 1 });
  await command("browsingContext.navigate", { context, url: baseUrl, wait: "complete" });
  await evaluate("(async()=>{const headers={'Content-Type':'application/json'};await fetch('/api/auth/demo',{method:'POST',headers,body:'{}'});const date=new Date();date.setDate(date.getDate()+30);for(const fixture of [{title:'Decorator 80 guests',budget:2000000,venueId:1},{title:'Decorator over budget',budget:1000000,venueId:1},{title:'Decorator missing venue',budget:2000000,venueId:null}]){const response=await fetch('/api/events',{method:'POST',headers,body:JSON.stringify({...fixture,type:'CORPORATE',date:date.toISOString().slice(0,10),guests:80,strategy:'ECONOMY'})});if(!response.ok)throw new Error(await response.text());}return true;})()");
  await command("browsingContext.navigate", { context, url: baseUrl, wait: "complete" });
  await wait("!!document.querySelector('nav')", "planner");
  await act("Array.from(document.querySelectorAll('nav button')).find(b=>b.textContent.includes('Мои мероприятия')).click()");
  await wait("document.querySelectorAll('.saved-card').length===3", "saved fixtures");
  await act("window.previewRequests=[];window.delayEstimateResponse=false;window.estimateResponseHeld=false;const originalFetch=window.fetch.bind(window);window.fetch=(path,options)=>{if(String(path).endsWith('/estimate/preview')){window.previewRequests.push(JSON.parse(options.body));return originalFetch(path,options).then(async response=>{window.lastEstimate=await response.clone().json();if(window.delayEstimateResponse){window.estimateResponseHeld=true;await new Promise(resolve=>setTimeout(resolve,900));}return response;});}return originalFetch(path,options)}");
  await open("Decorator 80 guests");
  await fullSelection();
  await submit(1350000);
  await check("window.lastEstimate.remainingBudget===650000 && window.lastEstimate.budgetUsedPercent===67.5 && document.querySelector('[data-budget-status]').dataset.budgetStatus==='WITHIN_BUDGET'", "Required budget example failed");
  await check("document.querySelector('.package-configurator').textContent.includes('Предварительная смета — данные пока не сохранены.')", "Preview disclosure missing");
  console.log("PASS: desktop BASIC → 1350000 KZT, remaining 650000, budget used 67.5%, preview disclosure");

  await service("DECOR");
  await submit(1395000);
  await choosePackage("STANDARD");
  await check("document.querySelector('[data-service-type=DECOR] input').disabled && document.querySelector('[data-service-type=DECOR]').textContent.includes('Включено в пакет')", "DECOR must be included");
  await submit(1415000);
  await check("!window.previewRequests.at(-1).services.some(s=>s.type==='DECOR') && window.lastEstimate.lines.filter(l=>l.code==='SERVICE:DECOR' && l.included && l.total===0).length===1", "DECOR charged twice");
  await choosePackage("PREMIUM");
  await check("document.querySelector('[data-service-type=HOST] input').disabled", "HOST must be included");
  await submit(1435000);
  await check("!window.previewRequests.at(-1).services.some(s=>['HOST','DECOR'].includes(s.type)) && window.lastEstimate.lines.filter(l=>l.included && l.total===0).length===2", "PREMIUM inclusion double charge");
  console.log("PASS: STANDARD includes DECOR; PREMIUM includes DECOR/HOST; included charges are zero and excluded from paid requests");

  await choosePackage("BASIC");
  await check("['HOST','DECOR'].every(type=>{const input=document.querySelector('[data-service-type='+type+'] input');return input.checked&&!input.disabled}) && document.querySelector('[data-service-type=PHOTOGRAPHY] input[type=number]').value==='2' && document.querySelector('[data-service-type=MUSIC] input[type=number]').value==='3'", "Draft was lost on package switch");
  await submit(1395000);
  await service("DECOR", false);
  await submit(1350000);
  console.log("PASS: switching back restores optional intent and hours; removing service rebuilds the quote");

  await hours("PHOTOGRAPHY", 0);
  await check("!document.querySelector('.package-configurator form').checkValidity()", "Invalid hours not blocked by form");
  await hours("PHOTOGRAPHY", 2);
  await act("window.previousRequestCount=window.previewRequests.length;window.delayEstimateResponse=true;window.estimateResponseHeld=false;const form=document.querySelector('.package-configurator form');form.requestSubmit();form.requestSubmit()");
  await wait("window.estimateResponseHeld", "delayed response ready");
  await choosePackage("STANDARD");
  await new Promise(resolve => setTimeout(resolve, 1100));
  await check("window.previewRequests.length===window.previousRequestCount+1 && !document.querySelector('.estimate-result')", "Duplicate or obsolete response accepted");
  await act("window.delayEstimateResponse=false");
  await submit(1415000);
  console.log("PASS: invalid hours; duplicate submit guard; package change discards delayed old response");

  await command("browsingContext.setViewport", { context, viewport: { width: 390, height: 844 }, devicePixelRatio: 1 });
  await check("document.querySelector('.package-configurator').scrollWidth<=document.querySelector('.package-configurator').clientWidth", "Mobile configurator overflow");
  const screenshot = await command("browsingContext.captureScreenshot", { context });
  await writeFile("/tmp/qonaqai-decorator-mobile.png", Buffer.from(screenshot.data, "base64"));
  await act("const modal=document.querySelector('.modal');modal.scrollTop=modal.scrollHeight");
  const breakdown = await command("browsingContext.captureScreenshot", { context });
  await writeFile("/tmp/qonaqai-decorator-breakdown.png", Buffer.from(breakdown.data, "base64"));
  console.log("PASS: 390px layout; screenshots in /tmp/qonaqai-decorator-{mobile,breakdown}.png");

  await close();
  await open("Decorator over budget");
  await fullSelection();
  await submit(1350000);
  await check("window.lastEstimate.eventBudget===1000000 && window.lastEstimate.budgetExcess===350000 && document.querySelector('.estimate-budget-exceeded') && document.querySelector('[data-budget-status]').dataset.budgetStatus==='EXCEEDED'", "Exceeded-budget warning failed");
  console.log("PASS: over-budget preview remains available and shows 350000 KZT excess");

  await act("window.delayEstimateResponse=true;window.estimateResponseHeld=false;document.querySelector('.package-configurator form').requestSubmit()");
  await wait("window.estimateResponseHeld", "other event delayed response");
  await close();
  await open("Decorator 80 guests");
  await new Promise(resolve => setTimeout(resolve, 1100));
  await check("!document.querySelector('.estimate-result') && !document.querySelector('.service-choice input:checked') && document.querySelector('input[value=BASIC]').checked", "Previous event overwrote new draft");
  await act("window.delayEstimateResponse=false");
  await submit(530000);
  console.log("PASS: close/reopen resets unsaved draft; delayed response from another event cannot overwrite it");

  await close();
  await open("Decorator missing venue");
  await check("document.querySelector('.package-configurator button[type=submit]').disabled && document.querySelector('.package-configurator').textContent.includes('выберите и сохраните площадку')", "Missing-venue guidance absent");
  await close();
  await open("Decorator 80 guests");
  await evaluate("(async()=>{const venues=await(await fetch('/api/venues')).json();if(!venues.every(v=>v.price===null))throw new Error('Factual prices changed');await fetch('/api/auth/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});return true})()");
  await act("document.querySelector('.package-configurator form').requestSubmit()");
  await wait("!!document.querySelector('.qentry-auth') && !document.querySelector('.package-configurator')", "expired-session handling");
  console.log("PASS: missing-venue guidance, unchanged factual prices and expired-session navigation");
} finally {
  try { await command("session.end"); } catch {}
  ws.close();
}
