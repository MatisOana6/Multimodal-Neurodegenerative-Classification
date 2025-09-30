package com.example.appbackend.mapper;

import com.example.appbackend.dto.UserRequestDTO;
import com.example.appbackend.dto.UserResponseDTO;
import com.example.appbackend.entity.User;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

    public User toEntity(UserRequestDTO dto) {
        return User.builder()
                .email(dto.getEmail())
                .password(dto.getPassword())
                .role(dto.getRole())
                .medicalRole(dto.getMedicalRole())
                .fullName(dto.getFullName())
                .institution(dto.getInstitution())
                .specialization(dto.getSpecialization())
                .agreedTerms(dto.isAgreedTerms())
                .build();
    }

    public UserResponseDTO toDto(User user) {
        return UserResponseDTO.builder()
                .id(user.getId())
                .email(user.getEmail())
                .role(user.getRole())
                .medicalRole(user.getMedicalRole())
                .fullName(user.getFullName())
                .institution(user.getInstitution())
                .specialization(user.getSpecialization())
                .agreedTerms(user.isAgreedTerms())
                .build();
    }
}
