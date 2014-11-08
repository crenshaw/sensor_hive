#include "Experiment.h"
#include "miniSDI_12.h"
#include "RTClib.h"
#include <Wire.h>

Experiment::Experiment (void){
    
}

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


void Experiment::setPeriod (uint32_t newPeriod){
    if (newPeriod > EXPERIMENT_MAX_PERIOD || experimentBlock.isRunning){
        respond(0);
    }
    else{
        EXPERIMENT_PERIOD = newPeriod;
        respond(0 , newPeriod);
    }
}

uint32_t Experiment::updateCurrentPeriod (void){
    currentPeriod ++;
    (*memory).updateExperimentBlock(experimentBlock);
    if (currentPeriod == experimentBlock.targetMeasurment){
        stopExperiment();
    }
    return currentPeriod;
}

void Experiment::startR (uint8_t port, uint32_t targetMeasurment){
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

void Experiment::startM (uint8_t port, uint32_t targetMeasurment){
    if (experimentBlock.isRunning || (!(*ports).isActive(port) && port !=0) || port > PORT_MAX || port < 0){
        respond(ABORT);
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


void Experiment::stopExperiment (void){
    // set timer interupt off
    TIMSK1 &= (0 << ICIE1);
    //clear is runnign flag
    experimentBlock.isRunning = false;
    //update data header in memory
    (*memory).updateExperimentBlock(experimentBlock);
}

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



