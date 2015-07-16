#include "Experiment.h"
#include "miniSDI_12.h"
#include "RTClib.h"
#include <Wire.h>

/**
Experiment::Experiment (void)
  Creates the object. Does not initialize the object. Allows the initalization to be called later.
  
  @param void
*/
Experiment::Experiment (void){
    
}

/**
void Experiment::experimentSetup (Port* portsPtr, Memory* memPtr)
  Stores pointers to memory and ports, calls intialization functions for hardware timers and RTC,
  recovers previous experiment.

  @param Port* portsPtr    A pointer to a ports object
  @param Memory* memPtr    A pointer to a memory object
  
  @return void
*/
void Experiment::experimentSetup (Port* portsPtr, Memory* memPtr){
  ports = portsPtr;
  memory = memPtr;
  timerSetup();
  startClock();
  recoverExperiment();
  #ifdef RTCset
      // following line sets the RTC to the date & time this sketch was compiled
      RTC_DS1307 RTC;
      RTC.adjust(DateTime(__DATE__, __TIME__));
  #endif
}

/**
void Experiment::setPeriod (uint32_t newPeriod)
  Takes a newPeriod and checks boundry condidtions. Saves newPeriod to IRC1 register, 
  the compare register for hardware timer/counter1. Experiment max is 2^16-1
  
  @param uint32_t newPeriod    The new period.
  
  @return void
*/
void Experiment::setPeriod (uint32_t newPeriod){
    if (newPeriod > EXPERIMENT_MAX_PERIOD || experimentBlock.isRunning){
        respond(0);
    }
    else{
        EXPERIMENT_PERIOD = newPeriod;
        respond(0 , newPeriod);
    }
}

/**
uint32_t Experiment::updateCurrentPeriod (void)
  Updates the current period of the experiment and saves experiment block to EEPROM.
  if it was the last period calls stop experiment.
  
  @param void
  
  @return uint32_t   the current period of the experiment.
*/
uint32_t Experiment::updateCurrentPeriod (void){
    currentPeriod ++;
    (*memory).updateExperimentBlock(experimentBlock);
    if (currentPeriod == experimentBlock.targetMeasurment){
        stopExperiment();
    }
    return currentPeriod;
}

/**
void Experiment::startR (uint8_t port, uint32_t targetMeasurment)
  Starts an R experiment. Checks running conditions. Uses Arduino delay function
  to clock the experiment. Sends port data after every measurment. WARNING: this
  function cannot be inturrupted - it will finish all requested measurments before
  returning to the main program. This should only be used for a small number of measurments.
  
  @param uint8_t port    The desired port to measure. 0 for all ports.
  @param uint32_t targetMeasurment    The desired number of measurments.
  
  @return void
*/
void Experiment::startR (uint8_t port, uint32_t targetMeasurment){
    //running conditions.
    if (experimentBlock.isRunning && targetMeasurment != 1){
        respond(0);
    }
    else {
        for (int i = 1; i <= targetMeasurment; i++){
            (*ports).sendPortData(port);
            if (i == targetMeasurment){
                terminate();
                endLine();
            }
            else{
                endLine();
            }
            if (targetMeasurment != 1 && i != targetMeasurment){
                delay (EXPERIMENT_PERIOD*1000);
            }
        }
    }
}

/**
void Experiment::startM (uint8_t port, uint32_t targetMeasurment)
  Starts and M experiment. Checks running conditions and parameters.
  Creates a new experiment block and updates the EEPROM. Clears EEPROM of old experiment data.
  WARMING: sucsussfully calling this function will result in the loss of old experiment data.
  
  @param uint8_t port    The desired port to measure. 0 for all ports.
  @param uint32_t targetMeasurment    The desired number of measurments.
  
  @return void
*/
void Experiment::startM (uint8_t port, uint32_t targetMeasurment){
    //running conditions and parameter check.
    if (experimentBlock.isRunning || (!(*ports).isActive(port) && port !=0) || port > PORT_MAX || port < 0){
        respond(SDI_ABORT);
    }
    else {
        currentPeriod = 0;
        experimentBlock.isRunning = true;
        experimentBlock.port = port;
        (*memory).reset();
        experimentBlock.periodLgth = EXPERIMENT_PERIOD;
        experimentBlock.targetMeasurment = targetMeasurment;
        RTC_DS1307 RTC;                                        //reading the time since i2c requires inturrupts                                  
        experimentBlock.startTime = RTC.now().unixtime();     // set starting time
        (*memory).updateExperimentBlock(experimentBlock);
        TCNT1 = 0;         // clear timer1
        TIFR1  |= (1 << ICF1);  // clear the inturrupt flag    
        // set timer interupt on                               
        TIMSK1 |= (1 << ICIE1); // start exp
        if (port == 0){                           
            respond (port*(*ports).getNumberActive(), EXPERIMENT_PERIOD*targetMeasurment, targetMeasurment);
        }
        else{
            respond (port, EXPERIMENT_PERIOD*targetMeasurment, targetMeasurment);
        }
    }
}

/**
void Experiment::stopExperiment (void)
  Stops experiments by turning off gloabl inturrupts. Updates experiment block and writes it to 
  memory.
  
  @param void
  
  @return void
*/
void Experiment::stopExperiment (void){
    // set timer interupt off
    TIMSK1 &= (0 << ICIE1);
    //clear is runnign flag
    experimentBlock.isRunning = false;
    //update data header in memory
    (*memory).updateExperimentBlock(experimentBlock);
}

/**
void Experiment::recoverExperiment (void)
  Loads the last experiment from memory. If the running curretnlyRunning bit is set
  calculates what the current period would be and starts experiment running. If the calculated
  current period exceedes the desired number of measurments then the experiment is stopped.
  Updates the experiment block in memory.
  
  @param void
  
  @return
*/
void Experiment::recoverExperiment (void){
    (*memory).loadExperimentBlock(&experimentBlock);
    if (experimentBlock.isRunning){
        RTC_DS1307 RTC;
        currentPeriod = ((RTC.now().unixtime()) - (experimentBlock.startTime)) / experimentBlock.periodLgth;
        if (currentPeriod > experimentBlock.targetMeasurment){
            stopExperiment();
        }
        EXPERIMENT_PERIOD = experimentBlock.periodLgth;
        (*memory).updateExperimentBlock(experimentBlock);
        TCNT1 = (RTC.now().unixtime() - experimentBlock.startTime) % experimentBlock.periodLgth;      // sets timer to where in the period it should be
    }
}

/**
void Experiment::timerSetup (void)
  set timer/counter1 to clock on external 1hz sqw from rtc on arduino pin 5
  sets the default period length to 1s
  
  @param void
  
  @return void
*/
void Experiment::timerSetup (void){
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
    EXPERIMENT_PERIOD = 1;
    // clear timer 16 bit reg
    TCNT1 = 0;
    // set global interrupt falg on
    SREG |= (1 << 7);
    // set timer interupt off
    TIMSK1 &= (0 << ICIE1);
}

/**
void Experiment::startClock (void)
  Uses I2C communication to set pin modes and begin communication with
  RTC.
  
  @param void
  
  @return void
*/
void Experiment::startClock (void){
     #ifdef BEBUGsqw
     Serial.println("transmitting");
     #endif
     pinMode(EXPERIMENT_CLOCK_PIN, INPUT_PULLUP);
     Wire.beginTransmission(EXPERIMENT_RTC_I2C_ADDRESS);
     Wire.write(0x07); // move pointer to DAQ_SQW address
     Wire.write(0x10); // sends 0x10 (hex) 00010000 (binary)
     Wire.endTransmission();
}



