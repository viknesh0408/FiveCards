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
                "version", "1.0.29",
                "apkUrl", "https://drive.google.com/uc?export=download&id=10id2251dzmSF2UDd9-J_eKxpH3oXoeEl"
        );
    }
}