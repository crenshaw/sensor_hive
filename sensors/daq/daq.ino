// includeds
#include <Wire.h>                  // i2c communication
#include "RTClib.h"                // real time clock
#include "daqImp.h"
#include "read_write.h"            // used to parse command and send resonds


#define period ICR1                  // rename period compare reg for tmr1 for take measure comd

// global variables
//declare real time clock
RTC_DS1307 RTC;

//declare each temperature sensor
Adafruit_MAX31855 thermocouple[DAQ_MAXTEMPSENSORS] = 
   {Adafruit_MAX31855(DAQ_DIGCLK, DAQ_TEMP1, DAQ_THERMBUS), 
    Adafruit_MAX31855(DAQ_DIGCLK, DAQ_TEMP2, DAQ_THERMBUS),
    Adafruit_MAX31855(DAQ_DIGCLK, DAQ_TEMP3, DAQ_THERMBUS)};
    
//declare an experiment
Exp experiment; 
    
// command variables
boolean newCmd = false;                // flags a new command has been received
char command = 0;                      // holds the new command given
int port = 0;                          // holds the port number
int numMeasurs = 0;                    // holds the number of measuremnts ot be taken 
int lastPort = 0;                      // holds the highest port currently beaing used on the daq


///////////////////////////////////////////////////////////////////////////////////////////
//**************************************** Setup ****************************************//
///////////////////////////////////////////////////////////////////////////////////////////


    
void setup () {
    Serial.begin(9600);                                           // beign serial coms
    Wire.begin();                                                 // begin i2c coms
    lastPort = sensorCheck(&thermocouple[0], DAQ_MAXTEMPSENSORS);     // runs sensor check function
    RTC.begin();                                                  // turn on rtc
    pinMode(DAQ_SQW, INPUT_PULLUP);                                   // gets pin 5 ready to receive saq output
                                                                  //      needs to be inout_pullup as rtc sqw requires pullup resistor
    startSquareWave (RTC_I2C_ADDRESS);                            // starts 1hz sqare wave output from rtc
    period = 2;                                                   // defaults measure cmd period to two second
    timer1Setup();                                                // setup timer1
    
}


///////////////////////////////////////////////////////////////////////////////////////////
//************************************* Main Loop ***************************************//
///////////////////////////////////////////////////////////////////////////////////////////

void loop(){
  if (experiment.newMeasure){
      storeData (&thermocouple[0], &experiment);
      experiment.newMeasure = false;
  }
  if (experiment.isEnd){
      endExp();
  }
  
  // on incoming serial read a new command
  if (Serial.available() > 0){
         newCmd = readNewCmd (&command, &port,  &numMeasurs);
         if(!newCmd){
             //abort response
             respond(DAQ_ID,0);
         }
  }
  //check if a break command  
  if (newCmd && command == -1 && port == -1 && numMeasurs == -1){
      experiment.isRunning = false;                //removes experiemnt flag
      endExp();                                    // turns off timers
      respond(DAQ_ID,0);
      newCmd = false;
  }
  
  // process new command
  if (newCmd){
      switch (command){
          case 0:
              // note: the way parse comand is currently running 
              // if only one number is return it is returned in numMeasusres
              //todo: fix this
              acknowledgeActive (&thermocouple[0], numMeasurs);
              //todo:wirte funciton for different sensor types
              break;
          case 'P':
              period = numMeasurs;
              respond(DAQ_ID, 0, numMeasurs);
              //periodSet (numMeasurs);
              break;
          case 'R':
              //todo: run comtinous measurment
              break;
          case 'M':
              startExp (&experiment, port, numMeasurs) ? respond (DAQ_ID, port, numMeasurs*period, numMeasurs) : respond (DAQ_ID, 0);
              break;
          case 'D':
              //todo: run send data
              break;
          default:
              respond(DAQ_ID, 0);
      }
  }
    //done processing commmand set flag to false
    newCmd = false;
}



///////////////////////////////////////////////////////////////////////////////////////////
//***************************************** ISR *****************************************//
///////////////////////////////////////////////////////////////////////////////////////////


// inturrupt service routines
ISR (TAKEMASURE){
    // increment current experiement
    experiment.currentMeasurment ++;
    // read measurments
    for (int i = 0; i < DAQ_MAXTEMPSENSORS; i++){
        if (thermocouple[i].isUsed()){
            thermocouple[i].readCelsius();
        }
    }
    //update time of measurement
    experiment.time += period;
    experiment.newMeasure = true;
    // if that was the last measrument end the experiement
    if (experiment.currentMeasurment >= experiment.markMeasurment){
        experiment.isRunning = false;
        experiment.isEnd = true;
        //todo: run end experiment
    }

}
    
    
    
    
