let datos = [];
let timeoutId = null;

async function cargarDatos() {
  const loading = document.getElementById('loading');
  loading.classList.remove('hidden');
  try {
    const resp = await fetch('datos.json');
    datos = await resp.json();
    cargarMarcas();
  } catch (e) {
    alert('Error al cargar datos: ' + e.message);
  } finally {
    loading.classList.add('hidden');
  }
}

function cargarMarcas() {
  const marcas = [...new Set(datos.map(r => r.vehiculo.marca))].sort();
  const sel = document.getElementById('sel-marca');
  marcas.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m; opt.textContent = m;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', onMarcaChange);
  document.getElementById('sel-modelo').addEventListener('change', onModeloChange);
  document.getElementById('sel-anio').addEventListener('change', onAnioChange);
  document.getElementById('sel-posicion').addEventListener('change', onPosicionChange);
}

function filtrarPorMarca() {
  const marca = document.getElementById('sel-marca').value;
  return marca ? datos.filter(r => r.vehiculo.marca === marca) : [];
}

function filtrarPorModelo(lista) {
  const modelo = document.getElementById('sel-modelo').value;
  return modelo ? lista.filter(r => r.vehiculo.modelo === modelo) : lista;
}

function filtrarPorAnio(lista) {
  const anio = document.getElementById('sel-anio').value;
  return anio ? lista.filter(r => r.vehiculo.anio === anio) : lista;
}

function filtrarPorPosicion(lista) {
  const pos = document.getElementById('sel-posicion').value;
  return pos ? lista.filter(r => r.vehiculo.posicion === pos) : lista;
}

function onMarcaChange() {
  const marca = document.getElementById('sel-marca').value;
  const selModelo = document.getElementById('sel-modelo');
  selModelo.innerHTML = '<option value="">Selecciona modelo</option>';
  const selAnio = document.getElementById('sel-anio');
  selAnio.innerHTML = '<option value="">Selecciona año</option>';
  const selPos = document.getElementById('sel-posicion');
  selPos.innerHTML = '<option value="">Todas</option>';
  selModelo.disabled = !marca;
  selAnio.disabled = true;
  selPos.disabled = true;

  if (!marca) { mostrarResultados([]); return; }

  const filtrados = filtrarPorMarca();
  const modelos = [...new Set(filtrados.map(r => r.vehiculo.modelo))].sort();
  modelos.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m; opt.textContent = m;
    selModelo.appendChild(opt);
  });
  selModelo.disabled = false;
  mostrarResultados(filtrados);
}

function onModeloChange() {
  const modelo = document.getElementById('sel-modelo').value;
  const selAnio = document.getElementById('sel-anio');
  selAnio.innerHTML = '<option value="">Selecciona año</option>';
  const selPos = document.getElementById('sel-posicion');
  selPos.innerHTML = '<option value="">Todas</option>';
  selPos.disabled = true;

  if (!modelo) {
    selAnio.disabled = true;
    const filtrados = filtrarPorMarca();
    mostrarResultados(filtrados);
    return;
  }

  let filtrados = filtrarPorMarca();
  filtrados = filtrarPorModelo(filtrados);
  const anios = [...new Set(filtrados.map(r => r.vehiculo.anio))].sort();
  anios.forEach(a => {
    const opt = document.createElement('option');
    opt.value = a; opt.textContent = a;
    selAnio.appendChild(opt);
  });
  selAnio.disabled = false;
  mostrarResultados(filtrados);
}

function onAnioChange() {
  const anio = document.getElementById('sel-anio').value;
  const selPos = document.getElementById('sel-posicion');
  selPos.innerHTML = '<option value="">Todas</option>';

  let filtrados = filtrarPorMarca();
  filtrados = filtrarPorModelo(filtrados);
  if (anio) filtrados = filtrarPorAnio(filtrados);

  const posiciones = [...new Set(filtrados.map(r => r.vehiculo.posicion))].sort();
  posiciones.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p; opt.textContent = p;
    selPos.appendChild(opt);
  });
  selPos.disabled = false;
  mostrarResultados(filtrados);
}

function onPosicionChange() {
  let filtrados = filtrarPorMarca();
  filtrados = filtrarPorModelo(filtrados);
  filtrados = filtrarPorAnio(filtrados);
  filtrados = filtrarPorPosicion(filtrados);
  mostrarResultados(filtrados);
}

function mostrarResultados(lista) {
  const container = document.getElementById('results-list');
  const countInfo = document.getElementById('count-info');
  const noResults = document.getElementById('no-results');

  if (lista.length === 0) {
    container.innerHTML = '';
    countInfo.textContent = '';
    noResults.classList.remove('hidden');
    return;
  }
  noResults.classList.add('hidden');
  countInfo.textContent = `${lista.length} resultado(s) encontrado(s)`;

  container.innerHTML = lista.map(r => {
    const v = r.vehiculo;
    const atsaHTML = r.atsa.length > 0 ? r.atsa.map(a => `
      <div class="atsa-block">
        <div class="codigos">
          <span class="codigo-item atsa"><span class="label">ATSA:</span> ${a.codigo_atsa}</span>
          ${a.equiv_hercules ? `<span class="codigo-item hercules"><span class="label">Hércules:</span> H${a.equiv_hercules}</span>` : ''}
          ${a.equiv_birlo_original ? `<span class="codigo-item original"><span class="label">Original:</span> ${a.equiv_birlo_original}</span>` : ''}
        </div>
        <div class="specs">
          ${a.rosca ? `<span class="spec-item"><span class="label">Rosca:</span> ${a.rosca}</span>` : ''}
          ${a.longitud_total ? `<span class="spec-item"><span class="label">Longitud:</span> ${a.longitud_total}</span>` : ''}
          ${a.dureza ? `<span class="spec-item"><span class="label">Dureza:</span> ${a.dureza}</span>` : ''}
          ${a.aplicacion ? `<span class="spec-item"><span class="label">Aplicación:</span> ${a.aplicacion}</span>` : ''}
        </div>
        ${a.tuerca_codigo ? `<div class="tuerca-info"><strong>Tuerca:</strong> ${a.tuerca_codigo} ${a.tuerca_tipo ? '(' + a.tuerca_tipo + ')' : ''}</div>` : ''}
      </div>
    `).join('') : '<div class="no-match">Sin información ATSA disponible para este código</div>';

    return `
      <div class="card">
        <div class="card-header">
          <div>
            <div class="card-vehiculo">${v.marca} ${v.modelo}</div>
            <div class="card-posicion">${v.anio} ${v.posicion ? '— ' + v.posicion : ''}</div>
          </div>
          <div class="codigos" style="margin:0">
            <span class="codigo-item bi"><span class="label">Birlos Int.:</span> ${r.birlo_bi}</span>
          </div>
        </div>
        ${atsaHTML}
        <div class="tuerca-info" style="margin-top:6px;font-size:0.85rem">
          <strong>Tuerca recomendada:</strong> ${r.tuerca_recomendada || 'N/A'}
        </div>
      </div>
    `;
  }).join('');
}

/* -- Busqueda por codigo -- */
function buscarPorCodigo() {
  const q = document.getElementById('input-codigo').value.trim().toUpperCase();
  if (!q) return;

  const resultados = datos.filter(r => {
    if (r.birlo_bi.toUpperCase().includes(q)) return true;
    if (r.tuerca_recomendada && r.tuerca_recomendada.toUpperCase().includes(q)) return true;
    for (const a of r.atsa) {
      if (a.codigo_atsa.toUpperCase().includes(q)) return true;
      if (a.equiv_hercules && ('H' + a.equiv_hercules).includes(q)) return true;
      if (a.equiv_hercules && a.equiv_hercules.toUpperCase().includes(q)) return true;
      if (a.equiv_birlo_original && a.equiv_birlo_original.toUpperCase().includes(q)) return true;
      if (a.tuerca_codigo && a.tuerca_codigo.toUpperCase().includes(q)) return true;
    }
    return false;
  });

  mostrarResultados(resultados);
}

/* -- Busqueda por codigo en tiempo real (debounced) -- */
function onCodigoInput() {
  clearTimeout(timeoutId);
  timeoutId = setTimeout(buscarPorCodigo, 400);
}

/* -- Tabs -- */
function initTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.search-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('search-' + tab.dataset.tab).classList.add('active');

      // Reset results if switching to vehicle tab
      if (tab.dataset.tab === 'vehiculo') {
        const selMarca = document.getElementById('sel-marca');
        if (selMarca.value) {
          selMarca.dispatchEvent(new Event('change'));
        }
      }
    });
  });
}

/* -- Init -- */
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  cargarDatos();
  document.getElementById('btn-buscar-codigo').addEventListener('click', buscarPorCodigo);
  document.getElementById('input-codigo').addEventListener('keyup', onCodigoInput);
  document.getElementById('input-codigo').addEventListener('search', buscarPorCodigo);
});
