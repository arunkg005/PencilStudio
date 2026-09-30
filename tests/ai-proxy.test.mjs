import test from 'node:test';
import assert from 'node:assert/strict';

import { callAI } from '../src/services/aiClient.js';
import { coerceNotesResult } from '../src/services/aiSchemas.js';

test('callAI reports clear error when no AI proxy is configured', async () => {
  const result = await callAI({ feature: 'notes', input: { topic: 'Database normalization' } });
  assert.equal(result.success, false);
  assert.equal(result.code, 'AI_PROXY_UNAVAILABLE');
});

test('notes schema coercion preserves expected structure', () => {
  const result = coerceNotesResult({
    topic: 'Database normalization',
    title: 'Database normalization notes',
    overview: 'Normalization reduces redundancy.',
    keyConcepts: ['1NF', '2NF'],
    definitions: ['A database rule.'],
    examples: ['A course table.'],
    importantPoints: ['Remove duplicates.'],
    examQuestions: ['Explain 3NF.'],
    summary: 'Normalization improves integrity.',
  });

  assert.equal(result.topic, 'Database normalization');
  assert.ok(Array.isArray(result.keyConcepts));
  assert.equal(result.summary.includes('integrity'), true);
});
