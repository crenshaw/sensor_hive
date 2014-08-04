
#include "read_write.h"

/**
void respond(int iii, int a, int ttt, int n)
    Uses UART port and Serial communication to respond to an A command request from the Master 
      or an abort response per miniSDI 12 communication protocal as outlined here:
      https://github.com/crenshaw/sensor_hive/wiki/miniSDI-12
      iii,a<CR><LF>
@param int iii.
    Uniquie daq id.
@param int a.
    Port address.
@return void
**/
void respond(int iii, int a){
    Serial.print(F("00"));
    Serial.print(iii);
    Serial.print(F(","));
    Serial.println(a);
}

/**
void respond(int iii, int a, int ttt, int n)
    Uses UART port and Serial communication to respond to a P command request from the Master 
      per miniSDI 12 communication protocal as outlined here:
      https://github.com/crenshaw/sensor_hive/wiki/miniSDI-12
    iii,a,n<CR><LF>
@param int iii.
    Uniquie daq id.
@param int a.
    Port address.
@param int n
    The new period length in seconds.
@return void
**/
void respond(int iii, int a, int n){
    Serial.print(F("00"));
    Serial.print(iii);
    Serial.print(F(","));
    Serial.print(a);
    Serial.print(F(","));
    Serial.println(n);
}

/**
void respond(int iii, int a, int ttt, int n)
    Uses UART port and Serial communication to respond to an M command request from the Master 
      per miniSDI 12 communication protocal as outlined here:
      https://github.com/crenshaw/sensor_hive/wiki/miniSDI-12
    iii,a,ttt,n<CR><LF>
@param int iii.
    Uniquie daq id.
@param int a.
    Port address.
@param int ttt
    A length of time, in seconds, untill the measurments have been completly taken.
@param int n
    The number of measurements to be taken.
@return void
**/
void respond(int iii, int a, int ttt, int n){
    Serial.print(F("00"));
    Serial.print(iii);
    Serial.print(F(","));
    Serial.print(a);
    Serial.print(F(","));
    Serial.print(ttt);
    Serial.print(F(","));
    Serial.println(n);
}

/**
void dataReport(int iii, int a, uint32_t time, double value, boolean lastVal)
    Uses UART port and Serial communication to send a data reports to the Master 
      per miniSDI 12 communication protocal as outlined here:
      https://github.com/crenshaw/sensor_hive/wiki/miniSDI-12
@param int iii.
    Uniquie daq id
@param int a.
    Port address
@param unit32_t time
    Unix time stamp.
@param double value
    The data measured from the port.
@param boolean lastVal
    Optional parameter the if true places a semi colon at the end of a report.
@return void
**/
void dataReport(int iii, int a, uint32_t time, double value, boolean lastVal){
    Serial.print(F("00"));
    Serial.print(iii);
    Serial.print(F(","));
    Serial.print(a);
    Serial.print(F(","));
    Serial.print(time);
    Serial.print(F(","));
    if (value >= 0){
        Serial.print(F("+"));
    }
    if (lastVal){
        Serial.print(value);
        Serial.println(F(":"));
    }
    else{
        Serial.println(value);
    }
}


/**
boolean readNewCmd( char* command, int* port, int* numMeasures)
    Parses commands received on a daq device using miniSDI 12 communication protocal as outlined here:
    https://github.com/crenshaw/sensor_hive/wiki/miniSDI-12
    Returns true for following commands where int > 0:
    <____>!;
      Where command = -1, port = -1, numMeasures = -1.
    <int1><char><int2>!;
      Where command = char, port = int1, numMeasures = int2.
    <int3>!;
      Where command = 0, port = int3, numMeausres = int3.
    otherwise returns false.
@param char* command
    Pointer to the location to store the command
@param int* port
    Pointer to the location to store port
@param int* numMeasures
    Pointer to the location to store the number of measurments to be taken
@return boolean
    If the commands recieved was parsed succesfully returns true
**/
boolean readNewCmd( char* command, int* port, int* numMeasures){
    char buffer[10];
    int numChars = Serial.readBytesUntil(';', buffer, 10);
    //check if command ends with '!'.
    if (buffer[numChars -1] != '!'){
        return false;
    }
    
    char* inputHead = &buffer[0];
    char* inputEnd = &buffer[numChars-2];
    char* cmdPtr = inputEnd;
    boolean noCmd = false;
    
    //Break Command <____>!;
    if (numChars == 5 && buffer[0] == ' ' && buffer[1] == ' '
                      && buffer[2] == ' ' && buffer[3] == ' '){
        *command = -1;
        *port = -1;
        *numMeasures = -1;
        return true;
    }
    // Find the Command and set cmdPtr to point at it
    while (isNumber(*cmdPtr)){
        cmdPtr --;
        if (cmdPtr < inputHead){
            //set command to null if no command exists
            noCmd = true;
            break;
        }
    }
    //No numbers right of cmd, bad cmd.
    if (cmdPtr == inputEnd){
        return false;
    }
    //I can rewirte thsi to make it a little more smooth
    //put the parints inside the noCmd if statement
    //return false right there if they come back neg 1.
    
    //parse the ints to the left of cmdPtr
    //returns -1 if error
    *port = parInt(inputHead, cmdPtr-1 );
    
    
    
    //parse the ints to the right of cmdPtr
    //returns -1 if error
    *numMeasures = parInt(cmdPtr+1, inputEnd);
    
    //Set command to *cmdPtr for return
    if (noCmd){
        *command = 0;
        *port = *numMeasures;
    }
    else{
        makeUpper(cmdPtr);
        *command =*cmdPtr;
    }
    
    
    
    #ifdef DEBUG1
    Serial.println("In readNewCmd:");
    Serial.print("Sensor: ");
    Serial.println(*sensor);
    Serial.print("Command: ");
    Serial.println(*command);
    Serial.print("Number: ");
    Serial.println(*number);
    #endif
    
    if (!noCmd && (*port < 0 || *numMeasures < 0)){
        return false;
    }
    
    return true;
}

/**
int parInt (char* head, char* tail)
    Takes an array of integers > 0 and parses them into a single int. 
@param char* head
    Pointer to the begging of the integer arrray.
@param int* tail
    Pointer to the end of the integer array.
@return int
    The final value of the integer array after it has been parsed.
    Returns -1 if unsuccessful.
**/
int parInt (char* head, char* tail){
    int result = 0;
    int tensPlace = 1;
    
    if(tail < head){
        return -1;
    }
    
    while(tail >= head){
        if (!isNumber(*tail)){
            return -1;
        }
        result += (*tail-48)*tensPlace;
        tail--;
        tensPlace *= 10;
    }
    return result;
}

/**
boolean isNumber(char number)
    Determins if a char is an ascii value for a number.
@param char number
    The char to check.
@return bool
    Returns true if char is an ascii value for a number.
**/
boolean isNumber(char number){
    if (number >= '0' && number <= '9'){
        return true;
    }
    else{
        return false;
    }
}

/**
boolean isLetter(char letter)
    Determins if a char is an ascii value for a letter or letter is already uppercase the function does nothing.
@param char letter
    The char to check.
@return bool
    Returns true if char is an ascii value for a letter.
**/
boolean isLetter(char letter){
    if ((letter >= 'A' && letter <= 'Z' || letter >='a' && letter <= 'z')){
        return true;
    }
    else{
        return false;
    }
}

/**
void makeUpper (char* letter)
    Turns a lower case letter into an upper case one.
    If letter is not an ascii value for a letter does nothing.
@param char* letter
    Pointer to letter to make upper case.
@return void
**/
void makeUpper (char* letter){
    if (*letter >='a' && *letter <= 'z'){
        *letter -= 32;
    }
}


