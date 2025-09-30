package com.example.appbackend.controller;

import com.example.appbackend.service.PythonApiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")

@RequestMapping("/api/ml")
public class ModelIntegrationController {

    private final PythonApiService pythonApiService;

    @PostMapping("/predict")
    public ResponseEntity<String> predict(
            @RequestParam("file") MultipartFile file,
            @RequestParam("disease") String disease,
            @RequestParam("modality") String modality) throws Exception {

        String response = pythonApiService.sendImageForPrediction(
                file.getBytes(),
                file.getOriginalFilename(),
                disease,
                modality
        );

        return ResponseEntity.ok(response);
    }

    @PostMapping("/predict-ensemble")
    public ResponseEntity<String> predictEnsemble(@RequestParam("file") MultipartFile file) throws Exception {
        String response = pythonApiService.sendFileForEnsemble(
                file.getBytes(),
                file.getOriginalFilename()
        );
        return ResponseEntity.ok(response);
    }

    @GetMapping("/cam-status/{predictionId}")
    public ResponseEntity<String> getCamStatus(@PathVariable String predictionId) {
        String response = pythonApiService.getCamStatus(predictionId);
        return ResponseEntity.ok(response);
    }

}
