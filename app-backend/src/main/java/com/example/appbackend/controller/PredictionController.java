package com.example.appbackend.controller;

import com.example.appbackend.dto.PredictionRequestDTO;
import com.example.appbackend.dto.PredictionResponseDTO;
import com.example.appbackend.service.PredictionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/predictions")
@RequiredArgsConstructor
public class PredictionController {

    private final PredictionService predictionService;

    @PostMapping
    public ResponseEntity<PredictionResponseDTO> createPrediction(
            @Valid @RequestBody PredictionRequestDTO request,
            @RequestParam String subtype,
            @RequestParam double confidence,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        UUID userId = predictionService.getUserIdFromUsername(userDetails.getUsername());
        var response = predictionService.savePrediction(request, subtype, confidence, userId);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<PredictionResponseDTO>> getAllPredictions(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        UUID userId = predictionService.getUserIdFromUsername(userDetails.getUsername());
        return ResponseEntity.ok(predictionService.getAllByUser(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<PredictionResponseDTO> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(predictionService.getById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PredictionResponseDTO> updatePrediction(
            @PathVariable UUID id,
            @Valid @RequestBody PredictionRequestDTO updated,
            @RequestParam String subtype,
            @RequestParam double confidence
    ) {
        return ResponseEntity.ok(predictionService.update(id, updated, subtype, confidence));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        predictionService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
