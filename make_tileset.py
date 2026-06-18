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
mapping = {}
grass_color = (134, 239, 172, 255)
water_color = (14, 165, 233, 255)
foam_color = (186, 230, 253, 255)

for idx, mask in enumerate(masks):
    cx = (idx % GRID_COLS)
    cy = (idx // GRID_COLS)
    mapping[mask] = [cx, cy]
    px = cx * TILE_SIZE
    py = cy * TILE_SIZE
    for y in range(TILE_SIZE):
        for x in range(TILE_SIZE):
            img.putpixel((px + x, py + y), water_color)
    def draw_quad(qx, qy, c1, c2, diag):
        off_x = px + qx * 8
        off_y = py + qy * 8
        has_c1 = (mask & c1) > 0
        has_c2 = (mask & c2) > 0
        has_d = (mask & diag) > 0
        if has_c1 and has_c2 and has_d:
            pass
        elif has_c1 and has_c2 and not has_d:
            for y in range(8):
                for x in range(8):
                    dx = x if qx == 1 else 7 - x
                    dy = y if qy == 1 else 7 - y
                    dist = (dx*dx + dy*dy)**0.5
                    if dist <= 5:
                        img.putpixel((off_x + x, off_y + y), grass_color)
                    elif dist <= 6.5:
                        img.putpixel((off_x + x, off_y + y), foam_color)
        elif has_c1 and not has_c2:
            for y in range(8):
                for x in range(8):
                    dist_to_grass = (7 - x) if qx == 0 else x
                    if dist_to_grass >= 4:
                        img.putpixel((off_x + x, off_y + y), grass_color)
                    elif dist_to_grass >= 2.5:
                        img.putpixel((off_x + x, off_y + y), foam_color)
        elif not has_c1 and has_c2:
            for y in range(8):
                for x in range(8):
                    dist_to_grass = (7 - y) if qy == 0 else y
                    if dist_to_grass >= 4:
                        img.putpixel((off_x + x, off_y + y), grass_color)
                    elif dist_to_grass >= 2.5:
                        img.putpixel((off_x + x, off_y + y), foam_color)
        else:
            for y in range(8):
                for x in range(8):
                    dx = (7 - x) if qx == 0 else x
                    dy = (7 - y) if qy == 0 else y
                    dist = (dx*dx + dy*dy)**0.5
                    if dist >= 4:
                        img.putpixel((off_x + x, off_y + y), grass_color)
                    elif dist >= 2.5:
                        img.putpixel((off_x + x, off_y + y), foam_color)
    draw_quad(0, 0, 1, 8, 32)
    draw_quad(1, 0, 1, 4, 16)
    draw_quad(0, 1, 2, 8, 128)
    draw_quad(1, 1, 2, 4, 64)

img.save('Agua_Autotile.png')
with open('autotile_mapping.json', 'w') as f:
    json.dump(mapping, f)
print('Done')
