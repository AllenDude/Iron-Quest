// ============================================================
// STORE — single source of truth, persisted to localStorage
// ============================================================

const STORAGE_KEY = "workoutRpgState_v1";

function todayISO(d = new Date()) {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function isoWeekKey(d = new Date()) {
  // Monday-anchored week key, e.g. "2026-W29"
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = (date.getUTCDay() + 6) % 7; // 0 = Monday
  date.setUTCDate(date.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((date - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${date.getUTCFullYear()}-W${week}`;
}

function defaultState() {
  return {
    version: 1,
    profile: {
      level: 1,
      xp: 0,
      totalXP: 0,
      streak: 0,
      longestStreak: 0,
      lastWorkoutDate: null,
    },
    settings: {
      theme: "dark",
      restTimerDefault: 60,
      soundEnabled: true,
      vibrationEnabled: true,
      questsEnabled: true,
      hardcoreMode: false,
      warmupCooldownEnabled: true,
    },
    exercises: {}, // id -> { history: [{date, sets:[...], prValue}], prValue, currentMin, currentMax, consecutiveTopHits, tierSuggested }
    workoutHistory: [], // { date, dayId, xpEarned, durationSec, notes, exercisesLogged, perfect }
    quests: {
      dayKey: null,
      weekKey: null,
      daily: [],
      weekly: [],
    },
    achievements: {}, // id -> timestamp unlocked
    stats: {
      totalReps: 0,
      totalWorkouts: 0,
      repsByExercise: {},
    },
  };
}

function mergeDefaults(target, defaults) {
  for (const k in defaults) {
    if (typeof defaults[k] === "object" && defaults[k] !== null && !Array.isArray(defaults[k])) {
      target[k] = target[k] && typeof target[k] === "object" ? target[k] : {};
      mergeDefaults(target[k], defaults[k]);
    } else if (!(k in target)) {
      target[k] = defaults[k];
    }
  }
  return target;
}

const Store = {
  state: null,

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      this.state = raw ? mergeDefaults(JSON.parse(raw), defaultState()) : defaultState();
    } catch (e) {
      console.error("Failed to load state, resetting.", e);
      this.state = defaultState();
    }
    return this.state;
  },

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error("Failed to save state", e);
    }
  },

  reset() {
    this.state = defaultState();
    this.save();
  },

  exportJSON() {
    return JSON.stringify(this.state, null, 2);
  },

  importJSON(json) {
    const parsed = JSON.parse(json);
    this.state = mergeDefaults(parsed, defaultState());
    this.save();
  },

  getExercise(id) {
    if (!this.state.exercises[id]) {
      this.state.exercises[id] = {
        history: [],
        prValue: 0,
        consecutiveTopHits: 0,
        tierSuggested: false,
      };
    }
    return this.state.exercises[id];
  },
};
