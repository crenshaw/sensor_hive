#if (ARDUINO >= 100)
 #include "Arduino.h"
#else
 #include "WProgram.h"
#endif



void respond(int iii);
void respond(int iii, int a);
void respond(int iii, int a, int value);
void dataReport(int iii, int a, int time, double value, boolean lastVal = false);
boolean readNewCmd(int* sensor, char* command, int* number);
int parInt (char* head, char* tail);
boolean isNumber(char number);
boolean isLetter(char letter);
void makeUpper (char* letter);


