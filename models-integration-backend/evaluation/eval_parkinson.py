import torch
import torch.nn as nn
from sklearn.metrics import accuracy_score, classification_report
import torchvision.models as models

from constants.constants import park_classes
from dataloaders.ensemble_dataloader import parkinson_loader
from dataloaders.drawings_dataloader import drawing_loader, drawing_classes
from models.model_defs import ResNetModel, ResNet101_MRI

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(torch.cuda.is_available())
print(torch.cuda.get_device_name() if torch.cuda.is_available() else "CPU only")

park_50 = ResNetModel(pretrained=False, num_classes=4)
park_50.load_state_dict(torch.load("models/ResNet_Parkinson_Multiclass.pth", map_location=device))
park_50.to(device).eval()

park_101 = ResNet101_MRI(pretrained=False, num_classes=4)
park_101.load_state_dict(torch.load("models/ResNet101_Parkinson_Multiclass.pth", map_location=device))
park_101.to(device).eval()

drawing_model = models.resnet50(weights=None)
drawing_model.fc = nn.Linear(drawing_model.fc.in_features, 2)
drawing_model.load_state_dict(torch.load("models/resnet50_parkinson.pth", map_location=device))
drawing_model.to(device).eval()


def evaluate_ensemble(model_r50, model_r101, dataloader, class_names, w_r50=0.5, w_r101=0.5,
                      path="ensemble_parkinson_report.txt"):
    all_preds, all_labels = [], []
    model_r50.eval()
    model_r101.eval()

    with torch.no_grad():
        for images, labels in dataloader:
            images, labels = images.to(device), labels.to(device)
            with torch.amp.autocast(device_type=device.type, enabled=(device.type == 'cuda')):
                out50 = model_r50(images)
                out101 = model_r101(images)
                combined = w_r50 * out50 + w_r101 * out101
                _, preds = torch.max(combined, dim=1)
            all_preds.extend(preds.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())

    acc = accuracy_score(all_labels, all_preds)
    report = classification_report(all_labels, all_preds, target_names=class_names, digits=4)
    print(f"\n Parkinson MRI Accuracy: {acc * 100:.2f}%\n{report}")
    with open(path, "w") as f:
        f.write(f"Accuracy: {acc * 100:.2f}%\n\n{report}")
    return acc

def evaluate_drawing_model(model, dataloader, class_names, path="drawing_parkinson_report.txt"):
    all_preds, all_labels = [], []
    model.eval()

    with torch.no_grad():
        for images, labels in dataloader:
            images, labels = images.to(device), labels.to(device)
            outputs = model(images)
            _, preds = torch.max(outputs, dim=1)
            all_preds.extend(preds.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())

    acc = accuracy_score(all_labels, all_preds)
    report = classification_report(all_labels, all_preds, target_names=class_names, digits=4)
    print(f"\n [Drawings] Accuracy: {acc * 100:.2f}%\n{report}")
    with open(path, "w") as f:
        f.write(f"Accuracy: {acc * 100:.2f}%\n\n{report}")
    return acc


if __name__ == "__main__":
    evaluate_ensemble(park_50, park_101, parkinson_loader, park_classes)
    evaluate_drawing_model(drawing_model, drawing_loader, drawing_classes)

