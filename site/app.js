(() => {
  'use strict';

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MOBILE = () => window.matchMedia('(max-width: 760px)').matches;
  const PY_BOUNDS = [[-62.65, -27.6], [-54.25, -19.29]];

  // Unidades hidrográficas del Paraguay, Resolución SEAM N° 376/12 (área en km²)
  const OFFICIAL = {
    oriental: [
      ['Apa y Tagatiya', 8121], ['Aquidabán', 12515],
      ['Área de influencia intermedia de Yacyretá e Itaipú', 11521],
      ['Área de influencia de Itaipú', 20167], ['Área de influencia de Yacyretá', 14148],
      ['Caañabé', 1978], ['Jejuí Guazú', 20337], ['Laguna Verá', 3362], ['Manduvirá', 5286],
      ['Ñeembucú', 3988], ['Piribebuy', 1638], ['Tebicuary Cuenca Alta', 9561],
      ['Tebicuary Cuenca Baja', 15107], ['Tebicuary Cuenca Media', 10539], ['Yhaguy', 4266],
      ['Ypacaraí y Patiño', 1618], ['Ypané', 12324]
    ],
    occidental: [['Río Pilcomayo', 86694], ['Río Yacaré', 85761], ['Río Timané', 68133]]
  };
  const OFFICIAL_AREA = Object.fromEntries([...OFFICIAL.oriental, ...OFFICIAL.occidental]);
  OFFICIAL_AREA['Áreas de influencia de Itaipú y Yacyretá'] = 11521 + 20167 + 14148;

  const T = {
    es: {
      title: 'Paraguay, dibujado por el agua',
      day: 'Día 26 · Agua',
      lede: 'El río Paraguay divide el país en la Región Oriental y el Chaco. Toda la lluvia que cae aquí llega al Río de la Plata por el Paraguay o el Paraná.',
      mode_basins: 'Cuencas', mode_deps: 'Departamentos',
      hint: 'Toca cualquier punto del mapa para seguir el camino de una gota de lluvia.',
      notes_btn: 'Notas y fuentes', close: 'Cerrar', map: 'Mapa',
      river: n => n === 'de la Plata' ? 'Río de la Plata' : `río ${n}`,
      River: n => n === 'de la Plata' ? 'Río de la Plata' : `Río ${n}`,
      basin_of: n => `Cuenca del río ${n}`,
      basin_direct: n => `Cuenca directa del río ${n}`,
      basin_streams: n => `Arroyos que desaguan en el ${n}`,
      hybas: (id, pf) => `HydroBASINS nivel 6 · Pfafstetter ${pf}`,
      area: 'Superficie', area_py: 'En Paraguay', drains: 'Desagua en', rivers_in: 'Ríos con nombre',
      region: 'Región', reg: { oriental: 'Oriental', occidental: 'Occidental (Chaco)', ambas: 'Ambas márgenes del río Paraguay' },
      official: 'Unidad oficial aproximada',
      official_note: 'Resolución SEAM N° 376/12. Correspondencia aproximada a partir de los ríos que contiene la cuenca; los límites no coinciden.',
      no_official: 'Sin correspondencia directa con las unidades oficiales.',
      no_official_occ: 'Región Occidental (unidades oficiales: Pilcomayo, Yacaré y Timané). Sin correspondencia directa.',
      drop_title: 'Camino de la gota',
      drop_km: km => `≈ ${km} km`,
      drop_to_mouth: 'hasta la boca del Río de la Plata',
      drop_endo: 'hasta donde termina el cauce en los datos (cuenca sin salida al mar)',
      drop_end: 'hasta el final del cauce en los datos',
      via: 'Ríos por los que pasa', countries: 'Países que atraviesa',
      local: 'cauces locales (sin nombre en los datos)',
      border: (a, b) => `${a}–${b} (frontera)`,
      endo_note: 'Según HydroRIVERS, este cauce termina en una zona sin salida al mar (endorreica).',
      method_note: 'Trazado según la dirección de flujo de HydroRIVERS. No considera aguas subterráneas ni canales artificiales.',
      outside: 'Este punto está fuera del área analizada. Toca dentro de Paraguay o de las cuencas que lo atraviesan.',
      department: 'Departamento', capital: 'Distrito Capital',
      units: 'km²'
    },
    en: {
      title: 'Paraguay, drawn by water',
      day: 'Day 26 · Water',
      lede: 'The Paraguay River splits the country into the Eastern Region and the Chaco. Every drop of rain that falls here reaches the Río de la Plata through the Paraguay or the Paraná.',
      mode_basins: 'Basins', mode_deps: 'Departments',
      hint: 'Tap anywhere on the map to follow a raindrop downstream.',
      notes_btn: 'Notes & sources', close: 'Close', map: 'Map',
      river: n => n === 'de la Plata' ? 'Río de la Plata' : `${n} River`,
      River: n => n === 'de la Plata' ? 'Río de la Plata' : `${n} River`,
      basin_of: n => `${n} River basin`,
      basin_direct: n => `Direct drainage of the ${n} River`,
      basin_streams: n => `Streams draining to the ${n}`,
      hybas: (id, pf) => `HydroBASINS level 6 · Pfafstetter ${pf}`,
      area: 'Area', area_py: 'In Paraguay', drains: 'Drains to', rivers_in: 'Named rivers',
      region: 'Region', reg: { oriental: 'Eastern', occidental: 'Western (Chaco)', ambas: 'Both banks of the Paraguay River' },
      official: 'Closest official unit',
      official_note: 'Resolution SEAM No. 376/12. Approximate match based on the rivers inside the basin; boundaries differ.',
      no_official: 'No direct match with the official units.',
      no_official_occ: 'Western Region (official units: Pilcomayo, Yacaré and Timané). No direct match.',
      drop_title: 'Path of the raindrop',
      drop_km: km => `≈ ${km} km`,
      drop_to_mouth: 'to the mouth of the Río de la Plata',
      drop_endo: 'to where the channel ends in the data (no outlet to the sea)',
      drop_end: 'to the end of the channel in the data',
      via: 'Rivers along the way', countries: 'Countries crossed',
      local: 'local streams (unnamed in the data)',
      border: (a, b) => `${a}–${b} (border)`,
      endo_note: 'In HydroRIVERS this channel ends in an area with no outlet to the sea (endorheic).',
      method_note: 'Traced along the HydroRIVERS flow direction. Groundwater and artificial canals are not considered.',
      outside: 'This point is outside the analysed area. Tap inside Paraguay or the basins that cross it.',
      department: 'Department', capital: 'Capital District',
      units: 'km²'
    }
  };

  const NOTES = {
    es: `
<h2>Paraguay, dibujado por el agua</h2>
<p>Este mapa redibuja Paraguay con sus cuencas hidrográficas en lugar de sus departamentos. Las cuencas son las de HydroBASINS (nivel 6) que tocan el país; muchas cruzan las fronteras, porque el agua no las sigue. Al tocar el mapa, el camino de una gota se calcula río abajo hasta la boca del Río de la Plata.</p>
<h3>Cómo se traza el camino</h3>
<ul>
<li>El punto tocado se asigna a la subcuenca HydroBASINS de nivel 12 que lo contiene y al tramo de HydroRIVERS más cercano dentro de ella (rejilla de 0,04°).</li>
<li>Desde allí se sigue el identificador del tramo siguiente aguas abajo (<code>NEXT_DOWN</code>) hasta el final de la red.</li>
<li>HydroRIVERS termina el Paraná en el delta; el último tramo por el Río de la Plata es una línea esquemática hasta la línea Punta Rasa–Punta del Este.</li>
<li>La distancia es la suma de las longitudes de los tramos, más la recta desde el punto tocado hasta el primer tramo. Es aproximada.</li>
<li>Los nombres de los ríos principales se asignaron a la red siguiendo cada río desde un punto aguas arriba; los demás cauces no tienen nombre en los datos.</li>
<li>Los países se obtienen del punto medio de cada tramo; cuando el tramo está a menos de 2 km de un límite, se cuenta como frontera.</li>
</ul>
<h3>Notas</h3>
<ul>
<li>Las cuencas y los ríos provienen de los datos globales de HydroSHEDS. Sus límites pueden no coincidir con la división oficial de cuencas del Paraguay.</li>
<li>El camino de la gota sigue la dirección de flujo de los datos de ríos. No considera aguas subterráneas ni canales artificiales.</li>
<li>En el Chaco el relieve es muy plano y el drenaje real cambia con las crecidas; los datos globales lo simplifican.</li>
</ul>
<h3>Unidades hidrográficas oficiales (Resolución SEAM N° 376/12)</h3>
<p>La Secretaría del Ambiente (hoy MADES) aprobó en 2012 estas unidades. En el mapa, cada cuenca muestra la unidad oficial más cercana cuando se puede relacionar por los ríos que contiene.</p>
__TABLE__
<h3>Fuentes</h3>
<ul>
<li>Cuencas: HydroBASINS v1c (HydroSHEDS), Sudamérica, nivel 6 y nivel 12. Lehner, B., Grill, G. (2013). Global river hydrography and network routing: baseline data and new approaches to study the world's large river systems. <i>Hydrological Processes</i>, 27(15), 2171–2186. <a href="https://doi.org/10.1002/hyp.9740">doi:10.1002/hyp.9740</a>. <a href="https://www.hydrosheds.org/">hydrosheds.org</a></li>
<li>Ríos: HydroRIVERS v1.0 (HydroSHEDS), Sudamérica. Misma cita.</li>
<li>Departamentos y límite nacional: geoBoundaries gbOpen PRY ADM0/ADM1 (fuente: Dirección General de Estadística, Encuestas y Censos, 2012), CC BY 4.0. Runfola, D. et al. (2020). geoBoundaries. <i>PLOS ONE</i> 15(4): e0231866.</li>
<li>Países vecinos y fondo: Natural Earth, 1:10m Admin 0 (dominio público).</li>
<li>División oficial: Resolución SEAM N° 376/12 «Por la cual se aprueba las unidades hidrográficas del Paraguay», en <a href="https://faolex.fao.org/docs/pdf/par126126.pdf">FAOLEX</a>.</li>
<li>Datos obtenidos el 8 de noviembre de 2026. Mapa: MapLibre GL JS. Tipografía de etiquetas: Noto Sans (OFL).</li>
</ul>`,
    en: `
<h2>Paraguay, drawn by water</h2>
<p>This map redraws Paraguay by its river basins instead of its departments. The basins are the HydroBASINS level-6 units that touch the country; many cross the borders, because water does not follow them. Tap the map and a raindrop is traced downstream to the mouth of the Río de la Plata.</p>
<h3>How the path is traced</h3>
<ul>
<li>The tapped point is assigned to the HydroBASINS level-12 sub-basin that contains it and to the nearest HydroRIVERS reach inside it (0.04° grid).</li>
<li>From there the ID of the next reach downstream (<code>NEXT_DOWN</code>) is followed to the end of the network.</li>
<li>HydroRIVERS ends the Paraná at its delta; the last leg across the Río de la Plata is a schematic line to the Punta Rasa–Punta del Este line.</li>
<li>The distance is the sum of reach lengths plus the straight line from the tapped point to the first reach. It is approximate.</li>
<li>Names of the main rivers were assigned by following each river from an upstream point; other channels have no name in the data.</li>
<li>Countries come from the midpoint of each reach; reaches within 2 km of a boundary are counted as border.</li>
</ul>
<h3>Notes</h3>
<ul>
<li>Basins and rivers come from the global HydroSHEDS data. Their boundaries may not match Paraguay's official basin division.</li>
<li>The raindrop path follows the flow direction of the river data. Groundwater and artificial canals are not considered.</li>
<li>The Chaco is very flat and its real drainage shifts with floods; global data simplify it.</li>
</ul>
<h3>Official hydrographic units (Resolution SEAM No. 376/12)</h3>
<p>Paraguay's Secretariat of the Environment (now MADES) approved these units in 2012. On the map, each basin shows the closest official unit when it can be linked through the rivers it contains.</p>
__TABLE__
<h3>Sources</h3>
<ul>
<li>Basins: HydroBASINS v1c (HydroSHEDS), South America, levels 6 and 12. Lehner, B., Grill, G. (2013). Global river hydrography and network routing: baseline data and new approaches to study the world's large river systems. <i>Hydrological Processes</i>, 27(15), 2171–2186. <a href="https://doi.org/10.1002/hyp.9740">doi:10.1002/hyp.9740</a>. <a href="https://www.hydrosheds.org/">hydrosheds.org</a></li>
<li>Rivers: HydroRIVERS v1.0 (HydroSHEDS), South America. Same citation.</li>
<li>Departments and national boundary: geoBoundaries gbOpen PRY ADM0/ADM1 (source: Dirección General de Estadística, Encuestas y Censos, 2012), CC BY 4.0. Runfola, D. et al. (2020). geoBoundaries. <i>PLOS ONE</i> 15(4): e0231866.</li>
<li>Neighbouring countries and background: Natural Earth, 1:10m Admin 0 (public domain).</li>
<li>Official division: Resolución SEAM N° 376/12 "Por la cual se aprueba las unidades hidrográficas del Paraguay", on <a href="https://faolex.fao.org/docs/pdf/par126126.pdf">FAOLEX</a>.</li>
<li>Data retrieved on 8 November 2026. Map: MapLibre GL JS. Label typeface: Noto Sans (OFL).</li>
</ul>`
  };

  // ------------------------------------------------------------------ state
  let lang = 'es';
  try {
    const q = new URLSearchParams(location.search).get('lang');
    lang = (q === 'en' || q === 'es') ? q : (localStorage.getItem('lang') || 'es');
    if (lang !== 'en') lang = 'es';
  } catch (e) { /* storage unavailable */ }
  let mode = 'cuencas';
  let net = null, grid = null, gridMeta = null;
  let lastClick = null, anim = null;

  const t = () => T[lang];
  const fmt = n => new Intl.NumberFormat(lang === 'es' ? 'es-PY' : 'en-US').format(n);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ------------------------------------------------------------------ map
  const BASIN_COLORS = ['#b4d0db', '#cfe1e7', '#a2c3d1', '#dce8ec', '#bfd7df', '#abc8d6', '#d4e4e9'];
  const style = {
    version: 8,
    glyphs: 'fonts/{fontstack}/{range}.pbf',
    sources: {},
    layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#cddbe1' } }],
    transition: { duration: REDUCED ? 0 : 700, delay: 0 }
  };
  const map = new maplibregl.Map({
    container: 'map', style, bounds: PY_BOUNDS,
    fitBoundsOptions: { padding: padding() }, minZoom: 3, maxZoom: 11,
    attributionControl: false, dragRotate: false, pitchWithRotate: false
  });
  map.touchZoomRotate.disableRotation();
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
  map.addControl(new maplibregl.AttributionControl({
    compact: true,
    customAttribution: 'HydroSHEDS (Lehner &amp; Grill 2013) · geoBoundaries (CC BY 4.0) · Natural Earth · SEAM Res. 376/12'
  }), 'bottom-right');

  function padding() {
    if (MOBILE()) return { top: 140, bottom: 40, left: 20, right: 20 };
    return { top: 40, bottom: 40, left: 400, right: 60 };
  }

  const getJSON = u => fetch(u).then(r => { if (!r.ok) throw new Error(u); return r.json(); });

  map.on('load', async () => {
    const [land, py, cuencas, deps, depLabels, rios, riosLab, network, gmeta, gbuf] = await Promise.all([
      getJSON('data/land.geojson'), getJSON('data/paraguay.geojson'), getJSON('data/cuencas.geojson'),
      getJSON('data/departamentos.geojson'), getJSON('data/departamentos_labels.geojson'),
      getJSON('data/rios.geojson'), getJSON('data/rios_labels.geojson'), getJSON('data/network.json'), getJSON('data/grid.json'),
      fetch('data/grid.bin').then(r => r.arrayBuffer())
    ]);
    net = network; gridMeta = gmeta; grid = new Int16Array(gbuf);

    map.addSource('land', { type: 'geojson', data: land });
    map.addSource('py', { type: 'geojson', data: py });
    map.addSource('mask', { type: 'geojson', data: maskOf(py) });
    map.addSource('cuencas', { type: 'geojson', data: cuencas, promoteId: 'id' });
    map.addSource('deps', { type: 'geojson', data: deps, generateId: true });
    map.addSource('deplabels', { type: 'geojson', data: depLabels });
    map.addSource('rios', { type: 'geojson', data: rios });
    map.addSource('rioslab', { type: 'geojson', data: riosLab });
    map.addSource('regions', { type: 'geojson', data: { type: 'FeatureCollection', features: [
      { type: 'Feature', properties: { k: 'occ' }, geometry: { type: 'Point', coordinates: [-60.4, -22.6] } },
      { type: 'Feature', properties: { k: 'ori' }, geometry: { type: 'Point', coordinates: [-55.75, -24.75] } }] } });
    map.addSource('route', { type: 'geojson', data: empty() });
    map.addSource('drop', { type: 'geojson', data: empty() });

    map.addLayer({ id: 'land', type: 'fill', source: 'land', paint: {
      'fill-color': ['match', ['get', 'iso'], 'PRY', '#f5f3ee', '#ebeae4'] } });
    map.addLayer({ id: 'land-line', type: 'line', source: 'land', paint: { 'line-color': '#b9bab2', 'line-width': 0.7 } });

    map.addLayer({ id: 'cuencas-fill', type: 'fill', source: 'cuencas', paint: {
      'fill-color': ['to-color', ['at', ['%', ['get', 'color'], BASIN_COLORS.length], ['literal', BASIN_COLORS]]],
      'fill-opacity': 0.92 } });
    map.addLayer({ id: 'deps-fill', type: 'fill', source: 'deps', paint: {
      'fill-color': '#ece4d4', 'fill-opacity': 0 } });
    map.addLayer({ id: 'mask', type: 'fill', source: 'mask', paint: { 'fill-color': '#f2f1ec', 'fill-opacity': 0.45 } });
    map.addLayer({ id: 'cuencas-line', type: 'line', source: 'cuencas', paint: {
      'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 1, 9, 2.2], 'line-opacity': 1 } });
    map.addLayer({ id: 'deps-line', type: 'line', source: 'deps', paint: {
      'line-color': '#8c7f6c', 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.8, 9, 1.6], 'line-opacity': 0 } });
    map.addLayer({ id: 'py-line', type: 'line', source: 'py', paint: { 'line-color': '#3d474c', 'line-width': 1.3 } });

    map.addLayer({ id: 'rios', type: 'line', source: 'rios', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: {
      'line-color': '#3f86ab',
      'line-width': ['interpolate', ['linear'], ['zoom'],
        5, ['match', ['get', 'cls'], 0, 0.35, 1, 0.7, 2, 1.2, 3, 1.9, 2.6],
        9, ['match', ['get', 'cls'], 0, 1, 1, 1.8, 2, 2.8, 3, 4, 5]] } });

    map.addLayer({ id: 'basin-sel', type: 'line', source: 'cuencas', paint: {
      'line-color': '#1f2a30', 'line-width': 2.2, 'line-opacity': ['case', ['boolean', ['feature-state', 'sel'], false], 1, 0] } });
    map.addLayer({ id: 'dep-sel', type: 'line', source: 'deps', paint: {
      'line-color': '#5a4a32', 'line-width': 2.2, 'line-opacity': ['case', ['boolean', ['feature-state', 'sel'], false], 1, 0] } });

    map.addLayer({ id: 'route-casing', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#ffffff', 'line-width': 6, 'line-opacity': 0.9 } });
    map.addLayer({ id: 'route', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': '#c4512b', 'line-width': 3 } });
    map.addLayer({ id: 'drop', type: 'circle', source: 'drop', paint: {
      'circle-radius': ['match', ['get', 'k'], 'start', 5, 6], 'circle-color': ['match', ['get', 'k'], 'start', '#ffffff', '#c4512b'],
      'circle-stroke-color': ['match', ['get', 'k'], 'start', '#c4512b', '#ffffff'], 'circle-stroke-width': 2 } });

    map.addLayer({ id: 'deps-label', type: 'symbol', source: 'deplabels', layout: {
      'text-field': ['get', 'name'], 'text-font': ['Noto Sans Medium'], 'text-size': ['interpolate', ['linear'], ['zoom'], 5, 10.5, 8, 14],
      'text-padding': 4, 'text-transform': 'uppercase', 'text-letter-spacing': 0.05, 'text-max-width': 7 },
      paint: { 'text-color': '#6b5d48', 'text-halo-color': '#f7f3ea', 'text-halo-width': 1.4, 'text-opacity': 0 } });
    map.addLayer({ id: 'regions-label', type: 'symbol', source: 'regions', maxzoom: 7.5, layout: {
      'text-field': regionLabel(), 'text-font': ['Noto Sans Medium'], 'text-size': 13, 'text-transform': 'uppercase',
      'text-letter-spacing': 0.25, 'text-max-width': 8, 'text-allow-overlap': true },
      paint: { 'text-color': '#2c5566', 'text-opacity': 0.75, 'text-halo-color': 'rgba(255,255,255,0.6)', 'text-halo-width': 1 } });
    map.addLayer({ id: 'rios-label', type: 'symbol', source: 'rioslab',
      filter: ['any', ['>=', ['get', 'cls'], 2], ['>=', ['zoom'], 6.2]],
      layout: { 'symbol-placement': 'line', 'text-field': riverLabel(), 'text-font': ['Noto Sans Italic'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 5, ['match', ['get', 'cls'], 4, 13, 5, 13, 3, 12, 11], 9, 15],
        'symbol-spacing': 260, 'text-letter-spacing': 0.04, 'text-max-angle': 60 },
      paint: { 'text-color': '#1f5d7d', 'text-halo-color': 'rgba(255,255,255,0.9)', 'text-halo-width': 1.5 } });

    map.getCanvas().style.cursor = 'crosshair';
    map.on('click', e => onClick(e.lngLat, e.point));
    const attrib = document.querySelector('.maplibregl-ctrl-attrib');
    if (attrib && MOBILE()) attrib.classList.remove('maplibregl-compact-show');
    applyMode(false);
    applyLang();
  });

  function empty() { return { type: 'FeatureCollection', features: [] }; }

  function maskOf(py) {
    const holes = [];
    for (const f of py.features) {
      const g = f.geometry;
      const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
      for (const p of polys) holes.push(p[0].slice().reverse());
    }
    return { type: 'Feature', properties: {}, geometry: { type: 'Polygon',
      coordinates: [[[-80, -50], [-30, -50], [-30, 0], [-80, 0], [-80, -50]], ...holes] } };
  }

  function riverLabel() {
    return lang === 'es'
      ? ['case', ['==', ['get', 'name'], 'de la Plata'], 'Río de la Plata', ['concat', 'Río ', ['get', 'name']]]
      : ['case', ['==', ['get', 'name'], 'de la Plata'], 'Río de la Plata', ['concat', ['get', 'name'], ' River']];
  }

  function regionLabel() {
    return ['match', ['get', 'k'], 'occ', lang === 'es' ? 'Región Occidental\nChaco' : 'Western Region\nChaco',
      lang === 'es' ? 'Región Oriental' : 'Eastern Region'];
  }

  // ------------------------------------------------------------------ mode
  function applyMode(userAction) {
    document.querySelectorAll('.toggle button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.mode === mode)));
    if (!map.getLayer('cuencas-fill')) return;
    const c = mode === 'cuencas';
    map.setPaintProperty('cuencas-fill', 'fill-opacity', c ? 0.92 : 0);
    map.setPaintProperty('cuencas-line', 'line-opacity', c ? 1 : 0);
    map.setPaintProperty('deps-fill', 'fill-opacity', c ? 0 : 0.9);
    map.setPaintProperty('deps-line', 'line-opacity', c ? 0 : 1);
    map.setPaintProperty('deps-label', 'text-opacity', c ? 0 : 1);
    map.setPaintProperty('mask', 'fill-opacity', c ? 0.45 : 0.7);
    if (userAction && lastClick) onClick(lastClick, null, true);
  }
  document.querySelectorAll('.toggle button').forEach(b => b.addEventListener('click', () => {
    if (mode === b.dataset.mode) return;
    mode = b.dataset.mode; applyMode(true);
  }));

  // ------------------------------------------------------------------ language
  function applyLang() {
    document.documentElement.lang = lang;
    document.title = t().title;
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t()[el.dataset.i18n]; });
    document.querySelectorAll('.lang button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    document.querySelectorAll('.close').forEach(b => b.setAttribute('aria-label', t().close));
    document.getElementById('map').setAttribute('aria-label', t().map);
    if (map.getLayer('rios-label')) map.setLayoutProperty('rios-label', 'text-field', riverLabel());
    if (map.getLayer('regions-label')) map.setLayoutProperty('regions-label', 'text-field', regionLabel());
    if (lastClick && !document.getElementById('panel').hidden) onClick(lastClick, null, true);
    renderNotes();
  }
  document.querySelectorAll('.lang button').forEach(b => b.addEventListener('click', () => {
    lang = b.dataset.lang;
    try { localStorage.setItem('lang', lang); } catch (e) { /* ignore */ }
    applyLang();
  }));

  // ------------------------------------------------------------------ notes
  const dlg = document.getElementById('notes');
  function renderNotes() {
    const row = ([n, a]) => `<tr><td>${esc(n)}</td><td class="n">${fmt(a)}</td></tr>`;
    const head = lang === 'es' ? ['Región Oriental', 'Región Occidental', 'Unidad', 'km²'] : ['Eastern Region', 'Western Region', 'Unit', 'km²'];
    const table = `<table><thead><tr><th>${head[2]}</th><th class="n">${head[3]}</th></tr></thead><tbody>
      <tr><th colspan="2">${head[0]}</th></tr>${OFFICIAL.oriental.map(row).join('')}
      <tr><th colspan="2">${head[1]}</th></tr>${OFFICIAL.occidental.map(row).join('')}</tbody></table>`;
    document.getElementById('notes-body').innerHTML = NOTES[lang].replace('__TABLE__', table);
  }
  document.getElementById('open-notes').addEventListener('click', () => dlg.showModal());
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });

  // ------------------------------------------------------------------ panel
  const panel = document.getElementById('panel');
  const panelBody = document.getElementById('panel-body');
  let selBasin = null, selDep = null;
  document.getElementById('panel-close').addEventListener('click', () => {
    panel.hidden = true; document.body.classList.remove('has-panel');
    stopAnim(); map.getSource('route').setData(empty()); map.getSource('drop').setData(empty());
    setSel(null, null); lastClick = null;
    map.fitBounds(PY_BOUNDS, { padding: padding(), duration: REDUCED ? 0 : 900 });
  });

  function setSel(basinId, depId) {
    if (selBasin !== null) map.setFeatureState({ source: 'cuencas', id: selBasin }, { sel: false });
    if (selDep !== null) map.setFeatureState({ source: 'deps', id: selDep }, { sel: false });
    selBasin = basinId; selDep = depId;
    if (basinId !== null && basinId !== undefined) map.setFeatureState({ source: 'cuencas', id: basinId }, { sel: true });
    if (depId !== null && depId !== undefined) map.setFeatureState({ source: 'deps', id: depId }, { sel: true });
  }

  function basinTitle(p) {
    const L = t();
    if (p.main && p.main !== 'Paraguay' && p.main !== 'Paraná') return L.basin_of(p.main);
    if (p.main) return L.basin_direct(p.main);
    return L.basin_streams(L.river(p.drains_to));
  }

  function basinHTML(p) {
    const L = t();
    const rivers = p.rivers ? p.rivers.split('|') : [];
    const official = p.official ? p.official.split('|') : [];
    const chain = [p.drains_to];
    if (p.drains_to === 'Paraguay') chain.push('Paraná');
    if (chain[chain.length - 1] !== 'de la Plata') chain.push('de la Plata');
    let offHTML;
    if (official.length) {
      const tot = official.reduce((s, n) => s + (OFFICIAL_AREA[n] || 0), 0);
      offHTML = `<p>${official.map(esc).join(', ')} <span class="sub">(${fmt(tot)} ${L.units})</span></p><p class="sub">${L.official_note}</p>`;
    } else {
      offHTML = `<p class="sub">${p.region === 'occidental' ? L.no_official_occ : L.no_official}</p>`;
    }
    return `<h2>${esc(basinTitle(p))}</h2>
      <p class="sub">${L.hybas(p.id, p.pfaf)}</p>
      <dl>
        <dt>${L.area}</dt><dd>${fmt(p.area_km2)} ${L.units}</dd>
        <dt>${L.area_py}</dt><dd>${fmt(p.area_py_km2)} ${L.units}</dd>
        <dt>${L.drains}</dt><dd>${chain.map(n => esc(L.river(n))).join(' → ')}</dd>
        ${rivers.length ? `<dt>${L.rivers_in}</dt><dd>${rivers.map(esc).join(', ')}</dd>` : ''}
        <dt>${L.region}</dt><dd>${L.reg[p.region]}</dd>
      </dl>
      <h3>${L.official}</h3>${offHTML}`;
  }

  function depHTML(p) {
    const L = t();
    return `<h2>${esc(p.name)}</h2><p class="sub">${p.capital ? L.capital : L.department}</p>
      <dl><dt>${L.area}</dt><dd>${fmt(p.area_km2)} ${L.units}</dd></dl>`;
  }

  // ------------------------------------------------------------------ tracing
  function decode(d) {
    const out = []; let x = 0, y = 0;
    for (let i = 0; i < d.length; i += 2) { x += d[i]; y += d[i + 1]; out.push([x / 1000, y / 1000]); }
    return out;
  }

  function hav(a, b) {
    const R = 6371, r = Math.PI / 180;
    const dLat = (b[1] - a[1]) * r, dLon = (b[0] - a[0]) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  function trace(lngLat) {
    const g = gridMeta;
    const col = Math.floor((lngLat.lng - g.x0) / g.res), row = Math.floor((g.y1 - lngLat.lat) / g.res);
    if (col < 0 || row < 0 || col >= g.nx || row >= g.ny) return null;
    let s = grid[row * g.nx + col];
    if (s < 0) return null;
    const start = [lngLat.lng, lngLat.lat];
    const coords = [start];
    const steps = [];
    let guard = 0, last = s;
    while (s >= 0 && guard++ < 20000) {
      const seg = net.segs[s];
      const c = decode(seg[6]);
      for (const p of c) coords.push(p);
      steps.push({ len: seg[1], name: seg[3] >= 0 ? net.names[seg[3]] : null, cc: seg[4] >= 0 ? net.countries[seg[4]] : '', endo: seg[5] });
      last = s; s = seg[0];
    }
    const lead = hav(start, coords[1]);
    if (steps.length) steps[0].len += lead;
    const total = steps.reduce((a, b) => a + b.len, 0);
    const end = last === net.plata ? 'mouth' : (net.segs[last][5] ? 'endo' : 'end');
    return { coords, steps, total, end };
  }

  function stretches(steps) {
    const out = [];
    for (const st of steps) {
      const prev = out[out.length - 1];
      if (prev && prev.name === st.name) prev.len += st.len; else out.push({ name: st.name, len: st.len });
    }
    return out;
  }

  function countrySeq(steps) {
    const runs = [];
    for (const st of steps) {
      const prev = runs[runs.length - 1];
      if (prev && prev.cc === st.cc) prev.len += st.len; else runs.push({ cc: st.cc, len: st.len });
    }
    // each country or border in the order it is first reached
    const seen = [];
    for (const r of runs) if (r.cc && !seen.includes(r.cc)) seen.push(r.cc);
    return seen;
  }

  function countryLabel(cc) {
    const names = cc.split('/').map(c => (net.country_names[c] || {})[lang] || c);
    if (names.length === 1) return names[0];
    // put Paraguay first when present
    names.sort((a, b) => (a === 'Paraguay' ? -1 : b === 'Paraguay' ? 1 : a.localeCompare(b)));
    return names.length === 2 ? t().border(names[0], names[1]) : names.join('–');
  }

  function routeHTML(r) {
    const L = t();
    const km = fmt(Math.round(r.total / 10) * 10);
    const where = r.end === 'mouth' ? L.drop_to_mouth : r.end === 'endo' ? L.drop_endo : L.drop_end;
    const items = stretches(r.steps).filter(s => s.len >= 1 || s.name).map(s =>
      `<li>${esc(s.name ? L.River(s.name) : L.local)} <span class="km">${fmt(Math.round(s.len))} km</span></li>`).join('');
    const cs = countrySeq(r.steps);
    const distinct = [...new Set(cs.flatMap(c => c.split('/')))].map(c => (net.country_names[c] || {})[lang] || c);
    return `<h2>${L.drop_title}</h2>
      <p class="big">${L.drop_km(km)} <small>${where}</small></p>
      <h3>${L.via}</h3><ul class="path">${items}</ul>
      <h3>${L.countries}</h3>
      <p>${distinct.map(esc).join(', ')}</p>
      <div class="chips">${cs.map(c => `<span class="chip">${esc(countryLabel(c))}</span>`).join('<span aria-hidden="true">→</span>')}</div>
      ${r.end === 'endo' ? `<p class="note">${L.endo_note}</p>` : ''}
      <p class="note">${L.method_note}</p>`;
  }

  function onClick(lngLat, point, silent) {
    if (!net) return;
    lastClick = lngLat;
    const pt = point || map.project(lngLat);
    const bf = map.queryRenderedFeatures(pt, { layers: ['cuencas-fill'] })[0];
    const df = map.queryRenderedFeatures(pt, { layers: ['deps-fill'] })[0];
    const r = trace(lngLat);
    let html = r ? routeHTML(r) : `<p class="note">${t().outside}</p>`;
    if (mode === 'cuencas' && bf) { html += '<hr>' + basinHTML(bf.properties); setSel(bf.id, null); }
    else if (mode === 'departamentos' && df) { html += '<hr>' + depHTML(df.properties); setSel(null, df.id); }
    else setSel(null, null);
    panelBody.innerHTML = html;
    panel.hidden = false; document.body.classList.add('has-panel');
    if (silent) return;
    panel.scrollTop = 0;
    stopAnim();
    if (r) drawRoute(r.coords);
    else { map.getSource('route').setData(empty()); map.getSource('drop').setData(empty()); }
  }

  function stopAnim() { if (anim) cancelAnimationFrame(anim); anim = null; }

  function line(c) { return { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: c } }; }
  function pts(start, head) {
    const f = [{ type: 'Feature', properties: { k: 'start' }, geometry: { type: 'Point', coordinates: start } }];
    if (head) f.push({ type: 'Feature', properties: { k: 'head' }, geometry: { type: 'Point', coordinates: head } });
    return { type: 'FeatureCollection', features: f };
  }

  function drawRoute(coords) {
    const b = coords.reduce((bb, c) => bb.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0]));
    const pad = MOBILE()
      ? { top: 160, bottom: Math.round(window.innerHeight * 0.48), left: 30, right: 30 }
      : { top: 50, bottom: 50, left: 400, right: 410 };
    map.fitBounds(b, { padding: pad, duration: REDUCED ? 0 : 1100, maxZoom: 8 });
    const src = map.getSource('route'), dsrc = map.getSource('drop');
    if (REDUCED) { src.setData(line(coords)); dsrc.setData(pts(coords[0], coords[coords.length - 1])); return; }
    const cum = [0];
    for (let i = 1; i < coords.length; i++) cum.push(cum[i - 1] + hav(coords[i - 1], coords[i]));
    const total = cum[cum.length - 1] || 1;
    const dur = Math.min(5200, 1800 + total * 1.6);
    const t0 = performance.now();
    let i = 1;
    const frame = now => {
      const k = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - k, 2);
      const d = e * total;
      while (i < coords.length - 1 && cum[i] < d) i++;
      const a = coords[i - 1], bpt = coords[i];
      const seg = cum[i] - cum[i - 1] || 1;
      const f = Math.max(0, Math.min(1, (d - cum[i - 1]) / seg));
      const head = [a[0] + (bpt[0] - a[0]) * f, a[1] + (bpt[1] - a[1]) * f];
      src.setData(line(coords.slice(0, i).concat([head])));
      dsrc.setData(pts(coords[0], head));
      anim = k < 1 ? requestAnimationFrame(frame) : null;
    };
    anim = requestAnimationFrame(frame);
  }

  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !panel.hidden && !dlg.open) document.getElementById('panel-close').click();
  });
})();
