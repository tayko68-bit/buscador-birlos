import json

print("Cargando datos...")
with open("datos_bi_api.json", "r") as f:
    api_data = json.load(f)

with open("datos.json", "r") as f:
    old_data = json.load(f)

# Build lookup: BI code -> ATSA data + tuerca (from old data)
# Take the first occurrence since ATSA data is product-level, not vehicle-level
bi_to_atsa = {}
bi_to_tuerca = {}
for r in old_data:
    bi = r.get("birlo_bi", "")
    if bi:
        if r.get("atsa") and bi not in bi_to_atsa:
            bi_to_atsa[bi] = r["atsa"]
        if r.get("tuerca_recomendada") and bi not in bi_to_tuerca:
            bi_to_tuerca[bi] = r["tuerca_recomendada"]

print(f"BI codes with ATSA match: {len(bi_to_atsa)}")
print(f"BI codes with tuerca: {len(bi_to_tuerca)}")

# Also keep old records whose BI codes are NOT in API
old_extra_bis = set(r["birlo_bi"] for r in old_data if r.get("birlo_bi")) - set(r["birlo_bi"] for r in api_data)
old_extra = [r for r in old_data if r.get("birlo_bi") in old_extra_bis]
print(f"Old records to keep (BI not in API): {len(old_extra)}")

# Build new dataset
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
        "tuerca_recomendada": bi_to_tuerca.get(bi, r.get("tuerca_recomendada", "")),
        "atsa": bi_to_atsa.get(bi, None)
    }
    new_data.append(record)

# Add old extra records
new_data.extend(old_extra)

print(f"\nTotal records: {len(new_data)}")
print(f"With ATSA: {sum(1 for r in new_data if r.get('atsa'))}")
print(f"With tuerca: {sum(1 for r in new_data if r.get('tuerca_recomendada'))}")

# Sort by marca, modelo, anio
new_data.sort(key=lambda r: (r["vehiculo"]["marca"], r["vehiculo"]["modelo"], r["vehiculo"]["anio"]))

with open("datos.json", "w", encoding="utf-8") as f:
    json.dump(new_data, f, ensure_ascii=False, indent=2)

print("\nGuardado en datos.json")

# Summary
marcas = sorted(set(r["vehiculo"]["marca"] for r in new_data if r["vehiculo"]["marca"]))
print(f"\nMarcas ({len(marcas)}):")
for m in marcas:
    count = sum(1 for r in new_data if r["vehiculo"]["marca"] == m)
    with_atsa = sum(1 for r in new_data if r["vehiculo"]["marca"] == m and r.get("atsa"))
    print(f"  {m}: {count} registros ({with_atsa} con ATSA)")
