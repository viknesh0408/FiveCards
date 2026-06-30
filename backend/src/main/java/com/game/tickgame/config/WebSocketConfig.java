package com.game.tickgame.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("ws-heartbeat-thread-");
        scheduler.initialize();

        // Broadcasts start with /topic (pub-sub) and /queue (user-specific messages)
        config.enableSimpleBroker("/topic", "/queue")
                .setHeartbeatValue(new long[]{30000, 30000})
                .setTaskScheduler(scheduler);
        // Messages sent from client to server start with /app
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // The endpoint clients connect to
        registry.addEndpoint("/ws-game")
                .setAllowedOriginPatterns("*") // Allow CORS for Vite client (usually localhost:5173)
                .withSockJS();
        
        registry.addEndpoint("/ws-game")
                .setAllowedOriginPatterns("*"); // Also support native WebSockets directly without SockJS
    }
}
