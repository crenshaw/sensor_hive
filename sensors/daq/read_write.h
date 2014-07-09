#if (ARDUINO >= 100)
 #include "Arduino.h"
#else
 #include "WProgram.h"
#endif



void printReport(int iii);
void printReport(int iii, int a);
void printReport(int iii, int a, double value);
boolean readNewCmd(int* sensor, char* command, int* number);
int parInt (char* head, char* tail);
boolean isNumber(char number);
boolean isLetter(char letter);
void makeUpper (char* letter);


