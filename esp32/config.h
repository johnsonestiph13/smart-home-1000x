/**
 * config.h - ESP32 Configuration File
 * Estif Home 1000X Smart Home Controller
 * 
 * This file contains all configuration parameters for the ESP32 firmware
 */

#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>

// ========== WiFi Configuration ==========
#define WIFI_SSID               "YOUR_WIFI_SSID"
#define WIFI_PASSWORD           "YOUR_WIFI_PASSWORD"
#define WIFI_HOSTNAME           "estif-home-esp32"
#define WIFI_TIMEOUT            30000  // milliseconds
#define WIFI_RECONNECT_INTERVAL 30000  // milliseconds

// ========== Server Configuration ==========
#define SERVER_HOST             "192.168.1.100"  // Change to your server IP
#define SERVER_PORT             3000
#define SERVER_PATH             "/socket.io/"
#define SERVER_API_PATH         "/api"
#define WEBSOCKET_PATH          "/socket.io/?EIO=4&transport=websocket"

// ========== Device Configuration ==========
#define DEVICE_COUNT            6

// GPIO Pins
#define PIN_LIGHT               23
#define PIN_FAN                 22
#define PIN_AC                  21
#define PIN_TV                  19
#define PIN_HEATER              18
#define PIN_PUMP                5

// Device Names
#define DEVICE_NAME_LIGHT       "Light"
#define DEVICE_NAME_LIGHT_AM    "መብራት"
#define DEVICE_NAME_FAN         "Fan"
#define DEVICE_NAME_FAN_AM      "ማራገቢያ"
#define DEVICE_NAME_AC          "AC"
#define DEVICE_NAME_AC_AM       "አየር ማቀዝቀዣ"
#define DEVICE_NAME_TV          "TV"
#define DEVICE_NAME_TV_AM       "ቴሌቪዥን"
#define DEVICE_NAME_HEATER      "Heater"
#define DEVICE_NAME_HEATER_AM   "ማሞቂያ"
#define DEVICE_NAME_PUMP        "Pump"
#define DEVICE_NAME_PUMP_AM     "ፓምፕ"

// Power Ratings (Watts)
#define POWER_LIGHT             10
#define POWER_FAN               40
#define POWER_AC                120
#define POWER_TV                80
#define POWER_HEATER            1500
#define POWER_PUMP              250

// Room Names
#define ROOM_LIVING_ROOM        "Living Room"
#define ROOM_LIVING_ROOM_AM     "ሳሎን"
#define ROOM_BEDROOM            "Bedroom"
#define ROOM_BEDROOM_AM         "መኝታ"
#define ROOM_MASTER             "Master"
#define ROOM_MASTER_AM          "ዋና"
#define ROOM_ENTERTAINMENT      "Entertainment"
#define ROOM_ENTERTAINMENT_AM   "መዝናኛ"
#define ROOM_BATHROOM           "Bathroom"
#define ROOM_BATHROOM_AM        "መታጠቢያ"
#define ROOM_GARDEN             "Garden"
#define ROOM_GARDEN_AM          "አትክልት"

// ========== Sensor Configuration ==========
// Analog Pins
#define PIN_TEMP_SENSOR         34      // LM35 or DS18B20
#define PIN_HUMIDITY_SENSOR     35      // DHT22
#define PIN_CURRENT_SENSOR      32      // ACS712
#define PIN_LIGHT_SENSOR        33      // LDR

// Sensor Types
#define TEMP_SENSOR_TYPE_LM35   1
#define TEMP_SENSOR_TYPE_DS18B20 2
#define TEMP_SENSOR_TYPE        TEMP_SENSOR_TYPE_LM35

// Sensor Calibration
#define TEMP_SENSOR_OFFSET      0.0
#define HUMIDITY_SENSOR_OFFSET  0.0
#define CURRENT_SENSOR_OFFSET   0.0

// Sensor Read Intervals (milliseconds)
#define SENSOR_READ_INTERVAL    2000    // 2 seconds
#define HEARTBEAT_INTERVAL      10000   // 10 seconds
#define AUTO_CHECK_INTERVAL     5000    // 5 seconds
#define SCHEDULE_CHECK_INTERVAL 60000   // 60 seconds
#define ENERGY_UPDATE_INTERVAL  5000    // 5 seconds

// ========== Auto Mode Configuration ==========
#define AUTO_MODE_ENABLED_DEFAULT   true
#define AUTO_MODE_AC_DEFAULT        true
#define AUTO_MODE_HEATER_DEFAULT    true
#define DEFAULT_TARGET_TEMPERATURE  24.0
#define TEMPERATURE_HYSTERESIS      1.0

// ========== Schedule Configuration ==========
// Schedule Definitions (Hour, Minute, Device ID, State, Enabled, Days[7])
// Days: 0=Sunday, 1=Monday, ..., 6=Saturday
#define SCHEDULE_COUNT 6

// Schedule 1: Light ON at 6:30 AM (Weekdays)
#define SCHEDULE_1_HOUR        6
#define SCHEDULE_1_MINUTE      30
#define SCHEDULE_1_DEVICE      0   // Light
#define SCHEDULE_1_STATE       true
#define SCHEDULE_1_DAYS        {0,1,1,1,1,1,0}

// Schedule 2: Light OFF at 10:00 PM (Daily)
#define SCHEDULE_2_HOUR        22
#define SCHEDULE_2_MINUTE      0
#define SCHEDULE_2_DEVICE      0   // Light
#define SCHEDULE_2_STATE       false
#define SCHEDULE_2_DAYS        {1,1,1,1,1,1,1}

// Schedule 3: Fan ON at 8:00 AM (Weekdays)
#define SCHEDULE_3_HOUR        8
#define SCHEDULE_3_MINUTE      0
#define SCHEDULE_3_DEVICE      1   // Fan
#define SCHEDULE_3_STATE       true
#define SCHEDULE_3_DAYS        {0,1,1,1,1,1,0}

// Schedule 4: Fan OFF at 6:00 PM (Weekdays)
#define SCHEDULE_4_HOUR        18
#define SCHEDULE_4_MINUTE      0
#define SCHEDULE_4_DEVICE      1   // Fan
#define SCHEDULE_4_STATE       false
#define SCHEDULE_4_DAYS        {0,1,1,1,1,1,0}

// Schedule 5: Pump ON at 10:00 AM (Daily)
#define SCHEDULE_5_HOUR        10
#define SCHEDULE_5_MINUTE      0
#define SCHEDULE_5_DEVICE      5   // Pump
#define SCHEDULE_5_STATE       true
#define SCHEDULE_5_DAYS        {1,1,1,1,1,1,1}

// Schedule 6: Pump OFF at 4:00 PM (Daily)
#define SCHEDULE_6_HOUR        16
#define SCHEDULE_6_MINUTE      0
#define SCHEDULE_6_DEVICE      5   // Pump
#define SCHEDULE_6_STATE       false
#define SCHEDULE_6_DAYS        {1,1,1,1,1,1,1}

// ========== Network Configuration ==========
#define MDNS_HOSTNAME           "estif-home"
#define MDNS_SERVICE            "_http"
#define MDNS_PROTOCOL           "_tcp"
#define MDNS_PORT               80

// ========== Web Server Configuration ==========
#define WEB_SERVER_PORT         80
#define WEB_SERVER_MAX_CLIENTS  4
#define WEB_SERVER_TIMEOUT      2000

// ========== WebSocket Configuration ==========
#define WS_RECONNECT_INTERVAL   5000    // milliseconds
#define WS_HEARTBEAT_INTERVAL   15000   // milliseconds
#define WS_HEARTBEAT_TIMEOUT    3000    // milliseconds
#define WS_MAX_RECONNECT_ATTEMPTS 10

// ========== OTA Update Configuration ==========
#define OTA_ENABLED             true
#define OTA_PORT                8266
#define OTA_PASSWORD            "estif1234"
#define OTA_HOSTNAME            "estif-home-ota"

// ========== Preferences Storage ==========
#define PREFERENCES_NAMESPACE   "estif-home"
#define PREFERENCES_VERSION     "1.0.0"

// Preference Keys
#define PREF_DEVICE_STATE_PREFIX "state_"
#define PREF_AUTO_MODE_PREFIX    "auto_"
#define PREF_TARGET_TEMP         "target_temp"
#define PREF_ENERGY_TOTAL        "energy_total"
#define PREF_RUNTIME_PREFIX      "runtime_"

// ========== LED Indicators ==========
#define LED_BUILTIN             2
#define LED_STATUS              2
#define LED_WIFI                2
#define LED_WS                  2

// LED Patterns (milliseconds)
#define LED_PATTERN_CONNECTED   1000
#define LED_PATTERN_CONNECTING  100
#define LED_PATTERN_ERROR       50

// ========== Debug Configuration ==========
#define DEBUG_ENABLED           true
#define SERIAL_BAUD             115200

// Debug Levels
#define DEBUG_ERROR             1
#define DEBUG_WARN              2
#define DEBUG_INFO              3
#define DEBUG_VERBOSE           4
#define DEBUG_LEVEL             DEBUG_INFO

// Debug Macros
#if DEBUG_ENABLED
  #define DEBUG_PRINT(level, ...) if (level <= DEBUG_LEVEL) { Serial.print(__VA_ARGS__); }
  #define DEBUG_PRINTLN(level, ...) if (level <= DEBUG_LEVEL) { Serial.println(__VA_ARGS__); }
  #define DEBUG_PRINTF(level, ...) if (level <= DEBUG_LEVEL) { Serial.printf(__VA_ARGS__); }
#else
  #define DEBUG_PRINT(level, ...)
  #define DEBUG_PRINTLN(level, ...)
  #define DEBUG_PRINTF(level, ...)
#endif

// ========== System Limits ==========
#define MAX_RETRY_ATTEMPTS      5
#define MAX_QUEUE_SIZE          100
#define MAX_LOG_SIZE            1000
#define MAX_DEVICE_RUNTIME      1000000  // hours
#define MAX_ENERGY_TOTAL        1000000  // kWh

// ========== Energy Calculation ==========
#define ENERGY_RATE_PER_KWH     0.15    // USD per kWh
#define CO2_PER_KWH             0.4     // kg CO2 per kWh (estimated)

// ========== Time Configuration ==========
#define TIMEZONE_OFFSET         3       // UTC+3 (Ethiopia)
#define NTP_SERVER1             "pool.ntp.org"
#define NTP_SERVER2             "time.nist.gov"
#define NTP_SERVER3             "time.google.com"

// ========== API Endpoints ==========
#define API_REGISTER_ESP        "/api/esp/register"
#define API_HEARTBEAT           "/api/esp/heartbeat"
#define API_DEVICE_CONTROL      "/api/devices"
#define API_DEVICE_STATE        "/api/device/%d/state"
#define API_MASTER_CONTROL      "/api/master/%s"
#define API_SENSOR_DATA         "/api/sensors"

// ========== Command Types ==========
#define CMD_TYPE_DEVICE         "device"
#define CMD_TYPE_MASTER         "master"
#define CMD_TYPE_SCENE          "scene"
#define CMD_TYPE_AUTO           "auto"
#define CMD_TYPE_SCHEDULE       "schedule"

// ========== Event Types ==========
#define EVENT_DEVICE_UPDATE     "device_update"
#define EVENT_MASTER_UPDATE     "master_update"
#define EVENT_SENSOR_UPDATE     "sensor_update"
#define EVENT_ESP_STATUS        "esp_status"
#define EVENT_AUTO_UPDATE       "auto_update"
#define EVENT_SCHEDULE_TRIGGER  "schedule_trigger"

// ========== Error Codes ==========
#define ERROR_NONE              0
#define ERROR_WIFI_CONNECT      1
#define ERROR_SERVER_CONNECT    2
#define ERROR_WS_CONNECT        3
#define ERROR_DEVICE_NOT_FOUND  4
#define ERROR_INVALID_COMMAND   5
#define ERROR_AUTO_MODE         6
#define ERROR_SENSOR_FAIL       7

// ========== Health Status ==========
#define HEALTH_EXCELLENT        100
#define HEALTH_GOOD             80
#define HEALTH_FAIR             60
#define HEALTH_POOR             40
#define HEALTH_CRITICAL         20

// ========== Device Types ==========
#define DEVICE_TYPE_LIGHT       0
#define DEVICE_TYPE_FAN         1
#define DEVICE_TYPE_AC          2
#define DEVICE_TYPE_TV          3
#define DEVICE_TYPE_HEATER      4
#define DEVICE_TYPE_PUMP        5

// ========== GPIO Arrays ==========
const int DEVICE_PINS[] = {
  PIN_LIGHT,    // Light
  PIN_FAN,      // Fan
  PIN_AC,       // AC
  PIN_TV,       // TV
  PIN_HEATER,   // Heater
  PIN_PUMP      // Pump
};

const char* DEVICE_NAMES[] = {
  DEVICE_NAME_LIGHT,
  DEVICE_NAME_FAN,
  DEVICE_NAME_AC,
  DEVICE_NAME_TV,
  DEVICE_NAME_HEATER,
  DEVICE_NAME_PUMP
};

const char* DEVICE_NAMES_AM[] = {
  DEVICE_NAME_LIGHT_AM,
  DEVICE_NAME_FAN_AM,
  DEVICE_NAME_AC_AM,
  DEVICE_NAME_TV_AM,
  DEVICE_NAME_HEATER_AM,
  DEVICE_NAME_PUMP_AM
};

const int DEVICE_POWER[] = {
  POWER_LIGHT,
  POWER_FAN,
  POWER_AC,
  POWER_TV,
  POWER_HEATER,
  POWER_PUMP
};

const char* DEVICE_ROOMS[] = {
  ROOM_LIVING_ROOM,
  ROOM_BEDROOM,
  ROOM_MASTER,
  ROOM_ENTERTAINMENT,
  ROOM_BATHROOM,
  ROOM_GARDEN
};

const char* DEVICE_ROOMS_AM[] = {
  ROOM_LIVING_ROOM_AM,
  ROOM_BEDROOM_AM,
  ROOM_MASTER_AM,
  ROOM_ENTERTAINMENT_AM,
  ROOM_BATHROOM_AM,
  ROOM_GARDEN_AM
};

#endif // CONFIG_H