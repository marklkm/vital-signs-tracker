let patients = {};
let currentPatientID = "";

const patientForm = document.getElementById("patientForm");
const selectPatient = document.getElementById("selectPatient");
const patientInfoDisplay = document.getElementById("patientInfoDisplay");
const displayPatientName = document.getElementById("displayPatientName");
const displayPatientDOB = document.getElementById("displayPatientDOB");
const patientPhoto = document.getElementById("patientPhoto");
const entriesTable = document.getElementById("entriesTable");
const vitalForm = document.getElementById("vitalForm");
const darkModeSwitch = document.getElementById("darkModeSwitch");

function savePatientsToStorage() {
  localStorage.setItem("vitalsData", JSON.stringify(patients));
}

function loadPatientsFromStorage() {
  const savedData = localStorage.getItem("vitalsData");
  if (savedData) {
    patients = JSON.parse(savedData);
    for (const id in patients) {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = `${patients[id].name} (${patients[id].dob})`;
      selectPatient.appendChild(option);
    }
  }
}

patientForm.addEventListener("submit", function (event) {
  event.preventDefault();
  const name = document.getElementById("patientName").value;
  const dob = document.getElementById("dob").value;
  const fileInput = document.getElementById("patientImage");

  if (patients[dob]) {
    alert("Patient with this DOB already exists!");
    return;
  }

  // Handle image upload as Base64
  if (fileInput.files.length > 0) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const imageBase64 = e.target.result;
      addPatient(name, dob, imageBase64);
    };
    reader.readAsDataURL(fileInput.files[0]);
  } else {
    addPatient(name, dob, "");
  }
});

function addPatient(name, dob, image) {
  patients[dob] = { name, dob, image, entries: [] };
  const option = document.createElement("option");
  option.value = dob;
  option.textContent = `${name} (${dob})`;
  selectPatient.appendChild(option);
  patientForm.reset();
  savePatientsToStorage();
}

selectPatient.addEventListener("change", function () {
  currentPatientID = this.value;
  if (!currentPatientID) {
    patientInfoDisplay.classList.add("d-none");
    entriesTable.innerHTML = "";
    return;
  }
  const patient = patients[currentPatientID];
  displayPatientName.textContent = patient.name;
  displayPatientDOB.textContent = patient.dob;
  if (patient.image) {
    patientPhoto.src = patient.image;
    patientPhoto.classList.remove("d-none");
  } else {
    patientPhoto.classList.add("d-none");
  }
  patientInfoDisplay.classList.remove("d-none");
  renderEntries();
});

vitalForm.addEventListener("submit", function (event) {
  event.preventDefault();
  if (!currentPatientID) {
    alert("Please select a patient first.");
    return;
  }
  const systolic = document.getElementById("systolic").value;
  const diastolic = document.getElementById("diastolic").value;
  const spo2 = document.getElementById("spo2").value;
  const pulse = document.getElementById("pulse").value;
  const temperature = document.getElementById("temperature").value;
  const timeInput = document.getElementById("time").value;

  const date = new Date(timeInput);
  const formattedTime = date.toLocaleString("en-GB", {
    dateStyle: "long",
    timeStyle: "short",
  });

  patients[currentPatientID].entries.push({
    time: formattedTime,
    systolic,
    diastolic,
    spo2,
    pulse,
    temperature,
  });

  vitalForm.reset();
  document.getElementById("time").value = new Date().toISOString().slice(0, 16);
  renderEntries();
  savePatientsToStorage();
});

function renderEntries() {
  entriesTable.innerHTML = "";
  if (!currentPatientID) return;
  patients[currentPatientID].entries.forEach((entry, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td data-label="Time">${entry.time}</td>
      <td data-label="Systolic">${entry.systolic}</td>
      <td data-label="Diastolic">${entry.diastolic}</td>
      <td data-label="SpO₂ %">${entry.spo2}</td>
      <td data-label="Pulse">${entry.pulse}</td>
      <td data-label="Temperature (°C)">${entry.temperature}</td>
      <td data-label="Action">
        <button class="btn btn-sm btn-danger" onclick="deleteEntry(${index})">
          Delete
        </button>
      </td>
    `;
    entriesTable.appendChild(row);
  });
}

document.getElementById("exportCSV").addEventListener("click", function () {
  if (Object.keys(patients).length === 0) {
    alert("No patient data to export.");
    return;
  }
  let csv =
    "Patient Name,DOB,Time,Systolic,Diastolic,SpO₂ %,Pulse,Temperature (°C)\n";
  for (const id in patients) {
    const patient = patients[id];
    if (patient.entries.length === 0) {
      csv += `"${patient.name}","${patient.dob}","","","","","",""\n`;
    } else {
      patient.entries.forEach((entry) => {
        csv += `"${patient.name}","${patient.dob}","${entry.time}","${entry.systolic}","${entry.diastolic}","${entry.spo2}","${entry.pulse}","${entry.temperature}"\n`;
      });
    }
  }
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "vital_signs_data.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
});

document
  .getElementById("exportCurrentPatient")
  .addEventListener("click", function () {
    if (!currentPatientID) {
      alert("Please select a patient first.");
      return;
    }
    const patient = patients[currentPatientID];
    let csv =
      "Patient Name,DOB,Time,Systolic,Diastolic,SpO₂ %,Pulse,Temperature (°C)\n";
    if (patient.entries.length === 0) {
      csv += `"${patient.name}","${patient.dob}","","","","","",""\n`;
    } else {
      patient.entries.forEach((entry) => {
        csv += `"${patient.name}","${patient.dob}","${entry.time}","${entry.systolic}","${entry.diastolic}","${entry.spo2}","${entry.pulse}","${entry.temperature}"\n`;
      });
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${patient.name.replace(/\s+/g, "_")}_vital_signs.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });

document.getElementById("deletePatient").addEventListener("click", function () {
  if (!currentPatientID) {
    alert("Please select a patient first.");
    return;
  }
  if (confirm("Are you sure you want to delete this patient?")) {
    delete patients[currentPatientID];
    savePatientsToStorage();
    selectPatient.querySelector(`option[value="${currentPatientID}"]`).remove();
    currentPatientID = "";
    patientInfoDisplay.classList.add("d-none");
    entriesTable.innerHTML = "";
    selectPatient.value = "";
  }
});

document.getElementById("backupData").addEventListener("click", function () {
  if (Object.keys(patients).length === 0) {
    alert("No data to back up.");
    return;
  }
  const blob = new Blob([JSON.stringify(patients, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  a.href = url;
  a.download = `vital_signs_backup_${timestamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
});

darkModeSwitch.addEventListener("change", function () {
  document.body.classList.toggle("dark-mode", this.checked);
});

document.getElementById("time").value = new Date().toISOString().slice(0, 16);
loadPatientsFromStorage();
