from PIL import Image
files = [
    "Biomas/PASTO/iso/agua_iso_preview.png",
    "Biomas/PASTO/iso/agua_iso_preview_1.png",
    "Biomas/PASTO/iso/agua_iso_preview_2.png",
]
for f in files:
    img = Image.open(f)
    w, h = img.size
    print(f"{f.split('/')[-1]}: {w}x{h} px  (ratio {round(w/h,2)}:1)  modo={img.mode}")
