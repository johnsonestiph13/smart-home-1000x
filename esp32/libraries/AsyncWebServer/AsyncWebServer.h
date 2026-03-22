/**
 * AsyncWebServer.h - Simplified Async Web Server Wrapper
 */

#ifndef ASYNCWEBSERVER_H
#define ASYNCWEBSERVER_H

#include <WebServer.h>
#include <functional>
#include <ArduinoJson.h>

class AsyncWebServer {
private:
    WebServer server;
    std::function<void(void)> rootHandler;
    std::function<void(void)> notFoundHandler;
    
public:
    AsyncWebServer(int port = 80);
    void begin();
    void handleClient();
    void on(const String& uri, std::function<void(void)> handler);
    void onNotFound(std::function<void(void)> handler);
    void send(int code, const String& contentType, const String& content);
    void send(int code, const String& contentType, const uint8_t* content, size_t len);
    void sendJson(int code, const JsonDocument& doc);
    bool hasArg(const String& name);
    String arg(const String& name);
    String uri();
    String method();
};

#endif