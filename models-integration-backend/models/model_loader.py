import torch
from torchvision import models
from models.audio_model import AudioSpectrogramClassifier
from models.model_defs import ResNetModel, ResNet101_MRI

def load_model_for(disease: str, modality: str, device="cpu"):
    model_map = {
        ("alzheimer", "mri_axial"): ("models/ResNet101_Alzheimer_Axial_Multiclass.pth", ResNet101_MRI, 5),
        ("alzheimer", "mri_sagittal"): ("models/ResNet101_Alzheimer_Sagittal_Multiclass.pth", ResNet101_MRI, 5),
        ("alzheimer", "general"): ("models/ResNet_Alzheimer_Multiclass.pth", ResNetModel, 5),
        ("alzheimer", "audio"): ("models/dual_branch_model.pth", AudioSpectrogramClassifier, 3),

        ("parkinson", "general"): ("models/ResNet_Parkinson_Multiclass.pth", ResNetModel, 4),
        ("parkinson", "mri"): ("models/ResNet101_Parkinson_Multiclass.pth", ResNet101_MRI, 4),
        ("parkinson", "audio"): ("models/dual_branch_model.pth", AudioSpectrogramClassifier, 3),
        ("parkinson", "drawing"): ("models/resnet50_parkinson.pth", "resnet50_raw", 2),
    }

    key = (disease, modality)
    if key not in model_map:
        raise ValueError(f"Model not found for {disease} + {modality}")

    model_path, model_class, num_classes = model_map[key]

    if model_class == AudioSpectrogramClassifier:
        model = model_class(n_classes=num_classes, pretrained_resnet=False)
        model.load_state_dict(torch.load(model_path, map_location=device))

    elif model_class == "resnet50_raw":
        model = models.resnet50(weights=None)
        model.fc = torch.nn.Linear(model.fc.in_features, num_classes)
        model.load_state_dict(torch.load(model_path, map_location=device))

    else:
        model = model_class(pretrained=False, num_classes=num_classes)
        model.load_state_dict(torch.load(model_path, map_location=device))

    model.to(device).eval()
    return model
