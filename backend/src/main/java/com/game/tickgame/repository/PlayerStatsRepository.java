package com.game.tickgame.repository;

import com.game.tickgame.entity.PlayerStatsEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PlayerStatsRepository extends JpaRepository<PlayerStatsEntity, String> {
}
