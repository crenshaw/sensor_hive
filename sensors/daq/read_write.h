#if (ARDUINO >= 100)
 #include "Arduino.h"
#else
 #include "WProgram.h"
#endif

#ifndef READ_WRITE_H
#define READ_WRITE_H

//todo: if acknowledge active command make the number be returned in port no numMeasrus

void respond(int iii, int a);
void respond(int iii, int a, int n);
void respond(int iii, int a, int timeTill, int value);
void dataReport(int iii, int a, uint32_t time, double value, boolean lastVal = false);
boolean readNewCmd(char* command, int* sensor, int* number);
int parInt (char* head, char* tail);
boolean isNumber(char number);
boolean isLetter(char letter);
void makeUpper (char* letter);

#endif
