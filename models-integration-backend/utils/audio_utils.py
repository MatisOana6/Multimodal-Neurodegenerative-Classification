import os
import librosa
import numpy as np
import torch
import itertools

from scipy.signal import medfilt

def load_audio_and_spectrogram(
    wav_path: str,
    spec_root: str,
    segment_len=160000,
    generate_if_missing=True
):
    y, sr = librosa.load(wav_path, sr=16000)
    y = y / np.max(np.abs(y))

    if len(y) < segment_len:
        y = np.pad(y, (0, segment_len - len(y)))
    else:
        y = y[:segment_len]

    base = os.path.splitext(os.path.basename(wav_path))[0]
    found_path = None

    for cls in os.listdir(spec_root):
        possible = os.path.join(spec_root, cls, base + ".npz")
        if os.path.exists(possible):
            found_path = possible
            break

    if found_path:
        data = np.load(found_path)
        mel = data["mel"]
        freqs = data["freqs"]
        times = data["times"]
        energy = data["energy"] if "energy" in data else None
        pitch = data["pitch"] if "pitch" in data else None
        energy_stats = {
            "pauses": int(data["num_pauses"]),
            "variance": float(data["energy_variance"])
        } if "num_pauses" in data else {}
        pitch_stats = {
            "sd": float(data["pitch_sd"]),
            "jumps": int(data["pitch_jumps"])
        } if "pitch_sd" in data else {}
        return (
            torch.tensor(y, dtype=torch.float32),
            torch.tensor(mel, dtype=torch.float32),
            freqs,
            times,
            energy.tolist() if energy is not None else [],
            pitch.tolist() if pitch is not None else [],
            energy_stats,
            pitch_stats
        )


    if generate_if_missing:
        mel = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=128)
        mel_db = librosa.power_to_db(mel, ref=np.max)
        mel_db = (mel_db - np.mean(mel_db)) / np.std(mel_db)

        freqs = librosa.mel_frequencies(n_mels=128, fmin=0, fmax=sr // 2)
        times = librosa.frames_to_time(np.arange(mel.shape[1]), sr=sr, hop_length=512)
        if len(times) >= 128:
            times = times[:128]
        else:
            times = np.pad(times, (0, 128 - len(times)), mode='edge')

        energy = mel.sum(axis=0)
        if len(energy) >= 128:
            energy = energy[:128]
        else:
            energy = np.pad(energy, (0, 128 - len(energy)), mode='edge')

        f0, _, _ = librosa.pyin(y, fmin=50, fmax=500)
        f0 = np.nan_to_num(f0)
        if len(f0) >= 128:
            pitch = f0[:128]
        else:
            pitch = np.pad(f0, (0, 128 - len(f0)), mode='edge')

        energy_np = np.array(energy)
        normalized_energy = (energy_np - np.min(energy_np)) / (np.max(energy_np) - np.min(energy_np) + 1e-8)
        pause_threshold = 0.10
        binary_pause = (normalized_energy < pause_threshold).astype(int)
        num_pauses = sum(1 for val, g in itertools.groupby(binary_pause) if val == 1 and len(list(g)) >= 2)
        energy_variance = float(np.var(energy_np))

        pitch_np = np.array(pitch)
        pitch_sd = float(np.std(pitch_np))
        pitch_smooth = medfilt(pitch_np, kernel_size=3)
        pitch_jumps = int(np.sum(np.abs(np.diff(pitch_smooth)) > 20))

        save_dir = os.path.join(spec_root, "Unknown")
        os.makedirs(save_dir, exist_ok=True)
        save_path = os.path.join(save_dir, base + ".npz")
        np.savez(save_path,
                 mel=mel_db, freqs=freqs, times=times,
                 energy=energy, pitch=pitch,
                 num_pauses=num_pauses,
                 energy_variance=energy_variance,
                 pitch_sd=pitch_sd,
                 pitch_jumps=pitch_jumps)
        print(f"Saved generated spectrogram+axes+energy+pitch+stats to: {save_path}")

        energy_stats = {"pauses": num_pauses, "variance": energy_variance}
        pitch_stats = {"sd": pitch_sd, "jumps": pitch_jumps}

        return (
            torch.tensor(y, dtype=torch.float32),
            torch.tensor(mel_db, dtype=torch.float32),
            freqs,
            times,
            energy.tolist(),
            pitch.tolist(),
            energy_stats,
            pitch_stats
        )


    raise FileNotFoundError(
        f"Spectograma .npz lipsă pentru {base}.wav și generate_if_missing=False"
    )
