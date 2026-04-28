package com.st2i.cvfilter.service;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import com.st2i.cvfilter.config.KeycloakAdminProperties;
import com.st2i.cvfilter.dto.AdminUserRequest;
import com.st2i.cvfilter.dto.AdminUserResponse;
import com.st2i.cvfilter.dto.UpdateUserRolesRequest;
import com.st2i.cvfilter.exception.ResourceNotFoundException;

@Service
public class KeycloakAdminService {

    private static final String ADMIN_ROLE = "ADMIN";
    private static final String HR_ROLE = "HR";
    private static final Set<String> VISIBLE_ROLES = Set.of(ADMIN_ROLE, HR_ROLE);
    private static final Set<String> APP_ASSIGNABLE_ROLES = Set.of(HR_ROLE);

    private final RestTemplate restTemplate;
    private final KeycloakAdminProperties properties;
    private final AuditLogService auditLogService;

    public KeycloakAdminService(KeycloakAdminProperties properties, AuditLogService auditLogService) {
        this.properties = properties;
        this.auditLogService = auditLogService;
        this.restTemplate = new RestTemplate();
    }

    public List<AdminUserResponse> getAllUsers() {
        ResponseEntity<List> response;
        try {
            response = restTemplate.exchange(
                    adminUsersUrl(),
                    HttpMethod.GET,
                    new HttpEntity<>(adminHeaders()),
                    List.class
            );
        } catch (HttpStatusCodeException ex) {
            throw translateException(ex, "Unable to fetch users");
        } catch (ResourceAccessException ex) {
            throw keycloakUnavailableException(ex);
        }

        List<Map<String, Object>> users = response.getBody();
        if (users == null) {
            return List.of();
        }

        return users.stream()
                .map(this::toAdminUserResponse)
                .filter(user -> !user.getRoles().isEmpty())
                .sorted(Comparator.comparing(AdminUserResponse::getUsername, String.CASE_INSENSITIVE_ORDER))
                .collect(Collectors.toList());
    }

    public List<AdminUserResponse> getPendingUsers() {
        ResponseEntity<List> response;
        try {
            response = restTemplate.exchange(
                    adminUsersUrl(),
                    HttpMethod.GET,
                    new HttpEntity<>(adminHeaders()),
                    List.class
            );
        } catch (HttpStatusCodeException ex) {
            throw translateException(ex, "Unable to fetch pending users");
        } catch (ResourceAccessException ex) {
            throw keycloakUnavailableException(ex);
        }

        List<Map<String, Object>> users = response.getBody();
        if (users == null) {
            return List.of();
        }

        return users.stream()
                .map(this::toAdminUserResponse)
                .filter(user -> user.getEnabled() == Boolean.FALSE)
                .filter(user -> user.getRoles().isEmpty())
                .sorted(Comparator.comparing(AdminUserResponse::getUsername, String.CASE_INSENSITIVE_ORDER))
                .collect(Collectors.toList());
    }

    public AdminUserResponse getUserById(String id) {
        return toAdminUserResponse(getRawUser(id));
    }

    public AdminUserResponse createUser(AdminUserRequest request) {
        validateCreateRequest(request);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("username", request.getUsername().trim());
        payload.put("email", request.getEmail().trim().toLowerCase(Locale.ROOT));
        payload.put("firstName", trimToNull(request.getFirstName()));
        payload.put("lastName", trimToNull(request.getLastName()));
        payload.put("enabled", request.getEnabled() == null || request.getEnabled());
        payload.put("emailVerified", false);

        try {
            ResponseEntity<Void> response = restTemplate.exchange(
                    adminUsersUrl(),
                    HttpMethod.POST,
                    new HttpEntity<>(payload, adminHeaders()),
                    Void.class
            );

            String userId = extractIdFromLocation(response.getHeaders().getLocation());
            if (userId == null || userId.isBlank()) {
                throw new IllegalStateException("Keycloak did not return the created user id");
            }

            updatePassword(userId, request.getPassword());
            updateRealmRoles(userId, List.of(HR_ROLE));
            AdminUserResponse created = getUserById(userId);
            auditLogService.log("HR_USER_CREATED", "USER", created.getId(), created.getUsername(), "HR user created");
            return created;
        } catch (HttpStatusCodeException ex) {
            throw translateException(ex, "Unable to create user");
        }
    }

    public AdminUserResponse registerPendingUser(AdminUserRequest request) {
        validateCreateRequest(request);

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("username", request.getUsername().trim());
        payload.put("email", request.getEmail().trim().toLowerCase(Locale.ROOT));
        payload.put("firstName", trimToNull(request.getFirstName()));
        payload.put("lastName", trimToNull(request.getLastName()));
        payload.put("enabled", false);
        payload.put("emailVerified", false);

        try {
            ResponseEntity<Void> response = restTemplate.exchange(
                    adminUsersUrl(),
                    HttpMethod.POST,
                    new HttpEntity<>(payload, adminHeaders()),
                    Void.class
            );

            String userId = extractIdFromLocation(response.getHeaders().getLocation());
            if (userId == null || userId.isBlank()) {
                throw new IllegalStateException("Keycloak did not return the created user id");
            }

            updatePassword(userId, request.getPassword());
            return getUserById(userId);
        } catch (HttpStatusCodeException ex) {
            throw translateException(ex, "Unable to request account");
        }
    }

    public AdminUserResponse updateUser(String id, AdminUserRequest request) {
        return updateUser(id, request, null);
    }

    public AdminUserResponse updateUser(String id, AdminUserRequest request, String currentAdminId) {
        Map<String, Object> existingUser = getRawUser(id);
        if (id != null && id.equals(currentAdminId) && request.getEnabled() == Boolean.FALSE) {
            throw new IllegalArgumentException("You cannot disable your own admin account.");
        }
        if (hasRealmRole(id, ADMIN_ROLE)) {
            throw new IllegalArgumentException("ADMIN users are read-only in the app. Use the Keycloak console.");
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("username", valueOrDefault(trimToNull(request.getUsername()), asString(existingUser.get("username"))));
        payload.put("email", valueOrDefault(normalizeEmail(request.getEmail()), asString(existingUser.get("email"))));
        payload.put("firstName", valueOrDefault(trimToNull(request.getFirstName()), asString(existingUser.get("firstName"))));
        payload.put("lastName", valueOrDefault(trimToNull(request.getLastName()), asString(existingUser.get("lastName"))));
        payload.put("enabled", request.getEnabled() != null ? request.getEnabled() : existingUser.get("enabled"));
        payload.put("emailVerified", existingUser.get("emailVerified"));

        try {
            restTemplate.exchange(
                    adminUsersUrl() + "/" + id,
                    HttpMethod.PUT,
                    new HttpEntity<>(payload, adminHeaders()),
                    Void.class
            );

            if (request.getPassword() != null && !request.getPassword().isBlank()) {
                updatePassword(id, request.getPassword());
            }

            if (request.getRoles() != null) {
                updateRealmRoles(id, request.getRoles());
            }

            AdminUserResponse updated = getUserById(id);
            Boolean previousEnabled = asBoolean(existingUser.get("enabled"));
            String action = "HR_USER_UPDATED";
            if (Boolean.TRUE.equals(previousEnabled) && Boolean.FALSE.equals(request.getEnabled())) {
                action = "HR_USER_DISABLED";
            } else if (Boolean.FALSE.equals(previousEnabled) && Boolean.TRUE.equals(request.getEnabled())) {
                action = "HR_USER_ENABLED";
            }
            auditLogService.log(action, "USER", updated.getId(), updated.getUsername(), "User updated");
            return updated;
        } catch (HttpStatusCodeException ex) {
            throw translateException(ex, "Unable to update user");
        }
    }

    public AdminUserResponse updateUserRoles(String id, UpdateUserRolesRequest request) {
        if (hasRealmRole(id, ADMIN_ROLE)) {
            throw new IllegalArgumentException("ADMIN users are read-only in the app. Use the Keycloak console.");
        }
        updateRealmRoles(id, request == null ? List.of() : request.getRoles());
        AdminUserResponse updated = getUserById(id);
        auditLogService.log("HR_USER_ROLES_UPDATED", "USER", updated.getId(), updated.getUsername(), "Roles updated");
        return updated;
    }

    public AdminUserResponse approvePendingUser(String id) {
        Map<String, Object> existingUser = getRawUser(id);
        if (hasRealmRole(id, ADMIN_ROLE)) {
            throw new IllegalArgumentException("ADMIN users cannot be approved or changed from the app.");
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("username", asString(existingUser.get("username")));
        payload.put("email", asString(existingUser.get("email")));
        payload.put("firstName", asString(existingUser.get("firstName")));
        payload.put("lastName", asString(existingUser.get("lastName")));
        payload.put("enabled", true);
        payload.put("emailVerified", existingUser.get("emailVerified"));

        try {
            restTemplate.exchange(
                    adminUsersUrl() + "/" + id,
                    HttpMethod.PUT,
                    new HttpEntity<>(payload, adminHeaders()),
                    Void.class
            );
            updateRealmRoles(id, List.of(HR_ROLE));
            AdminUserResponse approved = getUserById(id);
            auditLogService.log("HR_USER_APPROVED", "USER", approved.getId(), approved.getUsername(), "Approved and assigned HR role");
            return approved;
        } catch (HttpStatusCodeException ex) {
            throw translateException(ex, "Unable to approve user");
        }
    }

    public void rejectPendingUser(String id, String currentAdminId) {
        AdminUserResponse user = getUserById(id);
        deleteUser(id, currentAdminId);
        auditLogService.log("HR_USER_REJECTED", "USER", id, user.getUsername(), "Pending HR request rejected");
    }

    public void deleteUser(String id, String currentAdminId) {
        if (id != null && id.equals(currentAdminId)) {
            throw new IllegalArgumentException("You cannot delete your own admin account.");
        }

        Map<String, Object> user = getRawUser(id);
        if (hasRealmRole(id, ADMIN_ROLE)) {
            throw new IllegalArgumentException("ADMIN users cannot be deleted from the app. Use the Keycloak console.");
        }

        try {
            restTemplate.exchange(
                    adminUsersUrl() + "/" + id,
                    HttpMethod.DELETE,
                    new HttpEntity<>(adminHeaders()),
                    Void.class
            );
            auditLogService.log("HR_USER_DELETED", "USER", id, asString(user.get("username")), "HR user deleted");
        } catch (HttpStatusCodeException ex) {
            throw translateException(ex, "Unable to delete user");
        }
    }

    private void validateCreateRequest(AdminUserRequest request) {
        if (request.getPassword() == null || request.getPassword().isBlank()) {
            throw new IllegalArgumentException("Password is required when creating a user");
        }
    }

    private void updateRealmRoles(String userId, List<String> requestedRoles) {
        getRawUser(userId);

        List<String> normalizedRoles = normalizeRoles(requestedRoles);
        List<Map<String, Object>> currentRoles = getManagedRoleRepresentations(userId);
        if (!currentRoles.isEmpty()) {
            try {
                restTemplate.exchange(
                        roleMappingsUrl(userId),
                        HttpMethod.DELETE,
                        new HttpEntity<>(currentRoles, adminHeaders()),
                        Void.class
                );
            } catch (HttpStatusCodeException ex) {
                throw translateException(ex, "Unable to remove current realm roles");
            }
        }

        if (!normalizedRoles.isEmpty()) {
            List<Map<String, Object>> rolesToAssign = normalizedRoles.stream()
                    .map(this::getRealmRoleRepresentation)
                    .collect(Collectors.toList());

            try {
                restTemplate.exchange(
                        roleMappingsUrl(userId),
                        HttpMethod.POST,
                        new HttpEntity<>(rolesToAssign, adminHeaders()),
                        Void.class
                );
            } catch (HttpStatusCodeException ex) {
                throw translateException(ex, "Unable to assign realm roles");
            }
        }
    }

    private List<Map<String, Object>> getManagedRoleRepresentations(String userId) {
        ResponseEntity<List> response;
        try {
            response = restTemplate.exchange(
                    roleMappingsUrl(userId),
                    HttpMethod.GET,
                    new HttpEntity<>(adminHeaders()),
                    List.class
            );
        } catch (HttpStatusCodeException ex) {
            throw translateException(ex, "Unable to fetch user realm roles");
        }

        List<Map<String, Object>> roles = response.getBody();
        if (roles == null) {
            return List.of();
        }

        return roles.stream()
                .filter(role -> APP_ASSIGNABLE_ROLES.contains(asString(role.get("name"))))
                .collect(Collectors.toList());
    }

    private Map<String, Object> getRealmRoleRepresentation(String roleName) {
        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    realmRoleUrl(roleName),
                    HttpMethod.GET,
                    new HttpEntity<>(adminHeaders()),
                    Map.class
            );

            Map<String, Object> body = response.getBody();
            if (body == null) {
                throw new IllegalArgumentException("Role not found: " + roleName);
            }

            return body;
        } catch (HttpStatusCodeException ex) {
            throw translateException(ex, "Unable to resolve realm role " + roleName);
        }
    }

    private Map<String, Object> getRawUser(String id) {
        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    adminUsersUrl() + "/" + id,
                    HttpMethod.GET,
                    new HttpEntity<>(adminHeaders()),
                    Map.class
            );

            Map<String, Object> body = response.getBody();
            if (body == null) {
                throw new ResourceNotFoundException("User not found");
            }

            return body;
        } catch (HttpStatusCodeException ex) {
            throw translateException(ex, "Unable to fetch user");
        }
    }

    private void updatePassword(String userId, String password) {
        Map<String, Object> credential = new LinkedHashMap<>();
        credential.put("type", "password");
        credential.put("temporary", false);
        credential.put("value", password);

        try {
            restTemplate.exchange(
                    adminUsersUrl() + "/" + userId + "/reset-password",
                    HttpMethod.PUT,
                    new HttpEntity<>(credential, adminHeaders()),
                    Void.class
            );
        } catch (HttpStatusCodeException ex) {
            throw translateException(ex, "Unable to update user password");
        }
    }

    private AdminUserResponse toAdminUserResponse(Map<String, Object> user) {
        AdminUserResponse response = new AdminUserResponse();
        response.setId(asString(user.get("id")));
        response.setUsername(asString(user.get("username")));
        response.setEmail(asString(user.get("email")));
        response.setFirstName(asString(user.get("firstName")));
        response.setLastName(asString(user.get("lastName")));
        response.setEnabled(asBoolean(user.get("enabled")));
        response.setEmailVerified(asBoolean(user.get("emailVerified")));
        response.setRoles(extractManagedRoles(response.getId()));
        return response;
    }

    private List<String> extractManagedRoles(String userId) {
        return getAllRealmRoleRepresentations(userId).stream()
                .map(role -> asString(role.get("name")))
                .filter(role -> role != null && VISIBLE_ROLES.contains(role))
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .collect(Collectors.toList());
    }

    private boolean hasRealmRole(String userId, String roleName) {
        return getAllRealmRoleRepresentations(userId).stream()
                .map(role -> asString(role.get("name")))
                .anyMatch(roleName::equals);
    }

    private List<Map<String, Object>> getAllRealmRoleRepresentations(String userId) {
        ResponseEntity<List> response;
        try {
            response = restTemplate.exchange(
                    roleMappingsUrl(userId),
                    HttpMethod.GET,
                    new HttpEntity<>(adminHeaders()),
                    List.class
            );
        } catch (HttpStatusCodeException ex) {
            throw translateException(ex, "Unable to fetch user realm roles");
        }

        List<Map<String, Object>> roles = response.getBody();
        return roles == null ? List.of() : roles;
    }

    private List<String> normalizeRoles(List<String> roles) {
        if (roles == null) {
            return List.of();
        }

        List<String> normalized = new ArrayList<>();
        for (String role : roles) {
            if (role == null || role.isBlank()) {
                continue;
            }

            String value = role.trim().toUpperCase(Locale.ROOT);
            if (!APP_ASSIGNABLE_ROLES.contains(value)) {
                throw new IllegalArgumentException("Only the HR role can be assigned from the app. Assign ADMIN manually in Keycloak.");
            }

            normalized.add(value);
        }

        return new ArrayList<>(new LinkedHashSet<>(normalized));
    }

    private RuntimeException translateException(HttpStatusCodeException ex, String fallbackMessage) {
        if (ex.getStatusCode() == HttpStatus.NOT_FOUND) {
            return new ResourceNotFoundException("User not found");
        }

        if (ex.getStatusCode() == HttpStatus.UNAUTHORIZED) {
            return new IllegalArgumentException(
                    fallbackMessage + ": Keycloak rejected the admin credentials. Check keycloak-admin username, password, client id, or client secret."
            );
        }

        if (ex.getStatusCode() == HttpStatus.FORBIDDEN) {
            return new IllegalArgumentException(
                    fallbackMessage + ": the Keycloak admin account does not have permission to manage users in realm " + realmName()
            );
        }

        String responseBody = ex.getResponseBodyAsString();
        if (responseBody != null && !responseBody.isBlank()) {
            return new IllegalArgumentException(responseBody);
        }

        return new IllegalArgumentException(fallbackMessage);
    }

    private RuntimeException keycloakUnavailableException(ResourceAccessException ex) {
        return new IllegalArgumentException(
                "Unable to reach Keycloak at " + keycloakBaseUrl() + ". Make sure the Keycloak container is running on port 8080.",
                ex
        );
    }

    private HttpHeaders adminHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(getAdminAccessToken());
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setAccept(List.of(MediaType.APPLICATION_JSON));
        return headers;
    }

    private String getAdminAccessToken() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        String clientSecret = trimToNull(properties.getClientSecret());
        form.add("client_id", adminClientId());
        if (clientSecret != null) {
            form.add("grant_type", "client_credentials");
            form.add("client_secret", clientSecret);
        } else {
            form.add("grant_type", "password");
            form.add("username", adminUsername());
            form.add("password", adminPassword());
        }

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    tokenUrl(),
                    HttpMethod.POST,
                    new HttpEntity<>(form, headers),
                    Map.class
            );

            Map<String, Object> body = response.getBody();
            if (body == null || !(body.get("access_token") instanceof String token) || token.isBlank()) {
                throw new IllegalStateException("Unable to fetch Keycloak admin token");
            }

            return token;
        } catch (HttpStatusCodeException ex) {
            throw translateException(ex, "Unable to fetch Keycloak admin token");
        } catch (ResourceAccessException ex) {
            throw keycloakUnavailableException(ex);
        }
    }

    private String tokenUrl() {
        return keycloakBaseUrl() + "/realms/" + authRealmName() + "/protocol/openid-connect/token";
    }

    private String adminUsersUrl() {
        return keycloakBaseUrl() + "/admin/realms/" + realmName() + "/users";
    }

    private String realmRoleUrl(String roleName) {
        return keycloakBaseUrl() + "/admin/realms/" + realmName() + "/roles/" + roleName;
    }

    private String roleMappingsUrl(String userId) {
        return keycloakBaseUrl() + "/admin/realms/" + realmName()
                + "/users/" + userId + "/role-mappings/realm";
    }

    private String keycloakBaseUrl() {
        String serverUrl = trimToNull(properties.getServerUrl());
        if (serverUrl == null) {
            throw new IllegalArgumentException("Missing keycloak-admin.server-url in application.yml");
        }

        String normalized = serverUrl.endsWith("/") ? serverUrl.substring(0, serverUrl.length() - 1) : serverUrl;

        try {
            URI uri = new URI(normalized);
            if (!uri.isAbsolute()) {
                throw new IllegalArgumentException(
                        "keycloak-admin.server-url must be an absolute URL, for example http://localhost:8080"
                );
            }
        } catch (URISyntaxException ex) {
            throw new IllegalArgumentException("Invalid keycloak-admin.server-url: " + normalized);
        }

        return normalized;
    }

    private String realmName() {
        String realm = trimToNull(properties.getRealm());
        if (realm == null) {
            throw new IllegalArgumentException("Missing keycloak-admin.realm in application.yml");
        }

        return realm;
    }

    private String authRealmName() {
        String authRealm = trimToNull(properties.getAuthRealm());
        return authRealm != null ? authRealm : realmName();
    }

    private String adminClientId() {
        String clientId = trimToNull(properties.getClientId());
        if (clientId == null) {
            throw new IllegalArgumentException("Missing keycloak-admin.client-id in application.yml");
        }

        return clientId;
    }

    private String adminUsername() {
        String username = trimToNull(properties.getUsername());
        if (username == null) {
            throw new IllegalArgumentException(
                    "Missing keycloak-admin.username in application.yml when keycloak-admin.client-secret is empty"
            );
        }

        return username;
    }

    private String adminPassword() {
        String password = trimToNull(properties.getPassword());
        if (password == null) {
            throw new IllegalArgumentException(
                    "Missing keycloak-admin.password in application.yml when keycloak-admin.client-secret is empty"
            );
        }

        return password;
    }

    private String extractIdFromLocation(URI location) {
        if (location == null || location.getPath() == null) {
            return null;
        }

        String path = location.getPath();
        int index = path.lastIndexOf('/');
        if (index < 0 || index == path.length() - 1) {
            return null;
        }

        return path.substring(index + 1);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeEmail(String value) {
        String trimmed = trimToNull(value);
        return trimmed == null ? null : trimmed.toLowerCase(Locale.ROOT);
    }

    private String valueOrDefault(String value, String fallback) {
        return value != null ? value : fallback;
    }

    private String asString(Object value) {
        return value instanceof String str ? str : null;
    }

    private Boolean asBoolean(Object value) {
        return value instanceof Boolean bool ? bool : null;
    }
}
