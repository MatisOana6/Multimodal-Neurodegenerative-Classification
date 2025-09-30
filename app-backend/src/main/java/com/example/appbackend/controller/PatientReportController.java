package com.example.appbackend.controller;

import com.example.appbackend.service.EmailService;
import jakarta.mail.MessagingException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/report")
public class PatientReportController {

    @Autowired
    private EmailService emailService;

    @PostMapping("/sendReport")
    public ResponseEntity<String> sendReport(
            @RequestParam("email") String email,
            @RequestParam("pdf") MultipartFile pdfFile) {

        try {
            emailService.sendPatientReport(email, pdfFile);
            return ResponseEntity.ok("Report sent successfully to: " + email);
        } catch (MessagingException | RuntimeException e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body("Failed to send report: " + e.getMessage());
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }
}
