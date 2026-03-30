import { useState, useCallback, useMemo } from 'react';
import { LoadingSpinner } from '@/app/LoadingSpinner';
import {
  FolderKanban, Plus, ArrowLeft, Eye, EyeOff, Search, X,
  LayoutGrid, SlidersHorizontal,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useProjects,
  useProject,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useArchiveProject,
  useUnarchiveProject,
  useProjectStats,
  useProjectTasks,
  useProjectNotes,
} from './hooks/useProjects';
import { timerService } from '@/shared/lib/timerService';
import { ProjectCard } from './components/ProjectCard';
import { ProjectForm } from './components/ProjectForm';
import { ProjectHeader } from './components/ProjectHeader';
import { ProjectOverview } from './components/ProjectOverview';
import { ProjectTaskList } from './components/ProjectTaskList';
import { ProjectNoteList } from './components/ProjectNoteList';
import { ProjectActivity } from './components/ProjectActivity';
import { KanbanBoard } from './components/KanbanBoard';
import type { CreateProjectInput, UpdateProjectInput, Project, ProjectStatus } from '@/shared/types/project';

// ─── Tab types ────────────────────────────────────────────────────────────────

type ProjectTab = 'overview' | 'tasks' | 'board' | 'notes' | 'activity';

const TABS: { key: ProjectTab; label: string; emoji: string }[] = [
  { key: 'overview',  label: 'Overview',  emoji: '📊' },
  { key: 'tasks',     label: 'Tasks',     emoji: '✅' },
  { key: 'board',     label: 'Board',     emoji: '📋' },
  { key: 'notes',     label: 'Notes',     emoji: '📝' },
  { key: 'activity',  label: 'Activity',  emoji: '⏱' },
];

// ─── Panel state ─────────────────────────────────────────────────────────────

type PanelMode = 'create' | 'edit';
interface PanelState { mode: PanelMode; project?: Project }

// ─── Status filter options ────────────────────────────────────────────────────

type StatusFilterOption = 'all' | ProjectStatus;

const STATUS_FILTER_OPTIONS: { key: StatusFilterOption; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'active',    label: 'Active' },
  { key: 'on_hold',   label: 'On Hold' },
  { key: 'completed', label: 'Completed' },
];

// ─── ProjectCardWithStats ────────────────────────────────────────────────────

function ProjectCardWithStats({ project, onClick }: { project: Project; onClick: () => void }) {
  const { data: stats } = useProjectStats(project.id);
  return <ProjectCard project={project} stats={stats} onClick={onClick} />;
}

// ─── Project detail view ─────────────────────────────────────────────────────

interface ProjectViewProps {
  projectId: string;
  onBack: () => void;
  onEdit: (project: Project) => void;
}

function ProjectView({ projectId, onBack, onEdit }: ProjectViewProps) {
  const [activeTab, setActiveTab] = useState<ProjectTab>('overview');
  const { data: project }        = useProject(projectId);
  const { data: stats }          = useProjectStats(projectId);
  const { data: tasks = [] }     = useProjectTasks(projectId);
  const { data: notes = [] }     = useProjectNotes(projectId);
  const { data: allEntries = [] } = useQuery({
    queryKey: ['timerEntries'],
    queryFn: () => timerService.listEntries(),
  });

  const archiveProject   = useArchiveProject();
  const unarchiveProject = useUnarchiveProject();
  const deleteProject    = useDeleteProject();

  const projectEntries = allEntries.filter((e) => e.projectId === projectId);
  const accentColor = project?.color ?? 'var(--color-accent)';

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner text="Loading project…" />
      </div>
    );
  }

  function handleDelete() {
    deleteProject.mutate(projectId, { onSuccess: onBack });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Back nav */}
      <div className="px-6 pt-4 pb-0 flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm transition-colors mb-3"
          style={{ color: 'var(--color-text-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; }}
        >
          <ArrowLeft size={15} />
          All Projects
        </button>
      </div>

      {/* Header */}
      <div className="flex-shrink-0 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <ProjectHeader
          project={project}
          onEdit={() => onEdit(project)}
          onArchive={() => archiveProject.mutate(projectId)}
          onUnarchive={() => unarchiveProject.mutate(projectId)}
          onDelete={handleDelete}
        />

        {/* Tab navigation */}
        <div className="flex gap-0 px-6">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px"
              style={{
                color: activeTab === tab.key ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                borderBottomColor: activeTab === tab.key ? accentColor : 'transparent',
              }}
              onMouseEnter={(e) => { if (activeTab !== tab.key) e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
              onMouseLeave={(e) => { if (activeTab !== tab.key) e.currentTarget.style.color = 'var(--color-text-muted)'; }}
            >
              <span className="text-xs">{tab.emoji}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {activeTab === 'overview' && stats && (
          <ProjectOverview
            projectId={projectId}
            stats={stats}
            tasks={tasks}
            notes={notes}
            timeEntries={projectEntries}
            accentColor={accentColor}
          />
        )}
        {activeTab === 'tasks' && (
          <ProjectTaskList projectId={projectId} tasks={tasks} />
        )}
        {activeTab === 'board' && (
          <KanbanBoard projectId={projectId} tasks={tasks} />
        )}
        {activeTab === 'notes' && (
          <ProjectNoteList projectId={projectId} notes={notes} />
        )}
        {activeTab === 'activity' && (
          <ProjectActivity timeEntries={projectEntries} accentColor={accentColor} />
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function ProjectsPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [panel, setPanel]           = useState<PanelState | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery]   = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>('all');

  const { data: projects = [], isLoading } = useProjects(showArchived);
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const qc = useQueryClient();

  const filteredProjects = useMemo(() => {
    let list = projects;
    if (statusFilter !== 'all') {
      list = list.filter((p) => p.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [projects, statusFilter, searchQuery]);

  const handleSave = useCallback(
    (data: CreateProjectInput | UpdateProjectInput) => {
      if (panel?.mode === 'edit' && panel.project) {
        updateProject.mutate(
          { id: panel.project.id, data: data as UpdateProjectInput },
          { onSuccess: () => setPanel(null) },
        );
      } else {
        createProject.mutate(data as CreateProjectInput, {
          onSuccess: () => setPanel(null),
        });
      }
    },
    [panel, createProject, updateProject],
  );

  // Project detail view
  if (selectedProjectId) {
    return (
      <div className="flex h-full">
        <div className="flex-1 min-w-0">
          <ProjectView
            projectId={selectedProjectId}
            onBack={() => {
              setSelectedProjectId(null);
              qc.invalidateQueries({ queryKey: ['projects'] });
            }}
            onEdit={(project) => setPanel({ mode: 'edit', project })}
          />
        </div>

        {/* Edit side panel */}
        {panel && (
          <div
            className="w-80 border-l flex flex-col h-full overflow-y-auto"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <div className="p-6">
              <ProjectForm
                project={panel.mode === 'edit' ? panel.project : undefined}
                onSave={handleSave}
                onCancel={() => setPanel(null)}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // Project list / browser
  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col min-w-0">

        {/* Page header */}
        <div className="px-6 pt-6 pb-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-accent-soft)' }}
              >
                <FolderKanban size={16} style={{ color: 'var(--color-accent)' }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold leading-tight" style={{ color: 'var(--color-text-primary)' }}>
                  Projects
                </h1>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {projects.length} project{projects.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowArchived((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-colors"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
                title={showArchived ? 'Hide archived' : 'Show archived'}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                  e.currentTarget.style.color = 'var(--color-text-secondary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--color-text-muted)';
                }}
              >
                {showArchived ? <EyeOff size={14} /> : <Eye size={14} />}
                {showArchived ? 'Hide archived' : 'Archived'}
              </button>

              <button
                onClick={() => setPanel({ mode: 'create' })}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150"
                style={{ backgroundColor: 'var(--color-accent)', color: '#fff', boxShadow: 'var(--shadow-sm)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-accent)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <Plus size={16} />
                New Project
              </button>
            </div>
          </div>

          {/* Search + Status filter bar */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--color-text-muted)' }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects…"
                className="w-full pl-9 pr-8 py-2 rounded-xl text-sm focus:outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Status filter chips */}
            <div className="flex items-center gap-1">
              <SlidersHorizontal size={13} style={{ color: 'var(--color-text-muted)' }} />
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setStatusFilter(opt.key)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150"
                  style={{
                    backgroundColor:
                      statusFilter === opt.key
                        ? 'var(--color-accent)'
                        : 'var(--color-bg-secondary)',
                    color:
                      statusFilter === opt.key
                        ? '#fff'
                        : 'var(--color-text-muted)',
                    border: `1px solid ${statusFilter === opt.key ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Project grid */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <LoadingSpinner text="Loading projects…" />
            </div>
          ) : filteredProjects.length === 0 ? (
            <EmptyState
              hasProjects={projects.length > 0}
              hasSearch={!!searchQuery.trim()}
              onClear={() => { setSearchQuery(''); setStatusFilter('all'); }}
              onCreate={() => setPanel({ mode: 'create' })}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((project) => (
                <ProjectCardWithStats
                  key={project.id}
                  project={project}
                  onClick={() => setSelectedProjectId(project.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create / edit side panel */}
      {panel && (
        <div
          className="w-80 border-l flex flex-col h-full overflow-y-auto"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="p-6">
            <ProjectForm
              project={panel.mode === 'edit' ? panel.project : undefined}
              onSave={handleSave}
              onCancel={() => setPanel(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState({
  hasProjects,
  hasSearch,
  onClear,
  onCreate,
}: {
  hasProjects: boolean;
  hasSearch: boolean;
  onClear: () => void;
  onCreate: () => void;
}) {
  if (hasSearch || hasProjects) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: 'var(--color-bg-secondary)' }}
        >
          <Search size={28} style={{ color: 'var(--color-text-muted)', opacity: 0.5 }} />
        </div>
        <div>
          <p className="font-semibold text-base" style={{ color: 'var(--color-text-secondary)' }}>
            No matching projects
          </p>
          <p className="text-sm mt-1 max-w-xs" style={{ color: 'var(--color-text-muted)' }}>
            Try a different search term or filter
          </p>
        </div>
        <button
          onClick={onClear}
          className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
          style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          Clear filters
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
      <div className="text-6xl">🗂️</div>
      <div>
        <p className="font-bold text-xl" style={{ color: 'var(--color-text-secondary)' }}>
          No projects yet
        </p>
        <p className="text-sm mt-2 max-w-sm leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          Projects help you organize tasks, notes, and time entries in one place.
          Create your first project to get started.
        </p>
      </div>
      <button
        onClick={onCreate}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-150"
        style={{ backgroundColor: 'var(--color-accent)', color: '#fff', boxShadow: 'var(--shadow-md)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)';
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--color-accent)';
          e.currentTarget.style.transform = 'none';
          e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        }}
      >
        <Plus size={18} />
        Create your first project
      </button>
    </div>
  );
}
