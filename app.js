// ============================================================
// ESTADO GLOBAL
// ============================================================
const state = {
  niche: "",
  description: "",
  topics: [],
  selectedTopic: null,
  format: "feed",
  subformat: null,
  pattern: null,
  colors: { primary: "#E8336D", secondary: "#14131B", accent: "#FF9F1C", text: "#14131B", extra: [] },
  logoDataUrl: null,
  useLogo: false,
  logoPosition: "canto-superior",
  tone: null,
  objective: null,
  imageChoice: null,
  hooks: [],
  selectedHook: null,
  result: null, // { title, slides, caption, hashtags, cta }
  currentSlide: 0,
};

const STEP_ORDER = ["niche", "trends", "format", "design", "identity", "copy", "preview", "library"];

// ============================================================
// BACKEND URL (config)
// ============================================================
function getBackendUrl() {
  return localStorage.getItem("ec_backend_url") || "";
}
function setBackendUrl(url) {
  localStorage.setItem("ec_backend_url", url.replace(/\/$/, ""));
}

async function apiPost(path, body) {
  const base = getBackendUrl();
  if (!base) {
    openSettings();
    throw new Error("Configure a URL do backend antes de continuar (ícone ⚙ no topo).");
  }
  const res = await fetch(base + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Erro ${res.status} ao chamar ${path}`);
  }
  return res.json();
}

// ============================================================
// NAVEGAÇÃO ENTRE ETAPAS
// ============================================================
function goToStep(step) {
  STEP_ORDER.forEach((s) => {
    document.getElementById(`step-${s}`).hidden = s !== step;
  });
  document.querySelectorAll(".rail-step").forEach((btn) => {
    btn.classList.toggle("current", btn.dataset.step === step);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function unlockStep(step) {
  const btn = document.querySelector(`.rail-step[data-step="${step}"]`);
  if (btn) btn.disabled = false;
}

function markDone(step) {
  const btn = document.querySelector(`.rail-step[data-step="${step}"]`);
  if (btn) btn.classList.add("done");
}

document.querySelectorAll(".rail-step").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (!btn.disabled) goToStep(btn.dataset.step);
  });
});
document.querySelectorAll("[data-back]").forEach((btn) => {
  btn.addEventListener("click", () => goToStep(btn.dataset.back));
});

// ============================================================
// SETTINGS MODAL
// ============================================================
const settingsModal = document.getElementById("settingsModal");
function openSettings() {
  document.getElementById("backendUrlInput").value = getBackendUrl();
  settingsModal.hidden = false;
}
document.getElementById("settingsBtn").addEventListener("click", openSettings);
document.getElementById("closeSettingsBtn").addEventListener("click", () => (settingsModal.hidden = true));
document.getElementById("saveSettingsBtn").addEventListener("click", () => {
  setBackendUrl(document.getElementById("backendUrlInput").value.trim());
  settingsModal.hidden = true;
});

// ============================================================
// 01 — NICHO
// ============================================================
const nicheChips = document.getElementById("nicheChips");
const nicheCustom = document.getElementById("nicheCustom");
const nicheDescription = document.getElementById("nicheDescription");
const toTrendsBtn = document.getElementById("toTrendsBtn");

function selectNiche(value) {
  state.niche = value;
  nicheChips.querySelectorAll(".chip").forEach((c) => c.classList.toggle("selected", c.dataset.niche === value));
  nicheCustom.value = "";
  toTrendsBtn.disabled = !state.niche;
}
nicheChips.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (chip) selectNiche(chip.dataset.niche);
});
nicheCustom.addEventListener("input", () => {
  state.niche = nicheCustom.value.trim();
  nicheChips.querySelectorAll(".chip").forEach((c) => c.classList.remove("selected"));
  toTrendsBtn.disabled = !state.niche;
});
nicheDescription.addEventListener("input", () => (state.description = nicheDescription.value));

toTrendsBtn.addEventListener("click", () => {
  const pill = document.getElementById("nichePill");
  pill.textContent = state.niche;
  pill.hidden = false;
  unlockStep("trends");
  markDone("niche");
  goToStep("trends");
});

// ============================================================
// 02 — TENDÊNCIAS
// ============================================================
const topicGrid = document.getElementById("topicGrid");
const trendsStatus = document.getElementById("trendsStatus");
const toFormatBtn = document.getElementById("toFormatBtn");
const todayPick = document.getElementById("todayPick");
const todayPickBody = document.getElementById("todayPickBody");

function categoryLabel(cat) {
  const map = {
    noticia: "📰 Notícia", curiosidade: "🧠 Curiosidade", tendencia: "🔥 Tendência",
    dado: "📊 Dado", polemica: "⚠️ Polêmica", pergunta_frequente: "🎯 Pergunta frequente",
    data_comemorativa: "🗓️ Data comemorativa",
  };
  return map[cat] || cat;
}

function renderTopics() {
  topicGrid.innerHTML = "";
  state.topics.forEach((t, i) => {
    const card = document.createElement("div");
    card.className = "topic-card" + (state.selectedTopic === i ? " selected" : "");
    card.innerHTML = `
      <div class="topic-score ${t.score >= 85 ? "hot" : ""}">${t.score}</div>
      <span class="topic-cat">${categoryLabel(t.category)}</span>
      <p class="topic-title">${t.title}</p>
      <p class="topic-why">${t.why || ""}</p>
      <div class="topic-eng">
        ${t.engagement ? Object.entries(t.engagement).map(([k, v]) => `<span class="eng-badge">${k}: ${v}</span>`).join("") : ""}
      </div>
    `;
    card.addEventListener("click", () => {
      state.selectedTopic = i;
      document.getElementById("chosenTopicLabel").textContent = `Assunto escolhido: "${t.title}"`;
      renderTopics();
      toFormatBtn.disabled = false;
    });
    topicGrid.appendChild(card);
  });

  if (state.topics.length) {
    const best = state.topics.reduce((a, b) => (b.score > a.score ? b : a));
    todayPick.hidden = false;
    todayPickBody.innerHTML = `<p style="margin:8px 0 0;font-size:15px;">${best.title} <strong style="color:var(--amber)">(${best.score}/100)</strong></p>`;
  }
}

document.getElementById("fetchTrendsBtn").addEventListener("click", async () => {
  trendsStatus.textContent = "Buscando notícias, tendências e dados na web… isso pode levar alguns segundos.";
  topicGrid.innerHTML = "";
  todayPick.hidden = true;
  try {
    const data = await apiPost("/api/trends", { niche: state.niche, description: state.description });
    state.topics = (data.topics || []).sort((a, b) => b.score - a.score);
    trendsStatus.textContent = state.topics.length ? "" : "Nenhum assunto encontrado. Tente novamente.";
    renderTopics();
  } catch (err) {
    trendsStatus.textContent = "❌ " + err.message;
  }
});

toFormatBtn.addEventListener("click", () => {
  unlockStep("format");
  markDone("trends");
  goToStep("format");
});

// ============================================================
// 03 — FORMATO
// ============================================================
const toDesignBtn = document.getElementById("toDesignBtn");
const FEED_SUBFORMATS = [
  { name: "Post único", blocks: [{ t: "photo", h: 70 }, { t: "bar", w: 60, h: 14 }] },
  { name: "Carrossel", blocks: [{ t: "carousel-stack" }] },
  { name: "Foto + texto", blocks: [{ t: "photo", h: 45 }, { t: "textblock", h: 40 }] },
  { name: "Infográfico", blocks: [{ t: "dot" }, { t: "line" }, { t: "dot" }, { t: "line" }, { t: "dot" }] },
  { name: "Antes/depois", blocks: [{ t: "split" }] },
  { name: "Frase", blocks: [{ t: "center-bar", w: 80, h: 14 }, { t: "center-bar", w: 60, h: 14 }, { t: "center-bar", w: 40, h: 14 }] },
  { name: "Lista", blocks: [{ t: "list" }] },
];

const STORY_SUBFORMATS = [
  { name: "Story único", blocks: [{ t: "center-bar", w: 70, h: 10 }, { t: "center-bar", w: 50, h: 10 }] },
  { name: "Sequência de stories", blocks: [{ t: "progress-bars" }] },
  { name: "Enquete", blocks: [{ t: "poll" }] },
  { name: "Quiz", blocks: [{ t: "quiz" }] },
  { name: "Caixa de perguntas", blocks: [{ t: "ask-box" }] },
  { name: "CTA", blocks: [{ t: "button" }] },
  { name: "Story educativo", blocks: [{ t: "list" }] },
];

function buildSubformatGrid(containerId, list, isStory) {
  const grid = document.getElementById(containerId);
  list.forEach((item) => {
    const card = document.createElement("div");
    card.className = "pattern-card";
    card.innerHTML = `<div class="pattern-thumb${isStory ? " story-ratio" : ""}">${renderPatternThumb(item)}</div><div class="pattern-name">${item.name}</div>`;
    card.addEventListener("click", () => {
      grid.querySelectorAll(".pattern-card").forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
      state.subformat = item.name;
      toDesignBtn.disabled = false;
    });
    grid.appendChild(card);
  });
}
buildSubformatGrid("subformatFeed", FEED_SUBFORMATS, false);
buildSubformatGrid("subformatStories", STORY_SUBFORMATS, true);

document.querySelectorAll(".toggle-btn[data-format]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".toggle-btn[data-format]").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.format = btn.dataset.format;
    state.subformat = null;
    toDesignBtn.disabled = true;
    document.getElementById("subformatFeed").hidden = state.format !== "feed";
    document.getElementById("subformatStories").hidden = state.format !== "stories";
    document.querySelectorAll("#subformatFeed .pattern-card, #subformatStories .pattern-card").forEach((c) => c.classList.remove("selected"));
  });
});
toDesignBtn.addEventListener("click", () => {
  unlockStep("design");
  markDone("format");
  buildPatternGrid();
  goToStep("design");
});

// ============================================================
// 04 — DESIGN (20 padrões, cada um com uma mini composição visual)
// ============================================================
const PATTERNS = [
  { name: "Foto grande + título", blocks: [{ t: "photo", h: 70 }, { t: "bar", w: 60, h: 14 }] },
  { name: "Foto + bloco de texto", blocks: [{ t: "photo", h: 45 }, { t: "textblock", h: 40 }] },
  { name: "Texto central", blocks: [{ t: "center-bar", w: 70, h: 10 }, { t: "center-bar", w: 50, h: 10 }] },
  { name: "Título gigante", blocks: [{ t: "bar", w: 90, h: 30 }, { t: "bar", w: 60, h: 12 }] },
  { name: "Editorial", blocks: [{ t: "bar", w: 30, h: 10, align: "left" }, { t: "textblock", h: 55 }] },
  { name: "Minimalista", blocks: [{ t: "dot" }, { t: "bar", w: 40, h: 8 }] },
  { name: "Notícia", blocks: [{ t: "tag" }, { t: "bar", w: 85, h: 18 }, { t: "textblock", h: 25 }] },
  { name: "Curiosidade", blocks: [{ t: "tag" }, { t: "center-bar", w: 75, h: 22 }] },
  { name: "Lista numerada", blocks: [{ t: "list" }] },
  { name: "Antes × Depois", blocks: [{ t: "split" }] },
  { name: "Pergunta + resposta", blocks: [{ t: "bar", w: 70, h: 16 }, { t: "line" }, { t: "bar", w: 55, h: 12 }] },
  { name: "Mito × Verdade", blocks: [{ t: "split-label" }] },
  { name: "Comparação", blocks: [{ t: "columns" }] },
  { name: "Infográfico", blocks: [{ t: "dot" }, { t: "line" }, { t: "dot" }, { t: "line" }, { t: "dot" }] },
  { name: "Card de estatística", blocks: [{ t: "bignum" }] },
  { name: "Frase de impacto", blocks: [{ t: "center-bar", w: 80, h: 14 }, { t: "center-bar", w: 60, h: 14 }, { t: "center-bar", w: 40, h: 14 }] },
  { name: "Depoimento", blocks: [{ t: "quote" }] },
  { name: "Checklist", blocks: [{ t: "checklist" }] },
  { name: "Destaque de profissional", blocks: [{ t: "avatar" }, { t: "bar", w: 50, h: 10 }] },
  { name: "CTA / chamada para ação", blocks: [{ t: "button" }] },
];

function renderPatternThumb(p) {
  return p.blocks.map((b) => {
    switch (b.t) {
      case "photo": return `<div class="pt-block" style="height:${b.h}%;background:var(--paper);border:1px solid var(--line)"></div>`;
      case "bar": return `<div class="pt-block" style="width:${b.w}%;height:${b.h}%;${b.align === "left" ? "" : "align-self:flex-start;"}"></div>`;
      case "center-bar": return `<div class="pt-block" style="width:${b.w}%;height:${b.h}%;align-self:center;"></div>`;
      case "textblock": return `<div class="pt-block" style="height:${b.h}%;background:var(--line);opacity:.6"></div>`;
      case "tag": return `<div class="pt-block" style="width:35%;height:10%;border-radius:20px;"></div>`;
      case "dot": return `<div class="pt-block" style="width:14px;height:14px;border-radius:50%;align-self:center;"></div>`;
      case "list": return `<div style="display:flex;flex-direction:column;gap:6px;flex:1;justify-content:center;">${[1,2,3].map(()=>`<div class="pt-block" style="height:14%;width:90%"></div>`).join("")}</div>`;
      case "split": return `<div style="display:flex;gap:4px;flex:1;"><div class="pt-block" style="width:50%"></div><div class="pt-block" style="width:50%;background:var(--line)"></div></div>`;
      case "split-label": return `<div style="display:flex;gap:4px;flex:1;"><div class="pt-block" style="width:50%;background:var(--accent)"></div><div class="pt-block" style="width:50%;background:var(--green)"></div></div>`;
      case "columns": return `<div style="display:flex;gap:6px;flex:1;">${[1,2,3].map(()=>`<div class="pt-block" style="width:33%"></div>`).join("")}</div>`;
      case "line": return `<div class="pt-block" style="width:70%;height:6%;align-self:center;"></div>`;
      case "bignum": return `<div style="flex:1;display:flex;align-items:center;justify-content:center;font-family:var(--display);font-size:38px;font-weight:700;color:var(--ink)">92%</div>`;
      case "quote": return `<div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:8px;align-items:center;"><div style="font-family:var(--display);font-size:26px;">“</div><div class="pt-block" style="width:70%;height:8%"></div><div class="pt-block" style="width:50%;height:8%"></div></div>`;
      case "checklist": return `<div style="display:flex;flex-direction:column;gap:8px;flex:1;justify-content:center;">${[1,2,3].map(()=>`<div style="display:flex;gap:6px;align-items:center;"><div class="pt-block" style="width:12px;height:12px;border-radius:3px;"></div><div class="pt-block" style="width:70%;height:10px;background:var(--line)"></div></div>`).join("")}</div>`;
      case "avatar": return `<div style="width:40px;height:40px;border-radius:50%;background:var(--ink);align-self:center;"></div>`;
      case "button": return `<div style="flex:1;display:flex;align-items:center;justify-content:center;"><div style="padding:8px 18px;border-radius:20px;background:var(--accent);color:white;font-size:11px;">Agendar →</div></div>`;
      case "carousel-stack": return `<div style="position:relative;flex:1;display:flex;align-items:center;justify-content:center;">
          <div class="pt-block" style="position:absolute;width:70%;height:75%;transform:translate(10px,8px);opacity:.35"></div>
          <div class="pt-block" style="position:absolute;width:70%;height:75%;transform:translate(5px,4px);opacity:.6"></div>
          <div class="pt-block" style="position:relative;width:70%;height:75%;"></div>
        </div>
        <div style="display:flex;gap:4px;justify-content:center;">${[1,2,3,4].map((_,i)=>`<div style="width:5px;height:5px;border-radius:50%;background:${i===0?"var(--ink)":"var(--line)"}"></div>`).join("")}</div>`;
      case "progress-bars": return `<div style="display:flex;gap:4px;">${[1,2,3].map((_,i)=>`<div style="flex:1;height:4px;border-radius:2px;background:${i===0?"var(--ink)":"var(--line)"}"></div>`).join("")}</div>
        <div style="flex:1;display:flex;align-items:center;justify-content:center;"><div class="pt-block" style="width:60%;height:20%"></div></div>`;
      case "poll": return `<div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:10px;">
          <div class="pt-block" style="width:80%;height:10%;align-self:center;"></div>
          <div style="display:flex;flex-direction:column;gap:6px;">
            <div style="height:20px;border-radius:10px;background:var(--accent);width:75%;"></div>
            <div style="height:20px;border-radius:10px;background:var(--line);width:45%;"></div>
          </div>
        </div>`;
      case "quiz": return `<div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:8px;">
          <div class="pt-block" style="width:85%;height:10%;align-self:center;"></div>
          ${[1,2,3].map((_,i)=>`<div style="height:16px;border-radius:8px;border:1.5px solid var(--ink);background:${i===1?"var(--ink)":"transparent"};"></div>`).join("")}
        </div>`;
      case "ask-box": return `<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;">
          <div class="pt-block" style="height:12%;margin-bottom:16%;"></div>
          <div style="border:1.5px solid var(--ink);border-radius:14px;padding:8px;font-size:10px;color:var(--muted);">Envie sua pergunta…</div>
        </div>`;
      default: return "";
    }
  }).join("");
}

function buildPatternGrid() {
  const grid = document.getElementById("patternGrid");
  if (grid.dataset.built) return;
  grid.dataset.built = "1";
  PATTERNS.forEach((p, i) => {
    const card = document.createElement("div");
    card.className = "pattern-card";
    card.innerHTML = `<div class="pattern-thumb">${renderPatternThumb(p)}</div><div class="pattern-name">${String(i + 1).padStart(2, "0")} — ${p.name}</div>`;
    card.addEventListener("click", () => {
      state.pattern = p.name;
      grid.querySelectorAll(".pattern-card").forEach((c) => c.classList.remove("selected"));
      card.classList.add("selected");
      document.getElementById("toIdentityBtn").disabled = false;
    });
    grid.appendChild(card);
  });
}

document.getElementById("toIdentityBtn").addEventListener("click", () => {
  unlockStep("identity");
  markDone("design");
  goToStep("identity");
});

// ============================================================
// 05 — IDENTIDADE VISUAL
// ============================================================
document.querySelectorAll(".color-row").forEach((row) => {
  const key = row.dataset.color;
  const colorInput = row.querySelector('input[type="color"]');
  const hexInput = row.querySelector(".hex-input");
  colorInput.addEventListener("input", () => { hexInput.value = colorInput.value; state.colors[key] = colorInput.value; });
  hexInput.addEventListener("input", () => {
    if (/^#[0-9a-fA-F]{6}$/.test(hexInput.value)) { colorInput.value = hexInput.value; state.colors[key] = hexInput.value; }
  });
});

document.getElementById("addColorBtn").addEventListener("click", () => {
  const wrap = document.getElementById("extraColors");
  const idx = state.colors.extra.length;
  const row = document.createElement("div");
  row.className = "color-row";
  row.innerHTML = `
    <label>Cor extra ${idx + 1}</label>
    <div class="color-input-wrap">
      <input type="color" value="#999999" />
      <input type="text" class="hex-input" value="#999999" />
    </div>`;
  const colorInput = row.querySelector('input[type="color"]');
  const hexInput = row.querySelector(".hex-input");
  state.colors.extra.push("#999999");
  colorInput.addEventListener("input", () => { hexInput.value = colorInput.value; state.colors.extra[idx] = colorInput.value; });
  hexInput.addEventListener("input", () => {
    if (/^#[0-9a-fA-F]{6}$/.test(hexInput.value)) { colorInput.value = hexInput.value; state.colors.extra[idx] = hexInput.value; }
  });
  wrap.appendChild(row);
});

const logoInput = document.getElementById("logoInput");
const logoUploadBox = document.getElementById("logoUploadBox");
const logoPreview = document.getElementById("logoPreview");
const logoUploadText = document.getElementById("logoUploadText");
logoUploadBox.addEventListener("click", () => logoInput.click());
logoInput.addEventListener("change", () => {
  const file = logoInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    state.logoDataUrl = reader.result;
    logoPreview.src = reader.result;
    logoPreview.hidden = false;
    logoUploadText.hidden = true;
    document.getElementById("extractColorsBtn").disabled = false;
  };
  reader.readAsDataURL(file);
});
document.getElementById("useLogoCheckbox").addEventListener("change", (e) => (state.useLogo = e.target.checked));
document.getElementById("logoPosition").addEventListener("change", (e) => (state.logoPosition = e.target.value));

// extração simples de cores dominantes de uma imagem via canvas
document.getElementById("extractColorsBtn").addEventListener("click", () => {
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    const size = 60;
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;
    const counts = {};
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 100) continue; // ignora transparência
      // agrupa cores em buckets de 32 para achar dominantes
      const r = Math.round(data[i] / 32) * 32;
      const g = Math.round(data[i + 1] / 32) * 32;
      const b = Math.round(data[i + 2] / 32) * 32;
      const key = `${r},${g},${b}`;
      counts[key] = (counts[key] || 0) + 1;
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const hexes = sorted.map(([rgb]) => {
      const [r, g, b] = rgb.split(",").map(Number);
      return "#" + [r, g, b].map((v) => Math.min(255, v).toString(16).padStart(2, "0")).join("");
    });
    if (hexes[0]) { state.colors.primary = hexes[0]; document.querySelector('.color-row[data-color="primary"] input[type=color]').value = hexes[0]; document.querySelector('.color-row[data-color="primary"] .hex-input').value = hexes[0]; }
    if (hexes[1]) { state.colors.secondary = hexes[1]; document.querySelector('.color-row[data-color="secondary"] input[type=color]').value = hexes[1]; document.querySelector('.color-row[data-color="secondary"] .hex-input').value = hexes[1]; }
    if (hexes[2]) { state.colors.accent = hexes[2]; document.querySelector('.color-row[data-color="accent"] input[type=color]').value = hexes[2]; document.querySelector('.color-row[data-color="accent"] .hex-input').value = hexes[2]; }
  };
  img.src = state.logoDataUrl;
});

document.getElementById("toCopyBtn").addEventListener("click", () => {
  unlockStep("copy");
  markDone("identity");
  goToStep("copy");
});

// ============================================================
// 06 — COPY
// ============================================================
function setupSingleSelectChips(containerId, dataAttr, stateKey) {
  document.getElementById(containerId).addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    document.getElementById(containerId).querySelectorAll(".chip").forEach((c) => c.classList.remove("selected"));
    chip.classList.add("selected");
    state[stateKey] = chip.dataset[dataAttr];
  });
}
setupSingleSelectChips("toneChips", "tone", "tone");
setupSingleSelectChips("objectiveChips", "obj", "objective");

// Imagem: além de guardar a escolha, mostra a área de upload quando faz sentido
const contentImageInput = document.getElementById("contentImageInput");
const contentImageUploadBox = document.getElementById("contentImageUploadBox");
const contentImagePreview = document.getElementById("contentImagePreview");
const contentImageUploadText = document.getElementById("contentImageUploadText");
const imageChoiceNote = document.getElementById("imageChoiceNote");
state.contentImageDataUrl = null;

document.getElementById("imageChips").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  document.getElementById("imageChips").querySelectorAll(".chip").forEach((c) => c.classList.remove("selected"));
  chip.classList.add("selected");
  state.imageChoice = chip.dataset.img;

  const needsUpload = state.imageChoice === "Upload" || state.imageChoice === "Foto minha";
  contentImageUploadBox.hidden = !needsUpload;

  if (state.imageChoice === "Banco de imagens") {
    imageChoiceNote.textContent = "Banco de imagens ainda não está conectado nesta versão — por enquanto, use 'Upload de imagem'.";
  } else if (state.imageChoice === "Gerar com IA") {
    imageChoiceNote.textContent = "Geração de imagem por IA ainda não está conectada nesta versão — por enquanto, use 'Upload de imagem'.";
  } else {
    imageChoiceNote.textContent = "";
  }
});

contentImageUploadBox.addEventListener("click", () => contentImageInput.click());
contentImageInput.addEventListener("change", () => {
  const file = contentImageInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    state.contentImageDataUrl = reader.result;
    contentImagePreview.src = reader.result;
    contentImagePreview.hidden = false;
    contentImageUploadText.textContent = "Foto carregada — clique para trocar";
  };
  reader.readAsDataURL(file);
});

const hooksList = document.getElementById("hooksList");
const hooksStatus = document.getElementById("hooksStatus");
document.getElementById("genHooksBtn").addEventListener("click", async () => {
  if (!state.selectedTopic && state.selectedTopic !== 0) { hooksStatus.textContent = "Escolha um assunto na etapa de Tendências primeiro."; return; }
  hooksStatus.textContent = "Gerando ganchos…";
  hooksList.innerHTML = "";
  try {
    const topic = state.topics[state.selectedTopic].title;
    const data = await apiPost("/api/hooks", { niche: state.niche, topic });
    state.hooks = data.hooks || [];
    hooksStatus.textContent = "";
    renderHooks();
  } catch (err) {
    hooksStatus.textContent = "❌ " + err.message;
  }
});
function renderHooks() {
  hooksList.innerHTML = "";
  state.hooks.forEach((h) => {
    const opt = document.createElement("button");
    opt.className = "hook-option" + (state.selectedHook === h ? " selected" : "");
    opt.textContent = h;
    opt.addEventListener("click", () => { state.selectedHook = h; renderHooks(); });
    hooksList.appendChild(opt);
  });
}

const copyStatus = document.getElementById("copyStatus");
const copyResult = document.getElementById("copyResult");
document.getElementById("genCopyBtn").addEventListener("click", async () => {
  if ((state.selectedTopic === null) || !state.tone || !state.objective) {
    copyStatus.textContent = "Escolha um assunto (etapa Tendências), um tom e um objetivo antes de gerar.";
    return;
  }
  copyStatus.textContent = "Gerando conteúdo…";
  copyResult.hidden = true;
  try {
    const topic = state.topics[state.selectedTopic].title;
    const data = await apiPost("/api/copy", {
      niche: state.niche, description: state.description, topic,
      format: state.format, subformat: state.subformat, designPattern: state.pattern,
      tone: state.tone, objective: state.objective, hook: state.selectedHook, slideCount: 7,
    });
    state.result = data;
    state.currentSlide = 0;
    copyStatus.textContent = "";
    renderCopyResult();
    copyResult.hidden = false;
  } catch (err) {
    copyStatus.textContent = "❌ " + err.message;
  }
});

function renderCopyResult() {
  const r = state.result;
  document.getElementById("resTitle").value = r.title || "";
  document.getElementById("resCaption").value = r.caption || "";
  document.getElementById("resHashtags").value = (r.hashtags || []).join(" ");
  document.getElementById("resCta").value = r.cta || "";
  const slidesEl = document.getElementById("resSlides");
  slidesEl.innerHTML = "";
  (r.slides || []).forEach((s, i) => {
    const row = document.createElement("div");
    row.className = "slide-item";
    row.innerHTML = `<span class="slide-num">${String(i + 1).padStart(2, "0")}</span>
      <textarea class="textarea" rows="2" data-slide-idx="${i}">${s}</textarea>`;
    slidesEl.appendChild(row);
  });
}
// mantém edições manuais sincronizadas com o estado antes do preview
function syncResultFromInputs() {
  if (!state.result) return;
  state.result.title = document.getElementById("resTitle").value;
  state.result.caption = document.getElementById("resCaption").value;
  state.result.hashtags = document.getElementById("resHashtags").value.split(" ").filter(Boolean);
  state.result.cta = document.getElementById("resCta").value;
  state.result.slides = Array.from(document.querySelectorAll("[data-slide-idx]")).map((t) => t.value);
}

document.getElementById("toPreviewBtn").addEventListener("click", () => {
  syncResultFromInputs();
  unlockStep("preview");
  markDone("copy");
  state.currentSlide = 0;
  renderPreview();
  goToStep("preview");
});

// ============================================================
// 07 — PREVIEW (mockup do Instagram)
// ============================================================
let previewMode = "feed";
document.querySelectorAll(".toggle-btn[data-preview]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".toggle-btn[data-preview]").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    previewMode = btn.dataset.preview;
    renderPreview();
  });
});

function logoHtml() {
  if (!state.useLogo || !state.logoDataUrl) return "";
  const posStyles = {
    "canto-superior": "top:14px;left:14px;width:34px;",
    "canto-inferior": "bottom:14px;left:14px;width:34px;",
    "central": "top:50%;left:50%;transform:translate(-50%,-50%);width:60px;",
    "discreta": "bottom:14px;right:14px;width:22px;opacity:.7;",
    "grande": "top:14px;left:14px;width:80px;",
  };
  return `<img src="${state.logoDataUrl}" style="position:absolute;${posStyles[state.logoPosition] || posStyles["canto-superior"]}z-index:5;border-radius:6px;" />`;
}

function renderPreview() {
  const mockup = document.getElementById("phoneMockup");
  const r = state.result || {};
  const slides = r.slides && r.slides.length ? r.slides : [r.title || "Seu conteúdo aqui"];
  const c = state.colors;

  const hasPhoto = !!state.contentImageDataUrl;
  const canvasStyle = hasPhoto
    ? `background:linear-gradient(180deg, rgba(0,0,0,.15) 0%, rgba(0,0,0,.65) 100%), url('${state.contentImageDataUrl}'); background-size:cover; background-position:center; color:white;`
    : `background:linear-gradient(135deg, ${c.secondary} 0%, ${c.primary} 120%); color:white;`;

  if (previewMode === "feed") {
    mockup.innerHTML = `
      <div class="ig-header">
        <div class="ig-avatar"></div>
        <span class="ig-username">${state.niche ? state.niche.toLowerCase().replace(/\s+/g, "") : "seuperfil"}</span>
      </div>
      <div class="ig-canvas" style="${canvasStyle}">
        ${logoHtml()}
        <div style="font-family:var(--display);font-size:19px;font-weight:600;line-height:1.3;position:relative;z-index:2;">
          ${slides[state.currentSlide] || ""}
        </div>
        ${slides.length > 1 ? `<button class="slide-nav prev"></button><button class="slide-nav next"></button>` : ""}
      </div>
      ${slides.length > 1 ? `<div class="slide-dots">${slides.map((_, i) => `<span class="dot ${i === state.currentSlide ? "active" : ""}"></span>`).join("")}</div>` : ""}
      <div class="ig-actions">❤️ 💬 📤 <span style="margin-left:auto">🔖</span></div>
      <div class="ig-caption"><b>${state.niche ? state.niche.toLowerCase().replace(/\s+/g, "") : "seuperfil"}</b> ${r.caption || ""} ${r.cta ? `<br><br><i>${r.cta}</i>` : ""} <br><span style="color:#3897f0">${(r.hashtags || []).join(" ")}</span></div>
    `;
  } else {
    mockup.innerHTML = `
      <div class="ig-canvas story" style="${canvasStyle}">
        ${logoHtml()}
        <div style="font-family:var(--display);font-size:22px;font-weight:600;line-height:1.3;position:relative;z-index:2;">
          ${slides[state.currentSlide] || ""}
        </div>
        ${r.cta ? `<div style="margin-top:16px;padding:10px 16px;background:white;color:${c.secondary};border-radius:20px;font-size:13px;font-weight:600;align-self:flex-start;position:relative;z-index:2;">${r.cta}</div>` : ""}
        ${slides.length > 1 ? `<button class="slide-nav prev"></button><button class="slide-nav next"></button>` : ""}
      </div>
      ${slides.length > 1 ? `<div class="slide-dots">${slides.map((_, i) => `<span class="dot ${i === state.currentSlide ? "active" : ""}"></span>`).join("")}</div>` : ""}
    `;
  }

  const prevBtn = mockup.querySelector(".slide-nav.prev");
  const nextBtn = mockup.querySelector(".slide-nav.next");
  if (prevBtn) prevBtn.addEventListener("click", () => { state.currentSlide = Math.max(0, state.currentSlide - 1); renderPreview(); });
  if (nextBtn) nextBtn.addEventListener("click", () => { state.currentSlide = Math.min(slides.length - 1, state.currentSlide + 1); renderPreview(); });

  document.getElementById("downloadAllBtn").hidden = slides.length <= 1;
}

// ============================================================
// EXPORTAR IMAGEM FINAL (PNG) — desenhado num <canvas>, pronto para postar
// ============================================================
function wrapCanvasLines(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    const test = current ? current + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function drawSlideToCanvas(slideIndex, mode) {
  const isStory = mode === "story";
  const W = 1080;
  const H = isStory ? 1920 : 1080;
  const scale = W / 320; // mesma proporção usada no mockup em tela

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  const r = state.result || {};
  const slides = r.slides && r.slides.length ? r.slides : [r.title || ""];
  const text = slides[slideIndex] || "";
  const c = state.colors;

  // fundo
  if (state.contentImageDataUrl) {
    try {
      const bg = await loadImage(state.contentImageDataUrl);
      const imgRatio = bg.width / bg.height;
      const canvasRatio = W / H;
      let drawW, drawH, dx, dy;
      if (imgRatio > canvasRatio) {
        drawH = H; drawW = H * imgRatio; dx = (W - drawW) / 2; dy = 0;
      } else {
        drawW = W; drawH = W / imgRatio; dx = 0; dy = (H - drawH) / 2;
      }
      ctx.drawImage(bg, dx, dy, drawW, drawH);
    } catch { /* segue sem foto se falhar */ }
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "rgba(0,0,0,0.15)");
    grad.addColorStop(1, "rgba(0,0,0,0.65)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  } else {
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, c.secondary);
    grad.addColorStop(1, c.primary);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // texto principal (mesma fonte de destaque usada na interface)
  await document.fonts.load(`600 ${Math.round(19 * scale)}px "Fraunces"`);
  await document.fonts.ready;
  const fontSize = Math.round((isStory ? 22 : 19) * scale);
  ctx.font = `600 ${fontSize}px "Fraunces", serif`;
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";

  const paddingX = Math.round(24 * scale);
  const maxTextWidth = W - paddingX * 2;
  const lines = wrapCanvasLines(ctx, text, maxTextWidth);
  const lineHeight = fontSize * 1.3;
  const blockHeight = lines.length * lineHeight;
  let startY = (H - blockHeight) / 2 + lineHeight / 2;

  lines.forEach((line, i) => {
    ctx.fillText(line, paddingX, startY + i * lineHeight);
  });

  // CTA (só no formato story, como na tela)
  if (isStory && r.cta) {
    const ctaFontSize = Math.round(13 * scale);
    ctx.font = `600 ${ctaFontSize}px "Space Grotesk", sans-serif`;
    const ctaPaddingX = Math.round(16 * scale);
    const ctaPaddingY = Math.round(10 * scale);
    const ctaTextWidth = ctx.measureText(r.cta).width;
    const ctaBoxW = ctaTextWidth + ctaPaddingX * 2;
    const ctaBoxH = ctaFontSize + ctaPaddingY * 2;
    const ctaY = startY + lines.length * lineHeight + Math.round(16 * scale);
    ctx.fillStyle = "#ffffff";
    const radius = ctaBoxH / 2;
    ctx.beginPath();
    ctx.moveTo(paddingX + radius, ctaY);
    ctx.arcTo(paddingX + ctaBoxW, ctaY, paddingX + ctaBoxW, ctaY + ctaBoxH, radius);
    ctx.arcTo(paddingX + ctaBoxW, ctaY + ctaBoxH, paddingX, ctaY + ctaBoxH, radius);
    ctx.arcTo(paddingX, ctaY + ctaBoxH, paddingX, ctaY, radius);
    ctx.arcTo(paddingX, ctaY, paddingX + ctaBoxW, ctaY, radius);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = c.secondary;
    ctx.textBaseline = "middle";
    ctx.fillText(r.cta, paddingX + ctaPaddingX, ctaY + ctaBoxH / 2);
  }

  // logo
  if (state.useLogo && state.logoDataUrl) {
    try {
      const logo = await loadImage(state.logoDataUrl);
      const sizes = {
        "canto-superior": 0.11, "canto-inferior": 0.11, "central": 0.19,
        "discreta": 0.07, "grande": 0.25,
      };
      const logoW = W * (sizes[state.logoPosition] || 0.11);
      const logoH = logoW * (logo.height / logo.width);
      const margin = Math.round(14 * scale);
      let lx, ly;
      if (state.logoPosition === "canto-superior") { lx = margin; ly = margin; }
      else if (state.logoPosition === "canto-inferior") { lx = margin; ly = H - logoH - margin; }
      else if (state.logoPosition === "central") { lx = (W - logoW) / 2; ly = (H - logoH) / 2; }
      else if (state.logoPosition === "discreta") { lx = W - logoW - margin; ly = H - logoH - margin; ctx.globalAlpha = 0.7; }
      else { lx = margin; ly = margin; } // grande
      ctx.drawImage(logo, lx, ly, logoW, logoH);
      ctx.globalAlpha = 1;
    } catch { /* segue sem logo se falhar */ }
  }

  return canvas;
}

function downloadCanvas(canvas, filename) {
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, "image/png");
}

const downloadStatus = document.getElementById("downloadStatus");

document.getElementById("downloadSlideBtn").addEventListener("click", async () => {
  downloadStatus.textContent = "Gerando imagem…";
  try {
    const canvas = await drawSlideToCanvas(state.currentSlide, previewMode);
    downloadCanvas(canvas, `post-slide-${state.currentSlide + 1}.png`);
    downloadStatus.textContent = "";
  } catch (err) {
    downloadStatus.textContent = "❌ Não foi possível gerar a imagem: " + err.message;
  }
});

document.getElementById("downloadAllBtn").addEventListener("click", async () => {
  const r = state.result || {};
  const slides = r.slides && r.slides.length ? r.slides : [r.title || ""];
  downloadStatus.textContent = `Gerando ${slides.length} imagens…`;
  try {
    for (let i = 0; i < slides.length; i++) {
      const canvas = await drawSlideToCanvas(i, previewMode);
      downloadCanvas(canvas, `post-slide-${i + 1}.png`);
      await new Promise((res) => setTimeout(res, 400)); // evita o navegador bloquear downloads em sequência
    }
    downloadStatus.textContent = "Pronto! Confira sua pasta de downloads.";
  } catch (err) {
    downloadStatus.textContent = "❌ Não foi possível gerar as imagens: " + err.message;
  }
});

document.getElementById("copyCaptionBtn").addEventListener("click", async () => {
  const r = state.result || {};
  const fullText = [r.caption, r.cta, (r.hashtags || []).join(" ")].filter(Boolean).join("\n\n");
  try {
    await navigator.clipboard.writeText(fullText);
    downloadStatus.textContent = "Legenda copiada! Já pode colar no Instagram.";
  } catch {
    downloadStatus.textContent = "Não foi possível copiar automaticamente — selecione o texto na etapa Copy manualmente.";
  }
});

// ============================================================
// 08 — BIBLIOTECA (localStorage)
// ============================================================
function loadLibrary() { return JSON.parse(localStorage.getItem("ec_library") || "[]"); }
function saveLibrary(items) { localStorage.setItem("ec_library", JSON.stringify(items)); }

document.getElementById("saveDraftBtn").addEventListener("click", () => {
  syncResultFromInputs();
  const items = loadLibrary();
  items.unshift({
    id: Date.now(),
    title: state.result?.title || (state.topics[state.selectedTopic]?.title) || "Sem título",
    niche: state.niche,
    status: "Rascunho",
    createdAt: new Date().toLocaleDateString("pt-BR"),
    snapshot: JSON.parse(JSON.stringify(state)),
  });
  saveLibrary(items);
  unlockStep("library");
  markDone("preview");
  renderLibrary();
  goToStep("library");
});

let currentLibTab = "Rascunho";
document.querySelectorAll(".lib-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".lib-tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    currentLibTab = tab.dataset.status;
    renderLibrary();
  });
});
document.getElementById("librarySearch").addEventListener("input", renderLibrary);

function renderLibrary() {
  const list = document.getElementById("libraryList");
  const search = document.getElementById("librarySearch").value.toLowerCase();
  const items = loadLibrary().filter((it) => it.status === currentLibTab && it.title.toLowerCase().includes(search));
  list.innerHTML = "";
  if (!items.length) {
    list.innerHTML = `<div class="library-empty">Nada por aqui ainda.</div>`;
    return;
  }
  items.forEach((it) => {
    const row = document.createElement("div");
    row.className = "library-item";
    row.innerHTML = `
      <div>
        <div class="library-item-title">${it.title}</div>
        <div class="library-item-meta">${it.niche} · ${it.createdAt}</div>
      </div>
      <div style="display:flex;gap:6px;">
        <select class="select-input" style="width:auto;" data-id="${it.id}">
          <option ${it.status === "Rascunho" ? "selected" : ""}>Rascunho</option>
          <option ${it.status === "Aprovado" ? "selected" : ""}>Aprovado</option>
          <option ${it.status === "Publicado" ? "selected" : ""}>Publicado</option>
          <option ${it.status === "Arquivado" ? "selected" : ""}>Arquivado</option>
        </select>
      </div>
    `;
    row.querySelector("select").addEventListener("change", (e) => {
      const items2 = loadLibrary();
      const target = items2.find((x) => x.id === it.id);
      target.status = e.target.value;
      saveLibrary(items2);
      renderLibrary();
    });
    list.appendChild(row);
  });
}
renderLibrary();

// carrega URL do backend salva, se houver, e avisa se ainda não configurada
if (!getBackendUrl()) {
  trendsStatus.textContent = "Configure a URL do backend (ícone ⚙ no topo) para poder buscar tendências.";
}
