import { describe, it, expect } from 'vitest';
import {
  computeTermFrequency,
  buildTfIdfModel,
  transformToTfIdfVector,
  extractTopTfIdfTerms,
} from '../logic/nlp/tfidf';

describe('TF-IDF Vectorizer and Keyword Extractor', () => {
  it('should compute normalized term frequencies', () => {
    const tokens = ['cloud', 'computing', 'cloud', 'security'];
    const tf = computeTermFrequency(tokens);

    expect(tf['cloud']).toBeCloseTo(0.5);
    expect(tf['computing']).toBeCloseTo(0.25);
    expect(tf['security']).toBeCloseTo(0.25);
  });

  it('should build an IDF model across documents with smooth weights', () => {
    const docs = [
      'Cloud computing architecture and virtualization.',
      'Information security principles and encryption.',
      'Cloud security and role based access control.',
    ];

    const model = buildTfIdfModel(docs);
    expect(model.corpusSize).toBe(3);
    expect(model.vocabulary.has('security')).toBe(true);
    expect(model.vocabulary.has('cloud')).toBe(true);

    // Terms appearing in more documents should have lower IDF than rare terms
    const cloudIdf = model.idf.get('cloud') || 0;
    const encryptionIdf = model.idf.get('encryption') || 0;
    expect(encryptionIdf).toBeGreaterThan(cloudIdf);
  });

  it('should extract top keywords from text', () => {
    const text = 'Symmetric encryption uses identical keys. Asymmetric encryption uses public and private key pairs for encryption.';
    const keywords = extractTopTfIdfTerms(text, undefined, 5);

    expect(keywords.length).toBeGreaterThan(0);
    expect(keywords[0].term).toBe('encryption');
  });

  it('should vectorize documents into float vectors matching vocabulary', () => {
    const docs = ['Mobile app lifecycle and architecture', 'Software testing unit test strategies'];
    const model = buildTfIdfModel(docs);
    const vec = transformToTfIdfVector('Mobile app unit test', model);

    expect(vec).toBeInstanceOf(Float32Array);
    expect(vec.length).toBe(model.vocabulary.size);
  });
});
