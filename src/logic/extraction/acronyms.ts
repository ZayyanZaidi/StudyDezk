import { AcronymItem } from '../../types/glossary';

// Well-known acronym reference bank for the target university courses
export const KNOWN_COURSE_ACRONYMS: Record<string, { expansion: string; course: string; definition: string }> = {
  CIA: {
    expansion: 'Confidentiality, Integrity, and Availability',
    course: 'Information Security',
    definition: 'The fundamental triad of information security guiding security policies and controls.',
  },
  IAAS: {
    expansion: 'Infrastructure as a Service',
    course: 'Cloud Computing',
    definition: 'Cloud computing model providing virtualized computing resources over the internet.',
  },
  PAAS: {
    expansion: 'Platform as a Service',
    course: 'Cloud Computing',
    definition: 'Cloud model delivering hardware and software tools over the internet for app development.',
  },
  SAAS: {
    expansion: 'Software as a Service',
    course: 'Cloud Computing',
    definition: 'Cloud-based software delivery model hosted centrally by a provider.',
  },
  TDD: {
    expansion: 'Test-Driven Development',
    course: 'Software Testing Strategies',
    definition: 'Software development process where test cases are written before the code.',
  },
  BDD: {
    expansion: 'Behavior-Driven Development',
    course: 'Software Testing Strategies',
    definition: 'Agile software development process focusing on behavioral specifications.',
  },
  RBAC: {
    expansion: 'Role-Based Access Control',
    course: 'Information Security',
    definition: 'An approach to restricting system access to authorized users based on roles.',
  },
  OWASP: {
    expansion: 'Open Web Application Security Project',
    course: 'Information Security',
    definition: 'Online community producing freely-available articles, methodologies, and security documentation.',
  },
  JWT: {
    expansion: 'JSON Web Token',
    course: 'Mobile App Development',
    definition: 'Compact URL-safe means of representing claims to be transferred between two parties.',
  },
  API: {
    expansion: 'Application Programming Interface',
    course: 'Mobile App Development',
    definition: 'A set of subroutine definitions, protocols, and tools for building software.',
  },
  AES: {
    expansion: 'Advanced Encryption Standard',
    course: 'Information Security',
    definition: 'Symmetric block cipher chosen by the US government to protect classified information.',
  },
  RSA: {
    expansion: 'Rivest–Shamir–Adleman',
    course: 'Information Security',
    definition: 'Public-key cryptosystem widely used for secure data transmission.',
  },
  PKI: {
    expansion: 'Public Key Infrastructure',
    course: 'Information Security',
    definition: 'Set of roles, policies, hardware, and software to create, manage, and distribute digital certificates.',
  },
  XSS: {
    expansion: 'Cross-Site Scripting',
    course: 'Information Security',
    definition: 'Vulnerability that allows attackers to inject malicious client-side scripts into web pages.',
  },
  CSRF: {
    expansion: 'Cross-Site Request Forgery',
    course: 'Information Security',
    definition: 'Attack forcing an authenticated end user to execute unwanted actions on a web app.',
  },
  CI: {
    expansion: 'Continuous Integration',
    course: 'Software Testing Strategies',
    definition: 'Practice of merging all developer working copies to a shared mainline frequently.',
  },
  CD: {
    expansion: 'Continuous Delivery / Continuous Deployment',
    course: 'Software Testing Strategies',
    definition: 'Software engineering approach in which teams produce software in short cycles.',
  },
  MVVM: {
    expansion: 'Model-View-ViewModel',
    course: 'Mobile App Development',
    definition: 'Architectural pattern that facilitates the separation of UI development from business logic.',
  },
  APK: {
    expansion: 'Android Package Kit',
    course: 'Mobile App Development',
    definition: 'Package file format used by the Android OS for distribution and installation of apps.',
  },
  SLA: {
    expansion: 'Service Level Agreement',
    course: 'Cloud Computing',
    definition: 'Commitment between a service provider and a client regarding quality, availability, and responsibilities.',
  },
};

/**
 * Extracts acronyms from text and finds in-text expansions or matches known expansions.
 */
export function extractAcronyms(text: string): AcronymItem[] {
  if (!text) return [];

  const acronymMap = new Map<string, AcronymItem>();

  // Pattern 1: Expansion followed by Acronym in parentheses e.g. "Infrastructure as a Service (IaaS)"
  const parenRegex = /\(([A-Za-z]{2,8})\)/g;
  let parenMatch: RegExpExecArray | null;

  while ((parenMatch = parenRegex.exec(text)) !== null) {
    const rawAcronym = parenMatch[1].trim();
    if (!/^[A-Za-z]{2,8}$/.test(rawAcronym) || /^(e\.?g\.?|i\.?e\.?|etc\.?)$/i.test(rawAcronym)) continue;
    const acronym = rawAcronym.toUpperCase();

    const precedingText = text.substring(Math.max(0, parenMatch.index - 80), parenMatch.index).trim();
    const words = precedingText.split(/[\s-]+/).filter(Boolean);

    for (let startIdx = Math.max(0, words.length - acronym.length - 4); startIdx < words.length; startIdx++) {
      const candidateWords = words.slice(startIdx);
      if (candidateWords.length === 0) continue;
      const candidateStr = candidateWords.join(' ');
      const initialsAll = candidateWords.map((w) => w[0].toUpperCase()).join('');
      const initialsNoStop = candidateWords
        .filter((w) => !/^(and|of|the|in|for|to)$/i.test(w))
        .map((w) => w[0].toUpperCase())
        .join('');

      if (
        initialsAll === acronym ||
        initialsNoStop === acronym ||
        (candidateWords[0][0].toUpperCase() === acronym[0] &&
          candidateWords[candidateWords.length - 1][0].toUpperCase() === acronym[acronym.length - 1] &&
          candidateWords.length >= 2)
      ) {
        // Find slice in precedingText to preserve original hyphens
        const firstWord = candidateWords[0];
        const matchIdx = precedingText.lastIndexOf(firstWord);
        const exactExpansion = matchIdx !== -1 ? precedingText.slice(matchIdx).trim() : candidateStr;

        acronymMap.set(acronym, {
          acronym,
          expansion: exactExpansion,
          context: text.substring(Math.max(0, parenMatch.index - 60), Math.min(text.length, parenMatch.index + 120)),
          score: 1.0,
        });
        break;
      }
    }
  }

  // Pattern 2: Standalone uppercase acronyms (2-6 letters)
  const standaloneRegex = /\b[A-Z]{2,6}\b/g;
  const sentenceList = text.split(/(?<=[.?!])\s+/);

  for (const sentence of sentenceList) {
    let wordMatch: RegExpExecArray | null;
    while ((wordMatch = standaloneRegex.exec(sentence)) !== null) {
      const acronym = wordMatch[0];
      // Filter common words that happen to be uppercase
      if (['THE', 'AND', 'FOR', 'NOT', 'ARE', 'BUT', 'ALL', 'CAN', 'HAS', 'HAD'].includes(acronym)) {
        continue;
      }

      if (!acronymMap.has(acronym)) {
        const known = KNOWN_COURSE_ACRONYMS[acronym];
        acronymMap.set(acronym, {
          acronym,
          expansion: known ? known.expansion : undefined,
          context: sentence.trim(),
          score: known ? 0.9 : 0.6,
        });
      }
    }
  }

  return Array.from(acronymMap.values()).sort((a, b) => b.score - a.score);
}
