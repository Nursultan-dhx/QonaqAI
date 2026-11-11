// Optional server-side Node transport for systems where the JVM TLS client cannot reach Google.
// The endpoint is fixed. Key and request arrive only through stdin, never argv or a file.
let input = '';
for await (const chunk of process.stdin) {
  input += chunk;
  if (input.length > 300000) process.exit(2);
}
const { key, model, payload } = JSON.parse(input);
if (!/^[a-zA-Z0-9._-]+$/.test(model)) process.exit(2);
let result = { status: 0, body: '' };
for (let attempt=0; attempt<2; attempt++) {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    });
    result = { status: response.status, body: await response.text() };
    if (![502,503,504].includes(response.status)) break;
  } catch { result = { status: 0, body: '' }; }
}
process.stdout.write(JSON.stringify(result));
