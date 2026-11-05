import cv2
import numpy as np
import os

JOBS = [
    (r'Gruni Sprites\Caminata hacia adelante gruni.mov', r'Gruni Sprites\Caminata_Adelante_Fluida_Rapida', 'Gruni_caminando_fluido'),
    (r'Gruni Sprites\Caminata hacia atras gruni.mov', r'Gruni Sprites\Caminata_Atras_Fluida_Rapida', 'Gruni_caminando_atras_fluido'),
    (r'Gruni Sprites\Caminata hacia derecha gruni.mov', r'Gruni Sprites\Caminata_Derecha_Fluida_Rapida', 'Gruni_caminando_derecha_fluido'),
    (r'Gruni Sprites\Caminata hacia izquierda gruni.mov', r'Gruni Sprites\Caminata_Izquierda_Fluida_Rapida', 'Gruni_caminando_izquierda_fluido'),
]

TARGET_SIZE = 512

for video_path, output_dir, prefix in JOBS:
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    cap = cv2.VideoCapture(video_path)
    frame_idx = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        h, w = frame.shape[:2]
        mask = np.zeros((h + 2, w + 2), np.uint8)
        tol = (10, 10, 10)
        for seed in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
            cv2.floodFill(frame, mask, seed, (0, 0, 0), tol, tol, flags=4 | cv2.FLOODFILL_MASK_ONLY | (255 << 8))

        bg_mask = mask[1:-1, 1:-1].copy()
        # Also remove enclosed pure-black holes (e.g., between headband ribbon and backpack)
        pure_black = (frame[:, :, 0] <= 6) & (frame[:, :, 1] <= 6) & (frame[:, :, 2] <= 6)
        bg_mask[pure_black] = 255

        fg_mask = 255 - bg_mask

        # Smooth alpha edge slightly at 1280p before downsampling to 512p for crisp anti-aliased borders
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
        fg_eroded = cv2.erode(fg_mask, kernel, iterations=1)
        alpha = cv2.GaussianBlur(fg_eroded, (3, 3), 0)

        rgba = cv2.cvtColor(frame, cv2.COLOR_BGR2BGRA)
        rgba[:, :, 3] = alpha

        # Pad to square (1280x1280)
        pad_left = max((h - w) // 2, 0)
        pad_right = max(h - w - pad_left, 0)
        pad_top = max((w - h) // 2, 0)
        pad_bottom = max(w - h - pad_top, 0)

        padded = cv2.copyMakeBorder(rgba, pad_top, pad_bottom, pad_left, pad_right, cv2.BORDER_CONSTANT, value=[0, 0, 0, 0])

        # Resize to 512x512 HD sprite
        resized = cv2.resize(padded, (TARGET_SIZE, TARGET_SIZE), interpolation=cv2.INTER_AREA)

        out_path = os.path.join(output_dir, f'{prefix}_{frame_idx+1:02d}.png')
        cv2.imwrite(out_path, resized)
        frame_idx += 1

    cap.release()
    print(f"Done {prefix}: {frame_idx} frames at {TARGET_SIZE}x{TARGET_SIZE}")
