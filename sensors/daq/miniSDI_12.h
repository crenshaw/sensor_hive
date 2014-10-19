#if (ARDUINO >= 100)
 #include "Arduino.h"
#else
 #include "WProgram.h"
#endif

#ifndef MINISDI_12_H
#define MINISDI_12_H
#define SDI_DAQ_ID 2
#define ABORT 0
//todo: add in the daq id definition here since it is only sent with a communication
//      add an abort that way in the code you jsut type sendAbort easier to read.

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
