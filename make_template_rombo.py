"""
Genera una imagen plantilla del rombo isométrico exacto del juego.
Útil para acomodar texturas de biomas en Photoshop.

Constantes del juego (world.js):
  ISO_W = 32   (ancho 1 celda, pre-zoom)
  ISO_H = 16   (alto  1 celda, pre-zoom)
  ZOOM  = 3.5

Los tiles de bioma se dibujan en bloques 2×2:
  drawW = ISO_W * 2 = 64 px
  drawH = ISO_H * 2 = 32 px

Con OV=4 de overlap, la imagen renderizada ocupa:
  72 × 40 px  (pre-zoom)
  252 × 140 px (en pantalla con zoom 3.5)
"""

from PIL import Image, ImageDraw, ImageFont
import os

# ── Constantes del juego ────────────────────────────────────────────────────
ISO_W  = 32
ISO_H  = 16
OV     = 4
ZOOM   = 3.5

# Tamaño del rombo (bloque 2x2)
drawW = ISO_W * 2   # 64 px
drawH = ISO_H * 2   # 32 px

# Tamaño total de la imagen (con overlap)
img_w = drawW + OV * 2   # 72 px
img_h = drawH + OV * 2   # 40 px

# ── Escala para Photoshop (8×) ──────────────────────────────────────────────
SCALE = 8
canvas_w = img_w * SCALE    # 576 px
canvas_h = img_h * SCALE    # 320 px

# ── Vértices del rombo (en coords escaladas) ────────────────────────────────
# El rombo empieza en OV*SCALE desde cada borde
ov_s = OV * SCALE                    # 32 px de margen
cw   = canvas_w
ch   = canvas_h

top    = (cw // 2,        ov_s)       # punto superior
right  = (cw - ov_s,     ch // 2)    # punto derecho
bottom = (cw // 2,        ch - ov_s)  # punto inferior
left   = (ov_s,           ch // 2)   # punto izquierdo

# ── Crear imagen RGBA (fondo transparente) ──────────────────────────────────
img  = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# Relleno del rombo — gris semitransparente (zona "pintable")
draw.polygon([top, right, bottom, left], fill=(180, 180, 180, 100))

# Borde del rombo — ROJO (límite exacto del tile)
for width in [5, 3, 1]:
    alpha = 255 if width == 3 else 120
    draw.line([top, right, bottom, left, top],
              fill=(220, 30, 30, alpha), width=width)

# Zona de overlap (OV) — borde exterior AZUL punteado
draw.rectangle([0, 0, cw - 1, ch - 1],
               outline=(30, 100, 220, 180), width=3)

# Líneas guía internas — VERDE CLARO (mitad del rombo, eje central)
mid_x = cw // 2
mid_y = ch // 2
draw.line([(left[0], mid_y), (right[0], mid_y)],
          fill=(60, 200, 60, 160), width=1)
draw.line([(mid_x, top[1]), (mid_x, bottom[1])],
          fill=(60, 200, 60, 160), width=1)

# Marcadores en los 4 vértices del rombo — punto rojo
r = 5
for pt in [top, right, bottom, left]:
    draw.ellipse([pt[0]-r, pt[1]-r, pt[0]+r, pt[1]+r],
                 fill=(255, 50, 50, 255))

# ── Guardar ─────────────────────────────────────────────────────────────────
out_path = os.path.join(os.path.dirname(__file__), 'ejemplo.png')
img.save(out_path)

print("=" * 55)
print("  PLANTILLA GENERADA: ejemplo.png")
print("=" * 55)
print(f"  Canvas:            {canvas_w} × {canvas_h} px  (escala {SCALE}×)")
print(f"  Rombo (tile 2x2):  {drawW*SCALE} × {drawH*SCALE} px  escalado")
print(f"                     ({drawW} × {drawH} px pre-zoom)")
print(f"  Overlap (OV={OV}):    {ov_s} px de borde en cada lado (escala {SCALE}×)")
print(f"  En pantalla:       {int(img_w*ZOOM)} × {int(img_h*ZOOM)} px (con zoom 3.5)")
print()
print("  LEYENDA DE COLORES:")
print("    Rojo   → borde exacto del rombo (límite del tile)")
print("    Azul   → zona de overlap OV (margen exterior)")
print("    Verde  → ejes centrales de referencia")
print("    Gris   → área interior pintable del rombo")
