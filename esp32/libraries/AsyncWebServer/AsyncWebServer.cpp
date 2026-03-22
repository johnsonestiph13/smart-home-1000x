/**
 * AsyncWebServer.cpp - Implementation
 */

#include "AsyncWebServer.h"

AsyncWebServer::AsyncWebServer(int port) : server(port) {}

void AsyncWebServer::begin() {
    server.begin();
}

void AsyncWebServer::handleClient() {
    server.handleClient();
}

void AsyncWebServer::on(const String& uri, std::function<void(void)> handler) {
    server.on(uri, [handler]() {
        handler();
    });
}

void AsyncWebServer::onNotFound(std::function<void(void)> handler) {
    server.onNotFound([handler]() {
        handler();
    });
}

void AsyncWebServer::send(int code, const String& contentType, const String& content) {
    server.send(code, contentType, content);
}

void AsyncWebServer::send(int code, const String& contentType, const uint8_t* content, size_t len) {
    server.send(code, contentType, content, len);
}

void AsyncWebServer::sendJson(int code, const JsonDocument& doc) {
    String output;
    serializeJson(doc, output);
    server.send(code, "application/json", output);
}

bool AsyncWebServer::hasArg(const String& name) {
    return server.hasArg(name);
}

String AsyncWebServer::arg(const String& name) {
    return server.arg(name);
}

String AsyncWebServer::uri() {
    return server.uri();
}

String AsyncWebServer::method() {
    return server.method() == HTTP_GET ? "GET" : 
           server.method() == HTTP_POST ? "POST" : 
           server.method() == HTTP_PUT ? "PUT" : 
           server.method() == HTTP_DELETE ? "DELETE" : "UNKNOWN";
}