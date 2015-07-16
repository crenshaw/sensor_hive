/**
Sensors.cpp

Implements functions avalible to interact with sensors on DAQ.

@author: Zak Pearson
@since: January 2015
**/
#include "Sensor.h"

//**********************Base Class functions*************************//
/**
Sensor::Sensor (void)
  constructor for sensor class
@param void
@return
**/
Sensor::Sensor (void){
    
}

/**
boolean Sensor::isActive (void)
  Returns current state of sensor. Either active or not active.
@param void
@return boolean
  The current state of the sensor
**/
boolean Sensor::isActive (void){
    return state;
}

/**
void Sensor::setState (boolean)
  Sets current state of sensor to active or not active.
@param boolean newState
  The new sate of the sensor
@return void
**/
void Sensor::setState (boolean newState){
    state = newState;
}


//*********************Temperature functions*************************//
/**
SensorTemp::SensorTemp (Adafruit_MAX31855*, boolean)
  Constructor for SensorTemp class. Sets sensor type to type A 
@param Adafruit_MAX31855*
  A pointer to an Adafruit_MAX31855 object
@param boolean
  The initial state of the sensor
@return
**/
SensorTemp::SensorTemp (Adafruit_MAX31855* sensorInit, boolean stateInit){
    sensor = sensorInit;
    setState(stateInit);
    setType(SENSOR_TYPE_A);
}

/**
double SensorTemp::measureTemp (void)
  Takes a temperature reading from an Adafruit_MAX31855 object
@param void
@return double
  Returns the temperature in degrees celsius
**/
double SensorTemp::measureTemp(void){
    return (*sensor).readCelsius();
}

/**
float SensorTemp::measureLight (void)
  Because this is a virtual function it needs to be defined. It has no function in the SensorTemp class.
@param void
@return float
  Returns null
**/
float SensorTemp::measureLight(void){
    return NULL;
}

/**
uint8_t SensorTemp::getError (void)
  Reads the error code from an Adafruit_MAX31855 object.
@param void
@return uint8_t
  Returns 8 bits with error code in the bottom three bits.
  000 if everything is fine
  001 if open connection
  010 if shorted to ground
  100 if shorted to vcc
**/
uint8_t SensorTemp::getError(void){
    return (*sensor).readError();
}



//*************************Light functions****************************//
/**
SensorTemp::SensorLight (Adafruit_GA1A12S202*, boolean)
  Constructor for SensorTemp class. Sets sensor type to type B
@param Adafruit_GA1A12S202*
  A pointer to an Adafruit_GA1A12S202 object
@param boolean
  The initial state of the sensor
@return
**/
SensorLight::SensorLight (Adafruit_GA1A12S202* sensorInit, boolean stateInit){
    sensor = sensorInit;
    setState(stateInit);
    setType(SENSOR_TYPE_B);
}

/**
float SensorLight::measureTemp (void)
  Because this is a virtual function it needs to be defined. It has no function in the SensorLight class.
@param void
@return double
  Returns null
**/
double SensorLight::measureTemp(void){
    return NULL;
}

/**
double SensorLight::measureLight (void)
  Takes a light intensity reading from an Adafruit_GA1A12S202 object
@param void
@return float
  Returns the current light intensity in lumens
**/
float SensorLight::measureLight(void){
    return (*sensor).readLux ();
}

/**
uint8_t SensorLight::getError (void)
  Reads the error code from an Adafruit_GA1A12S202 object.
@param void
@return uint8_t
  Returns an 8 bit error code. Currently there are no readable errors associated with this sensor
  returns 0.
**/
uint8_t SensorLight::getError(void){
    return 0;
}

