import test from 'node:test';
import assert from 'node:assert/strict';
import { cardId, formatCard, parseCards } from './cards.ts';

test('parses Q/A blocks separated by blank lines', () => {
  const md = `# T\n\n## Cards\n\nQ: TCP vs UDP?\nA: TCP reliable,\nUDP not.\n\nQ: What is DNS?\nA: Name lookup.\n`;
  const cards = parseCards(md, 'network/t.md', 'network');
  assert.equal(cards.length, 2);
  assert.equal(cards[0].q, 'TCP vs UDP?');
  assert.equal(cards[0].a, 'TCP reliable,\nUDP not.');
  assert.equal(cards[1].area, 'network');
});

test('code fences keep blank lines inside the answer', () => {
  const md = 'Q: Show code\nA: Example:\n```js\nconst a = 1;\n\nconst b = 2;\n```\n\nQ: Next\nA: x\n';
  const cards = parseCards(md, 'f.md', 'a');
  assert.equal(cards.length, 2);
  assert.match(cards[0].a, /const b = 2;/);
});

test('heading or next Q ends an answer', () => {
  const md = 'Q: One\nA: first\n## Heading\nQ: Two\nA: second\nQ: Three\nA: third\n';
  const cards = parseCards(md, 'f.md', 'a');
  assert.deepEqual(cards.map((c) => c.a), ['first', 'second', 'third']);
});

test('id is stable under whitespace and case changes, and duplicates are dropped', () => {
  assert.equal(cardId('  Why   TCP? '), cardId('why tcp?'));
  const cards = parseCards('Q: Dup\nA: a\n\nQ: dup\nA: b\n', 'f.md', 'a');
  assert.equal(cards.length, 1);
});

test('an HTML comment line ends an answer', () => {
  const cards = parseCards('Q: One\nA: first\n<!-- note -->\n', 'f.md', 'a');
  assert.equal(cards[0].a, 'first');
});

test('formatCard round-trips through parseCards', () => {
  const text = formatCard({ q: 'Why?', a: 'Because.\n\n\nReally.' });
  const [c] = parseCards(text, 'f.md', 'a');
  assert.equal(c.q, 'Why?');
  assert.equal(c.a, 'Because.\nReally.');
});
