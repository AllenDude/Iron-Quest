// ============================================================
// APP — router, rendering, session/workout logic
// ============================================================

const App = {
  root: null,
  route: "home",
  params: {},
  session: null, // active workout session (persisted separately)
  restTimer: null,

  init() {
    Store.load();
    Engine.ensureQuestsFresh();
    this.applyTheme();
    this.root = document.getElementById("app");
    this.loadSessionDraft();
    window.addEventListener("hashchange", () => this.handleHash());
    this.handleHash();
    this.renderTabbar();
  },

  applyTheme() {
    document.documentElement.setAttribute("data-theme", Store.state.settings.theme);
  },

  navigate(route, params = {}) {
    this.params = params;
    location.hash = `#/${route}`;
  },

  handleHash() {
    const hash = location.hash.replace(/^#\//, "");
    const [route, param] = hash.split("/");
    this.route = route || "home";
    if (param) this.params.dayId = param;
    this.render();
    this.renderTabbar();
    window.scrollTo(0, 0);
  },

  render() {
    const views = {
      home: () => this.renderHome(),
      train: () => this.renderTrain(),
      day: () => this.renderDayDetail(this.params.dayId),
      session: () => this.renderSession(),
      quests: () => this.renderQuests(),
      stats: () => this.renderStats(),
      exercise: () => this.renderExerciseDetail(this.params.exerciseId),
      history: () => this.renderHistory(),
      settings: () => this.renderSettings(),
    };
    (views[this.route] || views.home)();
    this.flushToasts();
  },

  renderTabbar() {
    let bar = document.getElementById("tabbar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "tabbar";
      bar.className = "tabbar";
      document.body.appendChild(bar);
    }
    const tabs = [
      { id: "home", icon: "\u2694\uFE0F", label: "Home" },
      { id: "train", icon: "\uD83C\uDFCB\uFE0F", label: "Train" },
      { id: "quests", icon: "\uD83D\uDCDC", label: "Quests" },
      { id: "stats", icon: "\uD83D\uDCCA", label: "Stats" },
      { id: "settings", icon: "\u2699\uFE0F", label: "Settings" },
    ];
    const activeRoute = ["day", "session"].includes(this.route) ? "train" : ["exercise", "history"].includes(this.route) ? "stats" : this.route;
    bar.innerHTML = tabs.map(t => `
      <button data-nav="${t.id}" class="${activeRoute === t.id ? "active" : ""}">
        <span class="icon">${t.icon}</span><span>${t.label}</span>
      </button>`).join("");
    bar.querySelectorAll("button").forEach(b => b.addEventListener("click", () => this.navigate(b.dataset.nav)));
    bar.style.display = this.route === "session" ? "none" : "flex";
  },

  // ---------------- TOASTS ----------------
  flushToasts() {
    const events = Engine.drainEvents();
    if (!events.length) return;
    let stack = document.getElementById("toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.id = "toast-stack";
      stack.className = "toast-stack";
      document.body.appendChild(stack);
    }
    for (const e of events) {
      const el = document.createElement("div");
      el.className = `toast ${e.kind}`;
      el.textContent = e.msg;
      stack.appendChild(el);
      setTimeout(() => el.remove(), 3100);
    }
    if (Store.state.settings.vibrationEnabled && navigator.vibrate) {
      navigator.vibrate(events.some(e => e.kind === "levelup") ? [40, 40, 80] : 30);
    }
  },

  // ============================================================
  // HOME
  // ============================================================
  renderHome() {
    const p = Store.state.profile;
    const need = xpForLevel(p.level);
    const pct = Math.min(100, Math.round((p.xp / need) * 100));
    const title = titleForLevel(p.level);
    Engine.ensureQuestsFresh();
    const dailyDone = Store.state.quests.daily.filter(q => q.complete).length;
    const dailyTotal = Store.state.quests.daily.length;
    const nextDayInfo = this.suggestedDayInfo();
    const hardcore = Store.state.settings.hardcoreMode;

    this.root.innerHTML = `
      <div class="topbar">
        <div class="brand"><div class="brand-mark"></div><h1>Iron&nbsp;Quest</h1></div>
        <div class="streak-chip ${p.streak >= 3 ? "hot" : ""}">🔥 ${p.streak} day${p.streak === 1 ? "" : "s"}</div>
      </div>
      ${hardcore ? `<div class="section" style="padding-bottom:0"><div class="hardcore-banner">HARDCORE MODE ACTIVE — no skipped exercises, missed days reset your streak</div></div>` : ""}
      <div class="rank-card">
        <div class="rank-row">
          <div>
            <div class="eyebrow">Rank</div>
            <div class="rank-level">LV ${p.level}</div>
            <div class="rank-title">${title}</div>
          </div>
          <div class="rank-xp-label">${p.xp} / ${need} XP<br>${p.totalXP} total</div>
        </div>
        <div class="xp-bar">
          <div class="xp-bar-fill" style="width:${pct}%"></div>
          <div class="xp-bar-notches">${"<span></span>".repeat(10)}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-head"><h2>${nextDayInfo.mode === "catchup" ? "Catch-Up Encounter" : "Today's Encounter"}</h2></div>
        ${nextDayInfo.dayId ? this.dayCardHTML(nextDayInfo.dayId, true, nextDayInfo.mode === "catchup") : `<div class="empty-state"><div class="glyph">🗓️</div>All four days complete this week. Rest up, warrior.</div>`}
      </div>

      <div class="section">
        <div class="section-head"><h2>Quests</h2><button class="link-btn" data-nav="quests">View all →</button></div>
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span>Daily quests</span>
            <span class="badge ${dailyDone === dailyTotal ? "done" : ""}">${dailyDone}/${dailyTotal}</span>
          </div>
        </div>
      </div>
    `;
    this.root.querySelectorAll("[data-nav]").forEach(el => el.addEventListener("click", () => this.navigate(el.dataset.nav)));
    this.root.querySelectorAll("[data-day]").forEach(el => el.addEventListener("click", () => this.navigate("day", { dayId: el.dataset.day })));
  },

  suggestedDay() {
    const result = this.suggestedDayInfo();
    return result.dayId;
  },

  // Weekday-aware suggestion. JS getDay(): Sun=0, Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6
  suggestedDayInfo() {
    const WEEKDAY_TO_DAYID = { 1: "mon", 2: "tue", 3: "wed", 4: "thu" };
    const weekKey = isoWeekKey();
    const doneThisWeek = new Set(Store.state.workoutHistory.filter(h => isoWeekKey(new Date(h.date)) === weekKey).map(h => h.dayId));
    const todayWeekday = new Date().getDay();
    const todaysDayId = WEEKDAY_TO_DAYID[todayWeekday];

    // 1. If today is one of the split's scheduled days and it's not done yet, suggest it.
    if (todaysDayId && !doneThisWeek.has(todaysDayId)) {
      return { dayId: todaysDayId, mode: "scheduled" };
    }
    // 2. Otherwise (today's workout already done, or today is a rest day Fri/Sat/Sun),
    //    offer to catch up on any earlier day this week that's still unfinished.
    const catchUp = DAY_ORDER.find(d => !doneThisWeek.has(d));
    if (catchUp) return { dayId: catchUp, mode: "catchup" };
    // 3. Everything done — full rest.
    return { dayId: null, mode: "rest" };
  },

  dayCardHTML(dayId, big = false, isCatchup = false) {
    const day = WORKOUT_PLAN[dayId];
    const weekKey = isoWeekKey();
    const done = Store.state.workoutHistory.some(h => h.dayId === dayId && isoWeekKey(new Date(h.date)) === weekKey);
    return `
      <div class="card pressable day-card ${done ? "done" : ""}" data-day="${dayId}">
        <div class="day-index">${done ? "✓" : DAY_ORDER.indexOf(dayId) + 1}</div>
        <div class="day-card-body">
          <div class="day-name">${day.label} · ${day.title} ${isCatchup ? `<span class="badge">catch-up</span>` : ""}</div>
          <div class="day-focus">${day.focus} · ${day.exercises.length} exercises</div>
        </div>
        <div class="chev">›</div>
      </div>`;
  },

  // ============================================================
  // TRAIN (day list)
  // ============================================================
  renderTrain() {
    this.root.innerHTML = `
      <div class="topbar"><h1>Train</h1></div>
      <div class="section">
        ${DAY_ORDER.map(d => this.dayCardHTML(d)).join("")}
      </div>
    `;
    this.root.querySelectorAll("[data-day]").forEach(el => el.addEventListener("click", () => this.navigate("day", { dayId: el.dataset.day })));
  },

  renderDayDetail(dayId) {
    const day = WORKOUT_PLAN[dayId];
    if (!day) return this.navigate("train");
    this.root.innerHTML = `
      <div class="topbar">
        <button class="link-btn" data-nav="train">← Back</button>
      </div>
      <div class="section">
        <div class="eyebrow">${day.label}</div>
        <h1>${day.title}</h1>
        <p style="color:var(--bone-dim)">${day.focus}</p>
        ${day.exercises.map(ex => `
          <div class="card">
            <div style="display:flex;justify-content:space-between;">
              <b>${ex.name}</b>
              <span class="badge">${this.exerciseSummary(ex)}</span>
            </div>
            ${ex.cue ? `<div class="day-focus" style="margin-top:4px">${ex.cue}</div>` : ""}
          </div>
        `).join("")}
        ${day.finisher ? `<div class="card"><div style="display:flex;justify-content:space-between;"><b>${day.finisher.name}</b><span class="badge">${day.finisher.sets} × ~${day.finisher.targetSeconds}s</span></div><div class="day-focus" style="margin-top:4px">${day.finisher.label}</div></div>` : ""}
        <button class="btn primary block" id="start-btn" style="margin-top:10px">Start Workout</button>
      </div>
    `;
    this.root.querySelector("[data-nav]").addEventListener("click", () => this.navigate("train"));
    this.root.querySelector("#start-btn").addEventListener("click", () => this.startSession(dayId));
  },

  exerciseSummary(ex) {
    if (ex.kind === "failure_reps") return `${ex.sets} × failure`;
    if (ex.kind === "failure_time") return `${ex.sets} × failure`;
    if (ex.kind === "choice") return `${ex.sets} × max`;
    if (ex.fixed) return `${ex.sets} × ${ex.fixed}${ex.perSide ? "/side" : ""}`;
    if (ex.kind === "time") return `${ex.sets} × ${ex.min}-${ex.max}s`;
    return `${ex.sets} × ${ex.min}-${ex.max}${ex.perSide ? "/side" : ""}`;
  },

  // ============================================================
  // SESSION (active workout)
  // ============================================================
  buildSetPlan(exerciseDef) {
    const plan = [];
    for (let i = 0; i < exerciseDef.sets; i++) {
      const isLast = i === exerciseDef.sets - 1;
      const isSecondLast = i === exerciseDef.sets - 2;
      if (exerciseDef.lastTwoSetsSpecial && (isLast || isSecondLast)) {
        plan.push({
          type: "failure_reps",
          label: `Set ${i + 1}`,
          subLabel: isSecondLast ? exerciseDef.lastTwoSetsSpecial.failureLabel : exerciseDef.lastTwoSetsSpecial.negativeLabel,
        });
        continue;
      }
      if (exerciseDef.everySetDropset) {
        plan.push({ type: "dropset", label: `Set ${i + 1}`, stages: exerciseDef.everySetDropset });
        continue;
      }
      if (exerciseDef.lastSetDropset && isLast) {
        plan.push({ type: "dropset", label: `Set ${i + 1} · Drop set`, stages: exerciseDef.lastSetDropset });
        continue;
      }
      if (exerciseDef.kind === "reps") {
        plan.push({ type: "reps", label: `Set ${i + 1}`, min: exerciseDef.min, max: exerciseDef.max, fixed: exerciseDef.fixed, perSide: exerciseDef.perSide });
      } else if (exerciseDef.kind === "time") {
        plan.push({ type: "time", label: `Set ${i + 1}`, min: exerciseDef.min, max: exerciseDef.max });
      } else if (exerciseDef.kind === "failure_reps") {
        plan.push({ type: "failure_reps", label: `Set ${i + 1}` });
      } else if (exerciseDef.kind === "failure_time") {
        plan.push({ type: "failure_time", label: `Set ${i + 1}`, targetSeconds: exerciseDef.targetSeconds });
      } else if (exerciseDef.kind === "choice") {
        plan.push({ type: "choice_reps", label: `Set ${i + 1}`, options: exerciseDef.options });
      }
    }
    return plan;
  },

  startSession(dayId) {
    const day = WORKOUT_PLAN[dayId];
    const exList = day.exercises.slice();
    if (day.finisher) exList.push({ ...day.finisher, isFinisher: true, sets: day.finisher.sets, kind: day.finisher.kind });
    this.session = {
      dayId,
      startedAt: Date.now(),
      exIndex: 0,
      exercises: exList.map(ex => ({
        def: ex,
        plan: this.buildSetPlan(ex),
        logs: [], // parallel to plan: {value, stages:[], choiceId}
      })),
      warmupDone: false,
      cooldownDone: false,
      notes: "",
    };
    this.saveSessionDraft();
    this.navigate("session");
  },

  saveSessionDraft() {
    try { localStorage.setItem("workoutRpgActiveSession", JSON.stringify(this.session)); } catch (e) {}
  },
  loadSessionDraft() {
    try {
      const raw = localStorage.getItem("workoutRpgActiveSession");
      if (raw) this.session = JSON.parse(raw);
    } catch (e) {}
  },
  clearSessionDraft() {
    localStorage.removeItem("workoutRpgActiveSession");
    this.session = null;
  },

  renderSession() {
    if (!this.session) return this.navigate("train");
    const s = this.session;
    const day = WORKOUT_PLAN[s.dayId];
    const total = s.exercises.length;
    const idx = s.exIndex;

    if (idx >= total) return this.renderSessionFinish();

    const current = s.exercises[idx];
    const def = current.def;
    const hardcore = Store.state.settings.hardcoreMode;

    const dots = s.exercises.map((e, i) => {
      const allLogged = e.logs.length === e.plan.length && e.logs.every(l => l != null);
      return `<span class="${allLogged ? "done" : i === idx ? "active" : ""}"></span>`;
    }).join("");

    this.root.innerHTML = `
      <div class="session-header">
        <button class="link-btn" id="exit-session">✕</button>
        <div class="progress-dots">${dots}</div>
        <span class="mono" style="font-size:.75rem;color:var(--bone-dim)">${idx + 1}/${total}</span>
      </div>
      <div class="exercise-block">
        <div class="eyebrow">${day.title}${def.isFinisher ? " · Finisher" : ""}</div>
        <h1>${def.name}</h1>
        ${def.cue ? `<div class="exercise-cue">${def.cue}</div>` : `<div class="exercise-cue">&nbsp;</div>`}
        <div id="sets-container"></div>
        <div class="btn-row" style="margin-top:16px">
          ${idx > 0 ? `<button class="btn" id="prev-ex">Back</button>` : ""}
          ${!hardcore ? `<button class="btn ghost" id="skip-ex">Skip</button>` : ""}
          <button class="btn primary block" id="next-ex">${idx === total - 1 ? "Review & Finish" : "Next Exercise"}</button>
        </div>
      </div>
    `;

    this.renderSetsContainer(current);

    document.getElementById("exit-session").addEventListener("click", () => {
      if (confirm("Exit workout? Your progress on this session is saved and you can resume later.")) {
        this.saveSessionDraft();
        this.navigate("train");
      }
    });
    if (idx > 0) document.getElementById("prev-ex").addEventListener("click", () => { s.exIndex--; this.saveSessionDraft(); this.render(); });
    const skipBtn = document.getElementById("skip-ex");
    if (skipBtn) skipBtn.addEventListener("click", () => { s.exIndex++; this.saveSessionDraft(); this.render(); });
    document.getElementById("next-ex").addEventListener("click", () => this.completeCurrentExercise());
  },

  renderSetsContainer(current) {
    const container = document.getElementById("sets-container");
    const { def, plan, logs } = current;
    container.innerHTML = plan.map((setDef, i) => this.setRowHTML(setDef, i, logs[i])).join("");
    // wire interactions
    plan.forEach((setDef, i) => this.wireSetRow(current, setDef, i));
  },

  setRowHTML(setDef, i, log) {
    const logged = log != null;
    if (setDef.type === "dropset") {
      const stageVals = (log && log.stages) || [];
      return `
        <div class="set-row ${logged ? "logged" : ""}" style="flex-direction:column;align-items:stretch;" data-i="${i}">
          <div class="set-label"><b>${setDef.label}</b></div>
          ${setDef.stages.map((stage, si) => `
            <div class="dropset-stage">
              <span class="stage-name">${stage.label}</span>
              <div class="stepper">
                <button data-stage="${si}" data-dir="-1">−</button>
                <input type="number" inputmode="numeric" data-stage-input="${si}" value="${stageVals[si] ?? ""}" placeholder="0">
                <button data-stage="${si}" data-dir="1">+</button>
              </div>
            </div>
          `).join("")}
        </div>`;
    }
    if (setDef.type === "choice_reps") {
      const chosen = log ? log.choiceId : null;
      const val = log ? log.value : "";
      return `
        <div class="set-row ${logged ? "logged" : ""}" style="flex-direction:column;align-items:stretch;" data-i="${i}">
          <div class="set-label"><b>${setDef.label}</b></div>
          <div class="choice-row">
            ${setDef.options.map(o => `<div class="choice-pill ${chosen === o.id ? "selected" : ""}" data-choice="${o.id}">${o.label}</div>`).join("")}
          </div>
          <div class="stepper" style="justify-content:flex-start">
            <button data-dir="-1">−</button>
            <input type="number" inputmode="numeric" data-value value="${val}" placeholder="reps">
            <button data-dir="1">+</button>
          </div>
        </div>`;
    }
    // reps / time / failure_reps / failure_time
    const val = log ? log.value : "";
    let hint = "";
    if (setDef.type === "reps") hint = setDef.fixed ? `target ${setDef.fixed}${setDef.perSide ? "/side" : ""}` : `${setDef.min}-${setDef.max}${setDef.perSide ? "/side" : ""}`;
    if (setDef.type === "time") hint = `${setDef.min}-${setDef.max}s`;
    if (setDef.type === "failure_reps") hint = "to failure";
    if (setDef.type === "failure_time") hint = setDef.targetSeconds ? `~${setDef.targetSeconds}s, to failure` : "sec, to failure";
    return `
      <div class="set-row ${logged ? "logged" : ""}" data-i="${i}">
        <div class="set-label"><b>${setDef.label}</b>${setDef.subLabel ? setDef.subLabel : ""}</div>
        <span class="target-hint">${hint}</span>
        <div class="stepper">
          <button data-dir="-1">−</button>
          <input type="number" inputmode="numeric" data-value value="${val}" placeholder="0">
          <button data-dir="1">+</button>
        </div>
      </div>`;
  },

  wireSetRow(current, setDef, i) {
    const row = document.querySelector(`[data-i="${i}"]`);
    if (!row) return;
    const commit = () => { this.saveSessionDraft(); row.classList.add("logged"); };

    if (setDef.type === "dropset") {
      setDef.stages.forEach((stage, si) => {
        const input = row.querySelector(`[data-stage-input="${si}"]`);
        const ensure = () => {
          if (!current.logs[i]) current.logs[i] = { stages: [] };
          return current.logs[i];
        };
        input.addEventListener("input", () => {
          const log = ensure();
          log.stages[si] = Number(input.value) || 0;
          commit();
        });
        row.querySelectorAll(`[data-stage="${si}"]`).forEach(btn => {
          btn.addEventListener("click", () => {
            const log = ensure();
            const dir = Number(btn.dataset.dir);
            log.stages[si] = Math.max(0, (log.stages[si] || 0) + dir);
            input.value = log.stages[si];
            commit();
          });
        });
      });
      return;
    }

    if (setDef.type === "choice_reps") {
      row.querySelectorAll("[data-choice]").forEach(pill => {
        pill.addEventListener("click", () => {
          if (!current.logs[i]) current.logs[i] = { value: 0, choiceId: null };
          current.logs[i].choiceId = pill.dataset.choice;
          row.querySelectorAll("[data-choice]").forEach(p => p.classList.remove("selected"));
          pill.classList.add("selected");
          commit();
        });
      });
    }

    const input = row.querySelector("[data-value]");
    const ensure = () => {
      if (!current.logs[i]) current.logs[i] = { value: 0 };
      return current.logs[i];
    };
    input.addEventListener("input", () => {
      const log = ensure();
      log.value = Number(input.value) || 0;
      commit();
    });
    row.querySelectorAll("[data-dir]").forEach(btn => {
      btn.addEventListener("click", () => {
        const log = ensure();
        const dir = Number(btn.dataset.dir);
        log.value = Math.max(0, (log.value || 0) + dir);
        input.value = log.value;
        commit();
      });
    });
  },

  completeCurrentExercise() {
    const s = this.session;
    const current = s.exercises[s.exIndex];
    const hardcore = Store.state.settings.hardcoreMode;
    const anyLogged = current.logs.some(l => l != null);

    if (hardcore && !current.logs.every(l => l != null)) {
      alert("Hardcore mode: log every set before continuing.");
      return;
    }

    if (anyLogged) {
      // record reps into exercise history + PR + progression
      const { def, plan, logs } = current;
      const exId = def.id;
      const ex = Store.getExercise(exId);
      let totalRepsThisExercise = 0;
      const progressionSets = [];
      let maxSingleValue = 0;

      plan.forEach((setDef, i) => {
        const log = logs[i];
        if (!log) return;
        if (setDef.type === "dropset") {
          const sum = (log.stages || []).reduce((a, b) => a + (b || 0), 0);
          totalRepsThisExercise += sum;
          maxSingleValue = Math.max(maxSingleValue, log.stages?.[0] || 0);
        } else if (setDef.type === "choice_reps") {
          totalRepsThisExercise += log.value || 0;
          maxSingleValue = Math.max(maxSingleValue, log.value || 0);
        } else {
          const mult = setDef.perSide ? 2 : 1;
          totalRepsThisExercise += (log.value || 0) * mult;
          maxSingleValue = Math.max(maxSingleValue, log.value || 0);
          if (setDef.type === "reps" || setDef.type === "time") {
            progressionSets.push({ value: log.value || 0 });
          }
        }
      });

      ex.history.push({ date: todayISO(), sets: logs, totalReps: totalRepsThisExercise });
      if (ex.history.length > 60) ex.history = ex.history.slice(-60);

      // PR: for failure-based & choice, PR = max single set value; for ranged, PR = max value achieved
      Engine.recordPR(exId, maxSingleValue);

      if (progressionSets.length && (def.kind === "reps" || def.kind === "time")) {
        Engine.evaluateProgression(exId, def, progressionSets);
      }

      Store.state.stats.repsByExercise[exId] = (Store.state.stats.repsByExercise[exId] || 0) + totalRepsThisExercise;
      Store.state.stats.totalReps += totalRepsThisExercise;

      const loggedSets = logs.filter(l => l != null).length;
      Engine.awardXP(loggedSets * XP_RULES.perSet + XP_RULES.perExerciseComplete);
      Engine.markQuestProgress("total_reps", totalRepsThisExercise);

      const hasDropset = plan.some(p => p.type === "dropset");
      if (hasDropset) {
        const allStagesFilled = plan.every(p => p.type !== "dropset" || (p.stages.every((_, si) => (current.logs[plan.indexOf(p)]?.stages?.[si] || 0) > 0)));
        current.dropsetComplete = allStagesFilled;
      }

      Store.save();
    }

    s.exIndex++;
    this.saveSessionDraft();

    // rest timer between exercises (not after the very last one)
    if (s.exIndex < s.exercises.length) {
      this.showRestTimer(() => this.render());
    } else {
      this.render();
    }
  },

  showRestTimer(onDone) {
    const seconds = Store.state.settings.restTimerDefault;
    let remaining = seconds;
    const overlay = document.createElement("div");
    overlay.className = "rest-overlay";
    overlay.innerHTML = `
      <div class="eyebrow">Rest</div>
      <div class="rest-ring" style="--pct:100">
        <div class="rest-ring-inner">
          <div class="rest-time">${remaining}</div>
          <div class="rest-sub">seconds</div>
        </div>
      </div>
      <div class="btn-row">
        <button class="btn" id="rest-minus">−15s</button>
        <button class="btn ghost" id="rest-skip">Skip</button>
        <button class="btn" id="rest-plus">+15s</button>
      </div>
    `;
    document.body.appendChild(overlay);
    const ring = overlay.querySelector(".rest-ring");
    const timeEl = overlay.querySelector(".rest-time");

    const finish = () => {
      clearInterval(interval);
      overlay.remove();
      if (Store.state.settings.soundEnabled) this.playBeep();
      if (Store.state.settings.vibrationEnabled && navigator.vibrate) navigator.vibrate([60, 40, 60]);
      onDone();
    };

    const tick = () => {
      timeEl.textContent = remaining;
      ring.style.setProperty("--pct", Math.max(0, Math.round((remaining / seconds) * 100)));
      if (remaining <= 0) finish();
      remaining--;
    };
    tick();
    const interval = setInterval(tick, 1000);

    overlay.querySelector("#rest-skip").addEventListener("click", finish);
    overlay.querySelector("#rest-plus").addEventListener("click", () => { remaining += 15; });
    overlay.querySelector("#rest-minus").addEventListener("click", () => { remaining = Math.max(0, remaining - 15); });
  },

  playBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      osc.connect(gain); gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(); osc.stop(ctx.currentTime + 0.4);
    } catch (e) {}
  },

  renderSessionFinish() {
    const s = this.session;
    const day = WORKOUT_PLAN[s.dayId];
    const allExercisesLogged = s.exercises.every(e => e.logs.some(l => l != null));
    const totalRepsSession = s.exercises.reduce((sum, e) => {
      return sum + e.logs.reduce((a, log, i) => {
        if (!log) return a;
        const setDef = e.plan[i];
        if (setDef.type === "dropset") return a + (log.stages || []).reduce((x, y) => x + (y || 0), 0);
        const mult = setDef.perSide ? 2 : 1;
        return a + (log.value || 0) * mult;
      }, 0);
    }, 0);

    this.root.innerHTML = `
      <div class="topbar"><h1>Workout Summary</h1></div>
      <div class="section">
        <div class="card">
          <div class="eyebrow">${day.label} · ${day.title}</div>
          <div style="display:flex;gap:20px;margin-top:8px">
            <div><div class="mono" style="font-size:1.3rem;color:var(--brass)">${totalRepsSession}</div><div class="day-focus">total reps</div></div>
            <div><div class="mono" style="font-size:1.3rem;color:var(--brass)">${s.exercises.filter(e => e.logs.some(l => l != null)).length}/${s.exercises.length}</div><div class="day-focus">exercises</div></div>
          </div>
        </div>
        ${!allExercisesLogged ? `<div class="hardcore-banner" style="border-color:var(--brass-dim);color:var(--brass)">Some exercises were skipped.</div>` : ""}
        <label class="day-focus">Session notes</label>
        <textarea class="notes" id="session-notes" placeholder="How did it feel? Anything to remember for next time...">${s.notes || ""}</textarea>
        ${Store.state.settings.warmupCooldownEnabled ? `
        <div class="setting-row">
          <div><div class="s-label">Warm-up completed</div></div>
          <button class="switch ${s.warmupDone ? "on" : ""}" id="warmup-toggle"></button>
        </div>
        <div class="setting-row">
          <div><div class="s-label">Cooldown / mobility completed</div></div>
          <button class="switch ${s.cooldownDone ? "on" : ""}" id="cooldown-toggle"></button>
        </div>` : ""}
        <button class="btn primary block" id="finish-btn" style="margin-top:14px">Finish & Claim Rewards</button>
      </div>
    `;
    document.getElementById("session-notes").addEventListener("input", (e) => { s.notes = e.target.value; this.saveSessionDraft(); });
    if (Store.state.settings.warmupCooldownEnabled) {
      document.getElementById("warmup-toggle").addEventListener("click", (e) => { s.warmupDone = !s.warmupDone; e.target.classList.toggle("on"); this.saveSessionDraft(); });
      document.getElementById("cooldown-toggle").addEventListener("click", (e) => { s.cooldownDone = !s.cooldownDone; e.target.classList.toggle("on"); this.saveSessionDraft(); });
    }
    document.getElementById("finish-btn").addEventListener("click", () => this.finishWorkout());
  },

  finishWorkout() {
    const s = this.session;
    const day = WORKOUT_PLAN[s.dayId];
    const durationSec = Math.round((Date.now() - s.startedAt) / 1000);

    let totalReps = 0;
    let perfect = true;
    let allDropsetsComplete = true;
    let loggedAnyExercise = false;

    s.exercises.forEach(e => {
      const anyLogged = e.logs.some(l => l != null);
      if (anyLogged) loggedAnyExercise = true;
      e.plan.forEach((setDef, i) => {
        const log = e.logs[i];
        if (!log) { if (anyLogged) perfect = false; return; }
        if (setDef.type === "dropset") {
          const filled = setDef.stages.every((_, si) => (log.stages?.[si] || 0) > 0);
          if (!filled) allDropsetsComplete = false;
          totalReps += (log.stages || []).reduce((a, b) => a + (b || 0), 0);
        } else {
          const mult = setDef.perSide ? 2 : 1;
          totalReps += (log.value || 0) * mult;
          if (setDef.type === "reps" && setDef.max && (log.value || 0) < setDef.max) perfect = false;
          if (setDef.type === "time" && setDef.max && (log.value || 0) < setDef.max) perfect = false;
        }
      });
    });
    const hasAnyDropset = s.exercises.some(e => e.plan.some(p => p.type === "dropset"));
    if (!hasAnyDropset) allDropsetsComplete = false;

    const dateISO = todayISO();
    Store.state.workoutHistory.push({
      date: dateISO,
      dayId: s.dayId,
      xpEarned: 0, // filled after awards below (approx tracked via profile delta)
      durationSec,
      notes: s.notes || "",
      exercisesLogged: s.exercises.filter(e => e.logs.some(l => l != null)).length,
      exercisesTotal: s.exercises.length,
      totalReps,
      perfect: perfect && loggedAnyExercise,
    });
    if (Store.state.workoutHistory.length > 400) Store.state.workoutHistory = Store.state.workoutHistory.slice(-400);

    Store.state.stats.totalWorkouts += 1;

    const xpBefore = Store.state.profile.totalXP;
    Engine.registerWorkoutDay(dateISO);
    const streakBonus = Math.min(XP_RULES.streakBonusCap, Store.state.profile.streak * XP_RULES.streakBonusPerDay);
    Engine.awardXP(XP_RULES.perWorkoutComplete + streakBonus);
    Engine.log(`Workout complete! +${XP_RULES.perWorkoutComplete + streakBonus} XP`, "quest");

    Engine.markQuestProgress("workout_complete", 1);
    if (allDropsetsComplete) Engine.markQuestProgress("dropsets_complete", 1);
    if (s.warmupDone || s.cooldownDone) Engine.markQuestProgress("mobility_complete", 1);
    if (Store.state.profile.streak >= 1) Engine.setQuestProgress("streak_maintained", 1);

    const weekKey = isoWeekKey();
    const daysThisWeek = new Set(Store.state.workoutHistory.filter(h => isoWeekKey(new Date(h.date)) === weekKey).map(h => h.dayId));
    Engine.setQuestProgress("days_complete", daysThisWeek.size);

    const xpGainedThisSession = Store.state.profile.totalXP - xpBefore;
    Engine.markQuestProgress("weekly_xp", xpGainedThisSession);
    const lastEntry = Store.state.workoutHistory[Store.state.workoutHistory.length - 1];
    lastEntry.xpEarned = xpGainedThisSession;

    if (perfect && loggedAnyExercise) Engine.unlockAchievement("perfect_workout");
    Engine.checkPostWorkoutAchievements();

    Store.save();
    this.clearSessionDraft();
    this.navigate("home");
  },

  // ============================================================
  // QUESTS
  // ============================================================
  renderQuests() {
    Engine.ensureQuestsFresh();
    const q = Store.state.quests;
    this.root.innerHTML = `
      <div class="topbar"><h1>Quest Log</h1></div>
      <div class="section">
        <h2>Daily</h2>
        ${q.daily.map(qq => this.questHTML(qq)).join("")}
      </div>
      <div class="section">
        <h2>Weekly</h2>
        ${q.weekly.map(qq => this.questHTML(qq)).join("")}
      </div>
      ${!Store.state.settings.questsEnabled ? `<div class="section"><div class="empty-state">Quests are disabled in Settings.</div></div>` : ""}
    `;
  },

  questHTML(q) {
    const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
    return `
      <div class="quest ${q.complete ? "complete" : ""}">
        <div class="quest-top"><span>${q.label}</span><span class="qxp">+${q.xp} XP</span></div>
        <div class="quest-bar"><div class="quest-bar-fill" style="width:${pct}%"></div></div>
      </div>`;
  },

  // ============================================================
  // STATS
  // ============================================================
  renderStats() {
    const stats = Store.state.stats;
    const p = Store.state.profile;
    const unlockedCount = Object.keys(Store.state.achievements).length;

    this.root.innerHTML = `
      <div class="topbar"><h1>Stats</h1></div>
      <div class="section">
        <div class="stat-grid">
          <div class="stat-tile"><div class="num">${stats.totalWorkouts}</div><div class="label">Workouts</div></div>
          <div class="stat-tile"><div class="num">${stats.totalReps}</div><div class="label">Total reps</div></div>
          <div class="stat-tile"><div class="num">${p.streak}</div><div class="label">Current streak</div></div>
          <div class="stat-tile"><div class="num">${p.longestStreak}</div><div class="label">Longest streak</div></div>
        </div>
      </div>

      <div class="section">
        <div class="section-head"><h2>Progress Calendar</h2></div>
        <div class="card">${this.calendarHTML()}</div>
      </div>

      <div class="section">
        <div class="section-head"><h2>Achievements</h2><span class="badge">${unlockedCount}/${ACHIEVEMENTS.length}</span></div>
        <div class="ach-grid">
          ${ACHIEVEMENTS.map(a => `
            <div class="ach-tile ${Store.state.achievements[a.id] ? "unlocked" : ""}" data-ach="${a.id}">
              <div class="icon">${a.icon}</div><div class="name">${a.name}</div>
            </div>`).join("")}
        </div>
      </div>

      <div class="section">
        <div class="section-head"><h2>Exercises</h2></div>
        ${DAY_ORDER.flatMap(d => WORKOUT_PLAN[d].exercises).map(ex => {
          const data = Store.state.exercises[ex.id];
          const pr = data?.prValue || 0;
          return `<div class="card pressable" data-ex="${ex.id}">
            <div style="display:flex;justify-content:space-between;">
              <span>${ex.name}</span><span class="mono" style="color:var(--brass)">PR ${pr}</span>
            </div>
          </div>`;
        }).join("")}
      </div>

      <div class="section">
        <button class="btn block" data-nav="history">View Workout History →</button>
      </div>
    `;
    this.root.querySelectorAll("[data-ex]").forEach(el => el.addEventListener("click", () => this.navigate("exercise", { exerciseId: el.dataset.ex })));
    this.root.querySelectorAll("[data-nav]").forEach(el => el.addEventListener("click", () => this.navigate(el.dataset.nav)));
    this.root.querySelectorAll("[data-ach]").forEach(el => el.addEventListener("click", () => this.showAchievementModal(el.dataset.ach)));
  },

  showAchievementModal(id) {
    const def = ACHIEVEMENTS.find(a => a.id === id);
    if (!def) return;
    const unlockedAt = Store.state.achievements[id];
    const overlay = document.createElement("div");
    overlay.className = "rest-overlay";
    overlay.innerHTML = `
      <div class="card" style="max-width:320px;text-align:center;">
        <div style="font-size:2.6rem">${def.icon}</div>
        <h2 style="margin-top:8px">${def.name}</h2>
        <p style="color:var(--bone-dim);margin:6px 0 14px">${def.desc}</p>
        ${unlockedAt
          ? `<div class="badge done">Unlocked ${todayISO(new Date(unlockedAt))}</div>`
          : `<div class="badge">Not yet unlocked</div>`}
        <button class="btn primary block" id="ach-close" style="margin-top:16px">Close</button>
      </div>
    `;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay.querySelector("#ach-close").addEventListener("click", close);
  },

  calendarHTML() {
    const days = 35;
    const doneDates = new Set(Store.state.workoutHistory.map(h => h.date));
    const today = new Date();
    const cells = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      const iso = todayISO(d);
      const isToday = i === 0;
      cells.push(`<div class="cal-cell ${doneDates.has(iso) ? "done" : ""} ${isToday ? "today" : ""}" title="${iso}"></div>`);
    }
    return `<div class="calendar-grid">${cells.join("")}</div>`;
  },

  renderExerciseDetail(exerciseId) {
    const allEx = DAY_ORDER.flatMap(d => WORKOUT_PLAN[d].exercises);
    const def = allEx.find(e => e.id === exerciseId);
    const data = Store.getExercise(exerciseId);
    if (!def) return this.navigate("stats");
    const history = data.history.slice(-15);
    const maxVal = Math.max(1, ...history.map(h => h.totalReps));
    const points = history.map((h, i) => {
      const x = (i / Math.max(1, history.length - 1)) * 100;
      const y = 100 - (h.totalReps / maxVal) * 90;
      return `${x},${y}`;
    }).join(" ");

    this.root.innerHTML = `
      <div class="topbar"><button class="link-btn" id="back">← Back</button></div>
      <div class="section">
        <h1>${def.name}</h1>
        <div class="stat-grid" style="margin-bottom:14px">
          <div class="stat-tile"><div class="num">${data.prValue || 0}</div><div class="label">Personal record</div></div>
          <div class="stat-tile"><div class="num">${data.consecutiveTopHits || 0}</div><div class="label">Top-range streak</div></div>
        </div>
        ${history.length ? `<svg class="sparkline" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polyline points="${points}" fill="none" stroke="var(--brass)" stroke-width="2" vector-effect="non-scaling-stroke"/>
        </svg>` : ""}
        <div class="section-head"><h2 style="margin-top:14px">History</h2></div>
        ${history.slice().reverse().map(h => `
          <div class="history-entry"><div class="h-top"><span class="h-date">${h.date}</span><span>${h.totalReps} reps</span></div></div>
        `).join("") || `<div class="empty-state">No sessions logged yet.</div>`}
      </div>
    `;
    document.getElementById("back").addEventListener("click", () => this.navigate("stats"));
  },

  renderHistory() {
    const entries = Store.state.workoutHistory.slice().reverse();
    this.root.innerHTML = `
      <div class="topbar"><button class="link-btn" id="back">← Back</button><h1>History</h1></div>
      <div class="section">
        ${entries.length ? entries.map(h => `
          <div class="card">
            <div class="h-top" style="display:flex;justify-content:space-between">
              <b>${WORKOUT_PLAN[h.dayId]?.title || h.dayId}</b>
              <span class="h-date mono">${h.date}</span>
            </div>
            <div class="day-focus">${h.totalReps} reps · ${h.exercisesLogged}/${h.exercisesTotal} exercises · +${h.xpEarned || 0} XP ${h.perfect ? "· 💎 Perfect" : ""}</div>
            ${h.notes ? `<div class="h-notes">"${this.escapeHTML(h.notes)}"</div>` : ""}
          </div>
        `).join("") : `<div class="empty-state"><div class="glyph">📜</div>No workouts logged yet.</div>`}
      </div>
    `;
    document.getElementById("back").addEventListener("click", () => this.navigate("stats"));
  },

  escapeHTML(str) {
    const d = document.createElement("div");
    d.textContent = str;
    return d.innerHTML;
  },

  // ============================================================
  // SETTINGS
  // ============================================================
  renderSettings() {
    const s = Store.state.settings;
    this.root.innerHTML = `
      <div class="topbar"><h1>Settings</h1></div>
      <div class="section">
        <div class="card">
          <div class="setting-row">
            <div class="s-label">Theme</div>
            <select class="select-inline" id="theme-select">
              <option value="dark" ${s.theme === "dark" ? "selected" : ""}>Dark</option>
              <option value="light" ${s.theme === "light" ? "selected" : ""}>Light</option>
            </select>
          </div>
          <div class="setting-row">
            <div><div class="s-label">Rest timer</div><div class="s-sub">Default rest between exercises</div></div>
            <select class="select-inline" id="rest-select">
              ${[30, 45, 60, 90, 120].map(v => `<option value="${v}" ${s.restTimerDefault === v ? "selected" : ""}>${v}s</option>`).join("")}
            </select>
          </div>
          <div class="setting-row">
            <div class="s-label">Sound</div>
            <button class="switch ${s.soundEnabled ? "on" : ""}" data-toggle="soundEnabled"></button>
          </div>
          <div class="setting-row">
            <div class="s-label">Vibration</div>
            <button class="switch ${s.vibrationEnabled ? "on" : ""}" data-toggle="vibrationEnabled"></button>
          </div>
          <div class="setting-row">
            <div class="s-label">Quests</div>
            <button class="switch ${s.questsEnabled ? "on" : ""}" data-toggle="questsEnabled"></button>
          </div>
          <div class="setting-row">
            <div><div class="s-label">Warm-up / cooldown prompts</div></div>
            <button class="switch ${s.warmupCooldownEnabled ? "on" : ""}" data-toggle="warmupCooldownEnabled"></button>
          </div>
          <div class="setting-row">
            <div><div class="s-label">Hardcore mode</div><div class="s-sub">No skipping, stricter streaks, bonus XP</div></div>
            <button class="switch ${s.hardcoreMode ? "on" : ""}" data-toggle="hardcoreMode"></button>
          </div>
        </div>

        <div class="section-head" style="margin-top:10px"><h2>Data</h2></div>
        <div class="btn-row">
          <button class="btn block" id="export-btn">Export</button>
          <button class="btn block" id="import-btn">Import</button>
        </div>
        <input type="file" id="import-file" accept="application/json" style="display:none">
        <button class="btn danger block" id="reset-btn" style="margin-top:10px">Reset All Data</button>
      </div>
    `;

    document.getElementById("theme-select").addEventListener("change", (e) => {
      s.theme = e.target.value; Store.save(); this.applyTheme();
    });
    document.getElementById("rest-select").addEventListener("change", (e) => {
      s.restTimerDefault = Number(e.target.value); Store.save();
    });
    this.root.querySelectorAll("[data-toggle]").forEach(btn => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.toggle;
        s[key] = !s[key];
        btn.classList.toggle("on");
        Store.save();
        if (key === "hardcoreMode" || key === "questsEnabled") Engine.ensureQuestsFresh();
      });
    });
    document.getElementById("export-btn").addEventListener("click", () => {
      const blob = new Blob([Store.exportJSON()], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `iron-quest-backup-${todayISO()}.json`;
      a.click();
    });
    document.getElementById("import-btn").addEventListener("click", () => document.getElementById("import-file").click());
    document.getElementById("import-file").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try { Store.importJSON(reader.result); this.applyTheme(); alert("Import successful."); this.navigate("home"); }
        catch (err) { alert("Import failed: invalid file."); }
      };
      reader.readAsText(file);
    });
    document.getElementById("reset-btn").addEventListener("click", () => {
      if (confirm("This will permanently erase all workout data, XP, and achievements. Continue?")) {
        Store.reset();
        this.clearSessionDraft();
        this.navigate("home");
      }
    });
  },
};

document.addEventListener("DOMContentLoaded", () => App.init());
