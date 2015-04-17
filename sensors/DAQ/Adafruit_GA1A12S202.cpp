#include "Adafruit_GA1A12S202.H"
/**
Adafruit_GA1A12S202::Adafruit_GA1A12S202 (int8_t pin)
  Sets the pin the sensor is connected too. sets raw range to 1024 and logRange to 5.0.
  Sets analog reference for the arduino board to external. That is now the analog reference 
  will be read from the AREF pin. This needs to be 3.3 volts.
  
  @param int8_t pin    The pin the sensor is connected too.
*/
Adafruit_GA1A12S202::Adafruit_GA1A12S202 (int8_t pin){
    sensorPin = pin;
    rawRange = 1024;
    logRange = 5.0;
    analogReference(EXTERNAL);
}
/**
float Adafruit_GA1A12S202::readLux (void)
  retuns the current lux reading form the sensor.
  
  @param void
  
  @return float    the current value of the sensor.

*/
float Adafruit_GA1A12S202::readLux (void){
    return rawToLux (analogRead (sensorPin));
}


/**
float Adafruit_GA1A12S202::rawToLux (int raw)
  converts analog reading to a lux value.
  
  @param int raw    the raw analog reading.
  
  @return float      The converted value.
*/
float Adafruit_GA1A12S202::rawToLux (int raw){
    float logLux = raw * logRange / rawRange;
    return pow(10, logLux);
}
