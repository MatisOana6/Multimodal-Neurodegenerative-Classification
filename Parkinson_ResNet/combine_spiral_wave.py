import os
import shutil
from glob import glob

source_base = r"D:\Licenta\Datasets\Parkinson_s Drawings\augmented"
target_base = r"D:\Licenta\Datasets\Parkinson_s Drawings\augmented_combined"
types = ['training', 'testing']
classes = ['healthy', 'parkinson']

for split in types:
    for label in classes:
        os.makedirs(os.path.join(target_base, split, label), exist_ok=True)

for split in types:
    for label in classes:
        target_folder = os.path.join(target_base, split, label)

        for source_type in ['spiral', 'wave']:
            source_folder = os.path.join(source_base, source_type, split, label)
            images = glob(os.path.join(source_folder, "*.png"))

            for idx, img_path in enumerate(images):
                img_name = os.path.splitext(os.path.basename(img_path))[0]
                new_name = f"{source_type}_{img_name}.png"
                dest_path = os.path.join(target_folder, new_name)
                shutil.copy2(img_path, dest_path)

print("Combinarea spiral + wave a fost finalizată.")
