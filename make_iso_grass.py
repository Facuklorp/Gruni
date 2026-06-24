"""
make_iso_grass.py
Convierte las 4 texturas de pasto top-down en tiles isométricos.
Salida: Biomas/PASTO/iso/ → pasto_iso_1.png ... pasto_iso_4.png

La transformación aplica una proyección afín que "achata" la textura
cuadrada en un rombo 2:1 (ancho:alto), como en los juegos isométricos clásicos.

Dimensiones de salida:
  ISO_W = 128 px  (ancho del rombo)
  ISO_H = 64  px  (alto del rombo = ISO_W / 2)
"""

from PIL import Image
import os
import math

# ── Configuración ────────────────────────────────────────────────────────────
ISO_W = 128
ISO_H = 64
SRC_SIZE = 512   # Recortamos un cuadrado de 512×512 del centro de cada textura

SRC_DIR = r"C:\Users\tecno\OneDrive\Documentos\Hola\Otros\Grunis\Biomas\PASTO"
OUT_DIR = os.path.join(SRC_DIR, "iso")
os.makedirs(OUT_DIR, exist_ok=True)

sources = [
    "pasto solo.png",
    "pasto solo 2.png",
    "pasto solo 3.png",
    "pasto solo 4.png",
]

def make_iso_tile(src_path, out_path):
    """
    Transforma una textura cuadrada en un rombo isométrico 2:1.
    
    La proyección afín isométrica estándar mapea:
      (u, v) en [0,1]² → punto en el rombo:
        x = (u - v) * ISO_W/2  + ISO_W/2
        y = (u + v) * ISO_H/2
    
    Hacemos la inversa: para cada pixel (px, py) del tile de salida,
    calculamos qué (u, v) le corresponde en la textura original.
    """
    img = Image.open(src_path).convert("RGBA")

    # Recortar el centro cuadrado
    w, h = img.size
    size = min(w, h, SRC_SIZE)
    left   = (w - size) // 2
    top    = (h - size) // 2
    img = img.crop((left, top, left + size, top + size))
    img = img.resize((size, size), Image.LANCZOS)

    # Canvas de salida (rombo sobre fondo transparente)
    out = Image.new("RGBA", (ISO_W, ISO_H), (0, 0, 0, 0))
    src_pixels = img.load()
    out_pixels = out.load()

    hw = ISO_W / 2
    hh = ISO_H / 2

    for py in range(ISO_H):
        for px in range(ISO_W):
            # Normalizar al espacio [-1, 1] × [-1, 1]
            nx = (px - hw) / hw   # -1 .. 1
            ny = (py - hh) / hh   # -1 .. 1

            # Verificar que el punto esté dentro del rombo
            # Condición: |nx| + |ny| <= 1
            if abs(nx) + abs(ny) > 1.0:
                continue   # Fuera del rombo → transparente

            # Proyección inversa: rombo → cuadrado
            # En la proyección iso clásica 2:1:
            #   px_iso = (u - v) * hw + hw
            #   py_iso = (u + v) * hh
            # Despejando u y v:
            #   u = (nx + ny/hh * hh) / 2  ... simplificamos:
            # Con nx = (u-v), ny = (u+v):
            u = (nx + ny) / 2   # 0..1
            v = (ny - nx) / 2   # 0..1

            # Convertir a coordenadas de pixel de la textura fuente
            src_x = int((u * 0.5 + 0.5) * (size - 1))
            src_y = int((v * 0.5 + 0.5) * (size - 1))

            src_x = max(0, min(size - 1, src_x))
            src_y = max(0, min(size - 1, src_y))

            out_pixels[px, py] = src_pixels[src_x, src_y]

    out.save(out_path, "PNG")
    print(f"  OK {os.path.basename(out_path)}")


print("Generando tiles isométricos de pasto...")
for i, filename in enumerate(sources, start=1):
    src  = os.path.join(SRC_DIR, filename)
    out  = os.path.join(OUT_DIR, f"pasto_iso_{i}.png")
    print(f"[{i}/4] {filename}")
    make_iso_tile(src, out)

print(f"\nListo! Tiles guardados en: {OUT_DIR}")
