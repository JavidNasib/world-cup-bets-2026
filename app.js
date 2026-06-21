const SUPABASE_URL = window.APP_CONFIG?.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = window.APP_CONFIG?.SUPABASE_ANON_KEY || "";
const ADMIN_PIN_HASH = window.APP_CONFIG?.ADMIN_PIN_HASH || "";
const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";
const ESPN_FRIENDLY_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.friendly/scoreboard";
const STORAGE_KEY = "worldCupPredictionBank.v1";
const ACTIVE_TAB_KEY = "worldCupPredictionBank.activeTab";
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
const MIN_PLAYERS = 1;
const ABSOLUTE_MAX_PLAYERS = 7;
const BET_LOCK_MINUTES_BEFORE_FIRST_GAME = 15;
const GAME_RESULT_SYNC_DELAY_MS = 2 * 60 * 60 * 1000 + 15 * 60 * 1000;
const TEST_ONLY_DATES = new Set(["2026-06-10"]);
const SPECIAL_GAME_LOCK_OVERRIDES = new Set(["760421"]);
const SPECIAL_GAME_INDEX_OVERRIDES = { 760421: 4 };
const CHEAT_WARNING = "Fuck you Rafiz, did you think I dont know?";
const $ = (id) => document.getElementById(id);
const PLACEHOLDER_PLAYER_RE = /^Player [1-7]$/;
const DEFAULT_POINT_VALUES = {
  result: 4,
  goals: 3,
  both: 2,
  double: 1,
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
    lateUnlocks: {}
  },
  games: seedGames(),
  bets: {}
};
let selections = {};

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
          team1: "Bolivia",
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
  const bestByIndex = new Map();
  games.forEach((game) => {
    const key = Number(game.index) || String(game.id);
    const current = bestByIndex.get(key);
    const quality = (completedGame(game) ? 100 : 0)
      + (/^\d+$/.test(String(game.id)) ? 20 : 0)
      + (game.score1 !== null && game.score2 !== null ? 10 : 0)
      + (!isPlaceholderGame(game) ? 1 : 0);
    if (!current || quality > current.quality) bestByIndex.set(key, { game, quality });
  });
  return [...bestByIndex.values()]
    .map(({ game }) => game)
    .sort((a, b) => {
      const timeCompare = String(a.time || "").localeCompare(String(b.time || ""));
      return timeCompare || (a.index - b.index);
    })
    .slice(0, DATE_COUNTS[date] || bestByIndex.size)
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

function ordinalSuffix(value) {
  if (value % 100 >= 11 && value % 100 <= 13) return "th";
  return value % 10 === 1 ? "st" : value % 10 === 2 ? "nd" : value % 10 === 3 ? "rd" : "th";
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

function pickKind(value) {
  if (RESULT_OPTIONS.includes(value)) return "result";
  if (DOUBLE_OPTIONS.includes(value)) return "double";
  if (GOAL_OPTIONS.includes(value)) return "goals";
  if (BOTH_OPTIONS.includes(value)) return "both";
  if (challengeInfo(value)) return "challenge";
  return "";
}

function allowedOptions(kind) {
  if (kind === "result") return RESULT_OPTIONS;
  if (kind === "double") return DOUBLE_OPTIONS;
  if (kind === "goals") return GOAL_OPTIONS;
  if (kind === "both") return BOTH_OPTIONS;
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
  if (!challenge) return pick || "-";
  const team = challenge.side === "1" ? game?.team1 : game?.team2;
  return `${team || `Team ${challenge.side}`} -${challenge.margin} (starts 0-${challenge.margin})`;
}

function pickPoints(pick) {
  const kind = pickKind(pick);
  const challenge = challengeInfo(pick);
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
      return completedGame(game) && pickWins(picks[game.id], game);
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

function activateTab(tabName, remember = true) {
  const tab = document.querySelector(`.tab[data-tab="${tabName}"]`);
  const panel = $(`${tabName}Panel`);
  if (!tab || !panel) return;
  document.querySelectorAll(".tab, .panel").forEach((item) => item.classList.remove("active"));
  tab.classList.add("active");
  panel.classList.add("active");
  if (remember) localStorage.setItem(ACTIVE_TAB_KEY, tabName);
}

function restoreActiveTab() {
  activateTab(localStorage.getItem(ACTIVE_TAB_KEY) || "bet", false);
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

function clearBetForm() {
  $("playerName").value = "";
  $("playerPin").value = "";
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
  const incomingPicks = Object.entries(picks || {}).filter(([id, pick]) => gamesById.has(id) && pick);
  if (!incomingPicks.length) {
    throw new Error("Pick at least one open game.");
  }
  for (const [id, pick] of incomingPicks) {
    const game = gamesById.get(id);
    if (!pickKind(pick) || (pickKind(pick) === "challenge" && !favoriteChallengeOptions(game).includes(pick))) {
      throw new Error("One selected pick is not allowed.");
    }
  }
  for (const [id, pick] of incomingPicks) {
    const game = gamesById.get(id);
    const existingPick = existing?.picks?.[id];
    if (isGameLockedForPlayer(game, savedName) && existingPick !== pick) {
      throw new Error(CHEAT_WARNING);
    }
  }
  if (!hasOpenBettableGame(date, savedName) && !incomingPicks.every(([id, pick]) => existing?.picks?.[id] === pick)) {
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
      events.forEach((event, idx) => {
        const synced = fromEspnEvent(event, date, idx + 1);
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
      });
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
    venue: synced.venue || existing.venue,
    time: synced.time || existing.time
  };
}

function fromEspnEvent(event, date, index) {
  const competition = event.competitions?.[0] || {};
  const competitors = competition.competitors || [];
  const home = competitors.find((item) => item.homeAway === "home") || competitors[0] || {};
  const away = competitors.find((item) => item.homeAway === "away") || competitors[1] || {};
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
  return Object.values(picks || {}).filter(Boolean).length;
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
  const selectedGames = games.filter((game) => picks[game.id]);
  let soloBonusPoints = 0;
  const basePoints = games.reduce((sum, game) => {
    const pick = picks[game.id];
    if (!completedGame(game) || !pickWins(pick, game)) return sum;
    const correctPlayers = correctPlayersForGame(date, game);
    if (correctPlayers.length === 1 && correctPlayers[0] === player) soloBonusPoints += soloGameBonus();
    return sum + pickPoints(pick);
  }, 0);
  const allSelectedCorrect = selectedGames.length > 0 && selectedGames.every((game) => completedGame(game) && pickWins(picks[game.id], game));
  const perfectBonusPoints = games.length > 1 && allSelectedCorrect ? perfectDayBonus() : 0;
  const bonusPoints = soloBonusPoints + perfectBonusPoints;
  return { base: basePoints, soloBonus: soloBonusPoints, perfectBonus: perfectBonusPoints, bonus: bonusPoints, total: basePoints + bonusPoints };
}

function renderBetPanel() {
  const date = getActiveDate();
  const games = state.games[date] || [];
  const values = pointValues();
  const selectedCount = selectedPickCount();
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
    `<span class="rule-pill">GG/NG ${values.both} pts</span>`,
    `<span class="rule-pill">Double ${values.double} pt</span>`,
    `<span class="rule-pill">Favorite handicap -2: ${values.challenge2} pts / -3: ${values.challenge3} pts</span>`,
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
  const selected = selections[game.id] || "";
  const kind = pickKind(selected);
  const locked = isGameLockedForPlayer(game, playerName);
  const challenge = favoriteChallenge(game);
  const typeKeys = challenge ? ["result", "goals", "both", "double", "challenge"] : ["result", "goals", "both", "double"];
  const typeButtons = typeKeys
    .map((key) => {
      const label = key === "both" ? "GG/NG" : key === "challenge" ? "Handicap" : key;
      return `<button class="pick-button ${key === kind ? "selected" : ""}" type="button" data-type="${key}" data-game="${game.id}" ${locked ? "disabled" : ""}>${label}</button>`;
    })
    .join("");
  const optionButtons = kind
    ? (kind === "challenge" ? favoriteChallengeOptions(game) : allowedOptions(kind))
        .map((option) => `<button class="pick-button ${option === selected ? "selected" : ""}" type="button" data-pick="${option}" data-game="${game.id}" ${locked ? "disabled" : ""}>${escapeHtml(pickLabel(option, game))}</button>`)
        .join("")
    : `<span class="small">Choose pick type first</span>`;
  const clearButton = selected && !locked ? `<button class="text-button" type="button" data-clear="${game.id}">Clear this game</button>` : "";
  const challengeBadge = challenge
    ? `<div class="challenge-badge">Favorite Handicap: ${escapeHtml(challenge.side === "1" ? game.team1 : game.team2)} can be picked at -2 or -3</div>`
    : "";
  return `<article class="game-card">
    <div class="game-meta"><span>Game ${game.index}${locked ? " · locked" : ""}</span><span>${game.time ? new Date(game.time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Time TBD"}</span></div>
    ${challengeBadge}
    <div class="teams">
      <div class="team-row"><strong>${escapeHtml(game.team1)}</strong><span>1</span></div>
      <div class="team-row"><strong>${escapeHtml(game.team2)}</strong><span>2</span></div>
    </div>
    <div class="small">${escapeHtml(game.venue || "Venue TBD")}${completedGame(game) ? ` &middot; Final ${game.score1}-${game.score2}` : ""}</div>
    <div class="pick-type"><span>Pick type</span><span>${kind || "none"}</span></div>
    <div class="pick-grid">${typeButtons}</div>
    <div class="pick-type"><span>Pick</span></div>
    <div class="pick-grid">${optionButtons}</div>
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
    ["both", "GG/NG"],
    ["double", "Double 1X/X2/12"],
    ["challenge2", "Favorite -2 handicap"],
    ["challenge3", "Favorite -3 handicap"],
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
    const entries = Object.fromEntries(dayPlayers.map((player) => [player, selectedPickCount(getBetPicks(dayBets[player])) * entry]));
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
  const challenge = challengeInfo(pick);
  if (challenge) {
    const margin = challenge.side === "1" ? game.score1 - game.score2 : game.score2 - game.score1;
    return margin > challenge.margin;
  }
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
  const payoutGroups = Object.values(calc.payoutWinners.reduce((groups, winner) => {
    groups[winner.place] ||= [];
    groups[winner.place].push(winner);
    return groups;
  }, {}));
  const tieSummary = payoutGroups
    .filter((group) => group.length > 1)
    .map((group) => {
      const firstPlace = group[0].place;
      const lastPlace = firstPlace + group.length - 1;
      const places = firstPlace === lastPlace ? `${firstPlace}${ordinalSuffix(firstPlace)}` : `${firstPlace}${ordinalSuffix(firstPlace)} + ${lastPlace}${ordinalSuffix(lastPlace)}`;
      return `<div class="tie-summary"><strong>Current tie:</strong> ${group.map((winner) => escapeHtml(winner.player)).join(" and ")} split the ${places} prize money. Each payout is ${money(group[0].payout)} before entry fees.</div>`;
    })
    .join("");
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
      ${tieSummary}
      <div class="standings-table">
        <div class="standings-row standings-head">
          <span>Player</span>
          <span>Points</span>
          <span>Entry paid</span>
          <span>Payout</span>
          <span>Net</span>
        </div>
        ${rows.map(([player, total]) => {
          const place = rows.findIndex(([, row]) => row.points === total.points) + 1;
          const tied = rows.filter(([, row]) => row.points === total.points).length > 1;
          return `<div class="standings-row">
          <span><strong>${tied ? "T-" : ""}${place}. ${escapeHtml(player)}</strong></span>
          <span class="points-value">${total.points}</span>
          <span>${money(total.entries)}</span>
          <span>${money(total.winnings)}</span>
          <span class="money ${total.balance >= 0 ? "positive" : "negative"}">${signedMoney(total.balance)}</span>
        </div>`;
        }).join("")}
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
              const pick = picks[game.id] || "";
              const marker = completedGame(game) && pick
                ? (pickWins(pick, game)
                    ? `<span class="pick-result correct" title="Correct">✓</span>`
                    : `<span class="pick-result wrong" title="Wrong">X</span>`)
                : `<span class="pick-result"></span>`;
              return `<div class="pick-line">
              <span>G${game.index}</span>
              <strong>${escapeHtml(game.team1)} vs ${escapeHtml(game.team2)}</strong>
              <span>${escapeHtml(pickLabel(pick, game))}</span>
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

function validateSelections(date) {
  const games = state.games[date] || [];
  const validIds = new Set(games.map((game) => game.id));
  const picks = Object.entries(selections).filter(([id, pick]) => validIds.has(id) && pick);
  if (!picks.length) return "Pick at least one game.";
  if (picks.length > games.length) return `This day has only ${games.length} games.`;
  const badPick = picks.find(([, pick]) => !pickKind(pick));
  if (badPick) return "One of the selected picks is not allowed.";
  const badChallenge = picks.find(([id, pick]) => pickKind(pick) === "challenge" && !favoriteChallengeOptions(games.find((game) => game.id === id)).includes(pick));
  if (badChallenge) return "One favorite challenge pick is not available for that game.";
  const playerName = $("playerName")?.value?.trim() || "";
  const savedName = findPlayerName(playerName) || playerName;
  const existingPicks = getBetPicks(state.bets[date]?.[savedName]) || {};
  const lockedPick = picks.find(([id, pick]) => isGameLockedForPlayer(games.find((game) => game.id === id), savedName) && existingPicks[id] !== pick);
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

  $("playerName")?.addEventListener("input", renderBetPanel);

  $("gamesList").addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const gameId = button.dataset.game || button.dataset.clear;
    if (button.dataset.clear) {
      delete selections[gameId];
    } else if (button.dataset.type) {
      const game = (state.games[getActiveDate()] || []).find((item) => item.id === gameId);
      selections[gameId] = (button.dataset.type === "challenge" ? favoriteChallengeOptions(game) : allowedOptions(button.dataset.type))[0];
    } else if (button.dataset.pick) {
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
    const validIds = new Set((state.games[date] || []).map((game) => game.id));
    const picks = Object.fromEntries(Object.entries(selections).filter(([id, pick]) => validIds.has(id) && pick));
    try {
      await saveBet(date, playerName, playerPin, picks);
    } catch (error) {
      return showToast(error.message);
    }
    selectedHistoryDate = date;
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
