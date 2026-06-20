package com.game.tickgame.controller;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/version")
public class VersionController {

    @GetMapping
    public Map<String, String> getVersion() {
        return Map.of(
                "version", "1.0.20",
                "apkUrl", "https://drive.google.com/uc?export=download&id=1Q_pr4oQ2mkwBiy3OG8bto8QR6-JIxmd7"
        );
    }
}