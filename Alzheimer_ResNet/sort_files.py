import os
import pandas as pd
import shutil

csv_path = r"D:/Licenta/Datasets/ADNI_Oficial/ADNI_DATASET.csv"
source_root = r"D:/Licenta/Datasets/ADNI_Oficial/ADNI"
destination_root = r"D:/Licenta/Datasets/ADNI_Oficial/Sorted"

sagittal_keywords = ["MPRAGE", "SAG", "SAGITTAL"]
axial_keywords = ["FLAIR", "AXIAL", "T2"]

df = pd.read_csv(csv_path)
group_map = dict(zip(df["Subject"], df["Group"]))

def get_orientation(folder_name):
    name = folder_name.lower()
    if any(k.lower() in name for k in sagittal_keywords):
        return "Sagittal"
    if any(k.lower() in name for k in axial_keywords):
        return "Axial"
    return None

for subject_id in os.listdir(source_root):
    subject_path = os.path.join(source_root, subject_id)
    if not os.path.isdir(subject_path):
        continue

    diagnosis = group_map.get(subject_id)
    if not diagnosis:
        print(f"No label found for {subject_id}")
        continue

    for scan_type in os.listdir(subject_path):
        scan_path = os.path.join(subject_path, scan_type)
        if not os.path.isdir(scan_path):
            continue

        orientation = get_orientation(scan_type)
        if not orientation:
            continue

        for root, _, files in os.walk(scan_path):
            for file in files:
                if file.lower().endswith(".dcm"):
                    src = os.path.join(root, file)
                    dest_dir = os.path.join(destination_root, orientation, diagnosis, subject_id)
                    os.makedirs(dest_dir, exist_ok=True)
                    shutil.copy2(src, dest_dir)
                    print(f"Copied: {file} → {orientation}/{diagnosis}/{subject_id}")
