"use strict";

const ROMAJI = [
  "a", "i", "u", "e", "o",
  "ka", "ki", "ku", "ke", "ko",
  "sa", "shi", "su", "se", "so",
  "ta", "chi", "tsu", "te", "to",
  "na", "ni", "nu", "ne", "no",
  "ha", "hi", "fu", "he", "ho",
  "ma", "mi", "mu", "me", "mo",
  "ya", "yu", "yo",
  "ra", "ri", "ru", "re", "ro",
  "wa", "wo", "n"
];

const HIRAGANA = [
  "あ", "い", "う", "え", "お",
  "か", "き", "く", "け", "こ",
  "さ", "し", "す", "せ", "そ",
  "た", "ち", "つ", "て", "と",
  "な", "に", "ぬ", "ね", "の",
  "は", "ひ", "ふ", "へ", "ほ",
  "ま", "み", "む", "め", "も",
  "や", "ゆ", "よ",
  "ら", "り", "る", "れ", "ろ",
  "わ", "を", "ん"
];

const KATAKANA = [
  "ア", "イ", "ウ", "エ", "オ",
  "カ", "キ", "ク", "ケ", "コ",
  "サ", "シ", "ス", "セ", "ソ",
  "タ", "チ", "ツ", "テ", "ト",
  "ナ", "ニ", "ヌ", "ネ", "ノ",
  "ハ", "ヒ", "フ", "ヘ", "ホ",
  "マ", "ミ", "ム", "メ", "モ",
  "ヤ", "ユ", "ヨ",
  "ラ", "リ", "ル", "レ", "ロ",
  "ワ", "ヲ", "ン"
];

const STORAGE_KEY = "smart-nihongo-demo-v1";
const LEARNER_KEY = "smart-nihongo-learner-id";
const PROGRESS_API = "progress.php";
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const app = document.querySelector("#app");
const toastElement = document.querySelector("#toast");
let toastTimer = 0;
let currentDeck = "hiragana";
let favoritesOnly = false;
let answerRevealed = false;
let recognition = null;
let quiz = null;
let welcomeSpoken = false;
let authState = { user: null, csrf: "" };

const state = loadState();
const learnerId = getLearnerId();
let saveTimer = 0;

function getLearnerId() {
  let id = localStorage.getItem(LEARNER_KEY);
  if (!id || !/^[a-f0-9-]{36}$/.test(id)) {
    id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2).padEnd(23, "0")}`;
    localStorage.setItem(LEARNER_KEY, id);
  }
  return id;
}

function defaultDeckState() {
  return {
    guide: "sensei",
    index: 0,
    seen: Array(46).fill(false),
    ratings: Array(46).fill(0),
    favorites: Array(46).fill(false)
  };
}

function defaultState() {
  return {
    lastDeck: "hiragana",
    experience: "",
    learningGoal: "",
    livingSituation: "",
    livingProgress: {},
    casualProgress: {},
    immersionProgress: 0,
    immersionGuide: "gozo",
    settings: { voice: true, sound: true },
    decks: {
      hiragana: defaultDeckState(),
      katakana: defaultDeckState()
    }
  };
}

function loadState() {
  const fallback = defaultState();
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!stored || typeof stored !== "object") return fallback;

    for (const name of ["hiragana", "katakana"]) {
      const deck = stored.decks && stored.decks[name];
      if (!deck) continue;
      fallback.decks[name].index = clamp(Number(deck.index) || 0, 0, 45);
      for (const field of ["seen", "favorites"]) {
        if (Array.isArray(deck[field])) {
          fallback.decks[name][field] = Array.from({ length: 46 }, (_, i) => Boolean(deck[field][i]));
        }
      }
      if (Array.isArray(deck.ratings)) {
        fallback.decks[name].ratings = Array.from(
          { length: 46 },
          (_, i) => clamp(Number(deck.ratings[i]) || 0, 0, 2)
        );
      }
    }

    fallback.lastDeck = stored.lastDeck === "katakana" ? "katakana" : "hiragana";
    fallback.guide = ["daichi", "sensei", "gozo"].includes(stored.guide) ? stored.guide : "sensei";
    fallback.learningGoal = typeof stored.learningGoal === "string" ? stored.learningGoal : "";
    fallback.experience = typeof stored.experience === "string" ? stored.experience : "";
    fallback.livingSituation = typeof stored.livingSituation === "string" ? stored.livingSituation : "";
    fallback.livingProgress = stored.livingProgress && typeof stored.livingProgress === "object" ? stored.livingProgress : {};
    fallback.casualProgress = stored.casualProgress && typeof stored.casualProgress === "object" ? stored.casualProgress : {};
    fallback.immersionProgress = clamp(Number(stored.immersionProgress) || 0, 0, 9);
    fallback.immersionGuide = typeof stored.immersionGuide === "string" ? stored.immersionGuide : "gozo";
    fallback.settings.voice = stored.settings?.voice !== false;
    fallback.settings.sound = stored.settings?.sound !== false;
  } catch (error) {
    console.warn("Could not load Smart Nihongo progress.", error);
  }
  return fallback;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  clearTimeout(saveTimer);
  saveTimer = setTimeout(syncProgress, 350);
}

async function syncProgress() {
  try {
    await fetch(PROGRESS_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ learnerId, state })
    });
  } catch (error) {
    console.warn("Cloud progress sync is temporarily unavailable.", error);
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function deckCharacters(name) {
  return name === "katakana" ? KATAKANA : HIRAGANA;
}

function deckLabel(name) {
  return name === "katakana" ? "Katakana" : "Hiragana";
}

const GUIDE_PROFILES = {
  daichi: {name:"Daichi", image:"assets/guide-daichi.png", style:"Casual and friendly", intro:"No pressure. We’ll make this sound natural, one step at a time."},
  sensei: {name:"Sensei", image:"assets/guide-sensei.png", style:"Patient and structured", intro:"I’ll guide you carefully and help you build a strong foundation."},
  gozo: {name:"Gozo", image:"assets/gozo.png", style:"Strict and confidence-focused", intro:"We learn it properly. Again when needed. No weak answers."}
};
function currentGuide(){return GUIDE_PROFILES[state.guide]||GUIDE_PROFILES.sensei;}
function guideKanaLine(kind,character,romaji){const lines={daichi:{reveal:`Nice—${character} is “${romaji}.” Say it naturally, not like a robot.`,again:"No worries. We’ll loop it until it sticks.",learning:"Good. It’s getting familiar.",known:"Nice! You’ve got this one."},sensei:{reveal:`${character} is pronounced “${romaji}.” Listen once, then repeat clearly.`,again:"That’s okay. Careful repetition builds memory.",learning:"Good progress. Let’s reinforce it once more.",known:"Excellent work. This character is becoming automatic."},gozo:{reveal:`${character}. “${romaji}.” Eyes up. Say it like you mean it.`,again:"Again. Memory respects persistence.",learning:"Better. Not finished, but better.",known:"Good. One less character standing in your way."}};return lines[state.guide]?.[kind]||lines.sensei[kind];}

function stats(name) {
  const deck = state.decks[name];
  return {
    seen: deck.seen.filter(Boolean).length,
    mastered: deck.ratings.filter(value => value === 2).length,
    favorites: deck.favorites.filter(Boolean).length
  };
}

function hasProgress() {
  return Boolean(state.experience || state.learningGoal || stats("hiragana").seen + stats("katakana").seen > 0);
}

function totalStats() {
  const hira = stats("hiragana");
  const kata = stats("katakana");
  return {
    seen: hira.seen + kata.seen,
    mastered: hira.mastered + kata.mastered
  };
}

function renderMain() {
  stopRecognition();
  const totals = totalStats();
  app.innerHTML = `
    <main class="screen school-bg">
      <div class="main-layout">
        <section class="brand-zone" aria-label="Smart Nihongo">
          <img class="brand-logo" src="assets/smart-nihongo-logo.png" alt="Smart Nihongo University">
          <div class="progress-pill">Kana ${totals.seen}/92 seen &nbsp;|&nbsp; ${totals.mastered} mastered</div>
        </section>
        <section class="menu-panel" aria-label="Main menu">
          <div class="menu-buttons">
            <button class="account-button" data-action="account">${authState.user ? `👤 ${authState.user.username}` : "Log in / Create Account"}</button>
            <button class="cartoon-button" data-action="start">Start New</button>
            <button class="cartoon-button" data-action="continue" ${hasProgress() ? "" : "disabled"}>Existing Progress</button>
            <button class="cartoon-button" data-action="options">Options</button>
            <button class="cartoon-button red" data-action="exit">Exit</button>
          </div>
        </section>
      </div>
    </main>`;

  app.querySelector('[data-action="start"]').addEventListener("click", renderGuideSelection);
  app.querySelector('[data-action="account"]').addEventListener("click", showAccount);
  const continueButton = app.querySelector('[data-action="continue"]');
  if (!continueButton.disabled) {
    continueButton.addEventListener("click", continueLearning);
  }
  app.querySelector('[data-action="options"]').addEventListener("click", showOptions);
  app.querySelector('[data-action="exit"]').addEventListener("click", () => {
    window.close();
    renderMain();
    showToast("Progress saved. Smart Nihongo is ready when you return.");
  });
}

function renderGuideSelection(){
  app.innerHTML=`<main class="screen guide-choice-screen"><section class="guide-choice-shell"><div class="top-bar"><button class="icon-button" data-action="back">&#8249;</button><div class="title-stack"><h1>Who Do You Want to Learn From?</h1><p>Your guide changes how every lesson is explained, practiced, and encouraged.</p></div><span style="width:54px"></span></div><img class="guide-group-art" src="assets/guides-group.png" alt="Daichi, Sensei, and Gozo in the Smart Nihongo classroom"><div class="global-guide-grid">${Object.entries(GUIDE_PROFILES).map(([id,g])=>`<button class="global-guide-card ${state.guide===id?'selected':''}" data-global-guide="${id}"><img src="${g.image}" alt="${g.name}"><span><strong>${g.name}</strong><small>${g.style}</small><p>${g.intro}</p></span></button>`).join('')}</div></section></main>`;
  app.querySelector('[data-action="back"]').addEventListener('click',renderMain);
  app.querySelectorAll('[data-global-guide]').forEach(button=>button.addEventListener('click',()=>{state.guide=button.dataset.globalGuide;saveState();const g=currentGuide();speakGuide(g.intro,'en-US');renderExperience();}));
}

async function refreshAuth() {
  try {
    const response = await fetch("auth.php?action=status", { credentials: "same-origin" });
    const data = await response.json();
    if (data.ok) authState = { user: data.user, csrf: data.csrf };
  } catch (error) { console.warn("Account status unavailable.", error); }
}

async function loadCloudProgress() {
  try {
    const response = await fetch(`${PROGRESS_API}?learnerId=${encodeURIComponent(learnerId)}`, { credentials: "same-origin" });
    const data = await response.json();
    if (!data.ok || !data.state) return false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data.state));
    Object.assign(state, loadState());
    return true;
  } catch (error) { return false; }
}

function showAccount() {
  const backdrop = document.createElement("div");
  backdrop.className = "dialog-backdrop";
  backdrop.innerHTML = authState.user ? `
    <section class="dialog account-dialog" role="dialog" aria-modal="true"><h2>Your Account</h2><p>Signed in as <strong>${escapeHtml(authState.user.username)}</strong></p><p>Your learning path and progress are saved to this account.</p><div class="dialog-actions"><button class="cartoon-button small red" data-auth="logout">Log out</button><button class="cartoon-button small" data-auth="close">Done</button></div></section>` : `
    <section class="dialog account-dialog" role="dialog" aria-modal="true"><h2>Smart Nihongo Account</h2><p>Log in to keep your progress with your username.</p><form class="account-form"><label>Username<input name="username" autocomplete="username" minlength="3" maxlength="40" required></label><label>Password<input name="password" type="password" autocomplete="current-password" minlength="8" required></label><p class="form-error" aria-live="polite"></p><div class="dialog-actions"><button class="cartoon-button small" type="submit" data-auth="login">Log in</button><button class="cartoon-button small green-button" type="button" data-auth="register">Create account</button></div></form><button class="text-button" data-auth="close">Not now</button></section>`;
  document.body.appendChild(backdrop);
  backdrop.querySelector('[data-auth="close"]').addEventListener("click", () => backdrop.remove());
  if (authState.user) {
    backdrop.querySelector('[data-auth="logout"]').addEventListener("click", async () => {
      await authRequest("logout", {}); await refreshAuth(); backdrop.remove(); renderMain(); showToast("You are logged out.");
    });
    return;
  }
  const form = backdrop.querySelector("form");
  const submit = action => async event => { event?.preventDefault(); const values = Object.fromEntries(new FormData(form)); const result = await authRequest(action, values); if (!result.ok) { form.querySelector('.form-error').textContent = result.error; return; } await syncProgress(); backdrop.remove(); renderMain(); showToast(action === "register" ? "Account created. Progress saved!" : "Welcome back! Progress loaded."); };
  form.addEventListener("submit", submit("login"));
  form.querySelector('[data-auth="register"]').addEventListener("click", submit("register"));
  form.querySelector("input").focus();
}

async function authRequest(action, values) {
  try {
    const response = await fetch(`auth.php?action=${action}`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, csrf: authState.csrf }) });
    const data = await response.json();
    if (data.ok) { authState = { user: data.user || null, csrf: data.csrf || "" }; if (action === "login") await loadCloudProgress(); }
    return data;
  } catch (error) { return { ok: false, error: "Account service is temporarily unavailable." }; }
}

function escapeHtml(value) { const div = document.createElement("div"); div.textContent = value; return div.innerHTML; }

function continueLearning() {
  if (state.learningGoal === "living-japan") return state.livingSituation ? renderLivingJourney(state.livingSituation) : renderLivingDashboard();
  if (state.learningGoal === "kana") return openDeck(state.lastDeck);
  if (state.learningGoal === "conversation") return renderConversationDashboard();
  if (state.learningGoal === "immersion") return renderImmersionGuides();
  renderPaths();
}

function renderExperience() {
  const guide=currentGuide();
  const levels = [
    ["new", "New to Japanese", "Start with guidance and essential foundations."],
    ["some", "I know a little", "I recognize some words, phrases, or kana."],
    ["returning", "Returning learner", "Build on previous study and move faster."],
    ["confident", "Confident speaker", "Focus on real situations and targeted practice."]
  ];
  app.innerHTML = `
    <main class="screen school-bg"><div class="screen-inner path-layout"><section class="path-content">
      <div class="top-bar"><button class="icon-button" data-action="back">&#8249;</button><div class="title-stack"><h1>Select Your Experience</h1><p>${guide.name}: ${guide.intro}</p></div><img class="selected-guide-mini" src="${guide.image}" alt="${guide.name}"></div>
      <div class="path-list">${levels.map(([id, title, copy], i) => `<button class="path-row" data-experience="${id}"><span class="path-badge">${i + 1}</span><span class="path-name">${title}</span><span class="path-description">${copy}</span><img class="path-end" src="assets/arrow-right.png" alt=""></button>`).join("")}</div>
    </section><div class="teacher-wrap"><img class="teacher" src="${guide.image}" alt="${guide.name}"></div></div></main>`;
  app.querySelector('[data-action="back"]').addEventListener("click", renderGuideSelection);
  app.querySelectorAll("[data-experience]").forEach(button => button.addEventListener("click", () => {
    state.experience = button.dataset.experience;
    saveState();
    renderPaths();
  }));
}

function renderPaths() {
  const guide=currentGuide();
  const rows = [
    ["認", "Certification Path", "Prepare for N5, N4, and beyond", "certification"],
    ["日", "Living in Japan", "Practice daily life situations", "living-japan"],
    ["話", "Conversation Practice", "Speak and respond in real scenarios", "conversation"],
    ["あ", "Hiragana / Katakana", "Build your reading foundation", "kana"],
    ["旅", "Learn by Immersion", "Talk your way through Japan with a native guide", "immersion"]
  ];

  app.innerHTML = `
    <main class="screen school-bg">
      <div class="screen-inner path-layout">
        <section class="path-content">
          <div class="top-bar">
            <button class="icon-button" data-action="back" aria-label="Back to main menu" title="Back to main menu">&#8249;</button>
            <div class="title-stack"><h1>Choose Your Learning Goal</h1><p>${guide.name} will guide this learning path.</p></div>
            <img class="selected-guide-mini" src="${guide.image}" alt="${guide.name}">
          </div>
          <div class="path-list">
            ${rows.map(([badge, name, description, goal]) => `
              <button class="path-row" data-goal="${goal}">
                <span class="path-badge">${badge}</span>
                <span class="path-name">${name}</span>
                <span class="path-description">${description}</span>
                <img class="path-end" src="assets/arrow-right.png" alt="">
              </button>`).join("")}
          </div>
        </section>
        <div class="teacher-wrap"><img class="teacher" src="${guide.image}" alt="${guide.name}"></div>
      </div>
    </main>`;

  app.querySelector('[data-action="back"]').addEventListener("click", renderExperience);
  app.querySelectorAll("[data-goal]").forEach(button => {
    button.addEventListener("click", () => {
      state.learningGoal = button.dataset.goal;
      saveState();
      if (state.learningGoal === "living-japan") renderLivingDashboard();
      else if (state.learningGoal === "kana") renderDecks();
      else if (state.learningGoal === "conversation") renderConversationDashboard();
      else if (state.learningGoal === "immersion") renderImmersionGuides();
      else renderGoalPreview(button.querySelector('.path-name').textContent);
    });
  });
}

const IMMERSION_TURNS = [
  {scene:"arrivals",place:"Narita arrivals",jp:"おう。長旅、ご苦労さん。俺はゴーゾーだ。",kana:"おう。ながたび、ごくろうさん。おれは ごーぞーだ。",romaji:"Ou. Nagatabi, gokurou-san. Ore wa Goozoo da.",en:"Hey. Long trip, huh? I'm Gozo.",prompt:"Introduce yourself.",choices:[["よろしくお願いします。","Yoroshiku onegaishimasu.",true],["お会計をお願いします。","Okaikei o onegaishimasu.",false],["さようなら。","Sayounara.",false]],note:"俺 (ore) is Gozo's rough, masculine 'I.' Use 私 (watashi) yourself when unsure."},
  {scene:"arrivals",place:"Finding your driver",jp:"名前は？ 看板を忘れた。字が多いと肩が凝るんでな。",kana:"なまえは？ かんばんを わすれた。じが おおいと かたが こるんでな。",romaji:"Namae wa? Kanban o wasureta. Ji ga ooi to kata ga koru n de na.",en:"Your name? I forgot the sign. Too many letters make my shoulders stiff.",prompt:"Tell him your name.",choices:[["オットーです。","Ottoo desu.",true],["名前はどこですか。","Namae wa doko desu ka.",false],["空港です。","Kuukou desu.",false]],note:"Name + です is the safest simple introduction."},
  {scene:"pickup",place:"Parking garage",jp:"荷物、それだけか？ いい旅人だ。引っ越し屋じゃなくて助かった。",kana:"にもつ、それだけか？ いい たびびとだ。ひっこしやじゃなくて たすかった。",romaji:"Nimotsu, sore dake ka? Ii tabibito da. Hikkoshiya janakute tasukatta.",en:"That's all your luggage? Good traveler. Glad you're not moving house.",prompt:"Say that this is all your luggage.",choices:[["はい、これだけです。","Hai, kore dake desu.",true],["いいえ、ホテルです。","Iie, hoteru desu.",false],["荷物を食べます。","Nimotsu o tabemasu.",false]],note:"これだけです means 'this is all.' Very useful at airports and hotels."},
  {scene:"car",place:"Leaving Narita",jp:"シートベルトしろよ。東京の道は、礼儀正しい顔した戦場だ。",kana:"しーとべると しろよ。とうきょうの みちは、れいぎただしい かおした せんじょうだ。",romaji:"Shiito beruto shiro yo. Toukyou no michi wa, reigi tadashii kao shita senjou da.",en:"Put your seatbelt on. Tokyo roads are a battlefield wearing a polite face.",prompt:"Acknowledge that you understand.",choices:[["わかりました。","Wakarimashita.",true],["いただきます。","Itadakimasu.",false],["何名様ですか。","Nanmei-sama desu ka.",false]],note:"しろ is a rough command. Don't imitate it with strangers; してください is polite."},
  {scene:"car",place:"On the expressway",jp:"日本は初めてか？",kana:"にほんは はじめてか？",romaji:"Nihon wa hajimete ka?",en:"First time in Japan?",prompt:"Say yes, it is your first time.",choices:[["はい、初めてです。","Hai, hajimete desu.",true],["はい、昨日です。","Hai, kinou desu.",false],["日本は大きいですか。","Nihon wa ookii desu ka.",false]],note:"初めてです is a compact, natural answer."},
  {scene:"highway",place:"Tokyo skyline",jp:"見ろ。東京だ。でかいだろ？ 迷子になるなら、堂々となれ。",kana:"みろ。とうきょうだ。でかいだろ？ まいごに なるなら、どうどうと なれ。",romaji:"Miro. Toukyou da. Dekai daro? Maigo ni naru nara, doudou to nare.",en:"Look. Tokyo. Big, right? If you get lost, at least do it confidently.",prompt:"React naturally: “Amazing!”",choices:[["すごいですね！","Sugoi desu ne!",true],["大丈夫じゃない。","Daijoubu janai.",false],["東京をください。","Toukyou o kudasai.",false]],note:"すごいですね invites shared agreement and sounds natural here."},
  {scene:"highway",place:"Traffic slows",jp:"渋滞だ。東京名物その一。金は取らんが、時間は盗む。",kana:"じゅうたいだ。とうきょう めいぶつ そのいち。かねは とらんが、じかんは ぬすむ。",romaji:"Juutai da. Toukyou meibutsu sono ichi. Kane wa toran ga, jikan wa nusumu.",en:"Traffic. Tokyo specialty number one. It won't take your money, but it'll steal your time.",prompt:"Ask how long it will take.",choices:[["どのくらいかかりますか？","Dono kurai kakarimasu ka?",true],["いくら食べますか？","Ikura tabemasu ka?",false],["いつ名前ですか？","Itsu namae desu ka?",false]],note:"どのくらいかかりますか asks duration and works for rides, walks, and tasks."},
  {scene:"hotel",place:"Hotel entrance",jp:"着いたぞ。忘れ物するなよ。俺は届けない。たぶんな。",kana:"ついたぞ。わすれもの するなよ。おれは とどけない。たぶんな。",romaji:"Tsuita zo. Wasuremono suru na yo. Ore wa todokenai. Tabun na.",en:"We're here. Don't forget anything. I won't deliver it. Probably.",prompt:"Thank Gozo for driving you.",choices:[["送ってくれて、ありがとうございました。","Okutte kurete, arigatou gozaimashita.",true],["運転を食べました。","Unten o tabemashita.",false],["まだ空港です。","Mada kuukou desu.",false]],note:"送ってくれてありがとう thanks someone for taking/driving you somewhere."},
  {scene:"hotel",place:"Hotel drop-off",jp:"よし。今度はお前が日本語で道を切り開け。じゃあな。",kana:"よし。こんどは おまえが にほんごで みちを きりひらけ。じゃあな。",romaji:"Yoshi. Kondo wa omae ga Nihongo de michi o kirihirake. Jaa na.",en:"Good. Now carve your own path with Japanese. See you around.",prompt:"Say “See you again, Gozo.”",choices:[["ゴーゾーさん、また会いましょう。","Goozoo-san, mata aimashou.",true],["初めまして。","Hajimemashite.",false],["何名様ですか。","Nanmei-sama desu ka.",false]],note:"お前 (omae) is rough and familiar. Recognize it, but don't use it casually yourself."}
];
let immersionTurn = 0;
let immersionSubtitle = "auto";
let immersionAudio = null;

function renderImmersionGuides() {
  const guide=currentGuide();const handoff=state.guide==='gozo'?'You chose Gozo. Your first mission starts at Narita Airport.':`${guide.name} is still your main guide. For this field lesson, Gozo is your local driver and guest conversation partner.`;
  app.innerHTML=`<main class="screen immersion-menu"><section class="immersion-guide-shell"><div class="top-bar"><button class="icon-button" data-action="back">&#8249;</button><div class="title-stack"><h1>Immersion Field Lesson</h1><p>${handoff}</p></div><img class="selected-guide-mini" src="${guide.image}" alt="${guide.name}"></div><div class="immersion-handoff"><div class="handoff-guide"><img src="${guide.image}" alt="${guide.name}"><strong>${guide.name}</strong><span>Your selected teacher</span></div><div class="handoff-arrow">→</div><button class="guide-card gozo-card" data-guide="gozo"><img src="assets/gozo.png" alt="Gozo"><h2>Gozo</h2><strong>Narita Airport → Tokyo Hotel</strong><p>Nine spoken exchanges with progressively harder subtitles.</p><span>${state.immersionProgress?`Continue trip · ${state.immersionProgress}/9 complete`:'Start the drive'} →</span></button></div></section></main>`;
  app.querySelector('[data-action="back"]').addEventListener('click',renderPaths);
  app.querySelector('[data-guide="gozo"]').addEventListener('click',()=>{state.immersionGuide='gozo';immersionTurn=Math.min(state.immersionProgress,8);saveState();renderImmersionTurn();});
}

function immersionText(turn) {
  const mode=immersionSubtitle==='auto'?(immersionTurn<3?'romaji':immersionTurn<6?'kana':'kanji'):immersionSubtitle;
  if(mode==='romaji')return `<strong>${turn.romaji}</strong><span>${turn.en}</span>`;
  if(mode==='kana')return `<strong lang="ja">${turn.kana}</strong><span>${turn.en}</span>`;
  return `<strong lang="ja">${turn.jp}</strong><span class="subtitle-reading">${turn.kana}</span><span>${turn.en}</span>`;
}

function renderImmersionTurn(feedback="") {
  const turn=IMMERSION_TURNS[immersionTurn];
  app.innerHTML=`<main class="immersion-scene" style="--scene:url('assets/immersion-${turn.scene}.png')"><div class="immersion-shade"></div><header class="immersion-top"><button class="icon-button" data-action="back">&#8249;</button><div><span>LEARN BY IMMERSION</span><strong>${turn.place}</strong></div><div class="trip-progress">${immersionTurn+1} / ${IMMERSION_TURNS.length}</div></header><section class="immersion-dialog"><div class="gozo-name"><img src="assets/gozo.png" alt=""><div><strong>GOZO</strong><span>Your driver · Former yakuza</span></div><button class="round-audio" data-action="gozo-speak" aria-label="Replay Gozo">▶</button></div><div class="subtitle-box">${immersionText(turn)}</div><div class="subtitle-controls"><span>Subtitles</span>${['auto','romaji','kana','kanji'].map(mode=>`<button class="${immersionSubtitle===mode?'active':''}" data-subtitle="${mode}">${mode==='auto'?'Auto':mode}</button>`).join('')}</div><div class="immersion-response"><h2>${turn.prompt}</h2><button class="immersion-mic" data-action="immersion-mic" ${SpeechRecognition?'':'disabled'}><img src="assets/microphone.png" alt=""> <span>${SpeechRecognition?'Answer aloud in Japanese':'Speech recognition unavailable'}</span></button><div class="or-divider"><span>or choose a response</span></div><div class="immersion-choices">${turn.choices.map((choice,i)=>`<button data-immersion-choice="${i}"><strong lang="ja">${choice[0]}</strong><span>${choice[1]}</span></button>`).join('')}</div><p class="immersion-feedback">${feedback}</p><aside>${turn.note}</aside></div></section></main>`;
  app.querySelector('[data-action="back"]').addEventListener('click',()=>{immersionAudio?.pause();renderImmersionGuides();});
  app.querySelector('[data-action="gozo-speak"]').addEventListener('click',()=>playGozoLine(immersionTurn,turn.jp));
  app.querySelectorAll('[data-subtitle]').forEach(button=>button.addEventListener('click',()=>{immersionSubtitle=button.dataset.subtitle;renderImmersionTurn();}));
  app.querySelectorAll('[data-immersion-choice]').forEach(button=>button.addEventListener('click',()=>{const choice=turn.choices[Number(button.dataset.immersionChoice)];if(!choice[2]){renderImmersionTurn('Gozo: ちがう。Think about what fits this moment. Again.');return;}advanceImmersion(choice[0]);}));
  const mic=app.querySelector('[data-action="immersion-mic"]');if(!mic.disabled)mic.addEventListener('click',()=>listenForImmersion(mic,turn));
  setTimeout(()=>playGozoLine(immersionTurn,turn.jp),350);
}

function playGozoLine(index,fallbackText){immersionAudio?.pause();window.speechSynthesis?.cancel();immersionAudio=new Audio(`assets/audio/gozo-${String(index+1).padStart(2,'0')}.mp3`);immersionAudio.play().catch(()=>speakMaleJapanese(fallbackText));}

function advanceImmersion(reply){speakMaleJapanese(reply);state.immersionProgress=Math.max(state.immersionProgress,immersionTurn+1);saveState();if(immersionTurn===IMMERSION_TURNS.length-1){setTimeout(renderImmersionComplete,850);}else{immersionTurn++;setTimeout(renderImmersionTurn,850);}}

function listenForImmersion(button,turn){stopRecognition();immersionAudio?.pause();recognition=new SpeechRecognition();recognition.lang='ja-JP';recognition.interimResults=false;recognition.maxAlternatives=5;recognition.onstart=()=>{button.classList.add('listening');button.querySelector('span').textContent='Listening… speak now';};recognition.onresult=event=>{const heard=Array.from(event.results[0],r=>normalizeSpeech(r.transcript));const correct=turn.choices.find(choice=>choice[2]);const targets=[normalizeSpeech(correct[0]),normalizeSpeech(correct[0].replace(/[。、！？]/g,''))];const matched=heard.some(value=>targets.some(target=>value===target||value.includes(target)||target.includes(value)));recognition=null;if(matched){showToast(`Heard: ${event.results[0][0].transcript}`);advanceImmersion(correct[0]);}else{renderImmersionTurn(`Gozo: 聞こえたのは「${event.results[0][0].transcript}」だ。もう一度、はっきり言え。`);}};recognition.onerror=event=>{recognition=null;renderImmersionTurn(event.error==='not-allowed'?'Microphone permission is needed. You can still choose a response below.':'Gozo: 聞こえん。もう一度だ。');};recognition.onend=()=>{recognition=null;if(document.body.contains(button)){button.classList.remove('listening');button.querySelector('span').textContent='Answer aloud in Japanese';}};recognition.start();}

function speakMaleJapanese(text) {
  if(!('speechSynthesis' in window))return showToast('Japanese voice is unavailable in this browser.');
  window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='ja-JP';u.rate=.84;u.pitch=.72;
  const voices=window.speechSynthesis.getVoices();const jp=voices.filter(v=>v.lang.toLowerCase().startsWith('ja'));const maleHints=['male','ichiro','keita','otoya','takumi','show'];u.voice=jp.find(v=>maleHints.some(h=>v.name.toLowerCase().includes(h)))||jp.find(v=>!['nanami','haruka','kyoko','ayumi'].some(h=>v.name.toLowerCase().includes(h)))||jp[0]||null;window.speechSynthesis.speak(u);
}

function renderImmersionComplete(){state.immersionProgress=9;saveState();app.innerHTML=`<main class="immersion-scene" style="--scene:url('assets/immersion-hotel.png')"><div class="immersion-shade"></div><section class="immersion-complete"><span class="completion-stamp">到着</span><h1>Hotel reached.</h1><p>You made nine real responses from Narita Airport to Tokyo, with less reading support as the journey progressed.</p><button class="cartoon-button small" data-action="replay">Ride again</button><button class="cartoon-button small" data-action="menu">Choose a guide</button></section></main>`;app.querySelector('[data-action="replay"]').addEventListener('click',()=>{immersionTurn=0;renderImmersionTurn();});app.querySelector('[data-action="menu"]').addEventListener('click',renderImmersionGuides);}

const CASUAL_TOPICS = [
  {id:"greetings",icon:"会",title:"Greetings & Goodbyes",copy:"Start, maintain, and close a friendly exchange.",lines:[["A","おはよう！元気？","Ohayou! Genki?","Morning! How are you?"],["You","うん、元気。そっちは？","Un, genki. Socchi wa?","Yeah, good. How about you?"],["A","元気だよ。じゃ、またね！","Genki da yo. Ja, mata ne!","I'm good. See you later!"]],q:["A friend says 元気？",["うん、元気。そっちは？","お会計をお願いします","三人です"],0]},
  {id:"introductions",icon:"名",title:"Meeting Someone",copy:"Share your name, background, and what brings you here.",lines:[["A","はじめまして。ゆきです。","Hajimemashite. Yuki desu.","Nice to meet you. I'm Yuki."],["You","はじめまして。アレックスです。","Hajimemashite. Arekkusu desu.","Nice to meet you. I'm Alex."],["You","日本語を勉強しています。","Nihongo o benkyou shiteimasu.","I'm studying Japanese."]],q:["Say you are studying Japanese.",["日本語を勉強しています","日本語を食べています","日本語に帰ります"],0]},
  {id:"hobbies",icon:"楽",title:"Hobbies & Likes",copy:"Ask what someone enjoys and find common ground.",lines:[["A","趣味は何？","Shumi wa nani?","What are your hobbies?"],["You","音楽を聞くのが好き。","Ongaku o kiku no ga suki.","I like listening to music."],["A","私も！どんな音楽が好き？","Watashi mo! Donna ongaku ga suki?","Me too! What kind of music do you like?"]],q:["Ask what kind of music they like.",["どんな音楽が好き？","音楽はどこ？","音楽はいくら？"],0]},
  {id:"small-talk",icon:"天",title:"Weather & Small Talk",copy:"Use easy observations to open a conversation.",lines:[["A","今日はいい天気だね。","Kyou wa ii tenki da ne.","Nice weather today, isn't it?"],["You","そうだね。暖かくて気持ちいい。","Sou da ne. Atatakakute kimochi ii.","Yeah. It's warm and pleasant."],["A","散歩したいね。","Sanpo shitai ne.","Makes me want to take a walk."]],q:["Agree naturally with an observation.",["そうだね","ちがいますか","いただきます"],0]},
  {id:"weekend",icon:"休",title:"Weekend Plans",copy:"Talk about where you're going and what you'll do.",lines:[["A","週末、何する？","Shuumatsu, nani suru?","What are you doing this weekend?"],["You","友だちと映画を見るよ。","Tomodachi to eiga o miru yo.","I'm seeing a movie with a friend."],["A","いいね！楽しんで。","Ii ne! Tanoshinde.","Nice! Have fun."]],q:["Say you're seeing a movie with a friend.",["友だちと映画を見るよ","友だちは映画です","映画から友だちです"],0]},
  {id:"invitations",icon:"誘",title:"Invitations",copy:"Invite, accept warmly, or decline without sounding harsh.",lines:[["A","土曜日、一緒にご飯食べない？","Doyoubi, issho ni gohan tabenai?","Want to eat together Saturday?"],["You","いいね！行こう。","Ii ne! Ikou.","Sounds good! Let's go."],["A","じゃ、六時に駅で。","Ja, rokuji ni eki de.","Then, at the station at six."]],q:["You cannot go. Decline softly.",["土曜日はちょっと…また今度ね","いいえ。行きません","土曜日は嫌い"],0]},
  {id:"family",icon:"家",title:"Family & Home",copy:"Talk comfortably about family and who you live with.",lines:[["A","家族は何人？","Kazoku wa nannin?","How many people are in your family?"],["You","四人家族だよ。","Yonin kazoku da yo.","We're a family of four."],["A","兄弟はいる？","Kyoudai wa iru?","Do you have siblings?"]],q:["Ask whether they have siblings.",["兄弟はいる？","兄弟はいくら？","兄弟をください"],0]},
  {id:"reactions",icon:"相",title:"Natural Reactions",copy:"Sound engaged with aizuchi and follow-up questions.",lines:[["A","昨日、京都に行ったよ。","Kinou, Kyouto ni itta yo.","I went to Kyoto yesterday."],["You","へえ、いいな！どうだった？","Hee, ii na! Dou datta?","Oh, nice! How was it?"],["A","すごく楽しかった。","Sugoku tanoshikatta.","It was really fun."]],q:["Show interest and ask how it was.",["へえ、どうだった？","そうじゃない","何名様ですか"],0]}
];
let casualTopic = null;

function renderConversationDashboard() {
  app.innerHTML=`<main class="screen school-bg"><section class="living-shell"><div class="top-bar"><button class="icon-button" data-action="back">&#8249;</button><div class="title-stack"><h1>Casual Conversation</h1><p>Practice the exchanges that turn phrases into real connection.</p></div><span class="experience-chip">${state.experience||"your level"}</span></div><div class="conversation-intro"><strong>Conversation tip</strong><span>Short reactions like そうだね, へえ, and いいね keep Japanese conversation flowing naturally.</span></div><div class="situation-grid conversation-grid">${CASUAL_TOPICS.map(topic=>`<button class="situation-card" data-casual="${topic.id}"><span class="situation-icon">${topic.icon}</span><span class="situation-title">${topic.title}</span><span class="situation-copy">${topic.copy}</span><span class="situation-progress">${state.casualProgress[topic.id]?"Practiced ✓":"Ready to practice"}</span></button>`).join("")}</div></section></main>`;
  app.querySelector('[data-action="back"]').addEventListener('click',renderPaths);
  app.querySelectorAll('[data-casual]').forEach(button=>button.addEventListener('click',()=>{casualTopic=CASUAL_TOPICS.find(t=>t.id===button.dataset.casual);renderCasualLesson();}));
}

function renderCasualLesson() {
  const t=casualTopic;
  app.innerHTML=`<main class="screen classroom-bg"><section class="study-shell casual-course"><div class="top-bar"><button class="icon-button" data-action="back">&#8249;</button><div class="title-stack"><h1>${t.title}</h1><p>Listen, notice, and respond.</p></div><span class="situation-icon small-icon">${t.icon}</span></div><div class="lesson-wrap"><div class="dialogue-list">${t.lines.map(([speaker,jp,romaji,en],i)=>`<article class="dialogue-line ${speaker==='You'?'learner-line':'staff-line'}"><div><strong>${speaker}</strong><span lang="ja">${jp}</span><small>${romaji}</small><p>${en}</p></div><button class="round-audio" data-casual-audio="${i}">▶</button></article>`).join('')}</div><div class="casual-response"><h2>Your response</h2><p>${t.q[0]}</p><div class="roleplay-choices">${t.q[1].map((choice,i)=>`<button data-casual-choice="${i}">${choice}</button>`).join('')}</div><p class="role-feedback"></p></div></div></section></main>`;
  app.querySelector('[data-action="back"]').addEventListener('click',renderConversationDashboard);
  app.querySelectorAll('[data-casual-audio]').forEach(button=>button.addEventListener('click',()=>speakGuide(t.lines[Number(button.dataset.casualAudio)][1],'ja-JP',true)));
  app.querySelectorAll('[data-casual-choice]').forEach(button=>button.addEventListener('click',()=>{const ok=Number(button.dataset.casualChoice)===t.q[2];if(!ok){app.querySelector('.role-feedback').textContent='Try the response that fits this moment naturally.';return;}state.casualProgress[t.id]=true;saveState();speakGuide(t.q[1][t.q[2]],'ja-JP',true);app.querySelector('.casual-response').innerHTML=`<h2>Nice response!</h2><p>You completed ${t.title}. Repeat it aloud, then practice another topic.</p><button class="cartoon-button small" data-action="topics">More conversations</button>`;app.querySelector('[data-action="topics"]').addEventListener('click',renderConversationDashboard);}));
}

function renderGoalPreview(title) {
  app.innerHTML = `<main class="screen classroom-bg"><section class="study-shell"><div class="top-bar"><button class="icon-button" data-action="back">&#8249;</button><div class="title-stack"><h1>${title}</h1><p>Your ${state.experience || "selected"} experience path</p></div><span style="width:54px"></span></div><div class="journey-empty"><img src="assets/teacher.png" alt=""><h2>This path is being prepared.</h2><p>Your selection has been saved. Living in Japan and Hiragana / Katakana are ready now.</p><button class="cartoon-button small" data-action="paths">Choose another path</button></div></section></main>`;
  app.querySelector('[data-action="back"]').addEventListener("click", renderPaths);
  app.querySelector('[data-action="paths"]').addEventListener("click", renderPaths);
}

const LIVING_SITUATIONS = [
  ["restaurant", "Restaurant", "Order, ask questions, and pay with confidence.", "食"],
  ["train", "Train Station", "Buy tickets, find platforms, and ask directions.", "駅"],
  ["shopping", "Shopping", "Find items, understand prices, and check out.", "買"],
  ["doctor", "Doctor & Pharmacy", "Describe symptoms and understand instructions.", "医"],
  ["home", "Home & Neighbors", "Handle greetings, deliveries, and daily routines.", "家"],
  ["city-office", "City Office", "Navigate forms, registration, and public services.", "市"]
];
const LIVING_STAGES = ["Vocabulary", "Dialogue", "Roleplay", "Quiz", "Life Skill Badge"];
const RESTAURANT_VOCAB = [
  ["いらっしゃいませ", "irasshaimase", "Welcome (said by staff)"], ["何名様ですか", "nanmei-sama desu ka", "How many people?"],
  ["一人です", "hitori desu", "One person"], ["二人です", "futari desu", "Two people"], ["メニュー", "menyuu", "Menu"],
  ["おすすめ", "osusume", "Recommendation"], ["注文", "chuumon", "Order"], ["これをお願いします", "kore o onegaishimasu", "This, please"],
  ["水", "mizu", "Water"], ["おいしい", "oishii", "Delicious"], ["お会計", "okaikei", "The bill / check"],
  ["カードで払えますか", "kaado de haraemasu ka", "Can I pay by card?"]
];
const RESTAURANT_DIALOGUE = [
  ["Staff", "いらっしゃいませ。何名様ですか？", "Irasshaimase. Nanmei-sama desu ka?", "Welcome. How many people?"],
  ["You", "二人です。", "Futari desu.", "Two people."],
  ["Staff", "こちらへどうぞ。", "Kochira e douzo.", "This way, please."],
  ["You", "おすすめは何ですか？", "Osusume wa nan desu ka?", "What do you recommend?"],
  ["Staff", "ラーメンがおすすめです。", "Raamen ga osusume desu.", "The ramen is recommended."],
  ["You", "では、ラーメンを二つお願いします。", "Dewa, raamen o futatsu onegaishimasu.", "Then, two ramen, please."],
  ["You", "すみません、お会計をお願いします。", "Sumimasen, okaikei o onegaishimasu.", "Excuse me, the check please."],
  ["Staff", "ありがとうございます。", "Arigatou gozaimasu.", "Thank you very much."]
];
const RESTAURANT_QUIZ = [
  ["What do you say when you want the check?", ["お会計をお願いします", "いただきます", "いらっしゃいませ"], 0],
  ["What does おすすめ mean?", ["Water", "Recommendation", "Reservation"], 1],
  ["How do you say “Two people”?", ["二人です", "二つです", "二番です"], 0],
  ["What is a polite way to order an item?", ["これは何ですか", "これをお願いします", "これはだめです"], 1],
  ["カードで払えますか asks…", ["Is there a menu?", "Can I pay by card?", "Is it delicious?"], 1]
];
let restaurantCard = 0;
let restaurantRoleplay = 0;
let restaurantQuiz = { position: 0, score: 0, answered: false };

function renderLivingDashboard() {
  app.innerHTML = `<main class="screen school-bg"><section class="living-shell"><div class="top-bar"><button class="icon-button" data-action="back">&#8249;</button><div class="title-stack"><h1>Living in Japan</h1><p>Choose a situation to practice.</p></div><span class="experience-chip">${state.experience || "your level"}</span></div><div class="situation-grid">${LIVING_SITUATIONS.map(([id,title,copy,icon]) => { const done=Math.min(5, Number(state.livingProgress[id] || 0)); return `<button class="situation-card" data-situation="${id}"><span class="situation-icon">${icon}</span><span class="situation-title">${title}</span><span class="situation-copy">${copy}</span><span class="situation-progress">${done}/5 stages complete</span><span class="progress-track"><span class="progress-fill" style="width:${done*20}%"></span></span></button>`; }).join("")}</div></section></main>`;
  app.querySelector('[data-action="back"]').addEventListener("click", renderPaths);
  app.querySelectorAll('[data-situation]').forEach(button => button.addEventListener('click', () => {
    state.livingSituation = button.dataset.situation;
    saveState();
    renderLivingJourney(state.livingSituation);
  }));
}

function renderLivingJourney(id) {
  const situation = LIVING_SITUATIONS.find(row => row[0] === id) || LIVING_SITUATIONS[0];
  const complete = Math.min(5, Number(state.livingProgress[id] || 0));
  app.innerHTML = `<main class="screen classroom-bg"><section class="living-shell"><div class="top-bar"><button class="icon-button" data-action="back">&#8249;</button><div class="title-stack"><h1>${situation[1]}</h1><p>Complete each stage to earn the Life Skill Badge.</p></div><span class="situation-icon small-icon">${situation[3]}</span></div><div class="journey-flow">${LIVING_STAGES.map((stage,index) => `<div class="journey-step-wrap"><button class="journey-step ${index < complete ? "complete" : ""} ${index > complete ? "locked" : ""}" data-stage="${index}" ${index > complete ? "disabled" : ""}><span class="step-number">${index < complete ? "✓" : index + 1}</span><span><strong>${stage}</strong><small>${index < complete ? "Completed" : index === complete ? "Ready to begin" : "Complete the previous stage"}</small></span></button>${index < 4 ? '<span class="journey-arrow">↓</span>' : ''}</div>`).join("")}</div></section></main>`;
  app.querySelector('[data-action="back"]').addEventListener("click", renderLivingDashboard);
  app.querySelectorAll('[data-stage]:not([disabled])').forEach(button => button.addEventListener('click', () => renderLivingStage(id, Number(button.dataset.stage))));
}

function renderLivingStage(id, stageIndex) {
  if (id === "restaurant") return renderRestaurantStage(stageIndex);
  const situation = LIVING_SITUATIONS.find(row => row[0] === id);
  const stage = LIVING_STAGES[stageIndex];
  const prompts = {
    Vocabulary: "Learn the essential words you’ll need in this situation.",
    Dialogue: "Listen to and follow a natural Japanese exchange.",
    Roleplay: "Take your turn and respond in a real-world scenario.",
    Quiz: "Check your understanding before finishing the skill.",
    "Life Skill Badge": "Finish this situation and add the badge to your progress."
  };
  app.innerHTML = `<main class="screen school-bg"><section class="study-shell"><div class="top-bar"><button class="icon-button" data-action="back">&#8249;</button><div class="title-stack"><h1>${situation[1]}: ${stage}</h1><p>Stage ${stageIndex + 1} of 5</p></div><span style="width:54px"></span></div><div class="stage-panel"><span class="situation-icon">${situation[3]}</span><h2>${stage}</h2><p>${prompts[stage]}</p><div class="sample-phrase"><span lang="ja">準備はいいですか？</span><small>Junbi wa ii desu ka? — Are you ready?</small></div><button class="cartoon-button small" data-action="complete">Complete ${stage}</button></div></section></main>`;
  app.querySelector('[data-action="back"]').addEventListener("click", () => renderLivingJourney(id));
  app.querySelector('[data-action="complete"]').addEventListener("click", () => {
    state.livingProgress[id] = Math.max(Number(state.livingProgress[id] || 0), stageIndex + 1);
    saveState();
    renderLivingJourney(id);
    showToast(stageIndex === 4 ? `${situation[1]} Life Skill Badge earned!` : `${stage} complete. Next stage unlocked.`);
  });
}

function restaurantStageShell(stageIndex, content) {
  return `<main class="screen school-bg"><section class="study-shell restaurant-course"><div class="top-bar"><button class="icon-button" data-action="back">&#8249;</button><div class="title-stack"><h1>Restaurant: ${LIVING_STAGES[stageIndex]}</h1><p>Stage ${stageIndex + 1} of 5</p></div><span class="situation-icon small-icon">食</span></div>${content}</section></main>`;
}

function bindRestaurantBack() { app.querySelector('[data-action="back"]').addEventListener("click", () => renderLivingJourney("restaurant")); }
function completeRestaurantStage(stageIndex) { state.livingProgress.restaurant = Math.max(Number(state.livingProgress.restaurant || 0), stageIndex + 1); saveState(); }

function renderRestaurantStage(stageIndex) {
  if (stageIndex === 0) return renderRestaurantVocabulary();
  if (stageIndex === 1) return renderRestaurantDialogue();
  if (stageIndex === 2) { restaurantRoleplay = 0; return renderRestaurantRoleplay(); }
  if (stageIndex === 3) { restaurantQuiz = { position: 0, score: 0, answered: false }; return renderRestaurantQuiz(); }
  renderRestaurantBadge();
}

function renderRestaurantVocabulary() {
  const [jp, romaji, english] = RESTAURANT_VOCAB[restaurantCard];
  app.innerHTML = restaurantStageShell(0, `<div class="lesson-wrap"><div class="lesson-progress">Word ${restaurantCard + 1} of ${RESTAURANT_VOCAB.length}</div><div class="vocab-card"><span class="vocab-japanese" lang="ja">${jp}</span><span class="vocab-romaji">${romaji}</span><strong>${english}</strong><button class="speech-button" data-action="speak-vocab"><img src="assets/speaker.png" alt=""> Listen</button></div><div class="nav-row"><button class="nav-button" data-action="previous-word">Previous</button><button class="nav-button" data-action="next-word">${restaurantCard === RESTAURANT_VOCAB.length - 1 ? "Finish Vocabulary" : "Next Word"}</button></div></div>`);
  bindRestaurantBack();
  app.querySelector('[data-action="speak-vocab"]').addEventListener("click", () => speakGuide(jp, "ja-JP", true));
  app.querySelector('[data-action="previous-word"]').addEventListener("click", () => { restaurantCard = Math.max(0, restaurantCard - 1); renderRestaurantVocabulary(); });
  app.querySelector('[data-action="next-word"]').addEventListener("click", () => { if (restaurantCard < RESTAURANT_VOCAB.length - 1) { restaurantCard++; renderRestaurantVocabulary(); } else { completeRestaurantStage(0); renderLivingJourney("restaurant"); showToast("Vocabulary complete. Dialogue unlocked!"); } });
}

function renderRestaurantDialogue() {
  app.innerHTML = restaurantStageShell(1, `<div class="lesson-wrap dialogue-lesson"><div class="dialogue-list">${RESTAURANT_DIALOGUE.map(([speaker,jp,romaji,en],i) => `<article class="dialogue-line ${speaker === "You" ? "learner-line" : "staff-line"}"><div><strong>${speaker}</strong><span lang="ja">${jp}</span><small>${romaji}</small><p>${en}</p></div><button class="round-audio" data-dialogue="${i}" aria-label="Listen">▶</button></article>`).join("")}</div><div class="dialogue-actions"><button class="cartoon-button small" data-action="play-dialogue">▶ Play Full Dialogue</button><button class="cartoon-button small" data-action="finish-dialogue">Complete Dialogue</button></div></div>`);
  bindRestaurantBack();
  app.querySelectorAll('[data-dialogue]').forEach(button => button.addEventListener('click', () => speakGuide(RESTAURANT_DIALOGUE[Number(button.dataset.dialogue)][1], "ja-JP", true)));
  app.querySelector('[data-action="play-dialogue"]').addEventListener('click', () => speakGuideSequence(RESTAURANT_DIALOGUE.map(line=>line[1])));
  app.querySelector('[data-action="finish-dialogue"]').addEventListener('click', () => { completeRestaurantStage(1); renderLivingJourney("restaurant"); showToast("Dialogue complete. Roleplay unlocked!"); });
}

const ROLEPLAY_TURNS = [
  ["Staff: いらっしゃいませ。何名様ですか？", "Welcome. How many people?", ["二人です。", "お会計をお願いします。", "おいしいです。"], 0, "Futari desu — Two people."],
  ["Staff: ご注文はお決まりですか？", "Have you decided on your order?", ["これをお願いします。", "二人です。", "カードです。"], 0, "Kore o onegaishimasu — This, please."],
  ["Staff: お飲み物はいかがですか？", "Would you like a drink?", ["水をお願いします。", "駅はどこですか？", "さようなら。"], 0, "Mizu o onegaishimasu — Water, please."],
  ["Staff: ほかにご注文は？", "Anything else?", ["以上です。", "三人です。", "わかりません。"], 0, "Ijou desu — That’s all."],
  ["Staff: お支払いはどうしますか？", "How would you like to pay?", ["カードでお願いします。", "おすすめです。", "メニューです。"], 0, "Kaado de onegaishimasu — By card, please."]
];

function renderRestaurantRoleplay(feedback = "") {
  if (restaurantRoleplay >= ROLEPLAY_TURNS.length) { completeRestaurantStage(2); renderLivingJourney("restaurant"); showToast("Roleplay complete. Quiz unlocked!"); return; }
  const [staff, english, choices] = ROLEPLAY_TURNS[restaurantRoleplay];
  app.innerHTML = restaurantStageShell(2, `<div class="lesson-wrap roleplay-panel"><span class="roleplay-label">Scenario ${restaurantRoleplay + 1} of ${ROLEPLAY_TURNS.length}</span><div class="staff-bubble"><strong>${staff}</strong><span>${english}</span></div><h2>How do you respond?</h2><div class="roleplay-choices">${choices.map((choice,i)=>`<button data-role-choice="${i}">${choice}</button>`).join("")}</div><p class="role-feedback">${feedback}</p></div>`);
  bindRestaurantBack();
  app.querySelectorAll('[data-role-choice]').forEach(button => button.addEventListener('click', () => { const correct=Number(button.dataset.roleChoice)===ROLEPLAY_TURNS[restaurantRoleplay][3]; if(correct){ speakGuide(choices[0],"ja-JP",true); restaurantRoleplay++; setTimeout(()=>renderRestaurantRoleplay(),500); } else renderRestaurantRoleplay(`Try again. Hint: ${ROLEPLAY_TURNS[restaurantRoleplay][4]}`); }));
}

function renderRestaurantQuiz() {
  if (restaurantQuiz.position >= RESTAURANT_QUIZ.length) { const passed=restaurantQuiz.score>=4; if(passed) completeRestaurantStage(3); app.innerHTML=restaurantStageShell(3,`<div class="lesson-wrap quiz-result"><div class="score-ring">${restaurantQuiz.score}/5</div><h2>${passed ? "Quiz passed!" : "Almost there"}</h2><p>${passed ? "Your Restaurant Life Skill Badge is unlocked." : "Score at least 4 out of 5 to unlock the badge."}</p><button class="cartoon-button small" data-action="quiz-done">${passed ? "Continue to Badge" : "Try Again"}</button></div>`); bindRestaurantBack(); app.querySelector('[data-action="quiz-done"]').addEventListener('click',()=>passed?renderRestaurantBadge():renderRestaurantStage(3)); return; }
  const [question, choices, correct] = RESTAURANT_QUIZ[restaurantQuiz.position];
  app.innerHTML=restaurantStageShell(3,`<div class="lesson-wrap restaurant-quiz"><div class="lesson-progress">Question ${restaurantQuiz.position+1} of 5 · Score ${restaurantQuiz.score}</div><h2>${question}</h2><div class="roleplay-choices">${choices.map((choice,i)=>`<button data-quiz-choice="${i}">${choice}</button>`).join("")}</div></div>`); bindRestaurantBack(); app.querySelectorAll('[data-quiz-choice]').forEach(button=>button.addEventListener('click',()=>{if(Number(button.dataset.quizChoice)===correct)restaurantQuiz.score++;restaurantQuiz.position++;renderRestaurantQuiz();}));
}

function renderRestaurantBadge() {
  const earned=Number(state.livingProgress.restaurant||0)>=4;
  app.innerHTML=restaurantStageShell(4,`<div class="lesson-wrap badge-panel"><div class="life-badge ${earned?'earned':''}"><span>食</span><strong>Restaurant Ready</strong><small>Smart Nihongo Life Skill</small></div><h2>${earned ? "You earned it!" : "Pass the restaurant quiz first"}</h2><p>${earned ? "You practiced arriving, ordering, responding, and paying in Japanese." : "Return to the quiz and score at least 4 out of 5."}</p><button class="cartoon-button small" data-action="badge-action">${earned ? "Add Badge & Finish" : "Go to Quiz"}</button></div>`); bindRestaurantBack(); app.querySelector('[data-action="badge-action"]').addEventListener('click',()=>{if(!earned)return renderRestaurantStage(3);completeRestaurantStage(4);renderLivingJourney('restaurant');showToast('Restaurant Ready badge earned!');});
}

function renderDecks() {
  const guide=currentGuide();
  const hiragana = stats("hiragana");
  const katakana = stats("katakana");
  app.innerHTML = `
    <main class="screen classroom-bg">
      <div class="deck-layout">
        <div class="top-bar">
          <button class="icon-button" data-action="back" aria-label="Back to paths" title="Back to paths">&#8249;</button>
          <div class="title-stack"><h1>Beginner Kana with ${guide.name}</h1><p>${guide.style} · 46 basic characters in each deck</p></div>
          <img class="selected-guide-mini" src="${guide.image}" alt="${guide.name}">
        </div>
        <div class="deck-grid">
          ${deckCard("hiragana", "あ", "The rounded, flowing alphabet", hiragana)}
          ${deckCard("katakana", "ア", "The sharp alphabet for loanwords", katakana)}
        </div>
      </div>
    </main>`;

  app.querySelector('[data-action="back"]').addEventListener("click", renderPaths);
  app.querySelectorAll("[data-deck]").forEach(button => {
    button.addEventListener("click", () => openDeck(button.dataset.deck));
  });
}

function deckCard(name, character, description, deckStats) {
  return `
    <button class="deck-card" data-deck="${name}">
      <span class="deck-kana" lang="ja">${character}</span>
      <span class="deck-name">${deckLabel(name)}</span>
      <span class="deck-copy">${description}</span>
      <span class="deck-progress">${deckStats.mastered} mastered &nbsp;|&nbsp; ${deckStats.seen}/46 seen</span>
    </button>`;
}

function openDeck(name, onlyFavorites = false) {
  currentDeck = name === "katakana" ? "katakana" : "hiragana";
  state.lastDeck = currentDeck;
  favoritesOnly = onlyFavorites;
  const indices = activeIndices();
  if (!indices.length) {
    favoritesOnly = false;
    renderDecks();
    showToast("Favorite a card first, then it will appear here.");
    return;
  }

  const deck = state.decks[currentDeck];
  if (!indices.includes(deck.index)) deck.index = indices[0];
  answerRevealed = false;
  saveState();
  renderStudy();
}

function activeIndices() {
  if (!favoritesOnly) return ROMAJI.map((_, index) => index);
  return state.decks[currentDeck].favorites
    .map((favorite, index) => favorite ? index : -1)
    .filter(index => index >= 0);
}

function renderStudy() {
  stopRecognition();
  const deck = state.decks[currentDeck];
  const characters = deckCharacters(currentDeck);
  const indices = activeIndices();
  const position = Math.max(0, indices.indexOf(deck.index));
  const index = indices[position];
  deck.index = index;
  deck.seen[index] = true;
  saveState();

  const completion = Math.round((deck.seen.filter(Boolean).length / 46) * 100);
  const favorite = deck.favorites[index];
  const recognitionSupported = Boolean(SpeechRecognition);
  const guide=currentGuide();
  app.innerHTML = `
    <main class="screen school-bg">
      <section class="study-shell">
        <div class="top-bar">
          <button class="icon-button" data-action="back" aria-label="Back to decks" title="Back to decks">&#8249;</button>
          <div class="title-stack">
            <h1>${deckLabel(currentDeck)} Flashcards</h1>
            <p>${guide.name} · ${favoritesOnly ? "Favorite characters" : "Learn one character at a time."}</p>
          </div>
          <button class="icon-button favorite-toggle" data-action="favorite" aria-label="${favorite ? "Remove from" : "Add to"} favorites" title="${favorite ? "Remove from" : "Add to"} favorites">
            <span aria-hidden="true">${favorite ? "★" : "☆"}</span>
          </button>
        </div>

        <div class="study-content">
          <div class="flashcard" data-action="reveal-card" role="button" tabindex="0" aria-label="Reveal answer">
            <span class="flashcard-kana" lang="ja">${characters[index]}</span>
          </div>

          <div class="study-controls">
            <div class="answer-panel">
              <p class="answer-label">${answerRevealed ? "Answer" : "Think of the sound"}</p>
              <p class="answer-value">${answerRevealed ? ROMAJI[index] : "?"}</p>
            </div>
            ${answerRevealed ? `<div class="guide-coach ${state.guide}"><img src="${guide.image}" alt=""><p><strong>${guide.name}</strong>${guideKanaLine('reveal',characters[index],ROMAJI[index])}</p></div>` : ""}

            ${answerRevealed ? `
              <div class="rating-row" aria-label="Rate this character">
                <button class="rating-button again" data-rating="0">Again</button>
                <button class="rating-button learning" data-rating="1">Learning</button>
                <button class="rating-button known" data-rating="2">I Know It</button>
              </div>` : `
              <button class="cartoon-button small" data-action="reveal">Review Answer</button>`}

            <div class="speech-row">
              <button class="speech-button" data-action="speak">
                <img src="assets/speaker.png" alt=""> Listen
              </button>
              <button class="speech-button" data-action="microphone" ${recognitionSupported ? "" : "disabled"} title="${recognitionSupported ? "Say this character" : "Speech recognition is unavailable in this browser"}">
                <img src="assets/microphone.png" alt=""> Say It
              </button>
            </div>

            <div class="nav-row">
              <button class="nav-button" data-action="previous"><img src="assets/arrow-left.png" alt=""> Previous</button>
              <button class="nav-button" data-action="next">Next <img src="assets/arrow-right.png" alt=""></button>
            </div>
            <div class="counter">${position + 1} / ${indices.length} &nbsp;|&nbsp; ${completion}% complete</div>
            <div class="progress-track" aria-label="${completion}% complete"><div class="progress-fill" style="width:${completion}%"></div></div>
          </div>
        </div>

        <nav class="bottom-tabs" aria-label="Learning modes">
          <button class="tab-button ${favoritesOnly ? "" : "active"}" data-tab="study">Study</button>
          <button class="tab-button" data-tab="quiz">Quiz</button>
          <button class="tab-button ${favoritesOnly ? "active" : ""}" data-tab="favorites">Favorites</button>
        </nav>
      </section>
    </main>`;

  app.querySelector('[data-action="back"]').addEventListener("click", renderDecks);
  app.querySelector('[data-action="favorite"]').addEventListener("click", () => {
    deck.favorites[index] = !deck.favorites[index];
    saveState();
    if (favoritesOnly && !deck.favorites[index]) {
      const remaining = activeIndices();
      if (!remaining.length) {
        favoritesOnly = false;
        renderStudy();
        showToast("No favorite cards remain in this deck.");
        return;
      }
      deck.index = remaining[Math.min(position, remaining.length - 1)];
    }
    renderStudy();
  });

  const reveal = () => {
    answerRevealed = true;
    renderStudy();
  };
  app.querySelector('[data-action="reveal-card"]').addEventListener("click", reveal);
  app.querySelector('[data-action="reveal-card"]').addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      reveal();
    }
  });
  app.querySelector('[data-action="reveal"]')?.addEventListener("click", reveal);
  app.querySelectorAll("[data-rating]").forEach(button => {
    button.addEventListener("click", () => {
      const rating=Number(button.dataset.rating);
      deck.ratings[index] = rating;
      saveState();
      showToast(`${guide.name}: ${guideKanaLine(rating===0?'again':rating===1?'learning':'known',characters[index],ROMAJI[index])}`);
      moveCard(1);
    });
  });

  app.querySelector('[data-action="speak"]').addEventListener("click", () => playGuideKana(index,characters[index]));
  const microphone = app.querySelector('[data-action="microphone"]');
  if (!microphone.disabled) {
    microphone.addEventListener("click", () => listenForCard(microphone, characters[index], ROMAJI[index]));
  }
  app.querySelector('[data-action="previous"]').addEventListener("click", () => moveCard(-1));
  app.querySelector('[data-action="next"]').addEventListener("click", () => moveCard(1));
  app.querySelector('[data-tab="study"]').addEventListener("click", () => openDeck(currentDeck, false));
  app.querySelector('[data-tab="quiz"]').addEventListener("click", startQuiz);
  app.querySelector('[data-tab="favorites"]').addEventListener("click", () => openDeck(currentDeck, true));
}

function moveCard(direction) {
  const deck = state.decks[currentDeck];
  const indices = activeIndices();
  const current = Math.max(0, indices.indexOf(deck.index));
  deck.index = indices[(current + direction + indices.length) % indices.length];
  answerRevealed = false;
  saveState();
  renderStudy();
}

function startQuiz() {
  const pool = shuffle(ROMAJI.map((_, index) => index));
  quiz = {
    questions: pool.slice(0, 10),
    position: 0,
    score: 0,
    selected: null
  };
  renderQuiz();
}

function renderQuiz() {
  stopRecognition();
  if (!quiz) return startQuiz();
  const index = quiz.questions[quiz.position];
  const characters = deckCharacters(currentDeck);
  const choices = quizChoices(index);
  const answered = quiz.selected !== null;
  const isLast = quiz.position === quiz.questions.length - 1;
  const guide=currentGuide();

  app.innerHTML = `
    <main class="screen classroom-bg">
      <section class="study-shell">
        <div class="top-bar">
          <button class="icon-button" data-action="back" aria-label="Back to study" title="Back to study">&#8249;</button>
          <div class="title-stack"><h1>${deckLabel(currentDeck)} Quiz with ${guide.name}</h1><p>Question ${quiz.position + 1} of ${quiz.questions.length}</p></div>
          <img class="selected-guide-mini" src="${guide.image}" alt="${guide.name}">
        </div>
        <div class="quiz-wrap">
          <div class="quiz-panel">
            <div class="quiz-kana" lang="ja">${characters[index]}</div>
            <div class="quiz-options">
              ${choices.map(choice => {
                let resultClass = "";
                if (answered && choice === index) resultClass = "correct";
                if (answered && choice === quiz.selected && choice !== index) resultClass = "wrong";
                return `<button class="quiz-option ${resultClass}" data-choice="${choice}" ${answered ? "disabled" : ""}>${ROMAJI[choice]}</button>`;
              }).join("")}
            </div>
            <p class="quiz-status">${answered ? (quiz.selected === index ? `${guide.name}: ${guideKanaLine('known',characters[index],ROMAJI[index])}` : `${guide.name}: ${guideKanaLine('again',characters[index],ROMAJI[index])} Answer: ${ROMAJI[index]}`) : `${guide.name}: Choose the matching sound.`}</p>
            ${answered ? `<button class="cartoon-button small" data-action="next-quiz">${isLast ? "See Results" : "Next Question"}</button>` : ""}
          </div>
        </div>
      </section>
    </main>`;

  app.querySelector('[data-action="back"]').addEventListener("click", () => {
    quiz = null;
    renderStudy();
  });
  app.querySelectorAll("[data-choice]").forEach(button => {
    button.addEventListener("click", () => {
      quiz.selected = Number(button.dataset.choice);
      const deck = state.decks[currentDeck];
      deck.seen[index] = true;
      if (quiz.selected === index) {
        quiz.score += 1;
        deck.ratings[index] = Math.max(1, deck.ratings[index]);
      }
      saveState();
      renderQuiz();
    });
  });
  app.querySelector('[data-action="next-quiz"]')?.addEventListener("click", () => {
    if (isLast) {
      const score = quiz.score;
      quiz = null;
      renderStudy();
      showToast(`Quiz complete: ${score}/10 correct.`);
    } else {
      quiz.position += 1;
      quiz.selected = null;
      renderQuiz();
    }
  });
}

function quizChoices(correct) {
  const wrong = shuffle(ROMAJI.map((_, index) => index).filter(index => index !== correct)).slice(0, 3);
  return shuffle([correct, ...wrong]);
}

function shuffle(values) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function showOptions() {
  const backdrop = document.createElement("div");
  backdrop.className = "dialog-backdrop";
  backdrop.innerHTML = `
    <section class="dialog" role="dialog" aria-modal="true" aria-labelledby="options-title">
      <h2 id="options-title">Options</h2>
      <label class="option-row">
        <span>Voice guidance</span>
        <span class="switch"><input type="checkbox" data-option="voice" ${state.settings.voice ? "checked" : ""}><span></span></span>
      </label>
      <label class="option-row">
        <span>Sound effects</span>
        <span class="switch"><input type="checkbox" data-option="sound" ${state.settings.sound ? "checked" : ""}><span></span></span>
      </label>
      <div class="dialog-actions">
        <button class="cartoon-button small red" data-action="reset">Reset Progress</button>
        <button class="cartoon-button small" data-action="done">Done</button>
      </div>
    </section>`;
  document.body.appendChild(backdrop);

  backdrop.querySelectorAll("[data-option]").forEach(input => {
    input.addEventListener("change", () => {
      state.settings[input.dataset.option] = input.checked;
      saveState();
      if (input.dataset.option === "voice" && !input.checked) window.speechSynthesis?.cancel();
    });
  });
  backdrop.querySelector('[data-action="done"]').addEventListener("click", () => backdrop.remove());
  backdrop.querySelector('[data-action="reset"]').addEventListener("click", () => {
    if (!window.confirm("Reset all kana progress and favorites?")) return;
    const fresh = defaultState();
    state.guide = fresh.guide;
    state.lastDeck = fresh.lastDeck;
    state.experience = fresh.experience;
    state.learningGoal = fresh.learningGoal;
    state.livingSituation = fresh.livingSituation;
    state.livingProgress = fresh.livingProgress;
    state.casualProgress = fresh.casualProgress;
    state.immersionProgress = fresh.immersionProgress;
    state.immersionGuide = fresh.immersionGuide;
    state.decks = fresh.decks;
    saveState();
    backdrop.remove();
    renderMain();
    showToast("Study progress reset.");
  });
  backdrop.addEventListener("click", event => {
    if (event.target === backdrop) backdrop.remove();
  });
  backdrop.querySelector('[data-action="done"]').focus();
}

function chooseVoice(language) {
  const voices = window.speechSynthesis?.getVoices() || [];
  const languagePrefix = language.toLowerCase().split("-")[0];
  const matching = voices.filter(voice => voice.lang.toLowerCase().startsWith(languagePrefix));
  const femaleHints = ["female", "nanami", "haruka", "kyoko", "ayumi", "sayaka", "mizuki"];
  return matching.find(voice => femaleHints.some(hint => voice.name.toLowerCase().includes(hint)))
    || matching.find(voice => voice.localService)
    || matching[0]
    || voices[0]
    || null;
}

function speakGuide(text,language="ja-JP",force=false){if((!state.settings.voice&&!force)||!("speechSynthesis" in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=language;const voices=window.speechSynthesis.getVoices();const prefix=language.toLowerCase().split('-')[0];const matches=voices.filter(v=>v.lang.toLowerCase().startsWith(prefix));const maleHints=['male','ichiro','keita','otoya','takumi','show','david','mark'];const femaleHints=['female','nanami','haruka','kyoko','ayumi','sayaka','mizuki','zira'];if(state.guide==='sensei'){u.voice=matches.find(v=>femaleHints.some(h=>v.name.toLowerCase().includes(h)))||matches[0]||null;u.pitch=1.08;u.rate=.9;}else{u.voice=matches.find(v=>maleHints.some(h=>v.name.toLowerCase().includes(h)))||matches[0]||null;u.pitch=state.guide==='gozo'?.58:1;u.rate=state.guide==='gozo'?.72:.96;}window.speechSynthesis.speak(u);}

function applyGuideVoice(utterance,language='ja-JP'){utterance.lang=language;const voices=window.speechSynthesis?.getVoices()||[];const matches=voices.filter(v=>v.lang.toLowerCase().startsWith(language.toLowerCase().split('-')[0]));const hints=state.guide==='sensei'?['female','nanami','haruka','kyoko','ayumi','sayaka','mizuki','zira']:['male','ichiro','keita','otoya','takumi','show','david','mark'];utterance.voice=matches.find(v=>hints.some(h=>v.name.toLowerCase().includes(h)))||matches[0]||null;utterance.pitch=state.guide==='gozo'?.58:state.guide==='sensei'?1.08:1;utterance.rate=state.guide==='gozo'?.72:state.guide==='sensei'?.9:.96;return utterance;}
function speakGuideSequence(lines){if(!('speechSynthesis' in window))return;window.speechSynthesis.cancel();let i=0;const next=()=>{if(i>=lines.length)return;const u=applyGuideVoice(new SpeechSynthesisUtterance(lines[i++]),'ja-JP');u.onend=next;window.speechSynthesis.speak(u);};next();}
function playGuideKana(index,fallback){if(!state.settings.voice)return;const audio=new Audio(`assets/audio/kana/${state.guide}-${String(index).padStart(2,'0')}.mp3`);audio.play().catch(()=>speakGuide(fallback,'ja-JP',true));}

function speak(text, language = "ja-JP", force = false) {
  if ((!state.settings.voice && !force) || !("speechSynthesis" in window)) {
    if (!("speechSynthesis" in window)) showToast("Speech is unavailable in this browser.");
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = language;
  utterance.rate = 0.88;
  utterance.pitch = 1.08;
  const voice = chooseVoice(language);
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

function listenForCard(button, character, romaji) {
  if (!SpeechRecognition) {
    showToast("Speech recognition is unavailable in this browser.");
    return;
  }
  stopRecognition();
  recognition = new SpeechRecognition();
  recognition.lang = "ja-JP";
  recognition.interimResults = false;
  recognition.maxAlternatives = 5;

  recognition.onstart = () => {
    button.classList.add("listening");
    button.innerHTML = '<img src="assets/microphone.png" alt=""> Listening';
  };
  recognition.onresult = event => {
    const alternatives = Array.from(event.results[0], result => result.transcript);
    const normalizedTargets = [character, romaji].map(normalizeSpeech);
    const matched = alternatives.some(value => {
      const normalized = normalizeSpeech(value);
      return normalizedTargets.some(target => normalized === target || normalized.includes(target));
    });
    showToast(matched ? `${currentGuide().name}: ${guideKanaLine('known',character,romaji)}` : `${currentGuide().name}: ${guideKanaLine('again',character,romaji)}`);
    if (matched && state.settings.sound) playGuideKana(ROMAJI.indexOf(romaji),character);
  };
  recognition.onerror = event => {
    const message = event.error === "not-allowed"
      ? "Microphone permission is needed for speaking practice."
      : "I couldn't hear that clearly. Please try again.";
    showToast(message);
  };
  recognition.onend = () => {
    recognition = null;
    if (document.body.contains(button)) {
      button.classList.remove("listening");
      button.innerHTML = '<img src="assets/microphone.png" alt=""> Say It';
    }
  };
  recognition.start();
}

function normalizeSpeech(value) {
  return String(value).toLowerCase().replace(/[\s.,!?。、！？]/g, "");
}

function stopRecognition() {
  if (!recognition) return;
  recognition.onend = null;
  recognition.abort();
  recognition = null;
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toastElement.textContent = message;
  toastElement.classList.add("visible");
  toastTimer = window.setTimeout(() => toastElement.classList.remove("visible"), 3200);
}

document.addEventListener("pointerdown", () => {
  if (welcomeSpoken || !state.settings.voice) return;
  welcomeSpoken = true;
  speakGuide("Welcome to Smart Nihongo.", "en-US", true);
}, { once: true, capture: true });

window.addEventListener("beforeunload", saveState);
window.speechSynthesis?.addEventListener?.("voiceschanged", () => chooseVoice("ja-JP"));

refreshAuth().then(async () => { if (authState.user) await loadCloudProgress(); renderMain(); });
