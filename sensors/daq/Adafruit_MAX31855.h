/*************************************************** 
  This is a library for the Adafruit Thermocouple Sensor w/MAX31855K

  Designed specifically to work with the Adafruit Thermocouple Sensor
  ----> https://www.adafruit.com/products/269

  These displays use SPI to communicate, 3 pins are required to  
  interface
  Adafruit invests time and resources providing this open source code, 
  please support Adafruit and open-source hardware by purchasing 
  products from Adafruit!

  Written by Limor Fried/Ladyada for Adafruit Industries.  
  BSD license, all text above must be included in any redistribution
 ****************************************************/


#if (ARDUINO >= 100)
 #include "Arduino.h"
#else
 #include "WProgram.h"
#endif

class Adafruit_MAX31855 {
 public:
  Adafruit_MAX31855(int8_t SCLK, int8_t CS, int8_t MISO);

  void changeCS(int);
  double readInternal(void);
  double readCelsius(void);
  double readFarenheit(void);
  uint8_t readError();
  boolean isUsed (void) { return inUse;}
  void setUsed (boolean use) { inUse = use;}

 private:
  int8_t sclk, miso, cs;
  boolean inUse;
  uint32_t spiread32(void);
};