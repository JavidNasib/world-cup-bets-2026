const SUPABASE_URL = window.APP_CONFIG?.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = window.APP_CONFIG?.SUPABASE_ANON_KEY || "";
const ADMIN_PIN_HASH = window.APP_CONFIG?.ADMIN_PIN_HASH || "";
const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";
const ESPN_FRIENDLY_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.friendly/scoreboard";
const STORAGE_KEY = "worldCupPredictionBank.v1";
const ACTIVE_TAB_KEY = "worldCupPredictionBank.activeTab";
const REMEMBERED_PLAYER_KEY = "worldCupPredictionBank.rememberedPlayer";
const DATE_COUNTS = {
  "2026-06-10": 3,
  "2026-06-11": 2,
  "2026-06-12": 2,
  "2026-06-13": 4,
  "2026-06-14": 4,
  "2026-06-15": 4,
  "2026-06-16": 4,
  "2026-06-17": 4,
  "2026-06-18": 4,
  "2026-06-19": 4,
  "2026-06-20": 4,
  "2026-06-21": 4,
  "2026-06-22": 4,
  "2026-06-23": 4,
  "2026-06-24": 6,
  "2026-06-25": 6,
  "2026-06-26": 6,
  "2026-06-27": 6,
  "2026-06-28": 1,
  "2026-06-29": 3,
  "2026-06-30": 3,
  "2026-07-01": 3,
  "2026-07-02": 3,
  "2026-07-03": 3,
  "2026-07-04": 2,
  "2026-07-05": 2,
  "2026-07-06": 2,
  "2026-07-07": 2,
  "2026-07-09": 1,
  "2026-07-10": 1,
  "2026-07-11": 2,
  "2026-07-14": 1,
  "2026-07-15": 1,
  "2026-07-18": 1,
  "2026-07-19": 1
};

const RESULT_OPTIONS = ["1", "X", "2"];
const DOUBLE_OPTIONS = ["1X", "X2", "12"];
const GOAL_OPTIONS = ["O2", "U2"];
const BOTH_OPTIONS = ["GG", "NG"];
const HALF_RESULT_OPTIONS = ["H1", "HX", "H2"];
const HALF_GOAL_OPTIONS = ["HO1.5", "HU1.5"];
const EXTRA_RESULT_OPTIONS = ["E1", "EX", "E2"];
const PENALTY_OPTIONS = ["P1", "P2"];
const MAX_PICKS_PER_GAME = 3;
const MIN_PLAYERS = 1;
const ABSOLUTE_MAX_PLAYERS = 7;
const BET_LOCK_MINUTES_BEFORE_FIRST_GAME = 15;
const GAME_RESULT_SYNC_DELAY_MS = 2 * 60 * 60 * 1000 + 15 * 60 * 1000;
const TEST_ONLY_DATES = new Set(["2026-06-10"]);
const NEW_PICK_TEST_ONLY_DATES = new Set(["2026-06-28"]);
const LEGACY_SCORING_KINDS = new Set(["result", "goals", "both", "double", "challenge"]);
const GROUP_STAGE_START_DATE = "2026-06-11";
const GROUP_STAGE_END_DATE = "2026-06-27";
const SPECIAL_GAME_LOCK_OVERRIDES = new Set(["760421"]);
const SPECIAL_GAME_INDEX_OVERRIDES = { 760421: 4 };
const CHEAT_WARNING = "Fuck you Rafiz, did you think I dont know?";
const H2H_NOTES = {
  "Brazil|Scotland": "World Cup meetings: 1974 draw 0-0; 1982 Brazil won 4-1; 1990 Brazil won 1-0; 1998 Brazil won 2-1.",
  "Canada|Switzerland": "Previous meeting: Switzerland vs Canada, 2002 friendly - Canada won 3-1."
};
const GROUP_PATHS = {
  A: ["3rd from C/E/F/H/I", "2nd Group B", "1st Group E or G"],
  B: ["3rd from E/F/G/I/J", "2nd Group A", "1st Group D or E"],
  C: ["2nd Group F", "1st Group F", "1st Group A/E/I"],
  D: ["3rd from B/E/F/I/J", "2nd Group G", "1st Group E/I/K"],
  E: ["3rd from A/B/C/D/F", "2nd Group I", "1st Group A/B/D/G/K/L"],
  F: ["2nd Group C", "1st Group C", "1st Group A/B/D/E/I"],
  G: ["3rd from A/E/H/I/J", "2nd Group D", "1st Group B/I"],
  H: ["2nd Group J", "1st Group J", "1st Group A/G/I/L"],
  I: ["3rd from C/D/F/G/H", "2nd Group E", "1st Group A/B/D/G/K/L"],
  J: ["2nd Group H", "1st Group H", "1st Group B/D/G/K/L"],
  K: ["3rd from D/E/I/J/L", "2nd Group L", "1st Group L"],
  L: ["3rd from E/H/I/J/K", "2nd Group K", "1st Group K"]
};
const $ = (id) => document.getElementById(id);
const PLACEHOLDER_PLAYER_RE = /^Player [1-7]$/;
const DEFAULT_POINT_VALUES = {
  result: 4,
  goals: 3,
  both: 2,
  double: 1,
  halfResult: 4,
  halfGoals: 3,
  exactScore: 10,
  extraResult: 4,
  penalty: 4,
  challenge2: 6,
  challenge3: 8,
  perfectDayBonus: 4,
  soloGameBonus: 2
};
const DEFAULT_RULES = {
  1: { result: 1, goals: 1, double: 0 },
  2: { result: 2, goals: 0, double: 0 },
  3: { result: 1, goals: 1, double: 1 },
  4: { result: 1, goals: 2, double: 1 },
  6: { result: 2, goals: 0, double: 4 }
};
const PAYOUT_SHARES = [0.5, 0.3, 0.2];

let db = null;
let adminUnlocked = false;
let finalSyncTimer = null;
let winnerBannerReady = false;
let selectedHistoryDate = "";
let selectedAdminLateDate = "";
let state = {
  settings: {
    entryAmount: 1,
    players: [],
    maxPlayers: 7,
    rules: DEFAULT_RULES,
    pointValues: DEFAULT_POINT_VALUES,
    gameBetting: {},
    favoriteChallenges: {},
    lateUnlocks: {},
    halfTimes: {}
  },
  games: seedGames(),
  bets: {}
};
let selections = {};
let extraOpenGames = new Set();

function seedGames() {
  const games = {};
  Object.entries(DATE_COUNTS).forEach(([date, count]) => {
    if (date === "2026-06-10") {
      games[date] = [
        {
          id: "401867372",
          date,
          index: 1,
          team1: "Portugal",
          team2: "Nigeria",
          time: "2026-06-10T19:45:00Z",
          venue: "Estadio Dr. Magalhaes Pessoa",
          score1: null,
          score2: null,
          completed: false,
          source: "espn-friendly"
        },
        {
          id: "401860829",
          date,
          index: 2,
          team1: "England",
          team2: "Costa Rica",
          time: "2026-06-10T20:00:00Z",
          venue: "Inter&Co Stadium",
          score1: null,
          score2: null,
          completed: false,
          source: "espn-friendly"
        },
        {
          id: "401874117",
          date,
          index: 3,
          team1: "Jordan",
          team2: "Algeria",
          time: "2026-06-11T00:00:00Z",
          venue: "Rock Chalk Park",
          score1: null,
          score2: null,
          completed: false,
          source: "espn-friendly"
        }
      ];
      return;
    }
    games[date] = Array.from({ length: count }, (_, index) => ({
      id: `${date}-${index + 1}`,
      date,
      index: index + 1,
      team1: placeholderTeam(date, index),
      team2: "Opponent TBD",
      time: "",
      venue: "",
      score1: null,
      score2: null,
      completed: false,
      source: "schedule"
    }));
  });
  return games;
}

function placeholderTeam(date, index) {
  const special = {
    "2026-07-14": "Semifinalist TBD",
    "2026-07-15": "Semifinalist TBD",
    "2026-07-18": "Third-place team TBD",
    "2026-07-19": "Finalist TBD"
  };
  return special[date] || `Game ${index + 1} Team 1 TBD`;
}

function isPlaceholderGame(game) {
  return game?.source === "schedule"
    && !game.time
    && !game.completed
    && game.score1 === null
    && game.score2 === null
    && (game.team2 === "Opponent TBD" || String(game.team1 || "").includes("TBD"));
}

function cleanGamesForDate(date, games = []) {
  const realGames = games.filter((game) => !isPlaceholderGame(game));
  const usableGames = realGames.length ? realGames : games;
  return usableGames
    .sort((a, b) => {
      const timeCompare = String(a.time || "").localeCompare(String(b.time || ""));
      return timeCompare || (a.index - b.index);
    })
    .slice(0, DATE_COUNTS[date] || usableGames.length)
    .map((game, index) => ({ ...game, index: index + 1 }));
}

function money(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value || 0);
}

function signedMoney(value) {
  const amount = Number(value) || 0;
  if (amount > 0) return `+${money(amount)}`;
  if (amount < 0) return `-${money(Math.abs(amount))}`;
  return money(0);
}

function prettyDate(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
}

function todayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function newYorkDateKey(isoTime) {
  if (!isoTime) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23"
  }).formatToParts(new Date(isoTime));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const localDate = new Date(`${values.year}-${values.month}-${values.day}T12:00:00`);
  if (Number(values.hour) < 6) localDate.setDate(localDate.getDate() - 1);
  const y = localDate.getFullYear();
  const m = String(localDate.getMonth() + 1).padStart(2, "0");
  const d = String(localDate.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function bettingDateForGame(game, fallbackDate) {
  const localDate = newYorkDateKey(game.time || game.kickoff_time);
  return DATE_COUNTS[localDate] ? localDate : fallbackDate;
}

function nearestPlayableDate() {
  const today = todayKey();
  return Object.keys(DATE_COUNTS).find((date) => date >= today) || Object.keys(DATE_COUNTS).at(-1);
}

function ruleForCount(count) {
  return { ...(DEFAULT_RULES[count] || { result: 0, goals: 0, double: 0 }), ...(state.settings.rules?.[count] || {}) };
}

function realPlayers(players = state.settings.players) {
  return [...new Set((players || []).map((name) => String(name).trim()).filter((name) => name && !PLACEHOLDER_PLAYER_RE.test(name)))];
}

function normalizePlayers() {
  state.settings.players = realPlayers();
}

function betPlayerNames() {
  return realPlayers(Object.values(state.bets).flatMap((dayBets) => Object.keys(dayBets || {})));
}

function reconcilePlayersFromBets() {
  state.settings.players = realPlayers([...state.settings.players, ...betPlayerNames()]).slice(0, maxPlayers());
}

function maxPlayers() {
  const value = Number(state.settings.maxPlayers) || ABSOLUTE_MAX_PLAYERS;
  return Math.min(ABSOLUTE_MAX_PLAYERS, Math.max(MIN_PLAYERS, value));
}

function findPlayerName(name) {
  const normalized = String(name || "").trim().toLowerCase();
  return state.settings.players.find((player) => player.toLowerCase() === normalized) || "";
}

function compareName(name) {
  return String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function editDistance(a, b) {
  const left = compareName(a);
  const right = compareName(b);
  if (!left || !right) return Math.max(left.length, right.length);
  const rows = Array.from({ length: left.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= right.length; j += 1) rows[0][j] = j;
  for (let i = 1; i <= left.length; i += 1) {
    for (let j = 1; j <= right.length; j += 1) {
      rows[i][j] = left[i - 1] === right[j - 1]
        ? rows[i - 1][j - 1]
        : Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + 1);
    }
  }
  return rows[left.length][right.length];
}

function closePlayerName(name) {
  if (findPlayerName(name)) return "";
  const cleaned = compareName(name);
  if (cleaned.length < 4) return "";
  return state.settings.players.find((player) => {
    const distance = editDistance(name, player);
    const threshold = Math.min(2, Math.max(1, Math.floor(Math.max(cleaned.length, compareName(player).length) / 5)));
    return distance > 0 && distance <= threshold;
  }) || "";
}

function challengeInfo(pick) {
  const match = String(pick || "").match(/^([12])H([234])$/);
  return match ? { side: match[1], margin: Number(match[2]) } : null;
}

function exactScoreInfo(pick) {
  const match = String(pick || "").match(/^ES:([0-9])-([0-9])$/);
  return match ? { score1: Number(match[1]), score2: Number(match[2]) } : null;
}

function isCompletePick(pick) {
  if (!pick) return false;
  if (String(pick).startsWith("ES:")) return Boolean(exactScoreInfo(pick));
  return Boolean(pickKind(pick));
}

function picksForGame(picks, gameId) {
  const value = picks?.[gameId];
  return Array.isArray(value) ? value.filter(isCompletePick) : (isCompletePick(value) ? [value] : []);
}

function rawPicksForGame(picks, gameId) {
  const value = picks?.[gameId];
  return Array.isArray(value) ? value.filter(Boolean) : (value ? [value] : []);
}

function extraPickKind(kind) {
  return kind === "extraResult" || kind === "penalty";
}

function normalPicksForGame(picks, gameId) {
  return rawPicksForGame(picks, gameId).filter((pick) => !extraPickKind(pickKind(pick)));
}

function selectedGameIds(picks = selections) {
  return Object.keys(picks || {}).filter((gameId) => picksForGame(picks, gameId).length);
}

function pickCountsForDate(date, pick) {
  return !NEW_PICK_TEST_ONLY_DATES.has(date) || LEGACY_SCORING_KINDS.has(pickKind(pick));
}

function countedPicksForGame(date, picks, gameId) {
  return picksForGame(picks, gameId).filter((pick) => pickCountsForDate(date, pick));
}

function pickKind(value) {
  if (RESULT_OPTIONS.includes(value)) return "result";
  if (DOUBLE_OPTIONS.includes(value)) return "double";
  if (GOAL_OPTIONS.includes(value)) return "goals";
  if (BOTH_OPTIONS.includes(value)) return "both";
  if (HALF_RESULT_OPTIONS.includes(value)) return "halfResult";
  if (HALF_GOAL_OPTIONS.includes(value)) return "halfGoals";
  if (EXTRA_RESULT_OPTIONS.includes(value)) return "extraResult";
  if (PENALTY_OPTIONS.includes(value)) return "penalty";
  if (String(value || "").startsWith("ES:")) return "exactScore";
  if (challengeInfo(value)) return "challenge";
  return "";
}

function allowedOptions(kind) {
  if (kind === "result") return RESULT_OPTIONS;
  if (kind === "double") return DOUBLE_OPTIONS;
  if (kind === "goals") return GOAL_OPTIONS;
  if (kind === "both") return BOTH_OPTIONS;
  if (kind === "halfResult") return HALF_RESULT_OPTIONS;
  if (kind === "halfGoals") return HALF_GOAL_OPTIONS;
  if (kind === "extraResult") return EXTRA_RESULT_OPTIONS;
  if (kind === "penalty") return PENALTY_OPTIONS;
  return [];
}

function pointValues() {
  return { ...DEFAULT_POINT_VALUES, ...(state.settings.pointValues || {}) };
}

function favoriteChallenge(game) {
  const challenge = state.settings.favoriteChallenges?.[game?.id];
  return challenge?.enabled && ["1", "2"].includes(challenge.side) ? challenge : null;
}

function favoriteChallengeOptions(game) {
  const challenge = favoriteChallenge(game);
  if (!challenge) return [];
  return [2, 3].map((margin) => `${challenge.side}H${margin}`);
}

function pickLabel(pick, game) {
  const challenge = challengeInfo(pick);
  const exact = exactScoreInfo(pick);
  if (exact) return `${exact.score1}-${exact.score2}`;
  if (pick === "H1") return "1";
  if (pick === "HX") return "X";
  if (pick === "H2") return "2";
  if (pick === "HO1.5") return "O1.5";
  if (pick === "HU1.5") return "U1.5";
  if (pick === "E1") return "1";
  if (pick === "EX") return "X";
  if (pick === "E2") return "2";
  if (pick === "P1") return "1";
  if (pick === "P2") return "2";
  if (!challenge) return pick || "-";
  const team = challenge.side === "1" ? game?.team1 : game?.team2;
  return `${team || `Team ${challenge.side}`} by ${challenge.margin}+`;
}

function historyPickLabel(pick, game) {
  if (pick === "1") return "FT1";
  if (pick === "X") return "FTX";
  if (pick === "2") return "FT2";
  if (pick === "H1") return "HT1";
  if (pick === "HX") return "HTX";
  if (pick === "H2") return "HT2";
  if (pick === "E1") return "E1";
  if (pick === "EX") return "EX";
  if (pick === "E2") return "E2";
  if (pick === "P1") return "P1";
  if (pick === "P2") return "P2";
  return pickLabel(pick, game);
}

function pickPoints(pick) {
  const kind = pickKind(pick);
  const challenge = challengeInfo(pick);
  if (kind === "exactScore" && !exactScoreInfo(pick)) return 0;
  if (challenge) return Number(pointValues()[`challenge${challenge.margin}`]) || 0;
  return kind ? Number(pointValues()[kind]) || 0 : 0;
}

function perfectDayBonus() {
  return Number(pointValues().perfectDayBonus) || 0;
}

function soloGameBonus() {
  return Number(pointValues().soloGameBonus) || 0;
}

function correctPlayersForGame(date, game) {
  const dayBets = state.bets[date] || {};
  return Object.entries(dayBets)
    .filter(([, bet]) => {
      const picks = getBetPicks(bet) || {};
      return completedGame(game) && countedPicksForGame(date, picks, game.id).some((pick) => pickWins(pick, game));
    })
    .map(([player]) => player);
}

function getBetPicks(bet) {
  if (!bet) return null;
  return bet.picks || bet;
}

async function hashPin(pin) {
  const text = String(pin || "").trim();
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function getActiveDate() {
  return $("dateSelect").value || nearestPlayableDate();
}

function closePathPanel() {
  $("knockoutPathPanel")?.classList.add("hidden");
}

function activateTab(tabName, remember = true) {
  const tab = document.querySelector(`.tab[data-tab="${tabName}"]`);
  const panel = $(`${tabName}Panel`);
  if (!tab || !panel) return;
  document.querySelectorAll(".tab, .panel").forEach((item) => item.classList.remove("active"));
  tab.classList.add("active");
  panel.classList.add("active");
  if (tabName === "stats") closePathPanel();
  if (remember) localStorage.setItem(ACTIVE_TAB_KEY, tabName);
}

function restoreActiveTab() {
  activateTab(localStorage.getItem(ACTIVE_TAB_KEY) || "bet", false);
}

function rememberPlayerCredentials(playerName, pin) {
  const name = String(playerName || "").trim();
  const playerPin = String(pin || "").trim();
  if (!name || playerPin.length < 4) return;
  localStorage.setItem(REMEMBERED_PLAYER_KEY, JSON.stringify({ name, pin: playerPin }));
}

function rememberedPlayerCredentials() {
  try {
    const saved = JSON.parse(localStorage.getItem(REMEMBERED_PLAYER_KEY) || "null");
    if (!saved?.name || !saved?.pin) return null;
    return { name: String(saved.name), pin: String(saved.pin) };
  } catch {
    return null;
  }
}

function restoreRememberedPlayer() {
  const saved = rememberedPlayerCredentials();
  if (!saved) return;
  if ($("playerName") && !$("playerName").value) $("playerName").value = saved.name;
  if ($("playerPin") && !$("playerPin").value) $("playerPin").value = saved.pin;
}

function firstGameTime(date) {
  const games = state.games[date] || [];
  const times = games.map((game) => game.time).filter(Boolean).sort();
  return times[0] ? new Date(times[0]) : null;
}

function lastGameTime(date) {
  const games = state.games[date] || [];
  const times = games.map((game) => game.time).filter(Boolean).sort();
  return times.length ? new Date(times.at(-1)) : null;
}

function isLocked(date) {
  const first = firstGameTime(date);
  return first ? Date.now() >= first.getTime() - BET_LOCK_MINUTES_BEFORE_FIRST_GAME * 60 * 1000 : false;
}

function clearBetForm(options = {}) {
  const keepIdentity = Boolean(options.keepIdentity);
  if (!keepIdentity) {
    $("playerName").value = "";
    $("playerPin").value = "";
  }
  selections = {};
  renderBetPanel();
}

function scheduleFinalResultSync() {
  clearTimeout(finalSyncTimer);
  const now = Date.now();
  const nextDate = Object.keys(DATE_COUNTS).find((date) => {
    const last = lastGameTime(date);
    return last && last.getTime() + GAME_RESULT_SYNC_DELAY_MS > now;
  });
  if (!nextDate) return;
  const last = lastGameTime(nextDate);
  const delay = Math.max(0, last.getTime() + GAME_RESULT_SYNC_DELAY_MS - now);
  finalSyncTimer = setTimeout(async () => {
    await syncFixtures(true);
    scheduleFinalResultSync();
  }, Math.min(delay, 2147483647));
}

async function initStorage() {
  if (SUPABASE_URL && SUPABASE_ANON_KEY && window.supabase) {
    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    await loadFromSupabase();
  } else {
    loadLocal();
  }
}

function loadLocal() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return;
  try {
    const parsed = JSON.parse(saved);
    state = {
      ...state,
      ...parsed,
      settings: { ...state.settings, ...(parsed.settings || {}) },
      games: { ...state.games, ...(parsed.games || {}) },
      bets: parsed.bets || {}
    };
    normalizePlayers();
  } catch {
    showToast("Saved data could not be loaded.");
  }
}

function saveLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

async function loadFromSupabase() {
  const [settingsRes, gamesRes, betsRes] = await Promise.all([
    db.from("settings").select("*").eq("id", "main").maybeSingle(),
    db.from("games").select("*"),
    db.from("bets").select("*")
  ]);
  if (settingsRes.data?.data) {
    state.settings = { ...state.settings, ...settingsRes.data.data };
    normalizePlayers();
  }
  if (gamesRes.data?.length) {
    gamesRes.data.forEach((row) => {
      state.games[row.match_date] ||= [];
      const game = normalizeDbGame(row);
      if (game.date === "2026-06-10" && game.id === "401875463") return;
      const index = state.games[row.match_date].findIndex((item) => item.id === game.id);
      if (index >= 0) state.games[row.match_date][index] = game;
      else state.games[row.match_date].push(game);
      state.games[row.match_date].sort((a, b) => a.index - b.index);
    });
    Object.keys(DATE_COUNTS).forEach((date) => {
      state.games[date] = cleanGamesForDate(date, state.games[date] || []);
    });
  }
  if (betsRes.data?.length) {
    state.bets = {};
    betsRes.data.forEach((row) => {
      state.bets[row.match_date] ||= {};
      state.bets[row.match_date][row.player_name] = {
        picks: row.picks,
        pinHash: row.pin_hash || "",
        updatedAt: row.created_at
      };
    });
    reconcilePlayersFromBets();
  }
}

function normalizeDbGame(row) {
  const half = state.settings.halfTimes?.[row.id] || {};
  const extra = state.settings.extraTimes?.[row.id] || {};
  const penaltyWinner = state.settings.penaltyWinners?.[row.id] || "";
  return {
    id: row.id,
    date: row.match_date,
    index: row.game_index,
    team1: row.team1,
    team2: row.team2,
    time: row.kickoff_time || "",
    venue: row.venue || "",
    score1: row.score1,
    score2: row.score2,
    htScore1: half.score1 ?? null,
    htScore2: half.score2 ?? null,
    etScore1: extra.score1 ?? null,
    etScore2: extra.score2 ?? null,
    penaltyWinner,
    completed: Boolean(row.completed),
    source: row.source || "manual"
  };
}

async function persist() {
  if (!db) {
    saveLocal();
    return;
  }
  await db.from("settings").upsert({ id: "main", data: state.settings, updated_at: new Date().toISOString() });
  const gameRows = Object.values(state.games).flat().filter((game) => !isPlaceholderGame(game)).map((game) => ({
    id: game.id,
    match_date: game.date,
    game_index: game.index,
    team1: game.team1,
    team2: game.team2,
    kickoff_time: game.time || null,
    venue: game.venue || null,
    score1: game.score1,
    score2: game.score2,
    completed: game.completed,
    source: game.source || "manual"
  }));
  if (gameRows.length) await db.from("games").upsert(gameRows);
}

async function saveBet(date, playerName, pin, picks) {
  normalizePlayers();
  const savedName = findPlayerName(playerName) || playerName;
  const existing = state.bets[date]?.[savedName];
  const pinHash = await hashPin(pin);
  const games = state.games[date] || [];
  const gamesById = new Map(games.map((game) => [game.id, game]));
  const incomingPicks = Object.entries(picks || {})
    .map(([id, value]) => [id, rawPicksForGame({ [id]: value }, id).filter(isCompletePick)])
    .filter(([id, gamePicks]) => gamesById.has(id) && gamePicks.length);
  if (!incomingPicks.length) {
    throw new Error("Pick at least one open game.");
  }
  for (const [id, gamePicks] of incomingPicks) {
    const game = gamesById.get(id);
    if (gamePicks.some((pick) => !pickKind(pick) || (pickKind(pick) === "challenge" && !favoriteChallengeOptions(game).includes(pick)))) {
      throw new Error("One selected pick is not allowed.");
    }
  }
  for (const [id, gamePicks] of incomingPicks) {
    const game = gamesById.get(id);
    const existingPick = rawPicksForGame(existing?.picks || {}, id).join("|");
    if (isGameLockedForPlayer(game, savedName) && existingPick !== gamePicks.join("|")) {
      throw new Error(CHEAT_WARNING);
    }
  }
  if (!hasOpenBettableGame(date, savedName) && !incomingPicks.every(([id, gamePicks]) => rawPicksForGame(existing?.picks || {}, id).join("|") === gamePicks.join("|"))) {
    throw new Error(CHEAT_WARNING);
  }
  if (existing?.pinHash && existing.pinHash !== pinHash) {
    throw new Error("This name already has a bet. Use the same PIN to edit it.");
  }
  if (!state.settings.players.includes(savedName)) {
    const closeName = closePlayerName(savedName);
    if (closeName) {
      throw new Error(`Name looks like ${closeName}. Please choose it from the name list or ask admin if this is a new player.`);
    }
    if (state.settings.players.length >= maxPlayers()) {
      throw new Error(`Maximum ${maxPlayers()} players are allowed.`);
    }
    state.settings.players.push(savedName);
  }
  const mergedPicks = {};
  if (existing?.picks) {
    Object.entries(existing.picks).forEach(([id, pick]) => {
      const game = gamesById.get(id);
      if (game && isGameLockedForPlayer(game, savedName)) mergedPicks[id] = pick;
    });
  }
  incomingPicks.forEach(([id, pick]) => {
    const game = gamesById.get(id);
    if (!isGameLockedForPlayer(game, savedName) || existing?.picks?.[id] === pick) mergedPicks[id] = pick;
  });
  state.bets[date] ||= {};
  state.bets[date][savedName] = { picks: mergedPicks, pinHash, updatedAt: new Date().toISOString() };
  if (db) {
    await db.from("settings").upsert({ id: "main", data: state.settings, updated_at: new Date().toISOString() });
    await db.from("bets").upsert({
      match_date: date,
      player_name: savedName,
      picks: mergedPicks,
      pin_hash: pinHash,
      created_at: new Date().toISOString()
    });
  } else {
    saveLocal();
  }
  return savedName;
}

async function syncFixtures(silent = false) {
  const dates = Object.keys(DATE_COUNTS);
  if (!silent) showToast("Syncing fixtures and results...");
  let updated = 0;
  for (const date of dates) {
    try {
      const base = date === "2026-06-10" ? ESPN_FRIENDLY_BASE : ESPN_BASE;
      const url = `${base}?dates=${date.replaceAll("-", "")}`;
      const response = await fetch(url);
      if (!response.ok) continue;
      const data = await response.json();
      if (!data.events?.length) continue;
      const events = date === "2026-06-10"
        ? data.events.filter((event) => event.id !== "401875463")
        : data.events;
      const ownDateGames = [];
      for (const [idx, event] of events.entries()) {
        const synced = fromEspnEvent(event, date, idx + 1);
        if (synced.completed) {
          const half = state.settings.halfTimes?.[synced.id] || await fetchEspnHalfTimeScore(base, synced.id, synced.team1, synced.team2);
          if (half) {
            synced.htScore1 = half.score1;
            synced.htScore2 = half.score2;
            state.settings.halfTimes ||= {};
            state.settings.halfTimes[synced.id] = half;
          }
          if (synced.etScore1 !== null && synced.etScore2 !== null) {
            state.settings.extraTimes ||= {};
            state.settings.extraTimes[synced.id] = { score1: synced.etScore1, score2: synced.etScore2 };
          }
          if (synced.penaltyWinner) {
            state.settings.penaltyWinners ||= {};
            state.settings.penaltyWinners[synced.id] = synced.penaltyWinner;
          }
        }
        const targetDate = bettingDateForGame(synced, date);
        const targetGames = state.games[targetDate] || [];
        const existing = targetGames.find((game) => game.id === synced.id)
          || (targetDate === date ? targetGames.find((game) => game.index === synced.index) : null);
        const merged = {
          ...mergeSyncedGame(existing, synced),
          date: targetDate,
          index: SPECIAL_GAME_INDEX_OVERRIDES[synced.id] || synced.index
        };
        if (targetDate === date) {
          ownDateGames.push(merged);
        } else {
          state.games[targetDate] = cleanGamesForDate(targetDate, [
            ...(state.games[targetDate] || []).filter((game) => game.id !== merged.id),
            merged
          ]);
        }
      }
      state.games[date] = cleanGamesForDate(date, ownDateGames);
      updated += 1;
    } catch {
      // Manual data remains available if the public feed is temporarily unreachable.
    }
  }
  await persist();
  renderAll();
  if (!silent) showToast(updated ? `Synced ${updated} match days.` : "No live fixtures were available.");
}

function mergeSyncedGame(existing, synced) {
  if (!existing) return synced;
  const team1Missing = !synced.team1 || synced.team1 === "Team 1 TBD";
  const team2Missing = !synced.team2 || synced.team2 === "Team 2 TBD";
  return {
    ...existing,
    ...synced,
    team1: team1Missing ? existing.team1 : synced.team1,
    team2: team2Missing ? existing.team2 : synced.team2,
    htScore1: synced.htScore1 ?? existing.htScore1 ?? null,
    htScore2: synced.htScore2 ?? existing.htScore2 ?? null,
    etScore1: synced.etScore1 ?? existing.etScore1 ?? null,
    etScore2: synced.etScore2 ?? existing.etScore2 ?? null,
    penaltyWinner: synced.penaltyWinner || existing.penaltyWinner || "",
    venue: synced.venue || existing.venue,
    time: synced.time || existing.time
  };
}

async function fetchEspnHalfTimeScore(base, eventId, team1, team2) {
  try {
    const response = await fetch(`${base.replace("scoreboard", "summary")}?event=${eventId}`);
    if (!response.ok) return null;
    const data = await response.json();
    const events = Array.isArray(data.keyEvents) ? data.keyEvents : [];
    const score = { score1: 0, score2: 0 };
    events
      .filter((event) => event.scoringPlay && Number(event.period?.number) === 1 && !event.shootout)
      .forEach((event) => {
        const scorer = String(event.team?.displayName || "");
        if (sameTeamName(scorer, team1)) score.score1 += 1;
        else if (sameTeamName(scorer, team2)) score.score2 += 1;
      });
    return score;
  } catch {
    return null;
  }
}

function sameTeamName(left, right) {
  const clean = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return clean(left) === clean(right);
}

function lineScoreValue(competitor, period) {
  const row = (competitor.linescores || []).find((item) => Number(item.period) === period);
  const value = Number(row?.value ?? row?.score ?? row?.displayValue);
  return Number.isFinite(value) ? value : 0;
}

function extraTimeScore(home, away) {
  const homeExtra = lineScoreValue(home, 3) + lineScoreValue(home, 4);
  const awayExtra = lineScoreValue(away, 3) + lineScoreValue(away, 4);
  if (!homeExtra && !awayExtra) return null;
  return {
    score1: Number(home.score) || 0,
    score2: Number(away.score) || 0
  };
}

function penaltyWinner(home, away) {
  const homePens = Number(home.shootoutScore ?? home.penaltyScore ?? home.penalties);
  const awayPens = Number(away.shootoutScore ?? away.penaltyScore ?? away.penalties);
  if (!Number.isFinite(homePens) || !Number.isFinite(awayPens) || homePens === awayPens) return "";
  return homePens > awayPens ? "1" : "2";
}

function fromEspnEvent(event, date, index) {
  const competition = event.competitions?.[0] || {};
  const competitors = competition.competitors || [];
  const home = competitors.find((item) => item.homeAway === "home") || competitors[0] || {};
  const away = competitors.find((item) => item.homeAway === "away") || competitors[1] || {};
  const extra = extraTimeScore(home, away);
  return {
    id: event.id || `${date}-${index}`,
    date,
    index,
    team1: home.team?.displayName || home.team?.name || "Team 1 TBD",
    team2: away.team?.displayName || away.team?.name || "Team 2 TBD",
    time: event.date || "",
    venue: competition.venue?.fullName || event.venue?.displayName || "",
    score1: Number.isFinite(Number(home.score)) ? Number(home.score) : null,
    score2: Number.isFinite(Number(away.score)) ? Number(away.score) : null,
    htScore1: state.settings.halfTimes?.[event.id]?.score1 ?? null,
    htScore2: state.settings.halfTimes?.[event.id]?.score2 ?? null,
    etScore1: extra?.score1 ?? state.settings.extraTimes?.[event.id]?.score1 ?? null,
    etScore2: extra?.score2 ?? state.settings.extraTimes?.[event.id]?.score2 ?? null,
    penaltyWinner: penaltyWinner(home, away) || state.settings.penaltyWinners?.[event.id] || "",
    completed: Boolean(event.status?.type?.completed || competition.status?.type?.completed),
    source: "espn"
  };
}

function renderAll() {
  renderMetrics();
  renderDailyWinnerBanner();
  renderDates();
  renderBetPanel();
  renderAdmin();
  renderTables();
  renderHistory();
  renderResults();
  renderStatsDates();
  renderStats();
  renderPlayerStats();
  lucide.createIcons();
}

function renderMetrics() {
  const calc = calculate();
  $("entryMetric").textContent = money(state.settings.entryAmount);
  $("playersMetric").textContent = `${calc.players.length}/${maxPlayers()}`;
  $("rolloverMetric").textContent = money(calc.totalPot || 0);
}

function renderDates() {
  const select = $("dateSelect");
  const current = select.value || nearestPlayableDate();
  select.innerHTML = Object.keys(DATE_COUNTS)
    .map((date) => `<option value="${date}">${prettyDate(date)} · ${DATE_COUNTS[date]} game${DATE_COUNTS[date] > 1 ? "s" : ""}</option>`)
    .join("");
  select.value = DATE_COUNTS[current] ? current : nearestPlayableDate();
}

function renderBetPanel() {
  const date = getActiveDate();
  const games = state.games[date] || [];
  const rule = ruleForCount(games.length);
  const counts = selectionCounts();
  $("activeDateTitle").textContent = prettyDate(date);
  $("dayRuleStrip").innerHTML = Object.entries(rule)
    .filter(([, amount]) => amount > 0)
    .map(([kind, amount]) => `<span class="rule-pill">${amount} ${kind}</span>`)
    .join("");

  $("gamesList").innerHTML = games
    .map((game) => {
      const selected = selections[game.id] || "";
      const kind = pickKind(selected);
      const possibleKinds = Object.keys(rule).filter((key) => rule[key] > 0);
      const typeButtons = possibleKinds
        .map((key) => {
          const full = counts[key] >= rule[key] && key !== kind;
          return `<button class="pick-button ${key === kind ? "selected" : ""}" type="button" data-type="${key}" data-game="${game.id}" ${full ? "disabled" : ""}>${key}</button>`;
        })
        .join("");
      const optionButtons = kind
        ? allowedOptions(kind)
            .map((option) => `<button class="pick-button ${option === selected ? "selected" : ""}" type="button" data-pick="${option}" data-game="${game.id}">${option}</button>`)
            .join("")
        : `<span class="small">Choose pick type first</span>`;
      return `<article class="game-card">
        <div class="game-meta"><span>Game ${game.index}</span><span>${game.time ? new Date(game.time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Time TBD"}</span></div>
        <div class="teams">
          <div class="team-row"><strong>${escapeHtml(game.team1)}</strong><span>1</span></div>
          <div class="team-row"><strong>${escapeHtml(game.team2)}</strong><span>2</span></div>
        </div>
        <div class="small">${escapeHtml(game.venue || "Venue TBD")}${game.completed ? ` · Final ${game.score1}-${game.score2}` : ""}</div>
        <div class="pick-type"><span>Pick type</span><span>${kind || "none"}</span></div>
        <div class="pick-grid">${typeButtons}</div>
        <div class="pick-type"><span>Pick</span></div>
        <div class="pick-grid">${optionButtons}</div>
      </article>`;
    })
    .join("");

  const locked = !hasOpenBettableGame(date);
  $("saveBetButton").disabled = locked;
  $("saveBetButton").querySelector("span").textContent = locked ? "Bets locked" : "Save my bet";
}

function selectionCounts() {
  return Object.values(selections).reduce(
    (acc, value) => {
      const kind = pickKind(value);
      if (kind) acc[kind] += 1;
      return acc;
    },
    { result: 0, goals: 0, double: 0 }
  );
}

function renderAdmin() {
  $("adminLock").classList.toggle("hidden", adminUnlocked);
  $("adminContent").classList.toggle("hidden", !adminUnlocked);
  if (!adminUnlocked) return;
  $("entryAmount").value = state.settings.entryAmount;
  $("maxPlayersInput").value = maxPlayers();
  $("adminPlayersList").textContent = state.settings.players.length
    ? `${state.settings.players.join(", ")} (${state.settings.players.length}/${maxPlayers()})`
    : `No players registered yet. First saved bet becomes player 1/${maxPlayers()}.`;
  $("adminRules").innerHTML = [1, 2, 3, 4, 6]
    .map((count) => {
      const rule = ruleForCount(count);
      return `<div class="admin-rule-row">
        <strong>${count} game${count > 1 ? "s" : ""}</strong>
        <label class="field"><span>Result</span><input data-rule-count="${count}" data-rule-kind="result" type="number" min="0" max="${count}" value="${rule.result}" /></label>
        <label class="field"><span>Goals</span><input data-rule-count="${count}" data-rule-kind="goals" type="number" min="0" max="${count}" value="${rule.goals}" /></label>
        <label class="field"><span>Double</span><input data-rule-count="${count}" data-rule-kind="double" type="number" min="0" max="${count}" value="${rule.double}" /></label>
      </div>`;
    })
    .join("");
  $("adminResults").innerHTML = Object.keys(DATE_COUNTS)
    .map((date) => {
      const rows = (state.games[date] || [])
        .map((game) => `<div class="result-grid">
          <div class="small">${prettyDate(date)} · ${escapeHtml(game.team1)} vs ${escapeHtml(game.team2)}</div>
          <input data-score1="${game.id}" type="number" min="0" value="${game.score1 ?? ""}" placeholder="1" />
          <input data-score2="${game.id}" type="number" min="0" value="${game.score2 ?? ""}" placeholder="2" />
        </div>`)
        .join("");
      return `<article class="game-card">${rows}</article>`;
    })
    .join("");
}

function renderAdminLateUnlocks() {
  const dateSelect = $("adminLateDateSelect");
  const gamesList = $("adminLateGamesList");
  const unlockList = $("adminLateUnlockList");
  if (!dateSelect || !gamesList || !unlockList) return;
  const dates = Object.keys(DATE_COUNTS);
  selectedAdminLateDate = selectedAdminLateDate && DATE_COUNTS[selectedAdminLateDate] ? selectedAdminLateDate : getActiveDate();
  dateSelect.innerHTML = dates
    .map((date) => `<option value="${date}" ${date === selectedAdminLateDate ? "selected" : ""}>${prettyDate(date)}</option>`)
    .join("");
  const player = $("adminLatePlayerName")?.value?.trim() || "";
  const unlockedIds = new Set(lateUnlockGameIds(selectedAdminLateDate, player));
  const games = state.games[selectedAdminLateDate] || [];
  gamesList.innerHTML = games.length
    ? games.map((game) => {
        const started = gameStarted(game) || completedGame(game);
        return `<label class="late-game-row ${started ? "muted-row" : ""}">
          <input type="checkbox" data-late-game="${game.id}" ${unlockedIds.has(game.id) ? "checked" : ""} ${started ? "disabled" : ""} />
          <span><strong>G${game.index}</strong> ${escapeHtml(game.team1)} vs ${escapeHtml(game.team2)}${started ? " - started/locked" : ""}</span>
        </label>`;
      }).join("")
    : `<div class="empty">No games available for this day.</div>`;
  const rows = Object.entries(state.settings.lateUnlocks || {}).flatMap(([date, players]) =>
    Object.entries(players || {}).map(([player, ids]) => ({ date, player, ids: ids || [] }))
  ).filter((row) => row.ids.length);
  unlockList.innerHTML = rows.length
    ? rows.map((row) => `<article class="admin-unlock-row">
        <div><strong>${escapeHtml(row.player)}</strong><div class="small">${prettyDate(row.date)} - ${row.ids.length} unlocked game${row.ids.length === 1 ? "" : "s"}</div></div>
        <button class="danger-button" type="button" data-clear-unlock-date="${row.date}" data-clear-unlock-player="${escapeHtml(row.player)}">Clear</button>
      </article>`).join("")
    : `<div class="empty">No late unlocks saved.</div>`;
}

function calculate() {
  const players = realPlayers([...state.settings.players, ...betPlayerNames()]);
  const entry = Number(state.settings.entryAmount) || 0;
  const totals = Object.fromEntries(players.map((player) => [player, { entries: 0, winnings: 0, balance: 0 }]));
  const daily = [];
  let rollover = 0;

  Object.keys(DATE_COUNTS).forEach((date) => {
    const games = state.games[date] || [];
    const complete = games.length > 0 && games.every((game) => game.completed && game.score1 !== null && game.score2 !== null);
    if (!complete) {
      daily.push({ date, bank: rollover + players.length * entry, winners: [], rolloverIn: rollover, rolloverOut: rollover, complete });
      return;
    }

    const bank = rollover + players.length * entry;
    players.forEach((player) => {
      totals[player].entries += entry;
    });

    const winners = complete
      ? players.filter((player) => {
          const picks = getBetPicks(state.bets[date]?.[player]);
          return picks && games.every((game) => pickWins(picks[game.id], game));
        })
      : [];

    if (complete && winners.length) {
      const share = bank / winners.length;
      winners.forEach((player) => {
        totals[player].winnings += share;
      });
      daily.push({ date, bank, winners, rolloverIn: rollover, rolloverOut: 0, complete });
      rollover = 0;
    } else {
      const newRollover = bank;
      daily.push({ date, bank, winners, rolloverIn: rollover, rolloverOut: newRollover, complete });
      rollover = newRollover;
    }
  });

  players.forEach((player) => {
    totals[player].balance = totals[player].winnings - totals[player].entries;
  });

  return { players, totals, daily, currentRollover: rollover, settlements: settlements(totals) };
}

function pickWins(pick, game) {
  if (!pick) return false;
  const result = game.score1 > game.score2 ? "1" : game.score1 < game.score2 ? "2" : "X";
  const total = game.score1 + game.score2;
  if (RESULT_OPTIONS.includes(pick)) return pick === result;
  if (pick === "1X") return result === "1" || result === "X";
  if (pick === "X2") return result === "X" || result === "2";
  if (pick === "12") return result === "1" || result === "2";
  if (pick === "O2") return total > 2;
  if (pick === "U2") return total <= 2;
  return false;
}

function settlements(totals) {
  const debtors = [];
  const creditors = [];
  Object.entries(totals).forEach(([player, total]) => {
    const amount = Math.round(total.balance * 100) / 100;
    if (amount < 0) debtors.push({ player, amount: -amount });
    if (amount > 0) creditors.push({ player, amount });
  });
  const rows = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].amount, creditors[j].amount);
    if (amount > 0.004) rows.push({ from: debtors[i].player, to: creditors[j].player, amount });
    debtors[i].amount -= amount;
    creditors[j].amount -= amount;
    if (debtors[i].amount < 0.005) i += 1;
    if (creditors[j].amount < 0.005) j += 1;
  }
  return rows;
}

function renderTables() {
  const calc = calculate();
  const rows = Object.entries(calc.totals).sort((a, b) => b[1].balance - a[1].balance);
  const max = Math.max(1, ...rows.map(([, total]) => Math.abs(total.balance)));
  $("standingsList").innerHTML = rows.length
    ? rows.map(([player, total]) => `<article class="standing-card">
        <div>
          <strong>${escapeHtml(player)}</strong>
          <div class="small">Won ${money(total.winnings)} · Entry ${money(total.entries)}</div>
        </div>
        <div class="money ${total.balance >= 0 ? "positive" : "negative"}">${money(total.balance)}</div>
        <div class="bar"><span style="width:${Math.max(4, (Math.abs(total.balance) / max) * 100)}%"></span></div>
      </article>`)
        .join("")
    : `<div class="empty">Add players in Settings.</div>`;

  $("settlementList").innerHTML = calc.settlements.length
    ? calc.settlements.map((row) => `<article class="settlement-card"><strong>${escapeHtml(row.from)}</strong> sends <strong>${money(row.amount)}</strong> to <strong>${escapeHtml(row.to)}</strong></article>`).join("")
    : `<div class="empty">No payments needed yet.</div>`;

  $("dailyList").innerHTML = calc.daily
    .filter((day) => day.complete || day.winners.length)
    .map((day) => `<article class="daily-card">
      <strong>${prettyDate(day.date)}</strong>
      <div class="small">Bank ${money(day.bank)} · ${day.winners.length ? `Winner${day.winners.length > 1 ? "s" : ""}: ${day.winners.map(escapeHtml).join(", ")}` : "No winners, rollover"}</div>
    </article>`)
    .join("") || `<div class="empty">Daily results will appear after final scores are entered or synced.</div>`;
}

function renderHistory() {
  $("historyList").innerHTML = Object.keys(DATE_COUNTS)
    .map((date) => {
      const bets = state.bets[date] || {};
      const players = Object.keys(bets);
      if (!players.length) return "";
      const games = state.games[date] || [];
      const complete = games.length > 0 && games.every((game) => game.completed && game.score1 !== null && game.score2 !== null);
      const playerRows = players
        .sort((a, b) => a.localeCompare(b))
        .map((player) => {
          const picks = getBetPicks(bets[player]) || {};
          const allCorrect = complete && games.every((game) => pickWins(picks[game.id], game));
          const status = complete ? (allCorrect ? "Won" : "Lost") : "Pending";
          const statusClass = complete ? (allCorrect ? "win" : "loss") : "";
          const lines = games
            .map((game) => {
              const gameComplete = game.completed && game.score1 !== null && game.score2 !== null;
              const marker = gameComplete
                ? (pickWins(picks[game.id], game)
                    ? `<span class="pick-result correct" title="Correct">✓</span>`
                    : `<span class="pick-result wrong" title="Wrong">X</span>`)
                : `<span class="pick-result"></span>`;
              return `<div class="pick-line">
              <span>G${game.index}</span>
              <strong>${escapeHtml(game.team1)} vs ${escapeHtml(game.team2)}</strong>
              <span>${escapeHtml(picks[game.id] || "-")}</span>
              ${marker}
            </div>`;
            })
            .join("");
          return `<div class="history-player">
            <div class="history-player-head">
              <strong>${escapeHtml(player)}</strong>
              <span class="status-pill ${statusClass}">${status}</span>
            </div>
            <div class="pick-lines">${lines}</div>
          </div>`;
        })
        .join("");
      return `<article class="history-day">
        <div class="game-meta"><strong>${prettyDate(date)}</strong><span>${players.length} bet${players.length > 1 ? "s" : ""}</span></div>
        ${playerRows}
      </article>`;
    })
    .join("") || `<div class="empty">Saved bets will appear here.</div>`;
}

function validateSelections(date) {
  const games = state.games[date] || [];
  const rule = ruleForCount(games.length);
  const counts = selectionCounts();
  if (games.some((game) => !selections[game.id])) return "Pick one option for every game.";
  if (games.some((game) => selections[game.id] && isGameLocked(game))) return "One selected game is locked. Only open games can be saved.";
  for (const [kind, amount] of Object.entries(rule)) {
    if (counts[kind] !== amount) return `This day needs exactly ${amount} ${kind} pick${amount > 1 ? "s" : ""}.`;
  }
  return "";
}

function bindEvents() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      activateTab(tab.dataset.tab);
    });
  });

  $("dateSelect").addEventListener("change", () => {
    selections = {};
    renderBetPanel();
  });

  $("statsDateSelect")?.addEventListener("change", () => {
    closePathPanel();
    renderStats();
  });
  $("pathToggleButton")?.addEventListener("click", () => {
    $("knockoutPathPanel")?.classList.toggle("hidden");
  });
  $("playerStatsSelect")?.addEventListener("change", renderPlayerStats);

  $("playerName")?.addEventListener("input", renderBetPanel);

  $("gamesList").addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const gameId = button.dataset.game;
    if (button.dataset.type) {
      const game = (state.games[getActiveDate()] || []).find((item) => item.id === gameId);
      selections[gameId] = (button.dataset.type === "challenge" ? favoriteChallengeOptions(game) : allowedOptions(button.dataset.type))[0];
    }
    if (button.dataset.pick) {
      selections[gameId] = button.dataset.pick;
    }
    renderBetPanel();
  });

  $("betForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const date = getActiveDate();
    const playerName = $("playerName").value.trim();
    const playerPin = $("playerPin").value.trim();
    if (!playerName) return showToast("Please enter your name.");
    if (playerPin.length < 4) return showToast("Please enter a PIN with at least 4 characters.");
    if (!hasOpenBettableGame(date, playerName)) return showToast(CHEAT_WARNING);
    const error = validateSelections(date);
    if (error) return showToast(error);
    try {
      await saveBet(date, playerName, playerPin, { ...selections });
    } catch (error) {
      return showToast(error.message);
    }
    clearBetForm();
    await syncFixtures(true);
    renderAll();
    showToast("Bet saved. Same name and PIN can edit it before cutoff.");
  });

  $("resetBetButton").addEventListener("click", () => {
    selections = {};
    renderBetPanel();
    showToast("Picks reset.");
  });

  $("loadBetButton").addEventListener("click", async () => {
    const date = getActiveDate();
    const playerName = $("playerName").value.trim();
    const playerPin = $("playerPin").value.trim();
    if (!playerName) return showToast("Enter your name first.");
    if (playerPin.length < 4) return showToast("Enter your PIN first.");
    const savedName = findPlayerName(playerName) || playerName;
    const existing = state.bets[date]?.[savedName];
    if (!existing) return showToast("No saved bet found for this name today.");
    if (existing.pinHash && existing.pinHash !== await hashPin(playerPin)) {
      return showToast("Wrong PIN for this saved bet.");
    }
    selections = { ...(getBetPicks(existing) || {}) };
    renderBetPanel();
    showToast("Login successful. Your saved picks are loaded.");
  });

  $("unlockAdminButton").addEventListener("click", async () => {
    const pin = $("adminPin").value.trim();
    if (!ADMIN_PIN_HASH) return showToast("Admin PIN is not configured.");
    if (await hashPin(pin) !== ADMIN_PIN_HASH) return showToast("Wrong admin PIN.");
    adminUnlocked = true;
    renderAll();
    showToast("Admin unlocked.");
  });

  $("saveSettingsButton").addEventListener("click", async () => {
    if (!adminUnlocked) return showToast("Unlock admin first.");
    const nextMaxPlayers = Math.min(ABSOLUTE_MAX_PLAYERS, Math.max(MIN_PLAYERS, Number($("maxPlayersInput").value) || ABSOLUTE_MAX_PLAYERS));
    if (state.settings.players.length > nextMaxPlayers) {
      return showToast(`You already have ${state.settings.players.length} players. Max cannot be lower than that.`);
    }
    const nextRules = { ...state.settings.rules };
    for (const count of [1, 2, 3, 4, 6]) {
      const rule = { result: 0, goals: 0, double: 0 };
      document.querySelectorAll(`[data-rule-count="${count}"]`).forEach((input) => {
        rule[input.dataset.ruleKind] = Math.max(0, Number(input.value) || 0);
      });
      if (rule.result + rule.goals + rule.double !== count) {
        return showToast(`${count} game rule must add up to ${count} picks.`);
      }
      nextRules[count] = rule;
    }
    state.settings.entryAmount = Number($("entryAmount").value) || 0;
    state.settings.maxPlayers = nextMaxPlayers;
    state.settings.rules = nextRules;
    await persist();
    renderAll();
    showToast("Settings saved.");
  });

  $("adminFavoriteControls").addEventListener("change", async (event) => {
    if (!adminUnlocked) return showToast("Unlock admin first.");
    const input = event.target;
    const gameId = input.dataset.favoriteGame;
    if (!gameId) return;
    state.settings.favoriteChallenges ||= {};
    if (!input.value) delete state.settings.favoriteChallenges[gameId];
    else state.settings.favoriteChallenges[gameId] = { enabled: true, side: input.value, source: "admin" };
    await persist();
    renderAll();
    showToast("Favorite challenge saved.");
  });

  $("adminLateDateSelect")?.addEventListener("change", (event) => {
    selectedAdminLateDate = event.target.value;
    renderAdminLateUnlocks();
  });

  $("adminLatePlayerName")?.addEventListener("input", renderAdminLateUnlocks);

  $("saveLateUnlockButton")?.addEventListener("click", async () => {
    if (!adminUnlocked) return showToast("Unlock admin first.");
    const date = selectedAdminLateDate || $("adminLateDateSelect")?.value;
    const player = $("adminLatePlayerName")?.value?.trim();
    if (!date || !player) return showToast("Choose a match day and enter player name.");
    const ids = [...document.querySelectorAll("[data-late-game]:checked")].map((input) => input.dataset.lateGame);
    state.settings.lateUnlocks ||= {};
    state.settings.lateUnlocks[date] ||= {};
    if (ids.length) state.settings.lateUnlocks[date][player] = ids;
    else delete state.settings.lateUnlocks[date][player];
    if (!Object.keys(state.settings.lateUnlocks[date]).length) delete state.settings.lateUnlocks[date];
    await persist();
    renderAll();
    showToast(ids.length ? `Late unlock saved for ${player}.` : `Late unlock cleared for ${player}.`);
  });

  $("adminLateUnlockList")?.addEventListener("click", async (event) => {
    if (!adminUnlocked) return showToast("Unlock admin first.");
    const button = event.target.closest("button[data-clear-unlock-date]");
    if (!button) return;
    const date = button.dataset.clearUnlockDate;
    const player = button.dataset.clearUnlockPlayer;
    if (!state.settings.lateUnlocks?.[date]?.[player]) return;
    delete state.settings.lateUnlocks[date][player];
    if (!Object.keys(state.settings.lateUnlocks[date]).length) delete state.settings.lateUnlocks[date];
    await persist();
    renderAll();
    showToast(`Late unlock cleared for ${player}.`);
  });

  $("adminResults").addEventListener("change", async (event) => {
    if (!adminUnlocked) return showToast("Unlock admin first.");
    const input = event.target;
    const id = input.dataset.score1 || input.dataset.score2;
    if (!id) return;
    Object.values(state.games).flat().forEach((game) => {
      if (game.id !== id) return;
      if (input.dataset.score1) game.score1 = input.value === "" ? null : Number(input.value);
      if (input.dataset.score2) game.score2 = input.value === "" ? null : Number(input.value);
      game.completed = game.score1 !== null && game.score2 !== null;
    });
    await persist();
    renderAll();
  });

  $("syncButton")?.addEventListener("click", syncFixtures);
  $("recalculateButton").addEventListener("click", renderAll);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

let toastTimer = null;
function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

function selectedPickCount(picks = selections) {
  return Object.keys(picks || {}).reduce((sum, gameId) => sum + picksForGame(picks, gameId).length, 0);
}

function countedPickCount(date, picks = selections) {
  return Object.keys(picks || {}).filter((gameId) => countedPicksForGame(date, picks, gameId).length).length;
}

function completedGame(game) {
  return game.completed && game.score1 !== null && game.score2 !== null;
}

function gameStarted(game) {
  return Boolean(game?.time) && Date.now() >= new Date(game.time).getTime();
}

function lateUnlockGameIds(date, playerName) {
  const player = String(playerName || "").trim().toLowerCase();
  if (!player) return [];
  const dayUnlocks = state.settings.lateUnlocks?.[date] || {};
  const key = Object.keys(dayUnlocks).find((name) => name.toLowerCase() === player);
  return key ? dayUnlocks[key] || [] : [];
}

function hasLateUnlock(game, playerName) {
  return lateUnlockGameIds(game?.date, playerName).includes(game?.id);
}

function isGameLocked(game) {
  if (!game?.time) return false;
  if (SPECIAL_GAME_LOCK_OVERRIDES.has(String(game.id))) {
    return gameStarted(game);
  }
  return isLocked(game.date);
}

function isGameLockedForPlayer(game, playerName) {
  if (hasLateUnlock(game, playerName) && !gameStarted(game) && !completedGame(game)) return false;
  return isGameLocked(game);
}

function hasOpenBettableGame(date, playerName = "") {
  return (state.games[date] || []).some((game) => !isGameLockedForPlayer(game, playerName));
}

function matchDayComplete(date) {
  const games = state.games[date] || [];
  return games.length > 0 && games.every(completedGame);
}

function nearestPlayableDate() {
  const today = todayKey();
  return Object.keys(DATE_COUNTS).find((date) => date >= today && !matchDayComplete(date)) || Object.keys(DATE_COUNTS).at(-1);
}

function gameResultText(game) {
  if (!completedGame(game)) return "Pending";
  return `${game.score1}-${game.score2}`;
}

function countedDate(date) {
  return !TEST_ONLY_DATES.has(date);
}

function dailyPlayerPoints(date, player) {
  return dailyPlayerPointBreakdown(date, player).total;
}

function dailyPlayerPointBreakdown(date, player) {
  const games = state.games[date] || [];
  const picks = getBetPicks(state.bets[date]?.[player]) || {};
  const selectedGames = games.filter((game) => countedPicksForGame(date, picks, game.id).length);
  let soloBonusPoints = 0;
  const basePoints = games.reduce((sum, game) => {
    const gamePicks = countedPicksForGame(date, picks, game.id);
    if (!completedGame(game) || !gamePicks.length) return sum;
    const correctPicks = gamePicks.filter((pick) => pickWins(pick, game));
    if (!correctPicks.length) return sum;
    const correctPlayers = correctPlayersForGame(date, game);
    if (correctPlayers.length === 1 && correctPlayers[0] === player) soloBonusPoints += soloGameBonus();
    return sum + correctPicks.reduce((pickSum, pick) => pickSum + pickPoints(pick), 0);
  }, 0);
  const allSelectedCorrect = selectedGames.length > 0 && selectedGames.every((game) => completedGame(game) && countedPicksForGame(date, picks, game.id).every((pick) => pickWins(pick, game)));
  const perfectBonusPoints = games.length > 1 && allSelectedCorrect ? perfectDayBonus() : 0;
  const bonusPoints = soloBonusPoints + perfectBonusPoints;
  return { base: basePoints, soloBonus: soloBonusPoints, perfectBonus: perfectBonusPoints, bonus: bonusPoints, total: basePoints + bonusPoints };
}

function renderBetPanel() {
  const date = getActiveDate();
  const games = state.games[date] || [];
  const values = pointValues();
  const selectedCount = countedPickCount(date);
  const playerName = $("playerName")?.value?.trim() || "";
  const nameOptions = $("playerNameOptions");
  if (nameOptions) {
    nameOptions.innerHTML = state.settings.players.map((player) => `<option value="${escapeHtml(player)}"></option>`).join("");
  }
  const cost = selectedCount * (Number(state.settings.entryAmount) || 0);
  $("activeDateTitle").textContent = `${prettyDate(date)}${countedDate(date) ? "" : " - test only"}`;
  $("dayRuleStrip").innerHTML = [
    `<span class="rule-pill">1 pick per selected game</span>`,
    `<span class="rule-pill">Result ${values.result} pts</span>`,
    `<span class="rule-pill">Goals ${values.goals} pts</span>`,
    `<span class="rule-pill">1st half result ${values.halfResult} pts</span>`,
    `<span class="rule-pill">1st half O/U1.5 ${values.halfGoals} pts</span>`,
    `<span class="rule-pill">Exact score ${values.exactScore} pts</span>`,
    `<span class="rule-pill">GG/NG ${values.both} pts</span>`,
    `<span class="rule-pill">Double ${values.double} pt</span>`,
    `<span class="rule-pill">Extra time 1/X/2 ${values.extraResult} pts</span>`,
    `<span class="rule-pill">Penalty winner ${values.penalty} pts</span>`,
    `<span class="rule-pill">Favorite margin ${values.challenge2}/${values.challenge3} pts</span>`,
    `<span class="rule-pill">Solo correct bonus ${soloGameBonus()} pts</span>`,
    `<span class="rule-pill">All correct bonus ${perfectDayBonus()} pts</span>`
  ].join("");
  $("betCost").innerHTML = `<strong>${selectedCount}</strong> selected game${selectedCount === 1 ? "" : "s"} &middot; Cost ${money(cost)}`;
  $("currentResults").innerHTML = renderMiniResults(date);
  $("gamesList").innerHTML = games.map((game) => renderGameCard(game, playerName)).join("");
  $("nextMatchdayPreview").innerHTML = renderNextMatchdayPreview(date);

  const locked = !hasOpenBettableGame(date, playerName);
  $("saveBetButton").disabled = locked;
  $("saveBetButton").querySelector("span").textContent = locked ? "Bets locked" : "Save my bet";
}

function renderGameCard(game, playerName = "") {
  const rawPicks = rawPicksForGame(selections, game.id);
  const completePicks = picksForGame(selections, game.id);
  const selectedKinds = new Set(rawPicks.map(pickKind).filter(Boolean));
  const normalPicks = normalPicksForGame(selections, game.id);
  const maxed = normalPicks.length >= MAX_PICKS_PER_GAME;
  const locked = isGameLockedForPlayer(game, playerName);
  const challenge = favoriteChallenge(game);
  const typeKeys = challenge
    ? ["result", "goals", "halfResult", "halfGoals", "exactScore", "both", "double", "challenge"]
    : ["result", "goals", "halfResult", "halfGoals", "exactScore", "both", "double"];
  const typeButtons = typeKeys
    .map((key) => {
      const label = key === "both"
        ? "GG/NG"
        : key === "challenge"
          ? "Favorite+"
          : key === "halfResult"
            ? "1st half 1X2"
            : key === "halfGoals"
              ? "goals HT"
              : key === "exactScore"
                ? "Exact score"
                : key;
      const selected = selectedKinds.has(key);
      const disabled = locked || (maxed && !selected);
      const cleanLabel = key === "halfResult" ? "result HT" : label;
      return `<button class="pick-button ${selected ? "selected" : ""}" type="button" data-type="${key}" data-game="${game.id}" ${disabled ? "disabled" : ""}>${cleanLabel}</button>`;
    })
    .join("");
  const selectedSections = typeKeys
    .filter((key) => selectedKinds.has(key))
    .map((key) => {
      const currentPick = rawPicks.find((pick) => pickKind(pick) === key) || "";
      const exact = exactScoreInfo(currentPick);
      const partialExact = String(currentPick || "").match(/^ES:([0-9]?)-([0-9]?)$/);
      const label = key === "halfResult" ? "result HT" : key === "halfGoals" ? "goals HT" : key === "exactScore" ? "Exact score" : key === "both" ? "GG/NG" : key === "challenge" ? "Favorite+" : key;
      const body = key === "exactScore"
        ? `<div class="exact-score-pick" data-exact-game="${game.id}">
        <input data-exact-side="1" data-game="${game.id}" type="text" inputmode="numeric" pattern="[0-9]" maxlength="1" value="${escapeHtml(String(exact?.score1 ?? partialExact?.[1] ?? ""))}" placeholder="0" aria-label="${escapeHtml(game.team1)} exact score" ${locked ? "disabled" : ""} />
        <span>-</span>
        <input data-exact-side="2" data-game="${game.id}" type="text" inputmode="numeric" pattern="[0-9]" maxlength="1" value="${escapeHtml(String(exact?.score2 ?? partialExact?.[2] ?? ""))}" placeholder="0" aria-label="${escapeHtml(game.team2)} exact score" ${locked ? "disabled" : ""} />
      </div>`
        : (key === "challenge" ? favoriteChallengeOptions(game) : allowedOptions(key))
          .map((option) => `<button class="pick-button ${option === currentPick ? "selected" : ""}" type="button" data-pick="${option}" data-game="${game.id}" ${locked ? "disabled" : ""}>${escapeHtml(pickLabel(option, game))}</button>`)
          .join("");
      return `<div class="pick-section"><div class="pick-type"><span>${escapeHtml(label)}</span></div><div class="pick-grid">${body}</div></div>`;
    }).join("") || `<span class="small">Choose up to ${MAX_PICKS_PER_GAME} bet types for this game</span>`;
  const extraPick = rawPicks.find((pick) => pickKind(pick) === "extraResult") || "";
  const penaltyPick = rawPicks.find((pick) => pickKind(pick) === "penalty") || "";
  const extraOpen = extraOpenGames.has(game.id) || Boolean(extraPick);
  const extraOptions = extraOpen
    ? `<div class="pick-section extra-section-body">
        <div class="pick-type"><span>extra time result</span><span>4 pts</span></div>
        <div class="pick-grid">${EXTRA_RESULT_OPTIONS.map((option) => `<button class="pick-button ${option === extraPick ? "selected" : ""}" type="button" data-pick="${option}" data-game="${game.id}" ${locked ? "disabled" : ""}>${escapeHtml(pickLabel(option, game))}</button>`).join("")}</div>
        ${extraPick === "EX" ? `<div class="pick-type penalty-label"><span>penalty winner</span><span>+4 pts</span></div>
        <div class="pick-grid">${PENALTY_OPTIONS.map((option) => `<button class="pick-button ${option === penaltyPick ? "selected" : ""}" type="button" data-pick="${option}" data-game="${game.id}" ${locked ? "disabled" : ""}>${escapeHtml(pickLabel(option, game))}</button>`).join("")}</div>` : ""}
      </div>`
    : "";
  const clearButton = rawPicks.length && !locked ? `<button class="text-button" type="button" data-clear="${game.id}">Clear this game</button>` : "";
  const challengeBadge = challenge
    ? `<div class="challenge-badge">Favorite Challenge: ${escapeHtml(challenge.side === "1" ? game.team1 : game.team2)} has extra margin picks</div>`
    : "";
  return `<article class="game-card">
    <div class="game-meta"><span>Game ${game.index}${locked ? " · locked" : ""}</span><span>${game.time ? new Date(game.time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Time TBD"}</span></div>
    ${challengeBadge}
    <div class="teams">
      <div class="team-row"><strong>${escapeHtml(game.team1)}</strong><span>1</span></div>
      <div class="team-row"><strong>${escapeHtml(game.team2)}</strong><span>2</span></div>
    </div>
    <div class="small">${escapeHtml(game.venue || "Venue TBD")}${completedGame(game) ? ` &middot; Final ${game.score1}-${game.score2}` : ""}</div>
    <div class="pick-type"><span>Pick type</span><span>${normalPicks.length}/${MAX_PICKS_PER_GAME}</span></div>
    <div class="pick-grid">${typeButtons}</div>
    ${selectedSections}
    <div class="extra-time-box">
      <button class="extra-toggle ${extraOpen ? "selected" : ""}" type="button" data-extra-toggle="${game.id}" data-game="${game.id}" ${locked ? "disabled" : ""}>if extra time</button>
      ${extraOptions}
    </div>
    ${clearButton}
  </article>`;
}

function renderMiniResults(date) {
  const completed = (state.games[date] || []).filter(completedGame);
  if (!completed.length) return "";
  return `<div class="mini-results-title">Latest scores</div>${completed
    .map((game) => `<div><strong>G${game.index}</strong> ${escapeHtml(game.team1)} ${game.score1}-${game.score2} ${escapeHtml(game.team2)}</div>`)
    .join("")}`;
}

function nextDateAfter(date) {
  const dates = Object.keys(DATE_COUNTS);
  const index = dates.indexOf(date);
  return index >= 0 ? dates[index + 1] : "";
}

function renderNextMatchdayPreview(date) {
  const nextDate = nextDateAfter(date);
  if (!nextDate) return "";
  const games = state.games[nextDate] || [];
  return `<section class="preview-card">
    <div class="game-meta"><strong>Next match day</strong><span>${prettyDate(nextDate)}</span></div>
    <div class="preview-games">${games
      .map((game) => `<div><span>G${game.index}</span><strong>${escapeHtml(game.team1)} vs ${escapeHtml(game.team2)}</strong></div>`)
      .join("")}</div>
  </section>`;
}

function renderAdmin() {
  $("adminLock").classList.toggle("hidden", adminUnlocked);
  $("adminContent").classList.toggle("hidden", !adminUnlocked);
  if (!adminUnlocked) return;
  $("entryAmount").value = state.settings.entryAmount;
  $("maxPlayersInput").value = maxPlayers();
  $("adminPlayersList").textContent = state.settings.players.length
    ? `${state.settings.players.join(", ")} (${state.settings.players.length}/${maxPlayers()})`
    : `No players registered yet. First saved bet becomes player 1/${maxPlayers()}.`;
  const values = pointValues();
  $("adminRules").innerHTML = [
    ["result", "Result 1/X/2"],
    ["goals", "Goals O2/U2"],
    ["halfResult", "1st half 1/X/2"],
    ["halfGoals", "1st half O1.5/U1.5"],
    ["exactScore", "Exact full-time score"],
    ["both", "GG/NG"],
    ["double", "Double 1X/X2/12"],
    ["extraResult", "Extra time 1/X/2"],
    ["penalty", "Penalty winner"],
    ["challenge2", "Favorite wins by 2+"],
    ["challenge3", "Favorite wins by 3+"],
    ["soloGameBonus", "Solo correct game bonus"],
    ["perfectDayBonus", "All selected correct bonus"]
  ].map(([key, label]) => `<label class="field point-field">
      <span>${label}</span>
      <input data-point-kind="${key}" type="number" min="0" step="1" value="${values[key]}" />
    </label>`)
    .join("");
  $("adminFavoriteControls").innerHTML = Object.keys(DATE_COUNTS)
    .filter((date) => date >= todayKey())
    .map((date) => {
      const rows = (state.games[date] || [])
        .map((game) => {
          const challenge = favoriteChallenge(game);
          const result = completedGame(game) ? `Final ${game.score1}-${game.score2}` : (isGameLocked(game) ? "Locked" : "Open");
          return `<div class="admin-match-row">
            <div>
              <strong>${prettyDate(date)} &middot; G${game.index}</strong>
              <div class="small">${escapeHtml(game.team1)} vs ${escapeHtml(game.team2)} &middot; ${result}</div>
            </div>
            <select data-favorite-game="${game.id}" aria-label="Favorite challenge for ${escapeHtml(game.team1)} vs ${escapeHtml(game.team2)}">
              <option value="">No challenge</option>
              <option value="1" ${challenge?.side === "1" ? "selected" : ""}>${escapeHtml(game.team1)} favorite</option>
              <option value="2" ${challenge?.side === "2" ? "selected" : ""}>${escapeHtml(game.team2)} favorite</option>
            </select>
          </div>`;
        })
        .join("");
      return rows ? `<article class="game-card"><div class="game-meta"><strong>${prettyDate(date)}</strong><span>${rows ? "" : "No games"}</span></div>${rows}</article>` : "";
    })
    .join("") || `<div class="empty">No games available yet.</div>`;
  renderAdminLateUnlocks();
  $("adminResults").innerHTML = Object.keys(DATE_COUNTS)
    .map((date) => {
      const rows = (state.games[date] || [])
        .map((game) => `<div class="result-grid">
          <div class="small">${prettyDate(date)} &middot; ${escapeHtml(game.team1)} vs ${escapeHtml(game.team2)}</div>
          <input data-score1="${game.id}" type="number" min="0" value="${game.score1 ?? ""}" placeholder="1" />
          <input data-score2="${game.id}" type="number" min="0" value="${game.score2 ?? ""}" placeholder="2" />
        </div>`)
        .join("");
      return `<article class="game-card">${rows}</article>`;
    })
    .join("");
}

function calculate() {
  const players = realPlayers([...state.settings.players, ...betPlayerNames()]);
  const entry = Number(state.settings.entryAmount) || 0;
  const totals = Object.fromEntries(players.map((player) => [player, { entries: 0, winnings: 0, balance: 0, points: 0 }]));
  const daily = [];
  let totalPot = 0;

  Object.keys(DATE_COUNTS).forEach((date) => {
    const games = state.games[date] || [];
    const complete = games.length > 0 && games.every(completedGame);
    const dayBets = state.bets[date] || {};
    const dayPlayers = players.filter((player) => dayBets[player]);
    const entries = Object.fromEntries(dayPlayers.map((player) => [player, countedPickCount(date, getBetPicks(dayBets[player])) * entry]));
    const dayEntryTotal = Object.values(entries).reduce((sum, value) => sum + value, 0);
    const testOnly = !countedDate(date);
    const pointDetails = Object.fromEntries(dayPlayers.map((player) => [player, dailyPlayerPointBreakdown(date, player)]));
    const points = Object.fromEntries(Object.entries(pointDetails).map(([player, detail]) => [player, detail.total]));

    if (!complete || testOnly) {
      daily.push({ date, bank: testOnly ? 0 : dayEntryTotal, winners: [], complete, testOnly, points, pointDetails });
      return;
    }

    totalPot += dayEntryTotal;
    dayPlayers.forEach((player) => {
      totals[player].entries += entries[player] || 0;
    });

    dayPlayers.forEach((player) => {
      totals[player].points += points[player] || 0;
    });

    daily.push({ date, bank: dayEntryTotal, winners: [], complete, testOnly, points, pointDetails });
  });

  const totalPoints = Object.values(totals).reduce((sum, total) => sum + total.points, 0);
  const payoutWinners = assignTopPlacePayouts(totals, totalPot);

  players.forEach((player) => {
    totals[player].balance = totals[player].winnings - totals[player].entries;
  });

  return { players, totals, daily, currentRollover: 0, totalPot, totalPoints, payoutWinners, settlements: settlements(totals) };
}

function assignTopPlacePayouts(totals, totalPot) {
  Object.values(totals).forEach((total) => {
    total.winnings = 0;
  });
  if (!totalPot) return [];
  const ranked = Object.entries(totals)
    .filter(([, total]) => total.points > 0)
    .sort((a, b) => b[1].points - a[1].points);
  const winners = [];
  let rankIndex = 0;
  while (rankIndex < ranked.length && rankIndex < PAYOUT_SHARES.length) {
    const points = ranked[rankIndex][1].points;
    const group = ranked.slice(rankIndex).filter(([, total]) => total.points === points);
    const prizePool = PAYOUT_SHARES
      .slice(rankIndex, Math.min(rankIndex + group.length, PAYOUT_SHARES.length))
      .reduce((sum, share) => sum + share, 0) * totalPot;
    if (prizePool > 0) {
      const share = prizePool / group.length;
      group.forEach(([player, total]) => {
        total.winnings = share;
        winners.push({ player, points, payout: share, place: rankIndex + 1 });
      });
    }
    rankIndex += group.length;
  }
  return winners;
}

function totalBonusPointsForPlayer(player) {
  return Object.keys(DATE_COUNTS).reduce((sum, date) => {
    if (!countedDate(date)) return sum;
    return sum + dailyPlayerPointBreakdown(date, player).bonus;
  }, 0);
}

function findDailySpotlightWinner(calc) {
  const today = todayKey();
  const todayDay = calc.daily.find((item) => item.date === today);
  const day = todayDay?.complete && Object.values(todayDay.points || {}).some((points) => points > 0)
    ? todayDay
    : [...calc.daily].reverse().find((item) => item.complete && Object.values(item.points || {}).some((points) => points > 0));
  if (!day || !Object.values(day.points || {}).some((points) => points > 0)) return null;
  const isToday = day.date === today;
  const rows = Object.entries(day.points)
    .filter(([, points]) => points > 0)
    .map(([player, points]) => ({
      player,
      points,
      totalPoints: calc.totals[player]?.points || 0,
      totalBonus: totalBonusPointsForPlayer(player),
      todayBonus: day.pointDetails?.[player]?.bonus || 0,
      todayBase: day.pointDetails?.[player]?.base || 0
    }))
    .sort((a, b) => b.points - a.points || b.totalPoints - a.totalPoints || b.totalBonus - a.totalBonus || a.player.localeCompare(b.player));
  const winner = rows[0];
  if (!winner) return null;
  const tiedOnToday = rows.filter((row) => row.points === winner.points);
  const tieNote = tiedOnToday.length > 1
    ? `Tie-breaker used: total points, then total bonus points.`
    : `Highest points for ${prettyDate(day.date)}.`;
  return { ...winner, date: day.date, complete: day.complete, isToday, tieNote };
}

function renderDailyWinnerBanner() {
  const banner = $("dailyWinnerBanner");
  if (!banner) return;
  if (!winnerBannerReady) {
    banner.classList.add("hidden");
    banner.innerHTML = "";
    return;
  }
  const spotlight = findDailySpotlightWinner(calculate());
  if (!spotlight) {
    banner.classList.add("hidden");
    banner.innerHTML = "";
    return;
  }
  banner.classList.remove("hidden");
  const label = spotlight.isToday ? "Today's Winner" : "Latest Daily Winner";
  const bonusText = spotlight.todayBonus
    ? `${spotlight.todayBase} pts + ${spotlight.todayBonus} bonus = ${spotlight.points} pts`
    : `${spotlight.points} pts`;
  banner.innerHTML = `<div class="winner-sparks" aria-hidden="true"></div>
    <div class="winner-label">${label}</div>
    <div class="winner-name">${escapeHtml(spotlight.player)}</div>
    <div class="winner-meta">${prettyDate(spotlight.date)} · ${bonusText}</div>
    `;
}

function historyDatesWithBets() {
  return Object.keys(DATE_COUNTS).filter((date) => Object.keys(state.bets[date] || {}).length);
}

function latestHistoryDate() {
  const dates = historyDatesWithBets();
  return dates.at(-1) || todayKey();
}

function ensureSelectedHistoryDate() {
  if (selectedHistoryDate && DATE_COUNTS[selectedHistoryDate]) return selectedHistoryDate;
  selectedHistoryDate = latestHistoryDate();
  return selectedHistoryDate;
}

function moveHistoryPage(direction) {
  const dates = historyDatesWithBets();
  if (!dates.length) return;
  const current = ensureSelectedHistoryDate();
  const currentIndex = Math.max(0, dates.indexOf(current));
  const nextIndex = Math.min(dates.length - 1, Math.max(0, currentIndex + direction));
  selectedHistoryDate = dates[nextIndex];
  renderHistory();
}

function renderHistoryPager() {
  const select = $("historyDateSelect");
  const prev = $("historyPrevButton");
  const next = $("historyNextButton");
  if (!select || !prev || !next) return;
  const dates = historyDatesWithBets();
  if (!dates.length) {
    select.innerHTML = `<option>No saved bets yet</option>`;
    select.disabled = true;
    prev.disabled = true;
    next.disabled = true;
    return;
  }
  const selected = ensureSelectedHistoryDate();
  select.disabled = false;
  select.innerHTML = dates
    .map((date) => {
      const betCount = Object.keys(state.bets[date] || {}).length;
      return `<option value="${date}">${prettyDate(date)}${countedDate(date) ? "" : " (test)"} - ${betCount} bet${betCount === 1 ? "" : "s"}</option>`;
    })
    .join("");
  select.value = dates.includes(selected) ? selected : latestHistoryDate();
  selectedHistoryDate = select.value;
  const index = dates.indexOf(selectedHistoryDate);
  prev.disabled = index <= 0;
  next.disabled = index < 0 || index >= dates.length - 1;
}

function pickWins(pick, game) {
  if (!pick || !completedGame(game)) return false;
  const result = game.score1 > game.score2 ? "1" : game.score1 < game.score2 ? "2" : "X";
  const total = game.score1 + game.score2;
  const halfComplete = game.htScore1 !== null && game.htScore1 !== undefined && game.htScore2 !== null && game.htScore2 !== undefined;
  const halfResult = halfComplete ? (game.htScore1 > game.htScore2 ? "H1" : game.htScore1 < game.htScore2 ? "H2" : "HX") : "";
  const halfTotal = halfComplete ? Number(game.htScore1) + Number(game.htScore2) : null;
  const exact = exactScoreInfo(pick);
  const challenge = challengeInfo(pick);
  if (challenge) {
    const margin = challenge.side === "1" ? game.score1 - game.score2 : game.score2 - game.score1;
    return margin > challenge.margin;
  }
  if (exact) return exact.score1 === Number(game.score1) && exact.score2 === Number(game.score2);
  if (HALF_RESULT_OPTIONS.includes(pick)) return halfComplete && pick === halfResult;
  if (pick === "HO1.5") return halfComplete && halfTotal > 1.5;
  if (pick === "HU1.5") return halfComplete && halfTotal <= 1.5;
  const extraComplete = game.etScore1 !== null && game.etScore1 !== undefined && game.etScore2 !== null && game.etScore2 !== undefined;
  const extraResult = extraComplete ? (Number(game.etScore1) > Number(game.etScore2) ? "E1" : Number(game.etScore1) < Number(game.etScore2) ? "E2" : "EX") : "";
  if (EXTRA_RESULT_OPTIONS.includes(pick)) return extraComplete && pick === extraResult;
  if (pick === "P1") return game.penaltyWinner === "1";
  if (pick === "P2") return game.penaltyWinner === "2";
  if (RESULT_OPTIONS.includes(pick)) return pick === result;
  if (pick === "1X") return result === "1" || result === "X";
  if (pick === "X2") return result === "X" || result === "2";
  if (pick === "12") return result === "1" || result === "2";
  if (pick === "O2") return total > 2;
  if (pick === "U2") return total <= 2;
  if (pick === "GG") return game.score1 > 0 && game.score2 > 0;
  if (pick === "NG") return game.score1 === 0 || game.score2 === 0;
  return false;
}

function renderTables() {
  const calc = calculate();
  const rows = Object.entries(calc.totals).sort((a, b) => b[1].points - a[1].points || b[1].balance - a[1].balance);
  const distributed = rows.reduce((sum, [, total]) => sum + total.winnings, 0);
  $("standingsList").innerHTML = rows.length
    ? `<div class="pot-summary">
        <div><span>Total pot</span><strong>${money(calc.totalPot)}</strong></div>
        <div><span>Total points</span><strong>${calc.totalPoints}</strong></div>
        <div><span>1st place payout</span><strong>50%</strong></div>
        <div><span>2nd place payout</span><strong>30%</strong></div>
        <div><span>3rd place payout</span><strong>20%</strong></div>
        <div><span>Distributed to winners</span><strong>${money(distributed)}</strong></div>
      </div>
      <div class="table-note">Money goes to the top 3 point places: 1st gets 50% of the pot, 2nd gets 30%, and 3rd gets 20%. Ties split the prize for the tied places. Net = payout - entry paid.</div>
      <div class="standings-table">
        <div class="standings-row standings-head">
          <span>Player</span>
          <span>Points</span>
          <span>Entry paid</span>
          <span>Payout</span>
          <span>Net</span>
        </div>
        ${rows.map(([player, total], index) => `<div class="standings-row">
          <span><strong>${index + 1}. ${escapeHtml(player)}</strong></span>
          <span class="points-value">${total.points}</span>
          <span>${money(total.entries)}</span>
          <span>${money(total.winnings)}</span>
          <span class="money ${total.balance >= 0 ? "positive" : "negative"}">${signedMoney(total.balance)}</span>
        </div>`).join("")}
      </div>`
    : `<div class="empty">Add players by saving bets.</div>`;

  $("settlementList").innerHTML = calc.settlements.length
    ? calc.settlements.map((row) => `<article class="settlement-card"><strong>${escapeHtml(row.from)}</strong> sends <strong>${money(row.amount)}</strong> to <strong>${escapeHtml(row.to)}</strong></article>`).join("")
    : `<div class="empty">No payments needed yet.</div>`;

  $("dailyList").innerHTML = calc.daily
    .filter((day) => day.complete || day.testOnly || Object.values(day.points || {}).some((points) => points > 0))
    .map((day) => {
      const pointText = Object.entries(day.points || {}).length
        ? `<div class="daily-points">${Object.entries(day.points)
            .sort((a, b) => b[1] - a[1])
            .map(([player]) => {
              const detail = day.pointDetails?.[player] || { base: 0, bonus: 0, total: 0 };
              const pointsText = detail.bonus > 0
                ? `${detail.base} pts + ${detail.bonus} bonus = ${detail.total} pts`
                : `${detail.total} pts`;
              return `<span><strong>${escapeHtml(player)}</strong> ${pointsText}</span>`;
            })
            .join("")}</div>`
        : day.testOnly ? "Test day - not counted" : "No points yet";
      return `<article class="daily-card">
        <strong>${prettyDate(day.date)}${day.testOnly ? " (test)" : ""}</strong>
        <div class="small">Entries ${money(day.bank)} &middot; ${day.testOnly ? "Not counted" : day.complete ? "Added to total pot" : "In progress"}</div>
        <div class="small">${pointText}</div>
      </article>`;
    })
    .join("") || `<div class="empty">Daily results will appear after final scores are entered or synced.</div>`;
}

function renderHistory() {
  renderHistoryPager();
  const date = ensureSelectedHistoryDate();
  $("historyList").innerHTML = [date]
    .map((date) => {
      const bets = state.bets[date] || {};
      const players = Object.keys(bets);
      if (!players.length) return `<div class="empty">No saved bets for ${prettyDate(date)} yet.</div>`;
      const games = state.games[date] || [];
      const complete = games.length > 0 && games.every(completedGame);
      const playerRows = players
        .sort((a, b) => a.localeCompare(b))
        .map((player) => {
          const picks = getBetPicks(bets[player]) || {};
          const points = dailyPlayerPoints(date, player);
          const status = complete ? (countedDate(date) ? `${points} pts` : "Test") : "Pending";
          const statusClass = complete ? (points > 0 ? "win" : "loss") : "";
          const lines = games
            .map((game) => {
              const gamePicks = rawPicksForGame(picks, game.id);
              const pickLabels = gamePicks.length
                ? gamePicks.map((pick) => {
                    const label = historyPickLabel(pick, game);
                    if (!completedGame(game)) return `<span class="history-pick-chip">${escapeHtml(label)}</span>`;
                    const correct = pickWins(pick, game);
                    return `<span class="history-pick-chip ${correct ? "correct" : "wrong"}">${escapeHtml(label)} <b>${correct ? "&check;" : "X"}</b></span>`;
                  }).join("")
                : "-";
              return `<div class="pick-line">
              <span>G${game.index}</span>
              <strong>${escapeHtml(game.team1)} vs ${escapeHtml(game.team2)}</strong>
              <span class="history-pick-list">${pickLabels}</span>
              <span class="pick-result"></span>
            </div>`;
            })
            .join("");
          return `<div class="history-player">
            <div class="history-player-head">
              <strong>${escapeHtml(player)}</strong>
              <span class="status-pill ${statusClass}">${status}</span>
            </div>
            <div class="pick-lines">${lines}</div>
          </div>`;
        })
        .join("");
      return `<article class="history-day">
        <div class="game-meta"><strong>${prettyDate(date)}${countedDate(date) ? "" : " (test)"}</strong><span>${players.length} bet${players.length > 1 ? "s" : ""}</span></div>
        ${playerRows}
      </article>`;
    })
    .join("") || `<div class="empty">Saved bets will appear here.</div>`;
}

function renderResults() {
  $("resultsList").innerHTML = Object.keys(DATE_COUNTS)
    .map((date) => {
      const games = (state.games[date] || []).filter((game) => completedGame(game) || game.time || game.team1 !== placeholderTeam(date, game.index - 1));
      if (!games.length) return "";
      return `<article class="history-day">
        <div class="game-meta"><strong>${prettyDate(date)}${countedDate(date) ? "" : " (test)"}</strong><span>${games.filter(completedGame).length}/${games.length} final</span></div>
        <div class="result-lines">${games.map((game) => `<div class="result-line">
          <span>G${game.index}</span>
          <strong>${escapeHtml(game.team1)} vs ${escapeHtml(game.team2)}</strong>
          <span>${gameResultText(game)}</span>
        </div>`).join("")}</div>
      </article>`;
    })
    .join("") || `<div class="empty">Results will appear here after games finish or admin enters scores.</div>`;
}

function statsDates() {
  return Object.keys(DATE_COUNTS).filter((date) => (state.games[date] || []).some((game) => !isPlaceholderGame(game)));
}

function renderStatsDates() {
  const select = $("statsDateSelect");
  if (!select) return;
  const dates = statsDates();
  const current = select.value || getActiveDate() || nearestPlayableDate();
  const { teamToGroup } = inferGroups();
  select.innerHTML = dates
    .map((date) => {
      const games = (state.games[date] || []).filter((game) => !isPlaceholderGame(game));
      const groupLetters = [...new Set(games
        .map((game) => groupForGame(game, teamToGroup).name.replace("Group ", ""))
        .filter((letter) => letter && letter !== "TBD"))];
      const groupLabel = groupLetters.length ? `, groups: ${groupLetters.join(",")}` : "";
      return `<option value="${date}">${prettyDate(date)} - ${games.length} game${games.length === 1 ? "" : "s"}${groupLabel}</option>`;
    })
    .join("");
  select.value = dates.includes(current) ? current : dates[0] || "";
}

function h2hKey(team1, team2) {
  return [team1, team2].sort((a, b) => a.localeCompare(b)).join("|");
}

function groupStageGames() {
  return Object.values(state.games)
    .flat()
    .filter((game) => game.date >= GROUP_STAGE_START_DATE
      && game.date <= GROUP_STAGE_END_DATE
      && !isPlaceholderGame(game)
      && game.team1
      && game.team2);
}

function inferGroups() {
  const parent = {};
  const firstSeen = {};
  const find = (team) => {
    parent[team] ||= team;
    if (parent[team] !== team) parent[team] = find(parent[team]);
    return parent[team];
  };
  const union = (team1, team2) => {
    const root1 = find(team1);
    const root2 = find(team2);
    if (root1 !== root2) parent[root2] = root1;
  };
  groupStageGames()
    .sort((a, b) => `${a.date}-${a.index}`.localeCompare(`${b.date}-${b.index}`))
    .forEach((game) => {
      union(game.team1, game.team2);
      firstSeen[game.team1] ||= `${game.date}-${game.index}`;
      firstSeen[game.team2] ||= `${game.date}-${game.index}`;
    });
  const groupsByRoot = {};
  Object.keys(parent).forEach((team) => {
    groupsByRoot[find(team)] ||= [];
    groupsByRoot[find(team)].push(team);
  });
  const groups = Object.values(groupsByRoot)
    .map((teams) => ({
      teams: teams.sort((a, b) => a.localeCompare(b)),
      first: teams.map((team) => firstSeen[team] || "9999").sort()[0]
    }))
    .sort((a, b) => a.first.localeCompare(b.first))
    .map((group, index) => ({
      name: `Group ${String.fromCharCode(65 + index)}`,
      teams: group.teams
    }));
  const teamToGroup = {};
  groups.forEach((group) => group.teams.forEach((team) => {
    teamToGroup[team] = group;
  }));
  return { groups, teamToGroup };
}

function groupForGame(game, teamToGroup) {
  return teamToGroup[game.team1] || teamToGroup[game.team2] || { name: "Group TBD", teams: [game.team1, game.team2].filter(Boolean) };
}

function groupTable(group) {
  const rows = {};
  group.teams.forEach((team) => {
    rows[team] = { team, played: 0, pts: 0, gf: 0, ga: 0, gd: 0 };
  });
  groupStageGames()
    .filter((game) => completedGame(game) && rows[game.team1] && rows[game.team2])
    .forEach((game) => {
      const home = rows[game.team1];
      const away = rows[game.team2];
      home.played += 1;
      away.played += 1;
      home.gf += Number(game.score1) || 0;
      home.ga += Number(game.score2) || 0;
      away.gf += Number(game.score2) || 0;
      away.ga += Number(game.score1) || 0;
      if (game.score1 > game.score2) home.pts += 3;
      else if (game.score1 < game.score2) away.pts += 3;
      else {
        home.pts += 1;
        away.pts += 1;
      }
    });
  Object.values(rows).forEach((row) => {
    row.gd = row.gf - row.ga;
  });
  return Object.values(rows).sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.localeCompare(b.team));
}

function teamRecentScores(team, group) {
  return groupStageGames()
    .filter((game) => completedGame(game) && (game.team1 === team || game.team2 === team) && group.teams.includes(game.team1) && group.teams.includes(game.team2))
    .sort((a, b) => `${b.date}-${b.index}`.localeCompare(`${a.date}-${a.index}`))
    .slice(0, 4)
    .map((game) => {
      const isTeam1 = game.team1 === team;
      const goalsFor = isTeam1 ? game.score1 : game.score2;
      const goalsAgainst = isTeam1 ? game.score2 : game.score1;
      const opponent = isTeam1 ? game.team2 : game.team1;
      const result = goalsFor > goalsAgainst ? "W" : goalsFor < goalsAgainst ? "L" : "D";
      return { label: `${team} vs ${opponent}`, score: `${goalsFor}-${goalsAgainst} ${result}` };
    });
}

function renderGroupTable(group) {
  return `<div class="stats-table-wrap">
    <table class="stats-table">
      <thead><tr><th>Rank</th><th>Team</th><th>Pts</th><th>Played</th><th>GF</th><th>GA</th><th>GD</th></tr></thead>
      <tbody>${groupTable(group).map((row, index) => `<tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(row.team)}</td>
        <td>${row.pts}</td>
        <td>${row.played}</td>
        <td>${row.gf}</td>
        <td>${row.ga}</td>
        <td>${row.gd > 0 ? "+" : ""}${row.gd}</td>
      </tr>`).join("")}</tbody>
    </table>
  </div>`;
}

function renderRecentScores(game, group) {
  const team1Scores = teamRecentScores(game.team1, group);
  const team2Scores = teamRecentScores(game.team2, group);
  const maxRows = Math.max(team1Scores.length, team2Scores.length, 1);
  return `<div class="recent-score-grid">
    <div class="recent-score-head">${escapeHtml(game.team1)}</div>
    <div class="recent-score-head">Score</div>
    <div class="recent-score-head">${escapeHtml(game.team2)}</div>
    <div class="recent-score-head">Score</div>
    ${Array.from({ length: maxRows }).map((_, index) => {
      const left = team1Scores[index];
      const right = team2Scores[index];
      return `<div>${left ? escapeHtml(left.label) : "-"}</div>
        <strong>${left ? escapeHtml(left.score) : "-"}</strong>
        <div>${right ? escapeHtml(right.label) : "-"}</div>
        <strong>${right ? escapeHtml(right.score) : "-"}</strong>`;
    }).join("")}
  </div>`;
}

function renderGroupPath(group) {
  const letter = group.name.replace("Group ", "");
  const path = GROUP_PATHS[letter];
  if (!path) return "";
  return `<h3>${escapeHtml(group.name)} knockout path</h3>
    <div class="group-path-grid">
      <div>Group</div>
      <div>1st place plays</div>
      <div>2nd place plays</div>
      <div>3rd place, if qualifies, can play</div>
      <strong>${escapeHtml(letter)}</strong>
      <span>${escapeHtml(path[0])}</span>
      <span>${escapeHtml(path[1])}</span>
      <span>${escapeHtml(path[2])}</span>
    </div>`;
}

function statsGroupsForDate(date, teamToGroup) {
  const groups = new Map();
  (state.games[date] || [])
    .filter((game) => !isPlaceholderGame(game))
    .forEach((game) => {
      const group = groupForGame(game, teamToGroup);
      const key = group.name;
      if (!groups.has(key)) groups.set(key, { group, games: [] });
      groups.get(key).games.push(game);
    });
  return [...groups.values()];
}

function shortGameName(game) {
  return `${game.team1} vs ${game.team2}`;
}

function renderGroupRecentScores(group) {
  const games = groupStageGames()
    .filter((game) => completedGame(game) && group.teams.includes(game.team1) && group.teams.includes(game.team2))
    .sort((a, b) => `${a.date}-${a.index}`.localeCompare(`${b.date}-${b.index}`));
  if (!games.length) return `<div class="empty compact-empty">No completed group games yet.</div>`;
  return `<div class="group-recent-list">
    ${games.map((game) => {
      const score = `${game.score1}-${game.score2}`;
      return `<div class="group-recent-row">
        <strong>${escapeHtml(shortGameName(game))}</strong>
        <span>${escapeHtml(score)}</span>
      </div>`;
    }).join("")}
  </div>`;
}

function renderGroupH2H(games) {
  return `<div class="group-h2h-list">
    ${games.map((game) => {
      const h2h = H2H_NOTES[h2hKey(game.team1, game.team2)] || "No previous meeting saved yet.";
      return `<div class="group-h2h-row">
        <strong>${escapeHtml(shortGameName(game))}</strong>
        <span>${escapeHtml(h2h)}</span>
      </div>`;
    }).join("")}
  </div>`;
}

function renderKnockoutPathOverview(groups) {
  if (!$("knockoutPathPanel")) return;
  const rows = groups.map((group) => {
    const letter = group.name.replace("Group ", "");
    const path = GROUP_PATHS[letter] || ["-", "-", "-"];
    const table = groupTable(group);
    const first = table[0]?.team || "TBD";
    const second = table[1]?.team || "TBD";
    return `<article class="path-card">
      <strong>${escapeHtml(group.name)}</strong>
      <span>1st: ${escapeHtml(first)}</span>
      <span>2nd: ${escapeHtml(second)}</span>
      <small>${escapeHtml(path[0])} · ${escapeHtml(path[1])} · ${escapeHtml(path[2])}</small>
    </article>`;
  }).join("");
  $("knockoutPathPanel").innerHTML = `<div class="path-grid">${rows}</div>`;
}

function pathPlaceNumber(pathText) {
  if (/1st/.test(pathText)) return 1;
  if (/2nd/.test(pathText)) return 2;
  if (/3rd/.test(pathText)) return 3;
  return 0;
}

function pathGroupLetters(pathText) {
  const cleaned = String(pathText || "")
    .replace(/Group/gi, " ")
    .replace(/from/gi, " ")
    .replace(/or/gi, "/");
  return [...new Set(cleaned.match(/\b[A-L]\b/g) || [])];
}

function pathCandidateRows(pathText, groupsByLetter) {
  const place = pathPlaceNumber(pathText);
  const letters = pathGroupLetters(pathText);
  if (!place || !letters.length) return [];
  return letters
    .map((letter) => {
      const row = groupTable(groupsByLetter[letter] || { teams: [] })[place - 1];
      return row ? { letter, row } : null;
    })
    .filter(Boolean);
}

function formatPathCandidate(candidate, includeLetter = false) {
  const gd = `${candidate.row.gd > 0 ? "+" : ""}${candidate.row.gd}`;
  const prefix = includeLetter ? `${candidate.letter}: ` : "";
  return `${prefix}${candidate.row.team}, ${candidate.row.pts} pts, GD ${gd}`;
}

function pathBestCandidate(candidates) {
  return [...candidates].sort((a, b) =>
    b.row.pts - a.row.pts ||
    b.row.gd - a.row.gd ||
    b.row.gf - a.row.gf ||
    a.row.team.localeCompare(b.row.team)
  )[0];
}

function renderPathCurrent(pathText, groupsByLetter) {
  const candidates = pathCandidateRows(pathText, groupsByLetter);
  if (!candidates.length) return `<em>Right now: TBD</em>`;
  const best = pathBestCandidate(candidates);
  const bestText = formatPathCandidate(best);
  if (candidates.length === 1) return `<em>Right now: ${escapeHtml(bestText)}</em>`;
  const detailsText = candidates.map((candidate) => formatPathCandidate(candidate, true)).join(" / ");
  return `<details class="path-current-detail">
    <summary><span>Right now: ${escapeHtml(bestText)}</span></summary>
    <small>${escapeHtml(detailsText)}</small>
  </details>`;
}

function renderPathCell(team, pathText, groupsByLetter) {
  return `<strong>${escapeHtml(team)}</strong>
    <span>${escapeHtml(pathText)}</span>
    ${renderPathCurrent(pathText, groupsByLetter)}`;
}

function renderPathTableOverview(groups) {
  if (!$("knockoutPathPanel")) return;
  const groupsByLetter = Object.fromEntries(groups.map((group) => [group.name.replace("Group ", ""), group]));
  const rows = groups.map((group) => {
    const letter = group.name.replace("Group ", "");
    const path = GROUP_PATHS[letter] || ["-", "-", "-"];
    const table = groupTable(group);
    const first = table[0]?.team || "TBD";
    const second = table[1]?.team || "TBD";
    const third = table[2]?.team || "TBD";
    return `<tr>
      <td>${escapeHtml(group.name)}</td>
      <td>${renderPathCell(first, path[0], groupsByLetter)}</td>
      <td>${renderPathCell(second, path[1], groupsByLetter)}</td>
      <td>${renderPathCell(third, path[2], groupsByLetter)}</td>
    </tr>`;
  }).join("");
  $("knockoutPathPanel").innerHTML = `<div class="path-table-wrap">
    <table class="path-table">
      <thead><tr><th>Group</th><th>1st place can play</th><th>2nd place can play</th><th>3rd place, if qualifies</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

const BRACKET_SLOTS = [
  { side: "left", teams: [["GERMANY", "DE"], ["PARAGUAY", "PY"]], colors: ["black-red", "red-white"] },
  { side: "left", teams: [["FRANCE", "FR"], ["SWEDEN", "SE"]], colors: ["blue-red", "blue-yellow"] },
  { side: "left", teams: [["SOUTH AFRICA", "ZA"], ["CANADA", "CA"]], colors: ["green-gold", "red-white"] },
  { side: "left", teams: [["NETHERLANDS", "NL"], ["MOROCCO", "MA"]], colors: ["orange-blue", "red-green"] },
  { side: "left", teams: [["PORTUGAL", "PT"], ["CROATIA", "HR"]], colors: ["red-green", "checker"] },
  { side: "left", teams: [["SPAIN", "ES"], ["AUSTRIA", "AT"]], colors: ["red-gold", "red-white"] },
  { side: "left", teams: [["UNITED STATES", "US"], ["BOSNIA & HERZ.", "BA"]], colors: ["blue-red", "blue-gold"] },
  { side: "left", teams: [["BELGIUM", "BE"], ["SENEGAL", "SN"]], colors: ["red-gold", "green-gold"] },
  { side: "right", teams: [["BRAZIL", "BR"], ["JAPAN", "JP"]], colors: ["green-gold", "white-red"] },
  { side: "right", teams: [["IVORY COAST", "CI"], ["NORWAY", "NO"]], colors: ["orange-green", "red-blue"] },
  { side: "right", teams: [["MEXICO", "MX"], ["ECUADOR", "EC"]], colors: ["green-red", "yellow-blue"] },
  { side: "right", teams: [["ENGLAND", "EN"], ["DR CONGO", "CD"]], colors: ["white-red", "blue-red"] },
  { side: "right", teams: [["ARGENTINA", "AR"], ["CAPE VERDE", "CV"]], colors: ["sky-blue", "blue-red"] },
  { side: "right", teams: [["AUSTRALIA", "AU"], ["EGYPT", "EG"]], colors: ["navy-gold", "white-red"] },
  { side: "right", teams: [["SWITZERLAND", "CH"], ["ALGERIA", "DZ"]], colors: ["red-white", "green-red"] },
  { side: "right", teams: [["COLOMBIA", "CO"], ["GHANA", "GH"]], colors: ["yellow-blue", "green-gold"] }
];

function bracketTeamKey(team) {
  return String(team || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function completedKnockoutGames() {
  return Object.values(state.games).flat().filter((game) => game.date >= "2026-06-28" && completedGame(game));
}

function findKnockoutGame(teamA, teamB) {
  const keyA = bracketTeamKey(teamA);
  const keyB = bracketTeamKey(teamB);
  return completedKnockoutGames().find((game) => {
    const gameA = bracketTeamKey(game.team1);
    const gameB = bracketTeamKey(game.team2);
    return (gameA === keyA && gameB === keyB) || (gameA === keyB && gameB === keyA);
  });
}

function knockoutWinner(teamA, teamB) {
  if (!teamA || !teamB) return "";
  const game = findKnockoutGame(teamA, teamB);
  if (!game || Number(game.score1) === Number(game.score2)) return "";
  return Number(game.score1) > Number(game.score2) ? game.team1 : game.team2;
}

function computeBracketProgress() {
  const progress = { left: {}, right: {} };
  ["left", "right"].forEach((side) => {
    const slots = BRACKET_SLOTS.filter((slot) => slot.side === side);
    const roundOne = slots.map((slot) => knockoutWinner(slot.teams[0][0], slot.teams[1][0]));
    const roundTwo = [0, 2, 4, 6].map((index) => knockoutWinner(roundOne[index], roundOne[index + 1]));
    const roundThree = [0, 2].map((index) => knockoutWinner(roundTwo[index], roundTwo[index + 1]));
    const finalist = knockoutWinner(roundThree[0], roundThree[1]);
    progress[side] = { roundOne, roundTwo, roundThree, finalist };
  });
  progress.champion = knockoutWinner(progress.left.finalist, progress.right.finalist);
  return progress;
}

function renderBracketTeam(team, color) {
  return `<div class="bracket-team team-${color}">
    <span>${escapeHtml(team[0])}</span><b>${escapeHtml(team[1])}</b>
  </div>`;
}

function renderWinnerBox(label, className = "") {
  return `<div class="bracket-box ${className} ${label ? "filled" : ""}">${escapeHtml(label || "")}</div>`;
}

function renderBracketLines(side) {
  const rows = [1, 2, 3, 4, 5, 6, 7, 8].map((index) => `<i class="bline h h1-${index}"></i>`).join("");
  const pairLines = [1, 2, 3, 4].map((index) => `<i class="bline v v2-${index}"></i><i class="bline h h2-${index}"></i>`).join("");
  const groupLines = [1, 2].map((index) => `<i class="bline v v3-${index}"></i><i class="bline h h3-${index}"></i>`).join("");
  return `<div class="bracket-lines ${side}">${rows}${pairLines}${groupLines}<i class="bline v v4"></i><i class="bline h h4"></i></div>`;
}

function renderBracketSide(side, progress) {
  const slots = BRACKET_SLOTS.filter((slot) => slot.side === side);
  const matches = slots.map((slot, index) => `<div class="bracket-match m${index + 1}">
    ${slot.teams.map((team, teamIndex) => renderBracketTeam(team, slot.colors[teamIndex])).join("")}
  </div>`).join("");
  const roundOne = progress[side].roundOne.map((label, index) => renderWinnerBox(label, `r1 r1-${index + 1}`)).join("");
  const roundTwo = progress[side].roundTwo.map((label, index) => renderWinnerBox(label, `r2 r2-${index + 1}`)).join("");
  const roundThree = progress[side].roundThree.map((label, index) => renderWinnerBox(label, `r3 r3-${index + 1}`)).join("");
  const finalist = renderWinnerBox(progress[side].finalist, "side-final");
  return `<div class="side-bracket ${side}">
    ${renderBracketLines(side)}
    ${matches}
    ${roundOne}
    ${roundTwo}
    ${roundThree}
    ${finalist}
  </div>`;
}

function renderBracketPathOverview() {
  const panel = $("knockoutPathPanel");
  if (!panel) return;
  const progress = computeBracketProgress();
  panel.innerHTML = `<div class="bracket-board">
    <div class="bracket-bg-lines"></div>
    ${renderBracketSide("left", progress)}
    <div class="bracket-center">
      <div class="final-pair">
        ${renderWinnerBox(progress.left.finalist, "final-box")}
        ${renderWinnerBox(progress.right.finalist, "final-box")}
      </div>
      <div class="champion-box ${progress.champion ? "filled" : ""}">${escapeHtml(progress.champion || "CHAMPION")}</div>
    </div>
    ${renderBracketSide("right", progress)}
  </div>`;
}
function renderStats() {
  const list = $("statsList");
  if (!list) return;
  try {
    const date = $("statsDateSelect")?.value || getActiveDate();
    const games = (state.games[date] || []).filter((game) => !isPlaceholderGame(game));
    if (!games.length) {
      list.innerHTML = `<div class="empty">No statistics available for this match day yet.</div>`;
      return;
    }
    const { groups, teamToGroup } = inferGroups();
    renderBracketPathOverview();
    list.innerHTML = statsGroupsForDate(date, teamToGroup).map(({ group, games }) => {
      const timeLabel = [...new Set(games.map((game) => game.time ? new Date(game.time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Time TBD"))].join(" / ");
      const gameLabel = games.map(shortGameName).join(" & ");
      return `<details class="stats-card">
        <summary>
          <span>
            <strong>${escapeHtml(group.name)}: ${escapeHtml(gameLabel)}</strong>
            <em>${escapeHtml(group.name)} - ${group.teams.map((team) => escapeHtml(team)).join(", ")}</em>
          </span>
          <span>${timeLabel}</span>
        </summary>
        <div class="stats-card-body">
          <h3>${escapeHtml(group.name)} current table</h3>
          ${renderGroupTable(group)}
          <h3>Recent World Cup scores</h3>
          ${renderGroupRecentScores(group)}
          <h3>H2H Previous meeting</h3>
          ${renderGroupH2H(games)}
        </div>
      </details>`;
    }).join("");
  } catch (error) {
    list.innerHTML = `<div class="empty">Statistics could not load. Please refresh the page.</div>`;
  }
}

const PICK_TYPE_LABELS = {
  result: "1/X/2",
  goals: "O2/U2",
  halfResult: "1st half 1/X/2",
  halfGoals: "1st half O1.5/U1.5",
  exactScore: "Exact score",
  both: "GG/NG",
  double: "Double",
  extraResult: "Extra time",
  penalty: "Penalties",
  challenge: "Favorite+"
};

function emptyTypeStats() {
  return Object.fromEntries(Object.keys(PICK_TYPE_LABELS).map((kind) => [kind, { total: 0, correct: 0, wrong: 0, pending: 0, points: 0 }]));
}

function playerStats(player, calc) {
  const stats = {
    player,
    days: 0,
    totalPicks: 0,
    correct: 0,
    wrong: 0,
    pending: 0,
    basePoints: 0,
    bonusPoints: 0,
    soloBonuses: 0,
    perfectBonuses: 0,
    bestDay: null,
    worstDay: null,
    typeStats: emptyTypeStats(),
    daily: []
  };

  Object.keys(DATE_COUNTS).forEach((date) => {
    if (!countedDate(date)) return;
    const bet = state.bets[date]?.[player];
    if (!bet) return;
    const picks = getBetPicks(bet) || {};
    const games = state.games[date] || [];
    const completedDay = games.length > 0 && games.every(completedGame);
    const detail = dailyPlayerPointBreakdown(date, player);
    let dayCorrect = 0;
    let dayWrong = 0;
    let dayPending = 0;

    Object.entries(picks).forEach(([gameId]) => {
      const game = games.find((item) => item.id === gameId);
      rawPicksForGame(picks, gameId).forEach((pick) => {
        if (!pickCountsForDate(date, pick)) return;
        const kind = pickKind(pick);
        if (!game || !kind || !stats.typeStats[kind]) return;
        stats.totalPicks += 1;
        stats.typeStats[kind].total += 1;
        if (!completedGame(game)) {
          stats.pending += 1;
          stats.typeStats[kind].pending += 1;
          dayPending += 1;
          return;
        }
        if (pickWins(pick, game)) {
          stats.correct += 1;
          stats.typeStats[kind].correct += 1;
          stats.typeStats[kind].points += pickPoints(pick);
          dayCorrect += 1;
        } else {
          stats.wrong += 1;
          stats.typeStats[kind].wrong += 1;
          dayWrong += 1;
        }
      });
    });

    if (completedDay) {
      stats.days += 1;
      stats.basePoints += detail.base;
      stats.bonusPoints += detail.bonus;
      if (detail.soloBonus > 0) stats.soloBonuses += detail.soloBonus / Math.max(1, soloGameBonus());
      if (detail.perfectBonus > 0) stats.perfectBonuses += detail.perfectBonus / Math.max(1, perfectDayBonus());
      const dayRow = { date, points: detail.total, base: detail.base, bonus: detail.bonus, correct: dayCorrect, wrong: dayWrong, pending: dayPending };
      stats.daily.push(dayRow);
      if (!stats.bestDay || dayRow.points > stats.bestDay.points) stats.bestDay = dayRow;
      if (!stats.worstDay || dayRow.points < stats.worstDay.points) stats.worstDay = dayRow;
    }
  });

  const total = calc.totals[player] || { entries: 0, winnings: 0, balance: 0, points: 0 };
  stats.entries = total.entries || 0;
  stats.payout = total.winnings || 0;
  stats.net = total.balance || 0;
  stats.points = total.points || 0;
  stats.accuracy = stats.correct + stats.wrong ? Math.round((stats.correct / (stats.correct + stats.wrong)) * 100) : 0;
  return stats;
}

function renderStatMetric(label, value) {
  return `<article class="stat-metric"><span>${escapeHtml(label)}</span><strong>${value}</strong></article>`;
}

function renderPlayerStats() {
  const select = $("playerStatsSelect");
  const summary = $("playerStatsSummary");
  const list = $("playerStatsList");
  if (!select || !summary || !list) return;
  const calc = calculate();
  const players = calc.players;
  const current = select.value || "__all__";
  select.innerHTML = [`<option value="__all__">All players</option>`, ...players.map((player) => `<option value="${escapeHtml(player)}">${escapeHtml(player)}</option>`)].join("");
  select.value = current === "__all__" || players.includes(current) ? current : "__all__";

  const rows = players.map((player) => playerStats(player, calc));
  if (select.value === "__all__") {
    const totalPicks = rows.reduce((sum, row) => sum + row.totalPicks, 0);
    const totalCorrect = rows.reduce((sum, row) => sum + row.correct, 0);
    const totalWrong = rows.reduce((sum, row) => sum + row.wrong, 0);
    const totalBonus = rows.reduce((sum, row) => sum + row.bonusPoints, 0);
    summary.innerHTML = [
      renderStatMetric("Players", rows.length),
      renderStatMetric("Total picks", totalPicks),
      renderStatMetric("Correct picks", totalCorrect),
      renderStatMetric("Wrong picks", totalWrong),
      renderStatMetric("Accuracy", totalCorrect + totalWrong ? `${Math.round((totalCorrect / (totalCorrect + totalWrong)) * 100)}%` : "0%"),
      renderStatMetric("Bonus points", totalBonus)
    ].join("");
    list.innerHTML = `<div class="standings-table">
      <div class="standings-row standings-head"><span>Player</span><span>Points</span><span>Accuracy</span><span>Best day</span><span>Net</span></div>
      ${rows.sort((a, b) => b.points - a.points).map((row) => `<div class="standings-row">
        <span><strong>${escapeHtml(row.player)}</strong></span>
        <span class="points-value">${row.points}</span>
        <span>${row.accuracy}%</span>
        <span>${row.bestDay ? `${row.bestDay.points} pts` : "-"}</span>
        <span class="money ${row.net >= 0 ? "positive" : "negative"}">${money(row.net)}</span>
      </div>`).join("")}
    </div>`;
    return;
  }

  const row = rows.find((item) => item.player === select.value);
  if (!row) {
    summary.innerHTML = "";
    list.innerHTML = `<div class="empty">No player selected.</div>`;
    return;
  }
  summary.innerHTML = [
    renderStatMetric("Total points", row.points),
    renderStatMetric("Days played", row.days),
    renderStatMetric("Accuracy", `${row.accuracy}%`),
    renderStatMetric("Correct picks", row.correct),
    renderStatMetric("Wrong picks", row.wrong),
    renderStatMetric("Pending picks", row.pending),
    renderStatMetric("Best day", row.bestDay ? `${prettyDate(row.bestDay.date)} - ${row.bestDay.points} pts` : "-"),
    renderStatMetric("Worst day", row.worstDay ? `${prettyDate(row.worstDay.date)} - ${row.worstDay.points} pts` : "-"),
    renderStatMetric("Bonus points", row.bonusPoints),
    renderStatMetric("Solo bonuses", row.soloBonuses),
    renderStatMetric("Perfect days", row.perfectBonuses),
    renderStatMetric("Entry paid", money(row.entries)),
    renderStatMetric("Net", `<span class="${row.net >= 0 ? "positive" : "negative"}">${money(row.net)}</span>`)
  ].join("");
  const typeRows = Object.entries(row.typeStats).map(([kind, value]) => `<div class="stat-break-row">
    <strong>${PICK_TYPE_LABELS[kind]}</strong>
    <span>${value.correct} correct</span>
    <span>${value.wrong} wrong</span>
    <span>${value.pending} pending</span>
    <span>${value.points} pts</span>
  </div>`).join("");
  const dailyRows = row.daily.length
    ? row.daily.slice().reverse().map((day) => `<div class="stat-break-row">
        <strong>${prettyDate(day.date)}</strong>
        <span>${day.points} pts</span>
        <span>${day.correct} correct</span>
        <span>${day.wrong} wrong</span>
        <span>${day.bonus ? `+${day.bonus} bonus` : "No bonus"}</span>
      </div>`).join("")
    : `<div class="empty">No completed counted match days yet.</div>`;
  list.innerHTML = `<article class="stat-card">
      <h3>Pick Type Breakdown</h3>
      <div class="stat-breakdown">${typeRows}</div>
    </article>
    <article class="stat-card">
      <h3>Daily Progress</h3>
      <div class="stat-breakdown">${dailyRows}</div>
    </article>`;
}

function validateSelections(date) {
  const games = state.games[date] || [];
  const validIds = new Set(games.map((game) => game.id));
  const picks = Object.entries(selections).flatMap(([id]) => validIds.has(id) ? rawPicksForGame(selections, id).map((pick) => [id, pick]) : []);
  if (!picks.length) return "Pick at least one game.";
  const tooMany = Object.keys(selections).find((id) => normalPicksForGame(selections, id).length > MAX_PICKS_PER_GAME);
  if (tooMany) return `Choose max ${MAX_PICKS_PER_GAME} bet types for one game.`;
  const badPick = picks.find(([, pick]) => !pickKind(pick));
  if (badPick) return "One of the selected picks is not allowed.";
  const incompleteExact = picks.find(([, pick]) => pickKind(pick) === "exactScore" && !exactScoreInfo(pick));
  if (incompleteExact) return "Finish the exact score pick or clear that game.";
  const badChallenge = picks.find(([id, pick]) => pickKind(pick) === "challenge" && !favoriteChallengeOptions(games.find((game) => game.id === id)).includes(pick));
  if (badChallenge) return "One favorite challenge pick is not available for that game.";
  const penaltyWithoutExtraDraw = Object.keys(selections).find((id) => {
    const gamePicks = rawPicksForGame(selections, id);
    return gamePicks.some((pick) => pickKind(pick) === "penalty") && !gamePicks.includes("EX");
  });
  if (penaltyWithoutExtraDraw) return "Penalty winner is available only after choosing extra time X.";
  const playerName = $("playerName")?.value?.trim() || "";
  const savedName = findPlayerName(playerName) || playerName;
  const existingPicks = getBetPicks(state.bets[date]?.[savedName]) || {};
  const lockedPick = picks.find(([id]) => {
    const oldPicks = rawPicksForGame(existingPicks, id).join("|");
    const newPicks = rawPicksForGame(selections, id).join("|");
    return isGameLockedForPlayer(games.find((game) => game.id === id), savedName) && oldPicks !== newPicks;
  });
  if (lockedPick) return "One selected game is locked. Only open games can be saved.";
  return "";
}

function bindEvents() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      activateTab(tab.dataset.tab);
    });
  });

  $("dateSelect").addEventListener("change", () => {
    selections = {};
    renderBetPanel();
  });

  $("statsDateSelect")?.addEventListener("change", () => {
    closePathPanel();
    renderStats();
  });
  $("pathToggleButton")?.addEventListener("click", () => {
    $("knockoutPathPanel")?.classList.toggle("hidden");
  });
  $("playerStatsSelect")?.addEventListener("change", renderPlayerStats);

  $("playerName")?.addEventListener("input", renderBetPanel);

  $("gamesList").addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const gameId = button.dataset.game || button.dataset.clear;
    if (button.dataset.clear) {
      delete selections[gameId];
    } else if (button.dataset.extraToggle) {
      const current = rawPicksForGame(selections, gameId);
      const withoutExtra = current.filter((pick) => !extraPickKind(pickKind(pick)));
      if (extraOpenGames.has(gameId) || withoutExtra.length !== current.length) {
        extraOpenGames.delete(gameId);
        if (withoutExtra.length) selections[gameId] = withoutExtra;
        else delete selections[gameId];
      } else {
        extraOpenGames.add(gameId);
      }
    } else if (button.dataset.type) {
      const game = (state.games[getActiveDate()] || []).find((item) => item.id === gameId);
      const current = rawPicksForGame(selections, gameId);
      const existingIndex = current.findIndex((pick) => pickKind(pick) === button.dataset.type);
      if (existingIndex >= 0) {
        current.splice(existingIndex, 1);
        if (current.length) selections[gameId] = current;
        else delete selections[gameId];
        renderBetPanel();
        return;
      }
      if (normalPicksForGame(selections, gameId).length >= MAX_PICKS_PER_GAME) return;
      const nextPick = button.dataset.type === "exactScore"
        ? "ES:-"
        : (button.dataset.type === "challenge" ? favoriteChallengeOptions(game) : allowedOptions(button.dataset.type))[0];
      selections[gameId] = [...current, nextPick];
    } else if (button.dataset.pick) {
      const current = rawPicksForGame(selections, gameId);
      const nextKind = pickKind(button.dataset.pick);
      const existingIndex = current.findIndex((pick) => pickKind(pick) === nextKind);
      if (existingIndex >= 0) current[existingIndex] = button.dataset.pick;
      else current.push(button.dataset.pick);
      const cleaned = nextKind === "extraResult" && button.dataset.pick !== "EX"
        ? current.filter((pick) => pickKind(pick) !== "penalty")
        : current;
      selections[gameId] = cleaned;
    }
    renderBetPanel();
  });

  $("gamesList").addEventListener("input", (event) => {
    const input = event.target.closest("[data-exact-side]");
    if (!input) return;
    input.value = input.value.replace(/\D/g, "").slice(0, 1);
    const gameId = input.dataset.game;
    const wrap = input.closest("[data-exact-game]");
    const score1 = wrap?.querySelector('[data-exact-side="1"]')?.value || "";
    const score2 = wrap?.querySelector('[data-exact-side="2"]')?.value || "";
    const current = rawPicksForGame(selections, gameId);
    const existingIndex = current.findIndex((pick) => pickKind(pick) === "exactScore");
    if (existingIndex >= 0) current[existingIndex] = `ES:${score1}-${score2}`;
    else current.push(`ES:${score1}-${score2}`);
    selections[gameId] = current;
    const selectedCount = countedPickCount(getActiveDate());
    const cost = selectedCount * (Number(state.settings.entryAmount) || 0);
    $("betCost").innerHTML = `<strong>${selectedCount}</strong> selected game${selectedCount === 1 ? "" : "s"} &middot; Cost ${money(cost)}`;
  });

  $("betForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const date = getActiveDate();
    const playerName = $("playerName").value.trim();
    const playerPin = $("playerPin").value.trim();
    if (!playerName) return showToast("Please enter your name.");
    if (playerPin.length < 4) return showToast("Please enter a PIN with at least 4 characters.");
    if (!hasOpenBettableGame(date, playerName)) return showToast(CHEAT_WARNING);
    const error = validateSelections(date);
    if (error) return showToast(error);
    const validIds = new Set((state.games[date] || []).map((game) => game.id));
    const picks = Object.fromEntries(Object.entries(selections)
      .filter(([id]) => validIds.has(id))
      .map(([id]) => [id, picksForGame(selections, id)])
      .filter(([, picks]) => picks.length));
    try {
      const savedName = await saveBet(date, playerName, playerPin, picks);
      rememberPlayerCredentials(savedName, playerPin);
    } catch (error) {
      return showToast(error.message);
    }
    selectedHistoryDate = date;
    clearBetForm({ keepIdentity: true });
    await syncFixtures(true);
    renderAll();
    showToast("Bet saved. Same name and PIN can edit it before cutoff.");
  });

  $("resetBetButton").addEventListener("click", () => {
    selections = {};
    renderBetPanel();
    showToast("Picks reset.");
  });

  $("loadBetButton").addEventListener("click", async () => {
    const date = getActiveDate();
    const playerName = $("playerName").value.trim();
    const playerPin = $("playerPin").value.trim();
    if (!playerName) return showToast("Enter your name first.");
    if (playerPin.length < 4) return showToast("Enter your PIN first.");
    const savedName = findPlayerName(playerName) || playerName;
    const existing = state.bets[date]?.[savedName];
    if (!existing) return showToast("No saved bet found for this name today.");
    if (existing.pinHash && existing.pinHash !== await hashPin(playerPin)) {
      return showToast("Wrong PIN for this saved bet.");
    }
    rememberPlayerCredentials(savedName, playerPin);
    selections = { ...(getBetPicks(existing) || {}) };
    renderBetPanel();
    showToast("Login successful. Your saved picks are loaded.");
  });

  $("historyDateSelect")?.addEventListener("change", (event) => {
    selectedHistoryDate = event.target.value;
    renderHistory();
  });

  $("historyPrevButton")?.addEventListener("click", () => moveHistoryPage(-1));
  $("historyNextButton")?.addEventListener("click", () => moveHistoryPage(1));

  $("unlockAdminButton").addEventListener("click", async () => {
    const pin = $("adminPin").value.trim();
    if (!ADMIN_PIN_HASH) return showToast("Admin PIN is not configured.");
    if (await hashPin(pin) !== ADMIN_PIN_HASH) return showToast("Wrong admin PIN.");
    adminUnlocked = true;
    renderAll();
    showToast("Admin unlocked.");
  });

  $("saveSettingsButton").addEventListener("click", async () => {
    if (!adminUnlocked) return showToast("Unlock admin first.");
    const nextMaxPlayers = Math.min(ABSOLUTE_MAX_PLAYERS, Math.max(MIN_PLAYERS, Number($("maxPlayersInput").value) || ABSOLUTE_MAX_PLAYERS));
    if (state.settings.players.length > nextMaxPlayers) {
      return showToast(`You already have ${state.settings.players.length} players. Max cannot be lower than that.`);
    }
    const nextPointValues = { ...pointValues() };
    document.querySelectorAll("[data-point-kind]").forEach((input) => {
      nextPointValues[input.dataset.pointKind] = Math.max(0, Number(input.value) || 0);
    });
    state.settings.entryAmount = Number($("entryAmount").value) || 0;
    state.settings.maxPlayers = nextMaxPlayers;
    state.settings.pointValues = nextPointValues;
    await persist();
    renderAll();
    showToast("Settings saved.");
  });

  $("adminFavoriteControls").addEventListener("change", async (event) => {
    if (!adminUnlocked) return showToast("Unlock admin first.");
    const input = event.target;
    const gameId = input.dataset.favoriteGame;
    if (!gameId) return;
    state.settings.favoriteChallenges ||= {};
    if (!input.value) delete state.settings.favoriteChallenges[gameId];
    else state.settings.favoriteChallenges[gameId] = { enabled: true, side: input.value, source: "admin" };
    await persist();
    renderAll();
    showToast("Favorite challenge saved.");
  });

  $("adminLateDateSelect")?.addEventListener("change", (event) => {
    selectedAdminLateDate = event.target.value;
    renderAdminLateUnlocks();
  });

  $("adminLatePlayerName")?.addEventListener("input", renderAdminLateUnlocks);

  $("saveLateUnlockButton")?.addEventListener("click", async () => {
    if (!adminUnlocked) return showToast("Unlock admin first.");
    const date = selectedAdminLateDate || $("adminLateDateSelect")?.value;
    const player = $("adminLatePlayerName")?.value?.trim();
    if (!date || !player) return showToast("Choose a match day and enter player name.");
    const ids = [...document.querySelectorAll("[data-late-game]:checked")].map((input) => input.dataset.lateGame);
    state.settings.lateUnlocks ||= {};
    state.settings.lateUnlocks[date] ||= {};
    if (ids.length) state.settings.lateUnlocks[date][player] = ids;
    else delete state.settings.lateUnlocks[date][player];
    if (!Object.keys(state.settings.lateUnlocks[date]).length) delete state.settings.lateUnlocks[date];
    await persist();
    renderAll();
    showToast(ids.length ? `Late unlock saved for ${player}.` : `Late unlock cleared for ${player}.`);
  });

  $("adminLateUnlockList")?.addEventListener("click", async (event) => {
    if (!adminUnlocked) return showToast("Unlock admin first.");
    const button = event.target.closest("button[data-clear-unlock-date]");
    if (!button) return;
    const date = button.dataset.clearUnlockDate;
    const player = button.dataset.clearUnlockPlayer;
    if (!state.settings.lateUnlocks?.[date]?.[player]) return;
    delete state.settings.lateUnlocks[date][player];
    if (!Object.keys(state.settings.lateUnlocks[date]).length) delete state.settings.lateUnlocks[date];
    await persist();
    renderAll();
    showToast(`Late unlock cleared for ${player}.`);
  });

  $("adminResults").addEventListener("change", async (event) => {
    if (!adminUnlocked) return showToast("Unlock admin first.");
    const input = event.target;
    const id = input.dataset.score1 || input.dataset.score2;
    if (!id) return;
    Object.values(state.games).flat().forEach((game) => {
      if (game.id !== id) return;
      if (input.dataset.score1) game.score1 = input.value === "" ? null : Number(input.value);
      if (input.dataset.score2) game.score2 = input.value === "" ? null : Number(input.value);
      game.completed = game.score1 !== null && game.score2 !== null;
    });
    await persist();
    renderAll();
  });

  $("syncButton")?.addEventListener("click", syncFixtures);
  $("recalculateButton").addEventListener("click", renderAll);
}

document.addEventListener("DOMContentLoaded", async () => {
  await initStorage();
  bindEvents();
  restoreRememberedPlayer();
  renderAll();
  restoreActiveTab();
  try {
    await syncFixtures(true);
  } finally {
    winnerBannerReady = true;
    renderAll();
  }
  restoreActiveTab();
  scheduleFinalResultSync();
});
