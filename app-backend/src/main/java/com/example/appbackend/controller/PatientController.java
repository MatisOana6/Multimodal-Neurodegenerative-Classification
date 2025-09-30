package com.example.appbackend.controller;

import com.example.appbackend.dto.PatientRequestDTO;
import com.example.appbackend.dto.PatientResponseDTO;
import com.example.appbackend.service.PatientService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/patients")
@RequiredArgsConstructor
public class PatientController {

    private final PatientService patientService;

    @PostMapping
    public ResponseEntity<PatientResponseDTO> create(
            @Valid @RequestBody PatientRequestDTO dto,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID userId = patientService.getUserIdFromUsername(userDetails.getUsername());
        return ResponseEntity.ok(patientService.createPatient(dto, userId));
    }

    @GetMapping
    public ResponseEntity<List<PatientResponseDTO>> getAll(@AuthenticationPrincipal UserDetails userDetails) {
        UUID userId = patientService.getUserIdFromUsername(userDetails.getUsername());
        return ResponseEntity.ok(patientService.getAllPatients(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PatientResponseDTO> getById(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails) {
        UUID userId = patientService.getUserIdFromUsername(userDetails.getUsername());
        return ResponseEntity.ok(patientService.getById(id, userId));
    }


    @PutMapping("/{id}")
    public ResponseEntity<PatientResponseDTO> update(@PathVariable UUID id,
                                                     @Valid @RequestBody PatientRequestDTO dto) {
        return ResponseEntity.ok(patientService.updatePatient(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        patientService.deletePatient(id);
        return ResponseEntity.noContent().build();
    }
}
