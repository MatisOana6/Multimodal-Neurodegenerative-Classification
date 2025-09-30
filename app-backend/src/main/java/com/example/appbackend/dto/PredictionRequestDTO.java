package com.example.appbackend.dto;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PredictionRequestDTO {
    private String disease;
    private String modality;
    private UUID patientId;
}
