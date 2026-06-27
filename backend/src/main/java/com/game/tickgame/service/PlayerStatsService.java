package com.game.tickgame.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.game.tickgame.dto.PlayerStatsDto;
import com.game.tickgame.entity.PlayerStatsEntity;
import com.game.tickgame.repository.PlayerStatsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class PlayerStatsService {

    @Autowired
    private PlayerStatsRepository playerStatsRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    // ─── Public API ────────────────────────────────────────────────────────────

    /**
     * Returns stored stats for the player, or null if never synced.
     */
    public PlayerStatsDto getStats(String playerId) {
        return playerStatsRepository.findById(playerId)
                .map(this::toDto)
                .orElse(null);
    }

    /**
     * Upserts player stats using a MAX-merge strategy so no data ever goes backwards.
     * Returns the merged entity as a DTO.
     */
    public PlayerStatsDto saveStats(String playerId, PlayerStatsDto incoming) {
        PlayerStatsEntity existing = playerStatsRepository.findById(playerId).orElse(null);
        PlayerStatsEntity merged = merge(existing, playerId, incoming);
        merged.setUpdatedAt(System.currentTimeMillis());
        playerStatsRepository.save(merged);
        return toDto(merged);
    }

    // ─── Merge Logic ───────────────────────────────────────────────────────────

    /**
     * Merges incoming DTO on top of an existing entity (or creates a fresh one).
     *
     * Rules:
     *  - Counter fields (games played, wins, points, rounds, declares): MAX(existing, incoming)
     *  - winStreakBest: MAX(existing, incoming)
     *  - winStreakCurrent: use incoming (it's the live value)
     *  - lowestRoundScore: MIN when both > 0, else the non-zero one
     *  - highestRoundScore: MAX
     *  - recentForm: use whichever is longer (more history)
     *  - matchHistory: merge both lists, deduplicate by gameId, keep newest 50
     */
    private PlayerStatsEntity merge(PlayerStatsEntity existing, String playerId, PlayerStatsDto incoming) {
        if (existing == null) {
            // First sync for this player — persist incoming directly
            PlayerStatsEntity fresh = new PlayerStatsEntity();
            fresh.setPlayerId(playerId);
            applyIncoming(fresh, incoming);
            return fresh;
        }

        // Counter MAX merges
        existing.setPlayerName(incoming.getPlayerName() != null ? incoming.getPlayerName() : existing.getPlayerName());
        existing.setGamesPlayedTotal(Math.max(existing.getGamesPlayedTotal(), incoming.getGamesPlayedTotal()));
        existing.setGamesPlayedOffline(Math.max(existing.getGamesPlayedOffline(), incoming.getGamesPlayedOffline()));
        existing.setGamesPlayedOnline(Math.max(existing.getGamesPlayedOnline(), incoming.getGamesPlayedOnline()));
        existing.setWinsTotal(Math.max(existing.getWinsTotal(), incoming.getWinsTotal()));
        existing.setWinsOffline(Math.max(existing.getWinsOffline(), incoming.getWinsOffline()));
        existing.setWinsOnline(Math.max(existing.getWinsOnline(), incoming.getWinsOnline()));
        existing.setWinStreakBest(Math.max(existing.getWinStreakBest(), incoming.getWinStreakBest()));
        existing.setWinStreakCurrent(incoming.getWinStreakCurrent()); // live value — always trust client
        existing.setTotalPointsScored(Math.max(existing.getTotalPointsScored(), incoming.getTotalPointsScored()));
        existing.setRoundsPlayed(Math.max(existing.getRoundsPlayed(), incoming.getRoundsPlayed()));
        existing.setHighestRoundScore(Math.max(existing.getHighestRoundScore(), incoming.getHighestRoundScore()));
        existing.setDeclaresCorrect(Math.max(existing.getDeclaresCorrect(), incoming.getDeclaresCorrect()));
        existing.setDeclaresWrong(Math.max(existing.getDeclaresWrong(), incoming.getDeclaresWrong()));

        // lowestRoundScore: MIN of both non-zero values
        int existingLow = existing.getLowestRoundScore();
        int incomingLow = incoming.getLowestRoundScore();
        if (existingLow > 0 && incomingLow > 0) {
            existing.setLowestRoundScore(Math.min(existingLow, incomingLow));
        } else {
            existing.setLowestRoundScore(Math.max(existingLow, incomingLow)); // prefer the non-zero one
        }

        // recentForm: use whichever JSON array is longer
        existing.setRecentForm(mergeRecentForm(existing.getRecentForm(), incoming.getRecentForm()));

        // matchHistory: merge + deduplicate + cap at 50
        existing.setMatchHistory(mergeMatchHistory(existing.getMatchHistory(), incoming.getMatchHistory()));

        return existing;
    }

    private void applyIncoming(PlayerStatsEntity entity, PlayerStatsDto dto) {
        entity.setPlayerName(dto.getPlayerName());
        entity.setGamesPlayedTotal(dto.getGamesPlayedTotal());
        entity.setGamesPlayedOffline(dto.getGamesPlayedOffline());
        entity.setGamesPlayedOnline(dto.getGamesPlayedOnline());
        entity.setWinsTotal(dto.getWinsTotal());
        entity.setWinsOffline(dto.getWinsOffline());
        entity.setWinsOnline(dto.getWinsOnline());
        entity.setWinStreakCurrent(dto.getWinStreakCurrent());
        entity.setWinStreakBest(dto.getWinStreakBest());
        entity.setTotalPointsScored(dto.getTotalPointsScored());
        entity.setRoundsPlayed(dto.getRoundsPlayed());
        entity.setLowestRoundScore(dto.getLowestRoundScore());
        entity.setHighestRoundScore(dto.getHighestRoundScore());
        entity.setDeclaresCorrect(dto.getDeclaresCorrect());
        entity.setDeclaresWrong(dto.getDeclaresWrong());
        entity.setRecentForm(dto.getRecentForm());
        entity.setMatchHistory(dto.getMatchHistory());
    }

    // ─── JSON Field Merges ─────────────────────────────────────────────────────

    private String mergeRecentForm(String existingJson, String incomingJson) {
        List<String> existingList = parseStringList(existingJson);
        List<String> incomingList = parseStringList(incomingJson);
        // Use whichever has more entries (more recent history)
        List<String> winner = incomingList.size() >= existingList.size() ? incomingList : existingList;
        return toJson(winner);
    }

    /**
     * Merges two JSON arrays of match history objects, deduplicates by "gameId",
     * sorts by "date" descending, and caps at 50 entries.
     */
    private String mergeMatchHistory(String existingJson, String incomingJson) {
        List<Map<String, Object>> existingList = parseMapList(existingJson);
        List<Map<String, Object>> incomingList = parseMapList(incomingJson);

        // Merge — incoming overrides existing for the same gameId (it may have more data)
        LinkedHashMap<String, Map<String, Object>> merged = new LinkedHashMap<>();
        for (Map<String, Object> entry : existingList) {
            Object gameId = entry.get("gameId");
            if (gameId != null) merged.put(gameId.toString(), entry);
        }
        for (Map<String, Object> entry : incomingList) {
            Object gameId = entry.get("gameId");
            if (gameId != null) merged.put(gameId.toString(), entry); // incoming wins on collision
        }

        // Sort by date descending and cap at 50
        List<Map<String, Object>> sorted = new ArrayList<>(merged.values());
        sorted.sort((a, b) -> {
            String dateA = a.getOrDefault("date", "").toString();
            String dateB = b.getOrDefault("date", "").toString();
            return dateB.compareTo(dateA); // descending
        });
        if (sorted.size() > 50) sorted = sorted.subList(0, 50);

        return toJson(sorted);
    }

    // ─── JSON Helpers ──────────────────────────────────────────────────────────

    private List<String> parseStringList(String json) {
        if (json == null || json.isBlank()) return new ArrayList<>();
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> parseMapList(String json) {
        if (json == null || json.isBlank()) return new ArrayList<>();
        try {
            return objectMapper.readValue(json, new TypeReference<List<Map<String, Object>>>() {});
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "[]";
        }
    }

    // ─── Entity → DTO ─────────────────────────────────────────────────────────

    private PlayerStatsDto toDto(PlayerStatsEntity e) {
        PlayerStatsDto dto = new PlayerStatsDto();
        dto.setPlayerId(e.getPlayerId());
        dto.setPlayerName(e.getPlayerName());
        dto.setGamesPlayedTotal(e.getGamesPlayedTotal());
        dto.setGamesPlayedOffline(e.getGamesPlayedOffline());
        dto.setGamesPlayedOnline(e.getGamesPlayedOnline());
        dto.setWinsTotal(e.getWinsTotal());
        dto.setWinsOffline(e.getWinsOffline());
        dto.setWinsOnline(e.getWinsOnline());
        dto.setWinStreakCurrent(e.getWinStreakCurrent());
        dto.setWinStreakBest(e.getWinStreakBest());
        dto.setTotalPointsScored(e.getTotalPointsScored());
        dto.setRoundsPlayed(e.getRoundsPlayed());
        dto.setLowestRoundScore(e.getLowestRoundScore());
        dto.setHighestRoundScore(e.getHighestRoundScore());
        dto.setDeclaresCorrect(e.getDeclaresCorrect());
        dto.setDeclaresWrong(e.getDeclaresWrong());
        dto.setRecentForm(e.getRecentForm());
        dto.setMatchHistory(e.getMatchHistory());
        return dto;
    }
}
