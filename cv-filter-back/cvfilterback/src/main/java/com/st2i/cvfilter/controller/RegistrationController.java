package com.st2i.cvfilter.controller;

import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.st2i.cvfilter.dto.AdminUserRequest;
import com.st2i.cvfilter.dto.AdminUserResponse;
import com.st2i.cvfilter.service.KeycloakAdminService;

import jakarta.validation.Valid;

@RestController
@Validated
@RequestMapping("/api/public")
public class RegistrationController {

    private final KeycloakAdminService keycloakAdminService;

    public RegistrationController(KeycloakAdminService keycloakAdminService) {
        this.keycloakAdminService = keycloakAdminService;
    }

    @PostMapping("/register")
    public AdminUserResponse register(@Valid @RequestBody AdminUserRequest request) {
        return keycloakAdminService.registerPendingUser(request);
    }
}
