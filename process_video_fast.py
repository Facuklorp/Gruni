import cv2
import numpy as np
import os

video_path = r'Gruni Sprites\Caminata hacia adelante gruni.mov'
output_dir = r'Gruni Sprites\Caminata_Adelante_Fluida_Rapida'

if not os.path.exists(output_dir):
    os.makedirs(output_dir)

cap = cv2.VideoCapture(video_path)
frame_idx = 0

while True:
    ret, frame = cap.read()
    if not ret:
        break
    
    # We know the background is perfectly [0,0,0]
    # Let's create an alpha channel based on that.
    # frame is BGR (1280, 720, 3)
    
    alpha = np.ones(frame.shape[:2], dtype=np.uint8) * 255
    # Find all exact [0,0,0] pixels
    bg_mask = (frame[:, :, 0] == 0) & (frame[:, :, 1] == 0) & (frame[:, :, 2] == 0)
    
    # We could floodfill from (0,0) to be safer if there are black pixels inside Gruni
    mask = np.zeros((frame.shape[0]+2, frame.shape[1]+2), np.uint8)
    cv2.floodFill(frame, mask, (0,0), (0,0,0), (0,0,0), (0,0,0), flags=cv2.FLOODFILL_MASK_ONLY | (255 << 8))
    
    # The mask contains 255 for the filled background
    bg_mask_filled = mask[1:-1, 1:-1] == 255
    alpha[bg_mask_filled] = 0
    
    # Also, some pixels might be very close to 0,0,0 (antialiasing)
    # We can try to make them semi-transparent
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    
    # Add alpha channel
    rgba = cv2.cvtColor(frame, cv2.COLOR_BGR2BGRA)
    rgba[:, :, 3] = alpha
    
    # Pad to 1280x1280
    h, w = frame.shape[:2]
    pad_left = max((h - w) // 2, 0)
    pad_right = max(h - w - pad_left, 0)
    pad_top = max((w - h) // 2, 0)
    pad_bottom = max(w - h - pad_top, 0)
    
    padded = cv2.copyMakeBorder(rgba, pad_top, pad_bottom, pad_left, pad_right, cv2.BORDER_CONSTANT, value=[0,0,0,0])
    
    # Resize to 128x128
    resized = cv2.resize(padded, (128, 128), interpolation=cv2.INTER_AREA)
    
    out_path = os.path.join(output_dir, f'Gruni_caminando_fluido_{frame_idx+1:02d}.png')
    cv2.imwrite(out_path, resized)
    
    frame_idx += 1
    if frame_idx % 5 == 0:
        print(f"Processed {frame_idx} frames...")

cap.release()
print(f"Done! Saved {frame_idx} frames to {output_dir}")
