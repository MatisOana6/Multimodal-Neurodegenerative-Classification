import os
import cv2
import numpy as np
import csv
from tqdm import tqdm
from skimage.measure import shannon_entropy


input_dir = "D:/Licenta/Datasets/PPMI_Oficial/Converted/"
output_dir = "D:/Licenta/Datasets/PPMI_Oficial/Processed/"
resize_dim = (224, 224)
csv_report_path = "D:/Licenta/Datasets/Updated_ADNI/filtrare_raport.csv"

def preprocess_mri(img):
    img = cv2.normalize(img.astype(np.float32), None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    clahe = cv2.createCLAHE(clipLimit=1.2, tileGridSize=(8, 8))
    img = clahe.apply(img)
    blurred = cv2.GaussianBlur(img, (0, 0), 3)
    img = cv2.addWeighted(img, 1.5, blurred, -0.5, 0)
    gamma = 1.2
    lookup_table = np.array([((i / 255.0) ** (1.0 / gamma)) * 255 for i in range(256)]).astype(np.uint8)
    img = cv2.LUT(img, lookup_table)
    return img


def has_central_energy(image, ratio_threshold=0.02):
    h, w = image.shape
    cx, cy = w // 2, h // 2
    central = image[cy-32:cy+32, cx-32:cx+32]
    total_energy = np.sum(image)
    central_energy = np.sum(central)
    return (central_energy / total_energy) > ratio_threshold if total_energy != 0 else False


total_processed = 0
report_data = []

for root, _, files in os.walk(input_dir):
    files = [f for f in files if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
    for file in tqdm(files, desc=f"Processing {os.path.basename(root)}"):
        img_path = os.path.join(root, file)
        rel_path = os.path.relpath(root, input_dir)
        output_subdir = os.path.join(output_dir, rel_path)
        os.makedirs(output_subdir, exist_ok=True)

        img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
        if img is None:
            print(f" Cannot read: {img_path}")
            continue

        processed = preprocess_mri(img)
        entropy = shannon_entropy(processed)
        clarity = cv2.Laplacian(processed, cv2.CV_64F).var()
        central_ok = has_central_energy(processed)

        resized = cv2.resize(processed, resize_dim)
        dst_path = os.path.join(output_subdir, file)
        cv2.imwrite(dst_path, resized)
        total_processed += 1
        report_data.append([file, entropy, clarity, central_ok])


with open(csv_report_path, "w", newline='') as csvfile:
    writer = csv.writer(csvfile)
    writer.writerow(["Filename", "Entropy", "Clarity", "CentralEnergy"])
    writer.writerows(report_data)

print(f"\n Finished: {total_processed} images processed and saved in {output_dir}.")
print(f" Report saved in: {csv_report_path}")
