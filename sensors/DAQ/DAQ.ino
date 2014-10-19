#include <Wire.h>
#include "Port.h"
#include "Experiment.h"
#include "Memory.h"
#include "miniSDI_12.h"

Memory memory;
Port ports;
Experiment experiment;

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
            respond(ABORT);
        }
    }
    if (newCmd){
        switch (command){
            case 0:
                ports.isActive (port) ? respond(port) : respond (ABORT);
            break;
            case 'B':
                experiment.stopExperiment();
                respond(ABORT);
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
              respond(ABORT);
        }
    }
    newCmd = false;
}

ISR (EXPERIMENT_MEASURMENT){
    ports.savePortData(experiment.experimentBlock.port, experiment.updateCurrentPeriod());
}
