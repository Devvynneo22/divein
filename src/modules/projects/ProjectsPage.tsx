import { useState, useCallback, useMemo, useEffect } from 'react';
import { toast } from '@/shared/stores/toastStore';
import { LoadingSpinner } from '@/app/LoadingSpinner';
import { SkeletonCard } from '@/shared/components/Skeleton';
import {
  FolderKanban, Plus, ArrowLeft, Eye, EyeOff,
  Search, X, LayoutGrid, List, ChevronDown, Wand2, Folder,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useProjects, useProject, useCreateProject, useUpdateProject,
  useDeleteProject, useArchiveProject, useUnarchiveProject,
  useProjectStats, useProjectTasks, useProjectNotes,
} from './hooks/useProjects';
import { timerService } from '@/shared/lib/timerService';
import { ProjectCard, ProjectListRow } from './components/ProjectCard';
import { ProjectForm, TemplatePicker } from './components/ProjectForm';
import { EmptyState } from '@/shared/components/EmptyState';
import type { ProjectTemplate } from './components/ProjectForm';
import { ProjectHeader } from './components/ProjectHeader';
import { ProjectOverview } from './components/ProjectOverview';
import { ProjectTaskList } from './components/ProjectTaskList';
import { ProjectNoteList } from './components/ProjectNoteList';
import { ProjectActivity } from './components/ProjectActivity';
import { KanbanBoard } from './components/KanbanBoard';
import type { CreateProjectInput, UpdateProjectInput, Project, ProjectStatus } from '@/shared/types/project';

// ─── localStorage ─────────────────────────────────────────────────────────────
const LS_LAYOUT = 'divein-projects-layout';
const LS_SORT   = 'divein-projects-sort';
const LS_PINNED = 'divein-pinned-projects';

function readLS<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v !== null ? JSON.parse(v) as T : fallback; }
  catch { return fallback; }
}
function writeLS<T>(key: string, value: T) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* noop */ }
}

// ─── Types ────────────────────────────────────────────────────────────────────
type ProjectTab = 'overview' | 'tasks' | 'board' | 'notes' | 'activity';
const TABS: { key: ProjectTab; label: string; emoji: string }[] = [
  { key: 'overview', label: 'Overview', emoji: '📊' },
  { key: 'tasks',    label: 'Tasks',    emoji: '✅' },
  { key: 'board',    label: 'Board',    emoji: '📋' },
  { key: 'notes',    label: 'Notes',    emoji: '📝' },
  { key: 'activity', label: 'Activity', emoji: '⏱' },
];

type SortOption = 'newest' | 'oldest' | 'name-az' | 'recently-updated';
const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'newest',           label: 'Newest' },
  { key: 'oldest',           label: 'Oldest' },
  { key: 'name-az',          label: 'Name A–Z' },
  { key: 'recently-updated', label: 'Updated' },
];

type StatusFilter = 'all' | ProjectStatus;
const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'active',    label: 'Active' },
  { key: 'on_hold',   label: 'On Hold' },
  { key: 'completed', label: 'Completed' },
];

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    return () => document.removeEventListener('keydown', fn);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{
          background: 'var(--color-bg-primary)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.25)',
          maxHeight: 'calc(100vh - 80px)',
          overflowY: 'auto',
        }}
      >
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

type ModalMode = 'create' | 'edit' | 'template-picker' | 'template-form';
interface ModalState { mode: ModalMode; project?: Project; template?: ProjectTemplate }

// ─── Card with stats ──────────────────────────────────────────────────────────
function ProjectCardWithStats({ project, layout, pinned, onTogglePin, onClick }: {
  project: Project; layout: 'grid' | 'list';
  pinned: boolean; onTogglePin: (id: string) => void; onClick: () => void;
}) {
  const { data: stats } = useProjectStats(project.id);
  return layout === 'list'
    ? <ProjectListRow project={project} stats={stats} onClick={onClick} pinned={pinned} onTogglePin={onTogglePin} />
    : <ProjectCard project={project} stats={stats} onClick={onClick} pinned={pinned} onTogglePin={onTogglePin} />;
}

// ─── Project detail ───────────────────────────────────────────────────────────
function ProjectView({ projectId, onBack, onEdit }: { projectId: string; onBack: () => void; onEdit: (p: Project) => void }) {
  const [activeTab, setActiveTab]   = useState<ProjectTab>('overview');
  const { data: project }           = useProject(projectId);
  const { data: stats }             = useProjectStats(projectId);
  const { data: tasks = [] }        = useProjectTasks(projectId);
  const { data: notes = [] }        = useProjectNotes(projectId);
  const { data: allEntries = [] }   = useQuery({ queryKey: ['timerEntries'], queryFn: () => timerService.listEntries() });
  const archiveProject              = useArchiveProject();
  const unarchiveProject            = useUnarchiveProject();
  const deleteProject               = useDeleteProject();
  const projectEntries              = allEntries.filter((e) => e.projectId === projectId);
  const accentColor                 = project?.color ?? 'var(--color-accent)';

  if (!project) return <div className="flex items-center justify-center h-full"><LoadingSpinner text="Loading…" /></div>;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 pt-4 pb-0 flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-medium transition-colors mb-2"
          style={{ color: 'var(--color-text-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
        >
          <ArrowLeft size={13} /> All Projects
        </button>
      </div>
      <div className="flex-shrink-0 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <ProjectHeader
          project={project} stats={stats}
          onEdit={() => onEdit(project)}
          onArchive={() => archiveProject.mutate(projectId, { onSuccess: () => toast.info('Project archived') })}
          onUnarchive={() => unarchiveProject.mutate(projectId)}
          onDelete={() => deleteProject.mutate(projectId, { onSuccess: onBack })}
          onTabSelect={(tab) => setActiveTab(tab as ProjectTab)}
        />
        <div className="flex px-6 overflow-x-auto" style={{ gap: 0 }}>
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-all duration-200 border-b-2 -mb-px whitespace-nowrap flex-shrink-0"
                style={{ color: active ? 'var(--color-text-primary)' : 'var(--color-text-muted)', borderBottomColor: active ? accentColor : 'transparent' }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = 'var(--color-text-muted)'; }}
              >
                <span className="text-xs">{tab.emoji}</span>{tab.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {activeTab === 'overview' && stats && <ProjectOverview projectId={projectId} stats={stats} tasks={tasks} notes={notes} timeEntries={projectEntries} accentColor={accentColor} />}
        {activeTab === 'tasks'    && <ProjectTaskList projectId={projectId} tasks={tasks} />}
        {activeTab === 'board'    && <KanbanBoard projectId={projectId} tasks={tasks} />}
        {activeTab === 'notes'    && <ProjectNoteList projectId={projectId} notes={notes} />}
        {activeTab === 'activity' && <ProjectActivity timeEntries={projectEntries} accentColor={accentColor} />}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function ProjectsPage() {
  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [modal, setModal]               = useState<ModalState | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [layout, setLayout]             = useState<'grid' | 'list'>(() => readLS<'grid' | 'list'>(LS_LAYOUT, 'grid'));
  const [sort, setSort]                 = useState<SortOption>(() => readLS<SortOption>(LS_SORT, 'newest'));
  const [pinnedIds, setPinnedIds]       = useState<string[]>(() => readLS<string[]>(LS_PINNED, []));
  const [sortOpen, setSortOpen]         = useState(false);

  const { data: projects = [], isLoading } = useProjects(showArchived);
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const qc = useQueryClient();

  useEffect(() => { writeLS(LS_LAYOUT, layout); }, [layout]);
  useEffect(() => { writeLS(LS_SORT, sort); }, [sort]);
  useEffect(() => { writeLS(LS_PINNED, pinnedIds); }, [pinnedIds]);

  const togglePin = (id: string) =>
    setPinnedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { all: projects.length, active: 0, on_hold: 0, completed: 0 };
    for (const p of projects) if (p.status in c) c[p.status]++;
    return c;
  }, [projects]);

  const filtered = useMemo(() => {
    let list = projects;
    if (statusFilter !== 'all') list = list.filter((p) => p.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q));
    }
    return list;
  }, [projects, statusFilter, search]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    switch (sort) {
      case 'oldest':           return list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      case 'name-az':          return list.sort((a, b) => a.name.localeCompare(b.name));
      case 'recently-updated': return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      default:                 return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
  }, [filtered, sort]);

  const pinnedProjects  = sorted.filter((p) => pinnedIds.includes(p.id));
  const regularProjects = sorted.filter((p) => !pinnedIds.includes(p.id));

  const handleSave = useCallback(
    (data: CreateProjectInput | UpdateProjectInput) => {
      if (modal?.mode === 'edit' && modal.project) {
        updateProject.mutate(
          { id: modal.project.id, data: data as UpdateProjectInput },
          {
            onSuccess: () => {
              setModal(null);
              toast.success('Changes saved');
            },
          },
        );
      } else {
        createProject.mutate(data as CreateProjectInput, {
          onSuccess: () => {
            setModal(null);
            toast.success('Project created ✓');
          },
        });
      }
    },
    [modal, createProject, updateProject],
  );

  if (selectedId) {
    return (
      <>
        <div className="flex h-full">
          <div className="flex-1 min-w-0">
            <ProjectView projectId={selectedId}
              onBack={() => { setSelectedId(null); qc.invalidateQueries({ queryKey: ['projects'] }); }}
              onEdit={(project) => setModal({ mode: 'edit', project })}
            />
          </div>
        </div>
        {modal?.mode === 'edit' && (
          <Modal onClose={() => setModal(null)}>
            <ProjectForm project={modal.project} onSave={handleSave} onCancel={() => setModal(null)} />
          </Modal>
        )}
      </>
    );
  }

  // ── Browser ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full" onClick={() => sortOpen && setSortOpen(false)}>

      {/* ── Top bar ── */}
      <div
        className="flex-shrink-0 flex items-center gap-3 px-6 py-3"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        {/* Icon + title */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
          >
            <Folder size={15} style={{ color: '#fff' }} />
          </div>
          <div>
            <h1 className="text-base font-bold leading-none" style={{ color: 'var(--color-text-primary)' }}>
              Projects
            </h1>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
              {projects.length} project{projects.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="w-px h-6 flex-shrink-0" style={{ backgroundColor: 'var(--color-border)' }} />

        {/* Search */}
        <div className="relative flex-shrink-0" style={{ width: '200px' }}>
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects…"
            className="w-full py-1.5 text-xs focus:outline-none transition-all"
            style={{
              paddingLeft: '30px',
              paddingRight: search ? '28px' : '10px',
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: '8px',
              color: 'var(--color-text-primary)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-accent)';
              e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-accent-soft)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <X size={11} />
            </button>
          )}
        </div>

        {/* Status filter tabs */}
        <div className="flex items-center flex-shrink-0" style={{ gap: '2px' }}>
          {STATUS_FILTERS.map((opt) => {
            const active = statusFilter === opt.key;
            const count  = statusCounts[opt.key] ?? 0;
            return (
              <button
                key={opt.key}
                onClick={() => setStatusFilter(opt.key)}
                className="flex items-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all duration-150"
                style={{
                  background: active ? 'var(--color-accent)' : 'transparent',
                  color: active ? '#fff' : 'var(--color-text-muted)',
                  border: active ? 'none' : '1px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'var(--color-bg-secondary)';
                    e.currentTarget.style.color = 'var(--color-text-secondary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--color-text-muted)';
                  }
                }}
              >
                {opt.label}
                {count > 0 && (
                  <span
                    className="text-[10px] font-bold tabular-nums rounded-full px-1.5 py-px"
                    style={{
                      background: active ? 'rgba(255,255,255,0.22)' : 'var(--color-bg-tertiary)',
                      color: active ? '#fff' : 'var(--color-text-muted)',
                      minWidth: '18px',
                      textAlign: 'center',
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Sort */}
        <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setSortOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
              background: sortOpen ? 'var(--color-bg-secondary)' : 'transparent',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-secondary)'; }}
            onMouseLeave={(e) => { if (!sortOpen) e.currentTarget.style.background = 'transparent'; }}
          >
            {SORT_OPTIONS.find((s) => s.key === sort)?.label}
            <ChevronDown size={11} style={{ transform: sortOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }} />
          </button>
          {sortOpen && (
            <div
              className="absolute right-0 top-full mt-1 rounded-xl overflow-hidden z-40 py-1"
              style={{ minWidth: '160px', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-popup)' }}
            >
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => { setSort(opt.key); setSortOpen(false); }}
                  className="w-full text-left px-4 py-2 text-xs transition-colors"
                  style={{ color: sort === opt.key ? 'var(--color-accent)' : 'var(--color-text-secondary)', fontWeight: sort === opt.key ? 600 : 400 }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-tertiary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Layout toggle */}
        <div
          className="flex items-center rounded-lg overflow-hidden flex-shrink-0"
          style={{ border: '1px solid var(--color-border)' }}
        >
          {(['grid', 'list'] as const).map((key) => {
            const active = layout === key;
            const Icon = key === 'grid' ? LayoutGrid : List;
            return (
              <button
                key={key}
                onClick={() => setLayout(key)}
                className="p-1.5 transition-all"
                style={{ background: active ? 'var(--color-accent)' : 'transparent', color: active ? '#fff' : 'var(--color-text-muted)' }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--color-bg-secondary)'; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                <Icon size={14} />
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="w-px h-6 flex-shrink-0" style={{ backgroundColor: 'var(--color-border)' }} />

        {/* Archived */}
        <button
          onClick={() => setShowArchived((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0"
          style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', background: showArchived ? 'var(--color-bg-secondary)' : 'transparent' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-secondary)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
          onMouseLeave={(e) => { if (!showArchived) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; } }}
        >
          {showArchived ? <EyeOff size={13} /> : <Eye size={13} />}
          {showArchived ? 'Hide' : 'Archived'}
        </button>

        {/* Templates */}
        <button
          onClick={() => setModal({ mode: 'template-picker' })}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0"
          style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', background: 'transparent' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-secondary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <Wand2 size={13} />
          Templates
        </button>

        {/* New Project CTA */}
        <button
          onClick={() => setModal({ mode: 'create' })}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', boxShadow: '0 2px 12px rgba(99,102,241,0.35)' }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(99,102,241,0.5)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(99,102,241,0.35)'; e.currentTarget.style.transform = 'none'; }}
        >
          <Plus size={13} />
          New Project
        </button>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 6 }, (_, i) => (
              <SkeletonCard key={i} height={200} />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          (!!search.trim() || statusFilter !== 'all') ? (
            <ProjectsFilteredEmpty
              onClear={() => { setSearch(''); setStatusFilter('all'); }}
            />
          ) : (
            <EmptyState
              icon="📁"
              title="No projects yet"
              description="Create a project to organize related tasks and track progress"
              actionLabel="New Project"
              onAction={() => setModal({ mode: 'create' })}
              secondaryLabel="Use Template"
              onSecondary={() => setModal({ mode: 'template-picker' })}
            />
          )
        ) : (
          <div className="flex flex-col gap-8">
            {pinnedProjects.length > 0 && (
              <section>
                <SectionHeading icon="⭐" label="Pinned" />
                <ProjectCollection layout={layout} projects={pinnedProjects} pinnedIds={pinnedIds} onTogglePin={togglePin} onSelect={setSelectedId} />
              </section>
            )}
            {regularProjects.length > 0 && (
              <section>
                {pinnedProjects.length > 0 && <SectionHeading icon="📁" label="All Projects" />}
                <ProjectCollection layout={layout} projects={regularProjects} pinnedIds={pinnedIds} onTogglePin={togglePin} onSelect={setSelectedId} />
              </section>
            )}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {modal?.mode === 'create' && <Modal onClose={() => setModal(null)}><ProjectForm onSave={handleSave} onCancel={() => setModal(null)} /></Modal>}
      {modal?.mode === 'edit' && <Modal onClose={() => setModal(null)}><ProjectForm project={modal.project} onSave={handleSave} onCancel={() => setModal(null)} /></Modal>}
      {modal?.mode === 'template-picker' && (
        <Modal onClose={() => setModal(null)}>
          <TemplatePicker onSelect={(tmpl) => setModal({ mode: 'template-form', template: tmpl })} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {modal?.mode === 'template-form' && modal.template && (
        <Modal onClose={() => setModal(null)}>
          <ProjectForm template={modal.template} onSave={handleSave} onCancel={() => setModal(null)} />
        </Modal>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionHeading({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span style={{ fontSize: '14px' }}>{icon}</span>
      <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </h2>
    </div>
  );
}

function ProjectCollection({ layout, projects, pinnedIds, onTogglePin, onSelect }: {
  layout: 'grid' | 'list'; projects: Project[]; pinnedIds: string[];
  onTogglePin: (id: string) => void; onSelect: (id: string) => void;
}) {
  if (layout === 'list') {
    return (
      <div className="flex flex-col gap-1.5">
        {projects.map((p) => (
          <ProjectCardWithStats key={p.id} project={p} layout="list" pinned={pinnedIds.includes(p.id)} onTogglePin={onTogglePin} onClick={() => onSelect(p.id)} />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {projects.map((p) => (
        <ProjectCardWithStats key={p.id} project={p} layout="grid" pinned={pinnedIds.includes(p.id)} onTogglePin={onTogglePin} onClick={() => onSelect(p.id)} />
      ))}
    </div>
  );
}

function ProjectsFilteredEmpty({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--color-bg-secondary)' }}>
        <Search size={22} style={{ color: 'var(--color-text-muted)', opacity: 0.5 }} />
      </div>
      <div>
        <p className="font-semibold" style={{ color: 'var(--color-text-secondary)' }}>No matching projects</p>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Try a different search or filter</p>
      </div>
      <button onClick={onClear} className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-secondary)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
        Clear filters
      </button>
    </div>
  );
}
