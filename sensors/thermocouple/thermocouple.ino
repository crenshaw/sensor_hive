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
  
  #include <avr/sleep.h>
  #include <avr/power.h>
  #include <avr/wdt.h>
  
  #define DEBUG
  //#define WD               // turn watch dog timer on off
  #define THERMBUS  4      // Thermal data Databus digital input pin 4
  #define DIGCLK  3        // Digital Clk output pin 3
  #define TEMP0  5         // Temp sensor 0 select digital output pin 5
  #define TEMP1  6         // Temp sensor 1 select digital output pin 6
  #define TEMP2  7         // Temp sensor 2 select digital output pin 7
                           // I used 0 - 2 to match index of thermocouple vector
  #define MAXTEMPSENSORS  3// maximum number of temperature sensors that can be used.
  
  int toDo = -1;           // Currently used to communicat via serial or bluetooth
  int mode = 'm';
  int counter = 0;         // Used to count number of interups
  int period = 2000;       // Defualt period 2000ms or 2s
    
   Adafruit_MAX31855 thermocouple[MAXTEMPSENSORS] = {Adafruit_MAX31855(DIGCLK, TEMP0, THERMBUS), 
                                       Adafruit_MAX31855(DIGCLK, TEMP1, THERMBUS),
                                       Adafruit_MAX31855(DIGCLK, TEMP2, THERMBUS)};
  
  
    //set up micro controller
  void setup() {
    //wdt_enable( WDTO_4S);          //enable watchdog timer - chip reset after 4 seconds
    Serial.begin(9600);      
    Serial.println("Chip test: Arduino - lelaSaida");      //What I named the chip
    Serial.println("Checking Temperature Sensors");
    startup();
//    // initialize timer1 
//    cli();           // disable all interrupts
//    TCCR1A = 0;      // Clean the registers
//    TCCR1B = 0; 
//  
//    //csn2  csn1  csn0
//    //0     0     0      counter stopped
//    //0     0     1      no prescale  - 4 ms
//    //0     1     0      8    - 8.1 ms
//    //0     1     1      64   -
//    //1     0     0      256  -
//    //1     0     1      1024 -  4.2 sec
//  
//    TCCR1B |= (1 << CS12) | (1 << CS10);   // Prescaler 1024 - about 4.2 sec
//    TIMSK1 |= (1 << TOIE1);                // enable timer overflow interrupt
//    sei();                                 // enable all interrupts
    
    //We can write a unique id to the first mem slot in the eeprom
    
    
  }
  
  //creat an array of temperature senesor objects
  //and decalre each sensor with is coresponding chip select pin
 
  
  
  // interrupt service routine 
//  ISR(TIMER1_OVF_vect)
//  {
//    #ifdef WD
//    wdt_reset();
//    #endif
//    #ifdef DEBUG
//    Serial.println("I got inturupted");
//    Serial.println(counter);
//    #endif DEBUG
//    
//    if (counter > 2){  
//        #ifdef DEBUG
//        Serial.println("I am saving");
//        #endif
//        double internal = thermocouple[1].readInternal();
//        // put some saving/store fucntion here
//        // there is the eeprom library from arduino - but then i woudl have to write 
//        // alot of code to store double
//        // there is the eepromex library which has the code written. just need to decide 
//        // what to store, freq of store, 
//        
//        #ifdef DEBUG
//        Serial.println("wasn't that nice?");
//        delay(1000);
//        #endif
//        counter = 0;
//    }else{
//        counter ++;
//    }
//  }
  
  void loop() {
      #ifdef WD
      wdt_reset();
      #endif
      #ifdef DEBUG
      Serial.println("starting main");
      #endif
     if (Serial.available() > 0) {
         // read the incoming byte:
         mode = Serial.read();    
     }
     while (mode == 'm' || mode == 'M'){
         if (Serial.available() > 0) {
             // read the incoming byte:
             toDo = Serial.read();
             Serial.println(toDo);    
         }
         // Exit manual mdoe when an 'A' or 'a' is sent
         if (toDo == 'a' || toDo == 'A'){
            mode = 'A' ;
         }
         // reset sensors if an 'r' or 'R' is sent
         else if (toDo == 'r' || toDo == 'R'){
            #ifdef DEBUG
            Serial.println("Reseting");
            #endif
            startup();
            toDo = -1; 
         }
         else{
             switch(toDo){
               case 48:    //0
                   printAllTemp();
                   break;
               case 49:    //1
                  Serial.println("ID: Thermo1");
                  printTemp(thermocouple[0]);
                  break;  //2
               case 50:
                  Serial.println("ID: Thermo2");
                  printTemp(thermocouple[1]);
                  break;
               case 51:    //3
                 Serial.println("ID: Thermo3");
                 printTemp(thermocouple[2]);
                 break;
             }
         }
         toDo = -1;
     }
     
//     toDo = -1;
     printAllTemp();
     delay(period);
  }
 
 
 
 
  void printAllTemp(void){
      for (int i = 0; i < MAXTEMPSENSORS; i++){
          Serial.print("ID: Thermo");
          Serial.println(i+1);
          printTemp(thermocouple[i]);
      }
  } 
 
  void printTemp(Adafruit_MAX31855 thermocouple) {
      #ifdef WD
      wdt_reset();
      #endif 
        double c = thermocouple.readCelsius();
        if (isnan(c)) {
           Serial.println("Something wrong with thermocouple!");
        }
        else{
           Serial.print("C = "); 
           Serial.println(c);
           Serial.print("F = ");
           Serial.println(thermocouple.readFarenheit());
           Serial.print("Internal = ");
           Serial.println(thermocouple.readInternal());
        }
  }
  
  void startup (void){
      //Look for temperature sensors
      for (int i = 0; i < MAXTEMPSENSORS; i++){
           Serial.print("Sensor ");
           Serial.println(i);   
           if(thermocouple[i].readCelsius() > 0){
              thermocouple[i].setUsed(true);
              Serial.println("Sensor in use.");
           }else{
              Serial.println("Sensor not in use."); 
           }
      }
      Serial.println("Done");
  }
