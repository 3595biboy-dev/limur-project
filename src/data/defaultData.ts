import { DashboardData } from '../types/dashboard';

export const STORAGE_KEY = 'limur_project_v1';
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

export const DEFAULT_DASHBOARD_DATA: DashboardData = {
  projectTitle: 'LimurProject',
  currency: 'тыс. ₽',
  documents: [
    {
      id: 'doc-kp',
      title: 'Коммерческое предложение',
      url: 'https://limurproject.ru/',
    },
    {
      id: 'doc-plan',
      title: 'Обмерный план',
      url: 'https://limurproject.ru/',
    },
  ],
  stages: [
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
      name: '1 этап (Планировка)',
      amount: 30,
      paid: true,
      startDate: '2026-11-06',
      endDate: '2026-11-18',
    },
    {
      id: 'stage-3',
      name: '2 этап (3D-визуализация)',
      amount: 50,
      paid: true,
      startDate: '2026-11-19',
      endDate: '2026-12-05',
    },
    {
      id: 'stage-4',
      name: '3 этап (Рабочие чертежи)',
      amount: 20,
      paid: false,
      startDate: '2026-12-06',
      endDate: '2026-12-20',
    },
  ],
  team: [
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
};

export function normalizeDashboardData(raw: unknown): DashboardData {
  if (!raw || typeof raw !== 'object') {
    return structuredClone(DEFAULT_DASHBOARD_DATA);
  }

  const candidate = raw as Partial<DashboardData>;
  const rawTitle = typeof candidate.projectTitle === 'string' ? candidate.projectTitle.trim() : '';
  const migratedTitle = OLD_DEFAULT_TITLES.has(rawTitle.toLowerCase())
    ? 'LimurProject'
    : rawTitle;

  const documents =
    Array.isArray(candidate.documents) && candidate.documents.length > 0
      ? candidate.documents.map((doc, idx) => ({
          id: typeof doc.id === 'string' && doc.id ? doc.id : `doc-${idx + 1}`,
          title: typeof doc.title === 'string' && doc.title ? doc.title : 'Документ',
          url: typeof doc.url === 'string' && doc.url ? doc.url : 'https://limurproject.ru/',
        }))
      : structuredClone(DEFAULT_DASHBOARD_DATA.documents);

  const stages = Array.isArray(candidate.stages)
    ? candidate.stages.map((st, idx) => ({
        id: typeof st.id === 'string' && st.id ? st.id : `stage-${idx + 1}`,
        name: typeof st.name === 'string' ? st.name : `Этап ${idx + 1}`,
        amount: Number.isFinite(Number(st.amount)) ? Math.max(0, Number(st.amount)) : 0,
        paid: Boolean(st.paid),
        startDate: typeof st.startDate === 'string' && st.startDate ? st.startDate : '2026-11-01',
        endDate: typeof st.endDate === 'string' && st.endDate ? st.endDate : '2026-11-10',
      }))
    : structuredClone(DEFAULT_DASHBOARD_DATA.stages);

  const team = Array.isArray(candidate.team)
    ? teamSanitize(candidate.team)
    : structuredClone(DEFAULT_DASHBOARD_DATA.team);

  return {
    projectTitle: migratedTitle,
    currency: typeof candidate.currency === 'string' && candidate.currency.trim()
      ? candidate.currency
      : DEFAULT_DASHBOARD_DATA.currency,
    documents,
    stages,
    team,
    updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : undefined,
  };
}

function teamSanitize(items: DashboardData['team']) {
  return items.map((member, idx) => ({
    id: typeof member.id === 'string' && member.id ? member.id : `team-${idx + 1}`,
    role: typeof member.role === 'string' ? member.role : `Статья ${idx + 1}`,
    totalCost: Number.isFinite(Number(member.totalCost)) ? Math.max(0, Number(member.totalCost)) : 0,
    paidAmount: Number.isFinite(Number(member.paidAmount)) ? Math.max(0, Number(member.paidAmount)) : 0,
  }));
}

export function loadDashboardFromStorage(): DashboardData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return structuredClone(DEFAULT_DASHBOARD_DATA);
    }
    const parsed = JSON.parse(raw);
    const normalized = normalizeDashboardData(parsed);
    // Persist back if title was migrated
    if (parsed && parsed.projectTitle !== normalized.projectTitle) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    }
    return normalized;
  } catch {
    return structuredClone(DEFAULT_DASHBOARD_DATA);
  }
}

export function saveDashboardToStorage(data: DashboardData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors gracefully
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
