"""
make_iso_arena.py  v3
3 tiles de arena con variaciones MUY SUTILES entre si,
como los 4 tiles de pasto (misma familia de color, patron diferente).

Base comun: amarillo-dorado calido ~(215, 175, 70)
Las 3 variantes solo difieren en:
  - brillo interno (+/- 15 niveles maximo)
  - densidad de grano
  - angulo de ondula de viento
"""

from PIL import Image, ImageFilter
import os, math, random

ISO_W    = 128
ISO_H    = 64
TEX_SIZE = 256

OUT_DIR = r"C:\Users\tecno\OneDrive\Documentos\Hola\Otros\Grunis\Biomas\ARENA\iso"
os.makedirs(OUT_DIR, exist_ok=True)

# ── Noise ─────────────────────────────────────────────────────────────────────
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
    t = max(0.0, min(1.0, t))
    return tuple(clamp(c1[i] + (c2[i]-c1[i])*t) for i in range(3))

def ripple(x, y, freq, angle, amp):
    nx = math.cos(angle)*x + math.sin(angle)*y
    return (math.sin(nx * freq * math.pi * 2) + 1) / 2 * amp

# ── Paletas — misma familia dorada, variaciones muy leves ─────────────────────
# Color base compartido: dorado arena calido
BASE  = (215, 178,  72)   # dorado medio — comun a los 3
DARK  = (185, 148,  45)   # sombra leve  (solo ~30 niveles mas oscuro)
LITE  = (238, 208, 105)   # brillo leve  (solo ~30 niveles mas claro)

PALETTES = [
    {
        # Variante 1: ligeramente mas brillante, grano fino
        "name":          "arena_iso_1",
        "c_base":        BASE,
        "c_dark":        DARK,
        "c_lite":        (242, 212, 108),   # +4 sobre LITE
        "contrast":      0.22,              # diferencia de tono muy baja
        "ripple_amp":    0.08,
        "ripple_freq":   3.0,
        "ripple_angle":  math.radians(25),
        "grain_scale":   18,
        "macro_scale":   80,
        "seed": 42,
    },
    {
        # Variante 2: tono medio, grano medio, ondula diferente
        "name":          "arena_iso_2",
        "c_base":        BASE,
        "c_dark":        (180, 143,  40),   # -5 sobre DARK
        "c_lite":        LITE,
        "contrast":      0.20,
        "ripple_amp":    0.07,
        "ripple_freq":   3.8,
        "ripple_angle":  math.radians(10),
        "grain_scale":   14,
        "macro_scale":   90,
        "seed": 137,
    },
    {
        # Variante 3: ligeramente mas opaco/calido, grano grueso
        "name":          "arena_iso_3",
        "c_base":        (210, 172,  65),   # -5 sobre BASE (toque mas calido)
        "c_dark":        (178, 140,  38),
        "c_lite":        (234, 200,  95),
        "contrast":      0.23,
        "ripple_amp":    0.09,
        "ripple_freq":   2.5,
        "ripple_angle":  math.radians(40),
        "grain_scale":   11,
        "macro_scale":   70,
        "seed": 271,
    },
]

def generate(p, size):
    macro = fbm(size, 4, p["macro_scale"], p["seed"])
    micro = fbm(size, 5, p["grain_scale"], p["seed"]+500)
    norm  = size - 1

    img = Image.new("RGBA", (size, size))
    for y in range(size):
        for x in range(size):
            m  = macro[y][x]
            mi = micro[y][x]
            rip = ripple(x/norm, y/norm,
                         p["ripple_freq"],
                         p["ripple_angle"],
                         p["ripple_amp"])

            t = (m - 0.5) * p["contrast"] * 2 + rip - p["ripple_amp"]/2
            color = blend(p["c_base"], p["c_lite"], t) if t >= 0 \
                    else blend(p["c_base"], p["c_dark"], -t)

            # grano muy sutil
            grain_t = max(0.0, mi - 0.60) * 1.8
            color = blend(color, p["c_dark"], grain_t * 0.30)

            img.putpixel((x, y), color + (255,))

    return img.filter(ImageFilter.GaussianBlur(radius=0.5))

def to_iso(src_img, out_path):
    size = src_img.size[0]
    src  = src_img.load()
    out  = Image.new("RGBA", (ISO_W, ISO_H), (0,0,0,0))
    dst  = out.load()
    hw, hh = ISO_W/2, ISO_H/2
    for py in range(ISO_H):
        for px in range(ISO_W):
            nx = (px-hw)/hw
            ny = (py-hh)/hh
            if abs(nx)+abs(ny) > 1.0: continue
            u = (nx+ny)/2
            v = (ny-nx)/2
            sx = max(0, min(size-1, int((u*0.5+0.5)*(size-1))))
            sy = max(0, min(size-1, int((v*0.5+0.5)*(size-1))))
            dst[px, py] = src[sx, sy]
    out.save(out_path, "PNG")

print("Generando tiles ISO de arena v3 (variaciones sutiles)...")
for i, p in enumerate(PALETTES, 1):
    print(f"  [{i}/3] {p['name']}")
    tex = generate(p, TEX_SIZE)
    to_iso(tex, os.path.join(OUT_DIR, f"{p['name']}.png"))
print("Listo!")
