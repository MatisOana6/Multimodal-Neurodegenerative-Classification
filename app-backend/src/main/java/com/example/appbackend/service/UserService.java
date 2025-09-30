package com.example.appbackend.service;

import com.example.appbackend.dto.UserRequestDTO;
import com.example.appbackend.dto.UserResponseDTO;
import com.example.appbackend.entity.User;
import com.example.appbackend.mapper.UserMapper;
import com.example.appbackend.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public List<UserResponseDTO> getAllUsers() {
        return userRepository.findAll().stream()
                .map(userMapper::toDto)
                .collect(Collectors.toList());
    }

    public UserResponseDTO getUserById(UUID id) {
        return userRepository.findById(id)
                .map(userMapper::toDto)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    @Transactional
    public UserResponseDTO createUser(UserRequestDTO dto) {
        User user = userMapper.toEntity(dto);
        user.setPassword(passwordEncoder.encode(dto.getPassword()));
        return userMapper.toDto(userRepository.save(user));
    }

    @Transactional
    public UserResponseDTO updateUser(UUID id, UserRequestDTO dto) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        user.setEmail(dto.getEmail());
        user.setPassword(passwordEncoder.encode(dto.getPassword()));
        user.setRole(dto.getRole());
        user.setMedicalRole(dto.getMedicalRole());
        user.setFullName(dto.getFullName());
        user.setInstitution(dto.getInstitution());
        user.setSpecialization(dto.getSpecialization());
        user.setAgreedTerms(dto.isAgreedTerms());

        return userMapper.toDto(userRepository.save(user));
    }


    @Transactional
    public void deleteUser(UUID id) {
        userRepository.deleteById(id);
    }
}
