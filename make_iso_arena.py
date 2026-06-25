"""
make_iso_arena.py
Genera 3 texturas de arena procedurales con distintas tonalidades
y las convierte en tiles isométricos 128×64 con fondo transparente.

Variantes:
  arena_iso_1.png → Arena dorada cálida  (base: #f9ca24)
  arena_iso_2.png → Arena clara pálida   (base: #f0d890)
  arena_iso_3.png → Arena rojiza ocre    (base: #d4882a)

Salida: Biomas/ARENA/iso/ → arena_iso_1.png ... arena_iso_3.png
"""

from PIL import Image, ImageFilter
import os
import math
import random

# ── Configuración ─────────────────────────────────────────────────────────────
ISO_W    = 128
ISO_H    = 64
TEX_SIZE = 512   # Tamaño de la textura procedural cuadrada

OUT_DIR = r"C:\Users\tecno\OneDrive\Documentos\Hola\Otros\Grunis\Biomas\ARENA\iso"
os.makedirs(OUT_DIR, exist_ok=True)

# ── Ruido Perlin simplificado (value noise) ───────────────────────────────────
def fade(t):
    return t * t * t * (t * (t * 6 - 15) + 10)

def lerp(a, b, t):
    return a + t * (b - a)

def make_noise_grid(size, scale, seed=0):
    """Genera una grilla de value noise."""
    rng = random.Random(seed)
    cells = math.ceil(size / scale) + 2
    grid = [[rng.random() for _ in range(cells)] for _ in range(cells)]

    result = [[0.0] * size for _ in range(size)]
    for py in range(size):
        for px in range(size):
            fx = px / scale
            fy = py / scale
            ix = int(fx)
            iy = int(fy)
            tx = fx - ix
            ty = fy - iy
            tx = fade(tx)
            ty = fade(ty)

            v00 = grid[iy][ix]
            v10 = grid[iy][ix + 1]
            v01 = grid[iy + 1][ix]
            v11 = grid[iy + 1][ix + 1]

            result[py][px] = lerp(
                lerp(v00, v10, tx),
                lerp(v01, v11, tx),
                ty
            )
    return result

def fractal_noise(size, octaves, seed=0):
    """Suma varias octavas de noise para más detalle."""
    result = [[0.0] * size for _ in range(size)]
    amplitude = 1.0
    frequency = 1.0
    max_val = 0.0

    for o in range(octaves):
        scale = size / (2 ** (o + 1))
        if scale < 1:
            break
        layer = make_noise_grid(size, scale, seed=seed + o * 100)
        for y in range(size):
            for x in range(size):
                result[y][x] += layer[y][x] * amplitude
        max_val += amplitude
        amplitude *= 0.5
        frequency *= 2.0

    # Normalizar
    for y in range(size):
        for x in range(size):
            result[y][x] /= max_val

    return result

# ── Paletas de arena ──────────────────────────────────────────────────────────
PALETTES = [
    {
        # Arena dorada cálida
        "name": "arena_iso_1",
        "base":   (249, 202,  36),   # #f9ca24 — dorado brillante
        "dark":   (195, 143,  10),   # sombras cálidas
        "light":  (255, 236, 130),   # brillos cálidos
        "grain":  (220, 165,  20),   # granos más oscuros
        "spot":   (240, 185,  15),   # manchas sutiles
        "grain_density": 0.18,
        "contrast": 0.42,
    },
    {
        # Arena clara y pálida
        "name": "arena_iso_2",
        "base":   (240, 220, 150),   # #f0dc96 — arena blanquecina
        "dark":   (200, 175, 100),   # sombras suaves
        "light":  (255, 248, 210),   # casi blanco
        "grain":  (210, 185, 115),   # granos muy sutiles
        "spot":   (225, 200, 130),   # manchas leves
        "grain_density": 0.14,
        "contrast": 0.30,
    },
    {
        # Arena rojiza ocre
        "name": "arena_iso_3",
        "base":   (212, 136,  42),   # #d4882a — ocre rojizo
        "dark":   (160,  88,  15),   # sombras tierra
        "light":  (245, 180,  90),   # brillos naranjas
        "grain":  (185, 110,  25),   # granos oscuros
        "spot":   (200, 120,  35),   # manchas rojizas
        "grain_density": 0.20,
        "contrast": 0.48,
    },
]

def blend(c1, c2, t):
    """Mezcla lineal entre dos colores RGB."""
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))

def clamp(v, lo=0, hi=255):
    return max(lo, min(hi, int(v)))

def generate_sand_texture(palette, size, seed=42):
    """Genera una textura de arena cuadrada procedural."""
    # Noise de baja frecuencia: variación de tono a gran escala
    noise_macro = fractal_noise(size, octaves=4, seed=seed)
    # Noise de alta frecuencia: granos pequeños
    noise_micro = fractal_noise(size, octaves=6, seed=seed + 999)

    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    pixels = img.load()

    rng = random.Random(seed)

    p = palette
    for y in range(size):
        for x in range(size):
            macro = noise_macro[y][x]
            micro = noise_micro[y][x]

            # Color base mezclado con macro noise (variación de tonalidad)
            t_macro = (macro - 0.5) * p["contrast"] * 2
            if t_macro >= 0:
                color = blend(p["base"], p["light"], t_macro)
            else:
                color = blend(p["base"], p["dark"], -t_macro)

            # Añadir granos finos con micro noise
            grain_threshold = 1.0 - p["grain_density"]
            if micro > grain_threshold:
                intensity = (micro - grain_threshold) / p["grain_density"]
                color = blend(color, p["grain"], intensity * 0.6)

            # Manchas aleatorias más grandes (simulan variación de arena húmeda/seca)
            spot_noise = noise_macro[(y + 123) % size][(x + 77) % size]
            if spot_noise > 0.72:
                t_spot = (spot_noise - 0.72) / 0.28
                color = blend(color, p["spot"], t_spot * 0.4)

            # Asegurarse de que los valores están dentro de rango
            r = clamp(color[0])
            g = clamp(color[1])
            b = clamp(color[2])

            pixels[x, y] = (r, g, b, 255)

    # Suavizado leve para aspecto más natural
    img = img.filter(ImageFilter.GaussianBlur(radius=0.8))

    return img

# ── Transformación isométrica (igual que make_iso_grass.py) ───────────────────
def make_iso_tile_from_image(src_img, out_path):
    """
    Transforma una textura cuadrada RGBA en un rombo isométrico 2:1.
    Para cada pixel (px, py) del rombo de salida calcula el (u,v)
    correspondiente en la textura original (proyección inversa).
    """
    size = src_img.size[0]
    src_pixels = src_img.load()

    out = Image.new("RGBA", (ISO_W, ISO_H), (0, 0, 0, 0))
    out_pixels = out.load()

    hw = ISO_W / 2
    hh = ISO_H / 2

    for py in range(ISO_H):
        for px in range(ISO_W):
            # Normalizar al espacio [-1, 1] × [-1, 1]
            nx = (px - hw) / hw
            ny = (py - hh) / hh

            # Condición de rombo: |nx| + |ny| <= 1
            if abs(nx) + abs(ny) > 1.0:
                continue  # transparente

            # Proyección inversa rombo → cuadrado
            u = (nx + ny) / 2   # -0.5 .. 0.5
            v = (ny - nx) / 2   # -0.5 .. 0.5

            # Convertir a coordenadas de pixel
            src_x = int((u * 0.5 + 0.5) * (size - 1))
            src_y = int((v * 0.5 + 0.5) * (size - 1))
            src_x = max(0, min(size - 1, src_x))
            src_y = max(0, min(size - 1, src_y))

            out_pixels[px, py] = src_pixels[src_x, src_y]

    out.save(out_path, "PNG")
    print(f"  OK: {os.path.basename(out_path)}")

# ── Main ──────────────────────────────────────────────────────────────────────
print("Generando tiles isométricos de arena...")
print(f"Resolución de textura fuente: {TEX_SIZE}×{TEX_SIZE}")
print(f"Resolución ISO de salida:     {ISO_W}×{ISO_H}")
print()

seeds = [42, 137, 271]

for i, (palette, seed) in enumerate(zip(PALETTES, seeds), start=1):
    print(f"[{i}/3] {palette['name']}")

    # 1. Generar textura procedural de arena
    print(f"       Generando textura procedural...")
    tex = generate_sand_texture(palette, TEX_SIZE, seed=seed)

    # 2. Transformar a rombo isométrico
    out_path = os.path.join(OUT_DIR, f"{palette['name']}.png")
    print(f"       Aplicando proyección isométrica...")
    make_iso_tile_from_image(tex, out_path)
    print()

print(f"Listo! Tiles guardados en:\n  {OUT_DIR}")
