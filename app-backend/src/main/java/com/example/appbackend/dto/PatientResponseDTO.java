package com.example.appbackend.dto;

import lombok.*;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PatientResponseDTO {
    private UUID id;
    private String identifier;
    private String nationalId;
    private String gender;
    private String notes;
    private String dateOfBirth;
    private String fullName;
    private String knownConditions;
    private List<PredictionResponseDTO> predictions;

}