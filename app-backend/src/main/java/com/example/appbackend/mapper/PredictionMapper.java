package com.example.appbackend.mapper;

import com.example.appbackend.dto.PredictionResponseDTO;
import com.example.appbackend.entity.Prediction;
import org.springframework.stereotype.Component;

@Component
public class PredictionMapper {

    public PredictionResponseDTO toDto(Prediction prediction) {
        return PredictionResponseDTO.builder()
                .disease(prediction.getDisease())
                .modality(prediction.getModality())
                .subtype(prediction.getSubtype())
                .confidence(prediction.getConfidence())
                .timestamp(prediction.getTimestamp())
                .build();
    }
}
