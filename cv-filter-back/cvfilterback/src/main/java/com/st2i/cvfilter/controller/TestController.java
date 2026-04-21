package com.st2i.cvfilter.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class TestController {

    @GetMapping("/api/public/hello")
    public String publicHello() {
        return "Public endpoint works";
    }

    @GetMapping("/api/hr/hello")
    public String hrHello() {
        return "HR or ADMIN endpoint works";
    }

    @GetMapping("/api/admin/hello")
    public String adminHello() {
        return "ADMIN endpoint works";
    }
}