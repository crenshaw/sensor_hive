#include <Wire.h>
#include <avr/wdt.h>
#include "Port.h"
#include "Experiment.h"
#include "Memory.h"
#include "miniSDI_12.h"

//#include "RTClib.h"

Memory memory;            //the memory class to manager EEPROM
Port ports;               //the porst class to manage current sensors
Experiment experiment;    //the experiment class to manage experiments

//RTC_DS1307 RTC;

boolean newCmd;              //new command flag
char command;                //command received from master
uint8_t port;                //desired port
uint32_t targetMeasurment;   //desired number of measurmnets.

void setup(){
    Serial.begin(9600);                            //baud rate
    Wire.begin();                                  //I2C coms
    memory.memorySetup();                          //init memory
    ports.portSetup(&memory);                      //init ports
    experiment.experimentSetup(&ports, &memory);   //init experiment
}

void loop(){
    //if serial command waiting to be recieved read it.
    if (Serial.available() > 0){
        //pars recieved command
        newCmd = readNewCmd (&command, &port,  &targetMeasurment);
        //bad command received send abort.
        if (!newCmd){
            respond(SDI_ABORT);
        }
    }
    if (newCmd){
        //switch to proper command
        switch (command){
            case 0:
                ports.isActive (port) ? respond(port) : respond (SDI_ABORT);
            break;
            case 'B':
                experiment.stopExperiment();
                respond(SDI_ABORT);
            break;
            case 'P':
                experiment.setPeriod (targetMeasurment);
            break;
            case 'R':
                experiment.startR (port, targetMeasurment);
            break;
            case 'M':
                experiment.startM (port, targetMeasurment);
            break;
            case 'D':
                ports.sendSavedData (targetMeasurment);
            break;
            default:
              respond(SDI_ABORT);
        }
    }
    //command processes no new command. wait for next command.
    newCmd = false;
}

//inturrupt service routine
//called on overflow of IRC1 or when experiment period has finished
ISR (EXPERIMENT_MEASURMENT){
    uint32_t time = experiment.updateCurrentPeriod();            //get the current period
    ports.savePortData(experiment.experimentBlock.port, time);   //read and save port data.
}
