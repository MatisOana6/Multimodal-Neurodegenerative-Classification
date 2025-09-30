package com.example.appbackend.controller;

import com.example.appbackend.dto.UserRequestDTO;
import com.example.appbackend.dto.UserResponseDTO;
import com.example.appbackend.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping
    public List<UserResponseDTO> getAllUsers() {
        return userService.getAllUsers();
    }

    @GetMapping("/{id}")
    public UserResponseDTO getUserById(@PathVariable UUID id) {
        return userService.getUserById(id);
    }

    @PostMapping
    public UserResponseDTO createUser(@RequestBody @Valid UserRequestDTO dto) {
        return userService.createUser(dto);
    }

    @PutMapping("/{id}")
    public UserResponseDTO updateUser(@PathVariable UUID id, @RequestBody @Valid UserRequestDTO dto) {
        return userService.updateUser(id, dto);
    }

    @DeleteMapping("/{id}")
    public void deleteUser(@PathVariable UUID id) {
        userService.deleteUser(id);
    }
}
