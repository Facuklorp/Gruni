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
grass_base = (134, 239, 172, 255)
grass_detail = (74, 222, 128, 255)
water_base = (14, 165, 233, 255)
water_detail = (56, 189, 248, 255)
foam_color = (186, 230, 253, 255)

random.seed(42)
grass_tex = [[grass_base for _ in range(16)] for _ in range(16)]
water_tex = [[water_base for _ in range(16)] for _ in range(16)]

# Grass details (vertical little strokes)
for _ in range(12):
    x = random.randint(0, 15)
    y = random.randint(0, 14)
    grass_tex[y][x] = grass_detail
    grass_tex[y+1][x] = grass_detail

# Water ripples (horizontal strokes)
for _ in range(10):
    x = random.randint(0, 13)
    y = random.randint(0, 15)
    water_tex[y][x] = water_detail
    water_tex[y][x+1] = water_detail
    water_tex[y][x+2] = water_detail

for idx, mask in enumerate(masks):
    cx = (idx % GRID_COLS)
    cy = (idx // GRID_COLS)
    px = cx * TILE_SIZE
    py = cy * TILE_SIZE
    for y in range(TILE_SIZE):
        for x in range(TILE_SIZE):
            img.putpixel((px + x, py + y), water_tex[y][x])

    def draw_quad(qx, qy, c1, c2, diag):
        off_x = px + qx * 8
        off_y = py + qy * 8
        has_c1 = (mask & c1) > 0
        has_c2 = (mask & c2) > 0
        has_d = (mask & diag) > 0
        
        def paint(dist, ax, ay):
            if dist <= 5:
                img.putpixel((off_x + ax, off_y + ay), grass_tex[off_y % 16 + ay][off_x % 16 + ax])
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

img.save('Agua_Autotile.png')
print('Done')
