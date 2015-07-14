#include "Adafruit_GA1A12S202.H"

Adafruit_GA1A12S202::Adafruit_GA1A12S202 (int8_t pin){
    sensorPin = pin;
    rawRange = 1024;
    logRange = 5.0;
    analogReference(EXTERNAL);
}

float Adafruit_GA1A12S202::readLux (void){
    return rawToLux (analogRead (sensorPin));
}

float Adafruit_GA1A12S202::rawToLux (int raw){
    float logLux = raw * logRange / rawRange;
    return pow(10, logLux);
}
