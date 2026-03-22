/**
 * WiFiManager.cpp - Implementation
 */

#include "WiFiManager.h"

WiFiManager::WiFiManager() : server(80) {
    loadCredentials();
}

bool WiFiManager::autoConnect(const char* apName, const char* apPass) {
    // Try to connect with saved credentials
    if (savedSSID.length() > 0) {
        if (connectToWiFi(savedSSID.c_str(), savedPassword.c_str())) {
            return true;
        }
    }
    
    // Start AP mode for configuration
    startAPMode();
    
    // Wait for configuration
    unsigned long startTime = millis();
    while (millis() - startTime < 300000) { // 5 minute timeout
        server.handleClient();
        dnsServer.processNextRequest();
        
        if (shouldSaveConfig) {
            shouldSaveConfig = false;
            if (savedSSID.length() > 0 && savedPassword.length() > 0) {
                if (connectToWiFi(savedSSID.c_str(), savedPassword.c_str())) {
                    saveCredentials(savedSSID.c_str(), savedPassword.c_str());
                    return true;
                }
            }
        }
        
        delay(10);
    }
    
    return false;
}

bool WiFiManager::autoConnect() {
    return autoConnect(nullptr, nullptr);
}

void WiFiManager::startAPMode() {
    WiFi.mode(WIFI_AP);
    WiFi.softAPConfig(apIP, apIP, IPAddress(255, 255, 255, 0));
    WiFi.softAP(apSSID, apPassword);
    
    dnsServer.start(DNS_PORT, "*", apIP);
    
    server.on("/", std::bind(&WiFiManager::handleRoot, this));
    server.on("/save", std::bind(&WiFiManager::handleSave, this));
    server.onNotFound(std::bind(&WiFiManager::handleNotFound, this));
    server.begin();
}

void WiFiManager::handleRoot() {
    String html = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Estif Home - WiFi Setup</title>
    <style>
        body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; justify-content: center; align-items: center; margin: 0; padding: 20px; }
        .container { background: white; border-radius: 20px; padding: 30px; max-width: 400px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.2); }
        h1 { text-align: center; color: #4361ee; margin-bottom: 30px; }
        input { width: 100%; padding: 12px; margin: 10px 0; border: 1px solid #ddd; border-radius: 8px; font-size: 16px; }
        button { width: 100%; padding: 12px; background: #4361ee; color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; }
        button:hover { background: #3a56d4; }
        .info { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🏠 Estif Home</h1>
        <h3>WiFi Setup</h3>
        <form action="/save" method="POST">
            <input type="text" name="ssid" placeholder="WiFi Name (SSID)" required>
            <input type="password" name="password" placeholder="WiFi Password">
            <button type="submit">Connect</button>
        </form>
        <div class="info">Connect to this network and configure your WiFi</div>
    </div>
</body>
</html>
)rawliteral";
    server.send(200, "text/html", html);
}

void WiFiManager::handleSave() {
    if (server.hasArg("ssid")) {
        savedSSID = server.arg("ssid");
        savedPassword = server.arg("password");
        shouldSaveConfig = true;
    }
    server.send(200, "text/html", "<html><body><h2>Configuration saved! Rebooting...</h2></body></html>");
    delay(2000);
    ESP.restart();
}

void WiFiManager::handleNotFound() {
    server.send(404, "text/plain", "Not Found");
}

bool WiFiManager::connectToWiFi(const char* ssid, const char* password) {
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid, password);
    
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30) {
        delay(500);
        attempts++;
    }
    
    return WiFi.status() == WL_CONNECTED;
}

void WiFiManager::saveCredentials(const char* ssid, const char* password) {
    preferences.begin("wifi", false);
    preferences.putString("ssid", ssid);
    preferences.putString("password", password);
    preferences.end();
}

void WiFiManager::loadCredentials() {
    preferences.begin("wifi", true);
    savedSSID = preferences.getString("ssid", "");
    savedPassword = preferences.getString("password", "");
    preferences.end();
}

void WiFiManager::resetSettings() {
    preferences.begin("wifi", false);
    preferences.clear();
    preferences.end();
    savedSSID = "";
    savedPassword = "";
}

bool WiFiManager::isConnected() {
    return WiFi.status() == WL_CONNECTED;
}

String WiFiManager::getSSID() {
    return WiFi.SSID();
}

String WiFiManager::getIP() {
    return WiFi.localIP().toString();
}

int WiFiManager::getRSSI() {
    return WiFi.RSSI();
}