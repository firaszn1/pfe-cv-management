package com.st2i.cvfilter.dto;

import java.util.ArrayList;
import java.util.List;

public class UpdateUserRolesRequest {

    private List<String> roles = new ArrayList<>();

    public List<String> getRoles() {
        return roles;
    }

    public void setRoles(List<String> roles) {
        this.roles = roles;
    }
}
