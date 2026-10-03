import { describe, it, expect } from 'vitest';
import { generateFlashcardsFromText } from '../logic/flashcards/generator';

describe('Flashcard Rule Generator', () => {
  it('should generate flashcards for "X is defined as Y" patterns', () => {
    const text = 'Cloud computing is defined as a model for enabling ubiquitous, on-demand network access to computing resources.';
    const cards = generateFlashcardsFromText(text, 'doc1', 'Cloud Computing');

    expect(cards.length).toBeGreaterThanOrEqual(1);
    const card = cards.find((c) => c.sourcePattern === 'definition_is');
    expect(card).toBeDefined();
    expect(card?.front).toContain('Cloud computing');
    expect(card?.back).toContain('a model for enabling ubiquitous');
  });

  it('should generate flashcards for "X refers to Y" patterns', () => {
    const text = 'Integrity refers to maintaining the absolute accuracy and completeness of data throughout its lifecycle.';
    const cards = generateFlashcardsFromText(text, 'doc2', 'Information Security');

    const card = cards.find((c) => c.sourcePattern === 'definition_refers');
    expect(card).toBeDefined();
    expect(card?.front).toContain('Integrity');
    expect(card?.back).toContain('maintaining the absolute accuracy');
  });

  it('should generate flashcards for course acronyms', () => {
    const text = 'The CIA triad is fundamental to security. Organizations implement IaaS solutions.';
    const cards = generateFlashcardsFromText(text, 'doc3', 'Information Security');

    const ciaCard = cards.find((c) => c.front.includes('CIA'));
    expect(ciaCard).toBeDefined();
    expect(ciaCard?.back).toContain('Confidentiality, Integrity, and Availability');
  });

  it('should initialize reviewState with spaced repetition defaults', () => {
    const text = 'TDD is defined as a test-driven development software practice.';
    const cards = generateFlashcardsFromText(text, 'doc4', 'Software Testing Strategies');

    expect(cards[0].reviewState).toBeDefined();
    expect(cards[0].reviewState.interval).toBe(1);
    expect(cards[0].reviewState.easeFactor).toBe(2.5);
    expect(cards[0].reviewState.knownCount).toBe(0);
  });
});
