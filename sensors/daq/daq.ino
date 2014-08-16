// includeds
#include <Wire.h>                  // i2c communication
#include "RTClib.h"                // real time clock
//#include "EEPROMex.h"
#include "read_write.h"            // used to parse command and send resonds
#include "daqImp.h"




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
    portSetup(&daq);                                              // setup ports for daq hardware
    sensorCheck(&daq);                                            // setup ports for daq software
    startSquareWave();                                            // start RTC
    timer1Setup();                                                // setup timer1
    if(expRecover(&experiment)){
        Serial.println("recovering");
        TIFR1  |= (1 << ICF1);
        SREG |= (1 << 7);
        TIMSK1 |= (1 << ICIE1);
    }    // 
}


///////////////////////////////////////////////////////////////////////////////////////////
//************************************* Main Loop ***************************************//
///////////////////////////////////////////////////////////////////////////////////////////

void loop(){

//    //on incoming serial read a new command
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
        experiment.dataHead.isRunning = false;                         //removes experiemnt flag
        endExp(&experiment);                                                      // turns off timers
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
                if (experiment.dataHead.isRunning || numMeasurs < 1){
                    respond(DAQ_ID , 0);
                    break;
                }
                setPeriod (&daq, numMeasurs);
            break;
            case 'R':
                //todo: run comtinous measurment
                if (experiment.dataHead.isRunning && numMeasurs != 1){
                    respond(DAQ_ID, 0);
                    break;
                }
                else{
                    continuousMeasurment(&daq, port, numMeasurs);
                }
            break;
            case 'M':
                if (numMeasurs == 0){
                    respond(DAQ_ID, 0);
                    break;
                }
                if (port == 0){
                    startExp (&experiment, port, numMeasurs) ? respond (DAQ_ID, port, numMeasurs*daq.period, numMeasurs) : respond (DAQ_ID, 0);
                }
                else if (daq.activePorts[port-1]){
                    startExp (&experiment, port, numMeasurs) ? respond (DAQ_ID, port, numMeasurs*daq.period, numMeasurs) : respond (DAQ_ID, 0);
                }
                else{
                    respond(DAQ_ID, 0);
                }
            break;
            case 'D':
                if (experiment.dataHead.port != port || experiment.currentMeasurment == 0){
                    respond(DAQ_ID, 0);
                    break;
                }
                sendData( );
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
    experiment.currentMeasurment ++;
    if (experiment.dataHead.port == 0){
        double tempHold[DAQ_MAXTEMPSENSORS];
        for (int i = 0; i < DAQ_MAXTEMPSENSORS; i++){
            if (daq.activePorts[i]){tempHold[i] = (*(daq.thermocouple[i])).readCelsius();}
        }
        // I am breaking this up into two for loops so that the data reads happen as clsoe
        // to the inturrupt time as possible since writing to eerpom takes mroe time
        // I will also write to EEPROM now since global intruupts are already disabled.
        for (int i = 0; i < DAQ_MAXTEMPSENSORS; i++){
          if (daq.activePorts[i]){
              Data data;
              data.port = i+1;
              data.periodNum = experiment.currentMeasurment;
              data.data = tempHold[i];
              storeData(&experiment, &data);
          }
        }
    }
    else{
        Data data;
        data.data = (*(daq.thermocouple[experiment.dataHead.port-1])).readCelsius();
        data.port = experiment.dataHead.port;
        data.periodNum = experiment.currentMeasurment;
        storeData(&experiment, &data);
      
    }
    // if that was the last measrument end the experiement
    if (experiment.currentMeasurment >= experiment.dataHead.numMeasurments){
        endExp(&experiment);
    }

}
    
    
    
    
