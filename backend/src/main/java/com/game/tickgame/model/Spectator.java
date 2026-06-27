package com.game.tickgame.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Spectator {
    private String id;
    private String name;
    private long joinedAt;
}
