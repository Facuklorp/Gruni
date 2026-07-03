import os
from PIL import Image

def process_image(filepath, output_filepath):
    try:
        img = Image.open(filepath).convert("RGBA")
        
        # Obtener el bounding box (la parte no transparente)
        bbox = img.getbbox()
        if not bbox:
            return # Imagen vacía
            
        # Recortar al bounding box
        img = img.crop(bbox)
        w, h = img.size
        
        # Como era un rombo, las esquinas son transparentes. 
        # Para que sea un cuadrado de 512x512 SIN transparencia (como requiere el renderer ahora),
        # vamos a recortar el rectángulo interno más grande del rombo.
        # En un rombo perfecto, el rectángulo interior máximo mide la mitad del ancho y alto.
        crop_w = w * 0.5
        crop_h = h * 0.5
        
        left = (w - crop_w) / 2
        top = (h - crop_h) / 2
        right = left + crop_w
        bottom = top + crop_h
        
        # Recortar el centro (que es 100% opaco)
        center_crop = img.crop((int(left), int(top), int(right), int(bottom)))
        
        # Escalar a 512x512
        final_img = center_crop.resize((512, 512), Image.Resampling.LANCZOS)
        
        final_img.save(output_filepath)
        print(f"[OK] Procesado: {os.path.basename(filepath)}")
    except Exception as e:
        print(f"[ERROR] Error en {os.path.basename(filepath)}: {e}")

folder = "Biomas/PASTO/iso"
backup_folder = "Biomas/PASTO/iso/Sin corregir" # Guardamos originales acá por si acaso
os.makedirs(backup_folder, exist_ok=True)

for filename in os.listdir(folder):
    if filename.endswith(".png"):
        filepath = os.path.join(folder, filename)
        backup_path = os.path.join(backup_folder, filename)
        
        # Hacer un backup primero si no existe
        if not os.path.exists(backup_path):
            import shutil
            shutil.copy2(filepath, backup_path)
            
        process_image(backup_path, filepath) # Lee del backup, sobrescribe el original

print("¡Proceso terminado!")
