package com.example.appbackend.service;

import com.example.appbackend.dto.PatientRequestDTO;
import com.example.appbackend.dto.PatientResponseDTO;
import com.example.appbackend.entity.Patient;
import com.example.appbackend.entity.User;
import com.example.appbackend.mapper.PatientMapper;
import com.example.appbackend.repository.PatientRepository;
import com.example.appbackend.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.io.File;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class PatientService {

    private final PatientRepository patientRepository;
    private final UserRepository userRepository;
    private final PatientMapper patientMapper;

    private void createPatientFoldersWithExamples(String identifier) throws IOException {
        Path basePath = Paths.get("D:/Licenta/Datasets/Patients", identifier);
        Files.createDirectories(basePath.resolve("mri_axial"));
        Files.createDirectories(basePath.resolve("mri_sagittal"));
        Files.createDirectories(basePath.resolve("mri_parkinson"));
        Files.createDirectories(basePath.resolve("drawing"));
        Files.createDirectories(basePath.resolve("audio"));

        copySampleFiles("D:/Licenta/Datasets/ADNI_Oficial/Processed/Axial/Test", basePath.resolve("mri_axial"), 16);
        copySampleFiles("D:/Licenta/Datasets/ADNI_Oficial/Filtered/Sagittal/Test", basePath.resolve("mri_sagittal"), 24);
        copySampleFiles("D:/Licenta/Datasets/Parkinson_s Drawings/augmented_combined/testing", basePath.resolve("drawing"), 24);
        copySampleFiles("D:/Licenta/Datasets/PPMI_Oficial/Augmented/Test", basePath.resolve("mri_parkinson"), 24);
        copySampleFiles("D:/Licenta/Datasets/Audio/data/Split_Wav/test", basePath.resolve("audio"), 10);

    }

    private void copySampleFiles(String sourceDir, Path targetDir, int maxFiles) throws IOException {
        List<Path> files = Files.walk(Paths.get(sourceDir))
                .filter(Files::isRegularFile)
                .collect(Collectors.toList());

        Collections.shuffle(files);

        files.stream()
                .limit(maxFiles)
                .forEach(file -> {
                    try {
                        Files.copy(file, targetDir.resolve(file.getFileName()), StandardCopyOption.REPLACE_EXISTING);
                    } catch (IOException e) {
                        e.printStackTrace();
                    }
                });
    }


    @Transactional
    public PatientResponseDTO createPatient(PatientRequestDTO dto, UUID userId) {
        Patient patient = patientMapper.toEntity(dto);
        User user = userRepository.findById(userId).orElseThrow();
        patient.setCreatedBy(user);

        if (patient.getIdentifier() == null || patient.getIdentifier().isEmpty()) {
            String year = String.valueOf(LocalDate.now().getYear());
            String random = String.valueOf((int)(Math.random() * 9000 + 1000));
            patient.setIdentifier("PAT-" + year + "-" + random);
        }

        Patient savedPatient = patientRepository.save(patient);
        String identifier = savedPatient.getIdentifier();
        try {
            createPatientFoldersWithExamples(identifier);
        } catch (IOException e) {
            throw new RuntimeException("Failed to create folders and copy sample files", e);
        }

        return patientMapper.toDto(savedPatient);
    }


    public List<PatientResponseDTO> getAllPatients(UUID userId) {
        return patientRepository.findAllByCreatedBy_Id(userId).stream()
                .map(patientMapper::toDto)
                .toList();
    }

    public PatientResponseDTO getById(UUID patientId, UUID userId) {
        Patient patient = patientRepository.findById(patientId)
                .orElseThrow(() -> new RuntimeException("Patient not found"));

        if (!patient.getCreatedBy().getId().equals(userId)) {
            throw new RuntimeException("Access denied: patient does not belong to this user");
        }

        return patientMapper.toDto(patient);
    }


    @Transactional
    public PatientResponseDTO updatePatient(UUID id, PatientRequestDTO dto) {
        Patient patient = patientRepository.findById(id).orElseThrow();
        patient.setIdentifier(dto.getIdentifier());
        patient.setNationalId(dto.getNationalId());
        patient.setGender(dto.getGender());
        patient.setNotes(dto.getNotes());
        patient.setDateOfBirth(LocalDate.parse(dto.getDateOfBirth()));
        patient.setFullName(dto.getFullName());
        patient.setKnownConditions(dto.getKnownConditions());
        return patientMapper.toDto(patientRepository.save(patient));
    }

    public void deletePatient(UUID id) {
        patientRepository.deleteById(id);
    }

    public UUID getUserIdFromUsername(String username) {
        return userRepository.findByEmail(username)
                .orElseThrow(() -> new RuntimeException("User not found"))
                .getId();
    }

}
