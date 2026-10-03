export interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type FigureType = 'figure' | 'table' | 'diagram' | 'slide';

export interface ExtractedFigure {
  id: string;
  workspaceId: string;
  documentId: string;
  pageNumber: number;
  figureIndex?: number;
  caption: string;
  type?: FigureType;
  blob: Blob;
  fullBlob?: Blob;
  thumbnailBlob: Blob;
  mimeType?: string;
  width: number;
  height: number;
  cropBox: CropBox;
  status?: 'kept' | 'removed';
  userStatus?: 'kept' | 'removed';
  score?: number;
  detectedBy?: 'operator_list' | 'caption' | 'hybrid';
  createdAt: number;
}

export interface SerializedFigure {
  id: string;
  workspaceId: string;
  documentId: string;
  pageNumber: number;
  figureIndex?: number;
  caption: string;
  type?: FigureType;
  dataUrl?: string;
  fullDataUrl: string;
  thumbnailDataUrl: string;
  mimeType?: string;
  width: number;
  height: number;
  cropBox: CropBox;
  status?: 'kept' | 'removed';
  userStatus?: 'kept' | 'removed';
  score?: number;
  detectedBy?: 'operator_list' | 'caption' | 'hybrid';
  createdAt: number;
}
