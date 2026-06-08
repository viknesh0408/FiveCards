package com.game.tickgame.repository;

import com.game.tickgame.entity.PlayerEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PlayerRepository extends JpaRepository<PlayerEntity, String> {
    List<PlayerEntity> findByGameId(String gameId);
}
