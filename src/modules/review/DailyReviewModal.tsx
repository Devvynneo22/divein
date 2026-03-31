import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { format, addDays } from 'date-fns';
import { X, ChevronRight, ChevronLeft, Save, BookOpen, Zap } from 'lucide-react';
import { useTasks } from '@/modules/tasks/hooks/useTasks';
import { useTodayStatus } from '@/modules/habits/hooks/useHabits';
import { useTimerStore } from '@/shared/stores/timerStore';
import { useTotalDueToday } from '@/modules/flashcards/hooks/useFlashcards';
import { useNotes } from '@/modules/notes/hooks/useNotes';
import { useEvents } from '@/modules/calendar/hooks/useEvents';
import { useDailyReviewStore, type DailyReviewEntry } from '@/shared/stores/dailyReviewStore';
import { noteService } from '@/shared/lib/noteService';
import { useQueryClient } from '@tanstack/react-query';
import { useCreateTask } from '@/modules/tasks/hooks/useTasks';

// ─── Types ─────────────────────────────────────────────────────────────────────

type MoodValue = 1 | 2 | 3 | 4 | 5;

const MOOD_EMOJIS: Record<MoodValue, { emoji: string; label: string; color: string }> = {
  1: { emoji: '😫', label: 'Exhausted', color: 'var(--color-danger)' },
  2: { emoji: '😕', label: 'Struggling', color: 'var(--color-warning)' },
  3: { emoji: '😐', label: 'Okay', color: 'var(--color-text-muted)' },
  4: { emoji: '🙂', label: 'Good', color: 'var(--color-accent)' },
  5: { emoji: '😄', label: 'Amazing', color: 'var(--color-success)' },
};

const TOTAL_STEPS = 6;

// ─── Confetti ──────────────────────────────────────────────────────────────────

function ConfettiBlast() {
  const particles = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => ({
      id: i,
      emoji: ['🎉', '✨', '🌟', '🎊', '💫', '🚀', '💪', '🔥'][i % 8],
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 0.6}s`,
      duration: `${0.8 + Math.random() * 0.6}s`,
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(-80px) rotate(0deg) scale(0.5); opacity: 1; }
          70%  { opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg) scale(1.2); opacity: 0; }
        }
      `}</style>
      {particles.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            top: 0,
            left: p.left,
            fontSize: '24px',
            animation: `confetti-fall ${p.duration} ${p.delay} ease-in forwards`,
          }}
        >
          {p.emoji}
        </div>
      ))}
    </div>
  );
}

// ─── Progress Ring ─────────────────────────────────────────────────────────────

function ProgressRing({ pct, size = 44, color = 'var(--color-accent)' }: { pct: number; size?: number; color?: string }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(pct, 100) / 100) * circ;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-border)" strokeWidth={5} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ emoji, label, value, subValue, pct, color }: {
  emoji: string;
  label: string;
  value: string | number;
  subValue?: string;
  pct: number;
  color: string;
}) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2"
      style={{
        backgroundColor: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        flex: '1 1 0',
        minWidth: 0,
      }}
    >
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 22 }}>{emoji}</span>
        <ProgressRing pct={pct} size={40} color={color} />
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.1, color: 'var(--color-text-primary)' }}>
        {value}
      </div>
      {subValue && (
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: -4 }}>
          {subValue}
        </div>
      )}
      <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 500 }}>
        {label}
      </div>
    </div>
  );
}

// ─── Step Dots ─────────────────────────────────────────────────────────────────

function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            width: i === step ? 20 : 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: i <= step ? 'var(--color-accent)' : 'var(--color-border)',
            transition: 'all 0.3s ease',
          }}
        />
      ))}
    </div>
  );
}

// ─── Main Modal ────────────────────────────────────────────────────────────────

export function DailyReviewModal() {
  const { isOpen, closeModal, addReview, getStreak, hasReviewedToday } = useDailyReviewStore();
  const queryClient = useQueryClient();

  // Step state
  const [step, setStep] = useState(0);
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('left');
  const [animKey, setAnimKey] = useState(0);

  // Form values
  const [wentWell, setWentWell] = useState('');
  const [toImprove, setToImprove] = useState('');
  const [tomorrowFocus, setTomorrowFocus] = useState('');
  const [moodNotes, setMoodNotes] = useState('');
  const [mood, setMood] = useState<MoodValue | null>(null);
  const [createJournalNote, setCreateJournalNote] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [newTaskInput, setNewTaskInput] = useState('');

  // Data hooks
  const { data: allTasks } = useTasks();
  const { data: todayHabits } = useTodayStatus();
  const { data: dueCards } = useTotalDueToday();
  const { data: notes } = useNotes();
  const timerStore = useTimerStore();
  const createTask = useCreateTask();

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const tomorrow = addDays(today, 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const { data: tomorrowEvents } = useEvents(tomorrowStr, tomorrowStr);

  // Compute stats
  const stats = useMemo(() => {
    const completedToday = (allTasks ?? []).filter(
      (t) => t.status === 'done' && t.completedAt?.startsWith(todayStr),
    );
    const totalTasks = (allTasks ?? []).filter(
      (t) => t.status !== 'cancelled' && (t.dueDate?.startsWith(todayStr) || t.status === 'done' || t.status === 'in_progress'),
    );

    const habitsCompleted = (todayHabits ?? []).filter((h) => h.isCompletedToday).length;
    const habitsTotal = (todayHabits ?? []).length;

    const todayNotesCreated = (notes ?? []).filter(
      (n) => n.createdAt?.startsWith(todayStr),
    ).length;

    // Focus minutes from timer today — use timerService synchronously
    // We'll use pomodoroCount × workMin as an approximation
    const focusMinutes = timerStore.pomodoroCount * timerStore.settings.workMin;

    return {
      tasksCompleted: completedToday.length,
      tasksTotal: Math.max(totalTasks.length, completedToday.length),
      habitsCompleted,
      habitsTotal,
      focusMinutes,
      cardsStudied: dueCards ?? 0,
      notesCreated: todayNotesCreated,
    };
  }, [allTasks, todayHabits, dueCards, notes, timerStore, todayStr]);

  // Productivity score
  const productivityScore = useMemo(() => {
    const tasksPct = stats.tasksTotal > 0 ? stats.tasksCompleted / stats.tasksTotal : 0;
    const habitsPct = stats.habitsTotal > 0 ? stats.habitsCompleted / stats.habitsTotal : 0;
    const focusPct = Math.min(stats.focusMinutes / 120, 1); // 2h = 100%
    const studyPct = stats.cardsStudied > 0 ? Math.min(stats.cardsStudied / 20, 1) : 0;
    const notesBonus = Math.min(stats.notesCreated / 3, 1);

    const score = (tasksPct * 0.35) + (habitsPct * 0.25) + (focusPct * 0.2) + (studyPct * 0.1) + (notesBonus * 0.1);
    return Math.round(score * 100);
  }, [stats]);

  const motivationalLine = useMemo(() => {
    if (productivityScore >= 70) return 'Productive day! 🚀';
    if (productivityScore >= 40) return 'Steady progress 💪';
    return "Tomorrow's a new day 🌅";
  }, [productivityScore]);

  // Overdue tasks and missed habits for step 3 prompts
  const overdueItems = useMemo(() => {
    const overdueTasks = (allTasks ?? []).filter(
      (t) => t.status !== 'done' && t.status !== 'cancelled' && t.dueDate && t.dueDate < todayStr,
    );
    const missedHabits = (todayHabits ?? []).filter((h) => !h.isCompletedToday);
    return { overdueTasks, missedHabits };
  }, [allTasks, todayHabits, todayStr]);

  // Completed tasks for step 2 prompt
  const completedTasks = useMemo(() => {
    return (allTasks ?? []).filter(
      (t) => t.status === 'done' && t.completedAt?.startsWith(todayStr),
    );
  }, [allTasks, todayStr]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStep(0);
      setWentWell('');
      setToImprove('');
      setTomorrowFocus('');
      setMoodNotes('');
      setMood(null);
      setCreateJournalNote(false);
      setSaved(false);
      setShowConfetti(false);
      setNewTaskInput('');
    }
  }, [isOpen]);

  // Keyboard handler
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { closeModal(); return; }
      if (e.key === 'Enter' && !e.shiftKey) {
        const active = document.activeElement as HTMLElement;
        const tag = active?.tagName?.toLowerCase();
        if (tag === 'textarea') return; // let Enter be a newline in textareas
        e.preventDefault();
        if (step < TOTAL_STEPS - 1) navigate('next');
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, step]); // eslint-disable-line react-hooks/exhaustive-deps

  const navigate = useCallback((dir: 'next' | 'prev') => {
    setSlideDir(dir === 'next' ? 'left' : 'right');
    setAnimKey((k) => k + 1);
    setStep((s) => dir === 'next' ? Math.min(s + 1, TOTAL_STEPS - 1) : Math.max(s - 1, 0));
  }, []);

  const handleSave = useCallback(async () => {
    const entry: DailyReviewEntry = {
      date: todayStr,
      completedAt: new Date().toISOString(),
      mood: mood ?? 3,
      wentWell,
      toImprove,
      tomorrowFocus,
      productivityScore,
      stats,
    };

    addReview(entry);

    if (createJournalNote) {
      const content = buildJournalMarkdown(entry, moodNotes, stats, productivityScore);
      try {
        await noteService.create({
          title: `Daily Review — ${format(today, 'MMMM d, yyyy')}`,
          content,
          icon: '📝',
        });
        void queryClient.invalidateQueries({ queryKey: ['notes'] });
      } catch {
        // best effort
      }
    }

    setSaved(true);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 2500);
  }, [todayStr, mood, wentWell, toImprove, tomorrowFocus, productivityScore, stats, createJournalNote, moodNotes, addReview, queryClient, today]);

  const handleCreateTomorrowTask = useCallback(async () => {
    if (!newTaskInput.trim()) return;
    await createTask.mutateAsync({
      title: newTaskInput.trim(),
      dueDate: tomorrowStr,
      status: 'todo',
    });
    setNewTaskInput('');
  }, [newTaskInput, tomorrowStr, createTask]);

  const handleAutofillWentWell = useCallback(() => {
    if (completedTasks.length > 0) {
      const bullets = completedTasks
        .slice(0, 5)
        .map((t) => `• ${t.title}`)
        .join('\n');
      setWentWell((prev) => (prev ? prev + '\n' + bullets : bullets));
    }
  }, [completedTasks]);

  if (!isOpen) return null;

  const streak = getStreak();
  const alreadyReviewed = hasReviewedToday();

  const focusH = Math.floor(stats.focusMinutes / 60);
  const focusM = stats.focusMinutes % 60;
  const focusDisplay = focusH > 0 ? `${focusH}h ${focusM}m` : `${focusM}m`;

  return (
    <>
      {showConfetti && <ConfettiBlast />}

      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100]"
        style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
        onClick={closeModal}
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-[101] flex items-center justify-center p-4"
        style={{ pointerEvents: 'none' }}
      >
        <div
          className="relative w-full rounded-2xl overflow-hidden flex flex-col"
          style={{
            maxWidth: 640,
            maxHeight: '90vh',
            backgroundColor: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.3)',
            pointerEvents: 'auto',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4 shrink-0"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <div className="flex items-center gap-3">
              <span style={{ fontSize: 20 }}>📝</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  Daily Review
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  {format(today, 'EEEE, MMMM d')}
                  {alreadyReviewed && !saved && (
                    <span style={{ marginLeft: 8, color: 'var(--color-warning)' }}>
                      ⚠ Already reviewed today
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={closeModal}
              className="rounded-lg p-1.5"
              style={{ color: 'var(--color-text-muted)', cursor: 'pointer' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                e.currentTarget.style.color = 'var(--color-text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'var(--color-text-muted)';
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Content area with animation */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <style>{`
              @keyframes slide-in-left {
                from { transform: translateX(48px); opacity: 0; }
                to   { transform: translateX(0);    opacity: 1; }
              }
              @keyframes slide-in-right {
                from { transform: translateX(-48px); opacity: 0; }
                to   { transform: translateX(0);     opacity: 1; }
              }
              .slide-left  { animation: slide-in-left  0.28s ease; }
              .slide-right { animation: slide-in-right 0.28s ease; }
            `}</style>

            <div
              key={animKey}
              className={slideDir === 'left' ? 'slide-left' : 'slide-right'}
              style={{ padding: '32px 40px' }}
            >
              {step === 0 && (
                <StepRecap
                  stats={stats}
                  productivityScore={productivityScore}
                  motivationalLine={motivationalLine}
                  focusDisplay={focusDisplay}
                />
              )}
              {step === 1 && (
                <StepWentWell
                  value={wentWell}
                  onChange={setWentWell}
                  onAutofill={handleAutofillWentWell}
                  canAutofill={completedTasks.length > 0}
                />
              )}
              {step === 2 && (
                <StepToImprove
                  value={toImprove}
                  onChange={setToImprove}
                  overdueTasks={overdueItems.overdueTasks}
                  missedHabits={overdueItems.missedHabits}
                />
              )}
              {step === 3 && (
                <StepTomorrowFocus
                  value={tomorrowFocus}
                  onChange={setTomorrowFocus}
                  tomorrowEvents={tomorrowEvents ?? []}
                  newTaskInput={newTaskInput}
                  onNewTaskInputChange={setNewTaskInput}
                  onCreateTask={handleCreateTomorrowTask}
                  isCreatingTask={createTask.isPending}
                />
              )}
              {step === 4 && (
                <StepMoodCheck
                  mood={mood}
                  onMoodSelect={setMood}
                  notes={moodNotes}
                  onNotesChange={setMoodNotes}
                />
              )}
              {step === 5 && (
                <StepSummary
                  stats={stats}
                  productivityScore={productivityScore}
                  mood={mood}
                  wentWell={wentWell}
                  toImprove={toImprove}
                  tomorrowFocus={tomorrowFocus}
                  createJournalNote={createJournalNote}
                  onToggleJournal={() => setCreateJournalNote((v) => !v)}
                  onSave={handleSave}
                  saved={saved}
                  streak={streak}
                  focusDisplay={focusDisplay}
                />
              )}
            </div>
          </div>

          {/* Footer navigation */}
          <div
            className="flex items-center justify-between px-6 py-4 shrink-0"
            style={{ borderTop: '1px solid var(--color-border)' }}
          >
            <StepDots step={step} total={TOTAL_STEPS} />

            <div className="flex items-center gap-2">
              {step > 0 && (
                <button
                  onClick={() => navigate('prev')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
                  style={{
                    color: 'var(--color-text-secondary)',
                    border: '1px solid var(--color-border)',
                    cursor: 'pointer',
                    backgroundColor: 'transparent',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <ChevronLeft size={16} />
                  Back
                </button>
              )}

              {step < TOTAL_STEPS - 1 ? (
                <button
                  onClick={() => navigate('next')}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold"
                  style={{
                    backgroundColor: 'var(--color-accent)',
                    color: '#fff',
                    cursor: 'pointer',
                    border: 'none',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent)'; }}
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              ) : (
                !saved && (
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold"
                    style={{
                      backgroundColor: 'var(--color-success)',
                      color: '#fff',
                      cursor: 'pointer',
                      border: 'none',
                    }}
                  >
                    <Save size={16} />
                    Save Review
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Step 1: Recap ─────────────────────────────────────────────────────────────

function StepRecap({ stats, productivityScore, motivationalLine, focusDisplay }: {
  stats: DailyReviewEntry['stats'];
  productivityScore: number;
  motivationalLine: string;
  focusDisplay: string;
}) {
  const tasksPct = stats.tasksTotal > 0 ? (stats.tasksCompleted / stats.tasksTotal) * 100 : 0;
  const habitsPct = stats.habitsTotal > 0 ? (stats.habitsCompleted / stats.habitsTotal) * 100 : 0;
  const focusPct = Math.min((stats.focusMinutes / 120) * 100, 100);
  const cardsPct = Math.min((stats.cardsStudied / 20) * 100, 100);

  const scoreColor = productivityScore >= 70 ? 'var(--color-success)'
    : productivityScore >= 40 ? 'var(--color-warning)'
    : 'var(--color-danger)';

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <div
        className="rounded-xl p-6 text-center"
        style={{
          background: 'linear-gradient(135deg, var(--color-accent-soft), var(--color-accent-muted))',
          border: '1px solid var(--color-accent-soft)',
        }}
      >
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Today's Recap
        </div>
        <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>
          {motivationalLine}
        </div>
        <div className="flex items-center justify-center gap-3">
          <div
            className="rounded-full px-4 py-1.5 text-sm font-semibold"
            style={{ backgroundColor: scoreColor, color: '#fff' }}
          >
            {productivityScore}/100
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
            Productivity Score
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="flex gap-3 flex-wrap">
        <StatCard
          emoji="✅"
          label="Tasks Done"
          value={`${stats.tasksCompleted}/${stats.tasksTotal}`}
          pct={tasksPct}
          color="var(--color-accent)"
        />
        <StatCard
          emoji="🎯"
          label="Habits"
          value={`${stats.habitsCompleted}/${stats.habitsTotal}`}
          pct={habitsPct}
          color="var(--color-success)"
        />
        <StatCard
          emoji="⏱"
          label="Focus Time"
          value={focusDisplay}
          subValue={`${stats.focusMinutes}m total`}
          pct={focusPct}
          color="var(--color-warning)"
        />
        <StatCard
          emoji="🧠"
          label="Cards Studied"
          value={stats.cardsStudied}
          pct={cardsPct}
          color="#a78bfa"
        />
      </div>

      {stats.notesCreated > 0 && (
        <div
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm"
          style={{
            backgroundColor: 'var(--color-accent-soft)',
            border: '1px solid var(--color-accent-soft)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <BookOpen size={15} style={{ color: 'var(--color-accent)' }} />
          Created {stats.notesCreated} note{stats.notesCreated > 1 ? 's' : ''} today
        </div>
      )}
    </div>
  );
}

// ─── Step 2: Went Well ─────────────────────────────────────────────────────────

function StepWentWell({ value, onChange, onAutofill, canAutofill }: {
  value: string;
  onChange: (v: string) => void;
  onAutofill: () => void;
  canAutofill: boolean;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 6 }}>
          What went well today? ✨
        </div>
        <div style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
          Celebrate your wins, big and small.
        </div>
      </div>

      <div
        className="rounded-xl p-5"
        style={{
          background: 'linear-gradient(135deg, var(--color-success-soft), var(--color-accent-soft))',
          border: '1px solid var(--color-border)',
        }}
      >
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="I completed my morning routine, finished the big report, helped a colleague..."
          rows={6}
          className="w-full bg-transparent resize-none outline-none text-sm"
          style={{
            color: 'var(--color-text-primary)',
            lineHeight: '1.7',
            fontFamily: 'inherit',
          }}
          autoFocus
        />
      </div>

      {canAutofill && (
        <button
          onClick={onAutofill}
          className="flex items-center gap-2 text-sm rounded-lg px-3 py-2 self-start"
          style={{
            color: 'var(--color-accent)',
            backgroundColor: 'var(--color-accent-soft)',
            border: '1px solid var(--color-accent-soft)',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent-muted)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-accent-soft)'; }}
        >
          <Zap size={14} />
          Auto-fill from completed tasks
        </button>
      )}
    </div>
  );
}

// ─── Step 3: To Improve ────────────────────────────────────────────────────────

function StepToImprove({ value, onChange, overdueTasks, missedHabits }: {
  value: string;
  onChange: (v: string) => void;
  overdueTasks: Array<{ id: string; title: string }>;
  missedHabits: Array<{ id: string; name: string }>;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 6 }}>
          What could be better? 🔍
        </div>
        <div style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
          Honest reflection drives real growth.
        </div>
      </div>

      <div
        className="rounded-xl p-5"
        style={{
          backgroundColor: 'var(--color-bg-tertiary)',
          border: '1px solid var(--color-border)',
        }}
      >
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="I got distracted often, didn't exercise, left some tasks unfinished..."
          rows={5}
          className="w-full bg-transparent resize-none outline-none text-sm"
          style={{
            color: 'var(--color-text-primary)',
            lineHeight: '1.7',
            fontFamily: 'inherit',
          }}
          autoFocus
        />
      </div>

      {(overdueTasks.length > 0 || missedHabits.length > 0) && (
        <div
          className="rounded-xl p-4 flex flex-col gap-3"
          style={{
            backgroundColor: 'var(--color-warning-soft)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Gentle reminders
          </div>
          {overdueTasks.slice(0, 3).map((t) => (
            <div key={t.id} className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <span style={{ color: 'var(--color-warning)' }}>⚠</span> {t.title}
            </div>
          ))}
          {missedHabits.slice(0, 3).map((h) => (
            <div key={h.id} className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <span style={{ color: 'var(--color-text-muted)' }}>○</span> {h.name} — missed today
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Step 4: Tomorrow's Focus ──────────────────────────────────────────────────

function StepTomorrowFocus({ value, onChange, tomorrowEvents, newTaskInput, onNewTaskInputChange, onCreateTask, isCreatingTask }: {
  value: string;
  onChange: (v: string) => void;
  tomorrowEvents: Array<{ id: string; title: string; startTime?: string }>;
  newTaskInput: string;
  onNewTaskInputChange: (v: string) => void;
  onCreateTask: () => void;
  isCreatingTask: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 6 }}>
          Tomorrow's focus 🎯
        </div>
        <div style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
          What's your #1 priority for tomorrow?
        </div>
      </div>

      <div
        className="rounded-xl p-5"
        style={{
          backgroundColor: 'var(--color-bg-tertiary)',
          border: '1px solid var(--color-border)',
        }}
      >
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Finish the presentation, have the 1:1 with my manager, go for a run..."
          rows={4}
          className="w-full bg-transparent resize-none outline-none text-sm"
          style={{
            color: 'var(--color-text-primary)',
            lineHeight: '1.7',
            fontFamily: 'inherit',
          }}
          autoFocus
        />
      </div>

      {/* Quick task create */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={newTaskInput}
          onChange={(e) => onNewTaskInputChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onCreateTask(); } }}
          placeholder="Quick add task for tomorrow..."
          className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
          style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
        />
        <button
          onClick={onCreateTask}
          disabled={!newTaskInput.trim() || isCreatingTask}
          className="px-3 py-2 rounded-lg text-sm font-medium"
          style={{
            backgroundColor: newTaskInput.trim() ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
            color: newTaskInput.trim() ? '#fff' : 'var(--color-text-muted)',
            border: '1px solid var(--color-border)',
            cursor: newTaskInput.trim() ? 'pointer' : 'default',
          }}
        >
          + Add
        </button>
      </div>

      {tomorrowEvents.length > 0 && (
        <div className="flex flex-col gap-2">
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Tomorrow's schedule
          </div>
          {tomorrowEvents.slice(0, 4).map((evt) => (
            <div key={evt.id} className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <span style={{ color: '#f472b6' }}>📅</span>
              {evt.title}
              {evt.startTime && (
                <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>
                  {format(new Date(evt.startTime), 'h:mm a')}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Step 5: Mood Check ────────────────────────────────────────────────────────

function StepMoodCheck({ mood, onMoodSelect, notes, onNotesChange }: {
  mood: MoodValue | null;
  onMoodSelect: (m: MoodValue) => void;
  notes: string;
  onNotesChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 6 }}>
          How are you feeling? 💭
        </div>
        <div style={{ fontSize: 14, color: 'var(--color-text-secondary)' }}>
          Pick the emoji that best describes today.
        </div>
      </div>

      <div className="flex justify-center gap-3 flex-wrap">
        {([1, 2, 3, 4, 5] as MoodValue[]).map((m) => {
          const info = MOOD_EMOJIS[m];
          const selected = mood === m;
          return (
            <button
              key={m}
              onClick={() => onMoodSelect(m)}
              className="flex flex-col items-center gap-1.5 rounded-xl p-4"
              style={{
                cursor: 'pointer',
                border: selected ? `2px solid ${info.color}` : '2px solid var(--color-border)',
                backgroundColor: selected ? `color-mix(in srgb, ${info.color} 15%, transparent)` : 'var(--color-bg-tertiary)',
                transform: selected ? 'scale(1.12)' : 'scale(1)',
                transition: 'all 0.2s ease',
                minWidth: 72,
              }}
              onMouseEnter={(e) => {
                if (!selected) e.currentTarget.style.transform = 'scale(1.06)';
              }}
              onMouseLeave={(e) => {
                if (!selected) e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <span style={{ fontSize: 32 }}>{info.emoji}</span>
              <span style={{ fontSize: 11, color: selected ? info.color : 'var(--color-text-muted)', fontWeight: selected ? 600 : 400 }}>
                {info.label}
              </span>
            </button>
          );
        })}
      </div>

      <div
        className="rounded-xl p-5"
        style={{
          backgroundColor: 'var(--color-bg-tertiary)',
          border: '1px solid var(--color-border)',
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 8 }}>
          Any notes? (optional)
        </div>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="One thing on my mind..."
          rows={2}
          className="w-full bg-transparent resize-none outline-none text-sm"
          style={{
            color: 'var(--color-text-primary)',
            lineHeight: '1.7',
            fontFamily: 'inherit',
          }}
        />
      </div>
    </div>
  );
}

// ─── Step 6: Summary ──────────────────────────────────────────────────────────

function StepSummary({ stats, productivityScore, mood, wentWell, toImprove, tomorrowFocus, createJournalNote, onToggleJournal, onSave, saved, streak, focusDisplay }: {
  stats: DailyReviewEntry['stats'];
  productivityScore: number;
  mood: MoodValue | null;
  wentWell: string;
  toImprove: string;
  tomorrowFocus: string;
  createJournalNote: boolean;
  onToggleJournal: () => void;
  onSave: () => void;
  saved: boolean;
  streak: number;
  focusDisplay: string;
}) {
  const scoreColor = productivityScore >= 70 ? 'var(--color-success)'
    : productivityScore >= 40 ? 'var(--color-warning)'
    : 'var(--color-danger)';

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8">
        <div style={{ fontSize: 64 }}>🎉</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text-primary)', textAlign: 'center' }}>
          Review saved!
        </div>
        {streak > 0 && (
          <div
            className="flex items-center gap-2 rounded-full px-5 py-2"
            style={{
              backgroundColor: 'var(--color-warning-soft)',
              border: '1px solid var(--color-border)',
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--color-text-primary)',
            }}
          >
            🔥 {streak}-day review streak!
          </div>
        )}
        <div style={{ fontSize: 14, color: 'var(--color-text-muted)', textAlign: 'center' }}>
          Keep up the reflection habit.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)' }}>
        Review Summary 📋
      </div>

      {/* Score + mood row */}
      <div className="flex gap-3">
        <div
          className="rounded-xl p-4 flex-1 flex flex-col items-center gap-1"
          style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}
        >
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Score</div>
          <div style={{ fontSize: 32, fontWeight: 700, color: scoreColor }}>{productivityScore}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>/ 100</div>
        </div>
        {mood && (
          <div
            className="rounded-xl p-4 flex-1 flex flex-col items-center gap-1"
            style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}
          >
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Mood</div>
            <div style={{ fontSize: 32 }}>{MOOD_EMOJIS[mood].emoji}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{MOOD_EMOJIS[mood].label}</div>
          </div>
        )}
        <div
          className="rounded-xl p-4 flex-1 flex flex-col items-center gap-1"
          style={{ backgroundColor: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)' }}
        >
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Focus</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--color-text-primary)' }}>{focusDisplay}</div>
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{stats.tasksCompleted}/{stats.tasksTotal} tasks</div>
        </div>
      </div>

      {/* Reflections preview */}
      {(wentWell || toImprove || tomorrowFocus) && (
        <div className="flex flex-col gap-2">
          {wentWell && (
            <SummaryLine icon="✨" label="Went well" text={wentWell} />
          )}
          {toImprove && (
            <SummaryLine icon="🔍" label="To improve" text={toImprove} />
          )}
          {tomorrowFocus && (
            <SummaryLine icon="🎯" label="Tomorrow" text={tomorrowFocus} />
          )}
        </div>
      )}

      {/* Journal toggle */}
      <div
        className="flex items-center justify-between rounded-xl p-4"
        style={{
          backgroundColor: createJournalNote ? 'var(--color-accent-soft)' : 'var(--color-bg-tertiary)',
          border: `1px solid ${createJournalNote ? 'var(--color-accent-soft)' : 'var(--color-border)'}`,
          transition: 'all 0.2s ease',
        }}
      >
        <div className="flex items-center gap-3">
          <BookOpen size={16} style={{ color: createJournalNote ? 'var(--color-accent)' : 'var(--color-text-muted)' }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-primary)' }}>
              Create Journal Note
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              Save review to Notes as a daily log
            </div>
          </div>
        </div>
        <button
          onClick={onToggleJournal}
          className="rounded-full"
          style={{
            width: 36,
            height: 20,
            backgroundColor: createJournalNote ? 'var(--color-accent)' : 'var(--color-border)',
            cursor: 'pointer',
            border: 'none',
            position: 'relative',
            transition: 'background-color 0.2s ease',
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: 2,
              left: createJournalNote ? 18 : 2,
              width: 16,
              height: 16,
              borderRadius: '50%',
              backgroundColor: '#fff',
              transition: 'left 0.2s ease',
            }}
          />
        </button>
      </div>

      {streak > 0 && (
        <div
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium"
          style={{
            backgroundColor: 'var(--color-warning-soft)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
        >
          🔥 {streak}-day review streak — keep it going!
        </div>
      )}
    </div>
  );
}

function SummaryLine({ icon, label, text }: { icon: string; label: string; text: string }) {
  return (
    <div
      className="rounded-lg px-4 py-3"
      style={{
        backgroundColor: 'var(--color-bg-tertiary)',
        border: '1px solid var(--color-border)',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
        {text.length > 120 ? text.slice(0, 120) + '…' : text}
      </div>
    </div>
  );
}

// ─── Journal Markdown Builder ──────────────────────────────────────────────────

function buildJournalMarkdown(
  entry: DailyReviewEntry,
  moodNotes: string,
  stats: DailyReviewEntry['stats'],
  productivityScore: number,
): string {
  const moodInfo = MOOD_EMOJIS[entry.mood];
  const lines: string[] = [
    `# Daily Review — ${entry.date}`,
    '',
    `**Mood:** ${moodInfo.emoji} ${moodInfo.label}${moodNotes ? `  \n*${moodNotes}*` : ''}`,
    `**Productivity Score:** ${productivityScore}/100`,
    '',
    `## Stats`,
    `- ✅ Tasks: ${stats.tasksCompleted}/${stats.tasksTotal} completed`,
    `- 🎯 Habits: ${stats.habitsCompleted}/${stats.habitsTotal} completed`,
    `- ⏱ Focus: ${stats.focusMinutes} minutes`,
    `- 🧠 Cards studied: ${stats.cardsStudied}`,
    stats.notesCreated > 0 ? `- 📝 Notes created: ${stats.notesCreated}` : '',
    '',
  ];

  if (entry.wentWell) {
    lines.push(`## What Went Well ✨`, '', entry.wentWell, '');
  }
  if (entry.toImprove) {
    lines.push(`## What Could Be Better 🔍`, '', entry.toImprove, '');
  }
  if (entry.tomorrowFocus) {
    lines.push(`## Tomorrow's Focus 🎯`, '', entry.tomorrowFocus, '');
  }

  lines.push(`---`, `*Completed at ${new Date(entry.completedAt).toLocaleTimeString()}*`);

  return lines.filter((l) => l !== undefined).join('\n');
}
