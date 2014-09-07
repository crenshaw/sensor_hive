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
    #define RTC_I2C_ADDRESS 0x68              // RTC i2c Adress
    #define DAQ_SQW 5                         // sqw pinput on pin 5 of arduino board
    //inturrupts
    #define TAKEMASURE TIMER1_CAPT_vect    // renames the inturupt vector
    
    #define DAQ_HEAD_OFFSET  14
    #define DAQ_DATA_OFFSET 7
    // THE MOD NUMBER IS 980 THEN ADD OFFSET TO IT (14) CAN HOLD 140 MEASURMENTS.
    #define DAQ_DATA_MAX  144
    
    
    #define Period ICR1                  // rename period compare reg for tmr1 for take measure comd
    
//debug
//#define RTCset                     // Sets the RTC with complie time
//#define DEBUG_sensorCheck
//#define BEBUG_sqw
//#define DEBUG_startExp




// daq struct
typedef struct DataAqu_TAG{
    //Real time clock
    RTC_DS1307 RTC;
    
    Adafruit_MAX31855* thermocouple [DAQ_MAXTEMPSENSORS];
    boolean activePorts [DAQ_MAXTEMPSENSORS];
    int numberActive;
    int lastPort;
    int period;
    unsigned long periodR;
}DataAqu;

//this struck is 14 bytes
typedef struct DataHead_TAG{
    boolean isRunning;            // 1 byte
    uint8_t port;                 // 1 byte
    unsigned int headPtr;         // 2 bytes
    unsigned int tailPtr;         // 2 bytes
    unsigned long startTime;      // 4 bytes
    unsigned int periodLgth;      // 2 bytes
    unsigned int numMeasurments;  // 2 bytes
}DataHead;

// experiment struct
typedef struct Exp_TAG{
    int currentMeasurment;
    DataHead dataHead;
}Exp;


//this struck is 7 bytes in size
typedef struct Data_TAG{
    unsigned int periodNum;        //2 bytes
    uint8_t port;                  //1 byte
    double data;                   //4 bytes
}Data;


// function headers
//setup functions
void portSetup(DataAqu* daq);
void sensorCheck (DataAqu* daq);
void startSquareWave (void);
void timer1Setup (void);
boolean expRecover (Exp* exps);


// command functions
boolean isBreak (char* cmd, int* port, int* numMeas);
void acknowledgeActive (DataAqu* daq, int port);
void setPeriod (DataAqu* daq, int periodLength);
void continuousMeasurment (DataAqu* daq, int port, int numMeasures);
boolean startExp (Exp* experiment, int prt, int numMeasures);
void storeData (Exp* exps, Data* data);
void sendData (int numMeasures);
void endExp (Exp* exps);

#endif
