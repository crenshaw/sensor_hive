#if (ARDUINO >= 100)
 #include "Arduino.h"
#else
 #include "WProgram.h"
#endif

#ifndef MEMORY_H
#define MEMORY_H
#include "EEPROMex.h"
#define MEMORY_SIZE 1048
#define MEMORY_BLOCK_ADDRESS 0
#define EXPERIMENT_BLOCK_ADDRESS 4

//this struct is 4 bytes
typedef struct MemoryBlock_TAG{
    uint16_t headPtr;              // 2 bytes
    uint16_t tailPtr;              // 2 bytes
}MemoryBlock;

//this struct is 12 bytes
typedef struct ExperimentBlock_TAG{
    boolean isRunning;             // 1 byte
    uint8_t port;                  // 1 byte
    uint32_t startTime;            // 4 bytes
    uint16_t periodLgth;           // 2 bytes
    uint32_t targetMeasurment;     // 4 bytes
}ExperimentBlock;


//Block types must be the same size.
//9 bytes
typedef struct DataBlock_TAG{
    uint32_t periodNumber;         //4 bytes
    uint8_t port;                  //1 byte
    uint32_t data;                   //4 bytes
}DataBlock;



class Memory{
    public:
    //constructor
    Memory(void);
    //public variables
    MemoryBlock memoryBlock;
    //public functions
    void memorySetup ();
    void updateExperimentBlock (ExperimentBlock experimentBlock);
    void loadExperimentBlock (ExperimentBlock* experimentBlock);
    void saveDataBlock (DataBlock dataBlock);
    boolean loadDataBlock (uint16_t* Address, DataBlock* dataBlock);
    void reset (void);
    
    private:
    //private variables
    void setEqual (ExperimentBlock* block1, ExperimentBlock* block2);
    void setEqual (DataBlock* block1, DataBlock* block2);
    int headerBlockSize;
    int dataBlockSize;
    int maxBlocks;
};

#endif
    
