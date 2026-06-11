"""
extract_sprites.py  -  Gruni sprite extractor (v2 - coordenadas precisas)
==========================================================================
Extrae cada frame individualmente usando coordenadas exactas medidas
por deteccion automatica de bordes de cuadro (pixeles negros).

Todos los frames se normalizan al mismo tamano dentro de cada spritesheet
para facilitar el uso en el juego.

Salida en:  assets/sprites/gruni/
"""

from PIL import Image
import os

SRC_WALK = r"NuevosSprites/37d83a76-6aaa-4dd9-bddb-983b9a6a23e0.jpg"
SRC_ACT  = r"NuevosSprites/Gemini_Generated_Image_8w3ej08w3ej08w3e.png"
OUT_DIR  = r"assets/sprites/gruni"

os.makedirs(OUT_DIR, exist_ok=True)

# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def extract_frames(img, frame_boxes):
    """
    Extrae frames individuales usando lista de (x1,y1,x2,y2).
    Normaliza todos al mismo tamano (el mas grande de la lista).
    """
    raw = [img.crop(box) for box in frame_boxes]
    fw = max(f.size[0] for f in raw)
    fh = max(f.size[1] for f in raw)
    normalized = []
    for f in raw:
        canvas = Image.new("RGBA", (fw, fh), (255, 255, 255, 0))
        f_rgba = f.convert("RGBA")
        # Centrar horizontalmente, alinear abajo
        ox = (fw - f.size[0]) // 2
        oy = fh - f.size[1]
        canvas.paste(f_rgba, (ox, oy))
        normalized.append(canvas)
    return normalized, fw, fh

def build_spritesheet(rows_of_frames, frame_w, frame_h, out_path):
    """Genera un spritesheet: cada fila = una animacion/direccion."""
    n_rows = len(rows_of_frames)
    n_cols = max(len(r) for r in rows_of_frames)
    sheet = Image.new("RGBA", (n_cols * frame_w, n_rows * frame_h), (0, 0, 0, 0))
    for row_i, frames in enumerate(rows_of_frames):
        for col_i, frame in enumerate(frames):
            sheet.paste(frame, (col_i * frame_w, row_i * frame_h))
    sheet.save(out_path)
    print(f"  -> {out_path}  ({sheet.size[0]}x{sheet.size[1]}px | {n_rows} dirs x {n_cols} frames x {frame_w}x{frame_h}px)")
    return frame_w, frame_h

# ─────────────────────────────────────────────────────────────────────────────
# HOJA DE MOVIMIENTO  (1024x1000)
# Coordenadas medidas con analisis de bandas blancas:
#   Caminata: y_frames = 108..272  (altura personaje ~164px, frame ~78px)
#   Correr:   y_frames = 540..735  (altura ~195px)
#   Cada mitad horizontal: izq=x:32..422, der=x:502..892
# ─────────────────────────────────────────────────────────────────────────────

print("\n=== Procesando hoja de MOVIMIENTO ===")
walk_img = Image.open(SRC_WALK)
w_w, w_h = walk_img.size

def walk_row_boxes(x1, x2, y1, y2, n):
    fw = (x2 - x1) // n
    return [(x1 + i*fw, y1, x1 + (i+1)*fw, y2) for i in range(n)]

# Caminata (5 frames x 4 direcciones)
WALK = {
    "down":  walk_row_boxes(32,  422, 132, 270, 5),
    "up":    walk_row_boxes(502, 892, 132, 270, 5),
    "right": walk_row_boxes(32,  422, 333, 469, 5),
    "left":  walk_row_boxes(502, 892, 333, 469, 5),
}

# Correr (5 frames x 4 direcciones)
RUN = {
    "down":  walk_row_boxes(32,  422, 564, 718, 5),
    "up":    walk_row_boxes(502, 892, 564, 718, 5),
    "right": walk_row_boxes(32,  422, 800, 945, 5),
    "left":  walk_row_boxes(502, 892, 800, 945, 5),
}

print("Caminata:")
walk_rows = []
fw_w = fh_w = 0
for d in ["down", "up", "right", "left"]:
    frames, fw, fh = extract_frames(walk_img, WALK[d])
    walk_rows.append(frames)
    fw_w, fh_w = fw, fh
    print(f"  {d}: {len(frames)} frames de {fw}x{fh}px")

print("Generando gruni_walk.png...")
build_spritesheet(walk_rows, fw_w, fh_w, os.path.join(OUT_DIR, "gruni_walk.png"))

print("Correr:")
run_rows = []
fw_r = fh_r = 0
for d in ["down", "up", "right", "left"]:
    frames, fw, fh = extract_frames(walk_img, RUN[d])
    run_rows.append(frames)
    fw_r, fh_r = fw, fh
    print(f"  {d}: {len(frames)} frames de {fw}x{fh}px")

print("Generando gruni_run.png...")
build_spritesheet(run_rows, fw_r, fh_r, os.path.join(OUT_DIR, "gruni_run.png"))

# ─────────────────────────────────────────────────────────────────────────────
# HOJA DE ACCIONES  (2098x2048)
# Coordenadas medidas con deteccion de bordes negros de cuadro:
#
# HACHEO (6 frames):
#   Frontal    y=270..554  | frames x: 87,228 | 246,390 | 411,552 | 567,704 | 727,875 | 889,1021
#   Posterior  y=284..554  | frames x: 1105,1240 | 1265,1390 | 1416,1538 | 1577,1698 | 1735,1856 | 1913,2030
#   Lat Der    y=683..954  | frames x: 94,194 | 255,370 | 407,529 | 572,680 | 713,856 | 902,1013
#   Lat Izq    y=683..954  | frames x: 1102,1213 | 1263,1377 | 1418,1536 | 1588,1699 | 1748,1862 | 1909,2021
#
# ATAQUE (5 frames):
#   Frontal    y=1176..1459 | frames x: 73,242 | 267,623(!) ...
#              -> La zona frontal tiene frames: 73,242 | 267,490 | 510,675 | 700,844 | 878,1010
#              (el frame 1 parece mas ancho por la espada extendida)
#   Posterior  y=1176..1464 | frames x: 1110,1245 | 1296,1445 | 1498,1626 | 1692,1813 | 1888,2022
#
# MINERIA (5 frames):
#   Frontal    y=1624..1931 | frames x: 73,242 | 289,431 | 478,630 | 685,819 | 863,1011
#   Lat Izq    y=1627..1936 | frames x: 1115,1226 | 1288,1421 | 1490,1637 | 1689,1815 | 1887,2015
# ─────────────────────────────────────────────────────────────────────────────

print("\n=== Procesando hoja de ACCIONES ===")
act_img = Image.open(SRC_ACT)

# --- HACHEO ---
# Coordenadas: se excluyen los bordes del cuadro (+2px interior, -2px exterior)
AXE = {
    "down": [
        (89,  272, 226, 552),
        (248, 272, 388, 552),
        (413, 272, 550, 552),
        (569, 272, 702, 552),
        (729, 272, 873, 552),
        (891, 272, 1019,552),
    ],
    "up": [
        (1107,286, 1238,552),
        (1267,286, 1388,552),
        (1418,286, 1536,552),
        (1579,286, 1696,552),
        (1737,286, 1854,552),
        (1915,286, 2028,552),
    ],
    "right": [
        (96,  685, 192, 952),
        (257, 685, 368, 952),
        (409, 685, 527, 952),
        (574, 685, 678, 952),
        (716, 685, 873, 952),
        (904, 685, 1011,952),
    ],
    "left": [
        (1104,685, 1211,952),
        (1265,685, 1375,952),
        (1420,685, 1534,952),
        (1590,685, 1697,952),
        (1750,685, 1860,952),
        (1911,685, 2019,952),
    ],
}

print("Hacheo:")
axe_rows = []
fw_a = fh_a = 0
for d in ["down", "up", "right", "left"]:
    frames, fw, fh = extract_frames(act_img, AXE[d])
    axe_rows.append(frames)
    if fw > fw_a: fw_a = fw
    if fh > fh_a: fh_a = fh
    print(f"  {d}: {len(frames)} frames de {fw}x{fh}px")

print("Generando gruni_axe.png...")
build_spritesheet(axe_rows, fw_a, fh_a, os.path.join(OUT_DIR, "gruni_axe.png"))

# --- ATAQUE ---
ATK = {
    "down": [
        (75,  1178, 240, 1457),
        (269, 1178, 488, 1457),
        (512, 1178, 673, 1457),
        (702, 1178, 842, 1457),
        (880, 1178, 1008,1457),
    ],
    "up": [
        (1112,1178, 1243,1462),
        (1298,1178, 1443,1462),
        (1500,1178, 1624,1462),
        (1694,1178, 1811,1462),
        (1890,1178, 2020,1462),
    ],
}

print("Ataque:")
atk_rows = []
fw_at = fh_at = 0
for d in ["down", "up"]:
    frames, fw, fh = extract_frames(act_img, ATK[d])
    atk_rows.append(frames)
    if fw > fw_at: fw_at = fw
    if fh > fh_at: fh_at = fh
    print(f"  {d}: {len(frames)} frames de {fw}x{fh}px")

print("Generando gruni_attack.png...")
build_spritesheet(atk_rows, fw_at, fh_at, os.path.join(OUT_DIR, "gruni_attack.png"))

# --- MINERIA ---
MINE = {
    "down": [
        (75,  1626, 240, 1929),
        (291, 1626, 429, 1929),
        (480, 1626, 628, 1929),
        (687, 1626, 817, 1929),
        (865, 1626, 1009,1929),
    ],
    "left": [
        (1117,1629, 1224,1934),
        (1290,1629, 1419,1934),
        (1492,1629, 1635,1934),
        (1691,1629, 1813,1934),
        (1889,1629, 2013,1934),
    ],
}

print("Mineria:")
mine_rows = []
fw_m = fh_m = 0
for d in ["down", "left"]:
    frames, fw, fh = extract_frames(act_img, MINE[d])
    mine_rows.append(frames)
    if fw > fw_m: fw_m = fw
    if fh > fh_m: fh_m = fh
    print(f"  {d}: {len(frames)} frames de {fw}x{fh}px")

print("Generando gruni_mine.png...")
build_spritesheet(mine_rows, fw_m, fh_m, os.path.join(OUT_DIR, "gruni_mine.png"))

# ─────────────────────────────────────────────────────────────────────────────
print("\n=== Extraccion completa! ===")
print(f"Sprites guardados en: {OUT_DIR}/")
print("""
Spritesheets:
  gruni_walk.png   - 4 dirs x 5 frames (down/up/right/left)
  gruni_run.png    - 4 dirs x 5 frames (down/up/right/left)
  gruni_axe.png    - 4 dirs x 6 frames (down/up/right/left)
  gruni_attack.png - 2 dirs x 5 frames (down/up)
  gruni_mine.png   - 2 dirs x 5 frames (down/left)

Orden de filas en cada spritesheet:
  Fila 0 = down (frontal)
  Fila 1 = up   (posterior)
  Fila 2 = right (lateral derecha)
  Fila 3 = left  (lateral izquierda)
""")
