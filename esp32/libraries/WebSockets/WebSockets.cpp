/**
 * WebSockets.cpp - Implementation
 */

#include "WebSockets.h"

WebSockets::WebSockets() {}

void WebSockets::begin(const String& host, int port, const String& url) {
    this->host = host;
    this->port = port;
    this->url = url;
    
    ws.begin(host.c_str(), port, url.c_str());
    ws.onEvent([this](WStype_t type, uint8_t* payload, size_t length) {
        webSocketEvent(type, payload, length, this);
    });
}

void WebSockets::webSocketEvent(WStype_t type, uint8_t* payload, size_t length, WebSockets* instance) {
    switch(type) {
        case WStype_DISCONNECTED:
            instance->connected = false;
            if (instance->disconnectHandler) instance->disconnectHandler();
            break;
            
        case WStype_CONNECTED:
            instance->connected = true;
            if (instance->connectHandler) instance->connectHandler();
            break;
            
        case WStype_TEXT: {
            StaticJsonDocument<1024> doc;
            DeserializationError error = deserializeJson(doc, payload, length);
            if (!error && instance->messageHandler) {
                instance->messageHandler(doc);
            }
            break;
        }
        
        case WStype_BIN:
            // Handle binary messages if needed
            break;
            
        case WStype_PING:
        case WStype_PONG:
        case WStype_ERROR:
            break;
    }
}

void WebSockets::loop() {
    ws.loop();
}

void WebSockets::send(const JsonDocument& doc) {
    if (!connected) return;
    String output;
    serializeJson(doc, output);
    ws.sendTXT(output);
}

void WebSockets::send(const String& text) {
    if (!connected) return;
    ws.sendTXT(text);
}

void WebSockets::onMessage(std::function<void(const JsonDocument&)> handler) {
    messageHandler = handler;
}

void WebSockets::onConnect(std::function<void(void)> handler) {
    connectHandler = handler;
}

void WebSockets::onDisconnect(std::function<void(void)> handler) {
    disconnectHandler = handler;
}

bool WebSockets::isConnected() {
    return connected;
}

void WebSockets::setReconnectInterval(unsigned long interval) {
    ws.setReconnectInterval(interval);
}

void WebSockets::enableHeartbeat(unsigned long interval, unsigned long timeout, unsigned long fails) {
    ws.enableHeartbeat(interval, timeout, fails);
}