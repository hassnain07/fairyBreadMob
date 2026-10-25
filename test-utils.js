// Simple test runner for utility functions
// This tests the formatMoney and termUtils logic directly in Node

const fmt = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' });

function formatMoney(cents) {
  return fmt.format(cents / 100);
}

function computeGatingState(terms, now = new Date()) {
  if (terms.length === 0) return 'NO_TERM_EVER';
  const hasActiveTerm = terms.some(t => new Date(t.end_date) > now);
  return hasActiveTerm ? 'ACTIVE_TERM' : 'TERM_EXPIRED';
}

// Test runner
function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✗ ${name}: ${e.message}`);
    process.exit(1);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected '${expected}' but got '${actual}'`);
  }
}

// Tests
console.log('\n📊 Testing formatMoney()\n');

test('formatMoney(58300) === "$583.00"', () => {
  const result = formatMoney(58300);
  assertEqual(result, '$583.00', 'formatMoney(58300)');
});

test('formatMoney(0) === "$0.00"', () => {
  const result = formatMoney(0);
  assertEqual(result, '$0.00', 'formatMoney(0)');
});

test('formatMoney(100) === "$1.00"', () => {
  const result = formatMoney(100);
  assertEqual(result, '$1.00', 'formatMoney(100)');
});

test('formatMoney(1000) === "$10.00"', () => {
  const result = formatMoney(1000);
  assertEqual(result, '$10.00', 'formatMoney(1000)');
});

test('formatMoney(99999) === "$999.99"', () => {
  const result = formatMoney(99999);
  assertEqual(result, '$999.99', 'formatMoney(99999)');
});

console.log('\n✓ All formatMoney tests passed\n');

console.log('📊 Testing computeGatingState()\n');

function makeTerm(startDate, endDate) {
  return {
    id: 'term-' + Math.random().toString(36).slice(2, 9),
    family_id: 'fam-1',
    status: 'active',
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
  };
}

test('NO_TERM_EVER: empty terms list', () => {
  const now = new Date();
  const state = computeGatingState([], now);
  assertEqual(state, 'NO_TERM_EVER', 'NO_TERM_EVER with empty list');
});

test('ACTIVE_TERM: term ending in future', () => {
  const now = new Date();
  const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const terms = [makeTerm(now, future)];
  const state = computeGatingState(terms, now);
  assertEqual(state, 'ACTIVE_TERM', 'ACTIVE_TERM when end is in future');
});

test('TERM_EXPIRED: all terms ended', () => {
  const now = new Date();
  const past = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  const pastStart = new Date(past.getTime() - 10 * 24 * 60 * 60 * 1000);
  const terms = [makeTerm(pastStart, past)];
  const state = computeGatingState(terms, now);
  assertEqual(state, 'TERM_EXPIRED', 'TERM_EXPIRED when all terms have ended');
});

test('ACTIVE_TERM: multiple terms, one active', () => {
  const now = new Date();
  const pastEnd = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  const pastStart = new Date(pastEnd.getTime() - 10 * 24 * 60 * 60 * 1000);
  const futureEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  const terms = [
    makeTerm(pastStart, pastEnd),
    makeTerm(now, futureEnd),
  ];
  const state = computeGatingState(terms, now);
  assertEqual(state, 'ACTIVE_TERM', 'ACTIVE_TERM if any term is active');
});

console.log('\n✓ All computeGatingState tests passed\n');

console.log('🎉 All tests passed!\n');
