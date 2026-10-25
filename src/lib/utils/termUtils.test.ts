import { computeGatingState } from './termUtils';
import type { Term } from '../../types/term';

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

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected '${expected}' but got '${actual}'`);
  }
}

// Helper to create a term
function makeTerm(startDate: Date, endDate: Date): Term {
  return {
    id: 'term-' + Math.random().toString(36).slice(2, 9),
    family_id: 'fam-1',
    status: 'active',
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
  };
}

// Tests
test('NO_TERM_EVER: empty terms list', () => {
  const now = new Date();
  const state = computeGatingState([], now);
  assertEqual(state, 'NO_TERM_EVER', 'Should return NO_TERM_EVER for empty terms');
});

test('ACTIVE_TERM: term ending in future', () => {
  const now = new Date();
  const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
  const terms = [makeTerm(now, future)];
  const state = computeGatingState(terms, now);
  assertEqual(state, 'ACTIVE_TERM', 'Should return ACTIVE_TERM when term end is in future');
});

test('TERM_EXPIRED: all terms ended', () => {
  const now = new Date();
  const past = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
  const pastStart = new Date(past.getTime() - 10 * 24 * 60 * 60 * 1000); // 20 days ago
  const terms = [makeTerm(pastStart, past)];
  const state = computeGatingState(terms, now);
  assertEqual(state, 'TERM_EXPIRED', 'Should return TERM_EXPIRED when all terms have ended');
});

test('ACTIVE_TERM: multiple terms, one active', () => {
  const now = new Date();
  const pastEnd = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  const pastStart = new Date(pastEnd.getTime() - 10 * 24 * 60 * 60 * 1000);
  const futureEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  const terms = [
    makeTerm(pastStart, pastEnd), // expired
    makeTerm(now, futureEnd),      // active
  ];
  const state = computeGatingState(terms, now);
  assertEqual(state, 'ACTIVE_TERM', 'Should return ACTIVE_TERM if any term is active');
});

console.log('All termUtils tests passed ✓');
