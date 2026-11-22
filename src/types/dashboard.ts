export interface ProjectDocument {
  url: string;
  fileName?: string;
  fileDataUrl?: string;
}

export interface StageExpense {
  id: string;
  title: string;
  amount: number;
  paid: boolean;
}

export interface WorkStage {
  id: string;
  title: string;
  assignee: string;
  plannedStart: string; // YYYY-MM-DD
  plannedEnd: string;   // YYYY-MM-DD
  actualStart?: string; // YYYY-MM-DD
  actualEnd?: string;   // YYYY-MM-DD
  progress: number;     // 0-100
  clientApproval?: boolean;
}

export interface ProjectStage {
  id: string;
  name: string;
  amount: number;
  paid: boolean;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  progress?: number; // 0-100 fallback when workStages is empty
  clientApproval?: boolean;
  workStages: WorkStage[];
  expenses: StageExpense[];
}

export type PayoutType = 'project' | 'salary';

export interface TeamExpense {
  id: string;
  role: string;
  payoutType?: PayoutType;
  stageId?: string;
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
  areaM2?: number;
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

export type WorkspaceTab = 'project' | 'dashboard';

export type SyncState = 'local' | 'online' | 'syncing' | 'error';
