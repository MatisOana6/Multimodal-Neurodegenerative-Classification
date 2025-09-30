package com.example.appbackend.repository;

import com.example.appbackend.entity.Patient;
import com.example.appbackend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface PatientRepository extends JpaRepository<Patient, UUID> {
    List<Patient> findAllByCreatedBy(User user);
    List<Patient> findAllByCreatedBy_Id(UUID userId);

}