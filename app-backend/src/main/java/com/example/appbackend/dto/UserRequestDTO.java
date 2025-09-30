package com.example.appbackend.dto;

import com.example.appbackend.entity.enums.MedicalRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserRequestDTO {
    @Email
    private String email;

    @NotBlank
    private String password;

    private String role;
    private MedicalRole medicalRole;
    private String fullName;
    private String institution;
    private String specialization;
    private boolean agreedTerms;

}
