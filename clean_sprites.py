import os
from PIL import Image

def process_sheet(path, fw, fh):
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
            
            # 1. Make near-white background transparent
            pixels = frame.load()
            for y in range(fh):
                for x in range(fw):
                    pr, pg, pb, pa = pixels[x, y]
                    if pr > 225 and pg > 225 and pb > 225:
                        pixels[x, y] = (255, 255, 255, 0)
            
            # 2. Isolate main character
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
                # Keep largest component
                comps.sort(key=len, reverse=True)
                main_comp = comps[0]
                
                # Keep any component that is relatively large (avoid deleting separated weapon parts)
                valid_comps = []
                for comp in comps:
                    # Leakage lines from adjacent frames usually touch the edge and are small/thin.
                    touches_edge = any(x == 0 or x == fw-1 for (x, y) in comp)
                    if touches_edge and len(comp) < len(main_comp) * 0.4:
                        continue # discard this leakage
                    valid_comps.append(comp)
                        
                # Clear frame
                for y in range(fh):
                    for x in range(fw):
                        pixels[x, y] = (0, 0, 0, 0)
                
                all_valid_pixels = set()
                for comp in valid_comps:
                    all_valid_pixels.update(comp)
                
                orig_pixels = sheet.crop(box).convert("RGBA").load()
                
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
                        # Remove white background from the original pixel too before pasting!
                        pr, pg, pb, pa = c_pixels[x + shift_x, y]
                        if pr > 225 and pg > 225 and pb > 225:
                            c_pixels[x + shift_x, y] = (255, 255, 255, 0)
                            
                new_sheet.paste(centered_frame, box)
            else:
                new_sheet.paste(frame, box)
                
    new_sheet.save(path)
    print(f"Cleaned {path}")

# Process all
process_sheet("assets/sprites/gruni/gruni_walk.png", 78, 136)
process_sheet("assets/sprites/gruni/gruni_run.png", 78, 145)
process_sheet("assets/sprites/gruni/gruni_axe.png", 157, 280)
process_sheet("assets/sprites/gruni/gruni_attack.png", 219, 284)
process_sheet("assets/sprites/gruni/gruni_mine.png", 165, 305)
