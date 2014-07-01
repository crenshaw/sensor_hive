/**
 * dht22BT
 *
 * This small arduino sketch listens for the a command on the serial 
 * monitor and unconditionally replies with the temperature (C) and humidity (%)
 * captured by the DHT22 temperature and humidity sensor.  The response is 
 * formatted according to the miniSDI-12 protocol defined at the wiki page.
 *
 * This sketch executes successfully on the Arduino UNO equipped with
 * the Bluefruit EZ-Link Shield and DHT22 sensor.  It requires
 * the DHT library provided in the ./libraries/ directory. 
 * 
 * Based on the tutorial available at the adafruit site:
 * https://learn.adafruit.com/bluetooth-temperature-and-humidity-sensor
 *
 */
 
// Bluetooth temperature sensor
#include "DHT.h"

// Pin for the DHT sensor
#define DHTPIN 7    
#define DHTTYPE DHT22

// Create instance for the DHT sensor
DHT dht(DHTPIN, DHTTYPE);

// Setup
void setup(void)
{
  dht.begin();
  Serial.begin(115200);
}

void loop(void)
{
    // Get command
    if (Serial.available()) {

      String command;
      char c;
      
      // Read command loop
      while((c = Serial.read ()) != '!')
      {
        command += String(c);
      }

      int h = (int)dht.readHumidity();
      int t = (int)dht.readTemperature();

      // Send data (temperature,humidity) according to the miniSDI-12 format.
      Serial.println(command);
      Serial.println("001,1,<time>,+" + String(t) + ".0" + ",+" + String(h) + ".0:");
     
      }
}
