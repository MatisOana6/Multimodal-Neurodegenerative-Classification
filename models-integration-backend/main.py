import threading
import uuid
from datetime import datetime

import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File, Form
import shutil, os
import torch

from contour.tremor_heatmap import analyze_drawing_quality

torch.backends.cudnn.benchmark = True
from matplotlib import pyplot as plt
from starlette.staticfiles import StaticFiles
from torchvision import transforms
from PIL import Image
from concurrent.futures import ThreadPoolExecutor

from constants.constants import alz_classes, park_classes
from evaluation.eval_alzheimer_axial import alz_ax_50, alz_ax_101
from evaluation.eval_alzheimer_sagittal import alz_sag_50, alz_sag_101
from evaluation.eval_parkinson import park_50, park_101
from gradcam.gradcam import generate_cam_combined, mask_non_brain_regions, mask_non_brain_regions_ensemble
from models.model_loader import load_model_for
from transforms.transform_utils import get_transform_for
from utils.audio_utils import load_audio_and_spectrogram
from evaluation.eval_ensemble_all import predict_with_ensemble_fixed
from utils.predict_utils import predict_image_with_model

app = FastAPI(
    title="Neurodegenerative Disease Classifier API",
    description="Model API for predicting Alzheimer and Parkinson from MRI, Audio and Drawings",
    version="1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)
executor = ThreadPoolExecutor(max_workers=4)

MODEL_CACHE = {}

def get_cached_model(disease, modality, device):
    key = f"{disease}_{modality}"
    if key not in MODEL_CACHE:
        MODEL_CACHE[key] = load_model_for(disease, modality, device)
    return MODEL_CACHE[key]

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(torch.cuda.is_available())
print(torch.cuda.get_device_name() if torch.cuda.is_available() else "CPU only")

app.mount("/static", StaticFiles(directory="temp"), name="static")

PREDICTION_CACHE = {}

@app.post("/predict")
async def predict(
    file: UploadFile = File(...),
    disease: str = Form(...),
    modality: str = Form(...),
):
    prediction_id = str(uuid.uuid4())
    temp_path = f"temp/{prediction_id}_{file.filename}"
    os.makedirs("temp", exist_ok=True)

    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        if modality == "audio":
            import librosa.display
            import matplotlib.pyplot as plt

            audio_tensor, mel_tensor, freqs, times, energy, pitch, energy_stats, pitch_stats = load_audio_and_spectrogram(
                wav_path=temp_path,
                spec_root="D:/Licenta/Datasets/Audio/data/MelSpectrograms/test"
            )

            image_filename = f"{prediction_id}_spectrogram.png"
            image_path = os.path.join("temp", image_filename)

            plt.figure(figsize=(8, 4))
            librosa.display.specshow(
                mel_tensor.numpy(),
                sr=16000,
                hop_length=512,
                x_axis='time',
                y_axis='mel',
                cmap='magma'
            )
            plt.title("Mel Spectrogram")
            plt.colorbar(format='%+2.0f dB')
            plt.tight_layout()
            plt.savefig(image_path)
            plt.close()

            model = get_cached_model(disease, modality, device)
            audio_tensor = audio_tensor.unsqueeze(0).to(device)
            mel_tensor = mel_tensor.unsqueeze(0).to(device)

            with torch.no_grad():
                output = model(audio_tensor, mel_tensor)
                probs = torch.softmax(output, dim=1)[0]
                pred_idx = probs.argmax().item()

            class_names = ["Alzheimer", "Parkinson", "Healthy"]

            result = {
                "prediction_id": prediction_id,
                "predicted_class": class_names[pred_idx],
                "confidence": float(probs[pred_idx]),
                "probabilities": {
                    class_names[i]: float(probs[i]) for i in range(len(class_names))
                },
                "spectrogram_url": f"/static/{image_filename}",
                "mel_shape": mel_tensor.shape,
                "freqs": freqs.tolist(),
                "times": times.tolist(),
                "freq_range": [
                    round(float(freqs[0])),
                    round(float(freqs[-1]))
                ],
                "time_range": [
                    round(float(times[0]), 2),
                    round(float(times[-1]), 2)
                ],
                "energy_contour": energy,
                "pitch_contour": pitch,
                "energy_stats": energy_stats,
                "pitch_stats": pitch_stats
            }



        elif modality == "drawing":
            transform = transforms.Compose([
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize([0.5], [0.5])

            ])

            image = Image.open(temp_path).convert("RGB")
            input_tensor = transform(image).unsqueeze(0).to(device)
            model = get_cached_model(disease, modality, device)
            class_names = ["Healthy", "Parkinson"]
            with torch.no_grad():
                output = model(input_tensor)
                probs = torch.softmax(output, dim=1)[0]
                pred_idx = probs.argmax().item()

            results_dir = os.path.join("temp", "results")
            os.makedirs(results_dir, exist_ok=True)
            output_prefix = os.path.join(results_dir, f"{prediction_id}_drawing")

            result_analysis = analyze_drawing_quality(
                image_path=temp_path,
                output_prefix=output_prefix,
                prediction_id=prediction_id
            )

            result = {
                "prediction_id": prediction_id,
                "predicted_class": class_names[pred_idx],
                "confidence": float(probs[pred_idx]),
                "probabilities": {
                    class_names[i]: float(probs[i]) for i in range(len(class_names))
                },
                "fft_url": f"/static/results/{prediction_id}_drawing_fft.png",
                "fft_radial_url": f"/static/results/{prediction_id}_drawing_fft_radial.png",
                "contours_url": f"/static/results/{prediction_id}_drawing_contours.png",
                "tremor_overlay_url": f"/static/results/{prediction_id}_drawing_tremor_camstyle.png",
                "drawing_index": {
                    "metrics": result_analysis["metrics"],
                    "description": "Pixel-level metrics + soft Grad-CAM-like tremor overlay",
                    "shape_type": result_analysis["shape_type"]
                }
            }

        else:
            model = get_cached_model(disease, modality, device)
            transform = get_transform_for(disease, modality)
            class_names = (
                alz_classes if disease == "alzheimer" else park_classes
            )
            result = predict_image_with_model(model, temp_path, class_names, device, transform)
            result["prediction_id"] = prediction_id
            result["confidence"] = float(result["probabilities"][result["predicted_class"]])
            executor.submit(generate_cam_async, model, temp_path, device, disease, modality, prediction_id)

    except Exception as e:
        return {"error": str(e)}
    return result


@app.post("/predict-ensemble")
async def predict_auto(file: UploadFile = File(...)):
    prediction_id = str(uuid.uuid4())
    temp_path = f"temp/{prediction_id}_{file.filename}"
    os.makedirs("temp", exist_ok=True)

    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    try:
        image = Image.open(temp_path).convert("RGB")

        input_axial = get_transform_for("alzheimer", "axial")(image).unsqueeze(0).to(device)
        input_sagittal = get_transform_for("alzheimer", "sagittal")(image).unsqueeze(0).to(device)
        input_parkinson = get_transform_for("parkinson", "drawing")(image).unsqueeze(0).to(device)

        pred_ax_idx, label_ax, score_ax = predict_with_ensemble_fixed(alz_ax_50, alz_ax_101, input_axial, alz_classes)
        pred_sag_idx, label_sag, score_sag = predict_with_ensemble_fixed(alz_sag_50, alz_sag_101, input_sagittal, alz_classes)
        pred_park_idx, label_park, score_park = predict_with_ensemble_fixed(park_50, park_101, input_parkinson, park_classes)

        all_preds = [
            ("Alzheimer Axial", label_ax, score_ax),
            ("Alzheimer Sagittal", label_sag, score_sag),
            ("Parkinson", label_park, score_park)
        ]
        best = max(all_preds, key=lambda x: x[2])
        best_name, best_label, best_score = best
        if "Axial" in best_name:
            cam_model = alz_ax_101  
            disease = "alzheimer"
            modality = "mri_axial"
        elif "Sagittal" in best_name:
            cam_model = alz_sag_101
            disease = "alzheimer"
            modality = "mri_sagittal"
        elif "Parkinson" in best_name:
            cam_model = park_101
            disease = "parkinson"
            modality = "mri_sagittal"
        else:
            raise Exception(f"Unknown best_name: {best_name}")

        executor.submit(generate_cam_async, cam_model, temp_path, device, disease, modality, prediction_id)

        return {
            "prediction_id": prediction_id,
            "predicted_disease": best_name,
            "predicted_class": best_label,
            "score": round(best_score * 100, 2),
            "all_predictions": {
                "Alzheimer Axial": (label_ax, round(score_ax * 100, 2)),
                "Alzheimer Sagittal": (label_sag, round(score_sag * 100, 2)),
                "Parkinson": (label_park, round(score_park * 100, 2))
            }
        }

    except Exception as e:
        return {"error": str(e)}
    finally:
        pass  


def generate_cam_async(model, temp_path, device, disease, modality, prediction_id):
    gradcam_result = generate_cam_combined(model, temp_path, device, disease, modality)
    PREDICTION_CACHE[prediction_id] = {
        "gradcam_url": f"/static/{os.path.basename(gradcam_result['gradcam_path'])}",
        "activation_zone": gradcam_result["activation_zone"],
        "region_scores": gradcam_result["region_scores"],
        "activation_score": gradcam_result["activation_score"]
    }
    if os.path.exists(temp_path):
        os.remove(temp_path)


def generate_cam_ensemble(models, temp_path, device, disease, modality, prediction_id):
    cam_gray_images = []
    predicted_diseases = []
    meta_result = None
    for model in models:
        cam_result = generate_cam_combined(model, temp_path, device, disease, modality)
        cam_img = cv2.imread(cam_result["gradcam_path"])
        cam_gray = cv2.cvtColor(cam_img, cv2.COLOR_RGB2GRAY).astype(np.float32) / 255.0
        predicted_diseases.append(cam_result["predicted_disease"].lower())
        cam_gray_images.append(cam_gray)
        meta_result = cam_result

    from collections import Counter
    main_disease = Counter(predicted_diseases).most_common(1)[0][0]

    if "parkinson" in main_disease:
        mask_type = "sagittal"
    elif "alzheimer axial" in main_disease:
        mask_type = "axial"
    elif "alzheimer sagittal" in main_disease:
        mask_type = "sagittal"
    else:
        mask_type = "axial"

    masked_images = [mask_non_brain_regions_ensemble(cam, mask_type) for cam in cam_gray_images]

    combined_gray = np.mean(masked_images, axis=0)
    combined_rgb = np.stack([combined_gray]*3, axis=-1)
    combined_rgb = (combined_rgb * 255).astype(np.uint8)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    save_path = f"temp/cam_{timestamp}_ensemble.png"
    cv2.imwrite(save_path, cv2.cvtColor(combined_rgb, cv2.COLOR_RGB2BGR))

    PREDICTION_CACHE[prediction_id] = {
        "gradcam_url": f"/static/{os.path.basename(save_path)}",
        "activation_zone": meta_result["activation_zone"],
        "region_scores": meta_result["region_scores"],
        "activation_score": meta_result["activation_score"],
        "main_disease": main_disease
    }

    if os.path.exists(temp_path):
        os.remove(temp_path)


@app.get("/cam-status/{prediction_id}")
def get_cam_status(prediction_id: str):
    return PREDICTION_CACHE.get(prediction_id, {"status": "pending"})
