/**
daqImp.h

Provides all of the startup functinos nessesary for programming a daq
Provides the commands functions for the following commands:

Abort Response. iii,a<CR><LF>.
Ackowledge Active. a!;iii,a<CR><LF>.
Break. ____!;iii,0<CR><LF>.
Configure Period. 0Pn!;iii,0,n<CR><LF>.
Continuous Measurement. aRn!;iii,a,<time>,<values>:<CR><LF>.
Start Measurement. aMn!;iii,a,ttt,n<CR><LF>.
Send Data. aD0!;iii,a,<time>,<values>:<CR><LF>.

Provides the memory, power, and sleep management functions - yet to be implemented
@author Zak Pearson
@since August 2014

**/




#if (ARDUINO >= 100)
 #include "Arduino.h"
#else
 #include "WProgram.h"
#endif

#ifndef DAQIMP_H
#define DAQIMP_H
#include "Adafruit_MAX31855.h"     // used to measure temperature

//constants
    // Daq DAQ_ID
    #define DAQ_ID 2              
    // Serial Coms Sensors
    #define DAQ_DIGCLK  3                     // Digital Clk output pin 3
    #define DAQ_THERMBUS  4                   // Thermal data Databus digital input pin 4
    #define DAQ_MAXTEMPSENSORS  3             // maximum number of temperature sensors that can be used.
    #define DAQ_TEMP1  6                      // Temp sensor 1 select digital output pin 5
    #define DAQ_TEMP2  7                      // Temp sensor 2 select digital output pin 6
    #define DAQ_TEMP3  8                      // Temp sensor 3 select digital output pin 7
    // Real Time Clock defenitiosn
    #define RTC_I2C_ADDRESS 0x68          // RTC i2c Adress
    #define DAQ_SQW 5                         // sqw pinput on pin 5 of arduino board
    
    
    //inturrupts
    #define TAKEMASURE TIMER1_CAPT_vect    // renames the inturupt vector
    
//debug
//#define RTCset                     // Sets the RTC with complie time
//#define DEBUG_sensorCheck
//#define BEBUG_sqw
//#define DEBUG_startExp


// experiment struct
typedef struct{
    boolean isRunning;
    int ports;
    uint32_t time;
    int currentMeasurment;
    int markMeasurment;
    boolean newMeasure;
    boolean isEnd;
}Exp;

// function headers
//setup functions
void startSquareWave (int address);
void timer1Setup (void);
int sensorCheck (Adafruit_MAX31855* thermocouple, int maxTempSensors);

// command functions
boolean isBreak (char* cmd, int* port, int* numMeas);
void acknowledgeActive (Adafruit_MAX31855* thermocouple, int port);
boolean startExp (Exp* experiment, int prt, int numMeasures);
void storeData (Adafruit_MAX31855* thermocouple, Exp* experiments);
void endExp (void);


#endif
