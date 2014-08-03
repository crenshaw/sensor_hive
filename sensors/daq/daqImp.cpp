// includeds
#include <Wire.h>                  // i2c communication
#include "Adafruit_MAX31855.h"     // used to measure temperature
#include "RTClib.h"                // real time clock
#include "read_write.h"            // used to parse command and send resonds
#include "daqImp.h"



///////////////////////////////////////////////////////////////////////////////////////////
//*****************************************Command Funtions******************************//
///////////////////////////////////////////////////////////////////////////////////////////

/**
void acknowledgeActive (Adafruit_MAX31855* thermocouple, int port)
    Sends a response if the specified port is active. If no such port exists or port is inactive sends abort response.
    If port = 0 sends abort response.
@param Adafruit_max31855* thermocouple
    A pointer to a thermocouple object. Usally a pointer to the head of an array of thermocouple objects.
@param int part
    The port that is being checked
@return void
**/
void acknowledgeActive (Adafruit_MAX31855* thermocouple, int port){
    switch(port){
        case 0:                                  // board active
            respond(DAQ_ID, 0);
            break;
        case 1:                                  // is port 1 active
            thermocouple[0].isUsed() ? respond (DAQ_ID,1) : respond(DAQ_ID, 0);
            break;  
        case 2:                                  // is port 2 active
            thermocouple[1].isUsed() ? respond (DAQ_ID,2) : respond(DAQ_ID, 0);
            break;
        case 3:                                  // is port 3 active
            thermocouple[2].isUsed() ? respond (DAQ_ID,3) : respond(DAQ_ID, 0);
            break;
        default:
            respond(DAQ_ID,0);                      // abort response
    }
}
// can add an overlaoded acknowledge active for another sensor where 
// Adafruit_MAX31855* thermocouple is replaced with another sensor type


boolean startExp (Exp* experiment, int prt, int numMeasures){
    if (prt > DAQ_MAXTEMPSENSORS){
        return false;
    }
    else if (experiment -> isRunning){  
        return false;
    }
    else {
        SREG &= (0 << 7);                                      // turn off global inturrupts to protect memory
        // todo: clear memory
        experiment -> isRunning = true;                        // set experiment running           
        experiment -> ports = prt;                             // set used ports
        experiment -> currentMeasurment = 0;                   // reset current measurment
        experiment -> markMeasurment = numMeasures;            // set target measurments
        experiment -> isEnd = false;                           // not the end it just started
        experiment -> addTime = 0;
        TCNT1 = 0;        // clear timer1
        SREG |= (1 << 7);                                      // turn on global inturrupts Note: this need to be done before
        RTC_DS1307 RTC;                                        //reading the time since i2c requires inturrupts
        experiment -> startTime = RTC.now().unixtime();             // set starting time
        // clear the inturrupt flag
        TIFR1  |= (1 << ICF1);
        // set timer interupt on
        TIMSK1 |= (1 << ICIE1);                                // start exp
        #ifdef DEBUG_startExp
        Serial.print("isRunning: ");
        Serial.println(experiment -> isRunning);
        Serial.print("ports: ");
        Serial.println(experiment -> ports);
        Serial.print("current Measurment: ");
        Serial.println(experiment -> currentMeasurment);
        Serial.print("MarkMeasurment: ");
        Serial.println(experiment -> markMeasurment);
        Serial.print("tim: ");
        Serial.println(experiment -> time);
        #endif
        return true;
    }
}


void storeData (Adafruit_MAX31855* thermocouple, Exp* experiment){
    switch (experiment -> ports){
        case 0:
            for (int i = 0; i < DAQ_MAXTEMPSENSORS; i++){
                    if (thermocouple[i].isUsed()){
                        Serial.println(thermocouple[i].readCelsius()); 
                    }
            }
            //todo: store data for all active sports
            break;
        case 1:
            Serial.println(thermocouple[0].readLastC());
            //todo: store data for port 0
            break;
        case 2:
            Serial.println(thermocouple[1].readLastC());
            //todo: store data for port 1
            break;
        case 3:
            Serial.println(thermocouple[2].readLastC());
            //todo: store data for port 2
            break;
        default:
            respond(DAQ_ID,0);
    }
}

void endExp (void){
    // set timer interupt on
    TIMSK1 &= (0 << ICIE1);
}



///////////////////////////////////////////////////////////////////////////////////////////
//******************************************Setup Functions******************************//
///////////////////////////////////////////////////////////////////////////////////////////

/**
void startSquareWave (int address)
    Communicates using i2c with the RTC. 
    Tells RTC to begin outputing a 1Hz square wave
@param address
    specifices the i2c address of the RTC
@return void
**/
void startSquareWave (int address){ // set to 1Hz
     #ifdef BEBUGsqw
     Serial.println("transmitting");
     #endif
     Wire.beginTransmission(address);
     Wire.write(0x07); // move pointer to DAQ_SQW address
     Wire.write(0x10); // sends 0x10 (hex) 00010000 (binary)
     Wire.endTransmission();
}

/**
void timer1Setup (void)
    Sets the parameters of timer1 on the ATmega328P uC.
    Set external clock source on pin 5 of the arduino, pin 11 on ATmega328P.
    Sets timer in CTC (mode 12)
    Clears the counting registart
    Sets the global inturrupt flag to 1
    Turn timer inturrupts off
@param void
@return void
**/
void timer1Setup (void){
    //set timer/counter 1 to clock on external 1hz sqw from rtc on arduino pin 5
    TCCR1B |= (1 << CS12);
    TCCR1B |= (1 << CS11);
    TCCR1B |= (1 << CS10);
    // set up timer to be in CTC (mode 12)
    TCCR1B |= (1 << WGM13);
    TCCR1B |= (1 << WGM12);
    TCCR1A &= (0 << WGM11);
    TCCR1A &= (0 << WGM10);
    // clear timer
    TCNT1 = 0;
    // set global interrupt falg on
    SREG |= (1 << 7);
    // set timer interupt off
    TIMSK1 &= (0 << ICIE1);
}

/**
int sensorCheck (Adafruit_MAX31855* thermocouple, int maxTempSensors)
    if RTCSET is defined it will set the time of the RTC to the current time at compile.
    Itterates through temperature sensor ports. If the port is in use sets the inuse flag
      of that temperature sensor.
    A temperature sensor is marked as active if a celsius reading above zero is observed.
@param Adafruit_MAX31855* thermocouple
    Address of a thermocouple object. Usally a pointer to the beginning of an array
      of thermocouple objects. 
@param maxTempSensors
    The number of temperature sensors that could be connected to the board at one time.
      Used as an itteration limit.
@return int
    Returnes the address of the highest port currently in use by temperature sensors.
**/
int sensorCheck (Adafruit_MAX31855* thermocouple, int maxTempSensors){
    int lastPort = 0;
    //set rtc useing time at compile
    #ifdef RTCset
    RTC_DS1307 RTC;
    Serial.println("RTC is NOT running!");
    // following line sets the RTC to the date & time this sketch was compiled
    RTC.adjust(DateTime(__DATE__, __TIME__));
    #endif
    
    //Look for temperature sensors
    for (int i = 0; i < maxTempSensors; i++){
        #ifdef DEBUGsensorCheck
        Serial.print("Port ");
        Serial.print(i); 
        #endif  
        if(thermocouple[i].readCelsius() > 0){
            thermocouple[i].setUsed(true);
            lastPort = i;
            #ifdef DEBUGsensorCheck
            Serial.println(": Temperature - in use.");
            #endif
        }
        else{
            #ifdef DEBUGsensorCheck
            Serial.println(": Temperature -  not in use."); 
            #endif
        }
    }
    #ifdef DEBUGsensorCheck
    Serial.print("lastPort: "); 
    Serial.println(lastPort);
    #endif
    //return the highest port used
    return lastPort;
}
