// includeds
#include <Wire.h>                  // i2c communication
#include "RTClib.h"                // real time clock
#include "daqImp.h"
#include "read_write.h"            // used to parse command and send resonds


#define period ICR1                  // rename period compare reg for tmr1 for take measure comd

//declar a daq
DataAqu daq;
//declare an experiment
Exp experiment; 
    
// command variables
boolean newCmd = false;                // flags a new command has been received
char command = 0;                      // holds the new command given
int port = 0;                          // holds the port number
int numMeasurs = 0;                    // holds the number of measuremnts ot be taken 




///////////////////////////////////////////////////////////////////////////////////////////
//**************************************** Setup ****************************************//
///////////////////////////////////////////////////////////////////////////////////////////


    
void setup () {
    Serial.begin(9600);                                           // beign serial coms
    Wire.begin();                                                 // begin i2c coms
    portSetup(&daq);
    sensorCheck(&daq);
    pinMode(DAQ_SQW, INPUT_PULLUP);
    startSquareWave(RTC_I2C_ADDRESS);
    timer1Setup();
    period = 2;
    daq.periodR = 2000;                    // init R commands period to 2 sconds eventually movedt o timer2
                                       // this will always be the same as period
}


///////////////////////////////////////////////////////////////////////////////////////////
//************************************* Main Loop ***************************************//
///////////////////////////////////////////////////////////////////////////////////////////

void loop(){
    if(experiment.isRunning){
        if (experiment.isEnd){
            experiment.isRunning = false;
            endExp();
        }
    }

    //on incoming serial read a new command
    if (Serial.available() > 0){
           newCmd = readNewCmd (&command, &port,  &numMeasurs);
           if(!newCmd || port > DAQ_MAXTEMPSENSORS ){
               //abort response
               respond(DAQ_ID,0);
               newCmd = false;
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
                acknowledgeActive (&daq, port);
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
                // this also need to be in miliseconds and dealy is in seconds.
                // delay overflows at 30 seconds i believe. 
                daq.periodR = numMeasurs * 1000;
                respond(DAQ_ID, 0, numMeasurs);
            break;
            case 'R':
                //todo: run comtinous measurment
                if (experiment.isRunning && numMeasurs != 1){
                    respond(DAQ_ID, 0);
                    break;
                }
                else{
                    continuousMeasurment(&daq, port, numMeasurs);
                }
            break;
            case 'M':
                if (port == 0){
                    startExp (&experiment, port, numMeasurs) ? respond (DAQ_ID, port, numMeasurs*period, numMeasurs) : respond (DAQ_ID, 0);
                }
                else if (daq.activePorts[port-1]){
                    startExp (&experiment, port, numMeasurs) ? respond (DAQ_ID, port, numMeasurs*period, numMeasurs) : respond (DAQ_ID, 0);
                }
                else{
                    respond(DAQ_ID, 0);
                }
            break;
            case 'D':
                if (experiment.ports != port || experiment.currentMeasurment == 0){
                    respond(DAQ_ID, 0);
                    break;
                }
                if (port == 0){
                    for(int i = 0; i < experiment.currentMeasurment; i++){
                        if (daq.activePorts[0]){
                            (i == (experiment.currentMeasurment-1) && (daq.lastPort == 0)) ? dataReport(DAQ_ID, 1, daq.timeStore[i]+experiment.startTime, daq.tempStore0[i], true) : dataReport(DAQ_ID, 1, daq.timeStore[i]+experiment.startTime, daq.tempStore0[i]);
                        }
                        if (daq.activePorts[1]){
                            (i == (experiment.currentMeasurment-1) && (daq.lastPort == 1)) ? dataReport(DAQ_ID, 2, daq.timeStore[i]+experiment.startTime, daq.tempStore1[i], true) : dataReport(DAQ_ID, 2, daq.timeStore[i]+experiment.startTime, daq.tempStore1[i]);
                        }
                        if (daq.activePorts[2]){
                            (i == (experiment.currentMeasurment-1) && (daq.lastPort == 2)) ? dataReport(DAQ_ID, 3, daq.timeStore[i]+experiment.startTime, daq.tempStore2[i], true) : dataReport(DAQ_ID, 3, daq.timeStore[i]+experiment.startTime, daq.tempStore2[i]);
                        }
                    }
                }
                else{
                    if(!daq.activePorts[port-1]){
                        respond(DAQ_ID,0);
                        break;
                    }
                    else{
                        for(int i = 0; i < experiment.currentMeasurment; i++){
                            i == (experiment.currentMeasurment-1) ? dataReport(DAQ_ID, 1, daq.timeStore[i]+experiment.startTime, daq.tempStore0[i],true) : dataReport(DAQ_ID, 1, daq.timeStore[i]+experiment.startTime, daq.tempStore0[i]);
                        }
                    }
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
    if (daq.activePorts[0]){daq.tempStore0[experiment.currentMeasurment] = (*(daq.thermocouple[0])).readCelsius();}
    if (daq.activePorts[1]){daq.tempStore1[experiment.currentMeasurment] = (*(daq.thermocouple[1])).readCelsius();}
    if (daq.activePorts[2]){daq.tempStore2[experiment.currentMeasurment] = (*(daq.thermocouple[2])).readCelsius();}
    experiment.addTime += period;
    daq.timeStore[experiment.currentMeasurment] = experiment.addTime;
    experiment.currentMeasurment ++;
    
    
    // if that was the last measrument end the experiement
    if (experiment.currentMeasurment >= experiment.markMeasurment){
        experiment.isEnd = true;
        //todo: run end experiment
    }

}
    
    
    
    
