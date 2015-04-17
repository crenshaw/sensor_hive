/**
miniSDI_12.h
Provides the function prototypes for the miniSDI_12 protocol used to use communicate with the DAQ
@author: Zak Pearson
@since: January 2015
**/

#if (ARDUINO >= 100)
 #include "Arduino.h"
#else
 #include "WProgram.h"
#endif

#ifndef MINISDI_12_H
#define MINISDI_12_H
#define SDI_DAQ_ID 2  //ID for the Specific DAQ. Should be changed for each DAQ in a system
#define SDI_ABORT 0   //The abort code

void respond(int a);
void respond(int a, uint32_t n);
void respond(int a, uint32_t timeTill, uint32_t value);
void endLine(void);
void terminate(void);
void dataReport(int a, uint32_t time, double value, boolean lastVal = false);
void dataReport(int a, uint32_t time, uint32_t value, boolean lastVal = false);
boolean readNewCmd(char* command, uint8_t* sensor, uint32_t* number);
uint32_t parInt (char* head, char* tail);
boolean isNumber(char number);
boolean isLetter(char letter);
void makeUpper (char* letter);

#endif
