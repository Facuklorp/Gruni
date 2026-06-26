import os
from PIL import Image

def process_trees(img_path, prefix, output_dir):
    if not os.path.exists(img_path):
        print(f"Error: No se encontro la imagen {img_path}")
        return

    print(f"Procesando {img_path}...")
    
    pil_img = Image.open(img_path).convert("RGBA")
    width, height = pil_img.size
    pixels = pil_img.load()
    
    # Primero, hacer transparente el fondo (blanco puro o casi blanco)
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            if r > 240 and g > 240 and b > 240:
                pixels[x, y] = (r, g, b, 0)
                
    # Encontrar componentes conectados (árboles) usando BFS
    visited = set()
    components = []
    
    def get_neighbors(cx, cy):
        return [(cx+1, cy), (cx-1, cy), (cx, cy+1), (cx, cy-1), 
                (cx+1, cy+1), (cx-1, cy-1), (cx+1, cy-1), (cx-1, cy+1)]

    for y in range(height):
        for x in range(width):
            if (x, y) not in visited and pixels[x, y][3] > 0: # Si no es transparente
                # Nuevo componente
                comp_pixels = []
                queue = [(x, y)]
                visited.add((x, y))
                
                # Para bounding box más rápido
                min_x, max_x = x, x
                min_y, max_y = y, y
                
                while queue:
                    cx, cy = queue.pop(0)
                    comp_pixels.append((cx, cy))
                    
                    if cx < min_x: min_x = cx
                    if cx > max_x: max_x = cx
                    if cy < min_y: min_y = cy
                    if cy > max_y: max_y = cy
                    
                    for nx, ny in get_neighbors(cx, cy):
                        if 0 <= nx < width and 0 <= ny < height:
                            if (nx, ny) not in visited and pixels[nx, ny][3] > 0:
                                visited.add((nx, ny))
                                queue.append((nx, ny))
                                
                if len(comp_pixels) > 500: # Ignorar ruido o puntitos
                    components.append((min_x, min_y, max_x, max_y))

    print(f"Encontrados {len(components)} arboles.")
    
    # Ordenar de izquierda a derecha, arriba a abajo
    components.sort(key=lambda b: (b[1]//100, b[0]))
    
    os.makedirs(output_dir, exist_ok=True)

    count = 1
    for (min_x, min_y, max_x, max_y) in components:
        pad = 5
        box = (max(0, min_x - pad), max(0, min_y - pad), min(width, max_x + pad), min(height, max_y + pad))
        cropped = pil_img.crop(box)
        
        out_name = os.path.join(output_dir, f"{prefix}_{count}.png")
        cropped.save(out_name)
        print(f"  Guardado: {out_name} ({cropped.width}x{cropped.height})")
        count += 1
        
    print(f"Terminado {prefix}. Extraidos: {count-1} arboles.\n")

if __name__ == '__main__':
    base_dir = r"C:\Users\tecno\OneDrive\Documentos\Hola\Otros\Grunis"
    assets_dir = os.path.join(base_dir, "assets")
    
    tree_normal = os.path.join(assets_dir, "arboles_isometricos.png")
    tree_fruit  = os.path.join(assets_dir, "arboles_fruta_isometricos.png")
    
    out_dir = os.path.join(assets_dir, "Vegetación")
    
    process_trees(tree_normal, "iso_arbol", out_dir)
    process_trees(tree_fruit, "iso_frutal", out_dir)
