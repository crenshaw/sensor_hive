/**
Port.h
  Class definiton for the Ports class.
@author: Zak Pearson
@since: January 2015
**/
#if (ARDUINO >= 100)
 #include "Arduino.h"
#else
 #include "WProgram.h"
#endif

#ifndef PORT_H
#define PORT_H
#include <Wire.h>
#include "RTClib.h"
#include "Sensor.h"
#include "Memory.h"
// max ports avalibale
#define PORT_MAX 6
// global constants for this class. All constants contributed to this class will begin with PORT_
// All port pin numbers use the pins as numbered according to the Arduino Uno pinout
// not the ATMega microcontroller pinout.
// max ports avalibale
#define PORT_MAX 6
#define PORT_CLOCK 3
#define PORT_DATA_BUS 4
// temperature sensors 
#define PORT_TEMP1 6
#define PORT_TEMP2 7
#define PORT_TEMP3 8
#define PORT_TEMP4 9
#define PORT_TEMP5 10
// light sensors
#define PORT_LIGHT1 A0

/**
Class: Port
  The port class manages all of the ports on the DAQ. It consists of an array of Sensor pointers
  that point to the different sensor objects implemented in the Sensor class, a pointer to the 
  memory class, a real time clock object. It also stores the number of active ports in activePorts 
  and the last port in the array in lastPort. To make it easier to interface with the Experiment class 
  the Sensors* array is left public.
Constructor: Port(void)
  Postcondition: All sensors are decalred on the heap and pointers to sensor objects are stored 
  in the Sensors array.
Public Functions:
  void portSetup (Memory* memoryPtr):
    postcondition: Memory contains a pointer to the memory class. Active ports contains the number
    of active ports. The highest array value with an active port is stored in lastPort.
  boolean isActive (uint8_t portAddress):
    precondition: port address must be valid. If a invalid port address is entered an abort command
    is sent via miniSDI_12 protocol.
    postcondition: The state of a sensor with a portAddress is returned.
  uint8_t getNumberActive(void):
    postcondition: the number of active ports on the DAQ is returned.
  void sendPortData (uint8_t portAddress):
    precondition: port address must be valid. If a invalid port address is entered an abort command
    is sent via miniSDI_12 protocol.
    postcondition: Current port data from portAddress has been sent to SCIO app via miniSDI_12 protocol.
  void savePortData (uint8_t portAddress, uint32_t currentPeriod):
    precondition: port address must be valid. If a invalid port address is entered an abort command
    is sent via miniSDI_12 protocol.
    postcondition: current port data from portAddress has been saved to memory at the next avaliable 
    slot
  void sendSavedData (uint16_t amount):
    precondition: There must be at least one measurment saved in memory and Amount must be valid. 
    If a invalid amount is entered or there are no saved measurments then an abort command is 
    sent via miniSDI_12 protocol.
    postcondition: the last amount of saved measurments has been sent to the SCIO app via miniSDI_12
    protocol. These are sent in time forward order meaning the oldest recorded measurment is sent first.
Private Functions:
  void sendAll (void):
    postcondition: all saved measurments are sent to the SCIO app via miniSDI_12 protocol.
  void saveAll (uint32_t currentPeriod):
    postcondition: data from every active port is saved to memeory.
**/

class Port{
    public:
    //constructor
    Port (void);
    //public variables
    Sensor* ports[PORT_MAX];
    //public functions
    void portSetup (Memory* memoryPtr);
    boolean isActive (uint8_t portAddress);
    uint8_t getNumberActive(void){return activePorts;};
    void sendPortData (uint8_t portAddress);
    void savePortData (uint8_t portAddress, uint32_t currentPeriod);
    void sendSavedData (uint16_t amount);
    
    private:
    Memory* memory;
    RTC_DS1307 RTC;
    uint8_t lastPort;
    uint8_t activePorts;
    void sendAll (void);
    void saveAll (uint32_t currentPeriod);

};
#endif
