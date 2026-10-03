import { describe, it, expect } from 'vitest';
import { extractAcronyms } from '../logic/extraction/acronyms';

describe('Acronym Extractor', () => {
  it('should extract parenthetical expansion patterns', () => {
    const text = 'Enterprises rely on Infrastructure as a Service (IaaS) for elastic scale. We also practice Test-Driven Development (TDD).';
    const acronyms = extractAcronyms(text);

    const iaas = acronyms.find((a) => a.acronym === 'IAAS');
    expect(iaas).toBeDefined();
    expect(iaas?.expansion).toContain('Infrastructure as a Service');

    const tdd = acronyms.find((a) => a.acronym === 'TDD');
    expect(tdd).toBeDefined();
    expect(tdd?.expansion).toContain('Test-Driven Development');
  });

  it('should match standalone uppercase acronyms with the course reference bank', () => {
    const text = 'The CIA security triad guides access control policies. Developers use JWT for mobile auth.';
    const acronyms = extractAcronyms(text);

    const cia = acronyms.find((a) => a.acronym === 'CIA');
    expect(cia).toBeDefined();
    expect(cia?.expansion).toBe('Confidentiality, Integrity, and Availability');

    const jwt = acronyms.find((a) => a.acronym === 'JWT');
    expect(jwt).toBeDefined();
    expect(jwt?.expansion).toBe('JSON Web Token');
  });

  it('should ignore common English uppercase stop words', () => {
    const text = 'THE SYSTEM AND THE DATA ARE SECURE FOR ALL USERS.';
    const acronyms = extractAcronyms(text);
    const stopped = acronyms.filter((a) => ['THE', 'AND', 'FOR', 'ARE', 'ALL'].includes(a.acronym));
    expect(stopped).toHaveLength(0);
  });
});
