import {
  MultiProjectStore,
  PayoutType,
  ProjectDocument,
  ProjectRecord,
  ProjectStage,
  SortOrder,
  StageExpense,
  TeamExpense,
  WorkStage,
} from '../types/dashboard';

export const STORAGE_KEY = 'limur_multiproject_v1';
export const LEGACY_STORAGE_KEY = 'limur_project_v1';
export const TOKEN_STORAGE_KEY = 'limur_gh_token';
export const GIST_ID_STORAGE_KEY = 'limur_gist_id';
export const GIST_FILENAME = 'limur-project-dashboard.json';

const OLD_DEFAULT_TITLES = new Set([
  '',
  'design studio',
  'interior project',
  'project dashboard',
  'studio dashboard',
  'untitled project',
  'мой проект',
  'дизайн-проект',
  'дашборд проекта',
  'новый проект',
]);

export function getStageCompletionPercent(stage: ProjectStage): number {
  if (stage.workStages && stage.workStages.length > 0) {
    const sum = stage.workStages.reduce(
      (acc, ws) => acc + Math.min(100, Math.max(0, Number(ws.progress) || 0)),
      0
    );
    return Math.round(sum / stage.workStages.length);
  }
  if (typeof stage.progress === 'number' && Number.isFinite(stage.progress)) {
    return Math.min(100, Math.max(0, Math.round(stage.progress)));
  }
  return stage.paid ? 100 : 0;
}

export function getStageDateBounds(stage: ProjectStage): {
  startDate: string;
  endDate: string;
} {
  if (stage.workStages && stage.workStages.length > 0) {
    const starts = stage.workStages
      .map((w) => w.plannedStart)
      .filter(Boolean)
      .sort();
    const ends = stage.workStages
      .map((w) => w.plannedEnd)
      .filter(Boolean)
      .sort();
    if (starts.length > 0 && ends.length > 0) {
      return {
        startDate: starts[0],
        endDate: ends[ends.length - 1],
      };
    }
  }
  return {
    startDate: stage.startDate || '2026-11-01',
    endDate: stage.endDate || '2026-11-10',
  };
}

export function getStageExpensesBreakdown(
  stage: ProjectStage,
  team: TeamExpense[]
): {
  directTotal: number;
  directPaid: number;
  linkedTotal: number;
  linkedPaid: number;
  totalExpenses: number;
  paidExpenses: number;
} {
  const direct = stage.expenses || [];
  const directTotal = direct.reduce((sum, e) => sum + e.amount, 0);
  const directPaid = direct
    .filter((e) => e.paid)
    .reduce((sum, e) => sum + e.amount, 0);

  const linked = team.filter((t) => t.stageId === stage.id);
  const linkedTotal = linked.reduce((sum, t) => sum + t.totalCost, 0);
  const linkedPaid = linked.reduce((sum, t) => sum + t.paidAmount, 0);

  return {
    directTotal,
    directPaid,
    linkedTotal,
    linkedPaid,
    totalExpenses: directTotal + linkedTotal,
    paidExpenses: directPaid + linkedPaid,
  };
}

export function getProjectFinancialSummary(project: ProjectRecord): {
  totalIncome: number;
  paidIncome: number;
  unpaidIncome: number;
  projectExpensesTotal: number;
  projectExpensesPaid: number;
  salaryExpensesTotal: number;
  salaryExpensesPaid: number;
  totalExpenses: number;
  totalPaidExpenses: number;
  netMargin: number;
} {
  const totalIncome = project.stages.reduce((sum, s) => sum + s.amount, 0);
  const paidIncome = project.stages
    .filter((s) => s.paid)
    .reduce((sum, s) => sum + s.amount, 0);
  const unpaidIncome = Math.max(0, totalIncome - paidIncome);

  const salaryItems = project.team.filter((t) => t.payoutType === 'salary');
  const projectTeamItems = project.team.filter(
    (t) => t.payoutType !== 'salary'
  );

  const salaryExpensesTotal = salaryItems.reduce(
    (sum, t) => sum + t.totalCost,
    0
  );
  const salaryExpensesPaid = salaryItems.reduce(
    (sum, t) => sum + t.paidAmount,
    0
  );

  const stageDirectTotal = project.stages.reduce(
    (sum, s) => sum + (s.expenses || []).reduce((acc, e) => acc + e.amount, 0),
    0
  );
  const stageDirectPaid = project.stages.reduce(
    (sum, s) =>
      sum +
      (s.expenses || [])
        .filter((e) => e.paid)
        .reduce((acc, e) => acc + e.amount, 0),
    0
  );

  const projectExpensesTotal =
    projectTeamItems.reduce((sum, t) => sum + t.totalCost, 0) +
    stageDirectTotal;
  const projectExpensesPaid =
    projectTeamItems.reduce((sum, t) => sum + t.paidAmount, 0) +
    stageDirectPaid;

  const totalExpenses = projectExpensesTotal + salaryExpensesTotal;
  const totalPaidExpenses = projectExpensesPaid + salaryExpensesPaid;
  const netMargin = totalIncome - totalExpenses;

  return {
    totalIncome,
    paidIncome,
    unpaidIncome,
    projectExpensesTotal,
    projectExpensesPaid,
    salaryExpensesTotal,
    salaryExpensesPaid,
    totalExpenses,
    totalPaidExpenses,
    netMargin,
  };
}

export function createDefaultProject(
  overrides?: Partial<ProjectRecord>
): ProjectRecord {
  const todayIso = new Date().toISOString().slice(0, 10);
  return {
    id: overrides?.id || 'limur-default',
    title: overrides?.title || 'LimurProject',
    createdAt: overrides?.createdAt || new Date().toISOString(),
    projectDate: overrides?.projectDate || '2026-11-01',
    status: overrides?.status || 'active',
    currency: overrides?.currency || 'тыс. ₽',
    areaM2: overrides?.areaM2 ?? 85,
    kp: overrides?.kp || { url: 'https://limurproject.ru/' },
    plan: overrides?.plan || { url: 'https://limurproject.ru/' },
    stages: overrides?.stages || [
      {
        id: 'stage-1',
        name: '1 этап оплаты (Замеры и планировка)',
        amount: 30,
        paid: true,
        startDate: '2026-11-01',
        endDate: '2026-11-18',
        expenses: [],
        workStages: [
          {
            id: 'ws-1-1',
            title: 'Обмеры и фотофиксация',
            assignee: 'Замеры',
            plannedStart: '2026-11-01',
            plannedEnd: '2026-11-05',
            actualStart: '2026-11-01',
            actualEnd: '2026-11-05',
            progress: 100,
            clientApproval: false,
          },
          {
            id: 'ws-1-2',
            title: 'Планировочное решение',
            assignee: 'Дизайнер',
            plannedStart: '2026-11-06',
            plannedEnd: '2026-11-18',
            actualStart: '2026-11-06',
            actualEnd: '2026-11-17',
            progress: 100,
            clientApproval: true,
          },
        ],
      },
      {
        id: 'stage-2',
        name: '2 этап оплаты (3D-визуализация)',
        amount: 50,
        paid: true,
        startDate: '2026-11-19',
        endDate: '2026-12-05',
        expenses: [],
        workStages: [
          {
            id: 'ws-2-1',
            title: 'Концепция и подбор материалов',
            assignee: 'Дизайнер',
            plannedStart: '2026-11-19',
            plannedEnd: '2026-11-25',
            actualStart: '2026-11-19',
            progress: 100,
            clientApproval: true,
          },
          {
            id: 'ws-2-2',
            title: '3D-визуализация помещений',
            assignee: 'Визер',
            plannedStart: '2026-11-26',
            plannedEnd: '2026-12-05',
            actualStart: '2026-11-26',
            progress: 80,
            clientApproval: true,
          },
        ],
      },
      {
        id: 'stage-3',
        name: '3 этап оплаты (Рабочие чертежи)',
        amount: 20,
        paid: false,
        startDate: '2026-12-06',
        endDate: '2026-12-20',
        expenses: [],
        workStages: [
          {
            id: 'ws-3-1',
            title: 'Альбом рабочих чертежей',
            assignee: 'Чертёж',
            plannedStart: '2026-12-06',
            plannedEnd: '2026-12-16',
            progress: 20,
            clientApproval: false,
          },
          {
            id: 'ws-3-2',
            title: 'Финальное согласование проекта',
            assignee: 'Дизайнер',
            plannedStart: '2026-12-17',
            plannedEnd: '2026-12-20',
            progress: 0,
            clientApproval: true,
          },
        ],
      },
    ],
    team: overrides?.team || [
      {
        id: 'team-1',
        role: 'Дизайнер',
        payoutType: 'salary',
        stageId: 'stage-1',
        totalCost: 25,
        paidAmount: 20,
      },
      {
        id: 'team-2',
        role: 'Визер',
        payoutType: 'project',
        stageId: 'stage-2',
        totalCost: 20,
        paidAmount: 10,
      },
      {
        id: 'team-3',
        role: 'Чертёж',
        payoutType: 'project',
        stageId: 'stage-3',
        totalCost: 25,
        paidAmount: 1.5,
      },
      {
        id: 'team-4',
        role: 'Замеры',
        payoutType: 'project',
        stageId: 'stage-1',
        totalCost: 5,
        paidAmount: 5,
      },
      {
        id: 'team-5',
        role: 'Бенз и печать',
        payoutType: 'project',
        stageId: 'stage-3',
        totalCost: 5,
        paidAmount: 2.5,
      },
    ],
    updatedAt: overrides?.updatedAt || todayIso,
  };
}

export function createNewProjectTemplate(index: number): ProjectRecord {
  const todayIso = new Date().toISOString().slice(0, 10);
  const startMs = Date.now();
  const fmt = (offsetDays: number) =>
    new Date(startMs + offsetDays * 86400000).toISOString().slice(0, 10);
  const st1 = `st-${Date.now()}-1`;
  const st2 = `st-${Date.now()}-2`;
  const st3 = `st-${Date.now()}-3`;

  return {
    id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: `LimurProject · Объект ${index}`,
    createdAt: new Date().toISOString(),
    projectDate: todayIso,
    status: 'active',
    currency: 'тыс. ₽',
    areaM2: 85,
    kp: { url: 'https://limurproject.ru/' },
    plan: { url: 'https://limurproject.ru/' },
    stages: [
      {
        id: st1,
        name: '1 этап оплаты (Замеры и планировка)',
        amount: 30,
        paid: false,
        startDate: fmt(0),
        endDate: fmt(17),
        expenses: [],
        workStages: [
          {
            id: `ws-${Date.now()}-1-1`,
            title: 'Обмеры и фотофиксация',
            assignee: 'Замеры',
            plannedStart: fmt(0),
            plannedEnd: fmt(4),
            progress: 0,
            clientApproval: false,
          },
          {
            id: `ws-${Date.now()}-1-2`,
            title: 'Планировочное решение',
            assignee: 'Дизайнер',
            plannedStart: fmt(5),
            plannedEnd: fmt(17),
            progress: 0,
            clientApproval: true,
          },
        ],
      },
      {
        id: st2,
        name: '2 этап оплаты (3D-визуализация)',
        amount: 50,
        paid: false,
        startDate: fmt(18),
        endDate: fmt(34),
        expenses: [],
        workStages: [
          {
            id: `ws-${Date.now()}-2-1`,
            title: '3D-визуализация помещений',
            assignee: 'Визер',
            plannedStart: fmt(18),
            plannedEnd: fmt(34),
            progress: 0,
            clientApproval: true,
          },
        ],
      },
      {
        id: st3,
        name: '3 этап оплаты (Рабочие чертежи)',
        amount: 20,
        paid: false,
        startDate: fmt(35),
        endDate: fmt(49),
        expenses: [],
        workStages: [
          {
            id: `ws-${Date.now()}-3-1`,
            title: 'Альбом рабочих чертежей',
            assignee: 'Чертёж',
            plannedStart: fmt(35),
            plannedEnd: fmt(49),
            progress: 0,
            clientApproval: true,
          },
        ],
      },
    ],
    team: [
      {
        id: `tm-${Date.now()}-1`,
        role: 'Дизайнер',
        payoutType: 'salary',
        stageId: st1,
        totalCost: 25,
        paidAmount: 0,
      },
      {
        id: `tm-${Date.now()}-2`,
        role: 'Визер',
        payoutType: 'project',
        stageId: st2,
        totalCost: 20,
        paidAmount: 0,
      },
      {
        id: `tm-${Date.now()}-3`,
        role: 'Чертёж',
        payoutType: 'project',
        stageId: st3,
        totalCost: 25,
        paidAmount: 0,
      },
      {
        id: `tm-${Date.now()}-4`,
        role: 'Замеры',
        payoutType: 'project',
        stageId: st1,
        totalCost: 5,
        paidAmount: 0,
      },
      {
        id: `tm-${Date.now()}-5`,
        role: 'Бенз и печать',
        payoutType: 'project',
        stageId: st3,
        totalCost: 5,
        paidAmount: 0,
      },
    ],
  };
}

export const DEFAULT_STORE: MultiProjectStore = {
  activeProjectId: 'limur-default',
  sortOrder: 'newest',
  projects: [createDefaultProject()],
};

function sanitizeDocument(
  raw: unknown,
  fallbackUrl = 'https://limurproject.ru/'
): ProjectDocument {
  if (!raw || typeof raw !== 'object') {
    return { url: fallbackUrl };
  }
  const doc = raw as Partial<ProjectDocument>;
  return {
    url: typeof doc.url === 'string' ? doc.url : fallbackUrl,
    fileName:
      typeof doc.fileName === 'string' && doc.fileName
        ? doc.fileName
        : undefined,
    fileDataUrl:
      typeof doc.fileDataUrl === 'string' && doc.fileDataUrl
        ? doc.fileDataUrl
        : undefined,
  };
}

function sanitizeStageExpenses(rawExpenses: unknown): StageExpense[] {
  if (!Array.isArray(rawExpenses)) return [];
  return rawExpenses.map((ex, idx) => {
    const e = (ex || {}) as Partial<StageExpense>;
    return {
      id: typeof e.id === 'string' && e.id ? e.id : `se-${idx + 1}`,
      title: typeof e.title === 'string' ? e.title : `Расход ${idx + 1}`,
      amount: Number.isFinite(Number(e.amount))
        ? Math.max(0, Number(e.amount))
        : 0,
      paid: Boolean(e.paid),
    };
  });
}

function sanitizeWorkStages(
  rawWorkStages: unknown,
  stagePaid: boolean
): WorkStage[] {
  if (!Array.isArray(rawWorkStages)) return [];
  return rawWorkStages.map((ws, idx) => {
    const w = (ws || {}) as Partial<WorkStage>;
    return {
      id: typeof w.id === 'string' && w.id ? w.id : `ws-${idx + 1}`,
      title: typeof w.title === 'string' ? w.title : `Работа ${idx + 1}`,
      assignee: typeof w.assignee === 'string' ? w.assignee : 'Дизайнер',
      plannedStart:
        typeof w.plannedStart === 'string' && w.plannedStart
          ? w.plannedStart
          : '2026-11-01',
      plannedEnd:
        typeof w.plannedEnd === 'string' && w.plannedEnd
          ? w.plannedEnd
          : '2026-11-10',
      actualStart:
        typeof w.actualStart === 'string' && w.actualStart
          ? w.actualStart
          : undefined,
      actualEnd:
        typeof w.actualEnd === 'string' && w.actualEnd
          ? w.actualEnd
          : undefined,
      progress: Number.isFinite(Number(w.progress))
        ? Math.min(100, Math.max(0, Number(w.progress)))
        : stagePaid
          ? 100
          : 0,
      clientApproval: Boolean(w.clientApproval),
    };
  });
}

function sanitizeStages(rawStages: unknown): ProjectStage[] {
  if (!Array.isArray(rawStages)) return createDefaultProject().stages;
  return rawStages.map((st, idx) => {
    const s = (st || {}) as Partial<ProjectStage>;
    const paid = Boolean(s.paid);
    return {
      id: typeof s.id === 'string' && s.id ? s.id : `stage-${idx + 1}`,
      name: typeof s.name === 'string' ? s.name : `Этап ${idx + 1}`,
      amount: Number.isFinite(Number(s.amount))
        ? Math.max(0, Number(s.amount))
        : 0,
      paid,
      startDate:
        typeof s.startDate === 'string' && s.startDate
          ? s.startDate
          : '2026-11-01',
      endDate:
        typeof s.endDate === 'string' && s.endDate ? s.endDate : '2026-11-10',
      progress: Number.isFinite(Number(s.progress))
        ? Math.min(100, Math.max(0, Number(s.progress)))
        : undefined,
      clientApproval: Boolean(s.clientApproval),
      workStages: sanitizeWorkStages(s.workStages, paid),
      expenses: sanitizeStageExpenses(s.expenses),
    };
  });
}

function sanitizeTeam(rawTeam: unknown): TeamExpense[] {
  if (!Array.isArray(rawTeam)) return createDefaultProject().team;
  return rawTeam.map((member, idx) => {
    const m = (member || {}) as Partial<TeamExpense>;
    const payoutType: PayoutType =
      m.payoutType === 'salary' ? 'salary' : 'project';
    return {
      id: typeof m.id === 'string' && m.id ? m.id : `team-${idx + 1}`,
      role: typeof m.role === 'string' ? m.role : `Статья ${idx + 1}`,
      payoutType,
      stageId:
        typeof m.stageId === 'string' && m.stageId ? m.stageId : undefined,
      totalCost: Number.isFinite(Number(m.totalCost))
        ? Math.max(0, Number(m.totalCost))
        : 0,
      paidAmount: Number.isFinite(Number(m.paidAmount))
        ? Math.max(0, Number(m.paidAmount))
        : 0,
    };
  });
}

function sanitizeProject(raw: unknown, idx: number): ProjectRecord {
  const p = (raw || {}) as Partial<ProjectRecord> & {
    projectTitle?: string;
    documents?: Array<{ id?: string; title?: string; url?: string }>;
  };

  const rawTitle =
    typeof p.title === 'string'
      ? p.title.trim()
      : typeof p.projectTitle === 'string'
        ? p.projectTitle.trim()
        : '';

  const title = OLD_DEFAULT_TITLES.has(rawTitle.toLowerCase())
    ? 'LimurProject'
    : rawTitle;

  const legacyKp = Array.isArray(p.documents) ? p.documents[0]?.url : undefined;
  const legacyPlan = Array.isArray(p.documents)
    ? p.documents[1]?.url
    : undefined;

  return {
    id: typeof p.id === 'string' && p.id ? p.id : `proj-${idx + 1}`,
    title,
    createdAt:
      typeof p.createdAt === 'string' && p.createdAt
        ? p.createdAt
        : new Date().toISOString(),
    projectDate:
      typeof p.projectDate === 'string' && p.projectDate
        ? p.projectDate
        : '2026-11-01',
    status: p.status === 'archived' ? 'archived' : 'active',
    currency:
      typeof p.currency === 'string' && p.currency.trim()
        ? p.currency
        : 'тыс. ₽',
    areaM2:
      Number.isFinite(Number(p.areaM2)) && Number(p.areaM2) > 0
        ? Number(p.areaM2)
        : 85,
    kp: p.kp
      ? sanitizeDocument(p.kp)
      : sanitizeDocument({ url: legacyKp || 'https://limurproject.ru/' }),
    plan: p.plan
      ? sanitizeDocument(p.plan)
      : sanitizeDocument({ url: legacyPlan || 'https://limurproject.ru/' }),
    stages: sanitizeStages(p.stages),
    team: sanitizeTeam(p.team),
    updatedAt: typeof p.updatedAt === 'string' ? p.updatedAt : undefined,
  };
}

export function normalizeMultiProjectStore(raw: unknown): MultiProjectStore {
  if (!raw || typeof raw !== 'object') {
    return structuredClone(DEFAULT_STORE);
  }

  const candidate = raw as Partial<MultiProjectStore> & {
    projectTitle?: string;
    stages?: unknown;
    team?: unknown;
  };

  if (
    !Array.isArray(candidate.projects) &&
    (candidate.stages || candidate.projectTitle)
  ) {
    const migratedProject = sanitizeProject(candidate, 0);
    migratedProject.id = 'limur-default';
    return {
      activeProjectId: migratedProject.id,
      sortOrder: 'newest',
      projects: [migratedProject],
    };
  }

  const projects =
    Array.isArray(candidate.projects) && candidate.projects.length > 0
      ? candidate.projects.map((p, i) => sanitizeProject(p, i))
      : [createDefaultProject()];

  const activeExists = projects.some((p) => p.id === candidate.activeProjectId);
  const firstActive =
    projects.find((p) => p.status === 'active') || projects[0];
  const sortOrder: SortOrder =
    candidate.sortOrder === 'oldest' ? 'oldest' : 'newest';

  return {
    activeProjectId: activeExists
      ? (candidate.activeProjectId as string)
      : firstActive.id,
    sortOrder,
    projects,
    updatedAt:
      typeof candidate.updatedAt === 'string' ? candidate.updatedAt : undefined,
  };
}

export function loadStoreFromStorage(): MultiProjectStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return normalizeMultiProjectStore(JSON.parse(raw));
    }

    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyRaw) {
      const migrated = normalizeMultiProjectStore(JSON.parse(legacyRaw));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }

    return structuredClone(DEFAULT_STORE);
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
}

export function saveStoreToStorage(store: MultiProjectStore): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Handle storage quota limits gracefully
  }
}

export function formatNumber(value: number): string {
  if (Number.isInteger(value)) {
    return value.toLocaleString('ru-RU');
  }
  return Number(value.toFixed(2)).toLocaleString('ru-RU', {
    maximumFractionDigits: 2,
  });
}

export function formatShortDate(isoDate: string): string {
  if (!isoDate) return '—';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}.${parts[1]}`;
}

export function formatFullDate(isoDate: string): string {
  if (!isoDate) return '—';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

export function openDocumentResource(doc: ProjectDocument): void {
  const target = doc.url?.trim() || doc.fileDataUrl;
  if (!target) return;

  if (target.startsWith('data:')) {
    try {
      const [header, base64] = target.split(',');
      const mimeMatch = header.match(/data:([^;]+)/);
      const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      const win = window.open(blobUrl, '_blank', 'noopener,noreferrer');
      if (!win) {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = doc.fileName || 'document';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      return;
    } catch {
      // Fallback below
    }
  }

  window.open(target, '_blank', 'noopener,noreferrer');
}
