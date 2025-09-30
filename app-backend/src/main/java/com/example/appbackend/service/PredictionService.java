package com.example.appbackend.service;

import com.example.appbackend.dto.PredictionRequestDTO;
import com.example.appbackend.dto.PredictionResponseDTO;
import com.example.appbackend.entity.*;
import com.example.appbackend.mapper.PredictionMapper;
import com.example.appbackend.repository.*;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class PredictionService {

    private final PatientRepository patientRepository;
    private final PredictionRepository predictionRepository;
    private final UserRepository userRepository;
    private final PredictionMapper predictionMapper;

    @Transactional
    public PredictionResponseDTO savePrediction(PredictionRequestDTO dto, String subtype, double confidence, UUID userId) {
        Patient patient = patientRepository.findById(dto.getPatientId())
                .orElseThrow(() -> new IllegalArgumentException("Patient not found"));

        var user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        Prediction prediction = new Prediction();
        prediction.setDisease(dto.getDisease());
        prediction.setModality(dto.getModality());
        prediction.setSubtype(subtype);
        prediction.setConfidence(confidence);
        prediction.setTimestamp(LocalDateTime.now());
        prediction.setCreatedBy(user);
        prediction.setPatient(patient);

        predictionRepository.save(prediction);
        return predictionMapper.toDto(prediction);
    }

    public List<PredictionResponseDTO> getAllByUser(UUID userId) {
        var user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        return user.getPredictions().stream()
                .map(predictionMapper::toDto)
                .toList();
    }

    public PredictionResponseDTO getById(UUID id) {
        return predictionRepository.findById(id)
                .map(predictionMapper::toDto)
                .orElseThrow(() -> new IllegalArgumentException("Prediction not found"));
    }

    public void delete(UUID id) {
        if (!predictionRepository.existsById(id)) {
            throw new IllegalArgumentException("Prediction not found");
        }
        predictionRepository.deleteById(id);
    }

    public PredictionResponseDTO update(UUID id, PredictionRequestDTO dto, String subtype, double confidence) {
        var prediction = predictionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Prediction not found"));

        prediction.setDisease(dto.getDisease());
        prediction.setModality(dto.getModality());
        prediction.setSubtype(subtype);
        prediction.setConfidence(confidence);
        prediction.setTimestamp(LocalDateTime.now());

        var patient = patientRepository.findById(dto.getPatientId())
                .orElseThrow(() -> new IllegalArgumentException("Patient not found"));
        prediction.setPatient(patient);

        predictionRepository.save(prediction);
        return predictionMapper.toDto(prediction);
    }

    public UUID getUserIdFromUsername(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"))
                .getId();
    }
}
