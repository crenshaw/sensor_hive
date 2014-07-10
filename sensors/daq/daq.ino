
#include "read_write.h"
#include "Adafruit_MAX31855.h"
#include <avr/sleep.h>
#include <avr/power.h>
#include <avr/wdt.h>

//#define DEBUG
//#define WD               // turn watch dog timer on off
#define DIGCLK  3         // Digital Clk output pin 3
#define THERMBUS  4       // Thermal data Databus digital input pin 4
#define TEMP1  5          // Temp sensor 1 select digital output pin 5
#define TEMP2  6          // Temp sensor 2 select digital output pin 6
#define TEMP3  7          // Temp sensor 3 select digital output pin 7
#define MAXTEMPSENSORS  3 // maximum number of temperature sensors that can be used.

int sensor = 0;
char command = 0;
int number = 0;
int ID = 002;
boolean newCmd = false;
int period = 2000;       // Defualt period 2000ms or 2s

Adafruit_MAX31855 thermocouple[MAXTEMPSENSORS] = 
   {Adafruit_MAX31855(DIGCLK, TEMP1, THERMBUS), 
    Adafruit_MAX31855(DIGCLK, TEMP2, THERMBUS),
    Adafruit_MAX31855(DIGCLK, TEMP3, THERMBUS)};

void setup () 
{
    Serial.begin(9600);      
    Serial.println("Chip test: Arduino - lelaSaida");
    startup1();
}

void loop()
{
    if (Serial.available() > 0)
    {
         newCmd = readNewCmd(&sensor,&command,&number);
         if(!newCmd){
             Serial.println("0");
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
            case 0:
                switch(number)
                {
                    case 0:    //board active
                        printReport(ID, 0);
                        break;
                    case 1:    //Sensor 1 active
                        if (thermocouple[0].isUsed())
                        {
                            printReport(ID, 1);
                        }
                        else{
                            printReport(ID);
                        }
                        break;  //Sensor 2 active
                    case 2:
                        if (thermocouple[1].isUsed())
                        {
                            printReport(ID, 2);
                        }
                        else{
                            printReport(ID);
                        }
                        break;
                    case 3:    //Sensor 3 active
                        if (thermocouple[2].isUsed())
                        {
                            printReport(ID, 3);
                        }
                        else{
                            printReport(ID);
                        }
                        break;
                    default:
                        Serial.println('0');
                }
                break;
            case 'R':
                //Serial.println("Continous Measurment Routine");
                switch(sensor)
                {
                    case 0:    //0
                        for (int j = 0; j < number; j ++)
                        {
                            for (int i = 0; i < MAXTEMPSENSORS; i++){
                                if (thermocouple[i].isUsed()){
                                    printReport(ID, i, thermocouple[i].readCelsius());
                                }
                            }
                            delay(period);
                        }
                        break;
                    case 1:    //1
                        for (int j = 0; j < number; j ++)
                        {
                            printReport(ID, sensor, thermocouple[0].readCelsius());
                            delay(period);
                        }
                        break;  //2
                    case 2:
                        for (int j = 0; j < number; j ++)
                        {
                            printReport(ID, sensor, thermocouple[1].readCelsius());
                            delay(period);
                        }
                        break;
                    case 3:    //3
                        for (int j = 0; j < number; j ++)
                        {
                            printReport(ID, sensor, thermocouple[2].readCelsius());
                            delay(period);
                        }
                        break;
                    default:
                        Serial.println('0');
                }
                break;
            case 'P':
                //Serial.println("Period Set Routine");
                period = number * 1000;
                break;
           default:
               Serial.println("0");
        }
        
    }
    newCmd = false;
}


void startup1 (void){
    //Look for temperature sensors
    for (int i = 0; i < MAXTEMPSENSORS; i++)
    {
        #ifdef DEBUG3
        Serial.print("Sensor ");
        Serial.println(i); 
        #endif  
        if(thermocouple[i].readCelsius() > 0)
        {
            thermocouple[i].setUsed(true);
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
