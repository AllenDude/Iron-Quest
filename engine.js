// ============================================================
// ENGINE — XP/leveling, progressive overload, quests, achievements
// ============================================================

const Engine = {
  events: [], // toast/log messages accumulated during a session, drained by UI

  log(msg, kind = "info") {
    this.events.push({ msg, kind, t: Date.now() });
  },

  drainEvents() {
    const e = this.events;
    this.events = [];
    return e;
  },

  // ---------------- XP / Leveling ----------------
  awardXP(amount) {
    if (amount <= 0) return;
    const p = Store.state.profile;
    const mult = Store.state.settings.hardcoreMode ? XP_RULES.hardcoreMultiplier : 1;
    const finalAmount = Math.round(amount * mult);
    p.xp += finalAmount;
    p.totalXP += finalAmount;
    let leveledUp = false;
    while (p.xp >= xpForLevel(p.level)) {
      p.xp -= xpForLevel(p.level);
      p.level += 1;
      leveledUp = true;
      const newTitle = titleForLevel(p.level);
      this.log(`Level up! You are now level ${p.level} — ${newTitle}`, "levelup");
      this.checkLevelAchievements(p.level);
    }
    return { finalAmount, leveledUp };
  },

  checkLevelAchievements(level) {
    const milestones = [[5, "level_5"], [10, "level_10"], [25, "level_25"], [50, "level_50"]];
    for (const [lvl, id] of milestones) {
      if (level >= lvl) this.unlockAchievement(id);
    }
    if (titleForLevel(level) === "Legend") this.unlockAchievement("legendary_rank");
  },

  unlockAchievement(id) {
    if (Store.state.achievements[id]) return false;
    Store.state.achievements[id] = Date.now();
    const def = ACHIEVEMENTS.find(a => a.id === id);
    this.log(`Achievement unlocked: ${def ? def.name : id}`, "achievement");
    return true;
  },

  // ---------------- Streak ----------------
  registerWorkoutDay(dateISO) {
    const p = Store.state.profile;
    if (p.lastWorkoutDate === dateISO) return; // already counted today
    const hardcore = Store.state.settings.hardcoreMode;
    if (p.lastWorkoutDate) {
      const diffDays = Math.round((new Date(dateISO) - new Date(p.lastWorkoutDate)) / 86400000);
      if (diffDays === 1) {
        p.streak += 1;
      } else if (diffDays > 1) {
        // hardcore: any miss resets; normal: allow a single rest day gap (diff===2) without reset
        if (hardcore || diffDays > 2) {
          p.streak = 1;
        } else {
          p.streak += 1;
        }
      }
      // diffDays === 0 handled by early return above
    } else {
      p.streak = 1;
    }
    p.lastWorkoutDate = dateISO;
    p.longestStreak = Math.max(p.longestStreak, p.streak);

    const streakMilestones = [[3, "streak_3"], [7, "streak_7"], [30, "streak_30"], [100, "streak_100"]];
    for (const [n, id] of streakMilestones) if (p.streak >= n) this.unlockAchievement(id);
  },

  // ---------------- Progressive overload ----------------
  // Call after logging all sets for an exercise in a session.
  // setLogs: array of {reps or seconds, perSide?, isTop (bool, hit target ceiling)}
  evaluateProgression(exerciseId, exerciseDef, sessionSets) {
    const ex = Store.getExercise(exerciseId);
    const suggestions = [];

    if (exerciseDef.kind === "reps" || exerciseDef.kind === "time") {
      const max = exerciseDef.max ?? exerciseDef.fixed;
      const allAtTop = sessionSets.length > 0 && sessionSets.every(s => (s.value ?? 0) >= max);
      if (allAtTop) {
        ex.consecutiveTopHits = (ex.consecutiveTopHits || 0) + 1;
      } else {
        ex.consecutiveTopHits = 0;
      }
      if (ex.consecutiveTopHits >= 2 && !ex.tierSuggested) {
        ex.tierSuggested = true;
        if (exerciseDef.nextTier) {
          suggestions.push(`Consistent top-range performance on ${exerciseDef.name}! Try: ${exerciseDef.nextTier.label}.`);
          this.log(`New variation unlocked: ${exerciseDef.nextTier.label}`, "unlock");
        } else {
          suggestions.push(`Consistent top-range performance on ${exerciseDef.name}! Add a slower tempo or an extra set.`);
        }
      } else if (ex.consecutiveTopHits === 1 && exerciseDef.min !== undefined) {
        // gentle nudge mid-progression: widen the window slightly for next session
      }
    }

    // failure-based: PR tracking handled separately via recordPR
    Store.save();
    return suggestions;
  },

  recordPR(exerciseId, value) {
    const ex = Store.getExercise(exerciseId);
    if (value > (ex.prValue || 0)) {
      const isFirst = !ex.prValue;
      ex.prValue = value;
      if (!isFirst) {
        this.awardXP(XP_RULES.perPR);
        this.log(`New personal record on ${exerciseId.replace(/_/g, " ")}: ${value}!`, "pr");
        this.markQuestProgress("pr_set", 1);
      }
      Store.save();
      return true;
    }
    return false;
  },

  // ---------------- Quests ----------------
  ensureQuestsFresh() {
    const q = Store.state.quests;
    const dayKey = todayISO();
    const weekKey = isoWeekKey();
    const hardcore = Store.state.settings.hardcoreMode;

    if (q.dayKey !== dayKey) {
      q.dayKey = dayKey;
      q.daily = getDailyQuestTemplates(hardcore).map(t => ({ ...t, progress: 0, complete: false }));
    }
    if (q.weekKey !== weekKey) {
      q.weekKey = weekKey;
      q.weekly = getWeeklyQuestTemplates(hardcore).map(t => ({ ...t, progress: 0, complete: false }));
    }
    Store.save();
  },

  markQuestProgress(type, amount) {
    if (!Store.state.settings.questsEnabled) return;
    this.ensureQuestsFresh();
    const q = Store.state.quests;
    for (const list of [q.daily, q.weekly]) {
      for (const quest of list) {
        if (quest.type === type && !quest.complete) {
          quest.progress += amount;
          if (quest.progress >= quest.target) {
            quest.progress = quest.target;
            quest.complete = true;
            this.awardXP(quest.xp);
            this.log(`Quest complete: ${quest.label}`, "quest");
          }
        }
      }
    }
    Store.save();
  },

  setQuestProgress(type, value) {
    if (!Store.state.settings.questsEnabled) return;
    this.ensureQuestsFresh();
    const q = Store.state.quests;
    for (const list of [q.daily, q.weekly]) {
      for (const quest of list) {
        if (quest.type === type && !quest.complete) {
          quest.progress = value;
          if (quest.progress >= quest.target) {
            quest.progress = quest.target;
            quest.complete = true;
            this.awardXP(quest.xp);
            this.log(`Quest complete: ${quest.label}`, "quest");
          }
        }
      }
    }
    Store.save();
  },

  // ---------------- Achievements bulk checks (after workout) ----------------
  checkPostWorkoutAchievements() {
    const stats = Store.state.stats;
    if (stats.totalWorkouts === 1) this.unlockAchievement("first_workout");
    const workoutMilestones = [[10, "workouts_10"], [50, "workouts_50"], [200, "workouts_200"]];
    for (const [n, id] of workoutMilestones) if (stats.totalWorkouts >= n) this.unlockAchievement(id);

    const pushupTotal = PUSHUP_FAMILY.reduce((s, id) => s + (stats.repsByExercise[id] || 0), 0);
    if (pushupTotal >= 500) this.unlockAchievement("pushups_500");
    if (pushupTotal >= 5000) this.unlockAchievement("pushups_5000");

    const pullupTotal = PULLUP_FAMILY.reduce((s, id) => s + (stats.repsByExercise[id] || 0), 0);
    if (pullupTotal >= 250) this.unlockAchievement("pullups_250");
    if (pullupTotal >= 2500) this.unlockAchievement("pullups_2500");
  },
};
