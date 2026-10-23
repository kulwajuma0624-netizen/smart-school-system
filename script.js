/* SmartSchool Management System
   Hifadhi: LocalStorage. Demo ya kujifunzia, si backend ya production. */
"use strict";

const KEYS = {
  students: "smartSchoolPro_students_v2",
  attendance: "smartSchoolPro_attendance_v2",
  results: "smartSchoolPro_results_v2"
};
const $ = id => document.getElementById(id);
const safeRead = key => {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : [];
  } catch (error) {
    console.warn("Imeshindikana kusoma data:", error);
    return [];
  }
};
let students = safeRead(KEYS.students);
let attendance = safeRead(KEYS.attendance);
let results = safeRead(KEYS.results);

const makeId = () => (window.crypto && crypto.randomUUID)
  ? crypto.randomUUID()
  : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
const todayISO = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
};
const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));
const initials = name => String(name || "?").trim().split(/\s+/).slice(0, 2).map(word => word[0] || "").join("").toUpperCase();

function persist() {
  try {
    localStorage.setItem(KEYS.students, JSON.stringify(students));
    localStorage.setItem(KEYS.attendance, JSON.stringify(attendance));
    localStorage.setItem(KEYS.results, JSON.stringify(results));
    return true;
  } catch (error) {
    console.error("Data haijahifadhiwa:", error);
    notify("Imeshindikana kuhifadhi data. Browser inaweza kuwa imejaa.");
    return false;
  }
}
function notify(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toast.classList.remove("show"), 2800);
}
function gradeFor(mark) {
  if (mark >= 80) return "A";
  if (mark >= 70) return "B";
  if (mark >= 60) return "C";
  if (mark >= 50) return "D";
  return "F";
}
function studentById(id) {
  return students.find(student => student.id === id);
}
function navigate(page) {
  document.querySelectorAll(".page").forEach(section => section.classList.toggle("active", section.id === `page-${page}`));
  document.querySelectorAll(".nav-link").forEach(button => button.classList.toggle("active", button.dataset.page === page));
  const labels = { dashboard: "Dashboard", students: "Wanafunzi", attendance: "Mahudhurio", results: "Matokeo", classes: "Madarasa", reports: "Ripoti" };
  $("breadcrumbCurrent").textContent = labels[page] || "Dashboard";
  $("sidebar").classList.remove("open");
  if (page === "attendance") renderAttendance();
  if (page === "results") fillResultStudentOptions();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
document.querySelectorAll("[data-page]").forEach(button => button.addEventListener("click", () => navigate(button.dataset.page)));
document.querySelectorAll("[data-open-page]").forEach(button => button.addEventListener("click", () => navigate(button.dataset.openPage)));
$("menuToggle").addEventListener("click", () => $("sidebar").classList.toggle("open"));
$("currentDate").textContent = new Date().toLocaleDateString("sw-TZ", { day: "numeric", month: "short", year: "numeric" });
$("year").textContent = new Date().getFullYear();
$("attendanceDate").value = todayISO();

/* Wanafunzi */
function showStudentForm(student = null) {
  $("studentForm").classList.remove("hidden");
  $("studentFormHeading").textContent = student ? "Hariri taarifa za mwanafunzi" : "Sajili mwanafunzi mpya";
  $("studentEditId").value = student?.id || "";
  $("studentName").value = student?.name || "";
  $("studentNumber").value = student?.number || "";
  $("studentClass").value = student?.className || "";
  $("studentGender").value = student?.gender || "";
  $("studentDob").value = student?.dob || "";
  $("studentGuardian").value = student?.guardian || "";
  $("studentForm").scrollIntoView({ behavior: "smooth", block: "center" });
  $("studentName").focus();
}
function hideStudentForm() {
  $("studentForm").reset();
  $("studentEditId").value = "";
  $("studentForm").classList.add("hidden");
}
$("showStudentForm").addEventListener("click", () => showStudentForm());
$("closeStudentForm").addEventListener("click", hideStudentForm);
$("cancelStudentForm").addEventListener("click", hideStudentForm);

$("studentForm").addEventListener("submit", event => {
  event.preventDefault();
  const editingId = $("studentEditId").value;
  const student = {
    id: editingId || makeId(),
    name: $("studentName").value.trim(),
    number: $("studentNumber").value.trim(),
    className: $("studentClass").value,
    gender: $("studentGender").value,
    dob: $("studentDob").value,
    guardian: $("studentGuardian").value.trim()
  };
  if (!student.name || !student.number || !student.className || !student.gender) {
    notify("Tafadhali jaza sehemu zote zenye alama ya *.");
    return;
  }
  const duplicateNumber = students.some(item =>
    item.number.toLocaleLowerCase() === student.number.toLocaleLowerCase() && item.id !== editingId
  );
  if (duplicateNumber) {
    notify("Namba ya mwanafunzi hiyo tayari imetumika.");
    $("studentNumber").focus();
    return;
  }
  if (editingId) {
    students = students.map(item => item.id === editingId ? student : item);
    notify("Taarifa za mwanafunzi zimehaririwa.");
  } else {
    students.unshift(student);
    notify("Mwanafunzi amesajiliwa kikamilifu.");
  }
  persist();
  hideStudentForm();
  renderAll();
});

function renderStudents() {
  const query = $("studentSearch").value.trim().toLocaleLowerCase();
  const filtered = students.filter(student =>
    [student.name, student.number, student.className, student.gender, student.guardian]
      .some(value => String(value || "").toLocaleLowerCase().includes(query))
  );
  $("studentCount").textContent = `Wanafunzi ${filtered.length} kati ya ${students.length}`;
  $("navStudentCount").textContent = students.length;
  $("studentsTable").innerHTML = filtered.map(student => `
    <tr>
      <td><div class="student-cell"><span class="student-avatar">${escapeHTML(initials(student.name))}</span><span><span class="student-name">${escapeHTML(student.name)}</span><span class="subtext">${escapeHTML(student.dob || "Tarehe haijawekwa")}</span></span></div></td>
      <td>${escapeHTML(student.number)}</td>
      <td><span class="class-badge">${escapeHTML(student.className)}</span></td>
      <td>${escapeHTML(student.gender)}</td>
      <td>${escapeHTML(student.guardian || "—")}</td>
      <td><div class="row-actions"><button class="mini-btn" data-edit-student="${escapeHTML(student.id)}">Hariri</button><button class="mini-btn delete" data-remove-student="${escapeHTML(student.id)}">Futa</button></div></td>
    </tr>`).join("");
  $("studentsEmpty").classList.toggle("hidden", filtered.length > 0);
  document.querySelectorAll("[data-edit-student]").forEach(button => button.addEventListener("click", () => {
    const student = studentById(button.dataset.editStudent);
    if (student) showStudentForm(student);
  }));
  document.querySelectorAll("[data-remove-student]").forEach(button => button.addEventListener("click", () => {
    const student = studentById(button.dataset.removeStudent);
    if (!student || !confirm(`Una uhakika unataka kufuta taarifa za ${student.name}? Rekodi zake za mahudhurio na matokeo pia zitafutwa.`)) return;
    students = students.filter(item => item.id !== student.id);
    attendance = attendance.filter(item => item.studentId !== student.id);
    results = results.filter(item => item.studentId !== student.id);
    persist();
    renderAll();
    notify("Mwanafunzi na rekodi zake zimefutwa.");
  }));
}
$("studentSearch").addEventListener("input", renderStudents);

/* Mahudhurio */
function renderAttendance() {
  const date = $("attendanceDate").value || todayISO();
  $("attendanceTable").innerHTML = students.map(student => {
    const record = attendance.find(item => item.studentId === student.id && item.date === date);
    const status = record?.status || "Present";
    return `<tr>
      <td><div class="student-cell"><span class="student-avatar">${escapeHTML(initials(student.name))}</span><span><span class="student-name">${escapeHTML(student.name)}</span><span class="subtext">${escapeHTML(student.number)}</span></span></div></td>
      <td>${escapeHTML(student.className)}</td>
      <td><select class="status-select" data-attendance-id="${escapeHTML(student.id)}" aria-label="Mahudhurio ya ${escapeHTML(student.name)}">
        <option value="Present" ${status === "Present" ? "selected" : ""}>Amekuja</option>
        <option value="Absent" ${status === "Absent" ? "selected" : ""}>Hajaja</option>
        <option value="Late" ${status === "Late" ? "selected" : ""}>Amechelewa</option>
        <option value="Excused" ${status === "Excused" ? "selected" : ""}>Ana ruhusa</option>
      </select></td>
    </tr>`;
  }).join("");
  $("attendanceEmpty").classList.toggle("hidden", students.length > 0);
}
$("attendanceDate").addEventListener("change", renderAttendance);
$("saveAttendance").addEventListener("click", () => {
  if (!students.length) {
    notify("Sajili wanafunzi kwanza kabla ya kurekodi mahudhurio.");
    return;
  }
  const date = $("attendanceDate").value || todayISO();
  document.querySelectorAll("[data-attendance-id]").forEach(select => {
    const studentId = select.dataset.attendanceId;
    const existing = attendance.find(item => item.studentId === studentId && item.date === date);
    if (existing) existing.status = select.value;
    else attendance.push({ id: makeId(), studentId, date, status: select.value });
  });
  persist();
  renderAll();
  notify("Mahudhurio yamehifadhiwa.");
});

/* Matokeo */
function fillResultStudentOptions() {
  const previous = $("resultStudent").value;
  $("resultStudent").innerHTML = `<option value="">Chagua mwanafunzi</option>` +
    students.map(student => `<option value="${escapeHTML(student.id)}">${escapeHTML(student.name)} — ${escapeHTML(student.number)}</option>`).join("");
  if (students.some(student => student.id === previous)) $("resultStudent").value = previous;
}
$("resultForm").addEventListener("submit", event => {
  event.preventDefault();
  const studentId = $("resultStudent").value;
  const subject = $("resultSubject").value.trim();
  const exam = $("resultExam").value;
  const marks = Number($("resultMarks").value);
  if (!studentId || !subject || !exam || !Number.isFinite(marks) || marks < 0 || marks > 100) {
    notify("Kagua taarifa zote. Alama lazima ziwe kati ya 0 na 100.");
    return;
  }
  results.unshift({ id: makeId(), studentId, subject, exam, marks, date: todayISO() });
  persist();
  $("resultForm").reset();
  renderAll();
  notify("Matokeo yamehifadhiwa.");
});
$("resultSearch").addEventListener("input", renderResults);
function renderResults() {
  const query = $("resultSearch").value.trim().toLocaleLowerCase();
  const filtered = results.filter(result => {
    const student = studentById(result.studentId);
    return [student?.name, result.subject, result.exam, String(result.marks), gradeFor(result.marks)]
      .some(value => String(value || "").toLocaleLowerCase().includes(query));
  });
  $("resultsTable").innerHTML = filtered.map(result => {
    const student = studentById(result.studentId);
    return `<tr>
      <td>${escapeHTML(student?.name || "Mwanafunzi asiye kwenye orodha")}</td>
      <td>${escapeHTML(result.subject)}</td><td>${escapeHTML(result.exam)}</td>
      <td><strong>${result.marks}%</strong></td><td><span class="class-badge">${gradeFor(result.marks)}</span></td>
      <td><button class="mini-btn delete" data-remove-result="${escapeHTML(result.id)}">Futa</button></td>
    </tr>`;
  }).join("");
  $("resultsEmpty").classList.toggle("hidden", filtered.length > 0);
  document.querySelectorAll("[data-remove-result]").forEach(button => button.addEventListener("click", () => {
    if (!confirm("Una uhakika unataka kufuta matokeo haya?")) return;
    results = results.filter(result => result.id !== button.dataset.removeResult);
    persist();
    renderAll();
    notify("Matokeo yamefutwa.");
  }));
}

/* Dashboard, madarasa na ripoti */
function renderDashboard() {
  $("totalStudents").textContent = students.length;
  $("totalResults").textContent = results.length;
  const classNames = [...new Set(students.map(student => student.className))];
  $("totalClasses").textContent = classNames.length;
  const recordsToday = attendance.filter(record => record.date === todayISO());
  const presentToday = recordsToday.filter(record => ["Present", "Late"].includes(record.status)).length;
  $("todayAttendance").textContent = students.length ? `${Math.round(presentToday / students.length * 100)}%` : "0%";
  const recent = students.slice(0, 5);
  $("recentStudents").innerHTML = recent.map(student => `
    <tr><td><div class="student-cell"><span class="student-avatar">${escapeHTML(initials(student.name))}</span><span class="student-name">${escapeHTML(student.name)}</span></div></td>
    <td>${escapeHTML(student.number)}</td><td><span class="class-badge">${escapeHTML(student.className)}</span></td><td>${escapeHTML(student.gender)}</td></tr>`).join("");
  $("recentStudentsEmpty").classList.toggle("hidden", recent.length > 0);
}
function renderClasses() {
  const counts = {};
  students.forEach(student => { counts[student.className] = (counts[student.className] || 0) + 1; });
  const names = Object.keys(counts).sort((a, b) => a.localeCompare(b));
  const icons = ["▣", "◇", "▦", "⌂"];
  $("classGrid").innerHTML = names.map((name, index) => `
    <article class="class-card"><div class="class-icon">${icons[index % icons.length]}</div><h3>${escapeHTML(name)}</h3><p>Wanafunzi waliosajiliwa</p><strong>${counts[name]}</strong></article>`).join("");
  $("classesEmpty").classList.toggle("hidden", names.length > 0);
}
function renderReports() {
  $("reportStudents").textContent = students.length;
  $("reportMale").textContent = students.filter(student => student.gender === "Mwanaume").length;
  $("reportFemale").textContent = students.filter(student => student.gender === "Mwanamke").length;
  $("reportResults").textContent = results.length;
  const counts = {};
  students.forEach(student => { counts[student.className] = (counts[student.className] || 0) + 1; });
  const names = Object.keys(counts).sort((a, b) => a.localeCompare(b));
  const maxCount = Math.max(1, ...Object.values(counts));
  $("classReport").innerHTML = names.length ? names.map(name => `
    <div class="bar-item"><span>${escapeHTML(name)}</span><div class="bar-track"><div class="bar-fill" style="width:${counts[name] / maxCount * 100}%"></div></div><span class="bar-count">${counts[name]}</span></div>`).join("") : `<p class="subtext">Hakuna taarifa za kuonyesha bado.</p>`;
}
function renderAll() {
  renderStudents();
  renderDashboard();
  renderAttendance();
  fillResultStudentOptions();
  renderResults();
  renderClasses();
  renderReports();
}

/* Ripoti, backup na reset */
$("printReport").addEventListener("click", () => window.print());
$("exportData").addEventListener("click", () => {
  const backup = { exportedAt: new Date().toISOString(), students, attendance, results };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `smart-school-backup-${todayISO()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  notify("Nakala ya data imepakuliwa.");
});
$("clearData").addEventListener("click", () => {
  if (!confirm("Hii itafuta wanafunzi, mahudhurio na matokeo yote kwenye browser hii. Hakikisha umepakua backup kwanza. Una uhakika?")) return;
  students = [];
  attendance = [];
  results = [];
  persist();
  renderAll();
  notify("Data zote zimefutwa kwenye browser hii.");
});

renderAll();

/* Login ya demo kwa aina tatu za watumiaji. LocalStorage si uthibitisho salama wa production. */
const DEMO_USERS = {
  admin: { username: "admin", password: "Admin@123", name: "Administrator", title: "Admin", initials: "AD" },
  headmaster: { username: "mkuu", password: "Mkuu@123", name: "Mwalimu Mkuu", title: "Mwalimu Mkuu", initials: "MM" },
  teacher: { username: "mwalimu", password: "Mwalimu@123", name: "Mwalimu wa Darasa", title: "Mwalimu wa Darasa", initials: "MD" }
};
const ROLE_PAGES = {
  admin: ["dashboard", "students", "attendance", "results", "classes", "reports"],
  headmaster: ["dashboard", "students", "attendance", "results", "classes", "reports"],
  teacher: ["dashboard", "students", "attendance", "results"]
};
let activeUser = null;
function applyRole(user) {
  document.querySelectorAll(".nav-link[data-page]").forEach(button => {
    button.classList.toggle("hidden", !ROLE_PAGES[user.role].includes(button.dataset.page));
  });
  document.querySelectorAll("[data-open-page]").forEach(button => {
    button.classList.toggle("hidden", !ROLE_PAGES[user.role].includes(button.dataset.openPage));
  });
  // Admin pekee anaweza kufuta data zote au kupakua backup.
  ["exportData", "clearData"].forEach(id => {
    const button = $(id);
    if (button) button.classList.toggle("hidden", user.role !== "admin");
  });
  $("loggedInName").textContent = user.name;
  $("loggedInRole").textContent = user.title;
  $("loggedInName").closest(".profile").querySelector(".profile-avatar").textContent = user.initials;
  const heading = $("page-dashboard").querySelector(".page-heading h1");
  heading.textContent = `Karibu, ${user.name} 👋`;
  navigate("dashboard");
}
$("loginForm").addEventListener("submit", event => {
  event.preventDefault();
  const role = $("loginRole").value;
  const username = $("loginUsername").value.trim();
  const password = $("loginPassword").value;
  const account = DEMO_USERS[role];
  if (!account || username !== account.username || password !== account.password) {
    $("loginError").textContent = "Username au nenosiri si sahihi. Tafadhali jaribu tena.";
    $("loginError").classList.add("show");
    return;
  }
  activeUser = { ...account, role };
  document.body.classList.add("authenticated");
  $("loginError").classList.remove("show");
  applyRole(activeUser);
  notify(`Karibu ${activeUser.name}. Umeingia kikamilifu.`);
});
$("loginRole").addEventListener("change", () => $("loginError").classList.remove("show"));
$("logoutButton").addEventListener("click", () => {
  activeUser = null;
  document.body.classList.remove("authenticated");
  $("loginForm").reset();
  $("loginUsername").value = "";
  $("loginPassword").value = "";
  $("loginError").classList.remove("show");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

