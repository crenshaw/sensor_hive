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

/**
Class: Experiment
    The Experiment class manages the current experiment that is running on the DAQ. It updates the 
    experiment block anytime there is a change in experiment parameters. Manages when an experiment 
    can start, when the period can be changed, and when an experiment should end.
Constructor: 
    Experiment (void)
      poscondition: Experiment object created on the heap.
Public Variables:
    ExperimentBlock experimentBlock
      The parameters for the currently running experiment.
Public Methods:
    void experimentSetup (Port* portsPtr, Memory* memPtr)
      precondition: an experiment object has been declared.
      postcondition: a pointer to memory is stored in the varible memory. 
        a pointer to ports is stored in the varibale ports.
    void setPeriod (uint32_t newPeriod)
      precondition: an experiment is not currently running.
      postcondition: The period has been set to the newPeriod.
    uint32_t updateCurrentPeriod (void)
      postcondition: the current period is incremented by 1
    void startR (uint8_t port, uint32_t targetMeasurment)
      precondition: if an m-experiment is running targetMeasurment must be 1.
      postcondition: the daq is running an R-experiment.
    void startM (uint8_t port, uint32_t targetMeasurment)
      precondition: an m-experiment or an r-experiment is not currently running. 
      postcondition: the daq is running an M-experiment and experiment parameters have been
        saved to the EEPROM
    void stopExperiment (void)
      postcondition: all experiments stopped.
Private Methods:
    void recoverExperiment (void)
      postcondition: Called on startup of DAQ. The last saved experiment block is loaded into
        the public variable ExperimentBlock.
    void timerSetup (void)
      postcondition: The configuration bits for the hardware timers have been properly set.
    void startClock (void)
      postcondition: The RTC has been intialized.
**/

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
