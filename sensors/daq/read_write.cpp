
#include "read_write.h"
  
void respond(int iii){
// iii,a<CR><LF>
    Serial.print("00");
    Serial.println(iii);
}  

void respond(int iii, int a){
    // iii,a<CR><LF>
    Serial.print("00");
    Serial.print(iii);
    Serial.print(',');
    Serial.println(a);
}

void respond(int iii, int a, int n){
    // iii,a<CR><LF>
    Serial.print("00");
    Serial.print(iii);
    Serial.print(',');
    Serial.print(a);
    Serial.print(',');
    Serial.println(n);
}
//needs to have time
void dataReport(int iii, int a, int time, double value, boolean lastVal){
    // iii,a,<time>,<sd.d>:<CR><LF>
    Serial.print("00");
    Serial.print(iii);
    Serial.print(',');
    Serial.print(a);
    Serial.print(',');
    Serial.print("<time>,");
    if (value >= 0){
        Serial.print('+');
    }
    if (lastVal){
        Serial.print(value);
        Serial.println(":");
    }
    else{
        Serial.println(value);
    }
}

boolean readNewCmd(int* sensor, char* command, int* number){
    char buffer[15];
    int numChars = Serial.readBytesUntil(';', buffer, 15);
    
    //check if command ends with '!'.
    if (buffer[numChars -1] != '!'){
        return false;
    }
    
    char* inputHead = &buffer[0];
    char* inputEnd = &buffer[numChars-2];
    char* cmdPtr = inputEnd;
    boolean noCmd = false;
    
    

    //test if rest
    //return set all to -1 and return true to signal reset
    if (numChars == 4 && buffer[0] == ' ' && buffer[1] == ' '
                      && buffer[2] == ' ' && buffer[3] == ' '){
        *sensor = -1;
        *command = -1;
        *number = -1;
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
    *sensor = parInt(inputHead, cmdPtr-1 );
    
    //Set command to *cmdPtr for return
    if (noCmd){
        *command = 0;
    }
    else{
        makeUpper(cmdPtr);
        *command =*cmdPtr;
    }
    
    //parse the ints to the right of cmdPtr
    //returns -1 if error
    *number = parInt(cmdPtr+1, inputEnd);
    
    
    
    #ifdef DEBUG1
    Serial.println("In readNewCmd:");
    Serial.print("Sensor: ");
    Serial.println(*sensor);
    Serial.print("Command: ");
    Serial.println(*command);
    Serial.print("Number: ");
    Serial.println(*number);
    #endif
    
    if (!noCmd && (*sensor < 0 || *number < 0)){
        return false;
    }
    
    return true;
}

// converts an array of ints into an int.
// returns only positive numbers
// overflow after 32767
// returns -1 to signal error
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
        tensPlace *=10;
    }
    return result;
}

boolean isNumber(char number){
    if (number >= '0' && number <= '9'){
        return true;
    }
    else{
        return false;
    }
}

boolean isLetter(char letter){
    if ((letter >= 'A' && letter <= 'Z' || letter >='a' && letter <= 'z')){
        return true;
    }
    else{
        return false;
    }
}

void makeUpper (char* letter){
    if (*letter >='a' && *letter <= 'z'){
        *letter -= 32;
    }
}


