import os
import cv2
import numpy as np
from tqdm import tqdm

input_dir = "D:/Licenta/Datasets/ADNI_Oficial/Processed/Sagittal/Train"
output_dir = "D:/Licenta/Datasets/ADNI_Oficial/Filtered/Sagittal/Train"
deleted_log = "D:/Licenta/Datasets/ADNI_Oficial/Filtered/imagini_eliminate.txt"

os.makedirs(output_dir, exist_ok=True)

threshold = 245           
pixel_ratio_limit = 0.015  
margin = 30               

def has_white_noise_on_edges(img, threshold, pixel_ratio_limit):
    h, w = img.shape
    top = img[:margin, :].flatten()
    bottom = img[-margin:, :].flatten()
    left = img[:, :margin].flatten()
    right = img[:, -margin:].flatten()
    edges = np.concatenate([top, bottom, left, right])
    white_pixels = np.sum(edges > threshold)
    white_ratio = white_pixels / edges.size
    return white_ratio > pixel_ratio_limit

deleted_images = []
count_deleted = 0
count_kept = 0

for root, _, files in os.walk(input_dir):
    for file in tqdm(files, desc="Filtrare imagini zgomotoase"):
        if not file.lower().endswith(('.png', '.jpg', '.jpeg')):
            continue

        img_path = os.path.join(root, file)
        img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            continue

        if has_white_noise_on_edges(img, threshold, pixel_ratio_limit):
            deleted_images.append(file)
            count_deleted += 1
            continue

        rel_subpath = os.path.relpath(root, input_dir)
        output_subdir = os.path.join(output_dir, rel_subpath)
        os.makedirs(output_subdir, exist_ok=True)
        out_path = os.path.join(output_subdir, file)
        cv2.imwrite(out_path, img)
        count_kept += 1

with open(deleted_log, "w") as f:
    for filename in deleted_images:
        f.write(f"{filename}\n")

print(f"\n Gata!")
print(f" Eliminat imagini: {count_deleted}")
print(f" Păstrat imagini: {count_kept}")
print(f" Imagini curate salvate în: {output_dir}")
print(f" Log salvat în: {deleted_log}")
