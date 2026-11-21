import {
  MultiProjectStore,
  ProjectDocument,
  ProjectRecord,
  ProjectStage,
  SortOrder,
  TeamExpense,
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
    kp: overrides?.kp || { url: 'https://limurproject.ru/' },
    plan: overrides?.plan || { url: 'https://limurproject.ru/' },
    stages: overrides?.stages || [
      {
        id: 'stage-1',
        name: 'Замеры',
        amount: 0,
        paid: true,
        startDate: '2026-11-01',
        endDate: '2026-11-05',
      },
      {
        id: 'stage-2',
        name: '1 этап',
        amount: 30,
        paid: true,
        startDate: '2026-11-06',
        endDate: '2026-11-18',
      },
      {
        id: 'stage-3',
        name: '2 этап',
        amount: 50,
        paid: true,
        startDate: '2026-11-19',
        endDate: '2026-12-05',
      },
      {
        id: 'stage-4',
        name: '3 этап',
        amount: 20,
        paid: false,
        startDate: '2026-12-06',
        endDate: '2026-12-20',
      },
    ],
    team: overrides?.team || [
      {
        id: 'team-1',
        role: 'Дизайнер',
        totalCost: 25,
        paidAmount: 20,
      },
      {
        id: 'team-2',
        role: 'Визер',
        totalCost: 20,
        paidAmount: 10,
      },
      {
        id: 'team-3',
        role: 'Чертёж',
        totalCost: 25,
        paidAmount: 1.5,
      },
      {
        id: 'team-4',
        role: 'Замеры',
        totalCost: 5,
        paidAmount: 5,
      },
      {
        id: 'team-5',
        role: 'Бенз и печать',
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

  return {
    id: `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: `LimurProject · Объект ${index}`,
    createdAt: new Date().toISOString(),
    projectDate: todayIso,
    status: 'active',
    currency: 'тыс. ₽',
    kp: { url: 'https://limurproject.ru/' },
    plan: { url: 'https://limurproject.ru/' },
    stages: [
      {
        id: `st-${Date.now()}-1`,
        name: 'Замеры',
        amount: 0,
        paid: false,
        startDate: fmt(0),
        endDate: fmt(4),
      },
      {
        id: `st-${Date.now()}-2`,
        name: '1 этап',
        amount: 30,
        paid: false,
        startDate: fmt(5),
        endDate: fmt(17),
      },
      {
        id: `st-${Date.now()}-3`,
        name: '2 этап',
        amount: 50,
        paid: false,
        startDate: fmt(18),
        endDate: fmt(34),
      },
      {
        id: `st-${Date.now()}-4`,
        name: '3 этап',
        amount: 20,
        paid: false,
        startDate: fmt(35),
        endDate: fmt(49),
      },
    ],
    team: [
      { id: `tm-${Date.now()}-1`, role: 'Дизайнер', totalCost: 25, paidAmount: 0 },
      { id: `tm-${Date.now()}-2`, role: 'Визер', totalCost: 20, paidAmount: 0 },
      { id: `tm-${Date.now()}-3`, role: 'Чертёж', totalCost: 25, paidAmount: 0 },
      { id: `tm-${Date.now()}-4`, role: 'Замеры', totalCost: 5, paidAmount: 0 },
      { id: `tm-${Date.now()}-5`, role: 'Бенз и печать', totalCost: 5, paidAmount: 0 },
    ],
  };
}

export const DEFAULT_STORE: MultiProjectStore = {
  activeProjectId: 'limur-default',
  sortOrder: 'newest',
  projects: [createDefaultProject()],
};

function sanitizeDocument(raw: unknown, fallbackUrl = 'https://limurproject.ru/'): ProjectDocument {
  if (!raw || typeof raw !== 'object') {
    return { url: fallbackUrl };
  }
  const doc = raw as Partial<ProjectDocument>;
  return {
    url: typeof doc.url === 'string' ? doc.url : fallbackUrl,
    fileName: typeof doc.fileName === 'string' && doc.fileName ? doc.fileName : undefined,
    fileDataUrl:
      typeof doc.fileDataUrl === 'string' && doc.fileDataUrl ? doc.fileDataUrl : undefined,
  };
}

function sanitizeStages(rawStages: unknown): ProjectStage[] {
  if (!Array.isArray(rawStages)) return createDefaultProject().stages;
  return rawStages.map((st, idx) => {
    const s = (st || {}) as Partial<ProjectStage>;
    return {
      id: typeof s.id === 'string' && s.id ? s.id : `stage-${idx + 1}`,
      name: typeof s.name === 'string' ? s.name : `Этап ${idx + 1}`,
      amount: Number.isFinite(Number(s.amount)) ? Math.max(0, Number(s.amount)) : 0,
      paid: Boolean(s.paid),
      startDate:
        typeof s.startDate === 'string' && s.startDate ? s.startDate : '2026-11-01',
      endDate:
        typeof s.endDate === 'string' && s.endDate ? s.endDate : '2026-11-10',
    };
  });
}

function sanitizeTeam(rawTeam: unknown): TeamExpense[] {
  if (!Array.isArray(rawTeam)) return createDefaultProject().team;
  return rawTeam.map((member, idx) => {
    const m = (member || {}) as Partial<TeamExpense>;
    return {
      id: typeof m.id === 'string' && m.id ? m.id : `team-${idx + 1}`,
      role: typeof m.role === 'string' ? m.role : `Статья ${idx + 1}`,
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
  const legacyPlan = Array.isArray(p.documents) ? p.documents[1]?.url : undefined;

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
      typeof p.currency === 'string' && p.currency.trim() ? p.currency : 'тыс. ₽',
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

  // Support migrating legacy single-project JSON (from old localStorage or old Gist)
  if (!Array.isArray(candidate.projects) && (candidate.stages || candidate.projectTitle)) {
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
  const firstActive = projects.find((p) => p.status === 'active') || projects[0];
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

    // Migrate from legacy single-project storage if present
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
    // Handle storage quota limits gracefully (e.g. very large file uploads)
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
