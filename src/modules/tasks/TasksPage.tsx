import { useState } from 'react';
import { Plus, Inbox, CheckCircle2, Circle, Clock, XCircle } from 'lucide-react';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from './hooks/useTasks';
import { TaskItem } from './components/TaskItem';
import { TaskDetail } from './components/TaskDetail';
import type { Task, TaskStatus } from '@/shared/types/task';

const STATUS_TABS: { key: TaskStatus | 'all'; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { key: 'all', label: 'All', icon: Circle },
  { key: 'inbox', label: 'Inbox', icon: Inbox },
  { key: 'todo', label: 'Todo', icon: Circle },
  { key: 'in_progress', label: 'In Progress', icon: Clock },
  { key: 'done', label: 'Done', icon: CheckCircle2 },
  { key: 'cancelled', label: 'Cancelled', icon: XCircle },
];

export function TasksPage() {
  const [activeTab, setActiveTab] = useState<TaskStatus | 'all'>('all');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const filter = activeTab === 'all' ? undefined : { status: activeTab as TaskStatus };
  const { data: tasks = [], isLoading } = useTasks(filter);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;

  function handleQuickAdd(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && newTaskTitle.trim()) {
      createTask.mutate({ title: newTaskTitle.trim() });
      setNewTaskTitle('');
    }
  }

  function handleStatusChange(id: string, status: TaskStatus) {
    updateTask.mutate({ id, data: { status } });
  }

  function handleDelete(id: string) {
    if (selectedTaskId === id) setSelectedTaskId(null);
    deleteTask.mutate(id);
  }

  return (
    <div className="flex h-full">
      {/* Task list */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <h1 className="text-2xl font-bold mb-4">Tasks</h1>

          {/* Quick add */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex-1 relative">
              <Plus size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={handleQuickAdd}
                placeholder="Add a task... (press Enter)"
                className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
              />
            </div>
          </div>

          {/* Status tabs */}
          <div className="flex gap-1 overflow-x-auto">
            {STATUS_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)]'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Task list */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {isLoading ? (
            <div className="text-center py-12 text-[var(--color-text-muted)] text-sm">Loading...</div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12 text-[var(--color-text-muted)] text-sm">
              {activeTab === 'all' ? 'No tasks yet. Add one above!' : `No ${activeTab.replace('_', ' ')} tasks.`}
            </div>
          ) : (
            <div className="space-y-1">
              {tasks.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  isSelected={task.id === selectedTaskId}
                  onSelect={() => setSelectedTaskId(task.id === selectedTaskId ? null : task.id)}
                  onStatusChange={(status) => handleStatusChange(task.id, status)}
                  onDelete={() => handleDelete(task.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selectedTask && (
        <TaskDetail
          task={selectedTask}
          onUpdate={(data) => updateTask.mutate({ id: selectedTask.id, data })}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </div>
  );
}
