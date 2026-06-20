import requests
import json
import sys
import re

API_BASE = "https://birlos-fargate.siclik-b2c.mx:8997"
TOKEN = sys.argv[1] if len(sys.argv) > 1 else ""

headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Origin": "https://www.biron-store.com",
    "Referer": "https://www.biron-store.com/"
}

def get_filter(prod, header):
    for f in prod.get("filter", []):
        if f.get("header") == header:
            return f.get("body", [])
    return []

def expand_years(year_range_str):
    mapping = {
        "DE 1936 A 1959": list(range(1936, 1960)),
        "DE 1960 A 1979": list(range(1960, 1980)),
        "DE 1980 A 1999": list(range(1980, 2000)),
        "DE 2000 A 2009": list(range(2000, 2010)),
        "DE 2010 A 2014": list(range(2010, 2015)),
        "DE 2015 A 2019": list(range(2015, 2020)),
        "DE 2020 A XXXX": list(range(2020, 2030)),
    }
    return mapping.get(year_range_str, [])

print("Fetching products from API...")
resp = requests.get(f"{API_BASE}/products", headers=headers, timeout=30)
data = resp.json()
products = data.get("products", [])
print(f"Total products: {len(products)}")

birlos = [p for p in products if p.get("family") == "BIRLO RUEDA"]
print(f"Birlos de rueda: {len(birlos)}")

records = []
skipped_no_marca = 0

for prod in birlos:
    marcas = get_filter(prod, "Marca")
    modelos = get_filter(prod, "Modelo")
    anios_raw = get_filter(prod, "Año")

    if not marcas:
        skipped_no_marca += 1
        continue

    marca = marcas[0]
    anios = []
    for a in anios_raw:
        anios.extend(expand_years(a))
    if not anios:
        anios = [""]

    diam = get_filter(prod, "Diámetro de estría")
    diam_text = diam[0] if diam else ""

    for modelo in modelos if modelos else [""]:
        for anio in anios:
            tuerca = ""
            name = prod.get("name", "")
            # Try to infer tuerca from name or from related products
            # Extract thread info from name
            thread_match = re.match(r'BIRLO RUEDA\s+(\S+)', name)
            thread = thread_match.group(1) if thread_match else ""

            records.append({
                "vehiculo": {
                    "marca": marca,
                    "modelo": modelo if modelo else "",
                    "anio": str(anio) if anio else "",
                    "posicion": ""
                },
                "birlo_bi": prod.get("sku", ""),
                "tuerca_recomendada": "",
                "birlo_name": name,
                "category": prod.get("category", ""),
                "price": prod.get("price", 0),
                "stock": prod.get("stock", 0),
                "thread": thread,
                "diam_estria": diam_text,
                "atsa": None
            })

print(f"Registros generados: {len(records)}")
print(f"Saltados (sin marca): {skipped_no_marca}")

with open("datos_bi_api.json", "w", encoding="utf-8") as f:
    json.dump(records, f, ensure_ascii=False, indent=2)

print("Guardado en datos_bi_api.json")

# Show summary
marcas_unicas = sorted(set(r["vehiculo"]["marca"] for r in records if r["vehiculo"]["marca"]))
print(f"\nMarcas ({len(marcas_unicas)}):")
for m in marcas_unicas:
    count = sum(1 for r in records if r["vehiculo"]["marca"] == m)
    print(f"  {m}: {count} registros")
