#include "Port.h"
#include "miniSDI_12.h"

Port::Port (void){
    //temperature sensor declarations
    Adafruit_MAX31855* tempPtr;
    //temperature sensor 1
    tempPtr = new Adafruit_MAX31855(PORT_CLOCK, PORT_TEMP1, PORT_DATA_BUS);
    ports[0] = new SensorTemp(tempPtr, false);
    //temperature sensor 2
    tempPtr = new Adafruit_MAX31855(PORT_CLOCK, PORT_TEMP2, PORT_DATA_BUS);
    ports[1] = new SensorTemp(tempPtr, false);
    //temperature sensor 3
    tempPtr = new Adafruit_MAX31855(PORT_CLOCK, PORT_TEMP3, PORT_DATA_BUS);
    ports[2] = new SensorTemp(tempPtr, false);
    //temperature sensor 4
    tempPtr = new Adafruit_MAX31855(PORT_CLOCK, PORT_TEMP4, PORT_DATA_BUS);
    ports[3] = new SensorTemp(tempPtr, false);
    //temperature sensor 5
    tempPtr = new Adafruit_MAX31855(PORT_CLOCK, PORT_TEMP5, PORT_DATA_BUS);
    ports[4] = new SensorTemp(tempPtr, false);
    
    //light sensor declarations
    Adafruit_GA1A12S202* lightPtr;
    //light sensor 1
    lightPtr = new Adafruit_GA1A12S202 (PORT_LIGHT1);
    ports[5] = new SensorLight(lightPtr, false);
}

boolean Port::isActive (uint8_t portAddress){
    if (portAddress > 0 && portAddress <= PORT_MAX && (*ports[portAddress-1]).isActive()){
        return true;
    }
    else{
        return false;
    }
}

void Port::sendPortData (uint8_t portAddress){
    if (portAddress == 0){
        sendAll();
    }
    else if (portAddress > PORT_MAX || portAddress < 0 || !(*ports[portAddress-1]).isActive()){
        respond(0);
    }
    else if ((*ports[portAddress-1]).isActive()){
        if ((*ports[portAddress-1]).getType() == SENSOR_TYPE_A){
            dataReport(portAddress, RTC.now().unixtime(), (*ports[portAddress-1]).measureTemp());
        }
        else if ((*ports[portAddress-1]).getType() == SENSOR_TYPE_B){
            dataReport(portAddress, RTC.now().unixtime(), (*ports[portAddress-1]).measureLight());
        }
        else{
            respond(0);
        }
    }
}

void Port::savePortData (uint8_t portAddress, uint32_t currentPeriod){
    if (portAddress < 0 || portAddress > PORT_MAX){
        respond(ABORT);
    }
    else if (portAddress == 0){
        saveAll(currentPeriod);
    }
    else {
        DataBlock newData;
        newData.port = portAddress;
        newData.periodNumber = currentPeriod;
        if ((*ports[portAddress -1]).getType() == SENSOR_TYPE_A){
            SENSOR_RETURN_TYPE_A temp = (*ports[portAddress -1]).measureTemp();
            newData.data = *(reinterpret_cast <uint32_t*> (&temp));
        }
        else if ((*ports[portAddress -1]).getType() == SENSOR_TYPE_B){
            SENSOR_RETURN_TYPE_B temp = (*ports[portAddress -1]).measureLight();
            newData.data = *(reinterpret_cast <uint32_t*> (&temp));
        }
        (*memory).saveDataBlock(newData);
    }
}

void Port::sendSavedData (uint16_t amount){
    ExperimentBlock experiment;
    DataBlock dataBlock;
    (*memory).loadExperimentBlock(&experiment);
    
    uint16_t sentBlocks = 1;
    
    uint16_t currentBlock = (*memory).memoryBlock.headPtr;
    boolean finished = ((*memory).loadDataBlock(&currentBlock, &dataBlock));
    if (finished){
        respond(ABORT);
    }
    while (!finished){
        uint32_t Time = experiment.startTime + dataBlock.periodNumber* experiment.periodLgth;
        uint8_t port = dataBlock.port;
        //recovering stored data type
        if ((*ports[port-1]).getType() == SENSOR_TYPE_A){
            SENSOR_RETURN_TYPE_A data = *(reinterpret_cast <SENSOR_RETURN_TYPE_A*> (&dataBlock.data));
            dataReport(port, Time, data);
        }
        else if ((*ports[port-1]).getType() == SENSOR_TYPE_B){
            SENSOR_RETURN_TYPE_B data = *(reinterpret_cast <SENSOR_RETURN_TYPE_B*> (&dataBlock.data));
            dataReport(port, Time, data);
        }
        finished = ((*memory).loadDataBlock(&currentBlock, &dataBlock));
        if (finished || sentBlocks == amount*activePorts){
            finished = true;
            terminate();
        }
        endLine();
        sentBlocks++;
    }
}


void Port::portSetup (Memory* memoryPtr){
    memory = memoryPtr;
    activePorts = 0;
    for (uint8_t portAddress = 0; portAddress < PORT_MAX; portAddress++){
        if ((*ports[portAddress]).measureTemp() != NULL){
            (*ports[portAddress]).setState(true);
            lastPort = portAddress+1;
            activePorts++;
        }
        else if ((*ports[portAddress]).measureLight() != NULL){
            (*ports[portAddress]).setState(true);
            lastPort = portAddress+1;
            activePorts++;
        }
    }
}

void Port::sendAll (void){
    for (uint8_t portAddress = 1; portAddress <= PORT_MAX; portAddress++){
        if((*ports[portAddress-1]).isActive()){
            sendPortData (portAddress);
            if (portAddress != lastPort){
                endLine();
            }
        }
    }
}

void Port::saveAll (uint32_t currentPeriod){
    for (uint8_t portAddress = 1; portAddress <= PORT_MAX; portAddress++){
        if((*ports[portAddress-1]).isActive()){
            savePortData (portAddress, currentPeriod);
        }
    }
}






