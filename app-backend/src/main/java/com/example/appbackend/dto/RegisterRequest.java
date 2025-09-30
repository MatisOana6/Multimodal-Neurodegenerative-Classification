package com.example.appbackend.dto;

import com.example.appbackend.entity.enums.MedicalRole;
import lombok.Data;

@Data
public class RegisterRequest {
    private String email;
    private String password;
    private String role;
    private MedicalRole medicalRole;
    private String fullName;
    private String institution;
    private String specialization;
    private boolean agreedTerms;

}
