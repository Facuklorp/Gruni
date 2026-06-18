from PIL import Image, ImageDraw
import json
import random

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

bg_base = (134, 239, 172, 255) # Grass
bg_detail = (74, 222, 128, 255)
fg_base = (14, 165, 233, 255) # Water
fg_detail = (56, 189, 248, 255)
foam_color = (186, 230, 253, 255) # Light blue foam

random.seed(42)
bg_tex = [[bg_base for _ in range(16)] for _ in range(16)]
fg_tex = [[fg_base for _ in range(16)] for _ in range(16)]

for _ in range(12):
    x = random.randint(0, 15)
    y = random.randint(0, 14)
    bg_tex[y][x] = bg_detail
    bg_tex[y+1][x] = bg_detail

for _ in range(10):
    x = random.randint(0, 13)
    y = random.randint(0, 15)
    fg_tex[y][x] = fg_detail
    fg_tex[y][x+1] = fg_detail
    fg_tex[y][x+2] = fg_detail

def dist(x1, y1, x2, y2):
    return ((x1-x2)**2 + (y1-y2)**2)**0.5

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
        
        for y in range(8):
            for x in range(8):
                # Distance from the corner that points OUTWARD
                # For TL (qx=0, qy=0), outward corner is x=0, y=0
                # For TR (qx=1, qy=0), outward corner is x=7, y=0
                cx_out = 0 if qx == 0 else 7
                cy_out = 0 if qy == 0 else 7
                
                # Distance from the corner that points INWARD (center of tile)
                cx_in = 7 if qx == 0 else 0
                cy_in = 7 if qy == 0 else 0
                
                is_grass = False
                is_foam = False
                
                if has_c1 and has_c2 and has_d:
                    pass # Fully water
                elif has_c1 and has_c2 and not has_d:
                    # Inner corner (grass pokes into the center)
                    d = dist(x, y, cx_out, cy_out)
                    if d <= 3:
                        is_grass = True
                    elif d <= 4.5:
                        is_foam = True
                elif has_c1 and not has_c2:
                    # Vertical edge. Grass is on the c2 side (Left/Right)
                    dist_to_edge = x if qx == 0 else (7 - x)
                    if dist_to_edge <= 3:
                        is_grass = True
                    elif dist_to_edge <= 4.5:
                        is_foam = True
                elif not has_c1 and has_c2:
                    # Horizontal edge. Grass is on the c1 side (Top/Bottom)
                    dist_to_edge = y if qy == 0 else (7 - y)
                    if dist_to_edge <= 3:
                        is_grass = True
                    elif dist_to_edge <= 4.5:
                        is_foam = True
                else:
                    # Outer corner. Mostly grass, water curves around the inner corner
                    d = dist(x, y, cx_in, cy_in)
                    if d >= 4.5:
                        is_grass = True
                    elif d >= 3:
                        is_foam = True
                
                if is_grass:
                    img.putpixel((off_x + x, off_y + y), bg_tex[(off_y + y) % 16][(off_x + x) % 16])
                elif is_foam:
                    img.putpixel((off_x + x, off_y + y), foam_color)

    # Top-Left: c1=N(1), c2=W(8), diag=NW(32)
    draw_quad(0, 0, 1, 8, 32)
    # Top-Right: c1=N(1), c2=E(4), diag=NE(16)
    draw_quad(1, 0, 1, 4, 16)
    # Bottom-Left: c1=S(2), c2=W(8), diag=SW(128)
    draw_quad(0, 1, 2, 8, 128)
    # Bottom-Right: c1=S(2), c2=E(4), diag=SE(64)
    draw_quad(1, 1, 2, 4, 64)

img.save('Agua_Autotile.png')
print('Done Agua')
