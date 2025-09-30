package com.example.appbackend.mapper;

import com.example.appbackend.dto.PatientRequestDTO;
import com.example.appbackend.dto.PatientResponseDTO;
import com.example.appbackend.entity.Patient;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class PatientMapper {
    private final PredictionMapper predictionMapper;

    public Patient toEntity(PatientRequestDTO dto) {
        return Patient.builder()
                .identifier(dto.getIdentifier())
                .nationalId(dto.getNationalId())
                .fullName(dto.getFullName())
                .gender(dto.getGender())
                .notes(dto.getNotes())
                .knownConditions(dto.getKnownConditions())
                .dateOfBirth(LocalDate.parse(dto.getDateOfBirth()))
                .build();
    }

    public PatientResponseDTO toDto(Patient patient) {
        return PatientResponseDTO.builder()
                .id(patient.getId())
                .identifier(patient.getIdentifier())
                .nationalId(patient.getNationalId())
                .fullName(patient.getFullName())
                .gender(patient.getGender())
                .notes(patient.getNotes())
                .knownConditions(patient.getKnownConditions())
                .dateOfBirth(patient.getDateOfBirth().toString())
                .predictions(
                        patient.getPredictions() != null
                                ? patient.getPredictions().stream()
                                .map(predictionMapper::toDto)
                                .toList()
                                : List.of()
                )
                .build();
    }


}
