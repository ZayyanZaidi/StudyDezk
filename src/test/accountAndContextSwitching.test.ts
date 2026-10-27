import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../store/useAuthStore';
import { useStudyStore } from '../store/useStudyStore';
import { db } from '../db';
import { Workspace } from '../types/workspace';
import { StudyDocument } from '../types/document';
import { Flashcard } from '../types/flashcard';
import { GlossaryTerm } from '../types/glossary';

describe('Account Management & Course Context Switching', () => {
  beforeEach(async () => {
    localStorage.clear();
    await db.workspaces.clear();
    await db.documents.clear();
    await db.flashcards.clear();
    await db.glossary.clear();
    await db.sessionHistories.clear();
    await useAuthStore.getState().initializeAuth();
  });

  it('manages custom account settings and persists them to localStorage', () => {
    const { settings, updateSettings } = useAuthStore.getState();
    expect(settings.defaultSummaryStyle).toBe('structured');
    expect(settings.fontPreference).toBe('sans');

    // Update settings
    updateSettings({
      defaultSummaryStyle: 'bullets',
      fontPreference: 'serif',
      highReadabilityContrast: true,
      dailyChunkTarget: 45,
    });

    const updated = useAuthStore.getState().settings;
    expect(updated.defaultSummaryStyle).toBe('bullets');
    expect(updated.fontPreference).toBe('serif');
    expect(updated.highReadabilityContrast).toBe(true);
    expect(updated.dailyChunkTarget).toBe(45);

    // Verify localStorage has persisted settings
    const stored = localStorage.getItem('studydezk_user_settings');
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.defaultSummaryStyle).toBe('bullets');
    expect(parsed.fontPreference).toBe('serif');
  });

  it('updates profile and tracks daily usage limits', async () => {
    const { profile, updateProfile, recordChunkUsage } = useAuthStore.getState();
    expect(profile).toBeDefined();

    await updateProfile({
      full_name: 'Dr. Jane Scholar',
      university: 'MIT',
      program: 'Artificial Intelligence',
    });

    const updatedProfile = useAuthStore.getState().profile;
    expect(updatedProfile?.full_name).toBe('Dr. Jane Scholar');
    expect(updatedProfile?.university).toBe('MIT');

    // Record chunk processing usage
    recordChunkUsage(5);
    const usage = useAuthStore.getState().todayUsage;
    expect(usage.chunksProcessed).toBe(5);
  });

  it('strictly isolates context when switching between course workspaces', async () => {
    // 1. Create two separate courses
    const ws1: Workspace = {
      id: 'ws-security',
      name: 'Information Security',
      course: 'Cybersecurity',
      color: 'rose',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const ws2: Workspace = {
      id: 'ws-cloud',
      name: 'Distributed Cloud Systems',
      course: 'Cloud Computing',
      color: 'blue',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.workspaces.bulkPut([ws1, ws2]);

    // 2. Add documents to both
    const docSecurity: StudyDocument = {
      id: 'doc-sec-1',
      workspaceId: 'ws-security',
      title: 'Threat Modeling & CIA Triad',
      fileName: 'security.pdf',
      fileSize: 12000,
      fileType: 'pdf',
      totalPages: 8,
      pages: [],
      fullText: 'Threat modeling evaluates assets and vulnerabilities in security.',
      processedText: 'Threat modeling evaluates assets and vulnerabilities in security.',
      slideMergeApplied: false,
      course: 'Cybersecurity',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const docCloud: StudyDocument = {
      id: 'doc-cloud-1',
      workspaceId: 'ws-cloud',
      title: 'IaaS and Cloud Elasticity',
      fileName: 'cloud.pdf',
      fileSize: 14000,
      fileType: 'pdf',
      totalPages: 10,
      pages: [],
      fullText: 'IaaS delivers fundamental compute, storage, and networking.',
      processedText: 'IaaS delivers fundamental compute, storage, and networking.',
      slideMergeApplied: false,
      course: 'Cloud Computing',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.documents.bulkPut([docSecurity, docCloud]);

    // Add flashcard and glossary term to security only
    const cardSec: Flashcard = {
      id: 'card-sec-1',
      workspaceId: 'ws-security',
      documentId: 'doc-sec-1',
      course: 'Cybersecurity',
      front: 'What is CIA Triad?',
      back: 'Confidentiality, Integrity, and Availability',
      sourceSentence: 'The CIA triad consists of confidentiality, integrity, and availability.',
      sourcePattern: 'definition_is',
      tags: ['security'],
      reviewState: {
        interval: 1,
        repetitions: 0,
        easeFactor: 2.5,
        knownCount: 0,
        hardCount: 0,
      },
      createdAt: Date.now(),
    };
    await db.flashcards.put(cardSec);

    const termSec: GlossaryTerm = {
      id: 'term-sec-1',
      workspaceId: 'ws-security',
      documentId: 'doc-sec-1',
      documentTitle: 'Threat Modeling & CIA Triad',
      course: 'Cybersecurity',
      term: 'CIA',
      isAcronym: true,
      expansion: 'Confidentiality, Integrity, Availability',
      definition: 'The cornerstone security model.',
      occurrences: 2,
      contextSentence: 'Threat modeling evaluates assets and vulnerabilities in security.',
    };
    await db.glossary.put(termSec);

    // Refresh store data
    const store = useStudyStore.getState();
    await store.refreshAllData();
    useStudyStore.setState({ workspaces: [ws1, ws2], documents: [docSecurity, docCloud] });

    // 3. Switch to ws-security
    store.setActiveWorkspace('ws-security');
    const stateSec = useStudyStore.getState();
    expect(stateSec.activeWorkspaceId).toBe('ws-security');
    expect(stateSec.activeDocumentId).toBe('doc-sec-1');
    expect(stateSec.selectedCourse).toBe('Cybersecurity');
    expect(stateSec.activeTab).toBe('summary');

    // 4. Switch to ws-cloud: all security context must be isolated and active document switched to cloud doc
    store.setActiveWorkspace('ws-cloud');
    const stateCloud = useStudyStore.getState();
    expect(stateCloud.activeWorkspaceId).toBe('ws-cloud');
    expect(stateCloud.activeDocumentId).toBe('doc-cloud-1');
    expect(stateCloud.selectedCourse).toBe('Cloud Computing');
    expect(stateCloud.activeTab).toBe('summary');

    // 5. Test empty course isolation
    const wsEmpty: Workspace = {
      id: 'ws-empty',
      name: 'Advanced Algorithms',
      course: 'Algorithms',
      color: 'emerald',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.workspaces.put(wsEmpty);
    await store.refreshAllData();

    store.setActiveWorkspace('ws-empty');
    const stateEmpty = useStudyStore.getState();
    expect(stateEmpty.activeWorkspaceId).toBe('ws-empty');
    // Active document must be null in empty workspace, clearing out previous documents
    expect(stateEmpty.activeDocumentId).toBeNull();
    expect(stateEmpty.selectedCourse).toBe('Algorithms');
  });
});
