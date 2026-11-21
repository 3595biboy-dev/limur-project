import React from 'react';
import { Archive, ArrowDownUp, FolderPlus, RotateCcw } from 'lucide-react';
import { ProjectRecord, SortOrder } from '../types/dashboard';
import { formatFullDate } from '../data/defaultData';

interface ProjectWorkspaceBarProps {
  activeProjects: ProjectRecord[];
  selectedProject: ProjectRecord;
  sortOrder: SortOrder;
  onSelectProject: (id: string) => void;
  onCreateProject: () => void;
  onToggleSortOrder: () => void;
  onArchiveProject: (id: string) => void;
  onRestoreProject: (id: string) => void;
}

export const ProjectWorkspaceBar: React.FC<ProjectWorkspaceBarProps> = ({
  activeProjects,
  selectedProject,
  sortOrder,
  onSelectProject,
  onCreateProject,
  onToggleSortOrder,
  onArchiveProject,
  onRestoreProject,
}) => {
  const isViewingArchived = selectedProject.status === 'archived';

  return (
    <section className="no-print bg-white border border-[#E6DFD5] rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-2 min-w-0">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[#7A736A] mr-1 whitespace-nowrap">
          Проекты:
        </span>

        {activeProjects.map((proj) => {
          const isSelected = proj.id === selectedProject.id;
          return (
            <button
              key={proj.id}
              type="button"
              onClick={() => onSelectProject(proj.id)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8956A] ${
                isSelected
                  ? 'bg-[#1F1D1A] text-[#FAF8F5] border-[#1F1D1A]'
                  : 'bg-[#FAF8F5] text-[#1F1D1A] border-[#E6DFD5] hover:border-[#B8956A]'
              }`}
            >
              <span className="max-w-[180px] truncate">{proj.title}</span>
              <span
                className={`text-[10px] tabular-nums ${
                  isSelected ? 'text-[#B8956A]' : 'text-[#7A736A]'
                }`}
              >
                {formatFullDate(proj.projectDate)}
              </span>
            </button>
          );
        })}

        {isViewingArchived && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#FAF0EE] border border-[#C46D5E]/40 text-[#C46D5E] whitespace-nowrap">
            <span>Архив: {selectedProject.title}</span>
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onToggleSortOrder}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#E6DFD5] bg-[#FAF8F5] text-[#4A453E] hover:border-[#B8956A] transition-colors whitespace-nowrap cursor-pointer"
          title="Изменить порядок сортировки проектов по дате"
        >
          <ArrowDownUp className="w-3.5 h-3.5 text-[#B8956A]" />
          <span>
            {sortOrder === 'newest'
              ? 'Сначала новые по дате'
              : 'Сначала старые по дате'}
          </span>
        </button>

        <button
          type="button"
          onClick={onCreateProject}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#1F1D1A] text-[#FAF8F5] hover:bg-[#332F2A] transition-colors whitespace-nowrap cursor-pointer"
        >
          <FolderPlus className="w-3.5 h-3.5 text-[#B8956A]" />
          <span>Новый проект</span>
        </button>

        {isViewingArchived ? (
          <button
            type="button"
            onClick={() => onRestoreProject(selectedProject.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#4E735D]/40 bg-[#EEF3F0] text-[#4E735D] hover:bg-[#E1ECE5] transition-colors whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Вернуть в работу</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onArchiveProject(selectedProject.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-[#E6DFD5] bg-white text-[#4A453E] hover:border-[#C46D5E] hover:text-[#C46D5E] transition-colors whitespace-nowrap cursor-pointer"
          >
            <Archive className="w-3.5 h-3.5" />
            <span>Завершить проект</span>
          </button>
        )}
      </div>
    </section>
  );
};
