export interface ProjectDocument {
  url: string;
  fileName?: string;
  fileDataUrl?: string;
}

export interface ProjectStage {
  id: string;
  name: string;
  amount: number;
  paid: boolean;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export interface TeamExpense {
  id: string;
  role: string;
  totalCost: number;
  paidAmount: number;
}

export type ProjectStatus = 'active' | 'archived';

export interface ProjectRecord {
  id: string;
  title: string;
  createdAt: string;
  projectDate: string; // YYYY-MM-DD
  status: ProjectStatus;
  currency: string;
  kp: ProjectDocument;
  plan: ProjectDocument;
  stages: ProjectStage[];
  team: TeamExpense[];
  updatedAt?: string;
}

export type SortOrder = 'newest' | 'oldest';

export interface MultiProjectStore {
  activeProjectId: string;
  sortOrder: SortOrder;
  projects: ProjectRecord[];
  updatedAt?: string;
}

export type ViewMode = 'view' | 'editor';

export type SyncState = 'local' | 'online' | 'syncing' | 'error';
