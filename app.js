const API = "http://localhost:5000/api/students";

const Store = (() => {
  let listeners = [];

  const notify = (data) => listeners.forEach(fn => fn(data));

  return {
    async getAll() {
  try {
    const res = await fetch(API);
    return await res.json();
  } catch (e) {
    UI.toast("Server error", "error");
    return [];
  }
},

    async add(student) {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(student)
      });
      notify(await this.getAll());
    },

    async update(id, updates) {
      await fetch(`${API}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      });
      notify(await this.getAll());
    },

    async remove(id) {
      await fetch(`${API}/${id}`, { method: "DELETE" });
      notify(await this.getAll());
    },

    onChange(fn) {
      listeners.push(fn);
    }
  };
})();

const Validator = (() => {
  const sanitise = (str, max = 200) =>
    String(str).replace(/<[^>]*>/g, '').trim().slice(0, max);

  const rules = {
    rollNo: { required: true, pattern: /^[A-Z0-9\-]{3,12}$/i, msg: 'Roll No must be 3–12 alphanumeric chars (e.g. CS2401).' },
    name: { required: true, minLen: 2, maxLen: 80, msg: 'Full name must be 2–80 characters.' },
    email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, msg: 'Enter a valid email address.' },
    phone: { required: false, pattern: /^[0-9]{10}$/, msg: 'Phone must be exactly 10 digits.' },
    department: { required: true, msg: 'Please select a department.' },
    year: { required: true, msg: 'Please select a year.' },
    gpa: { required: false, min: 0, max: 10, msg: 'GPA must be between 0.0 and 10.0.' },
  };

  const validateField = (name, value) => {
    const rule = rules[name];
    if (!rule) return null;
    const v = String(value).trim();

    if (rule.required && !v) {
      const label = name === 'rollNo' ? 'Roll number' : name.charAt(0).toUpperCase() + name.slice(1);
      return `${label} is required.`;
    }
    if (!rule.required && !v) return null;

    if (rule.pattern && !rule.pattern.test(v)) return rule.msg;
    if (rule.minLen && v.length < rule.minLen) return rule.msg;
    if (rule.maxLen && v.length > rule.maxLen) return rule.msg;
    if (rule.min !== undefined && parseFloat(v) < rule.min) return rule.msg;
    if (rule.max !== undefined && parseFloat(v) > rule.max) return rule.msg;

    return null;
  };

  const validateAll = (data) => {
    const errors = {};
    Object.keys(rules).forEach(k => {
      const err = validateField(k, data[k] ?? '');
      if (err) errors[k] = err;
    });
    return errors;
  };

  return { sanitise, validateField, validateAll };
})();


const UI = (() => {
  const esc = (str) =>
    String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const announce = (msg) => {
    const el = document.getElementById('aria-live');
    el.textContent = '';
    requestAnimationFrame(() => { el.textContent = msg; });
  };

  const toast = (msg, type = 'info') => {
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.setAttribute('role', 'status');
    el.innerHTML = `<span aria-hidden="true">${icons[type] || 'ℹ'}</span><span>${esc(msg)}</span>`;
    container.appendChild(el);
    announce(msg);
    setTimeout(() => {
      el.style.animation = 'slideOut 0.3s ease forwards';
      el.addEventListener('animationend', () => el.remove());
    }, 3500);
  };

  const showView = (id) => {
    document.querySelectorAll('.view').forEach(v => {
      v.classList.remove('active');
      v.hidden = true;
    });
    document.querySelectorAll('.nav-item').forEach(b => {
      b.classList.remove('active');
      b.removeAttribute('aria-current');
    });
    const target = document.getElementById(`view-${id}`);
    if (target) {
      target.classList.add('active');
      target.hidden = false;
      target.focus();
    }
    const navBtn = document.querySelector(`.nav-item[data-view="${id}"]`);
    if (navBtn) {
      navBtn.classList.add('active');
      navBtn.setAttribute('aria-current', 'page');
    }
  };

  const gpaBadge = (gpa) => {
    if (gpa === '' || gpa === null || gpa === undefined) return '<span class="gpa-badge">—</span>';
    const n = parseFloat(gpa);
    const cls = n >= 8 ? 'gpa-high' : n >= 6 ? 'gpa-mid' : 'gpa-low';
    return `<span class="gpa-badge ${cls}">${n.toFixed(1)}</span>`;
  };

  const initials = (name) =>
    name.split(' ').map(w => w[0] || '').join('').toUpperCase().slice(0, 2);

  return { esc, announce, toast, showView, gpaBadge, initials };
})();


const Table = (() => {
  const PER_PAGE = 8;
  let page = 1;
  let sortCol = 'name';
  let sortAsc = true;
  let filterDept = '';
  let filterYear = '';
  let searchQ = '';

  const tbody = document.getElementById('students-tbody');
  const pageInfo = document.getElementById('page-info');
  const prevBtn = document.getElementById('prev-page');
  const nextBtn = document.getElementById('next-page');

  const applyFilters = (data) => data.filter(s => {
    const q = searchQ.toLowerCase();
    const matchQ = !q || s.name.toLowerCase().includes(q) || s.rollNo.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
    const matchDept = !filterDept || s.department === filterDept;
    const matchYear = !filterYear || String(s.year) === filterYear;
    return matchQ && matchDept && matchYear;
  });

  const applySort = (data) => [...data].sort((a, b) => {
    let va = a[sortCol] ?? '';
    let vb = b[sortCol] ?? '';
    if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
    if (va < vb) return sortAsc ? -1 : 1;
    if (va > vb) return sortAsc ? 1 : -1;
    return 0;
  });

  const render = (allData) => {
    tbody.innerHTML = `<tr><td colspan="7">Loading...</td></tr>`;
    const filtered = applySort(applyFilters(allData));
    const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
    page = Math.min(page, totalPages);
    const slice = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    if (!slice.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-row">No students match your filters.</td></tr>`;
    } else {
      tbody.innerHTML = slice.map(s => `
        <tr>
          <td><code>${UI.esc(s.rollNo)}</code></td>
          <td>
            <div style="display:flex;align-items:center;gap:8px">
              <div class="recent-avatar">${UI.initials(s.name)}</div>
              <span>${UI.esc(s.name)}</span>
            </div>
          </td>
          <td><span class="dept-tag">${UI.esc(s.department)}</span></td>
          <td>Year ${UI.esc(s.year)}</td>
          <td>${UI.gpaBadge(s.gpa)}</td>
          <td><a href="mailto:${UI.esc(s.email)}" style="color:var(--accent)">${UI.esc(s.email)}</a></td>
          <td>
            <div class="action-btns">
              <button class="btn-icon" data-action="edit"   data-id="${UI.esc(s._id)}" aria-label="Edit ${UI.esc(s.name)}">Edit</button>
              <button class="btn-icon delete" data-action="delete" data-id="${UI.esc(s._id)}" aria-label="Delete ${UI.esc(s.name)}">Delete</button>
            </div>
          </td>
        </tr>`).join('');
    }

    pageInfo.textContent = `Page ${page} of ${totalPages}`;
    prevBtn.disabled = page <= 1;
    nextBtn.disabled = page >= totalPages;

    document.querySelectorAll('.sort-btn').forEach(btn => {
      const col = btn.dataset.col;
      btn.closest('th').setAttribute('aria-sort',
        col === sortCol ? (sortAsc ? 'ascending' : 'descending') : 'none');
    });
  };

  const init = () => {
    document.querySelectorAll('.sort-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const col = btn.dataset.col;
        if (sortCol === col) sortAsc = !sortAsc;
        else { sortCol = col; sortAsc = true; }
        page = 1;
        Store.getAll().then(render);
      });
    });

    prevBtn.addEventListener('click', () => { page--; Store.getAll().then(render);; });
    nextBtn.addEventListener('click', () => { page++; Store.getAll().then(render);; });

    document.getElementById('filter-dept').addEventListener('change', e => {
      filterDept = e.target.value; page = 1; Store.getAll().then(render);;
    });
    document.getElementById('filter-year').addEventListener('change', e => {
      filterYear = e.target.value; page = 1; Store.getAll().then(render);
    });

    tbody.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const { action, id } = btn.dataset;
      if (action === 'edit') Form.openEdit(id);
      if (action === 'delete') Modal.open(id);
    });
  };

  const setSearch = (q) => { searchQ = q; page = 1; Store.getAll().then(render); };

  return { render, init, setSearch };
})();


const Form = (() => {
  const form = document.getElementById('student-form');
  const editId = document.getElementById('edit-id');
  const title = document.getElementById('form-title');
  const submitBtn = document.getElementById('submit-btn');

  const fields = ['rollNo', 'name', 'email', 'phone', 'department', 'year', 'gpa', 'dob', 'address'];

  const fieldId = {
    rollNo: 'f-roll', name: 'f-name', email: 'f-email', phone: 'f-phone',
    department: 'f-dept', year: 'f-year', gpa: 'f-gpa', dob: 'f-dob', address: 'f-address',
  };
  const errId = {
    rollNo: 'f-roll-err', name: 'f-name-err', email: 'f-email-err',
    phone: 'f-phone-err', department: 'f-dept-err', year: 'f-year-err', gpa: 'f-gpa-err',
  };

  const el = (id) => document.getElementById(id);

  const showError = (field, msg) => {
    const errEl = el(errId[field]);
    const inp = el(fieldId[field]);
    if (!errEl || !inp) return;
    errEl.textContent = msg;
    errEl.hidden = false;
    inp.classList.add('invalid');
    inp.setAttribute('aria-invalid', 'true');
  };

  const clearError = (field) => {
    const errEl = el(errId[field]);
    const inp = el(fieldId[field]);
    if (!errEl || !inp) return;
    errEl.textContent = '';
    errEl.hidden = true;
    inp.classList.remove('invalid');
    inp.removeAttribute('aria-invalid');
  };

  const clearAll = () => fields.forEach(clearError);

  const collectData = () => {
    const raw = {};
    fields.forEach(f => {
      const input = el(fieldId[f]);
      if (!input) return;
      raw[f] = input.value ?? '';
    });
    return raw;
  };

  const fillForm = (student) => {
    fields.forEach(f => {
      const input = el(fieldId[f]);
      if (!input) return;
      input.value = student[f] ?? '';
    });
  };

  const resetForm = () => {
    form.reset();
    editId.value = '';
    clearAll();
    title.textContent = 'Add New Student';
    submitBtn.textContent = 'Save Student';
  };

  const openAdd = () => {
    resetForm();
    UI.showView('add');
  };

  const openEdit = (id) => {
    const student = Store.getById(id);
    if (!student) return;
    resetForm();
    editId.value = id;
    fillForm(student);
    title.textContent = 'Edit Student';
    submitBtn.textContent = 'Update Student';
    UI.showView('add');
  };

  Object.entries(fieldId).forEach(([field, elId]) => {
    const input = document.getElementById(elId);
    if (!input) return;
    input.addEventListener('blur', () => {
      const err = Validator.validateField(field, input.value);
      err ? showError(field, err) : clearError(field);
    });
  });

  el('f-address').addEventListener('input', function () {
    el('f-address-count').textContent = `${this.value.length} / 300`;
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAll();

    const rawData = collectData();
    const data = {};
    Object.keys(rawData).forEach(k => { data[k] = Validator.sanitise(rawData[k]); });

    const errors = Validator.validateAll(data);
    if (Object.keys(errors).length) {
      Object.entries(errors).forEach(([f, msg]) => showError(f, msg));
      el(fieldId[Object.keys(errors)[0]])?.focus();
      UI.announce(`Form has ${Object.keys(errors).length} error(s). Please correct them.`);
      return;
    }

    if (data.year) data.year = parseInt(data.year);
    if (data.gpa) data.gpa = parseFloat(data.gpa);
    if (!data.gpa && data.gpa !== 0) delete data.gpa;

    const id = editId.value;
    if (id) {
  await Store.update(id, data);
  UI.toast(`${data.name} updated successfully.`, 'success');
} else {  
  await Store.add(data);
  UI.toast(`${data.name} added successfully.`, 'success');
}

    resetForm();
    UI.showView('students');
  });

  document.getElementById('cancel-btn').addEventListener('click', () => UI.showView('students'));

  return { openAdd, openEdit };
})();


const Modal = (() => {
  let targetId = null;
  const overlay = document.getElementById('modal-overlay');
  const bodyEl = document.getElementById('modal-body');
  const cancelBtn = document.getElementById('modal-cancel');
  const confirmBtn = document.getElementById('modal-confirm');

  const open = (id) => {
    targetId = id;
    const student = Store.getById(id);
    bodyEl.textContent = student
      ? `You are about to permanently delete ${student.name} (${student.rollNo}). This cannot be undone.`
      : 'This action cannot be undone.';
    overlay.hidden = false;
    confirmBtn.focus();
  };

  const close = () => {
    overlay.hidden = true;
    targetId = null;
  };

  cancelBtn.addEventListener('click', close);

  confirmBtn.addEventListener('click', async () => {
    if (!targetId) return;
    const student = Store.getById(targetId);
    await Store.remove(targetId);
    UI.toast(student ? `${student.name} deleted.` : 'Student deleted.', 'success');
    close();
  });

  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  return { open, close };
})();


const Dashboard = (() => {
  const render = (data) => {
    document.getElementById('stat-total').textContent = data.length;
    document.getElementById('stat-active').textContent = data.length;

    const depts = [...new Set(data.map(s => s.department))];
    document.getElementById('stat-departments').textContent = depts.length;

    const gpas = data.filter(s => s.gpa != null && s.gpa !== '').map(s => s.gpa);
    document.getElementById('stat-avg-gpa').textContent =
      gpas.length ? (gpas.reduce((a, b) => a + b, 0) / gpas.length).toFixed(2) : '—';

    const recent = [...data].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
    const recentEl = document.getElementById('recent-students');
    recentEl.innerHTML = recent.length
      ? recent.map(s => `
          <div class="recent-item" role="listitem">
            <div class="recent-avatar" aria-hidden="true">${UI.initials(s.name)}</div>
            <div>
              <div class="recent-name">${UI.esc(s.name)}</div>
              <div class="recent-dept">${UI.esc(s.department)} · Year ${s.year}</div>
            </div>
            <span class="recent-roll">${UI.esc(s.rollNo)}</span>
          </div>`).join('')
      : '<p style="color:var(--text-3);font-size:0.85rem">No students yet.</p>';

    const deptCounts = {};
    data.forEach(s => { deptCounts[s.department] = (deptCounts[s.department] || 0) + 1; });
    const maxCount = Math.max(...Object.values(deptCounts), 1);
    const deptEl = document.getElementById('dept-chart');
    deptEl.innerHTML = Object.entries(deptCounts).map(([d, c]) => `
      <div class="dept-bar-item">
        <span class="dept-bar-label">${UI.esc(d)}</span>
        <div class="dept-bar-track" role="presentation">
          <div class="dept-bar-fill" style="width:${(c / maxCount) * 100}%" aria-label="${c} students"></div>
        </div>
        <span class="dept-bar-count">${c}</span>
      </div>`).join('') || '<p style="color:var(--text-3);font-size:0.85rem">No data.</p>';
  };

  return { render };
})();


const Analytics = (() => {
  const COLORS = ['#7c6af7', '#3ecf8e', '#f0a05a', '#f26363', '#64b5f6'];

  const barChart = (containerId, labels, values, maxVal, suffix = '') => {
    const container = document.getElementById(containerId);
    if (!container) return;
    const max = maxVal || Math.max(...values, 1);
    container.innerHTML = labels.map((lbl, i) => `
      <div class="dept-bar-item">
        <span class="dept-bar-label" style="width:56px">${UI.esc(lbl)}</span>
        <div class="dept-bar-track" role="presentation">
          <div class="dept-bar-fill"
               style="width:${(values[i] / max) * 100}%;background:${COLORS[i % COLORS.length]}"
               aria-label="${values[i]}${suffix}"></div>
        </div>
        <span class="dept-bar-count">${values[i]}${suffix}</span>
      </div>`).join('');
  };

  const render = (data) => {
    const gpaBuckets = { '0–4': 0, '4–6': 0, '6–8': 0, '8–9': 0, '9–10': 0 };
    data.forEach(s => {
      if (s.gpa == null || s.gpa === '') return;
      const g = parseFloat(s.gpa);
      if (g < 4) gpaBuckets['0–4']++;
      else if (g < 6) gpaBuckets['4–6']++;
      else if (g < 8) gpaBuckets['6–8']++;
      else if (g < 9) gpaBuckets['8–9']++;
      else gpaBuckets['9–10']++;
    });
    barChart('gpa-chart', Object.keys(gpaBuckets), Object.values(gpaBuckets), null, ' students');

    const yearCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    data.forEach(s => { if (yearCounts[s.year] !== undefined) yearCounts[s.year]++; });
    barChart('year-chart',
      Object.keys(yearCounts).map(y => `Yr ${y}`),
      Object.values(yearCounts), null, ' students');

    const depts = {};
    data.forEach(s => {
      if (!depts[s.department]) depts[s.department] = { count: 0, gpaSum: 0, gpaCount: 0, years: {} };
      const d = depts[s.department];
      d.count++;
      if (s.gpa != null && s.gpa !== '') { d.gpaSum += parseFloat(s.gpa); d.gpaCount++; }
      d.years[s.year] = (d.years[s.year] || 0) + 1;
    });

    const tableEl = document.getElementById('analytics-dept');
    if (!Object.keys(depts).length) {
      tableEl.innerHTML = '<p style="color:var(--text-3);font-size:0.85rem">No data.</p>';
      return;
    }

    tableEl.innerHTML = `
      <div class="table-wrap">
        <table aria-label="Department summary">
          <thead>
            <tr>
              <th scope="col">Department</th>
              <th scope="col">Students</th>
              <th scope="col">Avg GPA</th>
              <th scope="col">Year Distribution</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(depts).map(([dept, d]) => `
              <tr>
                <td><span class="dept-tag">${UI.esc(dept)}</span></td>
                <td>${d.count}</td>
                <td>${d.gpaCount ? (d.gpaSum / d.gpaCount).toFixed(2) : '—'}</td>
                <td>${Object.entries(d.years).map(([y, c]) => `Yr${y}:${c}`).join(' · ')}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  };

  return { render };
})();


const App = (() => {
  const init = () => {
    document.querySelectorAll('.nav-item, [data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        if (!view) return;
        if (view === 'add') Form.openAdd();
        else UI.showView(view);
      });
    });

    let searchTimer = null;
    document.getElementById('global-search').addEventListener('input', e => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => Table.setSearch(e.target.value), 280);
    });

    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');

    menuToggle.addEventListener('click', () => {
      const isOpen = sidebar.classList.toggle('open');
      menuToggle.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('click', e => {
      if (
        window.innerWidth <= 768
        && sidebar.classList.contains('open')
        && !sidebar.contains(e.target)
        && !menuToggle.contains(e.target)
      ) {
        sidebar.classList.remove('open');
        menuToggle.setAttribute('aria-expanded', 'false');
      }
    });

    Store.onChange((data) => {
      Dashboard.render(data);
      Table.render(data);
      Analytics.render(data);
    });

    Table.init();

    Store.getAll().then(data => {
      Dashboard.render(data);
      Table.render(data);
      Analytics.render(data);
    });
  };

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => App.init());