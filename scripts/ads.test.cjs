const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/ui/ads.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function fixture({ width = 320, resultSlot = '', failOnce = false } = {}) {
  const properties = new Map();
  const requests = [];
  const observers = [];
  const strip = { hidden: false, height: 70, anchorPadding: 0, getBoundingClientRect() {
    return { height: this.height, top: 800 - this.height - this.anchorPadding };
  } };
  const makeSlot = (key, inDialog) => ({
    dataset: { adSlotKey: key },
    attributes: new Map([['data-ad-format', 'horizontal'], ['data-full-width-responsive', 'true']]),
    width: inDialog ? 0 : width,
    box: inDialog ? { hidden: false } : strip,
    getBoundingClientRect() { return { width: this.width }; },
    closest(selector) { return selector === 'dialog' ? (inDialog ? {} : null) : this.box; },
    setAttribute(name, value) { this.attributes.set(name, value); },
    removeAttribute(name) { this.attributes.delete(name); },
  });
  const bottom = makeSlot('bottom', false);
  const result = makeSlot('result', true);
  const guide = makeSlot('guide', true);
  const elements = [bottom, result, guide];
  const exports = {};
  let shouldFail = failOnce;
  const window = { innerHeight: 800, adsbygoogle: { push(value) {
    if (shouldFail) { shouldFail = false; throw new Error('temporary failure'); }
    requests.push(value);
  } } };
  const context = {
    exports,
    require() { return {
      ADSENSE: { slots: { bottom: '9047808825', result: resultSlot, guide: '' }, previewParam: 'adpreview' },
      adsenseClient: () => 'ca-pub-3238568174687829',
    }; },
    window,
    document: {
      body: {},
      documentElement: { classList: { toggle() {} }, style: { setProperty(name, value) { properties.set(name, value); } } },
      querySelector(selector) { return selector === '#adBottom' ? strip : {}; },
      querySelectorAll() { return elements; },
    },
    location: { search: '' }, URLSearchParams,
    console: { warn() {} },
    ResizeObserver: class {
      constructor(callback) { this.callback = callback; observers.push(this); }
      observe(element) { this.element = element; }
      disconnect() { this.disconnected = true; }
    },
  };
  vm.runInNewContext(compiled, context);
  const manager = new exports.AdManager();
  return { manager, strip, bottom, result, guide, requests, properties, observers };
}

test('only configured and visible slots request ads, and repeated initialization does not duplicate requests', () => {
  const f = fixture();
  f.manager.init();
  assert.equal(f.requests.length, 1);
  assert.equal(f.bottom.attributes.get('data-ad-slot'), '9047808825');
  assert.equal(f.bottom.attributes.has('data-ad-format'), false);
  assert.equal(f.bottom.attributes.has('data-full-width-responsive'), false);
  assert.equal(f.result.box.hidden, true);
  assert.equal(f.guide.box.hidden, true);
  f.manager.init();
  assert.equal(f.requests.length, 1);
  assert.equal(f.observers[0].disconnected, true);
});

test('reserved game space follows an expanded ad and later shrink without requesting another ad', () => {
  const f = fixture();
  f.manager.init();
  assert.equal(f.properties.get('--ad-h'), '70px');
  f.strip.height = 268.7;
  f.observers[0].callback();
  assert.equal(f.properties.get('--ad-h'), '269px');
  f.strip.height = 70;
  f.observers[0].callback();
  assert.equal(f.properties.get('--ad-h'), '70px');
  assert.equal(f.requests.length, 1);
});

test('zero-width ad is deferred until its container has laid out', () => {
  const f = fixture({ width: 0 });
  f.manager.init();
  assert.equal(f.requests.length, 0);
  assert.equal(f.bottom.dataset.mounted, undefined);
  f.bottom.width = 320;
  f.observers[0].callback();
  assert.equal(f.requests.length, 1);
});

test('automatic anchor padding is reserved along with the manual banner and released after collapse', () => {
  const f = fixture();
  f.manager.init();
  f.strip.anchorPadding = 127;
  f.observers[0].callback();
  assert.equal(f.properties.get('--ad-h'), '197px');
  f.strip.anchorPadding = 0;
  f.observers[0].callback();
  assert.equal(f.properties.get('--ad-h'), '70px');
  assert.equal(f.requests.length, 1);
});

test('dialog ad requests once only after opening with a measurable width', () => {
  const f = fixture({ resultSlot: '1234567890' });
  const dialog = { querySelectorAll: () => [f.result] };
  f.manager.init();
  f.manager.mountIn(dialog);
  assert.equal(f.requests.length, 1);
  f.result.width = 300;
  f.manager.mountIn(dialog);
  f.manager.mountIn(dialog);
  assert.equal(f.requests.length, 2);
});

test('failed synchronous request can be retried when the slot becomes visible', () => {
  const f = fixture({ failOnce: true });
  f.manager.init();
  f.observers[0].callback();
  assert.equal(f.requests.length, 1);
  f.observers[0].callback();
  assert.equal(f.requests.length, 1);
});
