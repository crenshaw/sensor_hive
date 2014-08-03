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
int periodR = 2000;                    // init R commands period to 2 sconds
                                       // this will always be the same as period

double tempStore0 [15];               
double tempStore1 [15]; 
double tempStore2 [15]; 
int timeStore [15];



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
    if(experiment.isRunning){
        if (experiment.newMeasure){
            //storeData (&thermocouple[0], &experiment);
            experiment.newMeasure = false;
             
        }
        if (experiment.isEnd){
            experiment.isRunning = false;
            endExp();
        }
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
                if (experiment.isRunning || numMeasurs < 1){
                    respond(DAQ_ID , 0);
                    break;
                }
                period = numMeasurs;
                // setting another period specifically for continous measurment
                // this makes sure the uC does not have to read from a 16 bit reg 
                // then do some math so the system can delay. bassically it speed up opperation
                // by only doing this read once.
                // this also need to be in miliseconds and dealy is in seconds.
                // delay overflows at 30 seconds i believe. 
                periodR = numMeasurs * 1000;
                respond(DAQ_ID, 0, numMeasurs);
                //periodSet (numMeasurs);
                break;
            case 'R':
                //todo: run comtinous measurment
                if (experiment.isRunning && numMeasurs != 1){
                    respond(DAQ_ID, 0);
                    break;
                }
                switch(port){
                    case 0:    //0
                        for (int j = 0; j < numMeasurs; j ++)
                        {
                            boolean noReport = true;
                            for (int i = 0; i < DAQ_MAXTEMPSENSORS; i++){
                                if (thermocouple[i].isUsed()){
                                    if (j == numMeasurs -1 && i == lastPort){
                                        dataReport(DAQ_ID, i+1, RTC.now().unixtime(), thermocouple[i].readCelsius(), true);
                                        noReport = false;
                                    }     
                                    else{
                                        dataReport(DAQ_ID, i+1, RTC.now().unixtime(), thermocouple[i].readCelsius());
                                        noReport = false;
                                    }
                                }
                            }
                            if(noReport){
                                respond(DAQ_ID , 0);
                            }
                            delay(periodR);
                        }
                        break;
                    case 1:    //1
                        for (int j = 0; j < numMeasurs; j ++)
                        {
                            if (j == numMeasurs -1){
                                dataReport(DAQ_ID, 1, RTC.now().unixtime(), thermocouple[0].readCelsius(), true);
                            }     
                            else{
                                dataReport(DAQ_ID, 1, RTC.now().unixtime(), thermocouple[0].readCelsius());
                            }
                            delay(periodR);
                        }
                        
                        break;  //2
                    case 2:
                        for (int j = 0; j < numMeasurs; j ++)
                        {
                            if (j == numMeasurs -1){
                                dataReport(DAQ_ID, 2, RTC.now().unixtime(), thermocouple[1].readCelsius(), true);
                            }     
                            else{
                                dataReport(DAQ_ID, 2, RTC.now().unixtime(), thermocouple[1].readCelsius());
                            }
                            delay(periodR);
                        }
                        
                        break;
                    case 3:    //3
                        for (int j = 0; j < numMeasurs; j ++)
                        {
                            if (j == numMeasurs -1){
                                dataReport(DAQ_ID, 3,RTC.now().unixtime(), thermocouple[2].readCelsius(), true);
                            }     
                            else{
                                dataReport(DAQ_ID, 3,RTC.now().unixtime(), thermocouple[2].readCelsius());
                            }
                            delay(periodR);
                        }
                        
                        break;
                    default:
                        respond(DAQ_ID,0);
                }
                break;
            case 'M':
                startExp (&experiment, port, numMeasurs) ? respond (DAQ_ID, port, numMeasurs*period, numMeasurs) : respond (DAQ_ID, 0);
                break;
            case 'D':
                if (experiment.ports != port || experiment.currentMeasurment == 0){
                    respond(DAQ_ID,0);
                    break;
                }
                switch(port){
                    case 0:
                        //todo: check against experiment.ports
                        for(int i = 0; i < experiment.currentMeasurment; i++){
                            if (thermocouple[0].isUsed()){
                                dataReport(DAQ_ID, 1, timeStore[i]+experiment.startTime, tempStore0[i]);
                            }
                            if (thermocouple[1].isUsed()){
                                dataReport(DAQ_ID, 2, timeStore[i]+experiment.startTime, tempStore1[i]);
                            }
                            if (thermocouple[2].isUsed()){
                                dataReport(DAQ_ID, 3, timeStore[i]+experiment.startTime, tempStore2[i]);
                            }
                        }
                        break;
                    case 1:
                        //todo: check against experiment.ports
                        if (thermocouple[0].isUsed()){
                            for(int i = 0; i < experiment.currentMeasurment; i++){
                                dataReport(DAQ_ID, 1, timeStore[i]+experiment.startTime, tempStore0[i]);
                            }
                        }
                        else{
                          respond(DAQ_ID,0);
                        }
                        break;
                    case 2:
                        //todo: check against experiment.ports
                        if (thermocouple[1].isUsed()){
                          for(int i = 0; i < experiment.currentMeasurment; i++){
                              dataReport(DAQ_ID, 2, timeStore[i]+experiment.startTime, tempStore0[i]);
                          }
                        }
                        else{
                          respond(DAQ_ID,0);
                        }
                        break;
                    case 3:
                        //todo: check against experiment.ports
                        if (thermocouple[2].isUsed()){
                            for(int i = 0; i < experiment.currentMeasurment; i++){
                                dataReport(DAQ_ID, 3, timeStore[i]+experiment.startTime, tempStore0[i]);
                            }
                        }
                        else{
                          respond(DAQ_ID,0);
                        }
                        break;
                    default:
                        respond(DAQ_ID, 0);
                }
                break;
            default:
                respond(DAQ_ID, 0);
        }
    //done processing commmand set flag to false
    newCmd = false;
    }
}



///////////////////////////////////////////////////////////////////////////////////////////
//***************************************** ISR *****************************************//
///////////////////////////////////////////////////////////////////////////////////////////


// inturrupt service routines
ISR (TAKEMASURE){
    // increment current experiement
    // read measurments
//    for (int i = 0; i < DAQ_MAXTEMPSENSORS; i++){
//        if (thermocouple[i].isUsed()){
//            thermocouple[i].readCelsius();
//        }
//    }
    experiment.addTime += period;
    tempStore0[experiment.currentMeasurment] = thermocouple[0].readCelsius(); 
    tempStore1[experiment.currentMeasurment] = thermocouple[1].readCelsius(); 
    tempStore2[experiment.currentMeasurment] = thermocouple[2].readCelsius(); 
    timeStore[experiment.currentMeasurment] = experiment.addTime;
    experiment.currentMeasurment ++;
    //update time of measurement
    experiment.newMeasure = true;
    // if that was the last measrument end the experiement
    if (experiment.currentMeasurment >= experiment.markMeasurment){
        experiment.isEnd = true;
        //todo: run end experiment
    }

}
    
    
    
    
