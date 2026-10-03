import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db';
import { exportLibraryToJson, importLibraryFromJson } from '../db/backup';
import { checkStorageDurability, recordDataChange, recordBackupExported } from '../logic/durability/storageDurability';
import { Workspace } from '../types/workspace';
import { SummarySession } from '../types/session';

describe('Course Workspaces & Data Durability', () => {
  beforeEach(async () => {
    await db.workspaces.clear();
    await db.documents.clear();
    await db.sessionHistories.clear();
    localStorage.clear();
  });

  it('should store and query workspaces cleanly', async () => {
    const ws: Workspace = {
      id: 'ws-cloud-test',
      name: 'Cloud Computing Test',
      course: 'Cloud Computing',
      color: 'blue',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.workspaces.put(ws);
    const retrieved = await db.workspaces.get('ws-cloud-test');

    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe('Cloud Computing Test');
    expect(retrieved?.color).toBe('blue');
  });

  it('should save, query, and delete summary sessions in session history', async () => {
    const session: SummarySession = {
      id: 'sess-123',
      workspaceId: 'ws-cloud-test',
      documentId: 'doc-1',
      documentTitle: 'IaaS Lecture',
      title: 'Focus: IaaS Architecture',
      requirement: 'focus on IaaS and SLA',
      options: {
        lengthMode: 'sentences',
        lengthValue: 4,
        outputStyle: 'bullets',
      },
      result: {
        text: 'IaaS provides virtual machines.',
        bullets: ['IaaS provides virtual machines.'],
        selectedSentences: [],
        allSentences: [],
        originalSentenceCount: 10,
        summarySentenceCount: 1,
        compressionRatio: 0.1,
        wordCount: 4,
        readingTimeMinutes: 1,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.sessionHistories.put(session);
    const found = await db.sessionHistories.where('workspaceId').equals('ws-cloud-test').toArray();
    expect(found).toHaveLength(1);
    expect(found[0].title).toBe('Focus: IaaS Architecture');

    // Update / rename
    await db.sessionHistories.update('sess-123', { title: 'Renamed Session Title' });
    const updated = await db.sessionHistories.get('sess-123');
    expect(updated?.title).toBe('Renamed Session Title');

    // Delete
    await db.sessionHistories.delete('sess-123');
    const afterDelete = await db.sessionHistories.get('sess-123');
    expect(afterDelete).toBeUndefined();
  });

  it('should include workspaces and session histories in JSON export and import', async () => {
    const ws: Workspace = {
      id: 'ws-exp',
      name: 'Information Security',
      course: 'Security',
      color: 'rose',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.workspaces.put(ws);

    const json = await exportLibraryToJson();
    expect(json).toContain('StudyDezk');
    expect(json).toContain('Information Security');

    // Import into fresh database
    await db.workspaces.clear();
    const result = await importLibraryFromJson(json, 'replace');
    expect(result.success).toBe(true);

    const importedWs = await db.workspaces.get('ws-exp');
    expect(importedWs).toBeDefined();
    expect(importedWs?.name).toBe('Information Security');
  });

  it('should track data changes and calculate backup age correctly', async () => {
    // Record data changes
    recordDataChange();
    recordDataChange();
    recordDataChange();

    const status1 = await checkStorageDurability();
    expect(status1.changesCount).toBe(3);
    expect(status1.needsBackupReminder).toBe(true);

    // After exporting backup
    recordBackupExported();
    const status2 = await checkStorageDurability();
    expect(status2.changesCount).toBe(0);
    expect(status2.daysSinceLastBackup).toBe(0);
  });

  it('should store summary content and diagrams with original file names for context in a lightweight archive', async () => {
    const session: SummarySession = {
      id: 'sess-lightweight',
      workspaceId: 'ws-cloud-test',
      documentId: 'doc-light',
      documentTitle: 'Cloud Models Lecture',
      fileName: 'lecture-02-cloud-models.pdf',
      title: 'Key Points: Cloud Models',
      options: { outputStyle: 'bullets' },
      result: {
        text: 'IaaS provides virtual machines.',
        bullets: ['IaaS provides virtual machines.'],
        selectedSentences: [],
        allSentences: [],
        originalSentenceCount: 5,
        summarySentenceCount: 1,
        compressionRatio: 0.2,
        wordCount: 4,
        readingTimeMinutes: 1,
      },
      diagrams: [
        {
          id: 'diag-1',
          documentId: 'doc-light',
          workspaceId: 'ws-cloud-test',
          type: 'mindmap',
          title: 'Mindmap',
          mermaidCode: 'mindmap\n  root((Cloud))\n',
          nodeCount: 1,
          createdAt: Date.now(),
        },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.sessionHistories.put(session);
    const saved = await db.sessionHistories.get('sess-lightweight');
    expect(saved?.fileName).toBe('lecture-02-cloud-models.pdf');
    expect(saved?.diagrams).toHaveLength(1);
    expect(saved?.diagrams?.[0].mermaidCode).toContain('mindmap');

    const json = await exportLibraryToJson();
    const parsed = JSON.parse(json);
    expect(parsed.data.sessionHistories[0].fileName).toBe('lecture-02-cloud-models.pdf');
    expect(parsed.data.sessionHistories[0].diagrams).toHaveLength(1);
  });
});
