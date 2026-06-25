package com.game.tickgame.repository;

import com.game.tickgame.entity.RoundEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface RoundRepository extends JpaRepository<RoundEntity, String> {
    List<RoundEntity> findByGameId(String gameId);

    @Transactional
    void deleteByGameId(String gameId);
}
