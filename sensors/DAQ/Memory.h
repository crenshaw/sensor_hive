/**
Memory.h
  Class definiton for the Memory class.
@author: Zak Pearson
@since: January 2015
**/
#if (ARDUINO >= 100)
 #include "Arduino.h"
#else
 #include "WProgram.h"
#endif

#ifndef MEMORY_H
#define MEMORY_H
#include "EEPROMex.h"

// global constants for this class. All constants contributed to this class will begin with MEMORY_
#define MEMORY_SIZE 1024
#define MEMORY_BLOCK_ADDRESS 0
#define EXPERIMENT_BLOCK_ADDRESS 4

//this struct is 4 bytes
typedef struct MemoryBlock_TAG{
    uint16_t headPtr;              // 2 bytes
    uint16_t tailPtr;              // 2 bytes
}MemoryBlock;

//This struck holds all of the experiment parameters.
//This struct is 12 bytes
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


/**
Class: Memory
    The memory class interfaces and manages the EEPROM on the DAQ. The purpose of this class is to 
    keep the memroyBlock struct up to date, read data, and write data to the EEPROM. The memory class
    usees the memoryBlock struct to store current pointers in memory. This block is always stored 
    at address 0 in the EEPROM then the ExperimentBlock is stored just after that. The rest of EEPROM
    memory is used to store DataBlocks and is organised in a circular FIFO structure. 
Constructor: 
  Memory (void)
    Postcondition: The memroy object has been created.
Public Variables:
  MemoryBlock memroyBlock
    Pointers used to access memory.
Public Functions:
  void memorySetup ():
    precondition: Memory object must be declared.
    postcondition: The size of memory header is stored in headerBlockSize. The size of a dataBlock
      is stored in dataBlockSize.The maximum number of data blocks that can be stored in memory is 
      stored in maxBlocks. The last MemBlock struct that was saved to memory is loaded into memoryBlock.
  void updateExperimentBlock (ExperimentBlock experimentBlock);
    postcondition: experimentBlock is saved into memory at location EXPERIMENT_BLOCK_ADDRESS
  void saveDataBlock (DataBlock dataBlock); 
    postcondition: dataBlock is saved into memory at the address pointed to by tailPtr in memoryBlock.
      memoryBlock pointers are updated.
  void loadExperimentBlock (ExperimentBlock* experimentBlock);
    postcondition: The experiment block is read from the EEPROM and stored on the heap.
      ExperimentBlock* points to this new experimentBlock.
  void loadDataBlock (uint16_t effectiveAddress, DataBlock* dataBlock); 
    postcondition: The dataBlock stored at the effetiveAddress is read form the EEPROM
      and stored on the heap. DataBlock* points to this new dataBlock.
  uint16_t getPtr(uint16_t numValues);
    postcondition: Returns the address of tailPtr - numValues
  void updatePtr(uint16_t* ptr);
    postcondition: the contense of ptr are updated by 1
  uint16_t tail(void);
    postcondition: returns the tail pointer from the memroy block
  void reset (void);
    postcondition: resets head and tail pointer to the beginning of memory. effectivly
      resetting memroy.
Private Functions:
    void setEqual (ExperimentBlock* block1, ExperimentBlock* block2);
      postcondition: block1 = block2
    void setEqual (DataBlock* block1, DataBlock* block2);
      postcondition: block1 = block2
**/
class Memory{
    public:
    //constructor
    Memory(void);
    //public variables
    MemoryBlock memoryBlock;
    //public functions
    void memorySetup ();
    
    void updateExperimentBlock (ExperimentBlock experimentBlock);
    void saveDataBlock (DataBlock dataBlock);
    
    void loadExperimentBlock (ExperimentBlock* experimentBlock);
    void loadDataBlock (uint16_t effectiveAddress, DataBlock* dataBlock);
    
    uint16_t getPtr(uint16_t numValues);
    void updatePtr(uint16_t* ptr);
    uint16_t tail(void){return memoryBlock.tailPtr;};
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
    
