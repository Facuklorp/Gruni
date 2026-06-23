import os
from PIL import Image

def extract_frames(img_path, num_frames=5):
    img = Image.open(img_path).convert("RGBA")
    w, h = img.size
    fw = w // num_frames
    fh = h
    frames = []
    
    for c in range(num_frames):
        box = (c*fw, 0, (c+1)*fw, fh)
        frame = img.crop(box)
        
        # Make white background transparent
        pixels = frame.load()
        for y in range(fh):
            for x in range(fw):
                pr, pg, pb, pa = pixels[x, y]
                if pr > 230 and pg > 230 and pb > 230:
                    pixels[x, y] = (255, 255, 255, 0)
        frames.append(frame)
        
    return frames

side_img = r"C:\Users\tecno\.gemini\antigravity\brain\0c91617d-d63e-4d7c-aa6c-129b72fadc16\wakfu_gruni_blue_hair_1782220498740.png"
front_img = r"C:\Users\tecno\.gemini\antigravity\brain\0c91617d-d63e-4d7c-aa6c-129b72fadc16\wakfu_gruni_front_1782220627257.png"
back_img = r"C:\Users\tecno\.gemini\antigravity\brain\0c91617d-d63e-4d7c-aa6c-129b72fadc16\wakfu_gruni_back_1782220637163.png"

side_frames = extract_frames(side_img, 5)
front_frames = extract_frames(front_img, 5)
back_frames = extract_frames(back_img, 5)

right_frames = side_frames
left_frames = [f.transpose(Image.FLIP_LEFT_RIGHT) for f in right_frames]

all_frames = front_frames + back_frames + right_frames + left_frames

# Find global bounding box of non-transparent pixels
min_x = 9999
min_y = 9999
max_x = 0
max_y = 0

for f in all_frames:
    bbox = f.getbbox()
    if bbox:
        if bbox[0] < min_x: min_x = bbox[0]
        if bbox[1] < min_y: min_y = bbox[1]
        if bbox[2] > max_x: max_x = bbox[2]
        if bbox[3] > max_y: max_y = bbox[3]

if min_x == 9999:
    min_x, min_y, max_x, max_y = 0, 0, all_frames[0].size[0], all_frames[0].size[1]

# Crop all frames to this unified box
cropped_frames = []
for f in all_frames:
    cropped_frames.append(f.crop((min_x, min_y, max_x, max_y)))

f_w = max_x - min_x
f_h = max_y - min_y

# Now we want the target fH to be 136 (to match the engine)
target_h = 136
target_w = int(f_w * (target_h / f_h))

final_frames = []
for f in cropped_frames:
    final_frames.append(f.resize((target_w, target_h), Image.LANCZOS))

# Compose the spritesheet
sheet = Image.new("RGBA", (5 * target_w, 4 * target_h), (0, 0, 0, 0))

def paste_row(frames, row_idx):
    for c, frame in enumerate(frames):
        sheet.paste(frame, (c * target_w, row_idx * target_h))

paste_row(final_frames[0:5], 0)
paste_row(final_frames[5:10], 1)
paste_row(final_frames[10:15], 2)
paste_row(final_frames[15:20], 3)

out_path = "assets/sprites/gruni/gruni_walk.png"
os.makedirs(os.path.dirname(out_path), exist_ok=True)
sheet.save(out_path)
print(f"Saved {out_path} ({target_w}x{target_h} per frame)")
