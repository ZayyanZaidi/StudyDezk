export type DiagramType = 'mindmap' | 'flowchart' | 'concept_graph';

export interface DiagramSpec {
  id: string;
  workspaceId: string;
  documentId: string;
  type: DiagramType;
  title: string;
  mermaidCode: string;
  nodeCount: number;
  createdAt: number;
}
