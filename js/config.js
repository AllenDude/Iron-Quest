// ============================================================
// STATIC CONFIG — the four day split, RPG curve, quests, achievements
// ============================================================

/*
Set schema (one entry per working set group):
  kind: 'reps' | 'time' | 'failure_reps' | 'failure_time' | 'choice'
  sets: number of working sets
  min/max: target rep or second range (for 'reps' / 'time')
  fixed: fixed rep/sec count (overrides min/max display)
  perSide: bool — logged per side
  lastSetDropset: [{id,label}] mechanical drop set on final set only, to failure
  everySetDropset: [{id,label}] drop set structure repeated every set, to failure
  options: [{id,label}] for 'choice' kind — user picks which variation they performed
  cue: short form cue / instruction
  nextTier: {id,label} — harder variation unlocked after consistent top-of-range performance
*/

const WORKOUT_PLAN = {
  mon: {
    id: "mon", label: "Monday", title: "Chest", focus: "Pectorals",
    exercises: [
      {
        id: "decline_pushups", name: "Decline Push-Ups", kind: "reps",
        sets: 4, min: 8, max: 15,
        lastSetDropset: [
          { id: "decline_pushups", label: "Decline Push-Ups" },
          { id: "regular_pushups", label: "Regular Push-Ups" },
          { id: "knee_pushups", label: "Knee Push-Ups" },
        ],
        cue: "Feet elevated on a bench or step.",
        nextTier: { label: "Deficit Decline Push-Ups" },
      },
      {
        id: "wide_pushups", name: "Wide Push-Ups", kind: "reps",
        sets: 4, min: 12, max: 20,
        everySetDropset: [
          { id: "wide_pushups", label: "Wide Push-Ups" },
          { id: "regular_pushups", label: "Regular Push-Ups" },
        ],
        cue: "Hands well outside shoulder width.",
        nextTier: { label: "Wide Push-Ups w/ 2s pause" },
      },
      {
        id: "archer_pushups", name: "Archer Push-Ups", kind: "reps",
        sets: 3, min: 6, max: 10, perSide: true,
        cue: "Shift weight side to side, straighten the non-working arm.",
        nextTier: { label: "One-Arm Push-Up Progression" },
      },
      {
        id: "deep_pushups", name: "Deep Push-Ups", kind: "reps",
        sets: 3, min: 10, max: 15,
        cue: "Use push-up handles or books for a deeper stretch.",
        nextTier: { label: "Deep Push-Ups + 2s pause at bottom" },
      },
      {
        id: "chest_dips", name: "Chest Dips", kind: "failure_reps",
        sets: 3,
        cue: "Lean forward throughout the movement.",
      },
    ],
  },
  tue: {
    id: "tue", label: "Tuesday", title: "Back", focus: "Lats & Rhomboids",
    exercises: [
      {
        id: "pullups", name: "Pull-Ups", kind: "failure_reps",
        sets: 4,
        lastSetDropset: [
          { id: "wide_grip_pullups", label: "Wide Grip Pull-Ups" },
          { id: "regular_pullups", label: "Regular Pull-Ups" },
          { id: "chinups", label: "Chin-Ups" },
        ],
      },
      {
        id: "australian_rows", name: "Australian Rows", kind: "reps",
        sets: 4, min: 10, max: 15,
        cue: "Feet elevated if too easy.",
        nextTier: { label: "Feet-Elevated Australian Rows" },
      },
      {
        id: "chinups", name: "Chin-Ups", kind: "reps",
        sets: 4, min: 8, max: 12,
        lastTwoSetsSpecial: { failureLabel: "Chin-Ups (to failure)", negativeLabel: "Negative Chin-Ups" },
      },
      {
        id: "towel_rows", name: "Towel Rows", kind: "reps",
        sets: 3, min: 12, max: 15,
        nextTier: { label: "Towel Rows + 2s pause" },
      },
      {
        id: "scapular_pullups", name: "Scapular Pull-Ups", kind: "reps",
        sets: 3, fixed: 15,
        cue: "Focus on lat activation, dead hang to shoulder engagement.",
      },
    ],
  },
  wed: {
    id: "wed", label: "Wednesday", title: "Abs", focus: "Core & Midsection",
    exercises: [
      {
        id: "vups", name: "V-Ups", kind: "reps",
        sets: 4, fixed: 15,
        everySetDropset: [
          { id: "vups", label: "V-Ups" },
          { id: "crunches", label: "Crunches" },
          { id: "flutter_kicks", label: "Flutter Kicks" },
        ],
      },
      {
        id: "hanging_leg_raises", name: "Hanging Leg Raises", kind: "reps",
        sets: 4, min: 10, max: 20,
        nextTier: { label: "Hanging Leg Raises + hold at top" },
      },
      {
        id: "hollow_body_hold", name: "Hollow Body Hold", kind: "time",
        sets: 4, min: 45, max: 60,
        nextTier: { label: "Hollow Body Rocks" },
      },
      {
        id: "plank", name: "Plank", kind: "failure_time",
        sets: 3,
      },
      {
        id: "russian_twists", name: "Russian Twists", kind: "reps",
        sets: 3, fixed: 20, perSide: true,
      },
    ],
    finisher: {
      id: "mountain_climbers", name: "Mountain Climbers", kind: "failure_time",
      sets: 3, targetSeconds: 45, label: "Finisher",
    },
  },
  thu: {
    id: "thu", label: "Thursday", title: "Shoulders", focus: "Deltoids",
    exercises: [
      {
        id: "pike_pushups", name: "Pike Push-Ups", kind: "reps",
        sets: 4, min: 8, max: 15,
        lastSetDropset: [
          { id: "elevated_pike_pushups", label: "Elevated Pike Push-Ups" },
          { id: "pike_pushups", label: "Pike Push-Ups" },
          { id: "incline_pike_pushups", label: "Incline Pike Push-Ups" },
        ],
      },
      {
        id: "wall_handstand_hold", name: "Wall Handstand Hold", kind: "time",
        sets: 4, min: 30, max: 60,
        nextTier: { label: "Freestanding Handstand Hold" },
      },
      {
        id: "handstand_pushup_progression", name: "Handstand Push-Up Progression", kind: "choice",
        sets: 4,
        options: [
          { id: "wall_hspu", label: "Wall Handstand Push-Ups" },
          { id: "negative_hspu", label: "Negative Handstand Push-Ups" },
          { id: "pike_pushups_choice", label: "Pike Push-Ups" },
        ],
        cue: "Choose your level, log max reps for that variation.",
      },
      {
        id: "pseudo_planche_pushups", name: "Pseudo Planche Push-Ups", kind: "reps",
        sets: 3, min: 8, max: 12,
        nextTier: { label: "Advanced Tuck Planche Push-Ups" },
      },
      {
        id: "wall_walks", name: "Wall Walks", kind: "reps",
        sets: 3, min: 5, max: 10,
        nextTier: { label: "Wall Walks + hold at top" },
      },
    ],
  },
};

const DAY_ORDER = ["mon", "tue", "wed", "thu"];

// ---------------- RPG progression curve ----------------
const XP_RULES = {
  perSet: 4,
  perExerciseComplete: 15,
  perWorkoutComplete: 100,
  perPR: 25,
  perQuestDaily: 30,
  perQuestWeekly: 120,
  streakBonusPerDay: 5, // capped
  streakBonusCap: 100,
  hardcoreMultiplier: 1.25,
};

function xpForLevel(level) {
  // increasing curve: level 1->2 needs 100, grows ~12%/level
  return Math.round(100 * Math.pow(1.12, level - 1));
}

const TITLES = [
  { level: 1, title: "Novice" },
  { level: 5, title: "Trainee" },
  { level: 10, title: "Disciple" },
  { level: 15, title: "Adept" },
  { level: 20, title: "Warrior" },
  { level: 30, title: "Vanguard" },
  { level: 40, title: "Champion" },
  { level: 50, title: "Master" },
  { level: 65, title: "Grandmaster" },
  { level: 80, title: "Mythic" },
  { level: 100, title: "Legend" },
];

function titleForLevel(level) {
  let t = TITLES[0].title;
  for (const entry of TITLES) if (level >= entry.level) t = entry.title;
  return t;
}

// ---------------- Achievements ----------------
const ACHIEVEMENTS = [
  { id: "first_workout", name: "First Blood", desc: "Complete your first workout.", icon: "⚔️" },
  { id: "level_5", name: "Rising Star", desc: "Reach level 5.", icon: "⭐" },
  { id: "level_10", name: "Seasoned", desc: "Reach level 10.", icon: "🌟" },
  { id: "level_25", name: "Veteran", desc: "Reach level 25.", icon: "🏵️" },
  { id: "level_50", name: "Master Rank", desc: "Reach level 50.", icon: "🎖️" },
  { id: "streak_3", name: "Warming Up", desc: "3-day workout streak.", icon: "🔥" },
  { id: "streak_7", name: "One Week Strong", desc: "7-day workout streak.", icon: "🔥" },
  { id: "streak_30", name: "Unbreakable", desc: "30-day workout streak.", icon: "🔥" },
  { id: "streak_100", name: "Beast Mode", desc: "100-day workout streak.", icon: "👹" },
  { id: "pushups_500", name: "Push Novice", desc: "500 total push-up-family reps.", icon: "💪" },
  { id: "pushups_5000", name: "Push Titan", desc: "5,000 total push-up-family reps.", icon: "💪" },
  { id: "pullups_250", name: "Pull Novice", desc: "250 total pull/chin-up reps.", icon: "🦾" },
  { id: "pullups_2500", name: "Pull Titan", desc: "2,500 total pull/chin-up reps.", icon: "🦾" },
  { id: "workouts_10", name: "Getting Started", desc: "Complete 10 workouts.", icon: "📘" },
  { id: "workouts_50", name: "Committed", desc: "Complete 50 workouts.", icon: "📗" },
  { id: "workouts_200", name: "Iron Will", desc: "Complete 200 workouts.", icon: "📕" },
  { id: "perfect_workout", name: "Perfect Form", desc: "Hit the top of every rep range in a single workout.", icon: "💎" },
  { id: "legendary_rank", name: "Legendary", desc: "Reach the Legend title.", icon: "👑" },
];

// ---------------- Quest templates ----------------
// Daily quests regenerate each local day. Targets scale in hardcore mode.
function getDailyQuestTemplates(hardcore) {
  const m = hardcore ? 1.5 : 1;
  return [
    { id: "daily_complete_workout", label: "Complete today's workout", type: "workout_complete", target: 1, xp: XP_RULES.perQuestDaily },
    { id: "daily_dropsets", label: "Finish all drop sets in today's workout", type: "dropsets_complete", target: 1, xp: XP_RULES.perQuestDaily },
    { id: "daily_reps", label: `Reach ${Math.round(80 * m)} total reps today`, type: "total_reps", target: Math.round(80 * m), xp: XP_RULES.perQuestDaily },
    { id: "daily_mobility", label: "Complete a mobility session", type: "mobility_complete", target: 1, xp: XP_RULES.perQuestDaily },
  ];
}

function getWeeklyQuestTemplates(hardcore) {
  const m = hardcore ? 1.5 : 1;
  return [
    { id: "weekly_all_days", label: "Finish all four workout days", type: "days_complete", target: 4, xp: XP_RULES.perQuestWeekly },
    { id: "weekly_xp", label: `Earn ${Math.round(500 * m)} XP this week`, type: "weekly_xp", target: Math.round(500 * m), xp: XP_RULES.perQuestWeekly },
    { id: "weekly_pr", label: "Set a new personal record", type: "pr_set", target: 1, xp: XP_RULES.perQuestWeekly },
    { id: "weekly_streak", label: "Maintain your workout streak all week", type: "streak_maintained", target: 1, xp: XP_RULES.perQuestWeekly },
  ];
}

const PUSHUP_FAMILY = ["decline_pushups", "regular_pushups", "knee_pushups", "wide_pushups", "archer_pushups",
  "deep_pushups", "pike_pushups", "elevated_pike_pushups", "incline_pike_pushups", "wall_hspu", "negative_hspu",
  "pike_pushups_choice", "pseudo_planche_pushups"];
const PULLUP_FAMILY = ["pullups", "wide_grip_pullups", "chinups", "negative_chinups", "australian_rows",
  "towel_rows", "scapular_pullups"];
