package com.st2i.cvfilter.controller;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.st2i.cvfilter.dto.AdminUserRequest;
import com.st2i.cvfilter.dto.AdminUserResponse;
import com.st2i.cvfilter.dto.UpdateUserRolesRequest;
import com.st2i.cvfilter.service.KeycloakAdminService;

import jakarta.validation.Valid;

@RestController
@Validated
@RequestMapping("/api/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final KeycloakAdminService keycloakAdminService;

    public AdminUserController(KeycloakAdminService keycloakAdminService) {
        this.keycloakAdminService = keycloakAdminService;
    }

    @GetMapping
    public List<AdminUserResponse> getAllUsers() {
        return keycloakAdminService.getAllUsers();
    }

    @GetMapping("/pending")
    public List<AdminUserResponse> getPendingUsers() {
        return keycloakAdminService.getPendingUsers();
    }

    @GetMapping("/{id}")
    public AdminUserResponse getUserById(@PathVariable String id) {
        return keycloakAdminService.getUserById(id);
    }

    @PostMapping
    public AdminUserResponse createUser(@Valid @RequestBody AdminUserRequest request) {
        return keycloakAdminService.createUser(request);
    }

    @PutMapping("/{id}")
    public AdminUserResponse updateUser(@PathVariable String id, @Valid @RequestBody AdminUserRequest request,
                                        @AuthenticationPrincipal Jwt jwt) {
        return keycloakAdminService.updateUser(id, request, jwt == null ? null : jwt.getSubject());
    }

    @PutMapping("/{id}/roles")
    public AdminUserResponse updateUserRoles(@PathVariable String id, @RequestBody UpdateUserRolesRequest request) {
        return keycloakAdminService.updateUserRoles(id, request);
    }

    @PutMapping("/{id}/approve")
    public AdminUserResponse approveUser(@PathVariable String id) {
        return keycloakAdminService.approvePendingUser(id);
    }

    @DeleteMapping("/{id}/reject")
    public void rejectUser(@PathVariable String id, @AuthenticationPrincipal Jwt jwt) {
        keycloakAdminService.rejectPendingUser(id, jwt == null ? null : jwt.getSubject());
    }

    @DeleteMapping("/{id}")
    public void deleteUser(@PathVariable String id, @AuthenticationPrincipal Jwt jwt) {
        keycloakAdminService.deleteUser(id, jwt == null ? null : jwt.getSubject());
    }
}
