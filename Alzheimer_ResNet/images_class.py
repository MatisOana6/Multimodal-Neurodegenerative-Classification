import os

base_path = r"D:/Licenta/Datasets/ADNI_Oficial/Processed/Axial"
classes = ["AD", "CN", "EMCI", "LMCI", "MCI"]

for cls in classes:
    class_folder = os.path.join(base_path, cls)
    total = sum([len(files) for _, _, files in os.walk(class_folder)])
    print(f"{cls}: {total} imagini")
