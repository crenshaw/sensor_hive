#if (ARDUINO >= 100)
 #include "Arduino.h"
#else
 #include "WProgram.h"
#endif

#ifndef ADAFRUIT_GA1A12S202_H
#define ADAFRUIT_GA1A12S202_H

/**
Class: Adafruit_GA1A12S202
    This class provides the interface for the luminsity sensor. 
Constructor:
  Adafruit_GA1A12S202 (int8_t pin)
    postcondition: luminsoty sensor has been created.
Public Function:
  float readLux (void)
    postcondition: returns the converted reading from the sensor.
Private Functions:
  float rawToLux (int raw)
    postcondition: the raw analog reading is convered via a log scale to a lux reading.
*/
class Adafruit_GA1A12S202{
  public:
    Adafruit_GA1A12S202 (int8_t pin);
    
    float readLux (void);
    
  private:
      int8_t sensorPin;
      float rawRange;
      float logRange;
      float rawToLux (int raw);
};

#endif
