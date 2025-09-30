import torch
import numpy as np
import cv2
from PIL import Image, ImageEnhance
from datetime import datetime
from pytorch_grad_cam import AblationCAM, ScoreCAM, GradCAM
from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget
from pytorch_grad_cam.utils.image import show_cam_on_image
from torchvision import transforms
from skimage.transform import resize
from torchvision.transforms import v2 as T

alz_classes = ['AD', 'CN', 'EMCI', 'LMCI', 'MCI']
park_classes = ['Control', 'PD', 'Prodromal', 'SWEDD']

transform_axial = T.Compose([
    T.Grayscale(num_output_channels=3),
    T.Resize((256, 256)),
    T.ToTensor(),
    T.Normalize([0.2006]*3, [0.2396]*3)
])

transform_sagittal = T.Compose([
    T.Grayscale(num_output_channels=3),
    T.Resize((256, 256)),
    T.ToTensor(),
    T.Normalize([0.2487]*3, [0.2599]*3)
])

transform_parkinson = T.Compose([
    T.Grayscale(num_output_channels=3),
    T.Resize((256, 256)),
    T.ToTensor(),
    T.Normalize([0.2514]*3, [0.2475]*3)
])

def get_max_activation_zone(grayscale_cam, modality):
    heatmap = (grayscale_cam * 255).astype(np.uint8)
    _, binary = cv2.threshold(heatmap, 100, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if not contours:
        return "no significant activation"

    x, y, w, h = cv2.boundingRect(max(contours, key=cv2.contourArea))
    cx, cy = x + w // 2, y + h // 2

    if modality == "mri_sagittal":
        if cx < 85:
            return "frontal lobe"
        elif 85 <= cx < 170:
            return "hippocampal/parietal"
        else:
            return "occipital lobe"
    else:
        if cy < 100:
            return "frontal lobe"
        elif 100 <= cy < 170:
            return "temporal lobe"
        else:
            return "occipital/parietal lobe"


def get_region_scores(grayscale_cam, modality):
    if modality == "mri_sagittal":
        w = grayscale_cam.shape[1]
        regions = {
            "frontal lobe": grayscale_cam[:, :int(w * 0.33)],
            "hippocampal/parietal": grayscale_cam[:, int(w * 0.33):int(w * 0.66)],
            "occipital lobe": grayscale_cam[:, int(w * 0.66):]
        }
    else:
        h = grayscale_cam.shape[0]
        regions = {
            "frontal lobe": grayscale_cam[0:int(h * 0.33), :],
            "temporal lobe": grayscale_cam[int(h * 0.33):int(h * 0.66), :],
            "occipital/parietal lobe": grayscale_cam[int(h * 0.66):, :]
        }
    scores = {}
    for name, region in regions.items():
        avg = float(np.mean(region))
        peak = float(np.max(region))
        scores[name] = {
            "average": round(avg, 3),
            "peak": round(peak, 3)
        }
    return scores


def mask_non_brain_regions(cam: np.ndarray, modality: str) -> np.ndarray:
    h, w = cam.shape
    mask = np.ones((h, w), dtype=np.float32)
    if modality == "mri_axial":
        mask[:int(h * 0.1), :] = 0
        mask[int(h * 0.93):, :] = 0
        mask[:, :int(w * 0.1)] = 0
        mask[:, int(w * 0.9):] = 0
    else:
        mask[int(h * 0.7):, :] = 0

    return cam * mask


def mask_non_brain_regions_ensemble(cam: np.ndarray, mask_type: str) -> np.ndarray:
    h, w = cam.shape
    mask = np.zeros((h, w), dtype=np.float32)

    if mask_type == "axial":
        mask = np.ones((h, w), dtype=np.float32)
        mask[:int(h * 0.1), :] = 0
        mask[int(h * 0.93):, :] = 0
        mask[:, :int(w * 0.1)] = 0
        mask[:, int(w * 0.9):] = 0

    else:
        mask[int(h * 0.7):, :] = 0

    return cam * mask



def generate_cam_combined(model, image_path, device, disease: str, modality: str, pred_class_idx=None):
    model.eval()

    image_full = Image.open(image_path).convert('RGB').resize((256, 256))
    image_np_full = np.array(image_full).astype(np.float32) / 255.0
    image_np_full = np.clip(image_np_full, 0, 1)

    image = image_full.resize((128, 128))
    transform = transform_axial if modality == "mri_axial" else (
        transform_sagittal if modality == "mri_sagittal" else transform_parkinson
    )
    input_tensor = transform(image).unsqueeze(0).to(device)

    class_names = (
        alz_classes if disease.lower() == "alzheimer"
        else ["Healthy", "Parkinson"] if modality == "drawing"
        else park_classes
    )

    try:
        target_layers = [
            model.resnet.layer2[-1],
            model.resnet.layer3[-1],
            model.resnet.layer4[-1]
        ]
        cam_model = model.resnet
    except AttributeError:
        target_layers = [model.layer3[-1]]
        cam_model = model

    if pred_class_idx is None:
        with torch.inference_mode(), torch.amp.autocast(device_type=device.type, enabled=device.type == 'cuda'):
            outputs = model(input_tensor)
            _, pred_class = torch.max(outputs, 1)
            pred_class_idx = pred_class.item()

    if modality == "mri_axial":
        cam_method = AblationCAM
    elif modality == "mri_sagittal":
        cam_method = ScoreCAM
    elif modality == "mri":
        cam_method = ScoreCAM
    else:
        cam_method = GradCAM

    cam = cam_method(model=cam_model, target_layers=target_layers)
    with torch.inference_mode(), torch.amp.autocast(device_type=device.type, enabled=device.type == 'cuda'):
        grayscale_cam = cam(input_tensor=input_tensor, targets=[ClassifierOutputTarget(pred_class_idx)])[0]

    masked_cam = mask_non_brain_regions(grayscale_cam, modality)
    resized_cam = cv2.resize(masked_cam, image_np_full.shape[:2][::-1])
    cam_image = show_cam_on_image(image_np_full, resized_cam, use_rgb=True, image_weight=0.7)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    save_path = f"temp/cam_{timestamp}.png"
    cv2.imwrite(save_path, cv2.cvtColor(cam_image, cv2.COLOR_RGB2BGR))

    activation_zone = get_max_activation_zone(resized_cam, modality)
    region_scores = get_region_scores(resized_cam, modality)
    activation_score = region_scores.get(activation_zone.lower(), {}).get("average")
    if activation_score is None:
        activation_score = max([v["average"] for v in region_scores.values()])

    return {
        "gradcam_path": save_path,
        "predicted_class": class_names[pred_class_idx],
        "activation_zone": activation_zone,
        "activation_score": round(float(activation_score), 3),
        "region_scores": region_scores
    }

