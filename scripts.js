// ==============================================
// Vitals Tracker + Dementia Care  — IndexedDB (Dexie) version
// Single-table design: patients
// Includes one-time migration from localStorage -> IndexedDB
// ==============================================

// Dexie DB init
const db = new Dexie("VitalsDementiaDB");
db.version(1).stores({
  patients: "dob,name,image,entries,cognitive,notes,reminders,faces,music",
});

// In-memory cache mirrors the DB so UI stays snappy
let patients = {};
let currentPatientID = "";

// ---------------------
// Helpers
// ---------------------
function download(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function safeGet(id) {
  return document.getElementById(id);
}

// ---------------------
// Migration (runs once)
// ---------------------
async function migrateFromLocalStorageIfNeeded() {
  try {
    // Only migrate if there is old data *and* user hasn't migrated before
    const already = localStorage.getItem("vitalsMigratedToIndexedDB");
    const oldRaw = localStorage.getItem("vitalsPatients");
    if (!already && oldRaw) {
      const parsed = JSON.parse(oldRaw);
      const arr = Object.values(parsed || {});
      await db.patients.clear();
      if (arr.length) {
        await db.patients.bulkAdd(arr);
      }
      localStorage.setItem("vitalsMigratedToIndexedDB", "true");
      localStorage.removeItem("vitalsPatients");
      alert("✅ Your data has been moved to secure offline storage.");
      console.log("✅ Migrated localStorage -> IndexedDB");
    }
  } catch (err) {
    console.warn("Migration skipped or failed:", err);
  }
}

// ---------------------
// Save / Load (IndexedDB)
// ---------------------
async function save() {
  try {
    await db.patients.clear();
    const arr = Object.values(patients);
    if (arr.length) {
      await db.patients.bulkAdd(arr);
    }
    // console.log("✅ Saved to IndexedDB");
  } catch (err) {
    console.error("Save error:", err);
  }
}

async function load() {
  try {
    const stored = await db.patients.toArray();
    patients = {};
    const select = safeGet("selectPatient");
    if (select) {
      select.innerHTML = '<option value="">-- Select a patient --</option>';
    }
    stored.forEach((p) => {
      patients[p.dob] = p;
      if (select) {
        const opt = document.createElement("option");
        opt.value = p.dob;
        opt.textContent = `${p.name} (${p.dob})`;
        select.appendChild(opt);
      }
    });
    // console.log("✅ Loaded from IndexedDB");
  } catch (err) {
    console.error("Load error:", err);
  }
}

// ---------------------
// Patient Info Rendering
// ---------------------
function renderPatientInfo() {
  const infoBox = safeGet("patientInfoDisplay");
  const photo = safeGet("patientPhoto");
  const nameEl = safeGet("displayPatientName");
  const dobEl = safeGet("displayPatientDOB");

  if (!currentPatientID || !patients[currentPatientID]) {
    if (infoBox) infoBox.classList.add("d-none");
    return;
  }

  const p = patients[currentPatientID];
  if (infoBox) infoBox.classList.remove("d-none");
  if (nameEl) nameEl.textContent = p.name || "";
  if (dobEl) dobEl.textContent = p.dob || "";
  if (photo) {
    if (p.image) {
      photo.src = p.image;
      photo.classList.remove("d-none");
    } else {
      photo.classList.add("d-none");
    }
  }
}

// ---------------------
// Render All Sections
// ---------------------
function renderAll() {
  renderVitals();
  renderCognitive();
  renderReminders();
  renderFaces();
  renderNotes();
  renderMusic();
}

// ---------------------
// Vitals
// ---------------------
function renderVitals() {
  const tbody = safeGet("entriesTable");
  if (!tbody) return;
  tbody.innerHTML = "";
  if (!currentPatientID || !patients[currentPatientID]) return;

  const list = patients[currentPatientID].entries || [];
  list.forEach((entry, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td data-label="Time">${entry.time || ""}</td>
      <td data-label="Systolic">${entry.systolic || ""}</td>
      <td data-label="Diastolic">${entry.diastolic || ""}</td>
      <td data-label="SpO₂ %">${entry.spo2 || ""}</td>
      <td data-label="Pulse">${entry.pulse || ""}</td>
      <td data-label="Temperature (°C)">${entry.temperature || ""}</td>
      <td data-label="Action"><button class="btn btn-sm btn-danger">Delete</button></td>
    `;
    tr.querySelector("button").addEventListener("click", async () => {
      patients[currentPatientID].entries.splice(idx, 1);
      await save();
      renderVitals();
    });
    tbody.appendChild(tr);
  });
}

function bindVitalsForm() {
  const form = safeGet("vitalForm");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentPatientID || !patients[currentPatientID]) {
      alert("Please select a patient first.");
      return;
    }

    const time =
      safeGet("time")?.value || new Date().toISOString().slice(0, 16);
    const systolic = safeGet("systolic")?.value || "";
    const diastolic = safeGet("diastolic")?.value || "";
    const spo2 = safeGet("spo2")?.value || "";
    const pulse = safeGet("pulse")?.value || "";
    const temperature = safeGet("temperature")?.value || "";

    patients[currentPatientID].entries.push({
      time,
      systolic,
      diastolic,
      spo2,
      pulse,
      temperature,
    });

    await save();
    renderVitals();
    form.reset();
    if (safeGet("time"))
      safeGet("time").value = new Date().toISOString().slice(0, 16);
  });

  // Set default time on load
  if (safeGet("time"))
    safeGet("time").value = new Date().toISOString().slice(0, 16);
}

// ---------------------
// Cognitive Check-ins
// ---------------------
function renderCognitive() {
  const table = safeGet("cognitiveTable");
  if (!table) return;
  table.innerHTML = "";
  if (!currentPatientID || !patients[currentPatientID]) return;

  const entries = patients[currentPatientID].cognitive || [];

  entries.forEach((c, index) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td data-label="Date">${c.date || ""}</td>
      <td data-label="Mood">${c.mood || ""}</td>
      <td data-label="Memory">${c.memory || ""}</td>
      <td data-label="Notes">${c.notes || ""}</td>
      <td data-label="Action">
        <button class="btn btn-outline-danger btn-sm" data-index="${index}">
          Delete
        </button>
      </td>
    `;
    table.appendChild(tr);
  });

  // Add delete button event listeners
  table.querySelectorAll("button[data-index]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const idx = parseInt(e.target.dataset.index, 10);
      if (isNaN(idx)) return;

      patients[currentPatientID].cognitive.splice(idx, 1);
      await save();
      renderCognitive();
    });
  });
}

function bindCognitive() {
  const form = safeGet("cognitiveForm");
  const exportBtn = safeGet("exportCognitiveCSV");

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!currentPatientID || !patients[currentPatientID]) {
        alert("Please select a patient first.");
        return;
      }

      const mood = safeGet("mood")?.value || "";
      const memory = safeGet("memory")?.value || "";
      const notes = safeGet("notes")?.value || "";
      const date = new Date().toLocaleString();

      patients[currentPatientID].cognitive.push({ date, mood, memory, notes });
      await save();
      form.reset();
      renderCognitive();
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      if (!currentPatientID || !patients[currentPatientID]) {
        alert("Please select a patient first.");
        return;
      }
      const data = patients[currentPatientID].cognitive || [];
      let csv = "Date,Mood,Memory,Notes\n";
      data.forEach((c) => {
        const safeNotes = (c.notes || "").replaceAll('"', '""');
        csv += `"${c.date || ""}","${c.mood || ""}","${
          c.memory || ""
        }","${safeNotes}"\n`;
      });
      download(csv, "cognitive_logs.csv", "text/csv");
    });
  }
}

// ---------------------
// Reminders
// ---------------------
function renderReminders() {
  const listEl = safeGet("reminderList");
  if (!listEl) return;
  listEl.innerHTML = "";
  if (!currentPatientID || !patients[currentPatientID]) return;

  (patients[currentPatientID].reminders || []).forEach((r, idx) => {
    const li = document.createElement("li");
    li.className =
      "list-group-item d-flex justify-content-between align-items-center";
    li.innerHTML = `
      <span>${r}</span>
      <button class="btn btn-sm btn-danger" aria-label="Delete reminder"><i class="bi bi-trash"></i></button>
    `;
    li.querySelector("button").addEventListener("click", async () => {
      patients[currentPatientID].reminders.splice(idx, 1);
      await save();
      renderReminders();
    });
    listEl.appendChild(li);
  });
}

function bindReminders() {
  const addBtn = safeGet("addReminder");
  const text = safeGet("reminderText");
  if (addBtn && text) {
    addBtn.addEventListener("click", async () => {
      if (!currentPatientID || !patients[currentPatientID]) {
        alert("Please select a patient first.");
        return;
      }
      const val = (text.value || "").trim();
      if (!val) return;
      patients[currentPatientID].reminders.push(val);
      await save();
      text.value = "";
      renderReminders();
    });
  }
}

// ---------------------
// Caregiver Notes
// ---------------------
function renderNotes() {
  const table = safeGet("caregiverTable");
  if (!table) return;
  table.innerHTML = "";
  if (!currentPatientID || !patients[currentPatientID]) return;

  (patients[currentPatientID].notes || []).forEach((n, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td data-label="Date">${n.date || ""}</td>
      <td data-label="Note">${n.text || ""}</td>
      <td data-label="Action"><button class="btn btn-sm btn-danger">Delete</button></td>
    `;
    tr.querySelector("button").addEventListener("click", async () => {
      patients[currentPatientID].notes.splice(idx, 1);
      await save();
      renderNotes();
    });
    table.appendChild(tr);
  });
}

function bindNotes() {
  const saveBtn = safeGet("saveCaregiverNote");
  const area = safeGet("caregiverNotes");
  const exportBtn = safeGet("exportCaregiverCSV");

  if (saveBtn && area) {
    saveBtn.addEventListener("click", async () => {
      if (!currentPatientID || !patients[currentPatientID]) {
        alert("Please select a patient first.");
        return;
      }
      const text = (area.value || "").trim();
      if (!text) return;
      patients[currentPatientID].notes.push({
        date: new Date().toLocaleString(),
        text,
      });
      await save();
      area.value = "";
      renderNotes();
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      if (!currentPatientID || !patients[currentPatientID]) {
        alert("Please select a patient first.");
        return;
      }
      const list = patients[currentPatientID].notes || [];
      let csv = "Date,Note\n";
      list.forEach((n) => {
        const safeText = (n.text || "").replaceAll('"', '""');
        csv += `"${n.date || ""}","${safeText}"\n`;
      });
      download(csv, "caregiver_notes.csv", "text/csv");
    });
  }
}

// ---------------------
// Familiar Faces
// ---------------------
function renderFaces() {
  const grid = safeGet("facesGrid");
  if (!grid) return;
  grid.innerHTML = "";
  if (!currentPatientID || !patients[currentPatientID]) return;

  (patients[currentPatientID].faces || []).forEach((f, idx) => {
    const card = document.createElement("div");
    card.className = "face-card";
    card.innerHTML = `
      <img src="${f.src}" alt="${f.name}">
      <div class="name">${f.name}</div>
      <button class="btn btn-sm btn-outline-danger mt-1">Delete</button>
    `;
    card.querySelector("button").addEventListener("click", async () => {
      patients[currentPatientID].faces.splice(idx, 1);
      await save();
      renderFaces();
    });
    grid.appendChild(card);
  });
}

function bindFaces() {
  const addBtn = safeGet("addFace");
  const nameEl = safeGet("faceName");
  const fileEl = safeGet("faceImage");
  if (addBtn && nameEl && fileEl) {
    addBtn.addEventListener("click", async () => {
      if (!currentPatientID || !patients[currentPatientID]) {
        alert("Please select a patient first.");
        return;
      }
      const name = (nameEl.value || "").trim();
      const file = fileEl.files?.[0];
      if (!name || !file) {
        alert("Please provide both a name and an image.");
        return;
      }
      const reader = new FileReader();
      reader.onload = async (ev) => {
        patients[currentPatientID].faces.push({ name, src: ev.target.result });
        await save();
        nameEl.value = "";
        fileEl.value = "";
        renderFaces();
      };
      reader.readAsDataURL(file);
    });
  }
}

// ---------------------
// Relaxing Music (single track)
// ---------------------
function renderMusic() {
  const player = safeGet("musicPlayer");
  if (!player) return;
  if (!currentPatientID || !patients[currentPatientID]) {
    player.removeAttribute("src");
    return;
  }
  const music = patients[currentPatientID].music || null;
  if (music && music.src) {
    player.src = music.src;
    player.title = music.name || "Relaxing audio";
  } else {
    player.removeAttribute("src");
  }
}

function bindMusic() {
  const fileEl = safeGet("musicFile");
  const delBtn = safeGet("deleteMusic");
  if (fileEl) {
    fileEl.addEventListener("change", async () => {
      if (!currentPatientID || !patients[currentPatientID]) {
        alert("Please select a patient first.");
        fileEl.value = "";
        return;
      }
      const file = fileEl.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        patients[currentPatientID].music = {
          src: ev.target.result,
          name: file.name,
        };
        await save();
        renderMusic();
        fileEl.value = "";
      };
      reader.readAsDataURL(file);
    });
  }
  if (delBtn) {
    delBtn.addEventListener("click", async () => {
      if (!currentPatientID || !patients[currentPatientID]) return;
      patients[currentPatientID].music = null;
      await save();
      renderMusic();
    });
  }
}

// ---------------------
// Patient CRUD / Exports / Backup
// ---------------------
function bindPatientsUI() {
  const form = safeGet("patientForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = (safeGet("patientName")?.value || "").trim();
      const dob = safeGet("dob")?.value || "";
      const fileInput = safeGet("patientImage");

      if (!name || !dob) {
        alert("Please provide name and date of birth.");
        return;
      }
      if (patients[dob]) {
        alert("Patient with this DOB already exists.");
        return;
      }

      const addPatient = async (imageData) => {
        patients[dob] = {
          name,
          dob,
          image: imageData || "",
          entries: [],
          cognitive: [],
          notes: [],
          reminders: [],
          faces: [],
          music: null,
        };
        await save();
        await load();
        form.reset();
        alert("✅ Patient added!");
      };

      if (fileInput && fileInput.files && fileInput.files.length > 0) {
        const reader = new FileReader();
        reader.onload = async (ev) => addPatient(ev.target.result);
        reader.readAsDataURL(fileInput.files[0]);
      } else {
        await addPatient("");
      }
    });
  }

  const select = safeGet("selectPatient");
  if (select) {
    select.addEventListener("change", () => {
      currentPatientID = select.value || "";
      renderPatientInfo();
      renderAll();
    });
  }

  const exportAll = safeGet("exportCSV");
  if (exportAll) {
    exportAll.addEventListener("click", () => {
      if (Object.keys(patients).length === 0)
        return alert("No data to export.");
      let csv =
        "Patient Name,DOB,Time,Systolic,Diastolic,SpO₂ %,Pulse,Temperature (°C)\n";
      for (const id in patients) {
        const p = patients[id];
        if (!p.entries || p.entries.length === 0) {
          csv += `"${p.name}","${p.dob}","","","","","",""\n`;
        } else {
          p.entries.forEach((e) => {
            csv += `"${p.name}","${p.dob}","${e.time || ""}","${
              e.systolic || ""
            }","${e.diastolic || ""}","${e.spo2 || ""}","${e.pulse || ""}","${
              e.temperature || ""
            }"\n`;
          });
        }
      }
      download(csv, "vital_signs_data.csv", "text/csv");
    });
  }

  const exportCurrent = safeGet("exportCurrentPatient");
  if (exportCurrent) {
    exportCurrent.addEventListener("click", () => {
      if (!currentPatientID || !patients[currentPatientID]) {
        alert("Please select a patient first.");
        return;
      }
      const p = patients[currentPatientID];
      let csv = "Time,Systolic,Diastolic,SpO₂ %,Pulse,Temperature (°C)\n";
      (p.entries || []).forEach((e) => {
        csv += `"${e.time || ""}","${e.systolic || ""}","${
          e.diastolic || ""
        }","${e.spo2 || ""}","${e.pulse || ""}","${e.temperature || ""}"\n`;
      });
      const safeName = (p.name || "patient").replace(/\s+/g, "_");
      download(csv, `${safeName}_vital_signs.csv`, "text/csv");
    });
  }

  const deleteBtn = safeGet("deletePatient");
  if (deleteBtn) {
    deleteBtn.addEventListener("click", async () => {
      if (!currentPatientID || !patients[currentPatientID]) {
        alert("Please select a patient first.");
        return;
      }
      if (!confirm("Delete current patient and all their data?")) return;
      delete patients[currentPatientID];
      await save();
      await load();
      currentPatientID = "";
      const sel = safeGet("selectPatient");
      if (sel) sel.value = "";
      renderPatientInfo();
      renderAll();
    });
  }

  const backupBtn = safeGet("backupData");
  if (backupBtn) {
    backupBtn.addEventListener("click", () => {
      if (Object.keys(patients).length === 0)
        return alert("No data to back up.");
      const blob = JSON.stringify(patients, null, 2);
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      download(blob, `vitals_backup_${ts}.json`, "application/json");
    });
  }
}

// ---------------------
// Accessibility Toggles
// ---------------------
function bindAccessibility() {
  const darkModeSwitch = safeGet("darkModeSwitch");
  const largeTextSwitch = safeGet("largeTextSwitch");
  const dysSwitch = safeGet("dyslexicFontSwitch");

  // Restore persisted prefs (optional; if you already do this elsewhere, keep it consistent)
  if (localStorage.getItem("vitalsDarkMode") === "true") {
    document.body.classList.add("dark-mode");
    if (darkModeSwitch) darkModeSwitch.checked = true;
  }
  if (localStorage.getItem("vitalsLargeText") === "true") {
    document.body.classList.add("large-text-mode");
    if (largeTextSwitch) largeTextSwitch.checked = true;
  }
  if (localStorage.getItem("vitalsDyslexicFont") === "true") {
    document.body.classList.add("dyslexic-font-mode");
    if (dysSwitch) dysSwitch.checked = true;
  }

  if (darkModeSwitch) {
    darkModeSwitch.addEventListener("change", () => {
      const on = !!darkModeSwitch.checked;
      document.body.classList.toggle("dark-mode", on);
      localStorage.setItem("vitalsDarkMode", on);
    });
  }

  if (largeTextSwitch) {
    largeTextSwitch.addEventListener("change", () => {
      const on = !!largeTextSwitch.checked;
      document.body.classList.toggle("large-text-mode", on);
      localStorage.setItem("vitalsLargeText", on);
    });
  }

  if (dysSwitch) {
    dysSwitch.addEventListener("change", () => {
      const on = !!dysSwitch.checked;
      document.body.classList.toggle("dyslexic-font-mode", on);
      localStorage.setItem("vitalsDyslexicFont", on);
    });
  }
}

// ---------------------
// Boot
// ---------------------
(async function boot() {
  // One-time migration
  await migrateFromLocalStorageIfNeeded();

  // Initial load
  await load();

  // Bind UI
  bindPatientsUI();
  bindVitalsForm();
  bindCognitive();
  bindReminders();
  bindNotes();
  bindFaces();
  bindMusic();
  bindAccessibility();

  // If a patient was previously selected (optional: persist selection), re-render
  renderPatientInfo();
  renderAll();
})();

// ==============================================

// Dyslexic-Friendly Font Toggle
const dyslexicSwitch = document.getElementById("dyslexicFontSwitch");
if (dyslexicSwitch) {
  dyslexicSwitch.addEventListener("change", function () {
    document.body.classList.toggle("dyslexic-font", this.checked);
    localStorage.setItem("dyslexicFont", this.checked);
  });
}

// Restore saved setting
window.addEventListener("DOMContentLoaded", () => {
  const dyslexicOn = localStorage.getItem("dyslexicFont") === "true";
  if (dyslexicOn) {
    document.body.classList.add("dyslexic-font");
    const switchElement = document.getElementById("dyslexicFontSwitch");
    if (switchElement) switchElement.checked = true;
  }
});
// End of scripts.js
