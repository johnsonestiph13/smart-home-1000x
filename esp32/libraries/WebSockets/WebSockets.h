/**
 * WebSockets.h - WebSocket Client for ESP32
 */

#ifndef WEBSOCKETS_H
#define WEBSOCKETS_H

#include <WebSocketsClient.h>
#include <ArduinoJson.h>
#include <functional>

class WebSockets {
private:
    WebSocketsClient ws;
    String host;
    int port;
    String url;
    bool connected = false;
    std::function<void(const JsonDocument&)> messageHandler;
    std::function<void(void)> connectHandler;
    std::function<void(void)> disconnectHandler;
    
    static void webSocketEvent(WStype_t type, uint8_t* payload, size_t length, WebSockets* instance);
    
public:
    WebSockets();
    void begin(const String& host, int port, const String& url = "/");
    void loop();
    void send(const JsonDocument& doc);
    void send(const String& text);
    void onMessage(std::function<void(const JsonDocument&)> handler);
    void onConnect(std::function<void(void)> handler);
    void onDisconnect(std::function<void(void)> handler);
    bool isConnected();
    void setReconnectInterval(unsigned long interval);
    void enableHeartbeat(unsigned long interval, unsigned long timeout, unsigned long fails);
};

#endif