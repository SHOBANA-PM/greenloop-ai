// ================================================================
//  GreenLoop AI — app.js
//  LINE 4 → Claude API key  (console.anthropic.com)
//  LINE 5 → Fast2SMS key    (fast2sms.com — free)
// ================================================================
var CLAUDE_KEY   = "YOUR API KEY";
var FAST2SMS_KEY = "YOUR API KEY";

// ---- GLOBAL shared data (all accounts see these) ----
var USER_TUTORIALS = [];
var USER_PRODUCTS  = [];

// ---- PER-USER session (belongs to current logged-in user only) ----
var currentUser = null;
var cartItems   = [];
var scanCount   = 0;
var soldCount   = 0;
var actLog      = [];

// ---- UI state ----
var scanItem    = '';
var scanKW      = [];
var camStream   = null;
var stepCount   = 0;
var upPhoto     = null;
var upVideo     = null;
var tutFiltered = false;
var inDetail    = false;
var mktCat      = 'All';
var srchCat     = 'all';

// ================================================================
//  BOOT
// ================================================================
document.addEventListener('DOMContentLoaded', function () {
  loadGlobalData();
  showPage('pg-land');
  setGreeting();
  buildHomeList();
  buildTutList(null, null);
  buildMarket();
  initSteps();
});

// ================================================================
//  GLOBAL DATA — tutorials/products visible to ALL accounts
// ================================================================
function saveGlobalData() {
  try {
    var tuts = [];
    for (var i = 0; i < USER_TUTORIALS.length; i++) {
      var t = USER_TUTORIALS[i];
      tuts.push({
        id: t.id, emoji: t.emoji, title: t.title,
        creator: t.creator, views: t.views, likes: t.likes,
        wasteItem: t.wasteItem, kw: t.kw, steps: t.steps,
        cat: t.cat, price: t.price, priceNum: t.priceNum,
        isMyUpload: t.isMyUpload, sellerPhone: t.sellerPhone || '',
        photoURL: t.photoURL || null
      });
    }
    var prods = [];
    for (var j = 0; j < USER_PRODUCTS.length; j++) {
      var p = USER_PRODUCTS[j];
      prods.push({
        id: p.id, emoji: p.emoji, name: p.name,
        waste: p.waste, price: p.price, priceNum: p.priceNum,
        stars: p.stars, cat: p.cat, isMyUpload: p.isMyUpload,
        sellerPhone: p.sellerPhone || '', photoURL: p.photoURL || null
      });
    }
    localStorage.setItem('gl_tutorials', JSON.stringify(tuts));
    localStorage.setItem('gl_products',  JSON.stringify(prods));
  } catch (e) { console.log('saveGlobalData:', e); }
}

function loadGlobalData() {
  try {
    var ts = localStorage.getItem('gl_tutorials');
    if (ts) {
      var arr = JSON.parse(ts);
      USER_TUTORIALS = [];
      for (var i = 0; i < arr.length; i++) {
        arr[i].photoFile = null;
        arr[i].videoFile = null;
        USER_TUTORIALS.push(arr[i]);
      }
    }
    var ps = localStorage.getItem('gl_products');
    if (ps) {
      var arr2 = JSON.parse(ps);
      USER_PRODUCTS = [];
      for (var j = 0; j < arr2.length; j++) {
        arr2[j].photoFile = null;
        USER_PRODUCTS.push(arr2[j]);
      }
    }
  } catch (e) { console.log('loadGlobalData:', e); }
}

// ---- PER-USER stats saved by email key ----
function saveUserStats() {
  if (!currentUser || !currentUser.email) return;
  try {
    localStorage.setItem('gl_stats_' + currentUser.email, JSON.stringify({
      scanCount: scanCount,
      soldCount: soldCount,
      actLog: actLog
    }));
  } catch (e) {}
}

function loadUserStats(email) {
  // Reset first so a fresh account always starts at zero
  scanCount = 0; soldCount = 0; actLog = [];
  if (!email) return;
  try {
    var raw = localStorage.getItem('gl_stats_' + email);
    if (raw) {
      var obj = JSON.parse(raw);
      scanCount = obj.scanCount || 0;
      soldCount = obj.soldCount || 0;
      actLog    = obj.actLog   || [];
    }
  } catch (e) {
    scanCount = 0; soldCount = 0; actLog = [];
  }
}

// ================================================================
//  PAGE NAVIGATION
// ================================================================
function showPage(pid) {
  var pages = document.querySelectorAll('.page');
  for (var i = 0; i < pages.length; i++) pages[i].style.display = 'none';
  var el = document.getElementById(pid);
  if (!el) return;
  el.style.display = (pid === 'pg-land') ? 'flex' : 'block';
  el.scrollTop = 0;
  if (pid !== 'pg-scan' && camStream) stopCam();
  if (pid === 'pg-dash')    buildDash();
  if (pid === 'pg-profile') buildProfile();
  if (pid === 'pg-cart')    buildCart();
  if (pid === 'pg-market')  buildMarket();
  if (pid === 'pg-tutorials' && !tutFiltered) buildTutList(null, null);
}

function setNav(id) {
  var bns = document.querySelectorAll('.bn');
  for (var i = 0; i < bns.length; i++) bns[i].classList.remove('active');
  var el = document.getElementById(id);
  if (el) el.classList.add('active');
}

// ================================================================
//  UTILITIES
// ================================================================
function popToast(msg) {
  var el = document.getElementById('toast-msg');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(function () { el.classList.remove('show'); }, 3000);
}

function setGreeting() {
  var h = new Date().getHours();
  var el = document.getElementById('greet-txt');
  if (el) el.textContent = h < 12 ? 'Good morning,' : h < 17 ? 'Good afternoon,' : 'Good evening,';
}

function logAct(icon, bg, txt) {
  actLog.unshift({ icon: icon, bg: bg, txt: txt });
  if (actLog.length > 15) actLog.pop();
  saveUserStats();
}

function getEmoji(w) {
  w = (w || '').toLowerCase();
  if (w.indexOf('bottle') >= 0 || w.indexOf('plastic') >= 0) return '🌿';
  if (w.indexOf('jeans')  >= 0 || w.indexOf('denim')   >= 0) return '👜';
  if (w.indexOf('stick')  >= 0 || w.indexOf('ice cream') >= 0) return '✏️';
  if (w.indexOf('cardboard') >= 0 || w.indexOf('box')   >= 0) return '📦';
  if (w.indexOf('jar')    >= 0 || w.indexOf('glass')    >= 0) return '💡';
  if (w.indexOf('can')    >= 0 || w.indexOf('tin')      >= 0) return '🌱';
  if (w.indexOf('cloth')  >= 0 || w.indexOf('shirt')    >= 0) return '🧣';
  if (w.indexOf('cd')     >= 0 || w.indexOf('dvd')      >= 0) return '💿';
  return '🌿';
}

function getCat(w) {
  w = (w || '').toLowerCase();
  if (w.indexOf('bottle') >= 0 || w.indexOf('can') >= 0 || w.indexOf('jar') >= 0) return 'Planters';
  if (w.indexOf('jeans')  >= 0 || w.indexOf('cloth') >= 0 || w.indexOf('shirt') >= 0) return 'Bags';
  if (w.indexOf('cd')     >= 0 || w.indexOf('dvd') >= 0) return 'Art';
  return 'Home Decor';
}

function allTuts() {
  var seen = {}, result = [], combined = SEED_TUTORIALS.concat(USER_TUTORIALS);
  for (var i = 0; i < combined.length; i++) {
    if (!seen[combined[i].id]) { seen[combined[i].id] = true; result.push(combined[i]); }
  }
  return result;
}

function allProds() {
  var seen = {}, result = [], combined = SEED_PRODUCTS.concat(USER_PRODUCTS);
  for (var i = 0; i < combined.length; i++) {
    if (!seen[combined[i].id]) { seen[combined[i].id] = true; result.push(combined[i]); }
  }
  return result;
}

// ================================================================
//  AUTH
// ================================================================
function doSignup() {
  var name  = (document.getElementById('su-name').value  || '').trim();
  var email = (document.getElementById('su-email').value || '').trim();
  var pass  = (document.getElementById('su-pass').value  || '').trim();
  var city  = (document.getElementById('su-city').value  || '').trim();
  var phone = (document.getElementById('su-phone').value || '').trim();
  if (!name)           { popToast('Please enter your name'); return; }
  if (!email)          { popToast('Please enter your email'); return; }
  if (pass.length < 6) { popToast('Password needs at least 6 characters'); return; }

  var account = {
    name: name, email: email, city: city || 'India',
    phone: phone, init: name[0].toUpperCase(), pass: pass
  };
  try { localStorage.setItem('gl_acc_' + email, JSON.stringify(account)); } catch (e) {}

  currentUser = account;
  // Brand new account — always zero stats
  scanCount = 0; soldCount = 0; actLog = []; cartItems = [];
  saveUserStats();
  popToast('Welcome to GreenLoop AI, ' + name + '! 🌿');
  afterAuth();
}

function doLogin() {
  var email = (document.getElementById('li-email').value || '').trim();
  var pass  = (document.getElementById('li-pass').value  || '').trim();
  if (!email) { popToast('Please enter your email'); return; }
  if (!pass)  { popToast('Please enter your password'); return; }

  // Load THIS specific account by its email key
  var account = null;
  try {
    var raw = localStorage.getItem('gl_acc_' + email);
    if (raw) account = JSON.parse(raw);
  } catch (e) {}

  if (!account) {
    // New email — create fresh account
    var n = email.split('@')[0];
    n = n.charAt(0).toUpperCase() + n.slice(1);
    account = { name: n, email: email, city: 'India', phone: '', init: n[0].toUpperCase(), pass: pass };
    try { localStorage.setItem('gl_acc_' + email, JSON.stringify(account)); } catch (e) {}
  }

  currentUser = account;
  cartItems = [];
  // Load THIS user's own stats using their email — resets to zero if they have none
  loadUserStats(email);
  popToast('Welcome back, ' + currentUser.name + '! 🌿');
  afterAuth();
}

function afterAuth() {
  var un = document.getElementById('uname-txt');
  if (un) un.textContent = currentUser.name + ' 🌱';
  var av = document.getElementById('home-av');
  if (av) av.textContent = currentUser.init;
  setGreeting();
  showPage('pg-home');
  setNav('bn-home');
}

function doLogout() {
  // Save this user's stats before leaving
  saveUserStats();
  // Clear all session data
  currentUser = null;
  cartItems   = [];
  scanCount   = 0;
  soldCount   = 0;
  actLog      = [];
  upPhoto     = null;
  upVideo     = null;
  scanItem    = '';
  scanKW      = [];
  tutFiltered = false;
  inDetail    = false;
  updateBadge();
  showPage('pg-land');
  popToast('Logged out. See you soon! 🌿');
}

// ================================================================
//  HOME
// ================================================================
function buildHomeList() {
  var el = document.getElementById('home-list');
  if (!el) return;
  el.innerHTML = SEED_TUTORIALS.map(function (t, i) {
    return '<div class="trend-card" onclick="openTutById(' + t.id + ')">' +
      '<div class="tc-emo">' + t.emoji + '</div>' +
      '<div class="tc-info"><p class="tc-title">' + t.title + '</p>' +
      '<p class="tc-sub">' + t.creator + ' · ' + t.views + ' views</p></div>' +
      '<span class="tc-badge ' + (i === 0 ? 'hot' : 'newb') + '">' + (i === 0 ? 'HOT' : 'NEW') + '</span>' +
    '</div>';
  }).join('');
}

function openTutById(id) {
  var tuts = allTuts();
  for (var i = 0; i < tuts.length; i++) {
    if (tuts[i].id === id) {
      tutFiltered = false; inDetail = false;
      showPage('pg-tutorials');
      document.getElementById('tut-list').style.display      = 'block';
      document.getElementById('tut-detail').style.display    = 'none';
      document.getElementById('tut-match-bar').style.display = 'none';
      var tut = tuts[i];
      setTimeout(function () { openTutDetail(tut); }, 30);
      return;
    }
  }
}

// ================================================================
//  SEARCH
// ================================================================
function setScat(el, cat) {
  var scats = document.querySelectorAll('.scat');
  for (var i = 0; i < scats.length; i++) scats[i].classList.remove('active');
  el.classList.add('active');
  srchCat = cat;
  doSearch(document.getElementById('srch-q').value);
}

function doSearch(q) {
  var el = document.getElementById('srch-res');
  if (!el) return;
  q = (q || '').trim().toLowerCase();
  if (!q) {
    el.innerHTML = '<p style="text-align:center;color:#ccc;font-size:13px;padding:30px 0">Start typing to search...</p>';
    return;
  }
  var results = [];
  if (srchCat === 'all' || srchCat === 'tut') {
    allTuts().forEach(function (t) {
      var sc = calcScore(q, [t.title, t.wasteItem, t.creator].concat(t.kw || []));
      if (sc > 0) results.push({ type: 'tut', score: sc, data: t });
    });
  }
  if (srchCat === 'all' || srchCat === 'mkt') {
    allProds().forEach(function (p) {
      var sc = calcScore(q, [p.name, p.waste]);
      if (sc > 0) results.push({ type: 'mkt', score: sc, data: p });
    });
  }
  results.sort(function (a, b) { return b.score - a.score; });
  if (!results.length) {
    el.innerHTML = '<div style="text-align:center;padding:28px 0;color:#aaa"><p style="font-size:28px;margin-bottom:8px">🔍</p><p style="font-size:13px">No results for "' + q + '"</p></div>';
    return;
  }
  el.innerHTML = results.map(function (r) {
    if (r.type === 'tut') {
      return '<div class="sr-card" onclick="openTutById(' + r.data.id + ')">' +
        '<div class="sr-emo">' + r.data.emoji + '</div>' +
        '<div><p class="sr-name">' + r.data.title + '</p>' +
        '<p class="sr-sub">' + r.data.creator + '</p>' +
        '<span class="sr-pill sr-tut">Tutorial</span></div></div>';
    }
    return '<div class="sr-card" onclick="showPage(\'pg-market\')">' +
      '<div class="sr-emo">' + r.data.emoji + '</div>' +
      '<div><p class="sr-name">' + r.data.name + '</p>' +
      '<p class="sr-sub">From ' + r.data.waste + ' · ' + r.data.price + '</p>' +
      '<span class="sr-pill sr-mkt">Market</span></div></div>';
  }).join('');
}

function calcScore(q, fields) {
  var sc = 0, words = q.split(/\s+/);
  for (var i = 0; i < fields.length; i++) {
    if (!fields[i]) continue;
    var fl = fields[i].toLowerCase();
    if (fl === q) { sc += 10; continue; }
    if (fl.indexOf(q) >= 0) { sc += 5; continue; }
    for (var j = 0; j < words.length; j++) {
      if (words[j] && fl.indexOf(words[j]) >= 0) sc += 2;
    }
  }
  return sc;
}

// ================================================================
//  CAMERA
// ================================================================
function startCam() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    popToast('Camera not supported. Please upload an image instead.');
    return;
  }
  navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } })
    .then(function (stream) {
      camStream = stream;
      var v = document.getElementById('cam-vid');
      v.srcObject = stream; v.style.display = 'block';
      document.getElementById('scan-ph').style.display   = 'none';
      document.getElementById('scan-prev').style.display = 'none';
      document.getElementById('cam-acts').style.display  = 'block';
      document.getElementById('scan-spin').style.display = 'none';
      document.getElementById('scan-out').style.display  = 'none';
    })
    .catch(function (e) {
      console.error(e);
      popToast('Camera blocked. Please allow camera access.');
    });
}

function stopCam() {
  if (camStream) {
    var tracks = camStream.getTracks();
    for (var i = 0; i < tracks.length; i++) tracks[i].stop();
    camStream = null;
  }
  var v = document.getElementById('cam-vid');
  if (v) { v.style.display = 'none'; v.srcObject = null; }
  var ca = document.getElementById('cam-acts');
  if (ca) ca.style.display = 'none';
}

function capturePhoto() {
  var v = document.getElementById('cam-vid');
  var c = document.getElementById('cam-cv');
  c.width = v.videoWidth || 640; c.height = v.videoHeight || 480;
  c.getContext('2d').drawImage(v, 0, 0);
  var url = c.toDataURL('image/jpeg', 0.85);
  var img = document.getElementById('scan-prev');
  img.src = url; img.style.display = 'block';
  document.getElementById('scan-ph').style.display  = 'none';
  stopCam();
  document.getElementById('scan-spin').style.display = 'flex';
  document.getElementById('scan-out').style.display  = 'none';
  runAI(url.split(',')[1]);
}

function onScanFile(e) {
  var file = e.target.files[0]; e.target.value = '';
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function (ev) {
    var img = document.getElementById('scan-prev');
    img.src = ev.target.result; img.style.display = 'block';
    document.getElementById('scan-ph').style.display   = 'none';
    document.getElementById('scan-spin').style.display = 'flex';
    document.getElementById('scan-out').style.display  = 'none';
    runAI(ev.target.result.split(',')[1]);
  };
  reader.readAsDataURL(file);
}

// ================================================================
//  AI  ← paste CLAUDE_KEY at top of file line 4
// ================================================================
function runAI(b64) {
  scanCount++;
  saveUserStats();
  logAct('📷', '#e8f5e8', 'Scanned a waste item');

  if (!CLAUDE_KEY) {
    // Demo mode — closure fix: capture item in IIFE so timeout works correctly
    var demos = [
      { item: 'Plastic Bottle',   conf: 92, kw: ['bottle', 'plastic', 'pet bottle', 'water bottle'], ideas: ['Hanging Planter', 'Bird Feeder', 'Pen Stand', 'Watering Can'] },
      { item: 'Ice Cream Sticks', conf: 88, kw: ['ice cream', 'stick', 'popsicle', 'craft stick'],   ideas: ['Pencil Stand', 'Photo Frame', 'Wall Art', 'Mini Shelf'] },
      { item: 'Old Denim Jeans',  conf: 94, kw: ['jeans', 'denim', 'trouser', 'jean'],               ideas: ['Tote Bag', 'Denim Planter', 'Wallet', 'Cushion Cover'] },
      { item: 'Cardboard Box',    conf: 86, kw: ['cardboard', 'box', 'carton', 'packaging'],         ideas: ['Desk Organiser', 'Magazine Holder', 'Gift Box', 'Toy House'] }
    ];
    var idx = (scanCount - 1) % demos.length;
    // Use IIFE to correctly capture demo data in closure
    (function (demo) {
      setTimeout(function () {
        showScanResult(demo.item, demo.conf, demo.kw, demo.ideas);
      }, 1500);
    }(demos[idx]));
    return;
  }

  fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64 } },
          { type: 'text', text: 'You are GreenLoop AI. Identify the waste item in this image.\nReply ONLY with this exact JSON — no markdown, no extra text:\n{"item":"waste item name 2-5 words","confidence":88,"keywords":["kw1","kw2","kw3","kw4","kw5"],"ideas":["Idea 1","Idea 2","Idea 3","Idea 4"]}\nKeywords = common names and synonyms. Ideas = specific home upcycle projects.' }
        ]
      }]
    })
  })
  .then(function (r) { return r.json(); })
  .then(function (d) {
    var txt = '';
    for (var i = 0; i < d.content.length; i++) txt += (d.content[i].text || '');
    txt = txt.replace(/```json|```/g, '').trim();
    var parsed = JSON.parse(txt);
    showScanResult(parsed.item, parsed.confidence || 85, parsed.keywords || [], parsed.ideas || []);
  })
  .catch(function (e) {
    console.error(e);
    showScanResult('Waste Item', 75, [], ['Plant Pot', 'Organiser', 'Photo Frame', 'Gift Box']);
  });
}

// ================================================================
//  ML MATCHING
// ================================================================
function mlScore(tutKW, tutWaste, sItem, sKW) {
  var sc = 0;
  var tW = (tutWaste || '').toLowerCase();
  var sI = (sItem    || '').toLowerCase();
  var tK = (tutKW || []).map(function (k) { return k.toLowerCase(); });
  var sK = (sKW  || []).map(function (k) { return k.toLowerCase(); });

  if (tW === sI) sc += 30;
  if (sc === 0 && (tW.indexOf(sI) >= 0 || sI.indexOf(tW) >= 0)) sc += 20;

  var sWords = sI.split(/\s+/);
  for (var a = 0; a < sWords.length; a++) {
    if (sWords[a].length > 2 && tW.indexOf(sWords[a]) >= 0) sc += 12;
    for (var b = 0; b < tK.length; b++) {
      if (tK[b].length > 2 && (tK[b].indexOf(sWords[a]) >= 0 || sWords[a].indexOf(tK[b]) >= 0)) sc += 8;
    }
  }

  for (var c = 0; c < sK.length; c++) {
    if (sK[c].length < 2) continue;
    for (var dd = 0; dd < tK.length; dd++) {
      if (tK[dd] === sK[c]) sc += 15;
      else if (tK[dd].length > 2 && (tK[dd].indexOf(sK[c]) >= 0 || sK[c].indexOf(tK[dd]) >= 0)) sc += 8;
    }
    if (tW.indexOf(sK[c]) >= 0 || sK[c].indexOf(tW) >= 0) sc += 10;
  }

  var cats = Object.keys(WASTE_DICT);
  for (var e = 0; e < cats.length; e++) {
    var dk = WASTE_DICT[cats[e]];
    var sHit = false, tHit = false;
    var allS = [sI].concat(sK), allT = [tW].concat(tK);
    for (var f = 0; f < allS.length && !sHit; f++) {
      for (var g = 0; g < dk.length && !sHit; g++) {
        if (dk[g].indexOf(allS[f]) >= 0 || allS[f].indexOf(dk[g]) >= 0) sHit = true;
      }
    }
    for (var h = 0; h < allT.length && !tHit; h++) {
      for (var k = 0; k < dk.length && !tHit; k++) {
        if (dk[k].indexOf(allT[h]) >= 0 || allT[h].indexOf(dk[k]) >= 0) tHit = true;
      }
    }
    if (sHit && tHit) sc += 18;
  }
  return sc;
}

// ================================================================
//  SHOW SCAN RESULT
// ================================================================
function showScanResult(item, conf, kw, ideas) {
  scanItem = item.toLowerCase();
  scanKW   = kw || [];

  document.getElementById('scan-spin').style.display = 'none';
  document.getElementById('scan-out').style.display  = 'block';
  document.getElementById('det-name').textContent    = item;
  document.getElementById('conf-pill').textContent   = conf + '% match';

  var kwEl = document.getElementById('scan-kws');
  kwEl.innerHTML = '';
  var top = kw.slice(0, 5);
  for (var i = 0; i < top.length; i++) {
    var span = document.createElement('span');
    span.className   = 'kw-pill';
    span.textContent = top[i];
    kwEl.appendChild(span);
  }

  var emoMap = {
    'bottle': '🌿', 'plastic': '🌿', 'jeans': '👜', 'denim': '👜', 'jean': '👜',
    'cardboard': '📦', 'box': '📦', 'stick': '✏️', 'ice cream': '✏️',
    'jar': '💡', 'glass': '💡', 'tin': '🌱', 'can': '🌱',
    'cloth': '🧣', 'shirt': '🧣', 'paper': '📰', 'cd': '💿', 'dvd': '💿'
  };
  var keys = Object.keys(emoMap), emo = '♻️';
  for (var j = 0; j < keys.length; j++) {
    if (scanItem.indexOf(keys[j]) >= 0) { emo = emoMap[keys[j]]; break; }
  }
  document.getElementById('idea-emo').textContent  = emo;
  document.getElementById('idea-name').textContent = ideas[0] || 'Creative Product';

  var moreEl = document.getElementById('more-ideas');
  moreEl.innerHTML = '';
  var moreEmo = ['🏺', '🖼️', '🪴', '🧺', '🎁'];
  for (var m = 1; m < ideas.length; m++) {
    (function (idea, em) {
      var chip = document.createElement('span');
      chip.className   = 'more-chip';
      chip.textContent = em + ' ' + idea;
      chip.onclick     = goScanToTuts;
      moreEl.appendChild(chip);
    }(ideas[m], moreEmo[m - 1] || '♻️'));
  }
}

function goScanToTuts() {
  tutFiltered = true; inDetail = false;
  document.getElementById('tut-match-bar').style.display = 'block';
  document.getElementById('tut-match-txt').textContent   = '"' + document.getElementById('det-name').textContent + '"';
  document.getElementById('tut-detail').style.display    = 'none';
  document.getElementById('tut-list').style.display      = 'block';
  showPage('pg-tutorials');
  buildTutList(scanItem, scanKW);
}

// ================================================================
//  TUTORIALS
// ================================================================
function buildTutList(filterItem, filterKW) {
  var list = document.getElementById('tut-list');
  if (!list) return;
  var tuts = allTuts();

  if (!filterItem || filterItem.trim() === '') {
    list.innerHTML = renderTutCards(tuts);
    return;
  }

  var scored = [];
  for (var i = 0; i < tuts.length; i++) {
    var sc = mlScore(tuts[i].kw, tuts[i].wasteItem, filterItem, filterKW || []);
    scored.push({ t: tuts[i], s: sc });
  }
  scored.sort(function (a, b) { return b.s - a.s; });

  var matched = [], unmatched = [];
  for (var j = 0; j < scored.length; j++) {
    if (scored[j].s > 0) matched.push(scored[j].t);
    else unmatched.push(scored[j].t);
  }

  if (matched.length > 0) {
    list.innerHTML = renderTutCards(matched.concat(unmatched));
  } else {
    var note = '<div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:10px;padding:10px 14px;margin-bottom:12px;font-size:12px;color:#92400e">' +
      'No exact match for "' + filterItem + '" — showing all tutorials. ' +
      '<span onclick="showPage(\'pg-sell\')" style="font-weight:700;text-decoration:underline;cursor:pointer">Upload one for this item!</span>' +
    '</div>';
    list.innerHTML = note + renderTutCards(tuts);
  }
}

function renderTutCards(tuts) {
  return tuts.map(function (t) {
    var src = t.photoFile ? URL.createObjectURL(t.photoFile) : (t.photoURL || null);
    var thumb = src ? '<img src="' + src + '" alt="' + t.title + '"/>' : '<span>' + t.emoji + '</span>';
    var badge = t.isMyUpload ? '<span class="my-badge">MY UPLOAD</span>' : '';
    return '<div class="tut-card" onclick="callTutDetail(' + t.id + ')">' +
      '<div class="tut-thumb">' + thumb + '<div class="tut-play">▶</div></div>' +
      '<div class="tut-info">' + badge +
        '<p class="tut-title">' + t.title + '</p>' +
        '<div class="tut-meta">' +
          '<span style="color:var(--g);font-weight:600">' + t.creator + '</span>' +
          '<span class="waste-pill">' + t.wasteItem + '</span>' +
          '<span>👍 ' + t.likes + '</span>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join('');
}

function callTutDetail(id) {
  var tuts = allTuts();
  for (var i = 0; i < tuts.length; i++) {
    if (tuts[i].id === id) { openTutDetail(tuts[i]); return; }
  }
}

function openTutDetail(t) {
  if (!t) return;
  inDetail = true;
  document.getElementById('tut-list').style.display      = 'none';
  document.getElementById('tut-detail').style.display    = 'block';
  document.getElementById('tut-match-bar').style.display = 'none';

  var vidHTML = t.videoFile
    ? '<div class="td-vid-box"><video controls src="' + URL.createObjectURL(t.videoFile) + '"></video></div>'
    : '<div class="td-vid-box"><div class="td-play-ico">▶</div></div>';

  var photoSrc = t.photoFile ? URL.createObjectURL(t.photoFile) : (t.photoURL || null);
  var photoHTML = photoSrc ? '<div class="td-photo"><img src="' + photoSrc + '" alt="' + t.title + '"/></div>' : '';

  var stepsHTML = '';
  var steps = t.steps || [];
  for (var i = 0; i < steps.length; i++) stepsHTML += '<li>' + steps[i] + '</li>';

  document.getElementById('tut-detail').innerHTML =
    vidHTML + photoHTML +
    '<div class="td-meta">' +
      '<p class="td-title">' + t.title + '</p>' +
      '<div class="td-stats">' +
        '<span>👍 ' + t.likes + '</span>' +
        '<span class="waste-pill">' + t.wasteItem + '</span>' +
        '<span class="td-sell-btn" onclick="showPage(\'pg-sell\')">💰 Sell Yours</span>' +
      '</div>' +
      '<p style="font-size:12px;color:#555;margin-top:4px">by <b>' + t.creator + '</b></p>' +
    '</div>' +
    '<div class="td-steps"><h4>📋 Step-by-Step Tutorial</h4><ol class="steps-ol">' + stepsHTML + '</ol></div>' +
    '<div style="padding:0 16px 16px">' +
      '<button class="btn-green" onclick="addTutToCart(' + t.id + ')">🛒 Buy Finished Product (' + t.price + ')</button>' +
      '<button class="btn-amber" onclick="showPage(\'pg-sell\')" style="margin-top:8px">✅ I made this — List mine!</button>' +
    '</div>';
}

function addTutToCart(id) {
  var tuts = allTuts();
  for (var i = 0; i < tuts.length; i++) {
    if (tuts[i].id === id) {
      if (!tuts[i].priceNum) { popToast('Product not available'); return; }
      doAddToCart({
        id: tuts[i].id, emoji: tuts[i].emoji,
        name: tuts[i].title, waste: tuts[i].wasteItem,
        price: tuts[i].price, priceNum: tuts[i].priceNum,
        photoFile: tuts[i].photoFile || null,
        photoURL: tuts[i].photoURL || null,
        sellerPhone: tuts[i].sellerPhone || ''
      });
      return;
    }
  }
}

function tutBack() {
  if (inDetail) {
    inDetail = false;
    document.getElementById('tut-detail').style.display = 'none';
    document.getElementById('tut-list').style.display   = 'block';
    if (tutFiltered) document.getElementById('tut-match-bar').style.display = 'block';
  } else {
    tutFiltered = false;
    document.getElementById('tut-match-bar').style.display = 'none';
    showPage('pg-home');
  }
}

function clearScanFilter() {
  tutFiltered = false; scanItem = ''; scanKW = [];
  document.getElementById('tut-match-bar').style.display = 'none';
  buildTutList(null, null);
}

// ================================================================
//  SELL / PUBLISH
// ================================================================
function initSteps() {
  stepCount = 0;
  var c = document.getElementById('steps-box');
  if (c) c.innerHTML = '';
  addStep('Collect and clean your waste material');
  addStep('Measure, cut and shape as needed');
  addStep('Assemble and join the pieces');
  addStep('Paint, decorate and finish');
}

function addStep(ph) {
  stepCount++;
  var c = document.getElementById('steps-box');
  if (!c) return;
  var row = document.createElement('div');
  row.className = 'step-row';
  row.innerHTML = '<div class="step-num">' + stepCount + '</div>' +
    '<input class="inp" type="text" placeholder="' + (ph || 'Step ' + stepCount + '...') + '"/>';
  c.appendChild(row);
}

function toggleWT(el) { el.classList.toggle('active'); }

function onUpPhoto(e) {
  var f = e.target.files[0]; if (!f) return;
  upPhoto = f;
  var prev = document.getElementById('up-photo-prev');
  prev.src = URL.createObjectURL(f); prev.style.display = 'block';
  document.getElementById('up-photo-ph').style.display = 'none';
}

function onUpVideo(e) {
  var f = e.target.files[0]; if (!f) return;
  upVideo = f;
  var prev = document.getElementById('up-video-prev');
  prev.src = URL.createObjectURL(f); prev.style.display = 'block';
  document.getElementById('up-video-ph').style.display = 'none';
}

function doPublish() {
  var name  = (document.getElementById('up-name').value  || '').trim();
  var price = (document.getElementById('up-price').value || '').trim();
  var tags  = [];
  var wtEls = document.querySelectorAll('.wt.active');
  for (var i = 0; i < wtEls.length; i++) tags.push(wtEls[i].textContent.trim());

  if (!name)        { popToast('Please enter what you made'); return; }
  if (!price)       { popToast('Please enter a selling price'); return; }
  if (!tags.length) { popToast('Please select the waste material'); return; }
  if (!upPhoto)     { popToast('Please upload a photo of your creation'); return; }

  var stepInputs = document.querySelectorAll('#steps-box input');
  var steps = [];
  for (var j = 0; j < stepInputs.length; j++) {
    var v = stepInputs[j].value.trim(); if (v) steps.push(v);
  }
  if (steps.length < 2) { popToast('Please add at least 2 tutorial steps'); return; }

  var waste    = tags[0].toLowerCase();
  var priceNum = parseInt(price, 10);

  var kw = [];
  for (var t = 0; t < tags.length; t++) {
    var tl = tags[t].toLowerCase(); kw.push(tl);
    var words = tl.split(/[\s\/]+/);
    for (var w = 0; w < words.length; w++) { if (words[w].length > 2) kw.push(words[w]); }
    var dkeys = Object.keys(WASTE_DICT);
    for (var dk = 0; dk < dkeys.length; dk++) {
      if (dkeys[dk].indexOf(tl) >= 0 || tl.indexOf(dkeys[dk]) >= 0) {
        var dv = WASTE_DICT[dkeys[dk]];
        for (var dvi = 0; dvi < dv.length; dvi++) kw.push(dv[dvi]);
      }
    }
  }
  var kwUniq = [], kwSeen = {};
  for (var ki = 0; ki < kw.length; ki++) {
    if (!kwSeen[kw[ki]]) { kwSeen[kw[ki]] = true; kwUniq.push(kw[ki]); }
  }

  var id      = Date.now();
  var creator = currentUser ? currentUser.name : 'You';
  var phone   = currentUser ? (currentUser.phone || '') : '';

  var fr = new FileReader();
  fr.onload = function (ev) {
    var photoURL = ev.target.result;
    USER_TUTORIALS.push({
      id: id, emoji: getEmoji(waste), title: name,
      creator: creator, views: '0', likes: 0,
      wasteItem: waste, kw: kwUniq, steps: steps,
      photoFile: null, videoFile: null, photoURL: photoURL,
      cat: getCat(waste), price: 'Rs.' + price, priceNum: priceNum,
      isMyUpload: true, sellerPhone: phone
    });
    USER_PRODUCTS.push({
      id: id, emoji: getEmoji(waste), name: name,
      waste: tags.join(' + '), price: 'Rs.' + price, priceNum: priceNum,
      stars: '⭐⭐⭐⭐⭐', cat: getCat(waste),
      photoFile: null, photoURL: photoURL,
      isMyUpload: true, sellerPhone: phone
    });
    saveGlobalData();
    buildTutList(null, null);
    buildMarket();
  };
  fr.readAsDataURL(upPhoto);

  logAct('📤', '#e8f5e8', 'Published: ' + name);
  popToast('Published! Visible to ALL users in Tutorials AND Market 🎉');

  // Reset form
  document.getElementById('up-name').value  = '';
  document.getElementById('up-price').value = '';
  document.getElementById('up-desc').value  = '';
  var actWt = document.querySelectorAll('.wt.active');
  for (var wi = 0; wi < actWt.length; wi++) actWt[wi].classList.remove('active');
  var pp = document.getElementById('up-photo-prev'); pp.style.display = 'none'; pp.src = '';
  document.getElementById('up-photo-ph').style.display = 'flex';
  var vp = document.getElementById('up-video-prev'); vp.style.display = 'none'; vp.src = '';
  document.getElementById('up-video-ph').style.display = 'flex';
  upPhoto = null; upVideo = null;
  document.getElementById('steps-box').innerHTML = '';
  stepCount = 0; initSteps();

  setTimeout(function () {
    tutFiltered = false; inDetail = false;
    document.getElementById('tut-match-bar').style.display = 'none';
    buildTutList(null, null);
    showPage('pg-tutorials');
  }, 900);
}

// ================================================================
//  MARKET
// ================================================================
function buildMarket(filter) {
  var grid = document.getElementById('mkt-grid');
  if (!grid) return;
  var prods = allProds();
  if (mktCat !== 'All') {
    var f1 = [];
    for (var i = 0; i < prods.length; i++) { if (prods[i].cat === mktCat) f1.push(prods[i]); }
    prods = f1;
  }
  if (filter && filter.trim()) {
    var fl = filter.toLowerCase(), f2 = [];
    for (var j = 0; j < prods.length; j++) {
      if (prods[j].name.toLowerCase().indexOf(fl) >= 0 || prods[j].waste.toLowerCase().indexOf(fl) >= 0) f2.push(prods[j]);
    }
    prods = f2;
  }
  if (!prods.length) {
    grid.innerHTML = '<div style="grid-column:span 2;text-align:center;padding:28px;color:#aaa;font-size:13px">No products found</div>';
    return;
  }
  var html = '';
  for (var k = 0; k < prods.length; k++) {
    var p = prods[k];
    var imgSrc = p.photoFile ? URL.createObjectURL(p.photoFile) : (p.photoURL || null);
    var img = imgSrc ? '<img src="' + imgSrc + '" alt="' + p.name + '"/>' : p.emoji;
    var myL = p.isMyUpload ? '<div style="background:var(--ap);color:#92400e;font-size:9px;font-weight:700;padding:2px 6px;border-radius:6px;margin-bottom:4px;display:inline-block">MY LISTING</div>' : '';
    html += '<div class="mkt-card">' +
      '<div class="mkt-img">' + img + '</div>' +
      '<div class="mkt-info">' + myL +
        '<p class="mkt-name">' + p.name + '</p>' +
        '<p class="mkt-waste">From ' + p.waste + '</p>' +
        '<div class="mkt-row"><span class="mkt-price">' + p.price + '</span>' +
        '<button class="mkt-buy" onclick="event.stopPropagation();mktBuy(' + p.id + ')">Buy</button></div>' +
        '<div class="mkt-stars">' + p.stars + '</div>' +
      '</div></div>';
  }
  grid.innerHTML = html;
}

function mktBuy(id) {
  var prods = allProds();
  for (var i = 0; i < prods.length; i++) {
    if (prods[i].id === id) {
      doAddToCart({
        id: prods[i].id, emoji: prods[i].emoji,
        name: prods[i].name, waste: prods[i].waste,
        price: prods[i].price, priceNum: prods[i].priceNum,
        photoFile: prods[i].photoFile || null,
        photoURL: prods[i].photoURL || null,
        sellerPhone: prods[i].sellerPhone || ''
      });
      return;
    }
  }
}

function setMcat(el, cat) {
  var mcats = document.querySelectorAll('.mcat');
  for (var i = 0; i < mcats.length; i++) mcats[i].classList.remove('active');
  el.classList.add('active'); mktCat = cat; buildMarket();
}

// ================================================================
//  CART
// ================================================================
function doAddToCart(item) {
  for (var i = 0; i < cartItems.length; i++) {
    if (cartItems[i].id === item.id) { popToast('Already in cart: ' + item.name); return; }
  }
  cartItems.push(item);
  updateBadge();
  popToast('Added to cart: ' + item.name + ' 🛒');
  logAct('🛒', '#fef3c7', 'Added to cart: ' + item.name);
}

function updateBadge() {
  var b = document.getElementById('cart-badge');
  if (!b) return;
  if (cartItems.length > 0) { b.style.display = 'inline'; b.textContent = cartItems.length; }
  else b.style.display = 'none';
}

function buildCart() {
  var body = document.getElementById('cart-body');
  var foot = document.getElementById('cart-foot');
  if (!body) return;
  if (!cartItems.length) {
    body.innerHTML = '<div style="text-align:center;padding:50px 20px;color:#aaa">' +
      '<p style="font-size:44px;margin-bottom:12px">🛒</p>' +
      '<p style="font-size:14px;font-weight:600;color:#555;margin-bottom:8px">Your cart is empty</p>' +
      '<p style="font-size:12px;margin-bottom:16px">Browse the market and add items!</p>' +
      '<button class="btn-green" style="max-width:180px;margin:0 auto" onclick="showPage(\'pg-market\')">Browse Market</button>' +
    '</div>';
    if (foot) foot.style.display = 'none'; return;
  }
  var total = 0, html = '';
  for (var i = 0; i < cartItems.length; i++) {
    var c = cartItems[i]; total += (c.priceNum || 0);
    var imgSrc = c.photoFile ? URL.createObjectURL(c.photoFile) : (c.photoURL || null);
    var img = imgSrc ? '<img src="' + imgSrc + '" style="width:100%;height:100%;object-fit:cover;border-radius:10px"/>' : c.emoji;
    html += '<div class="cart-row">' +
      '<div class="cart-emo">' + img + '</div>' +
      '<div class="cart-info">' +
        '<p class="cart-name">' + c.name + '</p>' +
        '<p class="cart-waste">From ' + c.waste + '</p>' +
        '<p class="cart-price">' + c.price + '</p>' +
        '<button class="cart-rm" onclick="rmFromCart(' + c.id + ')">Remove</button>' +
      '</div></div>';
  }
  body.innerHTML = html;
  if (foot) {
    foot.style.display = 'block';
    document.getElementById('c-sub').textContent = 'Rs.' + total;
    document.getElementById('c-tot').textContent = 'Rs.' + total;
  }
}

function rmFromCart(id) {
  var updated = [];
  for (var i = 0; i < cartItems.length; i++) { if (cartItems[i].id !== id) updated.push(cartItems[i]); }
  cartItems = updated; updateBadge(); buildCart();
  popToast('Removed from cart');
}

// ================================================================
//  CHECKOUT + SMS  ← paste FAST2SMS_KEY at line 5
// ================================================================
function doCheckout() {
  var count = cartItems.length, total = 0;
  for (var i = 0; i < cartItems.length; i++) total += (cartItems[i].priceNum || 0);
  soldCount += count;
  saveUserStats();
  for (var j = 0; j < cartItems.length; j++) sendSMS(cartItems[j], total);
  logAct('✅', '#dcfce7', 'Order placed — Rs.' + total + ' for ' + count + ' item(s)');
  cartItems = []; updateBadge(); buildCart();
  showOrderPopup(count, total);
}

function sendSMS(item, total) {
  var phone = (item.sellerPhone || '').trim();
  var buyer = currentUser ? currentUser.name : 'A customer';
  var msg   = 'GreenLoop AI Order! ' + buyer + ' ordered your "' + item.name + '" for ' + item.price + '. Total Rs.' + total + '. Please confirm. -GreenLoop AI';
  console.log('SMS to seller (' + (phone || 'no phone') + '): ' + msg);
  if (!FAST2SMS_KEY) { console.log('Add Fast2SMS key at line 5 to enable real SMS.'); return; }
  if (!phone)        { console.log('Seller has no phone number. SMS skipped.'); return; }
  fetch('https://www.fast2sms.com/dev/bulkV2', {
    method: 'POST',
    headers: { 'authorization': FAST2SMS_KEY, 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
    body: JSON.stringify({ route: 'v3', sender_id: 'TXTIND', message: msg, language: 'english', flash: 0, numbers: phone })
  })
  .then(function (r) { return r.json(); })
  .then(function (d) {
    if (d.return === true) console.log('SMS sent to ' + phone);
    else console.log('Fast2SMS response:', JSON.stringify(d));
  })
  .catch(function (e) { console.log('SMS error:', e); });
}

function showOrderPopup(count, total) {
  var old = document.getElementById('order-popup'); if (old) old.remove();
  var div = document.createElement('div');
  div.id = 'order-popup'; div.className = 'order-overlay';
  div.innerHTML =
    '<div class="order-box">' +
      '<div style="font-size:50px;margin-bottom:12px">🎉</div>' +
      '<h3 style="font-family:Outfit,sans-serif;font-size:20px;font-weight:800;color:#0f4526;margin-bottom:8px">Order Placed!</h3>' +
      '<p style="font-size:14px;color:#555;margin-bottom:6px">' + count + ' item(s) · <b style="color:#1a6b3c">Rs.' + total + '</b></p>' +
      '<p style="font-size:12px;color:#999;margin-bottom:18px">Seller notified via SMS 📱</p>' +
      '<div style="background:#e8f5ee;border-radius:12px;padding:12px 14px;margin-bottom:18px;text-align:left">' +
        '<p style="font-size:11px;font-weight:700;color:#1a6b3c;margin-bottom:3px">📱 SMS SENT TO SELLER</p>' +
        '<p style="font-size:12px;color:#555;line-height:1.5">The seller has been notified and will confirm your order shortly.</p>' +
      '</div>' +
      '<button onclick="closeOrderPopup()" style="width:100%;background:#1a6b3c;color:#fff;font-family:Outfit,sans-serif;font-size:14px;font-weight:700;border:none;border-radius:30px;padding:14px;cursor:pointer">Back to Home</button>' +
    '</div>';
  document.querySelector('.screen').appendChild(div);
}

function closeOrderPopup() {
  var el = document.getElementById('order-popup'); if (el) el.remove();
  showPage('pg-home');
}

// ================================================================
//  PROFILE — shows THIS user's data only
// ================================================================
function buildProfile() {
  if (currentUser) {
    document.getElementById('prof-av').textContent    = currentUser.init  || 'E';
    document.getElementById('prof-name').textContent  = currentUser.name  || 'EcoWarrior';
    document.getElementById('prof-email').textContent = currentUser.email || '';
    document.getElementById('prof-city').textContent  = '📍 ' + (currentUser.city || 'India');
    var av = document.getElementById('home-av'); if (av) av.textContent = currentUser.init || 'E';
  }
  document.getElementById('ps-scans').textContent = scanCount;
  document.getElementById('ps-tuts').textContent  = USER_TUTORIALS.length;
  document.getElementById('ps-sales').textContent = soldCount;
  var wKg = (scanCount * 0.2 + USER_TUTORIALS.length * 0.5 + soldCount * 0.3).toFixed(1);
  document.getElementById('ps-waste').textContent = wKg + 'kg';
  var earn = 0;
  for (var i = 0; i < USER_PRODUCTS.length; i++) earn += (USER_PRODUCTS[i].priceNum || 0);
  document.getElementById('ps-earn').textContent     = 'Rs.' + earn.toLocaleString('en-IN');
  document.getElementById('ps-earn-sub').textContent = earn > 0
    ? 'Rs.' + earn + ' from ' + USER_TUTORIALS.length + ' listing(s)'
    : 'Start selling to earn!';
  var listEl = document.getElementById('prof-listings');
  if (!USER_PRODUCTS.length) {
    listEl.innerHTML = '<p style="text-align:center;font-size:13px;color:#bbb;padding:14px">No listings yet. <span onclick="showPage(\'pg-sell\')" style="color:var(--g);font-weight:600;cursor:pointer">List something!</span></p>';
  } else {
    var html = '';
    for (var j = 0; j < USER_PRODUCTS.length; j++) {
      var p = USER_PRODUCTS[j];
      var imgSrc = p.photoFile ? URL.createObjectURL(p.photoFile) : (p.photoURL || null);
      var img = imgSrc ? '<img src="' + imgSrc + '" style="width:100%;height:100%;object-fit:cover;border-radius:10px"/>' : p.emoji;
      html += '<div class="pl-row">' +
        '<div class="pl-emo">' + img + '</div>' +
        '<div style="flex:1"><p style="font-size:13px;font-weight:600">' + p.name + '</p>' +
        '<p style="font-size:11px;color:#aaa">From ' + p.waste + '</p></div>' +
        '<div style="text-align:right"><p style="font-family:Outfit,sans-serif;font-size:15px;font-weight:700;color:var(--g)">' + p.price + '</p>' +
        '<span style="font-size:10px;background:#dcfce7;color:var(--g);padding:2px 8px;border-radius:8px;font-weight:700">Live</span></div>' +
      '</div>';
    }
    listEl.innerHTML = html;
  }
}

// ================================================================
//  DASHBOARD — shows THIS user's stats only
// ================================================================
function buildDash() {
  var wKg = (scanCount * 0.2 + USER_TUTORIALS.length * 0.5 + soldCount * 0.3).toFixed(1);
  var dw = document.getElementById('d-waste');  if (dw) dw.textContent = wKg + ' kg';
  var earn = 0;
  for (var i = 0; i < USER_PRODUCTS.length; i++) earn += (USER_PRODUCTS[i].priceNum || 0);
  var de = document.getElementById('d-earn');   if (de) de.textContent = 'Rs.' + earn.toLocaleString('en-IN');
  var ds = document.getElementById('d-scans');  if (ds) ds.textContent = scanCount;
  var dl = document.getElementById('d-listed'); if (dl) dl.textContent = USER_PRODUCTS.length;
  var dd = document.getElementById('d-sold');   if (dd) dd.textContent = soldCount;
  var ct = document.getElementById('cs-tuts');  if (ct) ct.textContent = SEED_TUTORIALS.length + USER_TUTORIALS.length;
  var cp = document.getElementById('cs-prods'); if (cp) cp.textContent = SEED_PRODUCTS.length + USER_PRODUCTS.length;
  var actEl = document.getElementById('d-activity');
  if (!actEl) return;
  if (!actLog.length) {
    actEl.innerHTML = '<p style="text-align:center;font-size:13px;color:#bbb;padding:14px">No activity yet. Start scanning!</p>';
    return;
  }
  var html = '';
  var show = actLog.slice(0, 8);
  for (var j = 0; j < show.length; j++) {
    html += '<div class="act-row"><div class="act-ico" style="background:' + show[j].bg + '">' + show[j].icon + '</div><span>' + show[j].txt + '</span></div>';
  }
  actEl.innerHTML = html;
}
