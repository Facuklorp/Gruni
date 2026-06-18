import random
from PIL import Image, ImageDraw
import json

TILE_SIZE = 16
GRID_COLS = 7

cardinals = [(0, -1, 1), (0, 1, 2), (1, 0, 4), (-1, 0, 8)]
diagonals = [(1, -1, 16, 1, 4), (-1, -1, 32, 1, 8), (1, 1, 64, 2, 4), (-1, 1, 128, 2, 8)]

unique_masks = set()
for i in range(256):
    mask = i
    for dx, dy, d_val, c1_val, c2_val in diagonals:
        if (mask & d_val):
            if not ((mask & c1_val) and (mask & c2_val)):
                mask &= ~d_val
    unique_masks.add(mask)

masks = sorted(list(unique_masks))
W = GRID_COLS * TILE_SIZE
H = ((len(masks) + GRID_COLS - 1) // GRID_COLS) * TILE_SIZE
img = Image.new('RGBA', (W, H), (0, 0, 0, 0))

# Create 16x16 seamless textures
bg_base = (134, 239, 172, 255) # Grass
bg_detail = (74, 222, 128, 255)
fg_base = (252, 211, 77, 255) # Sand
fg_detail = (251, 191, 36, 255)
foam_color = (253, 230, 138, 255) # Light sand border

random.seed(42)
bg_tex = [[bg_base for _ in range(16)] for _ in range(16)]
fg_tex = [[fg_base for _ in range(16)] for _ in range(16)]

# Grass details
for _ in range(12):
    x = random.randint(0, 15)
    y = random.randint(0, 14)
    bg_tex[y][x] = bg_detail
    bg_tex[y+1][x] = bg_detail

# Sand dots
for _ in range(20):
    x = random.randint(0, 15)
    y = random.randint(0, 15)
    fg_tex[y][x] = fg_detail

for idx, mask in enumerate(masks):
    cx = (idx % GRID_COLS)
    cy = (idx // GRID_COLS)
    px = cx * TILE_SIZE
    py = cy * TILE_SIZE
    for y in range(TILE_SIZE):
        for x in range(TILE_SIZE):
            img.putpixel((px + x, py + y), fg_tex[y][x])

    def draw_quad(qx, qy, c1, c2, diag):
        off_x = px + qx * 8
        off_y = py + qy * 8
        has_c1 = (mask & c1) > 0
        has_c2 = (mask & c2) > 0
        has_d = (mask & diag) > 0
        
        def paint(dist, ax, ay):
            if dist <= 5:
                img.putpixel((off_x + ax, off_y + ay), bg_tex[off_y % 16 + ay][off_x % 16 + ax])
            elif dist <= 6.5:
                img.putpixel((off_x + ax, off_y + ay), foam_color)

        if has_c1 and has_c2 and has_d:
            pass
        elif has_c1 and has_c2 and not has_d:
            for y in range(8):
                for x in range(8):
                    dx = x if qx == 1 else 7 - x
                    dy = y if qy == 1 else 7 - y
                    dist = (dx*dx + dy*dy)**0.5
                    paint(dist, x, y)
        elif has_c1 and not has_c2:
            for y in range(8):
                for x in range(8):
                    dist = (7 - x) if qx == 0 else x
                    paint(dist + 1.1, x, y)
        elif not has_c1 and has_c2:
            for y in range(8):
                for x in range(8):
                    dist = (7 - y) if qy == 0 else y
                    paint(dist + 1.1, x, y)
        else:
            for y in range(8):
                for x in range(8):
                    dx = (7 - x) if qx == 0 else x
                    dy = (7 - y) if qy == 0 else y
                    dist = (dx*dx + dy*dy)**0.5
                    paint(dist + 1.1, x, y)

    draw_quad(0, 0, 1, 8, 32)
    draw_quad(1, 0, 1, 4, 16)
    draw_quad(0, 1, 2, 8, 128)
    draw_quad(1, 1, 2, 4, 64)

img.save('Arena_Autotile.png')
print('Done')
