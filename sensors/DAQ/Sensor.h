#if (ARDUINO >= 100)
 #include "Arduino.h"
#else
 #include "WProgram.h"
#endif

#ifndef SENSOR_H
#define SENSOR_H
#include "Adafruit_MAX31855.h"     // used to measure temperature
#include "TSL2561.h"
#include "Adafruit_GA1A12S202.h"
#define SENSOR_TYPE_A 1
#define SENSOR_RETURN_TYPE_A double
#define SENSOR_RETURN_TYPE_B float
#define SENSOR_TYPE_B 2

class Sensor{
  public:
    //constructor
    Sensor (void);
    //pure virtual functions to be define in child classes
    virtual double measureTemp (void) = 0;
    virtual float measureLight (void) = 0;
    virtual uint8_t getError(void) = 0;
    //member functions needed in each child class
    //getter
    boolean isActive (void);
    int getType (void){return type;};

    //setter
    void setState (boolean newState);
    void setType (int newType){type = newType;};
  private:
    boolean state;
    int type;
};

class SensorTemp: public Sensor {
  public:
    //constructor
    SensorTemp (Adafruit_MAX31855* sensorInit, boolean stateInit);
    //member functions
    double measureTemp (void);
    float measureLight (void);
    uint8_t getError(void);
  private:
    Adafruit_MAX31855* sensor;
};

class SensorLight: public Sensor{
  public:
    //constructor
    SensorLight (Adafruit_GA1A12S202* sensorInit, boolean stateInit);
    //member functions
    double measureTemp (void);
    float measureLight (void);
    uint8_t getError(void);
  private:
    Adafruit_GA1A12S202* sensor;
};


#endif
