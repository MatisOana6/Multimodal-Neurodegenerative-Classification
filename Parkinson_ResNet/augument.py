import os
import cv2
import numpy as np
from glob import glob
from tqdm import tqdm
import random

base_dir = r"D:/Licenta/Datasets/PPMI_Oficial/Filtered"
output_base = r"D:/Licenta/Datasets/PPMI_Oficial/Augmented"
augmentation_config = {
    'PD': 0,
    'Prodromal': 0,
    'Control': 0,
    'SWEDD': 5
}

for label in augmentation_config.keys():
    os.makedirs(os.path.join(output_base, label), exist_ok=True)

def apply_augmentation(img, label=None):
    h, w = img.shape[:2]

    angle = random.uniform(-10, 10)
    M = cv2.getRotationMatrix2D((w / 2, h / 2), angle, 1)
    img = cv2.warpAffine(img, M, (w, h), borderMode=cv2.BORDER_REPLICATE)

    if random.random() < 0.2:
        shift = 10
        pts1 = np.float32([[0, 0], [w, 0], [0, h], [w, h]])
        pts2 = np.float32([
            [random.randint(0, shift), random.randint(0, shift)],
            [w - random.randint(0, shift), random.randint(0, shift)],
            [random.randint(0, shift), h - random.randint(0, shift)],
            [w - random.randint(0, shift), h - random.randint(0, shift)]
        ])
        matrix = cv2.getPerspectiveTransform(pts1, pts2)
        img = cv2.warpPerspective(img, matrix, (w, h), borderMode=cv2.BORDER_REPLICATE)

    if random.random() < 0.4:
        zoom_factor = random.uniform(0.92, 1.0)
        zh, zw = int(h * zoom_factor), int(w * zoom_factor)
        y1 = (h - zh) // 2
        x1 = (w - zw) // 2
        cropped = img[y1:y1 + zh, x1:x1 + zw]
        img = cv2.resize(cropped, (w, h))

    if random.random() < 0.6:
        if label == 'PD':
            alpha = random.uniform(1.05, 1.2)
            beta = random.uniform(-10, 0)
        else:
            alpha = random.uniform(0.95, 1.05)
            beta = random.uniform(-5, 5)
        img = cv2.convertScaleAbs(img, alpha=alpha, beta=beta)

    if random.random() < 0.3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY).astype(np.float32)
        noise = np.random.normal(0, 5, gray.shape).astype(np.float32)
        noisy = np.clip(gray + noise, 0, 255).astype(np.uint8)
        img = cv2.cvtColor(noisy, cv2.COLOR_GRAY2BGR)

    if random.random() < 0.2:
        k = random.choice([3])
        img = cv2.GaussianBlur(img, (k, k), 0)

    if random.random() < 0.2:
        kernel = np.ones((2, 2), np.uint8)
        if random.random() < 0.5:
            img = cv2.erode(img, kernel, iterations=1)
        else:
            img = cv2.dilate(img, kernel, iterations=1)

    if random.random() < 0.4:
        img = cv2.flip(img, 1)  

    if random.random() < 0.15:
        intensity = 3.0 if label == 'PD' else 1.5
        dx = cv2.GaussianBlur((np.random.rand(h, w) * 2 - 1).astype(np.float32), (31, 31), 5) * intensity
        dy = cv2.GaussianBlur((np.random.rand(h, w) * 2 - 1).astype(np.float32), (31, 31), 5) * intensity
        x, y = np.meshgrid(np.arange(w), np.arange(h))
        map_x = (x + dx).astype(np.float32)
        map_y = (y + dy).astype(np.float32)
        img = cv2.remap(img, map_x, map_y, interpolation=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)

    return img

for label, aug_per_image in augmentation_config.items():
    input_folder = os.path.join(base_dir, label)
    output_folder = os.path.join(output_base, label)
    images = glob(os.path.join(input_folder, "*.png"))

    for img_path in tqdm(images, desc=f"{label}"):
        img = cv2.imread(img_path)
        img_name = os.path.splitext(os.path.basename(img_path))[0]

        cv2.imwrite(os.path.join(output_folder, f"{img_name}_orig.png"), img)

        for i in range(aug_per_image):
            aug_img = apply_augmentation(img, label)
            save_path = os.path.join(output_folder, f"{img_name}_aug{i+1}.png")
            cv2.imwrite(save_path, aug_img)
