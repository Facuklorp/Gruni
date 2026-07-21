import os
import json
from PIL import Image

def build_map():
    base_dir = r"C:\Users\tecno\OneDrive\Documentos\Hola\Otros\Grunis"
    img_path = os.path.join(base_dir, "Mapas arboles y agua.png")
    out_path = os.path.join(base_dir, "js", "map_data.js")

    if not os.path.exists(img_path):
        print("Image not found:", img_path)
        return

    print("Loading image...")
    img = Image.open(img_path).convert("RGBA")
    width, height = img.size
    pixels = img.load()

    SCALE = 3.5
    ISO_W = 32 * SCALE
    ISO_H = 16 * SCALE
    OFFSET_X = 944 * SCALE
    OFFSET_Y = 0
    
    # We found previously that bounds are X[-12, 71] and Y[-26, 77]
    GRID_OFFSET_X = -12
    GRID_OFFSET_Y = -26
    WORLD_WIDTH = 84
    WORLD_HEIGHT = 104

    map_data = []

    print("Processing pixels...")
    for y in range(GRID_OFFSET_Y, GRID_OFFSET_Y + WORLD_HEIGHT):
        row = []
        for x in range(GRID_OFFSET_X, GRID_OFFSET_X + WORLD_WIDTH):
            sx = (x - y) * (ISO_W / 2) + OFFSET_X
            sy = (x + y) * (ISO_H / 2) + OFFSET_Y
            cx, cy = int(sx + ISO_W/2), int(sy + ISO_H/2)
            
            # Default to grass/empty
            cell_type = "EMPTY"
            biome = "GRASS"
            
            if 0 <= cx < width and 0 <= cy < height:
                r, g, b, a = pixels[cx, cy]
                if a > 50:
                    if r > 200 and g > 200 and b > 200:
                        cell_type = "WOOD" # Snow Tree
                    elif b > 150 and b > r and g > 100:
                        cell_type = "WATER"
                        biome = "WATER_BIOME"
                    elif r > 150 and g > 50 and b < 100:
                        cell_type = "WOOD" # Desert Tree
                        biome = "DESERT"
                    elif g > r and g > b:
                        cell_type = "WOOD" # Forest Tree
            
            row.append({"t": cell_type, "b": biome})
        map_data.append(row)

    print("Writing map_data.js...")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("export const MAP_DATA = ")
        json.dump(map_data, f)
        f.write(";\n")
        
    print(f"Done! Created {out_path} with {WORLD_WIDTH}x{WORLD_HEIGHT} tiles.")

if __name__ == "__main__":
    build_map()
