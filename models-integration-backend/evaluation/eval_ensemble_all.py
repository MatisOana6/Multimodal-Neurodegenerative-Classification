from constants.constants import alz_classes, park_classes
from evaluation.eval_alzheimer_axial import evaluate_ensemble as eval_axial
from evaluation.eval_alzheimer_sagittal import evaluate_ensemble as eval_sagittal
from evaluation.eval_parkinson import evaluate_ensemble as eval_park

from dataloaders.ensemble_dataloader import axial_loader, sagittal_loader, parkinson_loader
from models.model_defs import ResNetModel, ResNet101_MRI
import torch

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(torch.cuda.is_available())
print(torch.cuda.get_device_name() if torch.cuda.is_available() else "CPU only")

model_ax_50 = ResNetModel(pretrained=False, num_classes=5)
model_ax_50.load_state_dict(torch.load("models/ResNet_Alzheimer_Axial_Multiclass.pth", map_location=device))
model_ax_50.to(device).eval()

model_ax_101 = ResNet101_MRI(pretrained=False, num_classes=5)
model_ax_101.load_state_dict(torch.load("models/ResNet101_Alzheimer_Axial_Multiclass.pth", map_location=device))
model_ax_101.to(device).eval()

model_sag_50 = ResNetModel(pretrained=False, num_classes=5)
model_sag_50.load_state_dict(torch.load("models/ResNet_Alzheimer_Sagittal_Multiclass.pth", map_location=device))
model_sag_50.to(device).eval()

model_sag_101 = ResNet101_MRI(pretrained=False, num_classes=5)
model_sag_101.load_state_dict(torch.load("models/ResNet101_Alzheimer_Sagittal_Multiclass.pth", map_location=device))
model_sag_101.to(device).eval()

model_p_50 = ResNetModel(pretrained=False, num_classes=4)
model_p_50.load_state_dict(torch.load("models/ResNet_Parkinson_Multiclass.pth", map_location=device))
model_p_50.to(device).eval()

model_p_101 = ResNet101_MRI(pretrained=False, num_classes=4)
model_p_101.load_state_dict(torch.load("models/ResNet101_Parkinson_Multiclass.pth", map_location=device))
model_p_101.to(device).eval()


if __name__ == "__main__":
    print("\n--- Ensemble Alzheimer Axial ---")
    eval_axial(model_ax_50, model_ax_101, axial_loader, alz_classes)
    print("\n--- Ensemble Alzheimer Sagittal ---")
    eval_sagittal(model_sag_50, model_sag_101, sagittal_loader, alz_classes)
    print("\n--- Ensemble Parkinson ---")
    eval_park(model_p_50, model_p_101, parkinson_loader, park_classes)

def predict_with_ensemble_fixed(model_r50, model_r101, img_tensor, class_names, w_r50=0.5, w_r101=0.5):
    model_r50.eval()
    model_r101.eval()

    with torch.no_grad(), torch.amp.autocast(device_type=img_tensor.device.type,
                                             enabled=(img_tensor.device.type == 'cuda')):
        out_r50 = model_r50(img_tensor)
        out_r101 = model_r101(img_tensor)
        combined_logits = w_r50 * out_r50 + w_r101 * out_r101
        probs = torch.softmax(combined_logits, dim=1)[0]
        pred_idx = probs.argmax().item()
        score = probs[pred_idx].item()
        pred_label = class_names[pred_idx]

    return pred_idx, pred_label, score

def predict_ensemble_all_modalities(image_tensor, source_type, device):
    image_tensor = image_tensor.to(device)
    results = []

    if source_type == "axial":
        pred_ax_idx, label_ax, score_ax = predict_with_ensemble_fixed(
            model_ax_50, model_ax_101, image_tensor, alz_classes
        )
        results.append(("Alzheimer Axial", label_ax, score_ax))

    if source_type == "sagittal":
        pred_sag_idx, label_sag, score_sag = predict_with_ensemble_fixed(
            model_sag_50, model_sag_101, image_tensor, alz_classes
        )
        results.append(("Alzheimer Sagittal", label_sag, score_sag))

    if source_type == "parkinson":
        pred_park_idx, label_park, score_park = predict_with_ensemble_fixed(
            model_p_50, model_p_101, image_tensor, park_classes
        )
        results.append(("Parkinson", label_park, score_park))

    best = max(results, key=lambda x: x[2])

    return {
        "modality_used": best[0],
        "predicted_label": best[1],
        "score": round(best[2] * 100, 2),
        "all_scores": {r[0]: (r[1], round(r[2] * 100, 2)) for r in results}
    }
