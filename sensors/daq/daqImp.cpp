// includeds
#include <Wire.h>                  // i2c communication
#include "Adafruit_MAX31855.h"     // used to measure temperature
#include "RTClib.h"                // real time clock
#include "daqImp.h"                // 
#include "EEPROMex.h"              // interacts with EEPROM
#include "read_write.h"            // used to parse command and send resonds






///////////////////////////////////////////////////////////////////////////////////////////
//***************************************Command Funtions********************************//
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
void acknowledgeActive (DataAqu* daq, int port){
    if (port > 0 && port <= DAQ_MAXTEMPSENSORS){
            daq -> activePorts[port-1] ? respond (DAQ_ID,port) : respond(DAQ_ID, 0);
    }
    else{
            respond(DAQ_ID,0);                      // abort response
    }
}

void setPeriod (DataAqu* daq, int periodLength){
    Period = periodLength;
    // setting another period specifically for continous measurment
    // this makes sure the uC does not have to read from a 16 bit reg 
    // then do some math so the system can delay. bassically it speed up opperation
    // this also need to be in miliseconds and dealy is in seconds.
    // delay overflows at 30 seconds i believe.
    daq -> period = periodLength;                  //period in Seconds
    daq -> periodR = periodLength * 1000;          //period in Milisecons
    respond(DAQ_ID, 0, periodLength);
}

void continuousMeasurment (DataAqu* daq, int port, int numMeasures){
    if (numMeasures == 0){
        respond(DAQ_ID, 0);
        return;
    }
    if (port == 0){
        for (int j = 0; j < numMeasures; j ++){
            boolean noReport = true;
            for (int i = 0; i < DAQ_MAXTEMPSENSORS; i++){
                if (daq -> activePorts[i]){
                    if (j == numMeasures -1 && i == daq -> lastPort){
                        dataReport(DAQ_ID, i+1, (daq -> RTC).now().unixtime(), (*(daq -> thermocouple[i])).readCelsius(), true);
                        noReport = false;
                    }     
                    else{
                        dataReport(DAQ_ID, i+1, (daq -> RTC).now().unixtime(), (*(daq -> thermocouple[i])).readCelsius());
                        noReport = false;
                    }
                }
            }
            if(noReport){
                respond(DAQ_ID , 0);
            }
            if (numMeasures > 1 && j != numMeasures -1){
                delay(daq -> periodR);
            }
        }
    }
    else{
        if (!(daq -> activePorts[port-1])){
            respond(DAQ_ID, 0);  
            return;
        }
        for (int j = 0; j < numMeasures; j ++){
            if (j == numMeasures -1){
                dataReport(DAQ_ID, port, (daq -> RTC).now().unixtime(), (*(daq -> thermocouple[port-1])).readCelsius(), true);
            }     
            else{
                dataReport(DAQ_ID, port, (daq -> RTC).now().unixtime(), (*(daq -> thermocouple[port-1])).readCelsius());
            }
            if (numMeasures > 1 && j != numMeasures -1){
                delay(daq -> periodR);
            }
        }
    }
}


boolean startExp (Exp* exps, int prt, int numMeasures){
    if (exps -> dataHead.isRunning){
        return false;
    }
    else {
        SREG &= (0 << 7);                                      // turn off global inturrupts to protect memory
        exps -> currentMeasurment = 0;
        exps -> dataHead.isRunning = true;
        exps -> dataHead.port = prt;
        exps -> dataHead.headPtr = 0;
        exps -> dataHead.tailPtr = 0;
        exps -> dataHead.periodLgth = Period;
        exps -> dataHead.numMeasurments = numMeasures;
        TCNT1 = 0;                                             // clear timer1
        SREG |= (1 << 7);                                      // turn on global inturrupts Note: this need to be done before
        RTC_DS1307 RTC;                                        //reading the time since i2c requires inturrupts
        // clear the inturrupt flag                            
        TIFR1  |= (1 << ICF1);                                  
        exps -> dataHead.startTime = RTC.now().unixtime();     // set starting time
        // set timer interupt on                               
        TIMSK1 |= (1 << ICIE1);                                // start exp
        SREG &= (0 << 7);                                       // turn off inturrupts to writeto EEPROM
        EEPROM.updateBlock(0, exps -> dataHead);
        SREG |= (1 << 7);                                       // resume inturrupts when finished
        
        return true;
    }
}
// Inturrupts need to be off when this is called
void storeData (Exp* exps, Data* data){
    Data dataIn;
    dataIn.periodNum = data -> periodNum;
    dataIn.port = data -> port;
    dataIn.data = data -> data;
    EEPROM.updateBlock(((exps -> dataHead.tailPtr) % DAQ_DATA_MAX)*DAQ_DATA_OFFSET+DAQ_HEAD_OFFSET, dataIn);
    exps -> dataHead.tailPtr ++;
    EEPROM.updateBlock(0,exps->dataHead);
}

//
void sendData (int numMeasures){
    DataHead dataHead;
    EEPROM.readBlock(0, dataHead);
    Data data;
    if (numMeasures == 0 || numMeasures > dataHead.tailPtr){
        if (dataHead.tailPtr > DAQ_DATA_MAX){
            numMeasures = DAQ_DATA_MAX;
        }
        else{
            numMeasures = dataHead.tailPtr;
        }
    }
    while (numMeasures > 0){
      EEPROM.readBlock((((dataHead.tailPtr - numMeasures) % DAQ_DATA_MAX)*DAQ_DATA_OFFSET+DAQ_HEAD_OFFSET), data);
      if (numMeasures == 1){
            dataReport(DAQ_ID, data.port, dataHead.startTime + (data.periodNum * dataHead.periodLgth), data.data, true);
        }     
        else{
            dataReport(DAQ_ID, data.port, dataHead.startTime + (data.periodNum * dataHead.periodLgth), data.data);
        }
      numMeasures --;
    }
}


void endExp (Exp* exps){
    // set timer interupt off
    TIMSK1 &= (0 << ICIE1);
    //clear is runnign flag
    exps -> dataHead.isRunning = false;
    //update data header in memory
    SREG &= (0 << 7);
    EEPROM.updateBlock(0, exps -> dataHead);
    SREG |= (1 << 7);

}



///////////////////////////////////////////////////////////////////////////////////////////
//******************************************Setup Functions******************************//
///////////////////////////////////////////////////////////////////////////////////////////

void portSetup(DataAqu* daq){
     //set rtc useing time at compile
    #ifdef RTCset
    //Serial.println("RTC is NOT running!");
    // following line sets the RTC to the date & time this sketch was compiled
    daq -> RTC.adjust(DateTime(__DATE__, __TIME__));
    #endif
    //pin setup
    //declare each temperature sensor this needs to be pushed onto the heap
    daq -> thermocouple[0] = new Adafruit_MAX31855 (DAQ_DIGCLK, DAQ_TEMP1, DAQ_THERMBUS);
    daq -> thermocouple[1] = new Adafruit_MAX31855 (DAQ_DIGCLK, DAQ_TEMP2, DAQ_THERMBUS);
    daq -> thermocouple[2] = new Adafruit_MAX31855 (DAQ_DIGCLK, DAQ_TEMP3, DAQ_THERMBUS);
    
    pinMode(DAQ_SQW, INPUT_PULLUP);
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
void sensorCheck (DataAqu* daq){
    //this ssetting the defaults period. This doesn't really go in sensor check function, but I have no place else to put it
    // right now....soooo its going here
    daq -> period = 2;
    daq -> periodR = 2000;                                        // init R commands period to 2 sconds eventually movedt o timer2
                                                                  // this will always be the same as period
  
    daq -> lastPort = 0;
    //Look for temperature ports
    for (int i = 0; i < DAQ_MAXTEMPSENSORS; i++){
        if((*(daq->thermocouple[i])).readCelsius()){
            daq -> activePorts[i] = true;
            daq -> lastPort = i;
            daq -> numberActive ++;
        }
    }
    
}



/**
void startSquareWave (int address)
    Communicates using i2c with the RTC. 
    Tells RTC to begin outputing a 1Hz square wave
@param address
    specifices the i2c address of the RTC
@return void
**/
void startSquareWave (void){ // set to 1Hz
     #ifdef BEBUGsqw
     Serial.println("transmitting");
     #endif
     Wire.beginTransmission(RTC_I2C_ADDRESS);
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
    // set default period
    Period = 2;
    // clear timer
    TCNT1 = 0;
    // set global interrupt falg on
    SREG |= (1 << 7);
    // set timer interupt off
    TIMSK1 &= (0 << ICIE1);
}

boolean expRecover (Exp* exps){
    EEPROM.readBlock(0,(exps -> dataHead));
    if(!(exps -> dataHead.isRunning)){
        exps -> currentMeasurment = exps -> dataHead.numMeasurments;
        return false;
    }
    // get the new time
    RTC_DS1307 RTC;
    exps -> currentMeasurment = ((RTC.now().unixtime()) - (exps -> dataHead.startTime)) / exps -> dataHead.periodLgth;
    if (exps -> currentMeasurment > exps -> dataHead.numMeasurments){
        endExp (exps);
        return false;
    }
    Period = exps -> dataHead.periodLgth;
    EEPROM.updateBlock(0 , exps -> dataHead);
    TCNT1 = (RTC.now().unixtime() - exps -> dataHead.startTime) % exps -> dataHead.periodLgth;      // sets timer to where in the period it should be
    return true;
}






