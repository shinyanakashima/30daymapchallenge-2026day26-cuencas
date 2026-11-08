"""Build the web data files in site/data from HydroSHEDS, geoBoundaries and Natural Earth.

Usage: python3 scripts/build_data.py RAW_DIR
RAW_DIR must contain:
  hybas/hybas_sa_lev06_v1c.shp, hybas/hybas_sa_lev12_v1c.shp   (HydroBASINS v1c, South America)
  rivers/HydroRIVERS_v10_sa_shp/HydroRIVERS_v10_sa.shp           (HydroRIVERS v1.0, South America)
  geoBoundaries-PRY-ADM0_simplified.geojson, geoBoundaries-PRY-ADM1_simplified.geojson
  ne/c/ne_10m_admin_0_countries.shp                              (Natural Earth 10m)
"""
import sys, json, warnings
warnings.filterwarnings('ignore')
from pathlib import Path
import numpy as np, pandas as pd, geopandas as gpd
from shapely.geometry import Point, LineString, mapping
from shapely.ops import linemerge

RAW = Path(sys.argv[1])
OUT = Path(__file__).resolve().parent.parent / 'site' / 'data'
OUT.mkdir(parents=True, exist_ok=True)
EA = 'ESRI:102033'  # South America Albers Equal Area

def wgs(p): return gpd.read_file(p).to_crs(4326)

# ---------------------------------------------------------------- boundaries
pry_df = wgs(RAW / 'geoBoundaries-PRY-ADM0_simplified.geojson')
pry = pry_df.geometry.iloc[0]
DEP = {'ASUNCION': 'Asunción', 'CONCEPCION': 'Concepción', 'SAN PEDRO': 'San Pedro', 'CORDILLERA': 'Cordillera',
       'GUAIRA': 'Guairá', 'CAAGUAZU': 'Caaguazú', 'CAAZAPA': 'Caazapá', 'ITAPUA': 'Itapúa', 'MISIONES': 'Misiones',
       'PARAGUARI': 'Paraguarí', 'ALTO PARANA': 'Alto Paraná', 'CENTRAL': 'Central', 'ÑEEMBUCU': 'Ñeembucú',
       'AMAMBAY': 'Amambay', 'CANINDEYU': 'Canindeyú', 'PRESIDENTE HAYES': 'Presidente Hayes',
       'BOQUERON': 'Boquerón', 'ALTO PARAGUAY': 'Alto Paraguay'}
dep = wgs(RAW / 'geoBoundaries-PRY-ADM1_simplified.geojson')
dep['name'] = dep.shapeName.map(DEP)
dep['area_km2'] = (dep.to_crs(EA).area / 1e6).round(0).astype(int)
dep['capital'] = dep.shapeName == 'ASUNCION'
dep['geometry'] = dep.geometry.simplify(0.003, preserve_topology=True)
dep[['name', 'area_km2', 'capital', 'geometry']].to_file(OUT / 'departamentos.geojson', driver='GeoJSON',
                                                           COORDINATE_PRECISION=4)
lab = dep.copy(); lab['geometry'] = dep.representative_point()
lab[['name', 'capital', 'geometry']].to_file(OUT / 'departamentos_labels.geojson', driver='GeoJSON',
                                              COORDINATE_PRECISION=4)

pry_out = pry_df[['geometry']].copy(); pry_out['geometry'] = pry_out.simplify(0.002, preserve_topology=True)
pry_out.to_file(OUT / 'paraguay.geojson', driver='GeoJSON', COORDINATE_PRECISION=4)

ctry = gpd.read_file(RAW / 'ne/c/ne_10m_admin_0_countries.shp', bbox=(-75, -45, -35, -5)).to_crs(4326)
ctry = ctry[ctry.ADM0_A3.isin(['ARG', 'BOL', 'BRA', 'PRY', 'URY', 'CHL', 'PER'])].copy()
ctry = ctry.rename(columns={'ADM0_A3': 'iso', 'NAME_ES': 'name_es', 'NAME_EN': 'name_en'})
land = ctry.copy(); land['geometry'] = land.clip((-75, -45, -35, -5)).simplify(0.01, preserve_topology=True)
land[['iso', 'name_es', 'name_en', 'geometry']].to_file(OUT / 'land.geojson', driver='GeoJSON', COORDINATE_PRECISION=3)
COUNTRIES = {r.iso: {'es': r.name_es, 'en': r.name_en} for r in ctry.itertuples()}
ctry_ea = ctry.to_crs(EA)

# ---------------------------------------------------------------- rivers
riv = gpd.read_file(RAW / 'rivers/HydroRIVERS_v10_sa_shp/HydroRIVERS_v10_sa.shp', bbox=(-68, -38, -43, -12))
nd = dict(zip(riv.HYRIV_ID, riv.NEXT_DOWN))
up = dict(zip(riv.HYRIV_ID, riv.UPLAND_SKM))
rv = riv.set_index('HYRIV_ID')

# Named rivers: an upstream seed point is snapped to the network and followed downstream until it
# reaches a river that has already been named (largest rivers first).
SEEDS = [
    ('Paraná', -51.05, -20.10, 300000), ('Paraguay', -57.70, -16.10, 20000),
    ('Pilcomayo', -63.50, -21.27, 40000), ('Bermejo', -64.15, -23.10, 15000),
    ('Iguazú', -53.80, -25.60, 40000), ('Salado', -61.20, -29.80, 30000),
    ('Paranapanema', -51.50, -22.62, 50000), ('Tietê', -50.30, -21.00, 50000),
    ('Grande', -49.50, -20.10, 80000), ('Paranaíba', -50.50, -19.00, 80000),
    ('Ivaí', -52.70, -23.60, 15000), ('Ivinhema', -53.50, -22.40, 15000),
    ('Cuiabá', -56.40, -16.30, 15000), ('Taquari', -56.20, -18.70, 15000),
    ('Miranda', -56.80, -20.00, 10000), ('Apa', -56.80, -22.15, 3000),
    ('Aquidabán', -56.80, -22.85, 3000), ('Ypané', -56.60, -23.40, 3000),
    ('Jejuí Guazú', -56.30, -24.15, 5000), ('Manduvirá', -57.00, -24.95, 2000),
    ('Tebicuary', -56.70, -26.55, 5000), ('Monday', -54.90, -25.60, 2000),
    ('Acaray', -54.90, -25.30, 1500),
]
name = {}
for nm, lon, lat, mu in SEEDS:
    c = riv[riv.UPLAND_SKM >= mu]
    x = c.loc[c.to_crs(EA).distance(gpd.GeoSeries([Point(lon, lat)], crs=4326).to_crs(EA).iloc[0]).idxmin(), 'HYRIV_ID']
    while x in nd and x not in name:
        name[x] = nm
        x = nd[x]
PARANA_OUTLET = [k for k, v in name.items() if v == 'Paraná' and nd[k] == 0][0]

# Río de la Plata: HydroRIVERS treats the estuary as sea, so a schematic centreline is added from the
# Paraná outlet to the line Punta Rasa (Cabo San Antonio) - Punta del Este.
p0 = rv.loc[PARANA_OUTLET].geometry.coords[-1]
plata = LineString([p0, (-58.40, -34.12), (-58.05, -34.45), (-57.55, -34.70), (-56.90, -34.95),
                    (-56.20, -35.20), (-55.83, -35.64)])
PLATA_KM = round(gpd.GeoSeries([plata], crs=4326).to_crs(EA).length.iloc[0] / 1000)

# ---------------------------------------------------------------- level-6 basins
b6 = gpd.read_file(RAW / 'hybas/hybas_sa_lev06_v1c.shp', bbox=pry.bounds).to_crs(4326)
b6 = b6[b6.intersects(pry)].copy()
b6['area_py'] = (b6.geometry.intersection(pry).to_crs(EA).area / 1e6)
b6 = b6[b6.area_py >= 50].copy()   # drop slivers that only touch the border
aoi = b6.union_all()

# ---------------------------------------------------------------- tap grid -> network segment
b12 = gpd.read_file(RAW / 'hybas/hybas_sa_lev12_v1c.shp', bbox=aoi.bounds).to_crs(4326)
b12 = b12[b12.intersects(aoi)][['HYBAS_ID', 'geometry']]
RES = 0.04
x0, y0, x1, y1 = aoi.bounds
x0 = float(np.floor(x0 / RES) * RES); y1 = float(np.ceil(y1 / RES) * RES)
NX = int(np.ceil((x1 - x0) / RES)); NY = int(np.ceil((y1 - y0) / RES))
X, Y = np.meshgrid(x0 + (np.arange(NX) + .5) * RES, y1 - (np.arange(NY) + .5) * RES)
pts = gpd.GeoDataFrame({'i': np.arange(X.size)}, geometry=gpd.points_from_xy(X.ravel(), Y.ravel()), crs=4326)
pts = pts[pts.within(aoi)]
pts = gpd.sjoin(pts, b12, predicate='within').drop_duplicates('i').drop(columns='index_right')
segs = riv[['HYRIV_ID', 'HYBAS_L12', 'geometry']].to_crs(EA)
near = gpd.sjoin_nearest(pts.to_crs(EA), segs, how='left').drop_duplicates('i')
same = near.HYBAS_ID == near.HYBAS_L12
outlet_l12 = riv.sort_values('UPLAND_SKM').drop_duplicates('HYBAS_L12', keep='last').set_index('HYBAS_L12').HYRIV_ID
near['seg'] = np.where(same, near.HYRIV_ID, near.HYBAS_ID.map(outlet_l12))
near['seg'] = near.seg.fillna(near.HYRIV_ID).astype(np.int64)

T = 300  # km2: smallest upstream area kept in the tracing network
def entry(s):
    while up[s] < T and nd[s] in nd: s = nd[s]
    return s
near['entry'] = near.seg.map(entry)
net = set()
for s in near.entry.unique():
    while s not in net:
        net.add(s)
        if nd[s] not in nd: break
        s = nd[s]

# country of each network segment (both when it runs along a border)
nseg = rv.loc[sorted(net)].copy()
mid = gpd.GeoSeries(nseg.geometry.interpolate(0.5, normalized=True), crs=4326).to_crs(EA)
buf = gpd.GeoDataFrame({'HYRIV_ID': nseg.index}, geometry=mid.buffer(2000).values, crs=EA)
cj = gpd.sjoin(buf, ctry_ea[['iso', 'geometry']], predicate='intersects')
cmap = cj.groupby('HYRIV_ID').iso.apply(lambda s: '/'.join(sorted(set(s))))
ISO_LIST = sorted(set('/'.join(cmap.values).split('/')))
CC = sorted(set(cmap.values) | {'ARG/URY'})

names_list = sorted(set(name.values()) | {'de la Plata'})
order = list(nseg.index)
idx = {h: i for i, h in enumerate(order)}
seg_out = []
for h in order:
    r = nseg.loc[h]
    g = r.geometry.simplify(0.004)
    q = np.round(np.array(g.coords) * 1000).astype(int)
    d = np.vstack([q[:1], np.diff(q, axis=0)]).ravel().tolist()
    seg_out.append([idx.get(r.NEXT_DOWN, -1), round(float(r.LENGTH_KM), 1), round(float(r.DIST_DN_KM), 1),
                    names_list.index(name[h]) if h in name else -1, CC.index(cmap.get(h, '')) if h in cmap else -1,
                    int(r.ENDORHEIC), d])
plata_idx = len(seg_out)
q = np.round(np.array(plata.coords) * 1000).astype(int)
seg_out.append([-1, PLATA_KM, 0, names_list.index('de la Plata'), CC.index('ARG/URY'), 0,
                np.vstack([q[:1], np.diff(q, axis=0)]).ravel().tolist()])
seg_out[idx[PARANA_OUTLET]][0] = plata_idx
network = {'names': names_list, 'countries': CC, 'country_names': COUNTRIES, 'plata_km': PLATA_KM,
           'plata': plata_idx, 'segs': seg_out}
(OUT / 'network.json').write_text(json.dumps(network, ensure_ascii=False, separators=(',', ':')))

grid = np.full(NX * NY, -1, dtype=np.int16)
assert len(order) < 32767
grid[near.i.values] = near.entry.map(idx).values
(OUT / 'grid.bin').write_bytes(grid.astype('<i2').tobytes())
(OUT / 'grid.json').write_text(json.dumps({'x0': x0, 'y1': y1, 'res': RES, 'nx': NX, 'ny': NY}))

# ---------------------------------------------------------------- basin attributes
riv_mid = gpd.GeoDataFrame(riv[['HYRIV_ID', 'UPLAND_SKM']],
                           geometry=riv.geometry.interpolate(0.5, normalized=True), crs=4326)
bj = gpd.sjoin(riv_mid, b6[['HYBAS_ID', 'UP_AREA', 'geometry']], predicate='within')
bj = bj[bj.UPLAND_SKM <= bj.UP_AREA * 1.05]   # ignore rivers that only pass through the basin
b_outlet = bj.sort_values('UPLAND_SKM').drop_duplicates('HYBAS_ID', keep='last').set_index('HYBAS_ID').HYRIV_ID

# Official hydrographic units (Resolución SEAM N° 376/12) that can be tied to a traced river.
OFFICIAL_BY_RIVER = {'Apa': ['Apa y Tagatiya'], 'Aquidabán': ['Aquidabán'], 'Ypané': ['Ypané'],
                     'Jejuí Guazú': ['Jejuí Guazú'], 'Manduvirá': ['Manduvirá'],
                     'Tebicuary': ['Tebicuary Cuenca Alta', 'Tebicuary Cuenca Media', 'Tebicuary Cuenca Baja'],
                     'Pilcomayo': ['Río Pilcomayo']}
bj['name'] = bj.HYRIV_ID.map(name)
named_in = bj.dropna(subset=['name']).sort_values('UPLAND_SKM', ascending=False).groupby('HYBAS_ID').name.apply(
    lambda s: list(dict.fromkeys(s)))
chaco = dep[dep.shapeName.isin(['PRESIDENTE HAYES', 'BOQUERON', 'ALTO PARAGUAY'])].union_all()
rows = []
for b in b6.itertuples():
    o = b_outlet.get(b.HYBAS_ID)
    main = name.get(o); s = o; drains = None
    while s in nd:
        n = name.get(s)
        if n and n != main: drains = n; break
        s = nd[s]
    if drains is None and main != 'Paraná' and o is not None: drains = 'Paraná'
    if drains is None: drains = 'de la Plata'
    rivers = named_in.get(b.HYBAS_ID, [])
    py_part = b.geometry.intersection(pry)
    share = py_part.intersection(chaco).area / py_part.area
    region = 'occidental' if share > 0.95 else ('oriental' if share < 0.05 else 'ambas')
    official = [u for rn in rivers for u in OFFICIAL_BY_RIVER.get(rn, [])
                if (rn == 'Pilcomayo') == (region == 'occidental') or region == 'ambas']
    if region != 'occidental' and ('Paraná' in rivers or main in ('Paraná', 'Monday', 'Acaray')):
        official.append('Áreas de influencia de Itaipú y Yacyretá')
    rows.append({'id': int(b.HYBAS_ID), 'pfaf': int(b.PFAF_ID), 'area_km2': int(round(b.SUB_AREA)),
                 'area_py_km2': int(round(b.area_py)), 'main': main or '', 'drains_to': drains or '',
                 'endo': int(b.ENDO), 'region': region,
                 'rivers': '|'.join(rivers), 'official': '|'.join(official)})
attr = pd.DataFrame(rows)
b6o = b6[['HYBAS_ID', 'geometry']].rename(columns={'HYBAS_ID': 'id'}).merge(attr, on='id')
b6o['geometry'] = b6o.geometry.simplify(0.005, preserve_topology=True)
# alternate colour index so that neighbours differ (greedy colouring)
adj = gpd.sjoin(b6o[['id', 'geometry']], b6o[['id', 'geometry']], predicate='touches')
col = {}
for i in b6o.sort_values('area_km2', ascending=False).id:
    used = {col.get(j) for j in adj[adj.id_left == i].id_right}
    col[i] = next(k for k in range(10) if k not in used)
b6o['color'] = b6o.id.map(col)
b6o.to_file(OUT / 'cuencas.geojson', driver='GeoJSON', COORDINATE_PRECISION=4)

# ---------------------------------------------------------------- rivers to display
disp = riv[(riv.UPLAND_SKM >= 2500) & riv.intersects(gpd.GeoSeries([Point(0,0)]).iloc[0].buffer(0).union(__import__('shapely').geometry.box(-67, -36, -46, -14)))].copy()
disp['name'] = disp.HYRIV_ID.map(name).fillna('')
disp['cls'] = pd.cut(disp.UPLAND_SKM, [0, 5000, 20000, 100000, 500000, 1e9], labels=False)
parts = []
for (nm, cl), g in disp.groupby(['name', 'cls']):
    m = linemerge(list(g.geometry))
    for ln in (m.geoms if m.geom_type == 'MultiLineString' else [m]):
        parts.append({'name': nm, 'cls': int(cl), 'geometry': ln.simplify(0.006)})
pl = gpd.GeoDataFrame(parts, crs=4326)
pl = pd.concat([pl, gpd.GeoDataFrame([{'name': 'de la Plata', 'cls': 5, 'geometry': plata}], crs=4326)])
pl.to_file(OUT / 'rios.geojson', driver='GeoJSON', COORDINATE_PRECISION=4)
def chaikin(ln, n=3):
    c = np.array(ln.coords)
    for _ in range(n):
        if len(c) < 3: break
        q = 0.75 * c[:-1] + 0.25 * c[1:]; r = 0.25 * c[:-1] + 0.75 * c[1:]
        c = np.vstack([c[:1], np.column_stack([q, r]).reshape(-1, 2), c[-1:]])
    return LineString(c)


# smoothed lines used only to place river names
lab = []
for nm, g in pl[pl.name != ''].groupby('name'):
    m = linemerge(list(g.geometry))
    for ln in (m.geoms if m.geom_type == 'MultiLineString' else [m]):
        tol = 0.12 if g.cls.max() >= 3 else 0.04
        lab.append({'name': nm, 'cls': int(g.cls.max()), 'geometry': chaikin(ln.simplify(tol))})
gpd.GeoDataFrame(lab, crs=4326).to_file(OUT / 'rios_labels.geojson', driver='GeoJSON', COORDINATE_PRECISION=3)

summary = {'basins': len(b6o), 'network_segments': len(seg_out), 'grid': [NX, NY, int((grid >= 0).sum())],
           'plata_km': PLATA_KM, 'basins_with_official': int((attr.official != '').sum())}
print(json.dumps(summary))
print(attr.sort_values('area_py_km2', ascending=False).to_string())
