/**
Port.cpp
  Implementation for the Ports class.
@author: Zak Pearson
@since: January 2015
**/
#include "Port.h"
#include "miniSDI_12.h"

/**
Port::Port (void)
  Constructor for port objects. Declares all sensor objects on the heap and stores a pointer to each
  object in the array ports.
@param void
@return
**/
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

/**
void Port::portSetup (Memory* memoryPtr)
  Marks which ports are active and saves the total number of active ports. Since port addresses start
  at one, per miniSDI_12, there is a one number offset between a ports address and its index in the
  Sensor array.
Known Bug:
  There is an issue with correctly reading the error code from the Adafruit_MAX31855 class. 
  some sensors return the correct error code and some do now. Not sure why this happens. DAQ
  works fine with all ports active.
@param Memory* memoryPtr
  Takes a pointer to a memory object and saves it in the memory variable.
@return void
**/
//TODO: change this function so that it properly activates ports.
void Port::portSetup (Memory* memoryPtr){
    memory = memoryPtr;
    activePorts = 0;
    for (uint8_t portAddress = 0; portAddress < PORT_MAX; portAddress++){
        // if read error returns the following errors
        //000 if everything is fine
        //001 if open connection
        //010 if shorted to ground
        //100 if shorted to vcc
        if ((*ports[portAddress]).getType() == SENSOR_TYPE_A && (*ports[portAddress]).getError() == 0){
            if ((*ports[portAddress]).measureTemp() != 0){
                (*ports[portAddress]).setState(true);
                lastPort = portAddress+1;
                activePorts++;
            }
        }
        else if ((*ports[portAddress]).getType() == SENSOR_TYPE_B && (*ports[portAddress]).getError() ==0){
            (*ports[portAddress]).setState(true);
            lastPort = portAddress+1;
            activePorts++;
        }
    }
}

/**
boolean Port::isActive (uint8_t portAddress)
  Used to tell weather a portAddress is active
@param uint8_t portAddress
  portAddress must be a valid port address between 0 and PORT_MAX.
@return boolean
  True if the port at portAddress is active
  False otherwise
**/
boolean Port::isActive (uint8_t portAddress){
    if (portAddress > 0 && portAddress <= PORT_MAX && (*ports[portAddress-1]).isActive()){
        return true;
    }
    else{
        return false;
    }
}

/**
void Port::sendPortData (uint8_t portAddress)
  Sends port data to SCIO app via miniSDI_12 protocol.
@param uint8_t portAddress
  portAddress must be a valid port address between 0 and PORT_MAX.Since port addresses start at 1
  there is an offset of 1 between array position and port address.
@return void
**/
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

/**
void Port::savePortData (uint8_t portAddress, uint32_t currentPeriod)
  Formats and saves sensor data to EEPROM
@param uint8_t portAddress
  portAddress must be a valid port address between 0 and PORT_MAX.Since port addresses start at 1
  there is an offset of 1 between array position and port address.
@param uint32_t currentPeriod
  The current period of the experiemnt.
@return void
**/
void Port::savePortData (uint8_t portAddress, uint32_t currentPeriod){
    //checking boundry conditions
    if (portAddress < 0 || portAddress > PORT_MAX){
        respond(SDI_ABORT);
    }
    //if portAddress is 0 save data from all ports
    else if (portAddress == 0){
        saveAll(currentPeriod);
    }
    else {
        //create a data block to formate and store data in EEPROM
        DataBlock newData;
        newData.port = portAddress;
        newData.periodNumber = currentPeriod;
        //need to switch on sensor type to take the correct measurment.
        if ((*ports[portAddress -1]).getType() == SENSOR_TYPE_A){
            SENSOR_RETURN_TYPE_A temp = (*ports[portAddress -1]).measureTemp();
            newData.data = *(reinterpret_cast <uint32_t*> (&temp));
        }
        else if ((*ports[portAddress -1]).getType() == SENSOR_TYPE_B){
            SENSOR_RETURN_TYPE_B temp = (*ports[portAddress -1]).measureLight();
            newData.data = *(reinterpret_cast <uint32_t*> (&temp));
        }
        //save block to memory
        (*memory).saveDataBlock(newData);
    }
}

/**
void Port::sendSavedData (uint16_t amount)
  Reads sensor data from EEPROM and sends to SCIO app
@param uint8_t amount
  The number of previous measurments to be sent to the scio application. If there are no 
  measurments stored on the EEPROM and ABORT response is sent. If the requested amount is greater
  than the number of measurments stored on the EEPROM all data is sent.
@return void
**/
void Port::sendSavedData (uint16_t amount){
    //create information block to store data once it is read from memory
    ExperimentBlock experiment;
    DataBlock dataBlock;
    //load experiement parameters from memory.
    (*memory).loadExperimentBlock(&experiment);
    //get memory pointers
    uint16_t ptr = (*memory).getPtr(amount*activePorts);
    uint16_t tail = (*memory).tail();
    //check if there is no sensor information
    if (ptr == (*memory).tail()){
        respond(SDI_ABORT);
    }
    //itterate through in time forwards order
    for (ptr ;  ptr != tail; (*memory).updatePtr(&ptr)){
        //load current data block
        (*memory).loadDataBlock(ptr, &dataBlock);
        //recover time measurment was taken.
        uint32_t Time = experiment.startTime + dataBlock.periodNumber* experiment.periodLgth;
        //recover port address
        uint8_t port = dataBlock.port;
        //recovering stored data type
        if ((*ports[port-1]).getType() == SENSOR_TYPE_A){
            SENSOR_RETURN_TYPE_A data = *(reinterpret_cast <SENSOR_RETURN_TYPE_A*> (&dataBlock.data));
            //send data report with correclty formateed sensor data
            dataReport(port, Time, data);
        }
        else if ((*ports[port-1]).getType() == SENSOR_TYPE_B){
            SENSOR_RETURN_TYPE_B data = *(reinterpret_cast <SENSOR_RETURN_TYPE_B*> (&dataBlock.data));
            //semd data report with correctly formated sensor data
            dataReport(port, Time, data);
        }
        //send terminator
        if (ptr == tail-1){
            terminate();
        }
        //send endline
        endLine();
    }
}



/**
void Port::sendAll (void)
  Sends sensor data from each active port.
@param void
@return void
**/
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

/**
void Port::saveAll (uint32_t currentPeriod)
  Saves all active port data to memroy.
@param uint32_t currentPeriod
  The current period of the running experiment.
@return void
**/
void Port::saveAll (uint32_t currentPeriod){
    for (uint8_t portAddress = 1; portAddress <= PORT_MAX; portAddress++){
        if((*ports[portAddress-1]).isActive()){
            savePortData (portAddress, currentPeriod);
        }
    }
}






