
#include "read_write.h"
#include "Adafruit_MAX31855.h"
//#include <Wire.h>
//#include "RTClib.h"

#include <avr/sleep.h>
#include <avr/power.h>
#include <avr/wdt.h>


#define DEBUGTIME
//#define WD               // turn watch dog timer on off
#define DIGCLK  3         // Digital Clk output pin 3
#define THERMBUS  4       // Thermal data Databus digital input pin 4
#define TEMP1  5          // Temp sensor 1 select digital output pin 5
#define TEMP2  6          // Temp sensor 2 select digital output pin 6
#define TEMP3  7          // Temp sensor 3 select digital output pin 7
#define MAXTEMPSENSORS  3 // maximum number of temperature sensors that can be used.

//RTC_DS1307 RTC;

Adafruit_MAX31855 thermocouple[MAXTEMPSENSORS] = 
   {Adafruit_MAX31855(DIGCLK, TEMP1, THERMBUS), 
    Adafruit_MAX31855(DIGCLK, TEMP2, THERMBUS),
    Adafruit_MAX31855(DIGCLK, TEMP3, THERMBUS)};

int sensor = 0;
char command = 0;
int number = 0;
int ID = 002;
boolean newCmd = false;
int lastPort = 0;
int period = 2000;       // Defualt period 2000ms or 2s
//DateTime now;




void setup () 
{
    Serial.begin(9600);      
    //Serial.println("Chip test: Arduino - lelaSaida");
    startup1();
}

void loop()
{
//    #ifdef DEBUGTIME
//    delay(5000);
//    DateTime now = RTC.now();
//    Serial.print(" since 1970 = ");
//    Serial.println(now.unixtime());
//
//    Serial.print(now.year(), DEC);
//    Serial.print('/');
//    Serial.print(now.month(), DEC);
//    Serial.print('/');
//    Serial.print(now.day(), DEC);
//    Serial.print(' ');
//    Serial.print(now.hour(), DEC);
//    Serial.print(':');
//    Serial.print(now.minute(), DEC);
//    Serial.print(':');
//    Serial.print(now.second(), DEC);
//    Serial.println();
//    #endif
    
    
   
    if (Serial.available() > 0)
    {
         newCmd = readNewCmd(&sensor,&command,&number);
         if(!newCmd){
             respond(ID,0);
         }
         else{
             #ifdef DEBUG
             Serial.print("Sensor: ");
             Serial.println(sensor);
             Serial.print("Com: ");
             Serial.println(command);
             Serial.print("Number: ");
             Serial.println(number);
             #endif
         }  
    }
    
    if (newCmd && sensor == -1 && command == -1 && number == -1){
        //Serial.println("run break routine");
        newCmd = false;
    }
    
    if (newCmd){
        switch (command){
            case 0:              //Acknowledge Active
                switch(number)
                {
                    case 0:    //board active
                        respond(ID, 0);
                        break;
                    case 1:    //Sensor 1 active
                        if (thermocouple[0].isUsed())
                        {
                            respond(ID, 1);
                        }
                        else{
                            respond(ID, 0);
                        }
                        break;  //Sensor 2 active
                    case 2:
                        if (thermocouple[1].isUsed())
                        {
                            respond(ID, 2);
                        }
                        else{
                            respond(ID, 0);
                        }
                        break;
                    case 3:    //Sensor 3 active
                        if (thermocouple[2].isUsed())
                        {
                            respond(ID, 3);
                        }
                        else{
                            respond(ID, 0);
                        }
                        break;
                    default:
                        respond(ID,0);
                }
                break;
            
            
            case 'R':          //Continous Measurment Routine
                //Serial.println("Continous Measurment Routine");
                switch(sensor)
                {
                    case 0:    //0
                        for (int j = 0; j < number; j ++)
                        {
                            boolean noReport = true;
                            for (int i = 0; i < MAXTEMPSENSORS; i++){
                                if (thermocouple[i].isUsed()){
                                    if (j == number -1 && i == lastPort){
                                        
                                        dataReport(ID, i+1, 0, thermocouple[i].readCelsius(), true);
                                        noReport = false;
                                    }     
                                    else{
                                        
                                        dataReport(ID, i+1, 0, thermocouple[i].readCelsius());
                                        noReport = false;
                                    }
                                }
                            }
                            if(noReport){
                                respond(ID , 0);
                            }
                            delay(period);
                        }
                        break;
                    case 1:    //1
                        for (int j = 0; j < number; j ++)
                        {
                            if (j == number -1){
                                
                                dataReport(ID, 1, 0, thermocouple[j].readCelsius(), true);
                            }     
                            else{
                               
                                dataReport(ID, 1, 0, thermocouple[j].readCelsius());
                            }
                        }
                        break;  //2
                    case 2:
                        for (int j = 0; j < number; j ++)
                        {
                            if (j == number -1){
                                
                                dataReport(ID, 2, 0, thermocouple[j].readCelsius(), true);
                            }     
                            else{
                                
                                dataReport(ID, 2, 0, thermocouple[j].readCelsius());
                            }
                        }
                        break;
                    case 3:    //3
                        for (int j = 0; j < number; j ++)
                        {
                            if (j == number -1){
                                
                                dataReport(ID, 3, 0, thermocouple[j].readCelsius(), true);
                            }     
                            else{
                                
                                dataReport(ID, 3, 0, thermocouple[j].readCelsius());
                            }
                        }
                        break;
                    default:
                        respond(ID,0);
                }
                break;
            
            
            case 'P':          //setPeriod
                //Serial.println("Period Set Routine");
                period = number * 1000;
                respond(ID,0,number);
                break;
           default:
               respond(ID,0);
        }
        
    }
    newCmd = false;
}


void startup1 (void){
    //set rtc
   
//      Serial.println("RTC is NOT running!");
//      // following line sets the RTC to the date & time this sketch was compiled
//      RTC.adjust(DateTime(__DATE__, __TIME__));
    
    //Look for temperature sensors
    for (int i = 0; i < MAXTEMPSENSORS; i++)
    {
        #ifdef DEBUG30R
        Serial.print("Sensor ");
        Serial.println(i); 
        #endif  
        if(thermocouple[i].readCelsius() > 0)
        {
            thermocouple[i].setUsed(true);
            lastPort = i;
            #ifdef DEBUG3
            Serial.println("Sensor in use.");
            #endif
        }
        else{
            #ifdef DEBUG3
            Serial.println("Sensor not in use."); 
            #endif
        }
    }
    #ifdef DEBUG3
    Serial.println("Done");
    #endif
}
