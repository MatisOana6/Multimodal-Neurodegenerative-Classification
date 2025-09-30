import torch
from sklearn.metrics import accuracy_score, classification_report

from constants.constants import alz_classes
from dataloaders.ensemble_dataloader import sagittal_loader
from models.model_defs import ResNetModel, ResNet101_MRI

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(torch.cuda.is_available())
print(torch.cuda.get_device_name() if torch.cuda.is_available() else "CPU only")


alz_sag_50 = ResNetModel(pretrained=False, num_classes=5)
alz_sag_50.load_state_dict(torch.load("models/ResNet_Alzheimer_Sagittal_Multiclass.pth", map_location=device))
alz_sag_50.to(device).eval()

alz_sag_101 = ResNet101_MRI(pretrained=False, num_classes=5)
alz_sag_101.load_state_dict(torch.load("models/ResNet101_Alzheimer_Sagittal_Multiclass.pth", map_location=device))
alz_sag_101.to(device).eval()


def evaluate_ensemble(model_r50, model_r101, dataloader, class_names, w_r50=0.5, w_r101=0.5,
                      path="ensemble_sagittal_report.txt"):
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
    print(f"Alzheimer Sagittal Accuracy: {acc * 100:.2f}%\n{report}")
    with open(path, "w") as f:
        f.write(f"Accuracy: {acc * 100:.2f}%\n\n{report}")
    return acc


if __name__ == "__main__":
    evaluate_ensemble(alz_sag_50, alz_sag_101, sagittal_loader, alz_classes)

