#include "Sensor.h"

//**********************Base Class functions*************************//
Sensor::Sensor (void){
    
}

boolean Sensor::isActive (void){
    return state;
}

void Sensor::setState (boolean newState){
    state = newState;
}


//*********************Temperature functions*************************//
SensorTemp::SensorTemp (Adafruit_MAX31855* sensorInit, boolean stateInit){
    sensor = sensorInit;
    setState(stateInit);
    setType(SENSOR_TYPE_A);
}

double SensorTemp::measureTemp(void){
    return (*sensor).readCelsius();
}

float SensorTemp::measureLight(void){
    return NULL;
}



//*************************Light functions****************************//
SensorLight::SensorLight (Adafruit_GA1A12S202* sensorInit, boolean stateInit){
    sensor = sensorInit;
    setState(stateInit);
    setType(SENSOR_TYPE_B);
}

double SensorLight::measureTemp(void){
    return NULL;
}
float SensorLight::measureLight(void){
    return (*sensor).readLux ();
}

