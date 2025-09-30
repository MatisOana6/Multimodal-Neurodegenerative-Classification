package com.example.appbackend.entity;
import com.example.appbackend.entity.enums.MedicalRole;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.GenericGenerator;

import java.util.List;
import java.util.UUID;


@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    private String role;

    @Enumerated(EnumType.STRING)
    private MedicalRole medicalRole;

    private String fullName;
    private String institution;
    private String specialization;

    @Column(name = "agreed_terms", nullable = false)
    private boolean agreedTerms;

    @OneToMany(mappedBy = "createdBy")
    private List<Patient> patients;

    @OneToMany(mappedBy = "createdBy")
    private List<Prediction> predictions;

}
