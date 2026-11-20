export interface DocumentLink {
  id: string;
  title: string;
  url: string;
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

export interface DashboardData {
  projectTitle: string;
  currency: string;
  documents: DocumentLink[];
  stages: ProjectStage[];
  team: TeamExpense[];
  updatedAt?: string;
}

export type ViewMode = 'client' | 'editor';

export type SyncState = 'local' | 'online' | 'syncing' | 'error';
