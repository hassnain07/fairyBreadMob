import { formatMoney } from './money';

// Simple test runner
function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    console.error(`✗ ${name}: ${e}`);
    process.exit(1);
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

// Tests
test('formatMoney(58300) === "$583.00"', () => {
  const result = formatMoney(58300);
  assert(result === '$583.00', `Expected '$583.00' but got '${result}'`);
});

test('formatMoney(0) === "$0.00"', () => {
  const result = formatMoney(0);
  assert(result === '$0.00', `Expected '$0.00' but got '${result}'`);
});

test('formatMoney(100) === "$1.00"', () => {
  const result = formatMoney(100);
  assert(result === '$1.00', `Expected '$1.00' but got '${result}'`);
});

test('formatMoney(1000) === "$10.00"', () => {
  const result = formatMoney(1000);
  assert(result === '$10.00', `Expected '$10.00' but got '${result}'`);
});

test('formatMoney(99999) === "$999.99"', () => {
  const result = formatMoney(99999);
  assert(result === '$999.99', `Expected '$999.99' but got '${result}'`);
});

console.log('All formatMoney tests passed ✓');
