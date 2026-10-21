'use strict';
const assert = require('node:assert');
const D = require('../src/detectors.js');

let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log('ok ' + passed + ' - ' + name);
}
function types(text, opts) {
  return D.detect(text, opts).map((f) => f.type);
}
function hasType(text, type, opts) {
  return types(text, opts).includes(type);
}

test('email detected', () => {
  assert.ok(hasType('Reach me at jane.doe@example.com anytime', 'EMAIL'));
});

test('US phone formats detected', () => {
  assert.ok(hasType('Call (212) 555-0147 today', 'PHONE'));
  assert.ok(hasType('Call 212-555-0147 today', 'PHONE'));
  assert.ok(hasType('Call +1 212.555.0147 today', 'PHONE'));
});

test('SSN valid detected', () => {
  assert.ok(hasType('SSN is 123-45-6789 on file', 'SSN'));
});

test('SSN invalid ranges rejected', () => {
  assert.ok(!hasType('Number 000-45-6789 here', 'SSN'));
  assert.ok(!hasType('Number 666-45-6789 here', 'SSN'));
  assert.ok(!hasType('Number 900-45-6789 here', 'SSN'));
  assert.ok(!hasType('Number 123-00-6789 here', 'SSN'));
  assert.ok(!hasType('Number 123-45-0000 here', 'SSN'));
});

test('credit card Luhn valid detected', () => {
  assert.ok(hasType('Card 4242424242424242 on file', 'CARD'));
  assert.ok(hasType('Card 4242 4242 4242 4242 on file', 'CARD'));
  assert.ok(hasType('Card 4242-4242-4242-4242 on file', 'CARD'));
});

test('credit card Luhn invalid rejected', () => {
  assert.ok(!hasType('Card 4242424242424241 on file', 'CARD'));
  assert.strictEqual(D.validators.luhnValid('4242424242424242'), true);
  assert.strictEqual(D.validators.luhnValid('4242424242424241'), false);
});

test('IBAN valid detected', () => {
  assert.ok(hasType('Pay GB29 NWBK 6016 1331 9268 19 please', 'IBAN'));
  assert.strictEqual(D.validators.ibanValid('GB29NWBK60161331926819'), true);
});

test('IBAN invalid rejected', () => {
  assert.ok(!hasType('Pay GB29 NWBK 6016 1331 9268 20 please', 'IBAN'));
  assert.strictEqual(D.validators.ibanValid('GB29NWBK60161331926820'), false);
});

test('IPv4 detected and invalid octet rejected', () => {
  assert.ok(hasType('Server at 8.8.8.8 is up', 'IP'));
  assert.ok(!hasType('Server at 999.8.8.8 is up', 'IP'));
});

test('street address detected', () => {
  assert.ok(hasType('Ship to 123 Main Street, Springfield', 'ADDRESS'));
  assert.ok(hasType('Office at 456 Oak Avenue, Suite 9', 'ADDRESS'));
});

// Token fixtures are assembled from fragments on purpose, so no literal in
// this file looks like a real credential to secret scanners. The detector
// still sees the fully assembled string at runtime.
test('OpenAI style API key detected', () => {
  const body = 'abcdefghijklmnopqrstuvwxyz0123456789';
  assert.ok(hasType('key ' + ['sk', 'proj', body + 'ABCD'].join('-') + ' here', 'API_KEY'));
  assert.ok(hasType('key ' + 'sk' + '-' + body + ' here', 'API_KEY'));
});

test('Anthropic style API key detected', () => {
  const body = 'abcdefghijklmnopqrstuvwxyz0123456789';
  assert.ok(hasType('key ' + ['sk', 'ant', 'api03'].join('-') + '-' + body + ' here', 'API_KEY'));
});

test('AWS access key detected', () => {
  assert.ok(hasType('aws ' + 'AKIA' + 'IOSFODNN7EXAMPLE' + ' in config', 'AWS_KEY'));
});

test('GitHub tokens detected', () => {
  const body = 'abcdefghijklmnopqrstuvwxyz0123456789';
  assert.ok(hasType('token ' + 'ghp' + '_' + body + ' here', 'GITHUB_TOKEN'));
  assert.ok(hasType('token ' + 'github' + '_pat_' + '11ABCDEFG0' + body + ' here', 'GITHUB_TOKEN'));
});

test('Slack token detected', () => {
  const tok = ['xoxb', '123456789012', '1234567890123', 'AbCdEfGhIjKlMnOpQrStUvWx'].join('-');
  assert.ok(hasType('slack ' + tok + ' here', 'SLACK_TOKEN'));
});

test('JWT detected', () => {
  const jwt = ['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', 'eyJzdWIiOiIxMjM0NTY3ODkwIn0', 'dozjgNryP4J3jVmNHl0w5N_XgL0n3AAA'].join('.');
  assert.ok(hasType('auth ' + jwt + ' end', 'JWT'));
});

test('dot env style secret detected and value masked', () => {
  const text = 'DB_PASSWORD=supersecretvalue123';
  assert.ok(hasType(text, 'SECRET'));
  const r = D.mask(text);
  assert.ok(!r.text.includes('supersecretvalue123'));
  assert.ok(r.text.includes('DB_PASSWORD='));
  assert.ok(r.text.includes('<SECRET_1>'));
});

test('internal and private URLs detected', () => {
  assert.ok(hasType('open http://localhost:8080/admin now', 'INTERNAL_URL'));
  assert.ok(hasType('open https://admin.corp.local/dashboard now', 'INTERNAL_URL'));
  assert.ok(hasType('open http://192.168.1.10/admin now', 'INTERNAL_URL'));
  assert.ok(hasType('open http://10.0.0.5:9000/x now', 'INTERNAL_URL'));
});

test('USDOT detected (logistics pack)', () => {
  assert.ok(hasType('Carrier USDOT 1234567 checked', 'USDOT'));
  assert.ok(hasType('Carrier DOT #7654321 checked', 'USDOT'));
});

test('MC number detected (logistics pack)', () => {
  assert.ok(hasType('Broker MC# 765432 on file', 'MC'));
  assert.ok(hasType('Broker MC 123456 on file', 'MC'));
});

test('VIN valid check digit detected (logistics pack)', () => {
  assert.strictEqual(D.validators.vinValid('1HGCM82633A004352'), true);
  assert.ok(hasType('VIN 1HGCM82633A004352 inspected', 'VIN'));
});

test('VIN bad check digit rejected', () => {
  assert.strictEqual(D.validators.vinValid('1HGCM826X3A004352'), false);
  assert.ok(!hasType('VIN 1HGCM826X3A004352 inspected', 'VIN'));
});

test('BOL and PRO numbers detected (logistics pack)', () => {
  assert.ok(hasType('BOL # ABC123456 for this load', 'BOL'));
  assert.ok(hasType('PRO # 123456789 tracking', 'BOL'));
});

test('container number detected (logistics pack)', () => {
  assert.ok(hasType('Container MSKU1234567 loaded', 'CONTAINER'));
});

test('packs can be selected', () => {
  assert.deepStrictEqual(types('Carrier USDOT 1234567 checked', { packs: ['core'] }), []);
  assert.ok(hasType('Carrier USDOT 1234567 checked', 'USDOT', { packs: ['logistics'] }));
  assert.ok(hasType('mail jane@example.com here', 'EMAIL', { packs: ['core'] }));
});

test('no false positive on ordinary sentence', () => {
  const s = 'The quick brown fox jumps over the lazy dog near the river bank while the team plans the weekly review meeting.';
  assert.deepStrictEqual(D.detect(s), []);
});

test('findings carry start and end offsets matching the value', () => {
  const text = 'mail jane.doe@example.com end';
  const f = D.detect(text).find((x) => x.type === 'EMAIL');
  assert.strictEqual(text.slice(f.start, f.end), f.value);
  assert.strictEqual(f.value, 'jane.doe@example.com');
});

test('consistent placeholder numbering: same email twice, same placeholder', () => {
  const r = D.mask('a jane@example.com b jane@example.com c john@example.com');
  assert.strictEqual(r.text, 'a <EMAIL_1> b <EMAIL_1> c <EMAIL_2>');
  assert.strictEqual(Object.keys(r.map).length, 2);
});

test('mask reuses an existing map and continues numbering', () => {
  const first = D.mask('mail jane@example.com here');
  const second = D.mask('mail john@example.com and jane@example.com here', first.map);
  assert.strictEqual(second.text, 'mail <EMAIL_2> and <EMAIL_1> here');
});

test('mask then restore round trip equals original', () => {
  const key = ['sk', 'proj', 'abcdefghijklmnopqrstuvwxyz0123456789ABCD'].join('-');
  const original = 'Email jane.doe@example.com, call 212-555-0147, card 4242424242424242, key ' + key + ', carrier USDOT 1234567, VIN 1HGCM82633A004352.';
  const r = D.mask(original);
  assert.ok(!r.text.includes('jane.doe@example.com'));
  assert.ok(!r.text.includes('4242424242424242'));
  assert.strictEqual(D.restore(r.text, r.map), original);
});

test('restore with empty or missing map is safe', () => {
  assert.strictEqual(D.restore('hello <EMAIL_1>', {}), 'hello <EMAIL_1>');
  assert.strictEqual(D.restore('', null), '');
});

console.log('\nAll ' + passed + ' tests passed.');
