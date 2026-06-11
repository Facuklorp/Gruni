import os
from PIL import Image, ImageDraw

def process_sheet(path, fw, fh, bg_color):
    if not os.path.exists(path): return
    sheet = Image.open(path).convert("RGBA")
    w, h = sheet.size
    cols = w // fw
    rows = h // fh
    
    new_sheet = Image.new("RGBA", (w, h), (0,0,0,0))
    
    for r in range(rows):
        for c in range(cols):
            box = (c*fw, r*fh, (c+1)*fw, (r+1)*fh)
            frame = sheet.crop(box)
            
            # Floodfill from corners to remove background
            ImageDraw.floodfill(frame, (0, 0), (255, 255, 255, 0), thresh=25)
            ImageDraw.floodfill(frame, (fw-1, 0), (255, 255, 255, 0), thresh=25)
            ImageDraw.floodfill(frame, (0, fh-1), (255, 255, 255, 0), thresh=25)
            ImageDraw.floodfill(frame, (fw-1, fh-1), (255, 255, 255, 0), thresh=25)
            
            # Now isolate the main character (largest connected component of non-transparent)
            pixels = frame.load()
            visited = set()
            comps = []
            
            for y in range(fh):
                for x in range(fw):
                    if pixels[x, y][3] > 0 and (x, y) not in visited:
                        comp = []
                        q = [(x, y)]
                        visited.add((x, y))
                        while q:
                            cx, cy = q.pop(0)
                            comp.append((cx, cy))
                            for dx, dy in [(0,1), (1,0), (0,-1), (-1,0), (1,1), (-1,-1), (1,-1), (-1,1)]:
                                nx, ny = cx + dx, cy + dy
                                if 0 <= nx < fw and 0 <= ny < fh:
                                    if pixels[nx, ny][3] > 0 and (nx, ny) not in visited:
                                        visited.add((nx, ny))
                                        q.append((nx, ny))
                        comps.append(comp)
                        
            if comps:
                # To be safe, if a component is very small, we discard it (leakage or artifacts)
                # Keep only the largest component
                comps.sort(key=len, reverse=True)
                main_comp = comps[0]
                
                # If there are other components that are large (like a disconnected foot or sword), we should keep them if they are close.
                # Actually, AI sprites sometimes have disconnected pieces!
                # Let's keep any component that is > 5% of the main component's size, or just keep everything except things that touch the left/right border (leakage).
                valid_comps = []
                for comp in comps:
                    touches_edge = any(x == 0 or x == fw-1 for (x, y) in comp)
                    # Leakage touches the edge and is usually small.
                    if touches_edge and len(comp) < len(main_comp) * 0.3:
                        pass # discard leakage
                    else:
                        valid_comps.append(comp)
                        
                # Clear frame and draw only valid comps
                for y in range(fh):
                    for x in range(fw):
                        pixels[x, y] = (0, 0, 0, 0)
                
                all_valid_pixels = set()
                for comp in valid_comps:
                    all_valid_pixels.update(comp)
                
                # We need the original cropped frame to copy pixels from
                orig_pixels = sheet.crop(box).convert("RGBA").load()
                
                for x, y in all_valid_pixels:
                    pixels[x, y] = orig_pixels[x, y]
                    
                # Center horizontally
                min_x = min(p[0] for p in all_valid_pixels)
                max_x = max(p[0] for p in all_valid_pixels)
                comp_w = max_x - min_x + 1
                shift_x = (fw - comp_w) // 2 - min_x
                
                centered_frame = Image.new("RGBA", (fw, fh), (0,0,0,0))
                c_pixels = centered_frame.load()
                for x, y in all_valid_pixels:
                    if 0 <= x + shift_x < fw:
                        c_pixels[x + shift_x, y] = orig_pixels[x, y]
                
                new_sheet.paste(centered_frame, box)
            else:
                new_sheet.paste(frame, box)
                
    new_sheet.save(path)
    print(f"Cleaned {path}")

# Run for all
process_sheet("assets/sprites/gruni/gruni_walk.png", 78, 136, (205,205,205))
process_sheet("assets/sprites/gruni/gruni_run.png", 78, 145, (205,205,205))
process_sheet("assets/sprites/gruni/gruni_axe.png", 157, 280, (200,200,200))
process_sheet("assets/sprites/gruni/gruni_attack.png", 219, 284, (200,200,200))
process_sheet("assets/sprites/gruni/gruni_mine.png", 165, 305, (200,200,200))
