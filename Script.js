// script.js
// GDScript Translator + Kamus
// Made by ChatGPT | Idea from Akmal
//
// File ini lengkap: convert dua arah, auto-fix, real-time check, kamus modal,
// dan komentar bahasa Indonesia supaya mudah dipahami.

// =====================
// Utility kecil
// =====================

// Escape untuk regex
function escapeRegex(s){ return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

// Levenshtein untuk saran typo
function levenshtein(a,b){
  if(a===b) return 0;
  const al=a.length, bl=b.length;
  if(al===0) return bl; if(bl===0) return al;
  let v0=Array(bl+1).fill(0), v1=Array(bl+1).fill(0);
  for(let j=0;j<=bl;j++) v0[j]=j;
  for(let i=0;i<al;i++){
    v1[0]=i+1;
    for(let j=0;j<bl;j++){
      const cost = a[i]===b[j] ? 0 : 1;
      v1[j+1] = Math.min(v1[j]+1, v0[j+1]+1, v0[j]+cost);
    }
    [v0,v1] = [v1,v0];
  }
  return v0[bl];
}
function findClosest(word, list, maxDist=2){
  let best=null, bestd=Infinity;
  for(const w of list){ const d=levenshtein(word,w); if(d<bestd){ bestd=d; best=w; } }
  return bestd<=maxDist?best:null;
}

// Escape html sederhana untuk log
function escapeHtml(u){ return (u+"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

// =====================
// Data: mappings & kamus
// =====================

// MAPPINGS: Indo -> GDScript (phrase panjang dulu)
const MAPPINGS = [
  ["siap()", "_ready()"], ["siap", "_ready"],
  ["proses_fisika(delta)", "_physics_process(delta)"], ["proses(delta)", "_process(delta)"],
  ["Input.is_action_pressed", "Input.is_action_pressed"],
  ["Input.is_action_just_pressed", "Input.is_action_just_pressed"],
  ["OS.get_ticks_msec", "OS.get_ticks_msec"],

  ["fungsi", "func"],
  ["kelas_nama", "class_name"], ["kelas", "class_name"],
  ["extends", "extends"], ["ekstends", "extends"],
  ["ekspor", "export"], ["statis", "static"], ["alat", "tool"],
  ["tanda", "signal"], ["enum", "enum"],

  ["variabel", "var"], ["varibel", "var"],
  ["konstanta", "const"],

  ["jika tidak", "else"], ["lain jika", "elif"], ["jika", "if"],
  ["cocok", "match"], ["selama", "while"], ["untuk", "for"], ["dalam", "in"],
  ["berhenti", "break"], ["lanjut", "continue"], ["kosongkan", "pass"], ["kembalikan", "return"],

  ["benar", "true"], ["salah", "false"], ["kosong", "null"],
  ["dan", "and"], ["atau", "or"], ["tidak", "not"], ["adalah", "is"], ["bukan", "is not"],

  ["lebih besar sama dengan", ">="], ["lebih kecil sama dengan", "<="],
  ["lebih besar", ">"], ["lebih kecil", "<"], ["sama dengan", "=="], ["tidak sama dengan", "!="],

  ["cetak_debug", "print_debug"], ["cetak", "print"], ["peringatkan", "push_warning"], ["galat", "push_error"],

  ["dapatkan_node", "get_node"], ["tambah_anak", "add_child"], ["hapus_anak", "remove_child"],
  ["hapus", "queue_free"], ["panggil_tertunda", "call_deferred"], ["panggil", "call"],
  ["muat_scene", "load"], ["ganti_scene", "get_tree().change_scene"], ["muat_sementara", "preload"],

  ["masukan", "Input"], ["os", "OS"],

  ["tunggu", "yield"], ["tunggu_sampai", "await"],

  ["akar", "sqrt"], ["kuadrat", "pow"], ["min", "min"], ["max", "max"], ["batas", "clamp"],
  ["acakf", "randf"], ["acaki", "randi"], ["bulat", "round"], ["lantai", "floor"], ["langit", "ceil"],

  ["vektor2", "Vector2"], ["vektor3", "Vector3"], ["posisi", "position"],
  ["daftar", "Array"], ["kamus", "Dictionary"], ["tambah", "append"],

  ["sambung", "connect"], ["putus", "disconnect"],
  ["rpc", "rpc"], ["rpc_tidak_pasti", "rpc_unreliable"]
];

// Build reverse mapping (GDS -> Indo)
const GDS_TO_INDO = {};
for(const [indo, gd] of MAPPINGS){
  if(/^[A-Za-z_]/.test(gd) && !(gd in GDS_TO_INDO)){
    GDS_TO_INDO[gd] = indo;
  }
}

// Valid tokens untuk saran typo
const VALID_GDSCRIPT_WORDS = [
  "func","class_name","extends","export","static","tool","signal","enum","var","const",
  "if","elif","else","match","while","for","in","break","continue","pass","return",
  "true","false","null","and","or","not","is","as","assert","yield","await",
  "print","print_debug","push_warning","push_error","get_node","queue_free","call_deferred",
  "add_child","remove_child","get_tree","load","preload","Input","OS","Vector2","Vector3",
  "randf","randi","sqrt","pow","sin","cos","tan","min","max","clamp","Array","Dictionary"
];

// Kamus data untuk modal (lengkap + contoh + deskripsi singkat)
// Struktur: {indo, gd, deskripsi, contoh}
const DICTIONARY = [
  {indo:"fungsi", gd:"func", deskripsi:"Mendefinisikan fungsi (routine) dalam script.", contoh:"fungsi hitung():\n    kembalikan 1+1"},
  {indo:"siap()", gd:"_ready()", deskripsi:"Dipanggil saat node siap (setelah tree diinisialisasi).", contoh:"fungsi siap():\n    cetak(\"Siap!\")"},
  {indo:"proses(delta)", gd:"_process(delta)", deskripsi:"Dipanggil setiap frame, delta = waktu antar frame.", contoh:"fungsi proses(delta):\n    posisi.x += 10 * delta"},
  {indo:"variabel", gd:"var", deskripsi:"Deklarasi variabel lokal/kelas.", contoh:"variabel nyawa = 3"},
  {indo:"konstanta", gd:"const", deskripsi:"Nilai tetap yang tidak berubah.", contoh:"konstanta PI = 3.1415"},
  {indo:"jika", gd:"if", deskripsi:"Percabangan kondisi.", contoh:"jika nyawa <= 0:\n    cetak(\"Game Over\")"},
  {indo:"lain jika", gd:"elif", deskripsi:"Percabangan kedua jika kondisi sebelumnya false.", contoh:"jika skor > 100:\n    cetak(\"Hebat\")\nlain jika skor > 50:\n    cetak(\"Bagus\")"},
  {indo:"jika tidak", gd:"else", deskripsi:"Bagian fallback jika semua if/elif false.", contoh:"jika terdeteksi:\n    cetak(\"Ya\")\njika tidak:\n    cetak(\"Tidak\")"},
  {indo:"untuk", gd:"for", deskripsi:"Looping (perulangan).", contoh:"untuk i dalam range(5):\n    cetak(i)"},
  {indo:"selama", gd:"while", deskripsi:"Looping berulang selama kondisi true.", contoh:"selama hidup > 0:\n    hidup -= 1"},
  {indo:"cetak", gd:"print", deskripsi:"Menampilkan teks ke konsol/debug.", contoh:"cetak(\"Halo Dunia\")"},
  {indo:"dapatkan_node", gd:"get_node", deskripsi:"Mengambil child node berdasarkan path.", contoh:"d = dapatkan_node(\"/root/Node2D\")"},
  {indo:"hapus", gd:"queue_free", deskripsi:"Menghapus/mengantrian node untuk di-free.", contoh:"hapus()"},
  {indo:"tunggu", gd:"yield", deskripsi:"Menunda eksekusi sampai sinyal/timeout (Godot 3).", contoh:"tunggu(get_tree().create_timer(1.0), \"timeout\")"},
  {indo:"tunggu_sampai", gd:"await", deskripsi:"Menunggu promise/sinyal (lebih modern, Godot 4).", contoh:"await get_tree().create_timer(1.0).timeout"},
  {indo:"vektor2", gd:"Vector2", deskripsi:"Tipe data vektor 2D.", contoh:"pos = vektor2(10, 20)"},
  {indo:"daftar", gd:"Array", deskripsi:"Koleksi array dinamis.", contoh:"a = daftar([1,2,3])"},
  {indo:"kamus", gd:"Dictionary", deskripsi:"Koleksi pasangan key:value.", contoh:"d = kamus({\"nama\":\"Akmal\"})"},
  {indo:"cetak_debug", gd:"print_debug", deskripsi:"Menampilkan debug khusus.", contoh:"cetak_debug(\"debug\")"},
  {indo:"peringatkan", gd:"push_warning", deskripsi:"Tampilkan peringatan di console/editor.", contoh:"peringatkan(\"Perhatian\")"},
  {indo:"galat", gd:"push_error", deskripsi:"Tampilkan error di console/editor.", contoh:"galat(\"Error terjadi\")"},
  {indo:"sambung", gd:"connect", deskripsi:"Sambungkan sinyal node ke fungsi.", contoh:"button.sambung(\"pressed\", self, \"_on_pressed\")"},
  // Tambahkan entri lain sesuai kebutuhan...
];

// =====================
// Version tweaks
// =====================
const VERSION_ADJUST = {
  "universal": {},
  "3.x": { "await":"yield" },
  "4.x": { "yield":"await" }
};

// =====================
// Auto-fix & pengecekan
// =====================

function normalizeLineEndings(s){ return s.replace(/\r\n/g,"\n").replace(/\r/g,"\n"); }

function autoFixAndWarn(raw){
  const lines = normalizeLineEndings(raw).split("\n");
  const fixed = [];
  const warnings = [];

  for(let i=0;i<lines.length;i++){
    let line = lines[i];
    const trimmed = line.trim();
    if(trimmed===""){ fixed.push(line); continue; }

    const lowered = trimmed.toLowerCase();
    const headers = ["fungsi","jika","lain jika","jika tidak","selama","untuk","cocok"];
    let starts=null;
    for(const h of headers) if(lowered.startsWith(h)){ starts=h; break; }
    if(starts && !trimmed.endsWith(":")){
      fixed.push(line + ":");
      warnings.push(`Baris ${i+1}: menambahkan ':' pada header '${trimmed.split("(")[0]}'`);
      continue;
    }

    // Perbaikan typo kecil
    line = line.replace(/\bfuncsi\b/gi, "func").replace(/\bvaribel\b/gi,"variabel");
    line = line.replace(/\btru\b/gi,"true").replace(/\bfals\b/gi,"false");

    fixed.push(line);
  }

  // cek kurung balance simpel
  const text = fixed.join("\n");
  const stack = [];
  for(let idx=0; idx<text.length; idx++){
    const ch = text[idx];
    if(ch==="("||ch==="{"||ch==="[") stack.push({ch,idx});
    if(ch===")"||ch==="}"||ch==="]"){
      if(stack.length===0){ warnings.push(`Tutup kurung '${ch}' berlebih di posisi ${idx}`); break; }
      const top = stack.pop();
      const pairs = {'(':')','{':'}','[':']'};
      if(pairs[top.ch] !== ch) warnings.push(`Pasangan kurung tidak cocok di posisi ${idx}`);
    }
  }
  if(stack.length>0) warnings.push(`Kurung buka '${stack[stack.length-1].ch}' belum tertutup.`);

  return { fixedText: fixed.join("\n"), warnings };
}

// =====================
// Konversi utama
// =====================

function convertText(text, direction="id-to-gd", version="universal"){
  let out = text;
  // urutkan phrase panjang dulu
  const sorted = MAPPINGS.slice().sort((a,b)=>b[0].length - a[0].length);

  if(direction === "id-to-gd"){
    for(const [indo, gd] of sorted){
      const pattern = "(?<=^|\\s|\\(|:|\\.|,|\\[)"+escapeRegex(indo)+"(?=\\b|\\(|:|\\s|\\.|,|\\]|$)";
      try{
        const re = new RegExp(pattern, "gi");
        out = out.replace(re, gd);
      }catch(e){
        out = out.replace(new RegExp("\\b"+escapeRegex(indo)+"\\b","gi"), gd);
      }
    }
  } else {
    const gdKeys = Object.keys(GDS_TO_INDO).sort((a,b)=>b.length - a.length);
    for(const gd of gdKeys){
      const indo = GDS_TO_INDO[gd];
      const pattern = "(?<=^|\\s|\\(|:|\\.|,|\\[)"+escapeRegex(gd)+"(?=\\b|\\(|:|\\s|\\.|,|\\]|$)";
      try{
        const re = new RegExp(pattern, "g");
        out = out.replace(re, indo);
      }catch(e){
        out = out.replace(new RegExp("\\b"+escapeRegex(gd)+"\\b","g"), indo);
      }
    }
  }

  // versi adjustments
  const vmap = VERSION_ADJUST[version] || {};
  for(const [a,b] of Object.entries(vmap)) out = out.replace(new RegExp("\\b"+escapeRegex(a)+"\\b","g"), b);

  out = out.replace(/\t/g, "    ");
  return out;
}

// =====================
// Analisa typo & unknown
// =====================

function analyzeUnknowns(text){
  const tokens = text.match(/\b[A-Za-z_][A-Za-z0-9_]*\b/g) || [];
  const seen = new Set();
  const suggestions = [];

  for(const t of tokens){
    const lower = t;
    if(seen.has(lower)) continue;
    seen.add(lower);
    if(/^[0-9]/.test(lower) || /[a-z][A-Z]/.test(lower)) continue;
    if(VALID_GDSCRIPT_WORDS.includes(lower)) continue;
    if(MAPPINGS.some(m=> m[0].toLowerCase() === lower.toLowerCase())) continue;
    if(Object.keys(GDS_TO_INDO).includes(lower)) continue;
    const closest = findClosest(lower.toLowerCase(), VALID_GDSCRIPT_WORDS, 2);
    if(closest) suggestions.push({token:t, suggestion:closest});
  }
  return suggestions;
}

// =====================
// UI: render log, run pipeline
// =====================

function writeLog(html){
  const el = document.getElementById("logOutput");
  if(el) el.innerHTML = html;
}

function runConvertAndAnalyze(){
  const inputEl = document.getElementById("inputCode");
  const outputEl = document.getElementById("outputCode");
  const dir = document.getElementById("direction").value;
  const version = document.getElementById("version").value;
  const autoFix = document.getElementById("autofix").checked;

  const raw = inputEl ? inputEl.value : "";
  const { fixedText, warnings } = autoFixAndWarn(raw);
  let converted = convertText(fixedText, dir==="id-to-gd" ? "id-to-gd" : "gd-to-id", version);
  if(autoFix) converted = converted.replace(/\bfuncsi\b/gi,"func").replace(/\bvaribel\b/gi,"var");

  const suggestions = analyzeUnknowns(fixedText);

  const parts = [];
  if(warnings.length>0){
    parts.push("<strong>⚠️ Auto-fix / Peringatan:</strong><ul>");
    for(const w of warnings) parts.push(`<li>${escapeHtml(w)}</li>`);
    parts.push("</ul>");
  }
  if(suggestions.length>0){
    parts.push("<strong>🔍 Saran typo / kata mirip:</strong><ul>");
    for(const s of suggestions) parts.push(`<li><code>${escapeHtml(s.token)}</code> → mungkin maksud <code>${escapeHtml(s.suggestion)}</code></li>`);
    parts.push("</ul>");
  }
  if(parts.length===0) parts.push(`<span style="color:var(--ok)">✅ Tidak ada peringatan.</span>`);
  writeLog(parts.join("\n"));

  if(outputEl) outputEl.value = converted;
}

// =====================
// Copy helper & toast
// =====================

function copyOutputToClipboard(){
  const out = document.getElementById("outputCode");
  if(!out) return;
  out.select();
  try{
    document.execCommand("copy");
    showToast("Hasil disalin ke clipboard ✅");
  }catch(e){
    alert("Gagal menyalin otomatis — silakan copy manual.");
  }
}
function showToast(msg, time=1400){
  let t = document.getElementById("gd-toast");
  if(t) t.remove();
  t = document.createElement("div");
  t.id = "gd-toast";
  t.innerText = msg;
  Object.assign(t.style,{position:"fixed",right:"18px",bottom:"18px",padding:"10px 14px",background:"rgba(0,0,0,0.8)",color:"#fff",borderRadius:"8px",zIndex:9999});
  document.body.appendChild(t);
  setTimeout(()=>{ t.style.opacity=0; setTimeout(()=>t.remove(),300); }, time);
}

// =====================
// Kamus modal: render & search
// =====================

function openKamusModal(){
  const modal = document.getElementById("kamusModal");
  modal.setAttribute("aria-hidden","false");
  document.body.style.overflow = "hidden";
  renderKamusList(""); // render semua pada awal
  const search = document.getElementById("kamusSearch");
  if(search){ search.value = ""; search.focus(); }
}
function closeKamusModal(){
  const modal = document.getElementById("kamusModal");
  modal.setAttribute("aria-hidden","true");
  document.body.style.overflow = "";
}

function renderKamusList(filter){
  const listEl = document.getElementById("kamusList");
  if(!listEl) return;
  const q = (filter||"").trim().toLowerCase();
  const items = DICTIONARY.filter(it=>{
    if(!q) return true;
    return (it.indo + " " + it.gd + " " + it.deskripsi + " " + it.contoh).toLowerCase().includes(q);
  });

  if(items.length===0){
    listEl.innerHTML = `<div style="padding:12px;color:var(--muted)">Tidak ada hasil untuk "${escapeHtml(filter)}"</div>`;
    return;
  }

  const html = items.map(it=>{
    return `<div class="kamus-item">
      <h4>${escapeHtml(it.indo)} <small style="opacity:0.7">→ ${escapeHtml(it.gd)}</small></h4>
      <p>${escapeHtml(it.deskripsi)}</p>
      <div class="example">${escapeHtml(it.contoh)}</div>
    </div>`;
  }).join("");
  listEl.innerHTML = html;
}

// =====================
// Binding event & init
// =====================

function initBindings(){
  const input = document.getElementById("inputCode");
  const convertBtn = document.getElementById("convertBtn");
  const copyBtn = document.getElementById("copyBtn");
  const dir = document.getElementById("direction");
  const version = document.getElementById("version");
  const theme = document.getElementById("theme");
  const autofix = document.getElementById("autofix");
  const kamusBtn = document.getElementById("kamusBtn");
  const kamusClose = document.getElementById("kamusClose");
  const kamusSearch = document.getElementById("kamusSearch");
  const kamusModal = document.getElementById("kamusModal");

  // live convert debounce
  let timer=null;
  if(input) input.addEventListener("input", ()=>{ clearTimeout(timer); timer=setTimeout(runConvertAndAnalyze, 300); });

  if(convertBtn) convertBtn.addEventListener("click", runConvertAndAnalyze);
  if(copyBtn) copyBtn.addEventListener("click", copyOutputToClipboard);
  if(dir) dir.addEventListener("change", runConvertAndAnalyze);
  if(version) version.addEventListener("change", runConvertAndAnalyze);
  if(autofix) autofix.addEventListener("change", runConvertAndAnalyze);

  // theme control (simpan ke localStorage)
  if(theme){
    theme.addEventListener("change", (e)=>{
      const v = e.target.value;
      document.documentElement.setAttribute("data-theme", v);
      try{ localStorage.setItem("gd-theme", v); }catch(e){}
    });
    try{
      const saved = localStorage.getItem("gd-theme");
      if(saved){ theme.value = saved; document.documentElement.setAttribute("data-theme", saved); }
      else{ document.documentElement.setAttribute("data-theme", "dark"); }
    }catch(e){ document.documentElement.setAttribute("data-theme", "dark"); }
  }

  // kamus modal open/close, search
  if(kamusBtn) kamusBtn.addEventListener("click", openKamusModal);
  if(kamusClose) kamusClose.addEventListener("click", closeKamusModal);
  if(kamusSearch) kamusSearch.addEventListener("input", (e)=> renderKamusList(e.target.value));
  if(kamusModal) kamusModal.addEventListener("click", (ev)=>{ if(ev.target===kamusModal) closeKamusModal(); });

  // keyboard shortcuts
  document.addEventListener("keydown", (ev)=>{
    if((ev.ctrlKey||ev.metaKey) && ev.key === "Enter"){ ev.preventDefault(); runConvertAndAnalyze(); }
    if((ev.ctrlKey||ev.metaKey) && ev.shiftKey && (ev.key==="C"||ev.key==="c")){ ev.preventDefault(); copyOutputToClipboard(); }
    if(ev.key === "Escape"){
      const modal = document.getElementById("kamusModal");
      if(modal && modal.getAttribute("aria-hidden")==="false") closeKamusModal();
    }
  });

  // initial run
  setTimeout(runConvertAndAnalyze, 200);
}

// start
if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", initBindings);
else initBindings();

// expose untuk debug
window.GDTranslator = { convertText, runConvertAndAnalyze: runConvertAndAnalyze, MAPPINGS, DICTIONARY };
