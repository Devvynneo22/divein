import { useState, useCallback } from 'react';
import { FolderKanban, Plus, ArrowLeft, Eye, EyeOff } from 'lucide-react';
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
import type { CreateProjectInput, UpdateProjectInput, Project } from '@/shared/types/project';

// ─── Tab types ────────────────────────────────────────────────────────────────

type ProjectTab = 'overview' | 'tasks' | 'board' | 'notes' | 'activity';

const TABS: { key: ProjectTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'board', label: 'Board' },
  { key: 'notes', label: 'Notes' },
  { key: 'activity', label: 'Activity' },
];

// ─── Side panel mode ─────────────────────────────────────────────────────────

type PanelMode = 'create' | 'edit';

interface PanelState {
  mode: PanelMode;
  project?: Project;
}

// ─── ProjectCardWithStats — loads its own stats so hooks are called at top-level ──

interface ProjectCardWithStatsProps {
  project: Project;
  onClick: () => void;
}

function ProjectCardWithStats({ project, onClick }: ProjectCardWithStatsProps) {
  const { data: stats } = useProjectStats(project.id);
  return <ProjectCard project={project} stats={stats} onClick={onClick} />;
}

// ─── Project View ─────────────────────────────────────────────────────────────

interface ProjectViewProps {
  projectId: string;
  onBack: () => void;
  onEdit: (project: Project) => void;
}

function ProjectView({ projectId, onBack, onEdit }: ProjectViewProps) {
  const [activeTab, setActiveTab] = useState<ProjectTab>('overview');
  const { data: project } = useProject(projectId);
  const { data: stats } = useProjectStats(projectId);
  const { data: tasks = [] } = useProjectTasks(projectId);
  const { data: notes = [] } = useProjectNotes(projectId);
  const { data: allEntries = [] } = useQuery({
    queryKey: ['timerEntries'],
    queryFn: () => timerService.listEntries(),
  });

  const archiveProject = useArchiveProject();
  const unarchiveProject = useUnarchiveProject();
  const deleteProject = useDeleteProject();

  const projectEntries = allEntries.filter((e) => e.projectId === projectId);
  const accentColor = project?.color ?? 'var(--color-accent)';

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-[var(--color-text-muted)] text-sm">Loading project…</span>
      </div>
    );
  }

  function handleDelete() {
    deleteProject.mutate(projectId, { onSuccess: onBack });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Back navigation */}
      <div className="px-6 pt-4 pb-0 flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors mb-3"
        >
          <ArrowLeft size={15} />
          All Projects
        </button>
      </div>

      {/* Project header */}
      <div className="flex-shrink-0 border-b border-[var(--color-border)]">
        <ProjectHeader
          project={project}
          onEdit={() => onEdit(project)}
          onArchive={() => archiveProject.mutate(projectId)}
          onUnarchive={() => unarchiveProject.mutate(projectId)}
          onDelete={handleDelete}
        />

        {/* Tabs */}
        <div className="flex gap-0 px-6">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? 'text-[var(--color-text-primary)] border-[var(--color-accent)]'
                  : 'text-[var(--color-text-muted)] border-transparent hover:text-[var(--color-text-secondary)]'
              }`}
            >
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
  const [panel, setPanel] = useState<PanelState | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const { data: projects = [], isLoading } = useProjects(showArchived);
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const qc = useQueryClient();

  // Stats are loaded per-card inside ProjectCardWithStats below

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

  // Project view mode
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

        {/* Edit panel */}
        {panel && (
          <div className="w-80 border-l border-[var(--color-border)] flex flex-col h-full overflow-y-auto">
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

  // Browser mode
  return (
    <div className="flex h-full">
      {/* Main browser */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <FolderKanban size={20} className="text-[var(--color-accent)]" />
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Projects</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowArchived((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-muted)] text-sm hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors"
                title={showArchived ? 'Hide archived' : 'Show archived'}
              >
                {showArchived ? <EyeOff size={14} /> : <Eye size={14} />}
                {showArchived ? 'Hide archived' : 'Show archived'}
              </button>
              <button
                onClick={() => setPanel({ mode: 'create' })}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium transition-colors"
              >
                <Plus size={16} />
                New Project
              </button>
            </div>
          </div>
          <p className="text-sm text-[var(--color-text-muted)]">
            Organize your work into projects
          </p>
        </div>

        {/* Project grid */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {isLoading ? (
            <div className="text-center py-12 text-[var(--color-text-muted)] text-sm">
              Loading…
            </div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
              <div className="text-5xl">📁</div>
              <div>
                <p className="text-[var(--color-text-secondary)] font-medium text-lg">
                  No projects yet
                </p>
                <p className="text-[var(--color-text-muted)] text-sm mt-1 max-w-xs">
                  Projects help you organize tasks, notes, and time entries in one place.
                </p>
              </div>
              <button
                onClick={() => setPanel({ mode: 'create' })}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-sm font-medium transition-colors"
              >
                <Plus size={16} />
                Create your first project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {projects.map((project) => (
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

      {/* Side panel (create / edit) */}
      {panel && (
        <div className="w-80 border-l border-[var(--color-border)] flex flex-col h-full overflow-y-auto">
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
