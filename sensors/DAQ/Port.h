
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
//pin constants
#define PORT_CLOCK 3
#define PORT_DATA_BUS 4
#define PORT_TEMP1 6
#define PORT_TEMP2 7
#define PORT_TEMP3 8
#define PORT_TEMP4 9
#define PORT_TEMP5 10

class Port{
    public:
    //constructor
    Port (void);
    //public variables
    Sensor* ports[PORT_MAX];
    //public functions
    boolean isActive (uint8_t portAddress);
    void sendPortData (uint8_t portAddress);
    void savePortData (uint8_t portAddress, uint32_t currentPeriod);
    void sendSavedData (uint16_t amount);
    void portSetup (Memory* memoryPtr);
    
    private:
    Memory* memory;
    RTC_DS1307 RTC;
    uint8_t lastPort;
    uint8_t activePorts;
    void sendAll (void);
    void saveAll (uint32_t currentPeriod);

};
#endif
