#if (ARDUINO >= 100)
 #include "Arduino.h"
#else
 #include "WProgram.h"
#endif

#ifndef EXPERIMENT_H
#define EXPERIMENT_H
#include "Port.h"
#include "Memory.h"
#define EXPERIMENT_PERIOD ICR1
#define EXPERIMENT_MAX_PERIOD 65535
#define EXPERIMENT_MEASURMENT TIMER1_CAPT_vect
#define EXPERIMENT_RTC_I2C_ADDRESS 0x68
#define EXPERIMENT_CLOCK_PIN 5
//#define RTCset



class Experiment{
    public:
    //constructor and setup functions
    Experiment (void);
    void experimentSetup (Port* portsPtr, Memory* memPtr);
    //public varibles
    ExperimentBlock experimentBlock;
    //public functions
    void setPeriod (uint32_t newPeriod);
    uint32_t updateCurrentPeriod (void);
    void startR (uint8_t port, uint32_t targetMeasurment);
    void startM (uint8_t port, uint32_t targetMeasurment);
    void stopExperiment (void);
    
    private:
    uint32_t currentPeriod;
    Port* ports;
    Memory* memory;
    void recoverExperiment (void);
    void timerSetup (void);
    void startClock (void);
};

#endif
