package com.example.appbackend.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    public void sendPatientReport(String toEmail, MultipartFile pdfFile) throws MessagingException, IOException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true);

        helper.setFrom("neuropredict.ai@gmail.com");
        helper.setTo(toEmail);
        helper.setSubject("NeuroPredict - Patient Report");

        String content = """
                Hello,

                Please find attached the NeuroPredict report for your patient.
                This document includes AI-assisted analyses designed to support your diagnostic and research decisions.

                Kindly ensure this report is reviewed in conjunction with clinical evaluations and other relevant medical data.

                Best regards,
                NeuroPredict Team
                """;

        helper.setText(content);
        helper.addAttachment(pdfFile.getOriginalFilename(), new ByteArrayResource(pdfFile.getBytes()));

        mailSender.send(message);
    }
}
