/**
Sensors.h
Provides the class definitions for each sensor that is usable on the DAQ
@author: Zak Pearson
@since: January 2015
**/

#if (ARDUINO >= 100)
 #include "Arduino.h"
#else
 #include "WProgram.h"
#endif

#ifndef SENSOR_H
#define SENSOR_H

#include "Adafruit_MAX31855.h"       // temperature sensor class
#include "TSL2561.h"                 // RTC class
#include "Adafruit_GA1A12S202.h"     // Luminosity Class

// global constants for this class. All constants contributed to this class will begin with SENSOR_
#define SENSOR_TYPE_A 1
#define SENSOR_RETURN_TYPE_A double
#define SENSOR_TYPE_B 2
#define SENSOR_RETURN_TYPE_B float

/**
Class: Sensor
  A virtual class that provides the base functionality for any sensors 
  that will be implemented on the DAQ.This class should contain the functions
  that are common to all sensors as well as a virtual function for each individual sensor.
  The purpose of this classs is to be able to iterate over all sensors regardless of type.
  The state and type of the sensor are stored in the state and type variables. The type
  of sensor needs to be store to accomidate different return types.
Constructor: Sensor(void)
  Creates a sensor object
  Postcondition: state and type are undeclared. These will be declared in child classes.
Virtual Functions:
  virtual double measureTemp (void) = 0:
    virtual function that is define in the child class used to measure temperature.
  virtual float measureLight (void) = 0:
    virtual function that is define in the child class used to measure light intensity
  virtual uint8_t getError(void) = 0:
    virtual function this define in child class used to return any error codes specific to sensors
Getter Functions:
  boolean isActive (void):
    checks to see if a sensor is active returns true if it is
  int getType (void):
    returns the sensor type
Setter Functions:
  void setState (boolean newState):
    postcondition: state is set to newState
  void setType (int newType):
    postcondition: type is set to newType
**/
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

/**
Class: SensorTemp
  Inherits the Sensor class and provides functions for interacting with the Adafruit_MAX31855
  thermocouple and amplifier. 
Constructor: SensorTemp(Adafruit_MAX31855* sensorInit, boolean stateInit)
  Creates a SensorTemp object
  Postcondition: 
  Adafruit_MAX31855* sensor is set to sensorInit.
  boolean state is set to statInit
  type is set to SENSOR_TYPE_A
double measureTemp (void):
  returns temperature in degreese celcius
float measureLight (void):
  returns NULL
uint8_t getEffor(void):
  returns error code from Adafruit_MAX31855 temperature sensor
**/
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

/**
Class: SensorTemp
  Inherits the Sensor class and provides functions for interacting with the Adafruit_GA1A12S202
  luminosity sensor. 
Constructor: SensorTemp(Adafruit_GA1A12S202* sensorInit, boolean stateInit)
  Creates a SensorLight object
  Postcondition: 
  Adafruit_GA1A12S202* sensor is set to sensorInit.
  boolean state is set to statInit
  type is set to SENSOR_TYPE_B
double measureTemp (void):
  returns NULL
float measureLight (void):
  returns light intensity in lumens
uint8_t getEffor(void):
  returns 0
  provides the possiblity to reutrn error codes for sensor
**/
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
