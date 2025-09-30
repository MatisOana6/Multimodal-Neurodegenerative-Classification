package com.example.appbackend.repository;

import com.example.appbackend.entity.Prediction;
import com.example.appbackend.entity.Patient;
import com.example.appbackend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PredictionRepository extends JpaRepository<Prediction, UUID> {
    List<Prediction> findAllByPatient(Patient patient);
    List<Prediction> findAllByCreatedBy(User user);
}
