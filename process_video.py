import cv2
import numpy as np
import os
import rembg

video_path = r'Gruni Sprites\Caminata hacia adelante gruni.mov'
output_dir = r'Gruni Sprites\Caminata_Adelante_Fluida'

if not os.path.exists(output_dir):
    os.makedirs(output_dir)

cap = cv2.VideoCapture(video_path)
frame_idx = 0

print("Initializing rembg session... This might download the model if it's the first time.")
session = rembg.new_session()
print("Session initialized.")

while True:
    ret, frame = cap.read()
    if not ret:
        break
    
    # Background removal
    out = rembg.remove(frame, session=session)
    
    # Pad to square
    h, w, c = out.shape
    pad_left = max((h - w) // 2, 0)
    pad_right = max(h - w - pad_left, 0)
    pad_top = max((w - h) // 2, 0)
    pad_bottom = max(w - h - pad_top, 0)
    
    padded = cv2.copyMakeBorder(out, pad_top, pad_bottom, pad_left, pad_right, cv2.BORDER_CONSTANT, value=[0,0,0,0])
    
    # Resize to 128x128
    resized = cv2.resize(padded, (128, 128), interpolation=cv2.INTER_AREA)
    
    out_path = os.path.join(output_dir, f'Gruni_caminando_fluido_{frame_idx+1:02d}.png')
    cv2.imwrite(out_path, resized)
    
    frame_idx += 1
    if frame_idx % 5 == 0:
        print(f"Processed {frame_idx} frames...")

cap.release()
print(f"Done! Saved {frame_idx} frames to {output_dir}")
