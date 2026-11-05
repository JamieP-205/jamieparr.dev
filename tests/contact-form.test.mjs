import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../src/main.js', import.meta.url), 'utf8').replace(/^import .*;\r?\n/gm, '');
function setup(fetch, valid = true) {
  const status = { textContent: '' };
  const button = { disabled: true };
  let submit;
  let resets = 0;
  const form = {
    dataset: { email: 'jamieparr205@gmail.com' },
    querySelector: selector => selector === 'button' ? button : status,
    reportValidity: () => valid,
    reset: () => { resets++; },
    addEventListener: (_, callback) => { submit = callback; },
  };
  vm.runInNewContext(source, {
    document: { getElementById: () => form }, fetch, AbortSignal,
    FormData: class { *[Symbol.iterator]() { yield ['name', 'Test']; yield ['email', 'visitor@example.com']; yield ['message', 'Hello']; } },
  });
  return { status, button, submit: () => submit({ preventDefault() {} }), get resets() { return resets; } };
}

test('success clears the form only after a confirmed response', async () => {
  const state = setup(async () => ({ ok: true, json: async () => ({ ok: true }) }));
  await state.submit();
  assert.equal(state.resets, 1);
  assert.match(state.status.textContent, /has been sent/);
  assert.equal(state.button.disabled, false);
});
test('failure retains the message and displays the server explanation', async () => {
  const state = setup(async () => ({ ok: false, json: async () => ({ error: 'Please wait a minute.' }) }));
  await state.submit();
  assert.equal(state.resets, 0);
  assert.equal(state.status.textContent, 'Please wait a minute.');
  assert.equal(state.button.disabled, false);
});
test('network failure does not claim success or clear the message', async () => {
  const state = setup(async () => { throw new TypeError('Failed to fetch'); });
  await state.submit();
  assert.equal(state.resets, 0);
  assert.match(state.status.textContent, /couldn't confirm delivery/);
});
test('invalid fields prevent a request', async () => {
  let calls = 0;
  const state = setup(async () => { calls++; }, false);
  await state.submit();
  assert.equal(calls, 0);
});
test('repeated submit while sending cannot send two messages', async () => {
  let finish;
  let calls = 0;
  const state = setup(() => { calls++; return new Promise(resolve => { finish = resolve; }); });
  const first = state.submit();
  assert.equal(state.button.disabled, true);
  await state.submit();
  assert.equal(calls, 1);
  finish({ ok: true, json: async () => ({ ok: true }) });
  await first;
  assert.equal(state.button.disabled, false);
});
