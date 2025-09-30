package com.example.appbackend.dto;

import lombok.*;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PredictionResponseDTO {
    private String disease;
    private String modality;
    private String subtype;
    private double confidence;
    private LocalDateTime timestamp;

}
