import json
import subprocess

print("Cargando datos nuevos (API)...")
with open("datos_bi_api.json", "r") as f:
    api_data = json.load(f)

print("Cargando datos viejos (Excel) desde git...")
result = subprocess.run(
    ["git", "show", "HEAD~1:datos.json"],
    capture_output=True, text=True, cwd=r"C:\Users\Tayko\Desktop\OPENCODE\Proyecto1"
)
old_data = json.loads(result.stdout)

# Build lookup: BI code -> ATSA data + tuerca
bi_to_atsa = {}
bi_to_tuerca = {}
for r in old_data:
    bi = r.get("birlo_bi", "")
    if bi:
        if r.get("atsa") and bi not in bi_to_atsa:
            bi_to_atsa[bi] = r["atsa"]
        if r.get("tuerca_recomendada") and bi not in bi_to_tuerca:
            bi_to_tuerca[bi] = r["tuerca_recomendada"]

print(f"BI codes with ATSA: {len(bi_to_atsa)}")
print(f"BI codes with tuerca: {len(bi_to_tuerca)}")

# Build set of (marca, modelo) already in API data
api_pairs = set()
for r in api_data:
    m = r["vehiculo"]["marca"]
    mo = r["vehiculo"]["modelo"]
    if m and mo:
        api_pairs.add((m.upper(), mo.upper()))

# Find old records with (marca, modelo) NOT in API
lost_records = []
for r in old_data:
    m = (r.get("vehiculo", {}) or {}).get("marca", "").upper()
    mo = (r.get("vehiculo", {}) or {}).get("modelo", "").upper()
    if m and mo and (m, mo) not in api_pairs:
        lost_records.append(r)

print(f"Registros perdidos a recuperar: {len(lost_records)}")

# Build new dataset from API
new_data = []
for r in api_data:
    bi = r["birlo_bi"]
    record = {
        "vehiculo": {
            "marca": r["vehiculo"]["marca"],
            "modelo": r["vehiculo"]["modelo"],
            "anio": r["vehiculo"]["anio"],
            "posicion": r["vehiculo"]["posicion"]
        },
        "birlo_bi": bi,
        "tuerca_recomendada": bi_to_tuerca.get(bi, ""),
        "atsa": bi_to_atsa.get(bi, None)
    }
    new_data.append(record)

# Add lost records from old data
for r in lost_records:
    bi = r.get("birlo_bi", "")
    record = {
        "vehiculo": r["vehiculo"],
        "birlo_bi": bi,
        "tuerca_recomendada": bi_to_tuerca.get(bi, r.get("tuerca_recomendada", "")),
        "atsa": r.get("atsa", None)
    }
    new_data.append(record)

# Also add old records whose BI code is NOT in API (but their pair might be)
old_extra_bis = set(r["birlo_bi"] for r in old_data if r.get("birlo_bi")) - set(r["birlo_bi"] for r in api_data)
old_bi_extra = [r for r in old_data if r.get("birlo_bi") in old_extra_bis and r not in lost_records]

for r in old_bi_extra:
    bi = r.get("birlo_bi", "")
    key = (r["vehiculo"]["marca"].upper(), r["vehiculo"]["modelo"].upper())
    # Skip if already added as lost_record
    if any(rd["vehiculo"]["marca"].upper() == key[0] and rd["vehiculo"]["modelo"].upper() == key[1] for rd in new_data):
        continue
    record = {
        "vehiculo": r["vehiculo"],
        "birlo_bi": bi,
        "tuerca_recomendada": bi_to_tuerca.get(bi, r.get("tuerca_recomendada", "")),
        "atsa": r.get("atsa", None)
    }
    new_data.append(record)

# Sort
new_data.sort(key=lambda r: (r["vehiculo"]["marca"], r["vehiculo"]["modelo"], r["vehiculo"]["anio"]))

print(f"\nTotal records: {len(new_data)}")
print(f"With ATSA: {sum(1 for r in new_data if r.get('atsa'))}")
print(f"With tuerca: {sum(1 for r in new_data if r.get('tuerca_recomendada'))}")

# Check if we recovered lost models
new_pairs = set()
for r in new_data:
    m = r["vehiculo"]["marca"]
    mo = r["vehiculo"]["modelo"]
    if m and mo:
        new_pairs.add((m.upper(), mo.upper()))

old_pairs_upper = set()
for r in old_data:
    m = (r.get("vehiculo", {}) or {}).get("marca", "").upper()
    mo = (r.get("vehiculo", {}) or {}).get("modelo", "").upper()
    if m and mo:
        old_pairs_upper.add((m, mo))

still_lost = old_pairs_upper - new_pairs
print(f"Aún perdidos: {len(still_lost)}")
if still_lost:
    for m, mo in sorted(still_lost):
        print(f"  {m} - {mo}")

with open("datos.json", "w", encoding="utf-8") as f:
    json.dump(new_data, f, ensure_ascii=False, separators=(",", ":"))

print("\nGuardado en datos.json")
