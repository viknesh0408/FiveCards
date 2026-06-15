package com.game.tickgame.controller;

import com.game.tickgame.entity.UserProfileEntity;
import com.game.tickgame.repository.UserProfileRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/profile")
public class UserProfileController {

    @Autowired
    private UserProfileRepository userProfileRepository;

    @GetMapping("/{id}")
    public ResponseEntity<?> getProfile(@PathVariable String id, @RequestParam(required = false) String name) {
        UserProfileEntity profile = userProfileRepository.findById(id).orElse(null);
        if (profile == null) {
            String finalName = (name != null && !name.trim().isEmpty()) ? name : "Player";
            profile = new UserProfileEntity(id, finalName, 1, 0, 100);
            userProfileRepository.save(profile);
        }
        return ResponseEntity.ok(profile);
    }

    @PostMapping("/sync")
    public ResponseEntity<?> syncProfile(@RequestBody UserProfileEntity request) {
        if (request.getId() == null || request.getId().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "ID is required"));
        }
        UserProfileEntity profile = userProfileRepository.findById(request.getId()).orElse(new UserProfileEntity());
        profile.setId(request.getId());
        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            profile.setName(request.getName());
        }
        profile.setLevel(request.getLevel());
        profile.setXp(request.getXp());
        profile.setMmr(request.getMmr());
        userProfileRepository.save(profile);
        return ResponseEntity.ok(profile);
    }
}
