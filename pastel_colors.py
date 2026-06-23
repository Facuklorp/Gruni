import os
from PIL import Image, ImageEnhance

def make_pastel(img_path, out_path):
    if not os.path.exists(img_path):
        print(f"File not found: {img_path}")
        return
    img = Image.open(img_path).convert("RGBA")
    
    # Decrease saturation
    enhancer = ImageEnhance.Color(img)
    img = enhancer.enhance(0.55) # 55% saturation
    
    # Increase brightness
    enhancer = ImageEnhance.Brightness(img)
    img = enhancer.enhance(1.3) # 130% brightness
    
    # Reduce contrast slightly for a softer look
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(0.85)
    
    img.save(out_path)
    print(f"Saved {out_path}")

files = {
    'assets/sprout_grass.png': 'assets/sprout_grass_pastel.png',
    'Vegetación/Agua_Autotile.png': 'Vegetación/Agua_Autotile_pastel.png',
    'Vegetación/Agua_Arena_Autotile.png': 'Vegetación/Agua_Arena_Autotile_pastel.png',
    'Vegetación/Arena_Autotile.png': 'Vegetación/Arena_Autotile_pastel.png',
    'assets/sprout_objects.png': 'assets/sprout_objects_pastel.png',
}

for src, dst in files.items():
    make_pastel(src, dst)
