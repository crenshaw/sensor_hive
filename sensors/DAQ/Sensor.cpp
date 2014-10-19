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

uint32_t SensorTemp::measureLight(void){
    return NULL;
}



//*************************Light functions****************************//
SensorLight::SensorLight (TSL2561* sensorInit, boolean stateInit){
    sensor = sensorInit;
    setState(stateInit);
    setType(SENSOR_TYPE_B);
}

double SensorLight::measureTemp(void){
    return NULL;
}
uint32_t SensorLight::measureLight(void){
    return (*sensor).getFullLuminosity ();
}

