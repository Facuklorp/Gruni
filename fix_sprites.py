from PIL import Image

def flood_fill_bg(img, bg_color, threshold=30):
    img = img.convert("RGBA")
    w, h = img.size
    pixels = img.load()
    
    # We will do a simple color distance threshold to make bg transparent
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if abs(r - bg_color[0]) < threshold and abs(g - bg_color[1]) < threshold and abs(b - bg_color[2]) < threshold:
                pixels[x, y] = (255, 255, 255, 0)
    return img

def isolate_main_character(frame_img):
    # frame_img is RGBA. Find connected components of non-transparent pixels
    w, h = frame_img.size
    pixels = frame_img.load()
    
    visited = set()
    components = []
    
    for y in range(h):
        for x in range(w):
            if pixels[x, y][3] > 0 and (x, y) not in visited:
                # BFS
                comp = []
                q = [(x, y)]
                visited.add((x, y))
                while q:
                    cx, cy = q.pop(0)
                    comp.append((cx, cy))
                    for dx, dy in [(0,1), (1,0), (0,-1), (-1,0), (1,1), (-1,-1), (1,-1), (-1,1)]:
                        nx, ny = cx + dx, cy + dy
                        if 0 <= nx < w and 0 <= ny < h:
                            if pixels[nx, ny][3] > 0 and (nx, ny) not in visited:
                                visited.add((nx, ny))
                                q.append((nx, ny))
                components.append(comp)
                
    if not components:
        return frame_img
        
    # Find the largest component (or the one closest to center)
    components.sort(key=len, reverse=True)
    main_comp = components[0]
    
    # Clear everything else
    main_comp_set = set(main_comp)
    for y in range(h):
        for x in range(w):
            if pixels[x, y][3] > 0 and (x, y) not in main_comp_set:
                pixels[x, y] = (0, 0, 0, 0)
                
    # Center the main component horizontally
    min_x = min(p[0] for p in main_comp)
    max_x = max(p[0] for p in main_comp)
    comp_w = max_x - min_x + 1
    
    # Calculate shift to center
    target_x = (w - comp_w) // 2
    shift_x = target_x - min_x
    
    # Create new centered frame
    new_frame = Image.new("RGBA", (w, h), (0,0,0,0))
    new_pixels = new_frame.load()
    for cx, cy in main_comp:
        new_pixels[cx + shift_x, cy] = pixels[cx, cy]
        
    return new_frame

def process_spritesheet(path, output_path, bg_color):
    sheet = Image.open(path).convert("RGBA")
    
    # 1. Remove background
    sheet = flood_fill_bg(sheet, bg_color, threshold=40)
    
    # For now, we only need to isolate and center frames for Walk and Run since they had leakage.
    # Actually, let's just do it for Walk and Run. For Axe/Mine/Attack, we used precise boxes.
    # Wait, the best way is to process the generated sheets!
    # They are in assets/sprites/gruni/
    
    w, h = sheet.size
    
    # Assume we know the frame dimensions based on the file name
    if "walk" in path:
        fw, fh = 78, 136
    elif "run" in path:
        fw, fh = 78, 145
    elif "axe" in path:
        fw, fh = 157, 280
    elif "attack" in path:
        fw, fh = 219, 284
    elif "mine" in path:
        fw, fh = 165, 305
    else:
        fw, fh = 78, 136
        
    cols = w // fw
    rows = h // fh
    
    new_sheet = Image.new("RGBA", (w, h), (0,0,0,0))
    
    for row in range(rows):
        for col in range(cols):
            box = (col*fw, row*fh, (col+1)*fw, (row+1)*fh)
            frame = sheet.crop(box)
            
            # Isolate and center
            frame = isolate_main_character(frame)
            
            new_sheet.paste(frame, box)
            
    new_sheet.save(output_path)
    print(f"Processed {path} -> {output_path}")

# Process all Gruni sprites
bg_jpg = (205, 205, 205) # Average bg color in JPG
bg_png = (200, 200, 200) # Average bg color in PNG

process_spritesheet("assets/sprites/gruni/gruni_walk.png", "assets/sprites/gruni/gruni_walk.png", bg_jpg)
process_spritesheet("assets/sprites/gruni/gruni_run.png", "assets/sprites/gruni/gruni_run.png", bg_jpg)

process_spritesheet("assets/sprites/gruni/gruni_axe.png", "assets/sprites/gruni/gruni_axe.png", bg_png)
process_spritesheet("assets/sprites/gruni/gruni_attack.png", "assets/sprites/gruni/gruni_attack.png", bg_png)
process_spritesheet("assets/sprites/gruni/gruni_mine.png", "assets/sprites/gruni/gruni_mine.png", bg_png)
