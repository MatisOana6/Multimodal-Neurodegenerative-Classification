import torch.nn as nn
import torchvision.models as models
import torch

class AudioSpectrogramClassifier(nn.Module):
    def __init__(self, n_classes=3, pretrained_resnet=True):
        super(AudioSpectrogramClassifier, self).__init__()

        self.audio_branch = nn.Sequential(
            nn.Conv1d(1, 16, kernel_size=9, stride=2, padding=4),
            nn.ReLU(),
            nn.BatchNorm1d(16),

            nn.Conv1d(16, 32, kernel_size=9, stride=2, padding=4),
            nn.ReLU(),
            nn.BatchNorm1d(32),

            nn.Conv1d(32, 64, kernel_size=7, stride=2, padding=3),
            nn.ReLU(),
            nn.BatchNorm1d(64),

            nn.AdaptiveAvgPool1d(32),
            nn.Flatten(),
            nn.Dropout(0.3)
        )

        self.spec_branch = models.resnet18(pretrained=pretrained_resnet)
        self.spec_branch.conv1 = nn.Conv2d(1, 64, kernel_size=7, stride=2, padding=3, bias=False)
        self.spec_branch.fc = nn.Identity()

        self.fusion_dim = 512 + (64 * 32)
        self.attention = nn.Sequential(
            nn.Linear(self.fusion_dim, self.fusion_dim),
            nn.Tanh()
        )

        self.classifier = nn.Sequential(
            nn.Linear(self.fusion_dim, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, n_classes)
        )

    def forward(self, audio_input, mel_input):
        x1 = self.audio_branch(audio_input.unsqueeze(1))
        x2 = self.spec_branch(mel_input.unsqueeze(1))
        x = torch.cat((x1, x2), dim=1)
        att = self.attention(x)
        x = x * att
        return self.classifier(x)
