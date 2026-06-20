let datos = [];

async function loadData() {
  try {
    const resp = await fetch('datos.json');
    datos = await resp.json();
    document.getElementById('catalog-counter').textContent =
      `${datos.length} registros en catálogo`;
    populateMarcas();

    const urlParams = new URLSearchParams(window.location.search);
    const codigo = urlParams.get('codigo');
    if (codigo) {
      document.getElementById('inp-codigo').value = codigo.toUpperCase();
      switchTab('codigo');
      buscarPorCodigo();
    }
  } catch (e) {
    document.getElementById('catalog-counter').textContent = 'Error al cargar catálogo';
    console.error(e);
  }
}

function getMarcas() {
  return [...new Set(datos.map(d => d.vehiculo.marca).filter(Boolean))].sort();
}

function getModelos(marca) {
  return [...new Set(datos.filter(d => d.vehiculo.marca === marca).map(d => d.vehiculo.modelo).filter(Boolean))].sort();
}

function getAnios(marca, modelo) {
  return [...new Set(datos.filter(d => d.vehiculo.marca === marca && d.vehiculo.modelo === modelo).map(d => d.vehiculo.anio).filter(Boolean))].sort();
}

function getPosiciones(marca, modelo, anio) {
  const anioStr = String(anio);
  return datos.filter(d => d.vehiculo.marca === marca && d.vehiculo.modelo === modelo && String(d.vehiculo.anio) === anioStr).map(d => d.vehiculo.posicion).filter(Boolean);
}

function populateMarcas() {
  const sel = document.getElementById('sel-marca');
  sel.innerHTML = '<option value="">Selecciona una marca</option>';
  getMarcas().forEach(m => {
    sel.innerHTML += `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`;
  });
  sel.disabled = false;
}

function populateModelos(marca) {
  const sel = document.getElementById('sel-modelo');
  sel.innerHTML = '<option value="">Selecciona un modelo</option>';
  if (marca) {
    getModelos(marca).forEach(m => {
      sel.innerHTML += `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`;
    });
    sel.disabled = false;
  } else {
    sel.disabled = true;
  }
}

function populateAnios(marca, modelo) {
  const sel = document.getElementById('sel-anio');
  sel.innerHTML = '<option value="">Selecciona un año</option>';
  if (marca && modelo) {
    getAnios(marca, modelo).forEach(a => {
      sel.innerHTML += `<option value="${a}">${a}</option>`;
    });
    sel.disabled = false;
  } else {
    sel.disabled = true;
  }
}

function onMarcaChange() {
  const marca = document.getElementById('sel-marca').value;
  populateModelos(marca);
  populateAnios(marca, null);
  document.getElementById('btn-buscar-vehiculo').disabled = true;
}

function onModeloChange() {
  const marca = document.getElementById('sel-marca').value;
  const modelo = document.getElementById('sel-modelo').value;
  populateAnios(marca, modelo);
  document.getElementById('btn-buscar-vehiculo').disabled = true;
}

function onAnioChange() {
  const marca = document.getElementById('sel-marca').value;
  const modelo = document.getElementById('sel-modelo').value;
  const anio = document.getElementById('sel-anio').value;
  document.getElementById('btn-buscar-vehiculo').disabled = !(marca && modelo && anio);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.search-panel').forEach(p => p.classList.add('hidden'));
  if (tab === 'vehiculo') {
    document.getElementById('tab-vehiculo').classList.add('active');
    document.getElementById('panel-vehiculo').classList.remove('hidden');
  } else {
    document.getElementById('tab-codigo').classList.add('active');
    document.getElementById('panel-codigo').classList.remove('hidden');
  }
}

function buscarPorVehiculo() {
  const marca = document.getElementById('sel-marca').value;
  const modelo = document.getElementById('sel-modelo').value;
  const anio = document.getElementById('sel-anio').value;
  if (!marca || !modelo || !anio) return;

  const anioStr = String(anio);
  const results = datos.filter(d =>
    d.vehiculo.marca === marca &&
    d.vehiculo.modelo === modelo &&
    String(d.vehiculo.anio) === anioStr
  );

  renderResults(results, `${marca} ${modelo} ${anio}`);
}

function buscarPorCodigo() {
  const q = document.getElementById('inp-codigo').value.trim().toUpperCase();
  if (!q) return;

  const results = datos.filter(d => {
    const bi = d.birlo_bi || '';
    if (bi && normalizeBICode(bi).includes(q)) return true;
    if (bi && bi.toUpperCase().replace(/\s/g, '').includes(q.replace(/\s/g, ''))) return true;

    if (d.atsa) {
      for (const a of d.atsa) {
        if (!a) continue;
        if (a.codigo_atsa && a.codigo_atsa.toUpperCase().includes(q)) return true;
        if (a.equiv_hercules && a.equiv_hercules.toUpperCase().includes(q)) return true;
        if (a.equiv_birlo_original && a.equiv_birlo_original.toUpperCase().includes(q)) return true;
        if (a.equiv_bi && a.equiv_bi.toUpperCase().replace(/\s/g, '').includes(q.replace(/\s/g, ''))) return true;
        if (bi && a.equiv_bi && normalizeBICode(bi) === normalizeBICode(a.equiv_bi)) return true;
      }
    }
    return false;
  });

  if (results.length === 0) {
    showNoResults();
    return;
  }

  renderResults(results, `Código: "${q}"`);
}

function normalizeBICode(code) {
  if (!code) return '';
  return code.toUpperCase().replace(/^BR/, '').replace(/RP$/, '').replace(/R$/, '').replace(/P$/, '').replace(/\s/g, '').trim();
}

function normalizeBICodeFull(code) {
  if (!code) return '';
  return code.toUpperCase().replace(/\s/g, '').trim();
}

function renderResults(results, title) {
  const container = document.getElementById('results-inner');
  const emptyState = document.getElementById('empty-state');
  const noResults = document.getElementById('no-results');
  const resultsSection = document.getElementById('results');

  emptyState.classList.add('hidden');
  noResults.classList.add('hidden');
  resultsSection.classList.remove('hidden');

  const uniqueVehicles = new Map();
  for (const d of results) {
    const key = `${d.vehiculo.marca}|${d.vehiculo.modelo}|${d.vehiculo.anio}|${d.vehiculo.posicion || 'N/A'}`;
    if (!uniqueVehicles.has(key)) uniqueVehicles.set(key, d);
  }

  const vehicles = Array.from(uniqueVehicles.values());

  let html = `<div class="results-header">
    <h2>${escapeHtml(title)}</h2>
    <span class="results-count">${results.length} ${results.length === 1 ? 'resultado' : 'resultados'}</span>
  </div>`;

  for (const d of vehicles) {
    const v = d.vehiculo;
    const atsas = d.atsa && d.atsa.length > 0 ? d.atsa : null;
    const position = v.posicion || '';
    const tuerca = d.tuerca_recomendada || '';

    let tuercaLabel = '';
    let tuercaClass = '';
    if (tuerca) {
      const tLow = tuerca.toLowerCase();
      if (tLow.includes('original') || tLow.includes('tuerca') || tLow.includes('cilindrica')) {
        tuercaLabel = 'Tuerca Original';
        tuercaClass = 'original';
      } else if (tLow.includes('mariposa')) {
        tuercaLabel = 'Tuerca Mariposa';
        tuercaClass = 'mariposa';
      } else {
        tuercaLabel = tuerca;
        tuercaClass = 'default';
      }
    }

    html += `<div class="result-card">
      <div class="card-header">
        <div class="card-vehicle">
          <div class="card-vehicle-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
          </div>
          <div>
            <h3>${escapeHtml(v.marca)} ${escapeHtml(v.modelo)}</h3>
            <span class="card-subtitle">${v.anio}${position ? ' · ' + escapeHtml(position) : ''}</span>
          </div>
        </div>
        <span class="card-badge ${atsas ? 'complete' : 'partial'}">
          ${atsas ? 'Completo' : 'Solo B.I.'}
        </span>
      </div>`;

    html += `<div class="card-codes">
      <div class="codes-grid">`;

    if (atsas) {
      for (let i = 0; i < atsas.length; i++) {
        const a = atsas[i];
        const isFirst = i === 0;

        if (isFirst || atsas.length === 1) {
          html += `<div class="code-item primary">
            <span class="code-label">ATSA</span>
            <span class="code-value">${escapeHtml(a.codigo_atsa)}</span>
          </div>`;
        }

        if (a.equiv_bi) {
          html += `<div class="code-item">
            <span class="code-label">Birlos Internacionales</span>
            <span class="code-value">${escapeHtml(a.equiv_bi)}</span>
          </div>`;
        }

        if (a.equiv_hercules) {
          const hCode = a.equiv_hercules.startsWith('H') ? a.equiv_hercules : 'H' + a.equiv_hercules;
          html += `<div class="code-item">
            <span class="code-label">Hércules</span>
            <span class="code-value">${escapeHtml(hCode)}</span>
          </div>`;
        }

        if (a.equiv_birlo_original) {
          html += `<div class="code-item">
            <span class="code-label">Birlo Original</span>
            <span class="code-value">${escapeHtml(a.equiv_birlo_original)}</span>
          </div>`;
        }
      }
    } else {
      if (d.birlo_bi) {
        html += `<div class="code-item primary">
          <span class="code-label">Birlos Internacionales</span>
          <span class="code-value">${escapeHtml(d.birlo_bi)}</span>
        </div>`;
      }
    }

    html += `</div></div>`;

    if (atsas) {
      const specs = [];
      for (const a of atsas) {
        if (a.rosca && !specs.find(s => s.label === 'Rosca')) specs.push({ label: 'Rosca', value: a.rosca });
        if (a.longitud_total && !specs.find(s => s.label === 'Longitud')) specs.push({ label: 'Longitud', value: a.longitud_total + ' mm' });
        if (a.dureza && !specs.find(s => s.label === 'Dureza')) specs.push({ label: 'Dureza', value: a.dureza });
        if (a.aplicacion && !specs.find(s => s.label === 'Aplicación')) specs.push({ label: 'Aplicación', value: a.aplicacion });
      }

      if (specs.length > 0) {
        html += `<div class="card-specs">
          <h4>Especificaciones</h4>
          <div class="specs-grid">`;
        for (const s of specs) {
          html += `<div class="spec-item">
            <span class="spec-label">${escapeHtml(s.label)}</span>
            <span class="spec-value">${escapeHtml(s.value)}</span>
          </div>`;
        }
        html += `</div></div>`;
      }
    }

    if (tuerca && atsas) {
      html += `<div class="card-tuerca">
        <div class="tuerca-info">
          <span class="tuerca-icon">🔩</span>
          <div>
            <strong>Tuerca Recomendada:</strong>
            <span>${escapeHtml(tuerca)}</span>
          </div>
        </div>
      </div>`;
    }

    html += `</div>`;
  }

  container.innerHTML = html;

  setTimeout(() => {
    document.querySelectorAll('.result-card').forEach((el, i) => {
      el.style.animationDelay = `${i * 0.1}s`;
      el.classList.add('animate-in');
    });
  }, 50);

  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showNoResults() {
  document.getElementById('empty-state').classList.add('hidden');
  document.getElementById('results').classList.remove('hidden');
  document.getElementById('no-results').classList.remove('hidden');
  document.getElementById('results-inner').innerHTML = '';
}

loadData();
