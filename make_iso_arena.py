"""
make_iso_arena.py  v2
Genera 3 tiles isometricos de arena con tonalidades MUY distintas
y detalles de granos/ondas visibles al estilo pixel-art.

Variantes:
  arena_iso_1  -> Arena dorada viva      (amarillo intenso)
  arena_iso_2  -> Arena palida blanquecina (crema claro)
  arena_iso_3  -> Arena rojiza ocre      (naranja terroso)

Salida: Biomas/ARENA/iso/ (128x64 px, RGBA, fondo transparente)
"""

from PIL import Image, ImageFilter
import os, math, random

ISO_W    = 128
ISO_H    = 64
TEX_SIZE = 256   # textura fuente cuadrada

OUT_DIR = r"C:\Users\tecno\OneDrive\Documentos\Hola\Otros\Grunis\Biomas\ARENA\iso"
os.makedirs(OUT_DIR, exist_ok=True)

# ── Ruido value-noise con interpolacion suave ─────────────────────────────────
def fade(t): return t*t*t*(t*(t*6-15)+10)
def lerp(a, b, t): return a + (b-a)*t

def value_noise(size, scale, seed=0):
    rng = random.Random(seed)
    cells = math.ceil(size/scale) + 2
    g = [[rng.random() for _ in range(cells)] for _ in range(cells)]
    out = []
    for py in range(size):
        row = []
        for px in range(size):
            fx, fy = px/scale, py/scale
            ix, iy = int(fx), int(fy)
            tx, ty = fade(fx-ix), fade(fy-iy)
            v = lerp(lerp(g[iy][ix], g[iy][ix+1], tx),
                     lerp(g[iy+1][ix], g[iy+1][ix+1], tx), ty)
            row.append(v)
        out.append(row)
    return out

def fbm(size, octaves, base_scale, seed=0):
    """Fractal Brownian Motion: suma octavas de ruido."""
    result = [[0.0]*size for _ in range(size)]
    amp, total = 1.0, 0.0
    for o in range(octaves):
        sc = base_scale / (2**o)
        if sc < 1.5: break
        layer = value_noise(size, sc, seed + o*137)
        for y in range(size):
            for x in range(size):
                result[y][x] += layer[y][x] * amp
        total += amp
        amp *= 0.5
    for y in range(size):
        for x in range(size):
            result[y][x] /= total
    return result

def clamp(v): return max(0, min(255, int(v)))
def blend(c1, c2, t):
    return tuple(clamp(c1[i] + (c2[i]-c1[i])*t) for i in range(3))

# ── Ondas de arena (ripples) ─────────────────────────────────────────────────
def ripple(x, y, freq, angle, amp):
    """Onda sinusoidal orientada — simula ondulas de viento en la arena."""
    nx = math.cos(angle)*x + math.sin(angle)*y
    return (math.sin(nx * freq * math.pi * 2) + 1) / 2 * amp

# ── Paletas ───────────────────────────────────────────────────────────────────
PALETTES = [
    {   # 1 — Arena dorada viva
        "name":   "arena_iso_1",
        "c_base": (220, 170,  55),   # dorado medio
        "c_dark": (165, 110,  10),   # sombra oscura
        "c_lite": (255, 230, 120),   # brillo calido
        "c_spec": (240, 195,  70),   # especular
        "ripple_amp":   0.18,        # ondulas suaves
        "ripple_freq":  3.5,
        "ripple_angle": math.radians(30),
        "grain_scale":  12,
        "macro_scale":  80,
        "contrast":     0.55,
        "seed": 42,
    },
    {   # 2 — Arena palida blanquecina
        "name":   "arena_iso_2",
        "c_base": (235, 218, 170),   # crema palido
        "c_dark": (190, 165, 100),   # sombra suave
        "c_lite": (255, 248, 225),   # casi blanco
        "c_spec": (245, 232, 195),
        "ripple_amp":   0.10,        # ondulas muy suaves
        "ripple_freq":  4.0,
        "ripple_angle": math.radians(15),
        "grain_scale":  16,
        "macro_scale":  90,
        "contrast":     0.28,
        "seed": 137,
    },
    {   # 3 — Arena rojiza ocre
        "name":   "arena_iso_3",
        "c_base": (195, 105,  35),   # naranja terroso
        "c_dark": (130,  55,  10),   # marron oscuro
        "c_lite": (240, 155,  75),   # naranja claro
        "c_spec": (215, 125,  50),
        "ripple_amp":   0.22,        # ondulas mas marcadas
        "ripple_freq":  3.0,
        "ripple_angle": math.radians(45),
        "grain_scale":  10,
        "macro_scale":  70,
        "contrast":     0.65,
        "seed": 271,
    },
]

def generate_sand_texture(p, size):
    seed = p["seed"]

    # Ruido macro (variacion de tono a gran escala)
    macro = fbm(size, 4, p["macro_scale"], seed)
    # Ruido micro (granos finos)
    micro = fbm(size, 5, p["grain_scale"], seed + 500)

    pixels = []
    norm = size - 1

    for y in range(size):
        row = []
        for x in range(size):
            m  = macro[y][x]    # 0..1
            mi = micro[y][x]    # 0..1

            # Ondula de viento — valor entre 0 y ripple_amp
            rip = ripple(x/norm, y/norm,
                         p["ripple_freq"],
                         p["ripple_angle"],
                         p["ripple_amp"])

            # Combinar macro + ripple para el desplazamiento de tono
            t = (m - 0.5) * p["contrast"] * 2 + rip - p["ripple_amp"]/2

            if t >= 0:
                color = blend(p["c_base"], p["c_lite"], min(t, 1.0))
            else:
                color = blend(p["c_base"], p["c_dark"], min(-t, 1.0))

            # Granos finos superpuestos (micro oscurece ligeramente)
            grain_t = max(0.0, mi - 0.55) * 2.2   # solo los picos de micro
            color = blend(color, p["c_dark"], grain_t * 0.45)

            # Destello especular en los picos de onda
            if rip > p["ripple_amp"] * 0.75:
                spec_t = (rip - p["ripple_amp"]*0.75) / (p["ripple_amp"]*0.25)
                color = blend(color, p["c_spec"], spec_t * 0.35)

            row.append(color + (255,))
        pixels.append(row)

    img = Image.new("RGBA", (size, size))
    for y in range(size):
        for x in range(size):
            img.putpixel((x, y), pixels[y][x])

    # Suavizado muy leve para cohesion visual
    img = img.filter(ImageFilter.GaussianBlur(radius=0.6))
    return img

# ── Proyeccion iso (igual que el script de pasto) ────────────────────────────
def make_iso_tile(src_img, out_path):
    size = src_img.size[0]
    src  = src_img.load()
    out  = Image.new("RGBA", (ISO_W, ISO_H), (0,0,0,0))
    dst  = out.load()
    hw, hh = ISO_W/2, ISO_H/2

    for py in range(ISO_H):
        for px in range(ISO_W):
            nx = (px - hw) / hw
            ny = (py - hh) / hh
            if abs(nx) + abs(ny) > 1.0:
                continue
            u = (nx + ny) / 2
            v = (ny - nx) / 2
            sx = int((u*0.5 + 0.5) * (size-1))
            sy = int((v*0.5 + 0.5) * (size-1))
            sx = max(0, min(size-1, sx))
            sy = max(0, min(size-1, sy))
            dst[px, py] = src[sx, sy]

    out.save(out_path, "PNG")

# ── Main ──────────────────────────────────────────────────────────────────────
print("Generando tiles ISO de arena v2...")
for i, p in enumerate(PALETTES, 1):
    print(f"  [{i}/3] {p['name']}  (base RGB={p['c_base']})")
    tex      = generate_sand_texture(p, TEX_SIZE)
    out_path = os.path.join(OUT_DIR, f"{p['name']}.png")
    make_iso_tile(tex, out_path)
    print(f"         -> {out_path}")

print("\nListo!")
