import { writeFile } from "node:fs/promises";

// Run only against the explicitly supplied disposable application (see DECORATOR_IMPLEMENTATION.md).
const baseUrl = process.env.QONAQ_UI_TEST_BASE_URL;
if (!baseUrl)
  throw new Error(
    "Set QONAQ_UI_TEST_BASE_URL to the disposable H2-in-memory application.",
  );
const ws = new WebSocket(
  process.env.QONAQ_BIDI_URL || "ws://127.0.0.1:19226/session",
);
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
  if (message.type === "error")
    handler.reject(new Error(JSON.stringify(message)));
  else handler.resolve(message.result);
});
function command(method, params = {}) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new Error("Protocol timeout: " + method));
    }, 15000);
    pending.set(id, { resolve, reject, timeout });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
let context;
async function evaluate(expression) {
  const response = await command("script.evaluate", {
    expression,
    target: { context },
    awaitPromise: true,
  });
  if (response.type === "exception")
    throw new Error(JSON.stringify(response.exceptionDetails));
  return response.result.value;
}
async function act(source) {
  return evaluate("(function(){" + source + ";return true;})()");
}
async function wait(expression, label) {
  for (let i = 0; i < 80; i++) {
    if (await evaluate(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Timed out: " + label);
}
async function check(expression, label) {
  if (!(await evaluate(expression))) throw new Error(label);
}
async function click(selector) {
  await act(`document.querySelector(${JSON.stringify(selector)}).click()`);
}
async function input(selector, value) {
  await act(
    `const input=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}))`,
  );
}
async function open(title) {
  await act(
    `Array.from(document.querySelectorAll('.saved-card')).find(card=>card.querySelector('h2').textContent===${JSON.stringify(title)}).querySelector('.service-open').click()`,
  );
  await wait(
    "!!document.querySelector('.booking-disclosure summary')",
    "booking disclosure",
  );
  await check(
    "!document.querySelector('.booking-disclosure').open",
    "booking should start collapsed",
  );
  await click(".booking-disclosure summary");
  await check(
    "document.querySelector('[data-booking-start]').getClientRects().length > 0",
    "booking controls visible after opening disclosure",
  );
  await wait(
    "!!document.querySelector('[data-booking-start]') && (!document.querySelector('[data-check-availability]').closest('fieldset').disabled || !!document.querySelector('.package-configurator [data-booking-status=CONFIRMED]'))",
    "booking panel loaded",
  );
}
async function close() {
  await click(".modal-heading button");
  await wait(
    "!document.querySelector('.package-configurator')",
    "modal closed",
  );
}
async function checkSlot(expected) {
  await wait(
    "!document.querySelector('[data-check-availability]').closest('fieldset').disabled",
    "availability controls ready",
  );
  await act("document.querySelector('.booking-panel form').requestSubmit()");
  await wait(
    `document.querySelector('[data-availability]')?.dataset.availability===${JSON.stringify(expected)}`,
    "availability " + expected,
  );
}
async function availableAgain() {
  await wait(
    "!!document.querySelector('[data-cancel-booking]') && !document.querySelector('[data-cancel-booking]').disabled",
    "cancellation ready",
  );
  await click("[data-cancel-booking]");
  await wait(
    "document.querySelectorAll('.package-configurator [data-booking-status=CONFIRMED]').length===0 && !!document.querySelector('.package-configurator [data-booking-status=CANCELLED]')",
    "booking cancelled",
  );
  await checkSlot("available");
}
let fixtures;
try {
  await command("session.new", { capabilities: {} });
  ({ context } = await command("browsingContext.create", { type: "tab" }));
  await command("browsingContext.navigate", {
    context,
    url: baseUrl + "/?booking-smoke=" + Date.now(),
    wait: "complete",
  });
  fixtures = JSON.parse(
    await evaluate(`(async()=>{
    const headers={'Content-Type':'application/json'};
    async function call(path,body){const response=await fetch(path,{method:'POST',headers,body:JSON.stringify(body)});if(!response.ok)throw new Error(await response.text());return response.json();}
    await call('/api/auth/register',{name:'Booking browser',email:'booking-ui-'+Date.now()+'@example.com',password:'Booking-ui-test-9876'});
    const day=new Date();day.setDate(day.getDate()+30);let date;
    for(let i=0;i<365;i++){
      date=day.toISOString().slice(0,10);
      const query=new URLSearchParams({start:date+'T18:00:00+05:00',end:date+'T22:00:00+05:00'});
      const response=await fetch('/api/venues/1/availability?'+query);if(!response.ok)throw new Error(await response.text());
      if((await response.json()).available)break;
      day.setDate(day.getDate()+1);
    }
    const draft={type:'CORPORATE',date,guests:80,budget:2000000,strategy:'ECONOMY',venueId:1};
    const first=await call('/api/events',{...draft,title:'Booking browser event'});
    const second=await call('/api/events',{...draft,title:'Booking competing event'});
    return JSON.stringify({first:first.event.id,second:second.event.id,date});
  })()`),
  );
  await command("browsingContext.navigate", {
    context,
    url: baseUrl + "/?booking-smoke=" + Date.now(),
    wait: "complete",
  });
  await wait("!!document.querySelector('nav')", "authenticated planner");
  await act(
    "Array.from(document.querySelectorAll('nav button')).find(b=>b.textContent.includes('Мои мероприятия')).click()",
  );
  await wait(
    "document.querySelectorAll('.saved-card').length===2",
    "saved events",
  );
  await open("Booking browser event");
  await click("input[name=packageCode][value=STANDARD]");
  await click("[data-service-type=PHOTOGRAPHY] input[type=checkbox]");
  await input("[data-service-type=PHOTOGRAPHY] input[type=number]", "3");
  await act(
    "document.querySelector('.package-configurator form').requestSubmit()",
  );
  await wait(
    "!document.querySelector('[data-save-estimate]').disabled",
    "preview received",
  );
  await click("[data-save-estimate]");
  await wait(
    "!document.querySelector('[data-draft-dirty]') && document.querySelector('[data-saved-revision]')?.dataset.savedRevision==='1'",
    "saved estimate",
  );
  await close();
  await open("Booking browser event");
  await check(
    "document.querySelector('input[value=STANDARD]').checked && document.querySelector('[data-service-type=PHOTOGRAPHY] input[type=number]').value==='3'",
    "saved package missing",
  );
  console.log(
    "PASS: open saved event, configure STANDARD + photography 3h, save estimate, reopen package and booking panel",
  );

  await act(
    "window.bookingNativeFetch=window.fetch.bind(window);window.bookingRequests=0;window.availabilityRequests=0;window.failAvailability=true;window.fetch=(path,options)=>{if(String(path).includes('/availability?')){window.availabilityRequests++;if(window.failAvailability){window.failAvailability=false;return Promise.reject(new Error('Тестовая ошибка сети'));}}if(String(path).endsWith('/bookings')&&options?.method==='POST')window.bookingRequests++;return window.bookingNativeFetch(path,options).then(async response=>{await new Promise(resolve=>setTimeout(resolve,250));return response;});}",
  );
  await act("document.querySelector('.booking-panel form').requestSubmit()");
  await wait(
    "Array.from(document.querySelectorAll('.booking-panel [role=alert]')).some(e=>e.textContent.includes('Тестовая ошибка сети'))",
    "network error shown",
  );
  await check(
    "document.querySelector('[data-confirm-booking]').disabled",
    "confirmation enabled without check",
  );
  await checkSlot("available");
  await act(
    "const button=document.querySelector('[data-confirm-booking]');button.click();button.click()",
  );
  await wait(
    "!!document.querySelector('.package-configurator [data-booking-status=CONFIRMED]')",
    "confirmed booking",
  );
  await check("window.bookingRequests===1", "duplicate confirmation request");
  await close();
  await open("Booking browser event");
  await check(
    "!!document.querySelector('.package-configurator [data-booking-status=CONFIRMED]')",
    "booking history lost after reopen",
  );
  await availableAgain();
  console.log(
    "PASS: network error/retry, availability, duplicate confirmation suppressed, persisted status/history, cancellation releases slot",
  );

  // A second event wins after the first event's advisory availability check.
  const otherBookingId = await evaluate(`(async()=>{
    const headers={'Content-Type':'application/json'};
    async function send(path,method,body){const r=await fetch(path,{method,headers,body:JSON.stringify(body)});if(!r.ok)throw new Error(await r.text());return r.json();}
    const q=await send('/api/events/${fixtures.second}/estimate/preview','POST',{packageCode:'BASIC',services:[]});
    const saved=await send('/api/events/${fixtures.second}/package','PUT',{packageCode:'BASIC',services:[],expectedConfigurationVersion:null,packageCatalogVersion:q.packageCatalogVersion,serviceCatalogVersion:q.serviceCatalogVersion,venueCatalogVersion:q.venueCatalogVersion,expectedEventInputToken:q.eventInputToken,expectedPricingToken:q.pricingToken});
    const booking=await send('/api/events/${fixtures.second}/bookings','POST',{start:'${fixtures.date}T18:00:00+05:00',end:'${fixtures.date}T22:00:00+05:00',estimateId:saved.currentEstimate.estimateId});return booking.id;
  })()`);
  await click("[data-confirm-booking]");
  await wait(
    "Array.from(document.querySelectorAll('.booking-panel [role=alert]')).some(e=>e.textContent.includes('занята'))",
    "stale availability conflict",
  );
  await check(
    "document.querySelector('[data-confirm-booking]').disabled && document.querySelectorAll('.package-configurator [data-booking-status=CONFIRMED]').length===0",
    "conflict did not invalidate availability",
  );
  await checkSlot("busy");
  await evaluate(
    `(async()=>{const r=await fetch('/api/bookings/${otherBookingId}/cancel',{method:'POST'});if(!r.ok)throw new Error(await r.text());return true})()`,
  );
  await checkSlot("available");
  console.log(
    "PASS: stale availability handled as conflict; confirm disabled; occupied slot shown; competitor cancellation releases slot",
  );

  // A response can be lost after commit; the UI must recover authoritative history.
  await act(
    "window.fetch=async(path,options)=>{const response=await window.bookingNativeFetch(path,options);if(String(path).endsWith('/bookings')&&options?.method==='POST')throw new Error('Потерян ответ подтверждения');return response;}",
  );
  await click("[data-confirm-booking]");
  await wait(
    "!!document.querySelector('.package-configurator [data-booking-status=CONFIRMED]') && Array.from(document.querySelectorAll('.booking-panel [role=alert]')).some(e=>e.textContent.includes('Потерян ответ'))",
    "lost response reconciled",
  );
  await availableAgain();
  await act("window.fetch=window.bookingNativeFetch");
  console.log(
    "PASS: committed booking recovered from history after lost confirmation response; cancellation still works",
  );

  await command("browsingContext.setViewport", {
    context,
    viewport: { width: 390, height: 844 },
    devicePixelRatio: 1,
  });
  await act(
    "document.querySelector('.package-configurator .booking-panel').scrollIntoView()",
  );
  const shot = await command("browsingContext.captureScreenshot", { context });
  const { mkdir } = await import("node:fs/promises");
  await mkdir(new URL("../.tools/booking-ui/", import.meta.url), {
    recursive: true,
  });
  await writeFile(
    new URL("../.tools/booking-ui/mobile.png", import.meta.url),
    Buffer.from(shot.data, "base64"),
  );
  console.log(
    "MOBILE_LAYOUT",
    await evaluate(
      "JSON.stringify({viewport:innerWidth,page:document.documentElement.scrollWidth,panel:document.querySelector('.package-configurator .booking-panel').getBoundingClientRect().width,overflow:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().width>innerWidth).map(e=>({tag:e.tagName,class:e.className,width:e.getBoundingClientRect().width})).slice(0,12)})",
    ),
  );
  await check(
    "document.documentElement.scrollWidth<=390 && document.querySelector('.package-configurator .booking-panel').getBoundingClientRect().width<=390",
    "mobile overflow",
  );
  await close();
  await act(
    "Array.from(document.querySelectorAll('.booking-panel button')).find(b=>b.textContent.includes('Обновить историю')).click()",
  );
  await wait(
    "document.querySelectorAll('main .booking-panel [data-booking-status=CANCELLED]').length===3",
    "global booking history",
  );
  console.log(
    "PASS: responsive 390px layout and account-wide cancelled booking history",
  );
} finally {
  if (fixtures && context) {
    try {
      await evaluate(
        `(async()=>{const send=window.bookingNativeFetch||window.fetch.bind(window);const response=await send('/api/bookings');if(response.ok)for(const booking of await response.json())if([${fixtures.first},${fixtures.second}].includes(booking.eventId)&&booking.status==='CONFIRMED')await send('/api/bookings/'+booking.id+'/cancel',{method:'POST'});return true;})()`,
      );
    } catch {}
  }
  try {
    await command("session.end");
  } finally {
    ws.close();
  }
}
