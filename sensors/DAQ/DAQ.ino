#include <Wire.h>
#include <avr/wdt.h>
#include "Port.h"
#include "Experiment.h"
#include "Memory.h"
#include "miniSDI_12.h"

//#include "RTClib.h"

Memory memory;
Port ports;
Experiment experiment;

//RTC_DS1307 RTC;

boolean newCmd;
char command;
uint8_t port;
uint32_t targetMeasurment;

void setup(){
    Serial.begin(9600);
    Wire.begin();
    memory.memorySetup();
    ports.portSetup(&memory);
    experiment.experimentSetup(&ports, &memory);
}

void loop(){
    if (Serial.available() > 0){
        newCmd = readNewCmd (&command, &port,  &targetMeasurment);
        if (!newCmd){
            respond(SDI_ABORT);
        }
    }
    if (newCmd){
        //Serial.println(RTC.now().unixtime());
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
        //Serial.println(RTC.now().unixtime());
    }
    newCmd = false;
}

ISR (EXPERIMENT_MEASURMENT){
    uint32_t time = experiment.updateCurrentPeriod();
    ports.savePortData(experiment.experimentBlock.port, time);
}
