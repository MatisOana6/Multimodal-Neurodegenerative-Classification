import os
import pydicom
import numpy as np
from PIL import Image

source_root = r"D:/Licenta/Datasets/PPMI_Oficial/Sorted"
target_root = r"D:/Licenta/Datasets/PPMI_Oficial/Converted"
resize_dim = (224, 224)
num_slices = 24  


def process_and_save(image_array, output_path):
    mask = image_array > np.percentile(image_array, 5)
    if np.sum(mask) == 0:
        raise ValueError("Imaginea nu conține informație relevantă.")

    image_array -= np.min(image_array[mask])
    image_array /= np.max(image_array[mask])
    image_array *= 255.0
    img_uint8 = image_array.astype(np.uint8)

    img_resized = Image.fromarray(img_uint8).resize(resize_dim)
    img_resized.save(output_path)
    print(f"[✔] Saved: {output_path}")


def convert_patient_folder(patient_path, output_dir, class_name, patient_id):
    dicom_files = []

    for f in os.listdir(patient_path):
        full_path = os.path.join(patient_path, f)
        if f.lower().endswith(".dcm"):
            try:
                dcm = pydicom.dcmread(full_path, stop_before_pixels=True)
                instance = getattr(dcm, "InstanceNumber", None)
                if instance is not None:
                    dicom_files.append((instance, full_path))
            except Exception as e:
                print(f"Skipped: {full_path} ({e})")

    if not dicom_files:
        print(f"No DICOM found in {patient_path}")
        return

    dicom_files.sort(key=lambda x: x[0])

    center = len(dicom_files) // 2
    half = num_slices // 2
    selected_files = dicom_files[max(center - half, 0):center + half]

    for i, (_, dicom_path) in enumerate(selected_files):
        try:
            dcm = pydicom.dcmread(dicom_path)
            img_array = dcm.pixel_array.astype(np.float32)

            if 'RescaleSlope' in dcm and 'RescaleIntercept' in dcm:
                img_array = img_array * dcm.RescaleSlope + dcm.RescaleIntercept

            filename = f"{class_name}_{patient_id}_slice{i+1}.png"
            output_path = os.path.join(output_dir, filename)
            process_and_save(img_array, output_path)
        except Exception as e:
            print(f"[✘] Error processing {dicom_path}: {e}")


for class_name in ["PD", "SWEDD", "Control", "Prodromal"]:
    class_path = os.path.join(source_root, class_name)
    output_class_dir = os.path.join(target_root, class_name)
    os.makedirs(output_class_dir, exist_ok=True)

    for patient_folder in os.listdir(class_path):
        patient_path = os.path.join(class_path, patient_folder)
        if not os.path.isdir(patient_path):
            continue

        convert_patient_folder(patient_path, output_class_dir, class_name, patient_folder)
