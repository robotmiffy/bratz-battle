import { dolls } from './data.js';

const store = {
  favourites: JSON.parse(localStorage.getItem('dollBattle:favourites') || '[]'),
  votes: JSON.parse(localStorage.getItem('dollBattle:votes') || '[]')
};

let pair = [];
let validDolls = [];
let battleBag = [];
const save = () => {
  localStorage.setItem('dollBattle:favourites', JSON.stringify(store.favourites));
  localStorage.setItem('dollBattle:votes', JSON.stringify(store.votes));
};
const $ = (sel) => document.querySelector(sel);
const byId = (id) => dolls.find(d => d.id === id);

function imageLoads(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

async function preparePlayableDolls() {
  const checked = await Promise.all(dolls.map(async doll => ({
    ...doll,
    imageOk: await imageLoads(doll.image)
  })));
  validDolls = checked.filter(doll => doll.imageOk);
  if (validDolls.length < 2) validDolls = [...dolls];
  resetBattleBag();
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function dollKey(doll) {
  return `${doll.character}|${doll.collection}|${String(doll.name).replace(/\s*v\d+\s*$/i, '').trim()}`.toLowerCase();
}

function resetBattleBag() {
  battleBag = shuffle(validDolls);
}

function pullRandomDoll(exclusions = {}) {
  if (battleBag.length === 0) resetBattleBag();

  const { ids = [], keys = [], characters = [] } = exclusions;
  let index = battleBag.findIndex(doll =>
    !ids.includes(doll.id) &&
    !keys.includes(dollKey(doll)) &&
    !characters.includes(doll.character)
  );

  if (index === -1) {
    index = battleBag.findIndex(doll =>
      !ids.includes(doll.id) &&
      !keys.includes(dollKey(doll))
    );
  }

  if (index === -1) {
    index = battleBag.findIndex(doll => !ids.includes(doll.id));
  }

  if (index === -1) return null;
  return battleBag.splice(index, 1)[0];
}

function pickPair() {
  const first = pullRandomDoll();
  const second = pullRandomDoll({
    ids: [first?.id],
    keys: [dollKey(first)],
    characters: [first?.character]
  });

  if (!first || !second) {
    $('#battleStage').innerHTML = empty('Not enough dolls with working images to start a battle.');
    return;
  }

  pair = shuffle([first, second]);
  renderBattle();
}

function dollCard(doll) {
  const hearted = store.favourites.includes(doll.id);
  return `<article class="doll-card pop-in">
    <button class="heart ${hearted ? 'saved' : ''}" data-heart="${doll.id}" aria-label="Save ${doll.name}">${hearted ? '♥' : '♡'}</button>
    <div class="image-wrap"><img src="${doll.image}" alt="${doll.name}" loading="lazy"></div>
    <div class="doll-copy">
      <p class="tag">${doll.year} · ${doll.character}</p>
      <h2>${doll.name}</h2>
      <p>${doll.collection}</p>
      <a href="${doll.source}" target="_blank" rel="noopener">Credit: Lookin’ Bratz ↗</a>
    </div>
    <button class="vote" data-vote="${doll.id}">Choose this doll</button>
  </article>`;
}

function renderBattle() {
  $('#battleStage').innerHTML = pair.map(dollCard).join('<div class="vs">VS</div>');
}

function toggleHeart(id) {
  store.favourites = store.favourites.includes(id)
    ? store.favourites.filter(x => x !== id)
    : [...store.favourites, id];
  save();
  renderAll();
}

function voteFor(winnerId) {
  const loserId = pair.find(d => d.id !== winnerId)?.id;
  store.votes.unshift({ winnerId, loserId, at: new Date().toISOString() });
  save();

  pickPair();
  renderAll(false);
}

function renderFavourites() {
  const items = store.favourites.map(byId).filter(Boolean);
  $('#favouritesGrid').innerHTML = items.length ? items.map(miniCard).join('') : empty('No saved dolls yet. Tap a heart to save one.');
}

function miniCard(doll) {
  return `<article class="mini-card"><img src="${doll.image}" alt="${doll.name}"><strong>${doll.name}</strong><span>${doll.year} · ${doll.collection}</span><a href="${doll.source}" target="_blank" rel="noopener">Source ↗</a></article>`;
}

function renderHistory() {
  $('#historyList').innerHTML = store.votes.length ? store.votes.map(v => {
    const winner = byId(v.winnerId), loser = byId(v.loserId);
    return `<div class="history-item"><span>👑 ${winner?.name || 'Unknown'}</span><small>beat ${loser?.name || 'Unknown'} · ${new Date(v.at).toLocaleString()}</small></div>`;
  }).join('') : empty('No battles voted on yet.');
}

function count(items, keyFn) {
  return items.reduce((acc, item) => { const key = keyFn(item); acc[key] = (acc[key] || 0) + 1; return acc; }, {});
}
const top = (obj) => Object.entries(obj).sort((a,b) => b[1] - a[1])[0];

function renderStats() {
  const wins = store.votes.map(v => byId(v.winnerId)).filter(Boolean);
  const faveDolls = store.favourites.map(byId).filter(Boolean);
  const cards = [
    ['Most voted-for year', top(count(wins, d => d.year))],
    ['Most voted-for collection', top(count(wins, d => d.collection))],
    ['Most voted-for character', top(count(wins, d => d.character))],
    ['Favourite collections', top(count(faveDolls, d => d.collection))],
    ['Favourite years', top(count(faveDolls, d => d.year))]
  ];
  $('#statsGrid').innerHTML = cards.map(([label, value]) => `<div class="stat-card"><span>${label}</span><strong>${value ? value[0] : '—'}</strong><small>${value ? `${value[1]} total` : 'Vote or save to unlock'}</small></div>`).join('');

  const attempts = {};
  dolls.forEach(d => attempts[d.id] = { wins: 0, total: 0 });
  store.votes.forEach(v => { attempts[v.winnerId].wins++; attempts[v.winnerId].total++; if (attempts[v.loserId]) attempts[v.loserId].total++; });
  $('#leaderboard').innerHTML = dolls.map(d => ({...d, ...attempts[d.id], rate: attempts[d.id].total ? attempts[d.id].wins / attempts[d.id].total : 0}))
    .sort((a,b) => b.rate - a.rate || b.wins - a.wins)
    .map((d, i) => `<div class="leader-row"><b>#${i + 1} ${d.name}</b><span>${Math.round(d.rate * 100)}% win rate · ${d.wins}/${d.total}</span></div>`).join('');
}

function empty(text) { return `<p class="empty">${text}</p>`; }
function renderAll(includeBattle = true) { if (includeBattle) renderBattle(); renderFavourites(); renderHistory(); renderStats(); }

document.addEventListener('click', (e) => {
  const tab = e.target.closest('[data-view]');
  if (tab) {
    document.querySelectorAll('.tab,.view').forEach(x => x.classList.remove('active'));
    tab.classList.add('active');
    $('#' + tab.dataset.view).classList.add('active');
  }
  const heart = e.target.closest('[data-heart]');
  if (heart) toggleHeart(heart.dataset.heart);
  const vote = e.target.closest('[data-vote]');
  if (vote) voteFor(vote.dataset.vote);
});

$('#skipBtn').addEventListener('click', pickPair);

async function init() {
  $('#battleStage').innerHTML = '<p class="empty">Loading dolls…</p>';
  await preparePlayableDolls();
  pickPair();
  renderAll(false);
}

init();
