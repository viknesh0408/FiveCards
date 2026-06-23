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
                "version", "1.0.25",
                "apkUrl", "https://drive.google.com/file/d/1rbGpiOwLIvN63urioJsNaTPUnrft6TSx/view?usp=sharing"
        );
    }
}