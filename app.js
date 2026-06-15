const SUPABASE_URL = window.APP_CONFIG?.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = window.APP_CONFIG?.SUPABASE_ANON_KEY || "";
const ADMIN_PIN_HASH = window.APP_CONFIG?.ADMIN_PIN_HASH || "";
const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";
const ESPN_FRIENDLY_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.friendly/scoreboard";
const STORAGE_KEY = "worldCupPredictionBank.v1";
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
  perfectDayBonus: 4
};
const DEFAULT_RULES = {
  1: { result: 1, goals: 1, double: 0 },
  2: { result: 2, goals: 0, double: 0 },
  3: { result: 1, goals: 1, double: 1 },
  4: { result: 1, goals: 2, double: 1 },
  6: { result: 2, goals: 0, double: 4 }
};

let db = null;
let adminUnlocked = false;
let finalSyncTimer = null;
let state = {
  settings: {
    entryAmount: 1,
    players: [],
    maxPlayers: 7,
    rules: DEFAULT_RULES,
    pointValues: DEFAULT_POINT_VALUES,
    gameBetting: {}
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

function pickKind(value) {
  if (RESULT_OPTIONS.includes(value)) return "result";
  if (DOUBLE_OPTIONS.includes(value)) return "double";
  if (GOAL_OPTIONS.includes(value)) return "goals";
  if (BOTH_OPTIONS.includes(value)) return "both";
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

function gameBettingStatus(game) {
  return state.settings.gameBetting?.[game?.id] || "auto";
}

function pickPoints(pick) {
  const kind = pickKind(pick);
  return kind ? Number(pointValues()[kind]) || 0 : 0;
}

function perfectDayBonus() {
  return Number(pointValues().perfectDayBonus) || 0;
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
    const existingPick = existing?.picks?.[id];
    if (isGameLocked(game) && existingPick !== pick) {
      throw new Error(CHEAT_WARNING);
    }
  }
  if (!hasOpenBettableGame(date) && !incomingPicks.every(([id, pick]) => existing?.picks?.[id] === pick)) {
    throw new Error(CHEAT_WARNING);
  }
  if (existing?.pinHash && existing.pinHash !== pinHash) {
    throw new Error("This name already has a bet. Use the same PIN to edit it.");
  }
  if (!state.settings.players.includes(savedName)) {
    if (state.settings.players.length >= maxPlayers()) {
      throw new Error(`Maximum ${maxPlayers()} players are allowed.`);
    }
    state.settings.players.push(savedName);
  }
  const mergedPicks = {};
  if (existing?.picks) {
    Object.entries(existing.picks).forEach(([id, pick]) => {
      const game = gamesById.get(id);
      if (game && isGameLocked(game)) mergedPicks[id] = pick;
    });
  }
  incomingPicks.forEach(([id, pick]) => {
    const game = gamesById.get(id);
    if (!isGameLocked(game) || existing?.picks?.[id] === pick) mergedPicks[id] = pick;
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
      document.querySelectorAll(".tab, .panel").forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");
      $(`${tab.dataset.tab}Panel`).classList.add("active");
    });
  });

  $("dateSelect").addEventListener("change", () => {
    selections = {};
    renderBetPanel();
  });

  $("gamesList").addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const gameId = button.dataset.game;
    if (button.dataset.type) {
      selections[gameId] = allowedOptions(button.dataset.type)[0];
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
    if (!hasOpenBettableGame(date)) return showToast(CHEAT_WARNING);
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

  $("adminMatchControls").addEventListener("change", async (event) => {
    if (!adminUnlocked) return showToast("Unlock admin first.");
    const input = event.target;
    const gameId = input.dataset.bettingGame;
    if (!gameId) return;
    state.settings.gameBetting ||= {};
    if (input.value === "auto") delete state.settings.gameBetting[gameId];
    else state.settings.gameBetting[gameId] = input.value;
    await persist();
    renderAll();
    showToast("Match betting control saved.");
  });

  $("adminBetResetList").addEventListener("click", async (event) => {
    if (!adminUnlocked) return showToast("Unlock admin first.");
    const button = event.target.closest("button[data-reset-date]");
    if (!button) return;
    const date = button.dataset.resetDate;
    const player = button.dataset.resetPlayer;
    if (!date || !player || !state.bets[date]?.[player]) return;
    delete state.bets[date][player];
    if (!Object.keys(state.bets[date]).length) delete state.bets[date];
    if (db) {
      await db.from("bets").delete().eq("match_date", date).eq("player_name", player);
      await db.from("settings").upsert({ id: "main", data: state.settings, updated_at: new Date().toISOString() });
    } else {
      saveLocal();
    }
    selections = {};
    renderAll();
    showToast(`${player}'s bet was reset for ${prettyDate(date)}.`);
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

function isGameLocked(game) {
  const status = gameBettingStatus(game);
  if (status === "closed") return true;
  if (!game?.time) return false;
  if (status === "open") return Date.now() >= new Date(game.time).getTime();
  if (SPECIAL_GAME_LOCK_OVERRIDES.has(String(game.id))) {
    return Date.now() >= new Date(game.time).getTime();
  }
  return isLocked(game.date);
}

function hasOpenBettableGame(date) {
  return (state.games[date] || []).some((game) => !isGameLocked(game));
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
  const games = state.games[date] || [];
  const picks = getBetPicks(state.bets[date]?.[player]) || {};
  const selectedGames = games.filter((game) => picks[game.id]);
  const basePoints = games.reduce((sum, game) => {
    const pick = picks[game.id];
    return completedGame(game) && pickWins(pick, game) ? sum + pickPoints(pick) : sum;
  }, 0);
  const allSelectedCorrect = selectedGames.length > 0 && selectedGames.every((game) => completedGame(game) && pickWins(picks[game.id], game));
  return games.length > 1 && allSelectedCorrect ? basePoints + perfectDayBonus() : basePoints;
}

function renderBetPanel() {
  const date = getActiveDate();
  const games = state.games[date] || [];
  const values = pointValues();
  const selectedCount = selectedPickCount();
  const cost = selectedCount * (Number(state.settings.entryAmount) || 0);
  $("activeDateTitle").textContent = `${prettyDate(date)}${countedDate(date) ? "" : " - test only"}`;
  $("dayRuleStrip").innerHTML = [
    `<span class="rule-pill">1 pick per selected game</span>`,
    `<span class="rule-pill">Result ${values.result} pts</span>`,
    `<span class="rule-pill">Goals ${values.goals} pts</span>`,
    `<span class="rule-pill">GG/NG ${values.both} pts</span>`,
    `<span class="rule-pill">Double ${values.double} pt</span>`,
    `<span class="rule-pill">All correct bonus ${perfectDayBonus()} pts</span>`
  ].join("");
  $("betCost").innerHTML = `<strong>${selectedCount}</strong> selected game${selectedCount === 1 ? "" : "s"} &middot; Cost ${money(cost)}`;
  $("currentResults").innerHTML = renderMiniResults(date);
  $("gamesList").innerHTML = games.map(renderGameCard).join("");
  $("nextMatchdayPreview").innerHTML = renderNextMatchdayPreview(date);

  const locked = !hasOpenBettableGame(date);
  $("saveBetButton").disabled = locked;
  $("saveBetButton").querySelector("span").textContent = locked ? "Bets locked" : "Save my bet";
}

function renderGameCard(game) {
  const selected = selections[game.id] || "";
  const kind = pickKind(selected);
  const locked = isGameLocked(game);
  const typeButtons = ["result", "goals", "both", "double"]
    .map((key) => {
      const label = key === "both" ? "GG/NG" : key;
      return `<button class="pick-button ${key === kind ? "selected" : ""}" type="button" data-type="${key}" data-game="${game.id}" ${locked ? "disabled" : ""}>${label}</button>`;
    })
    .join("");
  const optionButtons = kind
    ? allowedOptions(kind)
        .map((option) => `<button class="pick-button ${option === selected ? "selected" : ""}" type="button" data-pick="${option}" data-game="${game.id}" ${locked ? "disabled" : ""}>${option}</button>`)
        .join("")
    : `<span class="small">Choose pick type first</span>`;
  const clearButton = selected && !locked ? `<button class="text-button" type="button" data-clear="${game.id}">Clear this game</button>` : "";
  return `<article class="game-card">
    <div class="game-meta"><span>Game ${game.index}${locked ? " · locked" : ""}</span><span>${game.time ? new Date(game.time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Time TBD"}</span></div>
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
    ["perfectDayBonus", "All selected correct bonus"]
  ].map(([key, label]) => `<label class="field point-field">
      <span>${label}</span>
      <input data-point-kind="${key}" type="number" min="0" step="1" value="${values[key]}" />
    </label>`)
    .join("");
  $("adminMatchControls").innerHTML = Object.keys(DATE_COUNTS)
    .map((date) => {
      const rows = (state.games[date] || [])
        .map((game) => {
          const status = gameBettingStatus(game);
          const result = completedGame(game) ? `Final ${game.score1}-${game.score2}` : (isGameLocked(game) ? "Locked" : "Open");
          return `<div class="admin-match-row">
            <div>
              <strong>${prettyDate(date)} &middot; G${game.index}</strong>
              <div class="small">${escapeHtml(game.team1)} vs ${escapeHtml(game.team2)} &middot; ${result}</div>
            </div>
            <select data-betting-game="${game.id}" aria-label="Betting status for ${escapeHtml(game.team1)} vs ${escapeHtml(game.team2)}">
              <option value="auto" ${status === "auto" ? "selected" : ""}>Auto</option>
              <option value="open" ${status === "open" ? "selected" : ""}>Open</option>
              <option value="closed" ${status === "closed" ? "selected" : ""}>Closed</option>
            </select>
          </div>`;
        })
        .join("");
      return rows ? `<article class="game-card"><div class="game-meta"><strong>${prettyDate(date)}</strong><span>${rows ? "" : "No games"}</span></div>${rows}</article>` : "";
    })
    .join("") || `<div class="empty">No games available yet.</div>`;
  $("adminBetResetList").innerHTML = Object.keys(DATE_COUNTS)
    .map((date) => {
      const players = Object.keys(state.bets[date] || {}).sort((a, b) => a.localeCompare(b));
      if (!players.length) return "";
      return `<article class="game-card">
        <div class="game-meta"><strong>${prettyDate(date)}</strong><span>${players.length} saved</span></div>
        ${players.map((player) => `<div class="admin-reset-row">
          <div><strong>${escapeHtml(player)}</strong><div class="small">${selectedPickCount(getBetPicks(state.bets[date][player]))} pick${selectedPickCount(getBetPicks(state.bets[date][player])) === 1 ? "" : "s"} saved</div></div>
          <button class="danger-button" type="button" data-reset-date="${date}" data-reset-player="${escapeHtml(player)}">Reset bet</button>
        </div>`).join("")}
      </article>`;
    })
    .join("") || `<div class="empty">No saved bets to reset.</div>`;
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

    if (!complete || testOnly) {
      daily.push({ date, bank: testOnly ? 0 : dayEntryTotal, winners: [], complete, testOnly, points: {} });
      return;
    }

    totalPot += dayEntryTotal;
    dayPlayers.forEach((player) => {
      totals[player].entries += entries[player] || 0;
    });

    const points = Object.fromEntries(dayPlayers.map((player) => {
      const total = dailyPlayerPoints(date, player);
      totals[player].points += total;
      return [player, total];
    }));

    daily.push({ date, bank: dayEntryTotal, winners: [], complete, testOnly, points });
  });

  const totalPoints = Object.values(totals).reduce((sum, total) => sum + total.points, 0);
  if (totalPoints > 0) {
    players.forEach((player) => {
      totals[player].winnings = (totals[player].points / totalPoints) * totalPot;
    });
  }

  players.forEach((player) => {
    totals[player].balance = totals[player].winnings - totals[player].entries;
  });

  return { players, totals, daily, currentRollover: 0, totalPot, totalPoints, settlements: settlements(totals) };
}

function pickWins(pick, game) {
  if (!pick || !completedGame(game)) return false;
  const result = game.score1 > game.score2 ? "1" : game.score1 < game.score2 ? "2" : "X";
  const total = game.score1 + game.score2;
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
  $("standingsList").innerHTML = rows.length
    ? `<div class="standings-table">
        <div class="standings-row standings-head">
          <span>Player</span>
          <span>Points</span>
          <span>Entry</span>
          <span>Won</span>
          <span>Balance</span>
        </div>
        ${rows.map(([player, total], index) => `<div class="standings-row">
          <span><strong>${index + 1}. ${escapeHtml(player)}</strong></span>
          <span class="points-value">${total.points}</span>
          <span>${money(total.entries)}</span>
          <span>${money(total.winnings)}</span>
          <span class="money ${total.balance >= 0 ? "positive" : "negative"}">${money(total.balance)}</span>
        </div>`).join("")}
      </div>`
    : `<div class="empty">Add players by saving bets.</div>`;

  $("settlementList").innerHTML = calc.settlements.length
    ? calc.settlements.map((row) => `<article class="settlement-card"><strong>${escapeHtml(row.from)}</strong> sends <strong>${money(row.amount)}</strong> to <strong>${escapeHtml(row.to)}</strong></article>`).join("")
    : `<div class="empty">No payments needed yet.</div>`;

  $("dailyList").innerHTML = calc.daily
    .filter((day) => day.complete || day.testOnly)
    .map((day) => {
      const pointText = Object.entries(day.points || {}).length
        ? `<div class="daily-points">${Object.entries(day.points)
            .sort((a, b) => b[1] - a[1])
            .map(([player, points]) => `<span><strong>${escapeHtml(player)}</strong> ${points} pts</span>`)
            .join("")}</div>`
        : day.testOnly ? "Test day - not counted" : "No points yet";
      return `<article class="daily-card">
        <strong>${prettyDate(day.date)}${day.testOnly ? " (test)" : ""}</strong>
        <div class="small">Entries ${money(day.bank)} &middot; ${day.testOnly ? "Not counted" : "Added to total pot"}</div>
        <div class="small">${pointText}</div>
      </article>`;
    })
    .join("") || `<div class="empty">Daily results will appear after final scores are entered or synced.</div>`;
}

function renderHistory() {
  $("historyList").innerHTML = Object.keys(DATE_COUNTS)
    .map((date) => {
      const bets = state.bets[date] || {};
      const players = Object.keys(bets);
      if (!players.length) return "";
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
              <span>${escapeHtml(pick || "-")}</span>
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
  const lockedPick = picks.find(([id]) => isGameLocked(games.find((game) => game.id === id)));
  if (lockedPick) return "One selected game is locked. Only open games can be saved.";
  return "";
}

function bindEvents() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab, .panel").forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");
      $(`${tab.dataset.tab}Panel`).classList.add("active");
    });
  });

  $("dateSelect").addEventListener("change", () => {
    selections = {};
    renderBetPanel();
  });

  $("gamesList").addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const gameId = button.dataset.game || button.dataset.clear;
    if (button.dataset.clear) {
      delete selections[gameId];
    } else if (button.dataset.type) {
      selections[gameId] = allowedOptions(button.dataset.type)[0];
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
    if (!hasOpenBettableGame(date)) return showToast(CHEAT_WARNING);
    const error = validateSelections(date);
    if (error) return showToast(error);
    const validIds = new Set((state.games[date] || []).map((game) => game.id));
    const picks = Object.fromEntries(Object.entries(selections).filter(([id, pick]) => validIds.has(id) && pick));
    try {
      await saveBet(date, playerName, playerPin, picks);
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

  $("adminMatchControls").addEventListener("change", async (event) => {
    if (!adminUnlocked) return showToast("Unlock admin first.");
    const input = event.target;
    const gameId = input.dataset.bettingGame;
    if (!gameId) return;
    state.settings.gameBetting ||= {};
    if (input.value === "auto") delete state.settings.gameBetting[gameId];
    else state.settings.gameBetting[gameId] = input.value;
    await persist();
    renderAll();
    showToast("Match betting control saved.");
  });

  $("adminBetResetList").addEventListener("click", async (event) => {
    if (!adminUnlocked) return showToast("Unlock admin first.");
    const button = event.target.closest("button[data-reset-date]");
    if (!button) return;
    const date = button.dataset.resetDate;
    const player = button.dataset.resetPlayer;
    if (!date || !player || !state.bets[date]?.[player]) return;
    delete state.bets[date][player];
    if (!Object.keys(state.bets[date]).length) delete state.bets[date];
    if (db) {
      await db.from("bets").delete().eq("match_date", date).eq("player_name", player);
      await db.from("settings").upsert({ id: "main", data: state.settings, updated_at: new Date().toISOString() });
    } else {
      saveLocal();
    }
    selections = {};
    renderAll();
    showToast(`${player}'s bet was reset for ${prettyDate(date)}.`);
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
  await syncFixtures(true);
  scheduleFinalResultSync();
});
