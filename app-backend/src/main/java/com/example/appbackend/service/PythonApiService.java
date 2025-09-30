package com.example.appbackend.service;

import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;

@Service
@RequiredArgsConstructor
public class PythonApiService {

    private final RestTemplate restTemplate;

    public String sendImageForPrediction(byte[] fileBytes, String filename, String disease, String modality) throws IOException {
        String url = "http://localhost:8001/predict";

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();

        Resource fileAsResource = new ByteArrayResource(fileBytes) {
            @Override
            public String getFilename() {
                return filename;
            }
        };

        body.add("file", fileAsResource);
        body.add("disease", disease);
        body.add("modality", modality);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        ResponseEntity<String> response = restTemplate.postForEntity(url, requestEntity, String.class);
        return response.getBody();
    }


    public String sendFileForEnsemble(byte[] fileBytes, String filename) {
        String url = "http://localhost:8001/predict-ensemble";

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        Resource fileAsResource = new ByteArrayResource(fileBytes) {
            @Override
            public String getFilename() {
                return filename;
            }
        };
        body.add("file", fileAsResource);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        ResponseEntity<String> response = restTemplate.postForEntity(url, requestEntity, String.class);
        return response.getBody();
    }


    public String getCamStatus(String predictionId) {
        String url = "http://localhost:8001/cam-status/" + predictionId;

        ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
        return response.getBody();
    }

}
