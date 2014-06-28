/*************************************************** 
  This is an example for the Adafruit Thermocouple Sensor w/MAX31855K

  Designed specifically to work with the Adafruit Thermocouple Sensor
  ----> https://www.adafruit.com/products/269

  These displays use SPI to communicate, 3 pins are required to  
  interface
  Adafruit invests time and resources providing this open source code, 
  please support Adafruit and open-source hardware by purchasing 
  products from Adafruit!

  Written by Limor Fried/Ladyada for Adafruit Industries.  
  BSD license, all text above must be included in any redistribution
 ****************************************************/

#include "Adafruit_MAX31855.h"

int thermoDO = 4;        //Data Bus
int thermoCLK = 3;      // Clock
int toDo = -1;
int currentChip = 5;
int thermoCS1 = 5;        //Thermo Chip 1
int thermoCS2 = 6;        //Thermo Chip 2
int thermoCS3 = 7;        //Thermo Chip 3
double f = 0;
double c = 0;
double internal = 0;

Adafruit_MAX31855 thermocouple1(thermoCLK, thermoCS1, thermoDO);
Adafruit_MAX31855 thermocouple2(thermoCLK, thermoCS2, thermoDO);
Adafruit_MAX31855 thermocouple3(thermoCLK, thermoCS3, thermoDO);
  //set up micro controller
void setup() {
  Serial.begin(9600);      
  
  Serial.println("MAX31855 test");
  // wait for MAX chip to stabilize
  delay(500);
}

void loop() {
 if (Serial.available() > 0) {
                // read the incoming byte:
                toDo = Serial.read();
        }
        
        
  // basic readout test, just print the current temp
   switch(toDo){
       case 49:
          Serial.println("ID: Thermo1");
          c = thermocouple1.readCelsius();
          f = thermocouple1.readFarenheit();
          internal = thermocouple1.readInternal();
          printTemp(c,f,internal);
          break;
       case 50:
         Serial.println("ID: Thermo2");
          c = thermocouple2.readCelsius();
          f = thermocouple2.readFarenheit();
          internal = thermocouple1.readInternal();
          printTemp(c,f,internal);
          break;
       case 51:
         Serial.println("ID: Thermo3");
          c = thermocouple3.readCelsius();
          f = thermocouple3.readFarenheit();
          internal = thermocouple1.readInternal();
          printTemp(c,f,internal);
          break;
       default:
         Serial.println("Waiting");
   }
   toDo = -1;
   delay(1000);
}

void printTemp(double c, double f, double internal ) {
     if (isnan(c)) {
         Serial.println("Something wrong with thermocouple!");
       } else {
         Serial.print("C = "); 
         Serial.println(c);
         Serial.print("F = ");
         Serial.println(f);
         Serial.print("Internal = ");
         Serial.println(internal);
       }
}
