/**
 * WiFiManager.h - Simplified WiFi Connection Manager
 * Handles WiFi connection with fallback to AP mode
 */

#ifndef WIFIMANAGER_H
#define WIFIMANAGER_H

#include <WiFi.h>
#include <DNSServer.h>
#include <WebServer.h>
#include <Preferences.h>

class WiFiManager {
private:
    DNSServer dnsServer;
    WebServer server;
    Preferences preferences;
    
    const char* apSSID = "EstifHome-ESP32";
    const char* apPassword = "estif1234";
    const byte DNS_PORT = 53;
    const IPAddress apIP = IPAddress(192, 168, 4, 1);
    
    bool shouldSaveConfig = false;
    String savedSSID = "";
    String savedPassword = "";
    
    void startAPMode();
    void handleRoot();
    void handleSave();
    void handleNotFound();
    bool connectToWiFi(const char* ssid, const char* password);
    void saveCredentials(const char* ssid, const char* password);
    void loadCredentials();
    
public:
    WiFiManager();
    bool autoConnect(const char* apName = nullptr, const char* apPass = nullptr);
    bool autoConnect();
    void resetSettings();
    bool isConnected();
    String getSSID();
    String getIP();
    int getRSSI();
};

#endif