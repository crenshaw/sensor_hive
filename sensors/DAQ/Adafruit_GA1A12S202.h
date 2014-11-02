#if (ARDUINO >= 100)
 #include "Arduino.h"
#else
 #include "WProgram.h"
#endif

#ifndef ADAFRUIT_GA1A12S202_H
#define ADAFRUIT_GA1A12S202_H

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
