import os
import pandas as pd
import shutil
import glob

csv_path = r"D:/Licenta/Datasets/PPMI_Oficial/ppmi_t1_t2_5_06_2025.csv"
source_root = r"D:/Licenta/Datasets/PPMI_Oficial/PPMI"
destination_root = r"D:/Licenta/Datasets/PPMI_Oficial/Sorted"

limits = {
    "SWEDD": None,      
    "Prodromal": 300,
    "PD": 500,
    "Control": None     
}


counter = {
    "SWEDD": 0,
    "Prodromal": 0,
    "PD": 0,
    "Control": 0
}

df = pd.read_csv(csv_path)

for _, row in df.iterrows():
    image_id = str(row["Image Data ID"])
    subject_id = str(row["Subject"])
    group = str(row["Group"])

    if limits[group] is not None and counter[group] >= limits[group]:
        continue

    pattern = os.path.join(source_root, subject_id, "*", "*", image_id)
    matches = glob.glob(pattern)

    if not matches:
        print(f"Folder lipsă pentru {subject_id} / {image_id}")
        continue

    src_folder = matches[0]
    dest_folder = os.path.join(destination_root, group, subject_id)
    os.makedirs(dest_folder, exist_ok=True)

    copied = False
    for file in os.listdir(src_folder):
        if file.lower().endswith(".dcm"):
            src = os.path.join(src_folder, file)
            dst = os.path.join(dest_folder, file)
            shutil.copy2(src, dst)
            copied = True

    if copied:
        counter[group] += 1
        print(f"[✔] {subject_id}/{image_id} → {group}/{subject_id} (total: {counter[group]})")

print("\n=== FINAL ===")
for group, count in counter.items():
    print(f"{group}: {count} subiecți procesați")
